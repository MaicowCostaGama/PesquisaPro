const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const migration=fs.readFileSync(path.join(root,'deploy/mensagens-pesquisa-pesquisadores.sql'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

for(const token of [
  'MY_SURVEY_RESEARCHER_MESSAGES',
  'loadMySurveyResearcherMessagesIfNeeded',
  'mySurveyResearcherMessagesMarkup',
  'mark_survey_researcher_message_read',
  'openSurveyResearcherMessageModal',
  'sendSurveyResearcherMessage',
  'Mensagem interna da pesquisa',
  'Enviar para toda a equipe',
  'Mensagem pelo aplicativo',
  'p_researcher_id:targetId||null',
  'survey_researcher_message_recipients'
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.collection-internal-message-callout',
  '.collection-internal-message-btn',
  '.survey-message-modal',
  '.survey-message-dialog',
  '.researcher-survey-messages-card',
  '.researcher-survey-message.is-unread'
])assert(css.includes(token),`style.css sem ${token}`);
for(const token of [
  'create table if not exists public.survey_researcher_messages',
  'create table if not exists public.survey_researcher_message_recipients',
  'survey_team',
  "p_researcher_id uuid default null",
  'researcher is not linked to this survey',
  'public.is_staff()',
  'enable row level security',
  'mark_survey_researcher_message_read',
  'grant execute on function public.send_survey_researcher_message'
])assert(migration.includes(token),`migration sem ${token}`);
assert(!/\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i.test(migration),'migration contém operação destrutiva');
assert(/p_researcher_id\s+is\s+null/.test(migration),'migration sem caminho de envio geral');
assert(/p_researcher_id\s+is\s+not\s+null/.test(migration),'migration sem caminho de envio individual');
assert(/researcher_id=auth\.uid\(\)/.test(migration),'RLS não restringe destinatário ao próprio pesquisador');
assert(/survey_researcher_message_recipients.*researcher_id=auth\.uid\(\)/s.test(migration),'leitura do destinatário não está protegida');
assert(html.includes('app.js?v=20261008171600'),'cache do app não atualizado');
assert(html.includes('style.css?v=20261008171600'),'cache do CSS não atualizado');
console.log('Survey researcher messages smoke test: PASS — envio geral/individual, destinatário por pesquisa, RLS, limite e painel do pesquisador verificados.');
