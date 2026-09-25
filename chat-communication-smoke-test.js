const assert=require('assert');
const fs=require('fs');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const migration=fs.readFileSync(root+'/deploy/chat-comunicacao-segmentada.sql','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
for(const token of [
  "communication:{ico:'✉'",
  "chat_channels",
  "chat_messages",
  "chat_create_channel",
  "chat_send_message",
  "audience_type==='survey'",
  "chatOpenSurveyChannel",
  "researcher-profile-chat-card",
  "Atualização ao vivo",
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of ['.chat-layout','.chat-channel-item','.chat-message','.chat-compose','.researcher-profile-chat-card'])assert(css.includes(token),`style.css sem ${token}`);
for(const token of [
  "create table if not exists public.chat_channels",
  "create table if not exists public.chat_messages",
  "create table if not exists public.chat_message_reads",
  "create or replace function public.chat_user_can_access_channel",
  "create or replace function public.chat_create_channel",
  "create or replace function public.chat_send_message",
  "create or replace function public.chat_mark_read",
  "chat_location_matches",
  "survey_team",
  "survey_clients",
  "profile_cidades_atuacao",
  "alter publication supabase_realtime add table public.chat_messages",
  "enable row level security",
])assert(migration.includes(token),`migration sem ${token}`);
assert(!/drop table|drop column|truncate|delete from/i.test(migration),'migration contém operação destrutiva');
assert(html.includes('style.css?v=20260925092000'),'cache do chat não atualizado');
console.log('Chat communication smoke test: PASS — canais, públicos, pesquisa, perfil do pesquisador, RLS e realtime verificados.');
