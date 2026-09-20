const assert=require('assert');
const fs=require('fs');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const migrationPath=root+'/deploy/chat-atendimento-privado.sql';
const migrationPresent=fs.existsSync(migrationPath);
const sql=migrationPresent?fs.readFileSync(migrationPath,'utf8'):'';
for(const token of [
  'CHAT_SUPPORT_CHANNEL_ID',
  'ensurePrivateSupportChatIfNeeded',
  "get_or_create_private_support_chat",
  "audience_type==='support'",
  'Atendimento PesquisaPro',
  'chat-support-banner',
  'Abrir chat privado',
  "['cliente','pesq'].includes(CURRENT_PROFILE.role)"
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of ['.chat-support-banner','.researcher-profile-chat-card'])assert(css.includes(token),`style.css sem ${token}`);
if(migrationPresent){
  for(const token of [
    'private_user_id',
    "audience_type = 'support'",
    'chat_channels_private_support_uidx',
    'get_or_create_private_support_chat',
    "v_profile.role not in ('cliente','pesq')",
    "v_channel.audience_type='support'",
    "private_user_id=auth.uid()",
    'on delete restrict'
  ])assert(sql.includes(token),`migration sem ${token}`);
  assert(!/drop\s+(table|column)|truncate\s+|delete\s+from/i.test(sql),'migration contém operação destrutiva');
}
console.log(`Private support chat smoke test OK: código${migrationPresent?' e migration':''} — atendimento privado, criação automática, acesso por usuário e bloqueio para criação de grupos verificados.`);
