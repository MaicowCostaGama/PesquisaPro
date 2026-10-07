const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'deploy/orientacoes-internas-coleta.sql'), 'utf8');

assert(!app.includes('Recurso ainda não configurado:'), 'botões sem efeito ainda usam alerta enganoso');
assert(!app.includes('pesquisapro.com.br/cadastro/mg2026-x8f3'), 'link fictício de autocadastro ainda existe');
assert(!app.includes('CONRE 0000'), 'responsável técnico fictício ainda exibido');
assert(!app.includes('5534999990001'), 'telefones fictícios ainda exibidos na equipe');
assert(!app.includes("stat('Amostra total','4.200'"), 'cotas demonstrativas apresentadas como reais');
assert(app.includes('function openSurveyQuotaProgress(index)'), 'atalho para metas reais ausente');
assert(app.includes("document.getElementById('collectTabMetasBtn')?.click()"), 'a página de cotas não abre a aba real');
for (const fragment of [
  'Salvar modelo · indisponível', 'Exportar dados · indisponível',
  'Relatório por e-mail · indisponível', 'não são salvas nem usadas nos contratos',
  'Nenhuma alteração aqui seria salva', 'Bônus meta diária', 'Não configurado',
  'function openSurveyInitialOrientationModal(',
  "sb.rpc('send_survey_initial_orientation'",
  "sb.rpc('get_survey_orientation_inapp_counts'",
  "stage=invite?.status==='aceito'&&inappCount===0?'accepted'",
  'COLLECT_SURVEY_ORIENTATION_GROUP',
  'Todas as entrevistas realizadas após as 21:00 devem ter gravação',
  'WhatsApp aberto:', 'Isso não confirma a leitura.'
]) assert(app.includes(fragment), `função ou transparência ausente: ${fragment}`);
for (const fragment of [
  'create table if not exists public.survey_researcher_orientation_sends',
  'public.send_survey_researcher_message(p_survey_id,p_body,p_researcher_id)',
  'public.is_staff()', 'auth.uid()',
  'public.send_survey_initial_orientation', 'public.get_survey_orientation_inapp_counts',
  'revoke all on public.survey_researcher_orientation_sends',
  'grant execute on function public.send_survey_initial_orientation(uuid,uuid,text) to authenticated'
]) assert(sql.includes(fragment), `migration sem ${fragment}`);
assert(!/\b(?:delete\s+from|truncate|drop\s+(?:table|column))\b/i.test(sql), 'migration contém instrução destrutiva');

const version=html.match(/name="pesquisapro-app-version" content="(\d+)"/)?.[1];
assert(version && html.includes(`app.js?v=${version}`) && html.includes(`style.css?v=${version}`), 'cache inconsistente');

// Executa a função real, isolada do app e sem contactar Supabase ou WhatsApp.
const start=app.indexOf('function signupPageUrl(){');
const end=app.indexOf('function sendSignupWhatsApp(){', start);
assert(start>=0 && end>start,'funções reais do cadastro ausentes');
let copied='', downloaded='', alerted='';
const box={querySelector: selector => selector==='canvas' ? {toDataURL:()=> 'data:image/png;base64,c2FtcGxl'} : null};
const context={URL, window:{location:{href:'https://www.pesquisa-pro.com/app.html'}},
  navigator:{clipboard:{writeText:async text=>{copied=text;}}},
  alert:text=>{alerted=text;},
  document:{getElementById:()=>box, createElement:()=>({click(){downloaded=this.download;},remove(){}}),body:{appendChild:()=>{}}}};
vm.createContext(context);
vm.runInContext(app.slice(start,end),context);
const expected='https://www.pesquisa-pro.com/cadastro.html';
assert.equal(context.signupPageUrl(),expected,'endereço gerado não aponta para o cadastro real');
Promise.resolve(context.copySignupLink()).then(()=>{
  assert.equal(copied,expected,'Copiar link copiou endereço diferente do usado no QR');
  context.downloadSignupQr();
  assert.equal(downloaded,'pesquisapro-autocadastro.png','botão de QR não iniciou download real');
  assert(alerted.includes('copiado'),'cópia não informou resultado verdadeiro');
  console.log('Ações e orientações internas smoke test: PASS');
}).catch(e=>{console.error(e);process.exitCode=1;});
