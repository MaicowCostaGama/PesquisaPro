import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { GROUP_SCHEMA, SYSTEM_PROMPT, containsContact, validateItems, validateSuggestion } from './core.mjs';

// Não grava coletas, categorias ou respostas. A aplicação só ocorre na revisão da gestão.
const origins = (Deno.env.get('APP_ALLOWED_ORIGINS') || 'https://www.pesquisa-pro.com,https://pesquisa-pro.com').split(',').map(s => s.trim());
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async req => {
  const origin = req.headers.get('Origin') || '';
  const headers: Record<string,string> = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin', 'Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type', 'Access-Control-Allow-Methods':'POST,OPTIONS' };
  if (origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin)) return json({error:'Origem não autorizada.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return json({error:'Método não permitido.'},405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '', anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !anon) return json({error:'Serviço não configurado.'},503);
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({error:'Entre novamente no aplicativo.'},401);
  const db = createClient(supabaseUrl,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError} = await db.auth.getUser();
  if (authError || !user) return json({error:'Entre novamente no aplicativo.'},401);
  const {data:profile,error:profileError} = await db.from('profiles').select('role,status').eq('id',user.id).maybeSingle();
  if (profileError || !profile || profile.status !== 'ativo' || !['admin','admpro','coord','gerente'].includes(profile.role)) return json({error:'Somente gestão ativa pode solicitar sugestões.'},403);
  const key = Deno.env.get('OPENAI_API_KEY') || '';
  if (!key) return json({error:'IA ainda não ativada. Configure OPENAI_API_KEY nos segredos da função do Supabase.'},503);
  let body;
  try {
    if (Number(req.headers.get('Content-Length') || 0) > 180000) throw new Error();
    const raw = await req.text(); if (new TextEncoder().encode(raw).length > 180000) throw new Error(); body = JSON.parse(raw);
  } catch { return json({error:'Solicitação inválida ou grande demais.'},400); }
  if (!uuid.test(body?.survey_id || '') || !uuid.test(body?.question_id || '') || body?.consent !== true) return json({error:'Pesquisa, pergunta e confirmação de envio são obrigatórias.'},400);
  let items: Array<{id:string,text:string}>;
  try { items = validateItems(body.items); } catch (ex) { return json({error:(ex as Error).message},400); }
  const {data:question,error:qError} = await db.from('survey_questions').select('id,text,type').eq('id',body.question_id).eq('survey_id',body.survey_id).maybeSingle();
  if (qError || !question || question.type !== 'open') return json({error:'Pergunta aberta não encontrada nesta pesquisa.'},403);
  // Limite durável antes de consultar a base: tentativas também consomem a reserva.
  const {data:permit,error:limitError} = await db.rpc('reserve_open_answer_ai_request',{p_survey_id:body.survey_id,p_question_id:body.question_id});
  if (limitError) return json({error:'Ative primeiro o SQL de controle de uso da IA no Supabase.'},503);
  if (permit !== true) return json({error:'Limite de análises atingido: até 2 por minuto e 40 por dia por gestor. Tente mais tarde.'},429);
  // Confere textos no banco usando a sessão do solicitante, sem service-role ou consulta de GPS/perfis.
  const source = new Set<string>();
  const deadline = Date.now()+20000;
  for (let offset = 0; ; offset += 250) {
    if (offset >= 20000) return json({error:'Base grande demais para validação. Contate a gestão técnica.'},422);
    if (Date.now() >= deadline) return json({error:'A base não pôde ser validada no prazo. Nenhuma categoria foi aplicada.'},504);
    const {data,error} = await db.rpc('survey_answer_distribution',{p_survey_id:body.survey_id,p_question_id:body.question_id}).order('value_label',{ascending:true}).range(offset,offset+249).abortSignal(AbortSignal.timeout(12000));
    if (error || !Array.isArray(data)) return json({error:'Não foi possível validar a base. Atualize o relatório.'},502);
    for (const row of data) if (Number(row.cnt)>0 && row.value_label) source.add(String(row.value_label).trim());
    if (items.every(i=>source.has(i.text)) || data.length < 250) break;
  }
  if (items.some(i=>!source.has(i.text))) return json({error:'A base mudou ou há textos fora desta pergunta. Atualize o relatório.'},409);
  const excluded_ids = items.filter(i=>containsContact(i.text)).map(i=>i.id);
  const safeItems = items.filter(i=>!excluded_ids.includes(i.id));
  if (safeItems.length < 2) return json({groups:[],ungrouped_ids:safeItems.map(i=>i.id),excluded_ids,model:null});
  const model = Deno.env.get('OPENAI_GROUPING_MODEL') || 'gpt-5-mini';
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
      body:JSON.stringify({model,store:false,max_completion_tokens:10000,reasoning_effort:'low',messages:[
        {role:'system',content:SYSTEM_PROMPT},
        {role:'user',content:JSON.stringify({question:containsContact(question.text)?'Pergunta aberta de pesquisa (contatos omitidos)':String(question.text).slice(0,1500),answers:safeItems})}
      ],response_format:{type:'json_schema',json_schema:{name:'open_answer_groups',strict:true,schema:GROUP_SCHEMA}}})
    });
    if (!response.ok) return json({code:'IA_PROVIDER_ERROR',error:response.status===429?'Provedor de IA indisponível por limite de uso. Tente mais tarde.':'Não foi possível consultar a IA. Verifique chave e modelo no servidor.'},502);
    let result;
    try { result = await response.json(); } catch (ex) {
      if (['TimeoutError','AbortError'].includes((ex as Error)?.name)) throw ex;
      return json({code:'IA_INVALID_JSON',error:'A IA retornou uma resposta ilegível. Nenhuma categoria foi aplicada. Tente um lote menor.'},502);
    }
    const choice = result?.choices?.[0];
    if (choice?.finish_reason === 'length') return json({code:'IA_TRUNCATED',error:'A IA atingiu o limite de geração antes de concluir o lote. Nenhuma categoria foi aplicada. Selecione menos textos e tente novamente.'},502);
    if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') return json({code:'IA_REFUSAL',error:'A IA não pôde analisar este conteúdo. Nenhuma categoria foi aplicada. Revise os textos ou use o agrupamento manual.'},422);
    if (choice?.finish_reason !== 'stop' || typeof choice?.message?.content !== 'string') return json({code:'IA_INCOMPLETE',error:'A IA não retornou um resultado completo. Nenhuma categoria foi aplicada. Tente um lote menor.'},502);
    let parsed;
    try { parsed = JSON.parse(choice.message.content); } catch {
      return json({code:'IA_INVALID_JSON',error:'A IA retornou uma resposta ilegível. Nenhuma categoria foi aplicada. Tente um lote menor.'},502);
    }
    try {
      const suggestion = validateSuggestion(parsed,safeItems);
      return json({...suggestion,excluded_ids,model});
    } catch (ex) {
      // Só expõe mensagens fixas do validador; nunca o conteúdo enviado ou devolvido pelo provedor.
      return json({code:'IA_INVALID_GROUPS',error:(ex as Error).message+' Nenhuma categoria foi aplicada. Selecione menos textos ou agrupe manualmente.'},502);
    }
  } catch (ex) {
    const timedOut = ['TimeoutError','AbortError'].includes((ex as Error)?.name);
    return json({code:timedOut?'IA_TIMEOUT':'IA_NETWORK_ERROR',error:timedOut?'A IA excedeu o prazo de 90 segundos. Nenhuma categoria foi aplicada. Selecione menos textos e tente novamente.':'Falha de conexão com a IA. Nenhuma categoria foi aplicada. Tente novamente mais tarde.'},timedOut?504:502);
  }
});
