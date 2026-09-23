const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('app.html','utf8');
const migration=fs.readFileSync('deploy/contador-convites-whatsapp.sql','utf8');
for(const token of [
  'whatsappInviteCountMarkup',
  'recordSurveyInviteWhatsappSend',
  "sb.rpc('record_survey_invite_whatsapp_send'",
  'whatsapp_sent_count',
  'await tracking',
  'WhatsApp: ${count} envio'
])assert(app.includes(token),`contador ausente no app: ${token}`);
for(const token of [
  'add column if not exists whatsapp_sent_count integer not null default 0',
  'add column if not exists whatsapp_last_sent_at timestamptz',
  'record_survey_invite_whatsapp_send',
  'coalesce(whatsapp_sent_count,0)+1',
  'public.is_staff()',
  'grant execute on function public.record_survey_invite_whatsapp_send(uuid) to authenticated'
])assert(migration.includes(token),`migration sem ${token}`);
assert(!/drop table|drop column|truncate|delete from/i.test(migration),'migration contém operação destrutiva');
assert(html.includes('app.js?v=20260923135500'),'cache do contador não atualizado');
console.log('WhatsApp invite counter smoke test: PASS — contador por pesquisa/pesquisador, RPC atômica, data do último envio e exibição na equipe.');
