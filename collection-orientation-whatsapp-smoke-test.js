const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
const sql=fs.readFileSync('deploy/contador-orientacoes-whatsapp-coleta.sql','utf8');
for(const token of [
  'surveyInitialOrientationWhatsappMessage',
  'collectionTeamRows',
  'collectionOrientationCountMarkup',
  'sendCollectionOrientationWhatsapp',
  "sb.rpc('get_survey_orientation_whatsapp_counts'",
  "sb.rpc('record_survey_orientation_whatsapp_send'",
  'Orientações: ${count} envio',
  'Não faça coletas em pontos muito próximos',
  'Gravações curtas de voz do entrevistado poderão ser solicitadas aleatoriamente',
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
  'revoke all on table',
  'grant execute on function public.record_survey_orientation_whatsapp_send(uuid,uuid) to authenticated'
])assert(sql.includes(token),'migration sem '+token);
assert(!/drop table|drop column|truncate|delete from/i.test(sql),'migration contém operação destrutiva');
assert(html.includes('app.js?v=20260922224500'),'cache não atualizado');
console.log('Collection orientation WhatsApp smoke test: PASS — mensagem, botão, contador por pesquisador, RPCs e RLS verificados.');
