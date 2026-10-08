const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
function ok(condition,message){assert.ok(condition,message);}
for(const token of [
  'CHAT_CHANNEL_STATUS_LOADED',
  'CHAT_CHANNEL_LAST_MESSAGES',
  'chatRememberLatestMessage',
  "sender_role",
  "Aguardando sua resposta",
  "Aguardando retorno",
  "chatSetResponseFilter",
  "chatResponseTriageMarkup",
  "select('id,channel_id,sender_id,sender_role,created_at')",
  ".in('channel_id',ids)",
  "CHAT_RESPONSE_FILTER='awaiting_return'",
])ok(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.chat-response-triage',
  '.chat-response-tabs',
  '.chat-response-tab.is-active',
  '.chat-channel-status-needs-response',
  '.chat-channel-status-awaiting-return',
])ok(css.includes(token),`style.css sem ${token}`);

const start=app.indexOf('function chatIsStaffProfile');
const end=app.indexOf('function chatLocationValues',start);
ok(start>0&&end>start,'bloco de classificação não encontrado');
const context={
  CURRENT_PROFILE:{id:'staff-1',role:'admin'},
  CHAT_STAFF_ROLES:['admin','coord','gerente','admpro'],
  CHAT_CHANNEL_LAST_MESSAGES:{},
  CHAT_CHANNEL_STATUS_ERROR:false,
  CHAT_CHANNELS:[],
  CHAT_RESPONSE_FILTER:'needs_response',
  Date,Set,Map,console,
};
vm.createContext(context);
vm.runInContext(app.slice(start,end),context);
vm.runInContext(`
  const channels=[
    {id:'pending',is_archived:false},
    {id:'waiting',is_archived:false},
    {id:'empty',is_archived:false},
    {id:'archived',is_archived:true}
  ];
  CHAT_CHANNELS=channels;
  chatRememberLatestMessage({channel_id:'pending',sender_id:'researcher-1',sender_role:'pesq',created_at:'2026-10-08T12:00:00Z'});
  chatRememberLatestMessage({channel_id:'waiting',sender_id:'staff-1',sender_role:'admin',created_at:'2026-10-08T12:00:00Z'});
  chatRememberLatestMessage({channel_id:'pending',sender_id:'researcher-1',sender_role:'pesq',created_at:'2026-10-08T11:00:00Z'});
  if(chatChannelResponseStatus(channels[0])!=='needs_response')throw Error('última mensagem externa deve aguardar resposta');
  if(chatChannelResponseStatus(channels[1])!=='awaiting_return')throw Error('última mensagem da gestão deve aguardar retorno');
  if(chatChannelResponseStatus(channels[2])!=='empty')throw Error('canal sem mensagem deve ser identificado como vazio');
  if(chatChannelResponseStatus(channels[3])!=='archived')throw Error('canal arquivado não pode entrar na fila ativa');
  if(chatVisibleChannels().map(c=>c.id).join(',')!=='pending')throw Error('filtro de resposta deve isolar a fila pendente');
  CHAT_RESPONSE_FILTER='awaiting_return';
  if(chatVisibleChannels().map(c=>c.id).join(',')!=='waiting')throw Error('filtro de retorno deve isolar respostas da gestão');
  CHAT_RESPONSE_FILTER='all';
  if(chatVisibleChannels().length!==4)throw Error('filtro Todas deve manter todos os canais autorizados');
  const counts=chatResponseCounts();
  if(counts.needs_response!==1||counts.awaiting_return!==1)throw Error('contagens de triagem incorretas');
`,context);
console.log('Communication response status smoke test: PASS — remetente, filtros, contagens, canais vazios/arquivados e isolamento por perfil verificados.');
