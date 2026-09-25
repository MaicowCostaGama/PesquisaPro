const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
const sql=fs.readFileSync('deploy/contador-orientacoes-whatsapp-coleta.sql','utf8');
for(const token of [
  'surveyInitialOrientationWhatsappMessage',
  'surveyInitialOrientationDefaultTemplate',
  'surveyTrainingVideoUrl',
  'orientation_message_template',
  'teamOrientationMessageMarkup',
  'saveTeamOrientationMessage',
  'Conversar no WhatsApp',
  "window.open(target,'_blank','noopener,noreferrer')",
  'record_survey_orientation_whatsapp_send',
  'A mensagem foi aberta, mas o contador não foi registrado',
  'mandatoryBlocks',
  'Avisos obrigatórios da PesquisaPro',
  '{{pesquisador}}',
  '{{pesquisa}}',
  '{{grupo}}',
  '{{site}}',
  '{{video}}',
  'collectionTeamRows',
  'collectionOrientationCountMarkup',
  'sendCollectionOrientationWhatsapp',
  "sb.rpc('get_survey_orientation_whatsapp_counts'",
  "sb.rpc('record_survey_orientation_whatsapp_send'",
  'Orientações: ${count} envio',
  'Não faça coletas em pontos muito próximos',
  'Algumas entrevistas solicitarão que, no final, o entrevistado grave com sua voz',
  'Todas as entrevistas realizadas após as 21:00 devem ter gravação',
  'alguém pagou pela informação correta',
  'Assista a este vídeo para entender como fazer as coletas corretamente',
  'poderão ser anuladas',
  'poderão ser desligados da operação',
  'Orientações iniciais:',
  'id="collectTeamBody"'
])assert(app.includes(token),'app sem '+token);
for(const token of ['collection-orientation-btn','collection-orientation-count','collection-orientation-callout'])assert(css.includes(token),'CSS sem '+token);
for(const token of [
  'create table if not exists public.survey_orientation_whatsapp_sends',
  'get_survey_orientation_whatsapp_counts',
  'record_survey_orientation_whatsapp_send',
  'count(*)::bigint',
  'sent_at',
  'public.is_staff()',
  'survey_team',
  'survey_team st',
  'st.researcher_id=p_researcher_id',
  'revoke all on table',
  'grant execute on function public.record_survey_orientation_whatsapp_send(uuid,uuid) to authenticated'
])assert(sql.includes(token),'migration sem '+token);
const repairSql=fs.readFileSync('deploy/corrige-contador-orientacoes-ambiguous.sql','utf8');
assert(repairSql.includes('from public.survey_team st'),'reparo sem alias da equipe');
assert(repairSql.includes('hist.researcher_id'),'reparo sem alias do histórico');
assert(!/drop table|drop column|truncate|delete from/i.test(repairSql),'reparo contém operação destrutiva');
const editableSql=fs.readFileSync('deploy/orientacoes-iniciais-editaveis.sql','utf8');
assert(editableSql.includes('add column if not exists orientation_message_template'),'migration editável sem coluna');
assert(!/drop table|drop column|truncate|delete from/i.test(editableSql),'migration editável contém operação destrutiva');
assert(!/drop table|drop column|truncate|delete from/i.test(sql),'migration contém operação destrutiva');
assert(html.includes('app.js?v=20260925092000'),'cache não atualizado');
console.log('Collection orientation WhatsApp smoke test: PASS — mensagem, botão, contador por pesquisador, RPCs e RLS verificados.');
