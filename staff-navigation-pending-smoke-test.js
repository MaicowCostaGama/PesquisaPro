const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'deploy/contadores-pendencias-menu.sql'),'utf8');
function ok(condition,message){if(!condition)throw Error(message);}
const start=app.indexOf('const STAFF_NAV_BADGE_LABELS=');
const end=app.indexOf('function buildSidebar()',start);
ok(start>0&&end>start,'funções do menu não encontradas');
const labels={contracts:'Contratos',communication:'Comunicação',users:'Usuários'};
const nodes=Object.fromEntries(Object.keys(labels).map(key=>{
  const badge={hidden:true,textContent:''};
  const attrs={};
  return [key,{badge,attrs,querySelector:()=>badge,setAttribute:(name,value)=>{attrs[name]=value;},title:''}];
}));
let calls=0,failing=false;
const context={
  CURRENT_PROFILE:{id:'gestor-1',role:'admin'},
  NAV_META:Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,{label}])),
  sb:{rpc:async name=>{ok(name==='staff_navigation_pending_counts','RPC de contagem incorreta');calls++;return failing?{error:{message:'indisponível'}}:{data:{contracts:165,users:7,communication:3}};}},
  document:{querySelector:selector=>nodes[selector.match(/data-key="([^"]+)"/)?.[1]]||null,addEventListener:()=>{},visibilityState:'visible'},
  console:{warn:()=>{}},setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>2,clearTimeout:()=>{},Date,Number,Math,Object,
};
vm.createContext(context);
const state=app.match(/^let STAFF_NAV_PENDING_COUNTS=.*$/m)?.[0];
ok(state,'declaração do estado de badges não encontrada');
vm.runInContext(state,context);
vm.runInContext(app.slice(start,end),context);
(async()=>{
  await vm.runInContext('refreshStaffNavPendingCounts(true)',context);
  ok(calls===1,'deve haver uma consulta agregada ao banco');
  ok(nodes.contracts.badge.textContent==='99+'&&!nodes.contracts.badge.hidden,'contratos devem ser exibidos com teto visual, sem truncar o rótulo acessível');
  ok(nodes.contracts.attrs['aria-label'].includes('165'),'contagem exata deve permanecer acessível');
  ok(nodes.users.badge.textContent==='7'&&nodes.communication.badge.textContent==='3','usuários e comunicação não devem compartilhar o mesmo número');
  failing=true;
  await vm.runInContext('refreshStaffNavPendingCounts(true)',context);
  ok(Object.values(nodes).every(node=>node.badge.hidden),'falha na RPC não deve exibir números antigos como atuais');
  vm.runInContext('stopStaffNavPendingMonitor();CURRENT_PROFILE={id:"pesquisador-2",role:"pesq"};renderStaffNavPendingCounts()',context);
  await vm.runInContext('refreshStaffNavPendingCounts(true)',context);
  ok(calls===2,'pesquisador não pode chamar a RPC de gestão');
  ok(Object.values(nodes).every(node=>node.badge.hidden),'badge da conta anterior não deve vazar entre perfis');
  for(const key of Object.keys(labels))ok(app.includes(`STAFF_NAV_BADGE_LABELS[i.key]`)&&app.includes('nav-pending-badge'),`botão ${key} deve conter badge numérico`);
  ok(app.includes('stopStaffNavPendingMonitor();')&&app.includes('startStaffNavPendingMonitor();'),'monitor deve iniciar e parar com a sessão');
  ok(app.includes("channel?.audience_type==='support'"),'mensagens de suporte devem invalidar a contagem');
  ok(app.includes('STAFF_NAV_PENDING_REFRESH_TIMER=setTimeout'),'eventos rápidos devem ser agrupados');
  ok(css.includes('.nav-item .nav-pending-badge[hidden]{display:none}'),'badge zerado deve ser realmente oculto');
  ok(css.includes('finance-table-scroll'),'CSS financeiro preexistente deve permanecer intacto');
  ok(sql.includes('public.chat_user_can_access_channel(c.id)')&&sql.includes('last_message.current_sender_role'),'canais e remetentes devem ser conferidos no SQL');
  ok(sql.includes("c.audience_type = 'support'")&&sql.includes('c.is_archived = false'),'canal arquivado ou grupal não pode gerar pendência');
  ok(sql.includes('public.contract_settings')&&sql.includes('rc.contract_version = v_version'),'contrato deve ser comparado à versão atual');
  ok(sql.includes("p.status = 'pendente'")&&sql.includes("s.status in ('novo','diligencia')"),'cadastros novos e usuários pendentes devem ser considerados');
  ok(!/\b(delete\s+from|truncate|drop\s+table)\b/i.test(sql),'migration não pode apagar dados');
  console.log('Staff navigation pending smoke test: PASS — badge, privilégios, falhas, contratos e chats.');
})().catch(error=>{console.error(error);process.exitCode=1;});
