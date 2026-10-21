const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const path=require('path');
const root=__dirname;
const moduleSource=fs.readFileSync(path.join(root,'system-messages.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const migration=fs.readFileSync(path.join(root,'deploy/mensagens-sistema-obrigatorias.sql'),'utf8');
const ok=(condition,message)=>assert(condition,message);

for(const token of [
  'window.PP_SYSTEM_MESSAGES?.start()',
  'window.PP_SYSTEM_MESSAGES?.reset()',
  'window.PP_SYSTEM_MESSAGES&&!window.PP_SYSTEM_MESSAGES.guardNavigation(key)',
  'window.PP_SYSTEM_MESSAGES?.load(true)',
  'window.PP_SYSTEM_MESSAGES?.rowButton',
  'systemMessageButton',
])ok(app.includes(token),`app.js sem ${token}`);
for(const token of [
  'get_my_pending_system_messages',
  'acknowledge_system_message',
  'send_system_message',
  'target_mode',
  'p_is_mandatory:true',
  'mensagens-sistema-obrigatorias.sql',
  'systemMessageGate',
  'users-system-message-panel',
  'Enviar aviso obrigatório',
])ok(moduleSource.includes(token),`system-messages.js sem ${token}`);
for(const token of [
  '.system-message-gate[hidden]{display:none}',
  '.system-message-gate-dialog',
  '.system-message-gate-consent',
  '.users-system-message-panel',
  'body.system-message-gate-open',
])ok(css.includes(token),`style.css sem ${token}`);
for(const token of [
  'create table if not exists public.system_messages',
  'create table if not exists public.system_message_recipients',
  'public.send_system_message(',
  'public.get_my_pending_system_messages()',
  'public.acknowledge_system_message(p_message_id uuid)',
  'public.get_system_message_recipients(p_message_id uuid)',
  "p_target_mode not in ('all_active','selected')",
  "p.status='ativo'",
  'r.recipient_id=auth.uid()',
  'r.acknowledged_at is null',
  'acknowledged_at=coalesce',
  'public.is_staff()',
])ok(migration.includes(token),`migration sem ${token}`);
ok(!/\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i.test(migration),'migration contém operação destrutiva');
ok(html.includes('system-messages.js?v=20261021100700'),'módulo global sem cache v184');
ok(html.includes('app.js?v=20261021100700'),'app sem cache v184');
ok(html.includes('style.css?v=20261021100700'),'CSS sem cache v184');

const users=[
  {id:'11111111-1111-4111-8111-111111111111',name:'Ana Ativa',email:'ana@example.com',role:'pesq',status:'ativo'},
  {id:'22222222-2222-4222-8222-222222222222',name:'Bruno Ativo',email:'bruno@example.com',role:'cliente',status:'ativo'},
  {id:'33333333-3333-4333-8333-333333333333',name:'Carla Encerrada',email:'carla@example.com',role:'pesq',status:'encerrado'},
];
const pending=[{message_id:'m1',title:'Orientação',body:'Leia esta orientação.',sender_name:'Coordenação',sender_role:'coord',created_at:new Date().toISOString(),expires_at:null}];
const calls=[];
const elements={};
const checkbox={checked:false,focus(){}};
const button={disabled:false,textContent:'',onclick:null,focus(){}};
const content={innerHTML:'',querySelector(selector){return selector.includes('input')?checkbox:null;}};
const documentMock={
  activeElement:null,
  body:{classList:{add(){},remove(){}},appendChild(el){elements[el.id]=el;}},
  addEventListener(){},
  createElement(){return {id:'',className:'',hidden:true,innerHTML:'',addEventListener(){},querySelectorAll(){return[];},querySelector(){return checkbox;}};},
  getElementById(id){if(id==='systemMessageGateContent')return content;if(id==='systemMessageGateConfirm')return button;return elements[id]||null;},
  querySelector(selector){return selector.includes('input')?checkbox:null;},
};
let goCalls=[];
let confirmResult=true;
const context={
  window:null,document:documentMock,console,Date,Promise,setTimeout,clearTimeout,
  CURRENT_PROFILE:{id:'99999999-9999-4999-8999-999999999999',role:'admin',status:'ativo'},selectedRole:'admin',USERS:users,USER_TAB:'pesq',ACOLLECT_IN_PROGRESS:false,
  isValidUuid:value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  jsArg:value=>JSON.stringify(String(value??'')),go:key=>goCalls.push(key),confirm:()=>confirmResult,alert:message=>{context.lastAlert=message;},
  usersInTab:()=>users.map(u=>({u})),
  sb:{rpc:async(name,params)=>{
    calls.push({name,params});
    if(name==='get_my_pending_system_messages')return {data:pending.slice(),error:null};
    if(name==='acknowledge_system_message'){pending.splice(0,1);return {data:{message_id:params.p_message_id},error:null};}
    if(name==='send_system_message')return {data:{recipient_count:params.p_target_mode==='selected'?1:2,message_id:'m2'},error:null};
    return {data:null,error:{message:'rpc inesperada'}};
  }},
};
context.window=context;
vm.createContext(context);
vm.runInContext(moduleSource,context);
const api=context.PP_SYSTEM_MESSAGES;
ok(api&&typeof api.start==='function','API global de mensagens não foi criada');

(async()=>{
  await api.start();
  ok(api.state().blocking,'pendência deve bloquear após consulta');
  ok(api.guardNavigation('dashboard')===false,'navegação deve ser bloqueada enquanto houver pendência');
  checkbox.checked=true;api.consentChanged(true);await api.acknowledge();
  ok(calls.some(call=>call.name==='acknowledge_system_message'),'confirmação não foi registrada');
  ok(!api.state().blocking,'após confirmar a última mensagem o bloqueio deve fechar');
  ok(api.guardNavigation('dashboard')===true,'navegação deve ser liberada após a confirmação');

  api.open();api.setTitle('Aviso geral');api.setBody('Mensagem geral');await api.send();
  const general=calls.find(call=>call.name==='send_system_message');
  ok(general,'envio geral não chamou a RPC');
  ok(general.params.p_target_mode==='all_active'&&general.params.p_recipient_id===null,'envio geral usou destinatário incorreto');
  ok(api.state().notice.includes('2 destinatário(s)'),'resultado geral não informou destinatários');

  api.openForUser(users[0].id);api.setTitle('Aviso individual');api.setBody('Mensagem individual');await api.send();
  const individual=calls.filter(call=>call.name==='send_system_message').at(-1);
  ok(individual.params.p_target_mode==='selected'&&individual.params.p_recipient_id===users[0].id,'envio individual usou destinatário incorreto');
  ok(!api.rowButton(users[2]).length,'usuário encerrado não deve receber ação de aviso');
  ok(api.rowButton(users[0]).includes('Enviar aviso'),'usuário ativo deve receber ação de aviso');
  console.log('system-messages-smoke-test: PASS — consulta, bloqueio global, confirmação, envio geral e individual verificados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
