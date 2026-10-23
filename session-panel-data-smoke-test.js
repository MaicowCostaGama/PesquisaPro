const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
function block(start,end){const index=app.indexOf(start);assert(index>=0,start);return app.slice(index,app.indexOf(end,index));}
const calls=[];
const context={window:{PP_RESEARCHER_DASHBOARD:{reset:()=>{}}},CURRENT_PROFILE:{id:'a',role:'pesq'},
  AbortController,Map,Promise,console:{error:()=>{},warn:()=>{}},Date,
  SURVEYS:[],SURVEYS_LOADED:false,SURVEYS_LOADING:false,SURVEYS_LOAD_ERROR:'',
  PAYMENTS:[],PAYMENTS_LOADED:false,PAYMENTS_LOADING:false,
  MY_CONTRACT:null,MY_CONTRACT_LOADED:false,MY_CONTRACT_LOADING:false,
  CONTRACT_SETTINGS_LOADED:false,CONTRACT_SETTINGS_LOADING:false,CONTRACT_VERSION:'v1',
  MY_INVITES:[],MY_INVITES_LOADED:false,MY_INVITES_LOADING:false,MY_INVITES_LOAD_PROMISE:null,MY_INVITE_RESPONDING:null,
  MY_COMMUNICATIONS:[],MY_COMMUNICATIONS_LOADED:false,MY_COMMUNICATIONS_LOADING:false,
  MY_SURVEY_RESEARCHER_MESSAGES:[],MY_SURVEY_RESEARCHER_MESSAGES_LOADED:false,MY_SURVEY_RESEARCHER_MESSAGES_LOADING:false,MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED:0,
  document:{querySelector:()=>null},go:()=>{},
  loadUsersIfNeeded:()=>Promise.resolve(true),refreshClientSurveyLinks:()=>{},
  SURVEY_JOIN_SELECT:'*',SURVEY_JOIN_SELECT_LEGACY:'*',
  loadSurveyQuestionOptions:()=>Promise.resolve(new Map()),attachSurveyQuestionOptions:()=>{},
  idsToClientCompanies:()=>[],idsToResearcherNames:()=>[],surveyRowToSnapshot:row=>row,
  paymentRowToEntry:row=>row,contractRowToEntry:row=>row,
  isCollectionTestUser:()=>false,
  sb:{from:table=>{
    const record={table,filters:[]};calls.push(record);
    const query={select:()=>query,eq:(field,value)=>{record.filters.push({field,value});return query;},order:()=>query,
      abortSignal:signal=>{record.signal=signal;return query;},
      then:(resolve,reject)=>new Promise(done=>{record.resolve=done;}).then(resolve,reject)};
    return query;
  }}};
vm.createContext(context);
vm.runInContext(block('let APP_DATA_SESSION_EPOCH=0;','function researcherUpdateVersionFromHtml'),context);
vm.runInContext(block('async function loadMyContractIfNeeded','/* ---- convites de equipe recebidos'),context);
vm.runInContext(block('async function loadSurveysIfNeeded(){','function retrySurveysLoad()'),context);
vm.runInContext(block('async function loadPaymentsIfNeeded(){','async function loadPaymentReceiptsIfNeeded()'),context);
vm.runInContext(block('function acollectMySurveys(){','function renderAcollectSurveyPicker()'),context);
(async()=>{
  const oldContract=context.loadMyContractIfNeeded();await tick();
  const requestA=calls.at(-1);
  context.resetSessionPanelData();context.CURRENT_PROFILE={id:'b',role:'pesq'};
  assert.strictEqual(context.MY_CONTRACT,null);assert.strictEqual(context.MY_CONTRACT_LOADED,false);
  assert(requestA.signal.aborted,'contrato antigo deve ser cancelado ao trocar sessão');
  const newContract=context.loadMyContractIfNeeded();await tick();const requestB=calls.at(-1);
  requestA.resolve({data:[{id:'contract-a'}]});await oldContract;
  assert.strictEqual(context.MY_CONTRACT,null,'contrato de A não pode aparecer para B');
  assert.strictEqual(context.MY_CONTRACT_LOADING,true,'resposta de A não pode destravar carregamento de B');
  requestB.resolve({data:[]});await newContract;
  assert.strictEqual(context.MY_CONTRACT,null);assert.strictEqual(context.MY_CONTRACT_LOADED,true);

  context.resetSessionPanelData();
  const controller=new AbortController();const canceled=context.loadMyContractIfNeeded({signal:controller.signal,render:false});await tick();
  const canceledRequest=calls.at(-1);controller.abort();
  assert.strictEqual(context.MY_CONTRACT_LOADING,false,'timeout deve liberar nova tentativa');
  canceledRequest.resolve({data:[{id:'late-contract'}]});await canceled;
  assert.strictEqual(context.MY_CONTRACT,null,'resposta após cancelamento deve ser descartada');

  context.resetSessionPanelData();
  const oldSurveys=context.loadSurveysIfNeeded();const oldPayments=context.loadPaymentsIfNeeded();await tick();
  const surveyRequest=calls.findLast(call=>call.table==='surveys');
  const paymentRequest=calls.findLast(call=>call.table==='payments');
  context.resetSessionPanelData();context.CURRENT_PROFILE={id:'c',role:'pesq',name:'Mesmo nome'};
  surveyRequest.resolve({data:[{id:'survey-b'}]});paymentRequest.resolve({data:[{id:'payment-b'}]});
  await Promise.all([oldSurveys,oldPayments]);
  assert.strictEqual(context.SURVEYS.length,0);assert.strictEqual(context.PAYMENTS.length,0);
  assert.strictEqual(context.SURVEYS_LOADED,false);assert.strictEqual(context.PAYMENTS_LOADED,false);
  context.SURVEYS=[{id:'mine',status:'campo',teamIds:['c'],team:['Nome antigo']},{id:'not-mine',status:'campo',teamIds:['other'],team:['Mesmo nome']}];
  assert.deepStrictEqual(Array.from(context.acollectMySurveys(),row=>row.id),['mine']);
  assert(app.includes('teamIds:(row.survey_team||[]).map(member=>member.researcher_id)'));
  assert(app.includes('resetSessionPanelData();\n  CURRENT_PROFILE=null;'));
  console.log('Session panel data: PASS — contrato, stores completos, cancelamento e vínculo por id isolados entre contas.');
})().catch(error=>{console.error(error);process.exitCode=1;});
