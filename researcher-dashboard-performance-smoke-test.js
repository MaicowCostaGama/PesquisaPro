const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(__dirname+'/researcher-dashboard-data.js','utf8');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};

function environment(){
  const calls=[],timers=new Map(),pending=[];
  let timerId=0;
  const responses={surveys:{data:[]},payments:{data:[]}};
  const stalled=new Set();
  const context={window:{},CURRENT_PROFILE:{id:'researcher-a',role:'pesq',name:'Ana'},
    document:{querySelector:()=>({dataset:{key:'dashboard-pesq'}})},
    console:{warn:()=>{}},Date,Promise,AbortController,
    setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},
    clearTimeout:id=>timers.delete(id),go:()=>{},esc:value=>String(value),
    sb:{from:table=>{
      const call={table};calls.push(call);
      const query={select:fields=>{call.fields=fields;return query;},
        eq:(field,value)=>{call.filter={field,value};return query;},
        order:field=>{call.order=field;return query;},
        range:(from,to)=>{call.from=from;call.to=to;return query;},
        abortSignal:signal=>{
          call.signal=signal;
          if(stalled.has(table))return new Promise(resolve=>pending.push({table,resolve}));
          const result=responses[table];
          let data=result.data||[];
          if(call.filter)data=data.filter(row=>row[call.filter.field]===call.filter.value);
          return Promise.resolve({...result,data:data.slice(call.from,call.to+1)});
        }};
      return query;
    }}};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,api:context.window.PP_RESEARCHER_DASHBOARD,calls,timers,responses,stalled,pending};
}
function installDashboard(context){
  let heavyLoads=0;
  Object.assign(context,{PAGES:{},SURVEYS:[{id:'never-use-full-store'}],PAYMENTS:[],
    CONTRACT_SETTINGS_LOADED:true,MY_CONTRACT_LOADED:true,MY_CONTRACT:{id:'signed'},
    MY_INVITES_LOADED:true,MY_INVITES:[],MY_INVITE_RESPONDING:null,INVITE_FOCUS_ID:null,
    PUSH_STATUS:'unsupported',PUSH_STATUS_LOADING:false,RESEARCHER_ALERT_PREFS_LOADED:true,
    RESEARCHER_ALERT_PREFS_SCHEMA_MISSING:false,RESEARCHER_ALERT_PREFS_ERROR:false,
    MY_COMMUNICATIONS_LOADED:true,MY_SURVEY_RESEARCHER_MESSAGES_LOADED:true,
    MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING:false,MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED:Date.now(),
    SURVEYS_LOADED:false,PAYMENTS_LOADED:false,
    loadSurveysIfNeeded:()=>{heavyLoads++;},loadPaymentsIfNeeded:()=>{heavyLoads++;},
    loadContractSettingsIfNeeded:()=>{},loadMyContractIfNeeded:()=>{},loadMyInvitesIfNeeded:()=>{},
    loadPushStatusIfNeeded:()=>{},loadResearcherAlertPreferencesIfNeeded:()=>{},
    loadMySurveyCommunicationsIfNeeded:()=>{},loadMySurveyResearcherMessagesIfNeeded:()=>{},
    head:(title,subtitle)=>title+' '+subtitle,
    brl:value=>'R$ '+Number(value).toFixed(2),
    isCollectionTestUser:()=>false,acollectMySurveys:()=>{throw Error('Store completo não deve ser usado');},
    mySurveyResearcherMessagesMarkup:surveys=>'avisos:'+surveys.map(s=>s.name).join(','),
    mySurveyCommunicationsMarkup:()=>'',researcherPushCard:()=>'',researcherAlertPreferencesCard:()=>'',
    researcherAvailableSurveysMarkup:surveys=>'disponiveis:'+surveys.map(s=>s.id).join(','),
    jsArg:value=>JSON.stringify(value)});
  const start=app.indexOf("PAGES['dashboard-pesq']=()=>{");
  vm.runInContext(app.slice(start,app.indexOf('/* ============ ÁREA DO CLIENTE',start)),context);
  return ()=>heavyLoads;
}

(async()=>{
  const env=environment();
  const {context,api,responses,stalled,calls}=env;
  const heavyLoads=installDashboard(context);
  responses.surveys.data=[
    {id:'s1',name:'Pesquisa A',status:'campo',price:10,survey_team:[{researcher_id:'researcher-a'}]},
    {id:'s2',name:'Pesquisa B',status:'campo',price:20,survey_team:[{researcher_id:'other'}]},
    {id:'s3',name:'Arquivada',status:'campo',price:999,archived_at:'2026-10-01',survey_team:[{researcher_id:'researcher-a'}]}
  ];
  responses.payments.data=[
    {id:'p1',survey_id:'s1',researcher_id:'researcher-a',valid_count:4,status:'aprovado'},
    {id:'p2',survey_id:'s2',researcher_id:'researcher-a',valid_count:2,status:'auditoria'},
    {id:'p3',survey_id:'s3',researcher_id:'researcher-a',valid_count:100,status:'aprovado'},
    {id:'p4',survey_id:'s1',researcher_id:'other',valid_count:500,status:'aprovado'}
  ];
  stalled.add('payments');
  let html=context.PAGES['dashboard-pesq']();
  assert(html.includes('Carregando pesquisas disponíveis'));
  assert(html.includes('Carregando seu resumo de ganhos'));
  assert.strictEqual(calls.length,2,'consultas essenciais devem começar em paralelo');
  await tick();
  assert(api.ready('surveys'));assert(!api.ready('payments'));
  html=context.PAGES['dashboard-pesq']();
  assert(html.includes('disponiveis:s1'),'pesquisas devem aparecer antes dos pagamentos');
  assert(!html.includes('disponiveis:s1,s2'),'vínculo deve usar id e não nome');
  assert(!html.includes('R$ 0.00'),'carregamento não pode parecer saldo zero');
  assert.strictEqual(heavyLoads(),0,'dashboard não deve carregar stores completos');
  assert(calls.every(call=>!call.fields.includes('survey_question')));
  assert(calls.every(call=>call.table!=='profiles'));
  const paymentQuery=calls.find(call=>call.table==='payments');
  assert.deepStrictEqual(paymentQuery.filter,{field:'researcher_id',value:'researcher-a'});
  assert(paymentQuery.signal instanceof AbortSignal);
  env.pending.find(item=>item.table==='payments').resolve({data:responses.payments.data.filter(p=>p.researcher_id==='researcher-a')});
  await tick();
  html=context.PAGES['dashboard-pesq']();
  assert(html.includes('R$ 40.00'),'ganhos aprovados devem manter fórmula anterior e excluir arquivadas');
  assert(html.includes('avisos:Pesquisa A,Pesquisa B,Arquivada'),'avisos recebem os nomes do resumo');
  assert.strictEqual(context.SURVEYS[0].id,'never-use-full-store');
  assert.strictEqual(context.SURVEYS_LOADED,false,'resumo nunca marca questionário completo');
  assert.strictEqual(context.PAYMENTS_LOADED,false,'resumo não contamina o financeiro completo');
  api.ensure();await tick();assert.strictEqual(calls.length,2,'re-render não repete consultas prontas');

  const failure=environment();
  failure.responses.surveys={error:{message:'Servidor indisponível'}};
  failure.api.ensure();await tick();
  assert(!failure.api.ready('surveys'));
  assert(failure.api.statusMarkup('surveys','Pesquisas').includes('Tentar novamente'));
  for(let i=0;i<5;i++)failure.api.ensure();await tick();
  assert.strictEqual(failure.calls.length,2,'falha não pode criar repetição automática');
  failure.responses.surveys={data:[{id:'recovered',survey_team:[]}]};
  failure.api.retry('surveys');await tick();assert(failure.api.ready('surveys'));

  const timeout=environment();timeout.stalled.add('payments');
  timeout.api.ensure();await tick();
  Array.from(timeout.timers.values()).filter(t=>t.delay===15000).forEach(t=>t.fn());
  await tick();
  assert(timeout.api.statusMarkup('payments','Ganhos').includes('15 segundos'));
  assert(timeout.calls.find(call=>call.table==='payments').signal.aborted,'consulta deve ser cancelada no limite');
  timeout.api.ensure();await tick();assert.strictEqual(timeout.calls.length,2);
  timeout.stalled.delete('payments');timeout.api.retry('payments');await tick();
  assert(timeout.api.ready('payments'),'timeout deve permitir nova tentativa explícita');

  const isolated=environment();isolated.stalled.add('payments');
  isolated.api.ensure();await tick();
  const old=isolated.pending[0];
  isolated.context.CURRENT_PROFILE={id:'researcher-b',role:'pesq',name:'Bia'};
  isolated.stalled.delete('payments');isolated.api.ensure();await tick();
  old.resolve({data:[{id:'secret',researcher_id:'researcher-a',valid_count:999}]});await tick();
  assert(!isolated.api.payments().some(row=>row.id==='secret'),'resposta de outra sessão deve ser descartada');

  const pages=environment();
  pages.responses.payments.data=Array.from({length:501},(_,i)=>({id:'p'+i,researcher_id:'researcher-a',valid_count:1}));
  pages.api.ensure();await tick();
  assert.strictEqual(pages.api.payments().length,501,'paginação não deve truncar ganhos em 500 registros');
  assert.strictEqual(pages.calls.filter(call=>call.table==='payments').length,2);

  let auxiliaryCalls=0;
  failure.api.loadAuxiliary('optional',()=>{auxiliaryCalls++;},()=>false);await tick();
  for(let i=0;i<5;i++)failure.api.loadAuxiliary('optional',()=>{auxiliaryCalls++;},()=>false);
  await tick();assert.strictEqual(auxiliaryCalls,1,'seção auxiliar falha não cria loop');
  failure.api.retryAuxiliary();failure.api.loadAuxiliary('optional',()=>{auxiliaryCalls++;},()=>false);await tick();
  assert.strictEqual(auxiliaryCalls,2);
  const auxiliaryTimeout=environment();
  let auxiliarySignal,auxiliaryReady=false;
  auxiliaryTimeout.api.loadAuxiliary('pending',options=>{auxiliarySignal=options.signal;return new Promise(()=>{});},()=>auxiliaryReady);
  await tick();
  Array.from(auxiliaryTimeout.timers.values()).filter(t=>t.delay===15000).forEach(t=>t.fn());await tick();
  assert(auxiliarySignal.aborted,'timeout auxiliar deve cancelar a consulta');
  assert(auxiliaryTimeout.api.auxiliaryNotice().includes('Tentar novamente'),'timeout auxiliar deve oferecer nova tentativa');
  auxiliaryTimeout.api.retryAuxiliary();
  auxiliaryTimeout.api.loadAuxiliary('pending',()=>{auxiliaryReady=true;},()=>auxiliaryReady);await tick();
  assert(!auxiliaryTimeout.api.auxiliaryNotice(),'nova tentativa auxiliar deve recuperar seção');
  assert(app.includes("window.PP_RESEARCHER_DASHBOARD?.invalidate('payments')"));
  assert(app.includes("window.PP_RESEARCHER_DASHBOARD?.invalidate('surveys')"));
  console.log('Researcher dashboard performance: PASS — resumo leve, paralelo, parcial, paginação, timeout, retry, isolamento e ganhos preservados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
