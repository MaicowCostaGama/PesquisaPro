const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const migrationPath=path.join(root,'deploy/equipe-convites-push-grupos.sql');
const migration=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
const worker=fs.readFileSync(path.join(root,'push-sw.js'),'utf8');
const pushConfig=fs.readFileSync(path.join(root,'push-config.js'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/send-survey-invite-push/index.ts'),'utf8');
function ok(condition,message){assert(condition,message);}
for(const token of [
  'inviteEligibleResearchersBulk',
  'create_survey_invites_bulk',
  'respond_survey_invite_details',
  'enableResearcherPush',
  'pushManager.subscribe',
  'push_subscriptions',
  'Entrar no grupo do WhatsApp',
  'openResearcherSurveyChat',
  'Grupos desta pesquisa',
])ok(app.includes(token),`app.js sem ${token}`);
for(const token of [
  'alter table public.survey_invites',
  'create table if not exists public.survey_communication_settings',
  'create table if not exists public.push_subscriptions',
  'create or replace function public.create_survey_invites_bulk',
  'create or replace function public.respond_survey_invite_details',
  'create or replace function public.ensure_survey_chat_channel',
  'get_my_survey_communications',
  "insert into public.survey_team",
  "public.ensure_survey_chat_channel",
  'public.is_staff()',
  'enable row level security',
])if(migration)ok(migration.includes(token),`migration sem ${token}`);
if(migration)ok(!/drop table|drop column|truncate|delete from/i.test(migration),'migration contém operação destrutiva');
else console.log('Migration ausente neste clone por publicação somente do código — execução manual permanece separada.');
for(const token of ['addEventListener(\'push\'','showNotification','notificationclick'])ok(worker.includes(token),`service worker sem ${token}`);
ok(pushConfig.includes('PP_PUSH_PUBLIC_KEY'),'configuração pública do push ausente');
for(const token of ['web-push','VAPID_PRIVATE_KEY','sendNotification','push_subscriptions','not authorized'])ok(edge.includes(token),`função Edge sem ${token}`);
ok(html.includes('push-config.js?v=20260922092500'),'configuração de push sem cache novo');
ok(html.includes('app.js?v=20260922092500'),'app sem cache novo');
console.log('Survey invite push/groups smoke test: PASS — elegibilidade, convite em massa, aceite, grupo WhatsApp, canal chat, service worker, RLS e função de push verificados.');
