const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const sql=fs.readFileSync(__dirname+'/deploy/confirmacao-leitura-antes-coleta.sql','utf8');
const html=fs.readFileSync(__dirname+'/app.html','utf8');
const ok=(condition,message)=>assert(condition,message);
const section=(begin,end)=>{
  const start=app.indexOf(begin),stop=app.indexOf(end,start+begin.length);
  ok(start>=0&&stop>start,'funções não encontradas: '+begin);
  return app.slice(start,stop);
};
ok(/if\(CURRENT_PROFILE\?\.role==='pesq'\)\{[\s\S]*?acollectRequireNoticesBeforeStart\(surveyId\)[\s\S]*?if\(!ready\|\|surveyId!==ACOLLECT_SURVEY_ID\)/.test(app),'Iniciar coleta deve exigir verificação online ANTES de reservar/gravar');
ok(app.indexOf('acollectRequireNoticesBeforeStart(surveyId)',app.indexOf('async function acollectStart()'))<app.indexOf('await acollectValidateLocation()',app.indexOf('async function acollectStart()')),'O bloqueio precisa anteceder o início da entrevista');
ok(app.includes('if(ACOLLECT_IN_PROGRESS)'), 'Entrevista em andamento não pode ser interrompida para leitura');
ok(app.includes('role="alertdialog"')&&app.includes('aria-modal="true"'),'Balão acessível ausente');
ok(app.includes('Li integralmente este aviso')&&app.includes('input type="checkbox"'),'Aceite consciente ausente');
ok(css.includes('.acollect-notice-gate[hidden]{display:none}')&&css.includes('max-height:calc(100dvh'),'Diálogo móvel ou estado oculto não protegido');
ok(/add column if not exists acknowledged_at/.test(sql),'Confirmação separada da leitura deve ser aditiva');
ok(/r\.researcher_id=auth\.uid\(\)/g.test(sql)&&/m\.survey_id=p_survey_id/g.test(sql),'RPCs precisam restringir por destinatário e pesquisa');
ok(/r\.acknowledged_at is null/.test(sql)&&/set acknowledged_at=coalesce/.test(sql),'A consulta precisa retornar somente avisos sem confirmação');
ok(/read_at=coalesce/.test(sql)&&!/(drop table|truncate|delete from)/i.test(sql),'Não pode apagar dados nem substituir leitura já registrada');
ok(app.includes("if(error&&/acknowledged_at/i.test(error.message||''))"),'O painel deve continuar lendo avisos antes da migration manual');
ok(!html.includes('acollectNoticeGate'),'O balão é criado apenas quando necessário');
const p1={message_id:'m1',sender_name:'Coordenação',body:'Entrevista real e gravação após 21h',created_at:new Date().toISOString()};
const p2={...p1,message_id:'m2',body:'Atualização da pesquisa'};
function context(){
  const state={pending:[p1,p2],calls:[],alerts:[],errors:[],renders:0,closed:0,starts:0,checkbox:{checked:true},button:{disabled:false,textContent:''}};
  const ctx={CURRENT_PROFILE:{id:'researcher-1',role:'pesq'},ACOLLECT_SURVEY_ID:'survey-1',ACOLLECT_IN_PROGRESS:false,
    MY_SURVEY_RESEARCHER_MESSAGES:[{message_id:'m1',read_at:null}],console:{warn:()=>{}},Date,
    sb:{rpc:async(name,params)=>{state.calls.push({name,params});if(name==='get_pending_survey_collection_messages')return {data:state.pending};if(name==='acknowledge_survey_collection_message'){
      const index=state.pending.findIndex(m=>m.message_id===params.p_message_id);if(index<0)return {error:{message:'ausente'}};
      state.pending.splice(index,1);return {error:null};
    }return {error:{message:'RPC desconhecida'}};}},
    document:{querySelector:s=>s.includes('input')?state.checkbox:{dataset:{key:'app-collect'}},getElementById:id=>id==='acollectNoticeGateConfirm'?state.button:null},
    alert:text=>state.alerts.push(text),
    acollectRenderNoticeGate:error=>{state.renders++;if(error)state.errors.push(error)},acollectCloseNoticeGate:()=>{state.closed++},acollectStart:async()=>{state.starts++},
  };
  vm.createContext(ctx);
  vm.runInContext('let ACOLLECT_NOTICE_GATE_ACKING=false,ACOLLECT_NOTICE_GATE_SURVEY_ID=null,ACOLLECT_NOTICE_GATE_RESEARCHER_ID=null,ACOLLECT_NOTICE_GATE_MESSAGES=[],ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;\n'+
    section('async function acollectFetchPendingNotices(surveyId){','async function acollectConfirmNoticeRead(){')+
    section('async function acollectConfirmNoticeRead(){','function renderAcollectActionState(){'),ctx);
  return {state,ctx};
}
(async()=>{
  const {state,ctx}=context();
  const gate=await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',ctx);
  ok(gate===false&&state.renders===1&&state.starts===0,'Avisos pendentes devem abrir balão sem iniciar entrevista');
  await vm.runInContext('acollectConfirmNoticeRead()',ctx);
  ok(state.pending.length===1&&state.starts===0&&state.renders===2,'Confirmar primeiro aviso não libera a entrevista');
  ok(ctx.MY_SURVEY_RESEARCHER_MESSAGES[0].read_at,'Confirmação deve refletir leitura na caixa de entrada');
  await vm.runInContext('acollectConfirmNoticeRead()',ctx);
  ok(state.pending.length===0&&state.starts===1&&state.closed===1,'Após confirmar todos, retomar início apenas uma vez');
  ok(state.calls.filter(x=>x.name==='acknowledge_survey_collection_message').length===2,'Cada aviso exige confirmação individual');
  state.pending=[p1];state.starts=0;ctx.ACOLLECT_SURVEY_ID='survey-2';
  const stale=await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',ctx);
  ok(stale===false&&state.starts===0,'Retorno de outra pesquisa não libera coleta errada');
  ctx.ACOLLECT_SURVEY_ID='survey-1';state.pending=[];
  const ready=await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',ctx);
  ok(ready===true,'Pesquisa sem avisos pendentes deve continuar normalmente');
  const checkbox=context();await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',checkbox.ctx);
  checkbox.state.checkbox.checked=false;await vm.runInContext('acollectConfirmNoticeRead()',checkbox.ctx);
  ok(checkbox.state.pending.length===2&&checkbox.state.starts===0&&checkbox.state.calls.length===1,'Sem checkbox, não pode confirmar nem avançar');
  const ackFailure=context();await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',ackFailure.ctx);
  ackFailure.ctx.sb.rpc=async()=>({error:{message:'sem internet'}});
  await vm.runInContext('acollectConfirmNoticeRead()',ackFailure.ctx);
  ok(ackFailure.state.starts===0&&ackFailure.state.pending.length===2&&ackFailure.state.errors.length===1,'Erro de confirmação não pode liberar entrevista');
  const fail=context();fail.ctx.sb.rpc=async()=>({error:{message:'rede indisponível'}});
  const blocked=await vm.runInContext('acollectRequireNoticesBeforeStart("survey-1")',fail.ctx);
  ok(blocked===false&&fail.state.alerts.length===1&&fail.state.starts===0,'Sem verificação, falhar fechado sem iniciar');
  console.log('Collection mandatory notice smoke test: PASS — pesquisa, falha segura e duas confirmações verificadas.');
})().catch(e=>{console.error(e);process.exitCode=1});
