/* PesquisaPro v176 — tabulação direta de perguntas abertas, sem criar versões. */
(function(root){
'use strict';
const FORMAT='v176',MIGRATION='tabulacao-simples-excel-v176.sql',MAX_FILE=15*1024*1024,MAX_ROWS=100000;
const UUID=/^[a-f0-9]{8}-[a-f0-4]{4}-[a-f0-4]{4}-[a-f0-4]{4}-[a-f0-4]{12}$/i;
const UUID_OK=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HEX=/^[a-f0-9]{64}$/i;
const STAFF=['admin','admpro','coord','gerente'];
let env=null,state=null,serial=0;

function text(v){return String(v==null?'':v);}
function esc(v){return text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function qty(v){return Number(v||0).toLocaleString('pt-BR');}
function integer(v){return v!=null&&Number.isSafeInteger(Number(v))&&Number(v)>=0;}
function idOk(v){return UUID_OK.test(text(v));}
function randomId(){try{if(root.crypto?.randomUUID)return root.crypto.randomUUID();}catch(ex){}return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});}
function context(){return env?.getContext?.()||{};}
function questionSignature(c){return JSON.stringify((c.survey?.questions||[]).map(q=>[q.id||q.dbId,q.type,q.position,q.text]));}
function missing(ex){return ex?.code==='PGRST202'||ex?.code==='42883'||/could not find the function|function .* does not exist|schema cache/i.test(ex?.message||'');}
function safeError(ex){
  if(missing(ex))return 'Ative manualmente o SQL '+MIGRATION+' no Supabase. Nenhuma resposta foi alterada.';
  if(/not authorized|permission denied|results not released/i.test(ex?.message||''))return 'Sua conta não tem autorização para esta pesquisa. Nenhuma resposta foi alterada.';
  if(/revision|fingerprint|fonte|origem|modelo|survey|pesquisa|question/i.test(ex?.message||''))return String(ex?.message||ex);
  if(ex?.name==='AbortError'||/aborted|timeout|timed out/i.test(ex?.message||''))return 'A operação demorou além do limite. Use “Tentar novamente” para repetir com o mesmo pedido, ou carregue o estado atual.';
  return String(ex?.message||ex||'Não foi possível concluir a operação.');
}
async function rpc(sb,name,args,timeout=30000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const query=sb.rpc(name,args),result=await (query?.abortSignal?query.abortSignal(controller.signal):query);
    if(result?.error)throw result.error;
    return result?.data;
  }finally{clearTimeout(timer);}
}
function unwrap(raw){return Array.isArray(raw)?(raw.length===1?raw[0]:raw):raw?.snapshot||raw;}
function normalizeQuestion(q){
  const id=q?.id||q?.dbId;
  return {...q,id,dbId:id,options:q?.options||[],opts:q?.opts||[]};
}
function normalizeBase(raw,surveyId){
  if(!raw||typeof raw!=='object'||!idOk(raw.id)||raw.survey_id!==surveyId||!HEX.test(text(raw.source_fingerprint))||!integer(raw.event_count)||!Array.isArray(raw.questions))throw new Error('O estado autoritativo da fonte está incompleto ou pertence a outra pesquisa.');
  const questions=raw.questions.map(normalizeQuestion);
  if(!questions.length||new Set(questions.map(q=>q.id)).size!==questions.length||questions.some(q=>!idOk(q.id)||typeof q.text!=='string'||typeof q.type!=='string'))throw new Error('O questionário congelado retornou perguntas inválidas.');
  return {...raw,id:raw.id,survey_id:surveyId,source_fingerprint:text(raw.source_fingerprint),event_count:Number(raw.event_count),questions};
}
function normalizeSource(v){
  if(v==null)return null;
  if(!v||typeof v!=='object'||!idOk(v.baseId)||!idOk(v.versionId)||!HEX.test(text(v.fingerprint)))throw new Error('A fonte atual está inválida. Recarregue o estado antes de continuar.');
  return {baseId:v.baseId,versionId:v.versionId,fingerprint:text(v.fingerprint)};
}
function normalizeSnapshot(raw,surveyId){
  const v=unwrap(raw);
  if(!v||typeof v!=='object'||v.survey_id!==surveyId||!integer(v.revision)||typeof v.managed!=='boolean')throw new Error('O estado autoritativo da pesquisa está incompleto.');
  const source=normalizeSource(v.source),base=v.base==null?null:normalizeBase(v.base,surveyId);
  if(source&&base&&source.baseId!==base.id)throw new Error('A fonte atual pertence a outra cópia; o SQL deve rejeitar essa combinação com segurança.');
  if(v.file_name!=null&&typeof v.file_name!=='string')throw new Error('O nome do arquivo salvo é inválido.');
  return {survey_id:surveyId,revision:Number(v.revision),managed:v.managed,source,base,file_name:v.file_name==null?null:text(v.file_name),updated_at:v.updated_at==null?null:text(v.updated_at)};
}
async function readState(sb,surveyId){
  if(!idOk(surveyId))throw new Error('Pesquisa inválida.');
  return normalizeSnapshot(await rpc(sb,'tabulation_simple_state_v176',{p_survey_id:surveyId}),surveyId);
}
function allowed(c){return !!c?.profile?.id&&STAFF.includes(c.profile.role)&&(!c.profile.status||c.profile.status==='ativo')&&idOk(c.survey?.id);}
function active(s){
  const c=context();
  return !!s&&state===s&&env?.host===s.host&&c.profile===s.profile&&c.survey===s.survey&&c.survey?.id===s.surveyId&&s.questionSignature===questionSignature(c)&&allowed(c);
}
function fresh(c,h){return {profile:c.profile,survey:c.survey,surveyId:c.survey.id,host:h,questionSignature:questionSignature(c),generation:++serial,busy:false,error:'',message:'',snapshot:null,questionId:'',pending:null,loading:true};}
function currentBusy(){return !!state?.busy;}
function canLeave(){
  if(state?.busy){if(active(state)){state.error='Aguarde a conclusão da operação antes de sair.';render();}return false;}
  if(state?.pending){if(active(state)){state.error='Há uma operação que pode ser repetida com o mesmo pedido. Use “Tentar novamente” ou carregue o estado atual antes de sair.';render();}return false;}
  return true;
}
function reset(){serial++;state=null;env=null;}
function markup(){return '<section id="rp-simple-tabulation" class="card mb tabulation-simple" aria-label="Tabulação das perguntas abertas"></section>';}
function sourceText(s){
  if(!s?.snapshot)return 'Carregando estado autorizado…';
  if(s.snapshot.source)return 'Fonte atual: Excel tratado aplicado aos resultados e cruzamentos.';
  return s.snapshot.managed?'Fonte atual: respostas originais da coleta.':'Nenhum Excel aplicado pelo fluxo simplificado. Um tratamento anterior, se existir, continua nos resultados até enviar um Excel ou restaurar ao original.';
}
function render(){
  const h=env?.host;if(!h?.isConnected)return;
  const c=context();
  if(!allowed(c)){state=null;h.innerHTML='<div class="callout">Esta consulta está disponível somente para a equipe autorizada da pesquisa.</div>';return;}
  const s=state;if(!s||!active(s))return;
  const focused=root.document?.activeElement,focusAction=focused?.dataset?.simpleAction,focusQuestion=focused?.hasAttribute?.('data-simple-question');
  const snap=s.snapshot,questions=(snap?.base?.questions||c.survey.questions||[]).map(normalizeQuestion).filter(q=>q.type==='open');
  const disabled=s.busy||env.getBusy?.()?'disabled':'';
  const missingMsg=s.error&&s.error.includes(MIGRATION);
  h.innerHTML=`<div class="tabulation-heading"><div><span class="reports-eyebrow">EXCEL · RESPOSTAS ABERTAS</span><h2>Tabulação das perguntas abertas</h2><p>Baixe o modelo, edite somente Resposta tratada e envie o arquivo. O vazio restaura o original da linha.</p></div></div><p class="tabulation-muted">${esc(sourceText(s))}${snap?.file_name?' · Arquivo: '+esc(snap.file_name):''}</p><div class="tabulation-actions"><label>Pergunta<select class="inp" data-simple-question ${disabled}><option value="">Todas as perguntas abertas</option>${questions.map(q=>`<option value="${esc(q.id)}" ${s.questionId===q.id?'selected':''}>${Number(q.position||0)+1}. ${esc(q.text)}</option>`).join('')}</select></label><button class="btn btn-out" type="button" data-simple-action="download" ${disabled||!questions.length?'disabled':''}>Baixar Excel para tratar</button></div><div class="tabulation-actions"><label>Enviar Excel tratado<input class="inp" data-simple-file type="file" accept=".xlsx" ${disabled}></label><button class="btn btn-out" type="button" data-simple-action="restore" ${disabled||!snap?'disabled':''}>Restaurar respostas originais</button></div><div role="status" aria-live="polite">${s.busy?'<p>Validando fonte e registros…</p>':''}${s.error?`<div class="callout warn">${esc(s.error)}</div>`:''}${s.message?`<div class="callout">${esc(s.message)}</div>`:''}${missingMsg?'':s.pending?`<div class="callout warn"><p>O pedido ainda pode estar em andamento. O mesmo arquivo e os mesmos registros serão reenviados somente se você confirmar a tentativa.</p><button class="btn btn-out" type="button" data-simple-action="retry" ${disabled}>Tentar novamente</button><button class="btn btn-out" type="button" data-simple-action="refresh" ${disabled}>Carregar estado atual</button></div>`:''}</div><p class="tabulation-muted">Não altere identificadores, texto original, fórmulas, links ou macros. O arquivo não publica relatórios.</p>`;
  if(focusAction)h.querySelector?.('[data-simple-action="'+focusAction+'"]')?.focus({preventScroll:true});else if(focusQuestion)h.querySelector?.('[data-simple-question]')?.focus({preventScroll:true});
}
function guardSignature(s){return ()=>active(s);}
async function notify(s){if(!active(s)||!env.onChange)return;try{await env.onChange(s.snapshot);}catch(ex){/* observador não pode desfazer sucesso autoritativo */}}
async function withBusy(s,fn){
  if(!active(s)||s.busy||env.getBusy?.())return false;
  s.busy=true;s.error='';s.message='';render();
  try{return await fn();}
  catch(ex){if(active(s))s.error=safeError(ex);return false;}
  finally{if(active(s)){s.busy=false;render();}}
}
async function ensurePrepared(s){
  if(!active(s))throw new Error('A sessão ou pesquisa mudou.');
  if(s.snapshot?.base)return s.snapshot;
  const requestId=randomId(),prepared=normalizeSnapshot(await rpc(env.sb,'tabulation_simple_prepare_v176',{p_survey_id:s.surveyId,p_request_id:requestId}),s.surveyId);
  if(!active(s))throw new Error('A sessão ou pesquisa mudou durante a preparação.');
  s.snapshot=prepared;return prepared;
}
function questionModel(c,base){return {...c,survey:c.survey,base:{...base,questions:base.questions.map(normalizeQuestion)},version:null};}
function appendControls(lib,book,controls){
  const sh=book.Sheets._Controle;if(!sh)throw new Error('O modelo não contém a aba de controle.');
  let range=sh['!ref']?lib.utils.decode_range(sh['!ref']):{s:{r:0,c:0},e:{r:-1,c:1}};
  let row=range.e.r+1;
  for(const [k,v] of Object.entries(controls)){sh['A'+(row+1)]={t:'s',v:k};sh['B'+(row+1)]={t:'s',v:text(v)};row++;}
  range.e.r=row-1;range.e.c=Math.max(range.e.c,1);sh['!ref']=lib.utils.encode_range(range);
}
function hideTechnicalColumns(book){
  for(const name of book.SheetNames||[]){if(name==='Instruções'||name==='_Controle')continue;const sh=book.Sheets[name];if(!sh)continue;sh['!cols']=Array.from({length:12},(_,i)=>({wch:i===7?85:i===11?65:18,hidden:!(i===7||i===11)}));}
}
async function rowsForSource(s,base,questionId,verify){
  const original=await root.PP_TREATMENT.allRows(env.sb,s.surveyId,base.id,null,questionId,verify);
  if(!verify())throw new Error('A sessão, pesquisa ou pergunta mudou durante a leitura.');
  let activeRows=null,sourceRevision=0;
  if(s.snapshot.source){
    if(s.snapshot.source.baseId!==base.id)throw new Error('A fonte atual pertence a outra cópia; recarregue o estado e não envie este arquivo.');
    await root.PP_TREATMENT.resolve(env.sb,s.surveyId,s.snapshot.source);
    activeRows=await root.PP_TREATMENT.allRows(env.sb,s.surveyId,base.id,s.snapshot.source.versionId,questionId,verify);
    sourceRevision=activeRows.revision;
  }
  return {original,activeRows,sourceRevision};
}
async function exportExcel(){
  const s=state;if(!active(s)||s.busy||env.getBusy?.())return false;
  return withBusy(s,async()=>{
    await env.loadExcel();if(!active(s))return false;
    const snap=await ensurePrepared(s);if(!snap.base)throw new Error('A fonte ainda não possui registros congelados.');
    const c=context(),base=normalizeBase(snap.base,s.surveyId),qid=s.questionId||null,verify=guardSignature(s);
    const data=await rowsForSource(s,base,qid,verify);if(!active(s))return false;
    const activeById=new Map((data.activeRows?.rows||[]).map(r=>[r.answer_id,r]));
    const rows=data.original.rows.map(r=>({...r,treated_text:activeById.get(r.answer_id)?.treated_text??null}));
    const wb=root.PP_TREATMENT.buildWorkbook(root.XLSX,questionModel(c,base),{rows,fingerprint:base.source_fingerprint,revision:0},qid);
    appendControls(root.XLSX,wb,{simple_format:FORMAT,source_base_id:base.id,source_version_id:snap.source?.versionId||'',source_fingerprint:snap.source?.fingerprint||base.source_fingerprint});
    const info=[['PesquisaPro — tabulação simples das perguntas abertas'],['Pesquisa',c.survey.name||c.survey.id],['Entrevistas da base',Number(base.event_count)],['Como usar','Edite somente Resposta tratada. Deixe em branco para usar o texto original daquela linha.'],['Enviar','Selecione o Excel no painel Enviar Excel tratado e confirme. A aplicação ao relatório é automática.'],['Atualizar','Para revisar a tabulação, envie outro modelo válido da mesma pesquisa.'],['Vínculos','Não altere IDs, originais, cabeçalhos, aba de controle ou quantidade de linhas. Pode ordenar linhas inteiras.'],['Limites','Texto tratado até 1.000 caracteres. Não use fórmulas, macros, links ou datas automáticas.'],['Restaurar','Use Restaurar respostas originais para retirar o tratamento da pesquisa.'],['Privacidade','Textos livres podem conter informações pessoais. Revise antes de compartilhar.']];
    info.push([], ...base.questions.filter(q=>q.type==='open'&&(!qid||q.id===qid)).map(q=>['Pergunta '+(Number(q.position)+1),q.text]));wb.Sheets['Instruções']=root.XLSX.utils.aoa_to_sheet(info);wb.Sheets['Instruções']['!cols']=[{wch:28},{wch:110}];
    hideTechnicalColumns(wb);if(!active(s))return false;
    const current=await readState(env.sb,s.surveyId);if(!active(s))return false;if(current.revision!==snap.revision||JSON.stringify(current.source)!==JSON.stringify(snap.source))throw new Error('A tabulação mudou durante o download. Tente novamente para obter um modelo completo da fonte atual.');
    root.XLSX.writeFile(wb,'tabulacao-simples-'+base.id.slice(0,8)+(qid?'-pergunta':'-todas')+'.xlsx',{bookType:'xlsx',compression:true});
    s.message='Modelo completo baixado. Edite somente Resposta tratada e envie o arquivo.';return true;
  });
}
function controlRows(lib,book){
  if(!book?.Sheets||!Array.isArray(book.SheetNames)||!book.Sheets._Controle)throw new Error('Use o modelo Excel exportado por esta tela.');
  const rows=lib.utils.sheet_to_json(book.Sheets._Controle,{header:1,raw:true,defval:''}),out={};
  for(const r of rows){if(!r[0])continue;const k=text(r[0]);if(out[k]!=null)throw new Error('Controle do modelo duplicado.');if(r.length>2)throw new Error('Controle do modelo alterado.');out[k]=text(r[1]);}
  if(out.schema!=='PesquisaPro-respostas-abertas-v175'||!idOk(out.survey_id)||!idOk(out.base_id)||!HEX.test(out.fingerprint||''))throw new Error('Este Excel não é um modelo válido da pesquisa.');
  if(out.simple_format&&out.simple_format!==FORMAT)throw new Error('Formato Excel não suportado nesta tela.');
  return out;
}
function manifestFromControl(control){let m;try{m=JSON.parse(control.questions);}catch(ex){throw new Error('Controle de perguntas inválido.');}if(!Array.isArray(m)||!m.length||m.some(x=>!idOk(x.id)||typeof x.sheet!=='string'||!integer(x.count)))throw new Error('Controle de perguntas inválido.');return m;}
function copyBook(lib,book){
  const out={...book,Sheets:{},SheetNames:(book.SheetNames||[]).slice()};
  for(const n of out.SheetNames){const sh=book.Sheets[n];out.Sheets[n]={...sh};if(sh?.['!cols'])out.Sheets[n]['!cols']=sh['!cols'].map(x=>({...x}));}
  return out;
}
function cellValue(lib,sh,address){const c=sh?.[address];return c?.v==null?'':c.v;}
function normalizeNewActions(lib,book,manifest,lookup){
  for(const m of manifest){const sh=book.Sheets[m.sheet],raw=lib.utils.sheet_to_json(sh,{header:1,raw:true,defval:''});for(let i=1;i<raw.length;i++){
    const answerId=text(raw[i]?.[4]),existing=lookup.get(answerId),value=text(raw[i]?.[11]);
    if(!existing)continue;
    const action=value.trim()?'TRATAR':'ORIGINAL';
    const row=i+1;sh['K'+row]={t:'s',v:action};
    if(action==='ORIGINAL')sh['L'+row]={t:'s',v:text(existing.treated_text??'')};
  }}
}
function rowsNormalize(parsed,originalRows,legacy){
  const byId=new Map(originalRows.rows.map(r=>[r.answer_id,r]));
  return parsed.rows.map(r=>{
    const origin=byId.get(r.answer_id);if(!origin)throw new Error('O modelo contém uma resposta desconhecida.');
    if(legacy&&r.action==='MANTER')return {...r,action:origin.treated_text!=null?'TRATAR':'ORIGINAL',treated_text:origin.treated_text!=null?origin.treated_text:null};
    return {...r,action:r.action==='TRATAR'?'TRATAR':'ORIGINAL',treated_text:r.action==='TRATAR'?r.treated_text:null};
  });
}
async function parseUpload(file,s){
  if(!file||!String(file.name||'').toLowerCase().endsWith('.xlsx')||file.size>MAX_FILE)throw new Error('Selecione um arquivo .xlsx de até 15 MB.');
  await env.loadExcel();if(!active(s))throw new Error('A sessão ou pesquisa mudou.');
  const buffer=await file.arrayBuffer();if(!active(s))throw new Error('A sessão ou pesquisa mudou durante a leitura.');
  root.PP_TREATMENT.zipGuard(buffer);const read=root.XLSX.read(buffer,{type:'array',raw:true,cellFormula:true,cellDates:false,bookVBA:true,cellHTML:false});if(read.vbaraw)throw new Error('Planilhas com macros não são aceitas.');
  // Verificar antes de normalizar evita esconder fórmula/link nas colunas editáveis.
  let cells=0;for(const n of read.SheetNames){const sh=read.Sheets[n];if(sh['!ref']){const range=root.XLSX.utils.decode_range(sh['!ref']);if(range.e.r>MAX_ROWS+20||range.e.c>30)throw new Error('A planilha excede os limites seguros de linhas ou colunas.');}for(const [key,cell] of Object.entries(sh)){if(key.startsWith('!'))continue;if(++cells>1400000)throw new Error('A planilha excede o limite seguro de células.');if(cell.f||cell.F||cell.t==='e'||cell.t==='d'||cell.l)throw new Error('O modelo não aceita fórmulas, erros, datas automáticas ou links. Use texto simples.');}}
  const control=controlRows(root.XLSX,read),snap=s.snapshot;if(!snap)throw new Error('Carregue o estado atual antes de enviar.');
  if(control.survey_id!==s.surveyId)throw new Error('Este Excel pertence a outra pesquisa.');
  if(snap.source&&snap.source.baseId!==control.base_id)throw new Error('O Excel usa outra base de origem. Restaure ao original antes de enviar um modelo de outra base.');
  const originalInfo=await rpc(env.sb,'tabulation_version_info_v175',{p_survey_id:s.surveyId,p_base_id:control.base_id,p_version_id:null});
  const base=normalizeBase({...originalInfo,id:control.base_id},s.surveyId);
  if(control.fingerprint!==base.source_fingerprint)throw new Error('A identificação da origem no arquivo não confere.');
  const legacy=!control.simple_format,fileSourceVersion=legacy?text(control.version_id):'';
  if(legacy&&fileSourceVersion&&!idOk(fileSourceVersion))throw new Error('Versão de origem inválida no modelo antigo.');
  const manifest=manifestFromControl(control),verify=guardSignature(s),sourceData=await root.PP_TREATMENT.allRows(env.sb,s.surveyId,base.id,fileSourceVersion||null,null,verify);
  if(!active(s))throw new Error('A sessão ou pesquisa mudou durante a leitura.');
  let parseBook=copyBook(root.XLSX,read),parseContext=questionModel(context(),base),parseOriginal=sourceData;
  if(legacy&&fileSourceVersion){const info=await root.PP_TREATMENT.resolve(env.sb,s.surveyId,{baseId:base.id,versionId:fileSourceVersion,fingerprint:control.fingerprint});parseContext={...parseContext,version:{id:info.id,base_id:base.id,survey_id:s.surveyId}};}
  if(!legacy){if(control.version_id!==''||Number(control.revision)!==0)throw new Error('Controle original do modelo simplificado alterado.');normalizeNewActions(root.XLSX,parseBook,manifest,new Map(sourceData.rows.map(r=>[r.answer_id,r])));}
  const parsed=root.PP_TREATMENT.parseWorkbook(root.XLSX,parseBook,parseContext,parseOriginal,'simple');
  const rows=rowsNormalize(parsed,parseOriginal,legacy);if(!active(s))throw new Error('A sessão ou pesquisa mudou antes da aplicação.');
  return {rows,baseId:base.id,questionIds:parsed.questionIds,changed:parsed.changed,questions:parsed.questionIds.length,file:file.name,legacy};
}
function timeoutError(ex){return ex?.name==='AbortError'||/aborted|timeout|timed out/i.test(ex?.message||'');}
function snapshotAfter(raw,s){const next=normalizeSnapshot(raw,s.surveyId);if(next.revision<s.snapshot.revision)throw new Error('A resposta do servidor voltou para uma revisão antiga.');return next;}
async function applyPending(s,pending){
  const args=pending.args;try{
    const raw=await rpc(env.sb,'tabulation_simple_apply_v176',args);if(!active(s))return false;
    s.snapshot=snapshotAfter(raw,s);s.pending=null;s.error='';s.message='Excel aplicado. Os resultados e cruzamentos já usam as respostas tratadas.';await notify(s);return true;
  }catch(ex){if(active(s)){if(timeoutError(ex)){s.pending=pending;s.error=safeError(ex);}else{s.pending=null;s.error=safeError(ex);}}return false;}
}
async function uploadFile(file){
  const s=state;if(!active(s)||s.busy||env.getBusy?.()||s.pending)return false;
  return withBusy(s,async()=>{
    s.snapshot=await readState(env.sb,s.surveyId);if(!active(s))return false;const parsed=await parseUpload(file,s);if(!active(s))return false;
    const p={p_survey_id:s.surveyId,p_base_id:parsed.baseId,p_question_ids:parsed.questionIds,p_rows:parsed.rows,p_file_name:text(file.name).slice(0,255),p_expected_revision:s.snapshot.revision,p_request_id:randomId()};
    const summary=`Aplicar “${text(file.name)}” para ${qty(parsed.questions)} pergunta(s) e ${qty(parsed.rows.length)} registro(s)?\n\nMudanças efetivas: ${qty(parsed.changed)}. O estado atual será substituído somente para esta pesquisa; outras perguntas serão preservadas e PDFs já publicados não serão alterados.`;
    if(!root.confirm(summary))return false;
    const pending={kind:'apply',args:p,summary};s.pending=pending;render();return applyPending(s,pending);
  });
}
async function restore(){
  const s=state;if(!active(s)||s.busy||env.getBusy?.()||s.pending||!s.snapshot)return false;
  if(!root.confirm('Restaurar as respostas originais desta pesquisa? Os uploads gerenciados serão removidos, a fonte voltará ao original e PDFs já publicados não serão alterados.'))return false;
  return withBusy(s,async()=>{const pending={kind:'restore',args:{p_survey_id:s.surveyId,p_expected_revision:s.snapshot.revision,p_request_id:randomId()}};s.pending=pending;try{const raw=await rpc(env.sb,'tabulation_simple_restore_v176',pending.args);if(!active(s))return false;s.snapshot=normalizeSnapshot(raw,s.surveyId);s.pending=null;s.message='Respostas originais restauradas para esta pesquisa.';await notify(s);return true;}catch(ex){if(active(s)){if(timeoutError(ex))s.error=safeError(ex);else s.pending=null,s.error=safeError(ex);}return false;}});
}
async function retry(){const s=state;if(!active(s)||s.busy||!s.pending)return false;return withBusy(s,()=>s.pending.kind==='apply'?applyPending(s,s.pending):restorePending(s,s.pending));}
async function restorePending(s,pending){try{const raw=await rpc(env.sb,'tabulation_simple_restore_v176',pending.args);if(!active(s))return false;s.snapshot=normalizeSnapshot(raw,s.surveyId);s.pending=null;s.error='';s.message='Respostas originais restauradas para esta pesquisa.';await notify(s);return true;}catch(ex){if(active(s)){if(timeoutError(ex))s.error=safeError(ex);else s.pending=null,s.error=safeError(ex);}return false;}}
async function refresh(){
  const s=state;if(!active(s)||s.busy||env.getBusy?.())return false;
  return withBusy(s,async()=>{
    const snap=await readState(env.sb,s.surveyId);
    if(!active(s))return false;
    s.snapshot=snap;s.pending=null;s.loading=false;s.error='';s.message='Estado atual carregado sem reaplicar nenhum arquivo.';await notify(s);return true;
  });
}
function bind(h){
  if(h.dataset.simpleTabulationBound)return;
  h.dataset.simpleTabulationBound='1';
  h.addEventListener('click',event=>{
    const b=event.target.closest('[data-simple-action]');if(!b||!h.contains(b)||!active(state)||state.busy||env.getBusy?.())return;
    const action=b.dataset.simpleAction;
    if(action==='download')exportExcel();
    else if(action==='restore')restore();
    else if(action==='retry')retry();
    else if(action==='refresh')refresh();
  });
  h.addEventListener('change',event=>{
    if(!active(state)||state.busy||env.getBusy?.())return;
    const el=event.target;
    if(el.matches('[data-simple-question]')){state.questionId=el.value||'';render();return;}
    if(el.matches('[data-simple-file]')){const file=el.files?.[0];if(file)uploadFile(file);}
  });
}
function mount(e){
  const old=env;env=e||null;
  const c=context(),h=env?.host;
  if(!h||!allowed(c)){if(h)h.innerHTML='<div class="callout">Esta consulta está disponível somente para a equipe autorizada da pesquisa.</div>';if(!e?.readOnly)state=null;return;}
  if(!state||state.profile!==c.profile||state.survey!==c.survey||state.surveyId!==c.survey.id||state.host!==h||state.questionSignature!==questionSignature(c))state=fresh(c,h);
  render();bind(h);
  if(!state.busy&&!state.snapshot)refresh();
}
if(root.addEventListener)root.addEventListener('beforeunload',event=>{if((state?.busy||state?.pending)&&active(state)){event.preventDefault();event.returnValue='';}});
root.PP_SIMPLE_TABULATION={markup,mount,reset,canLeave,busy:currentBusy,refresh,getState:()=>state,readState,exportExcel,uploadFile,restore,retry,sourceText};
})(typeof window!=='undefined'?window:globalThis);
