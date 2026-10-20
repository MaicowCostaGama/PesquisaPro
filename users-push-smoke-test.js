const fs=require('fs');const vm=require('vm');const assert=require('assert');
const source=fs.readFileSync(__dirname+'/users-push.js','utf8');
const users=[
 {id:'11111111-1111-4111-8111-111111111111',name:'Ana Ativa',email:'ana@example.com',role:'pesq',status:'ativo'},
 {id:'22222222-2222-4222-8222-222222222222',name:'Bruno Ativo',email:'bruno@example.com',role:'cliente',status:'ativo'},
 {id:'33333333-3333-4333-8333-333333333333',name:'Carla Pendente',email:'carla@example.com',role:'pesq',status:'pendente'},
 {id:'44444444-4444-4444-8444-444444444444',name:'Diego Inativo',email:'diego@example.com',role:'pesq',status:'encerrado'},
];
let confirmation=true,goCalls=[],invocations=[];
const elements={};
const context={
 window:{},CURRENT_PROFILE:{id:'99999999-9999-4999-8999-999999999999',role:'admin',status:'ativo'},selectedRole:'admin',USERS:users,USER_TAB:'pesq',
 isValidUuid:v=>/^[0-9a-f-]{36}$/i.test(v),esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;'),jsArg:v=>JSON.stringify(String(v??'')).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/"/g,'&quot;'),
 usersInTab:()=>users.map(u=>({u})),go:key=>goCalls.push(key),confirm:()=>confirmation,alert:msg=>{context.lastAlert=msg;},setTimeout,clearTimeout,AbortController,document:{getElementById:id=>elements[id]||null},
 sb:{functions:{invoke:async(name,opts)=>{invocations.push({name,opts});return {data:{sent:2,failed:1,skipped:1,recipients:3},error:null};}}},
 console
};
context.window=context;vm.createContext(context);vm.runInContext(source,context);
const api=context.PP_USERS_PUSH;
assert(api.authorized(),'admin ativo deve poder enviar');
assert(api.headerButton().includes('Enviar Push'),'deve mostrar ação de massa');
assert(api.rowButton(users[0]).includes('Enviar Push'),'deve mostrar ação individual para ativo');
assert.strictEqual(api.rowButton(users[2]),'','não deve mostrar ação individual para pendente');
assert.strictEqual(api.rowButton(users[3]),'','não deve mostrar ação individual para encerrado');
api.open();let panel=api.panel(users);assert(panel.includes('Todos os usuários ativos do sistema'));assert(panel.includes('Ana Ativa'));assert(panel.includes('Bruno Ativo'));assert(!panel.includes('Carla Pendente'));
api.setTitle('Aviso de teste');api.setBody('Mensagem de teste');api.send();
setTimeout(()=>{
 assert.strictEqual(invocations.length,1,'deve invocar a função Edge uma vez');
 assert.strictEqual(invocations[0].name,'send-admin-user-push');
 assert.strictEqual(invocations[0].opts.body.target_mode,'all_active');
 assert.strictEqual(Array.from(invocations[0].opts.body.user_ids).length,0);
 assert(goCalls.includes('users'),'deve re-renderizar Usuários após resultado');
 panel=api.panel(users);assert(panel.includes('2 dispositivo(s) notificado(s)'));assert(panel.includes('1 sem Push cadastrado'));assert(panel.includes('1 falha(s)'));
 confirmation=false;api.openForUser(users[0].id);api.setTitle('Individual');api.setBody('Somente Ana');api.send();
 setTimeout(()=>{
  assert.strictEqual(invocations.length,1,'cancelamento não deve invocar a função');
  context.CURRENT_PROFILE.role='pesq';context.selectedRole='pesq';assert(!api.authorized());assert.strictEqual(api.headerButton(),'');
  console.log('users-push-smoke-test: ok');
 },0);
},0);
