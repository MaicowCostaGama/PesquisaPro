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
  'function chatLoadResearcherLocations(profileIds)',
  "function chatCanViewResearcherLocations(){return ['admin','admpro'].includes(CURRENT_PROFILE?.role);}",
  "select('id,role,profile_cidades_atuacao(cidade)')",
  'Cidade de atuação: ',
  'Cidades de atuação: ',
  "chatResearcherLocationMarkup(channel.private_user_id,'chat-channel-location')",
  "chatResearcherLocationMarkup(message.sender_id,'chat-message-location')",
  "chatResearcherLocationMarkup(active.private_user_id,'chat-room-location')",
  "if(chatIsStaffProfile()&&message.sender_role==='pesq')chatLoadResearcherLocations([message.sender_id])",
  'chatResetResearcherLocationCache();',
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of ['.chat-layout','.chat-channel-item','.chat-message','.chat-compose','.researcher-profile-chat-card','.chat-channel-location','.chat-room-location','.chat-message-location'])assert(css.includes(token),`style.css sem ${token}`);
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
const version=html.match(/name="pesquisapro-app-version" content="([^"]+)"/)?.[1];
assert(version&&html.includes(`style.css?v=${version}`)&&html.includes(`app.js?v=${version}`),'cache de CSS ou app não acompanha a versão do painel');
console.log('Chat communication smoke test: PASS — canais, públicos, pesquisa, cidade de atuação do pesquisador, perfil, RLS e realtime verificados.');
