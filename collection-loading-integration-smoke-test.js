const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const ui=fs.readFileSync(__dirname+'/collection-loading-ui.js','utf8');
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function block(start,end){const at=app.indexOf(start);assert(at>=0,start);const to=app.indexOf(end,at);assert(to>at,end);return app.slice(at,to);}
function environment(){
  const elements={};
  for(const id of ['startCollectBtn','geoHint','acollectSurveyPicker','acollectSurveyLabel','acollectLoadStatus','acollectQuotas','geoLog'])elements[id]={innerHTML:'',textContent:'',style:{},disabled:true};
  const resources=new Map(),calls=[],promises=new Map(),snapshots=new Map(),counts=new Map(),logs=[];
  let callback=null;
  const key=(name,id)=>name+':'+(id||'');
  const state=(name,id)=>resources.get(key(name,id))||{status:'idle',error:''};
  const set=(name,id,status,error='')=>resources.set(key(name,id),{status,error});
  function load(name,id){
    const k=key(name,id);if(promises.has(k))return promises.get(k).promise;
    calls.push({name,id});set(name,id,'loading');
    const promise=new Promise((resolve,reject)=>promises.set(k,{resolve,reject,promise:null}));
    promises.get(k).promise=promise;callback?.(name,id);return promise;
  }
  const data={setOnChange:fn=>{callback=fn;},state,survey:id=>snapshots.get(id)||null,
    surveys:()=>logs,recent:()=>[],previous:()=>null,quotas:id=>counts.get(id)||{},
    ensureIndex:()=>load('index'),loadSurvey:id=>load('survey',id),loadPrevious:id=>load('previous',id),
    loadRecent:()=>load('recent'),loadQuotas:id=>load('quotas',id),
    invalidate:(name,id)=>{set(name,id,'idle');promises.delete(key(name,id));},cancelPending:()=>{},reset:()=>{}};
  const context={console,Promise,Map,setTimeout,clearTimeout,CURRENT_PROFILE:{id:'p1',role:'pesq',status:'ativo'},selectedRole:'pesq',
    ACOLLECT_SURVEY_ID:'s1',ACOLLECT_SELECTED_QUOTA:null,ACOLLECT_QUOTA_LIST:[],ACOLLECT_QUOTA_COUNTS:{},
    ACOLLECT_IN_PROGRESS:false,ACOLLECT_START_LOADING:false,ACOLLECT_SUBMITTING:false,ACOLLECT_STARTED_AT:null,ACOLLECT_ANSWERS:{},
    GEO:{status:'granted'},SURVEYS:[{id:'s1',questions:['WRONG GLOBAL SNAPSHOT']}],
    CONTRACT_SETTINGS_LOADED:true,MY_CONTRACT_LOADED:true,MY_CONTRACT:{id:'mine'},
    ACOLLECT_NOTICE_GATE_CHECKING:false,ACOLLECT_RECORDING_REQUIRED:false,ACOLLECT_RECORDING_STATUS:'not_selected',
    ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF:false,ACOLLECT_RECORDING_FEATURE_AVAILABLE:true,ACOLLECT_TICK:null,
    document:{querySelector:()=>({dataset:{key:'app-collect'}}),getElementById:id=>elements[id]||null,
      createElement:()=>({innerHTML:'',style:{}})},
    PP_COLLECTION_DATA:data,esc:value=>String(value??''),isCollectionTestUser:()=>false,
    renderAcollectQuotas:()=>{context.ACOLLECT_QUOTA_LIST=[{label:'Cota A',target:10}];},renderGeoLog:()=>{},
    renderAcollectForm:()=>{},renderAcollectRecording:()=>{},acollectMissingRequired:()=>[],geoStatusUi:()=>({hint:'GPS'}),
    alert:()=>{},acollectRequireNoticesBeforeStart:()=>Promise.resolve(true),acollectValidateLocation:()=>Promise.resolve({ok:true}),
    acollectClearTerminationNotice:()=>{},acollectIntegrityMessage:()=>{},
    acollectResetRecordingState:()=>{context.ACOLLECT_RECORDING_REQUIRED=false;},
    acollectReserveRecording:()=>{calls.push({name:'recording'});return Promise.resolve();}};
  elements.startCollectBtn.parentNode={insertBefore:(element)=>{elements[element.id]=element;}};
  context.window=context;vm.createContext(context);vm.runInContext(ui,context);
  vm.runInContext(block('function acollectData(){',"PAGES['app-collect']=()=>{"),context);
  vm.runInContext(block('function renderAcollectActionState(){','/* antes de começar a entrevista'),context);
  vm.runInContext(block('async function acollectStart(){','function acollectCancel()'),context);
  function resolve(name,id,value){
    if(name==='survey')snapshots.set(id,value);
    if(name==='quotas')counts.set(id,value);
    set(name,id,'ready');const pending=promises.get(key(name,id));promises.delete(key(name,id));pending?.resolve(value);callback?.(name,id);
  }
  function reject(name,id,errorName='Error'){set(name,id,'error','Falha simulada');const pending=promises.get(key(name,id));promises.delete(key(name,id));const error=new Error('Falha simulada');error.name=errorName;pending?.reject(error);callback?.(name,id);}
  function ready(){
    snapshots.set('s1',{id:'s1',name:'Pesquisa escolhida',status:'campo',teamIds:['p1'],questions:[{dbId:'q1',opts:['Sim'],endsInterview:[false]}]});
    for(const name of ['survey','previous','quotas'])set(name,'s1','ready');
    counts.set('s1',{});context.ACOLLECT_SELECTED_QUOTA='Cota A';context.ACOLLECT_QUOTA_LIST=[{label:'Cota A',target:10}];
  }
  return {context,elements,data,state,set,calls,promises,resolve,reject,ready,snapshots};
}
(async()=>{
  const parallel=environment();parallel.context.PP_COLLECTION_LOADING.mount();await tick();
  assert.deepStrictEqual(parallel.calls.map(call=>call.name).sort(),['index','previous','quotas','recent','survey']);
  assert(parallel.elements.startCollectBtn.disabled,'início bloqueado enquanto dados obrigatórios estão pendentes');
  assert(parallel.elements.acollectLoadStatus.innerHTML.includes('Questionário da pesquisa'));
  parallel.resolve('survey','s1',{id:'s1',name:'Pesquisa escolhida',status:'campo',teamIds:['p1'],questions:[{dbId:'q1'}]});
  parallel.resolve('previous','s1',null);parallel.resolve('quotas','s1',{});await tick();
  parallel.context.ACOLLECT_SELECTED_QUOTA='Cota A';parallel.context.renderAcollectActionState();
  assert(!parallel.elements.startCollectBtn.disabled,'lista e histórico visual não devem bloquear dados essenciais já prontos');
  assert.strictEqual(parallel.context.acollectCurrentSurvey().questions[0].dbId,'q1','formulário não pode usar snapshot global de outra finalidade');
  parallel.set('previous','s1','error');parallel.context.renderAcollectActionState();
  assert(parallel.elements.startCollectBtn.disabled,'erro de coleta anterior deve bloquear');
  parallel.set('previous','s1','ready');parallel.set('quotas','s1','error');parallel.context.renderAcollectActionState();
  assert(parallel.elements.startCollectBtn.disabled,'erro de cotas não pode virar coleta livre');

  const failure=environment();failure.ready();
  failure.data.loadPrevious=()=>Promise.resolve(null);
  failure.data.loadQuotas=()=>{failure.set('quotas','s1','error');return Promise.reject(new Error('Sem internet'));};
  await failure.context.acollectStart();
  assert(!failure.context.ACOLLECT_IN_PROGRESS);assert(!failure.context.ACOLLECT_START_LOADING);
  assert(!failure.calls.some(call=>call.name==='recording'),'não reservar gravação nem iniciar antes de validar cota');

  const previousFailure=environment();previousFailure.ready();
  previousFailure.data.loadPrevious=()=>Promise.reject(new Error('Sem internet'));
  await previousFailure.context.acollectStart();assert(!previousFailure.context.ACOLLECT_IN_PROGRESS);
  assert(!previousFailure.calls.some(call=>call.name==='recording'));

  const night=environment();night.ready();night.data.loadPrevious=()=>Promise.resolve(null);night.data.loadQuotas=()=>Promise.resolve({});
  night.context.acollectReserveRecording=()=>{night.context.ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF=true;return Promise.resolve();};
  await night.context.acollectStart();
  assert(night.context.ACOLLECT_IN_PROGRESS);assert(night.context.ACOLLECT_RECORDING_REQUIRED);
  assert.strictEqual(night.context.ACOLLECT_RECORDING_STATUS,'awaiting_consent');
  assert(night.elements.acollectActions.innerHTML.includes('Após 21h, grave a confirmação final'));
  assert(night.elements.acollectActions.innerHTML.includes('disabled onclick="acollectSubmit()"'));

  const switcher=environment();switcher.context.PP_COLLECTION_LOADING.prepare('s1');
  switcher.context.PP_COLLECTION_LOADING.prepare('s2');await tick();
  switcher.resolve('survey','s2',{id:'s2',name:'Atual',status:'campo',teamIds:['p1'],questions:[]});
  switcher.resolve('previous','s2',null);switcher.resolve('quotas','s2',{});
  switcher.resolve('survey','s1',{id:'s1',name:'Antiga',status:'campo',teamIds:['p1'],questions:[]});
  switcher.resolve('previous','s1',null);switcher.resolve('quotas','s1',{});await tick();
  assert.strictEqual(switcher.context.ACOLLECT_SURVEY_ID,'s2');
  assert.strictEqual(switcher.elements.acollectSurveyLabel.textContent,'Atual');

  const fallback=environment();fallback.data.surveys().push({id:'s2',name:'Disponível',status:'campo',teamIds:['p1']});
  fallback.context.PP_COLLECTION_LOADING.mount();await tick();fallback.resolve('index',undefined,[]);await tick();
  assert.strictEqual(fallback.context.ACOLLECT_SURVEY_ID,'s2','pesquisa retirada do índice deve dar lugar à primeira autorizada');
  fallback.resolve('survey','s2',{id:'s2',name:'Disponível',status:'campo',teamIds:['p1'],questions:[]});
  fallback.resolve('previous','s2',null);fallback.resolve('quotas','s2',{});await tick();
  assert(fallback.context.PP_COLLECTION_LOADING.ready());

  const revoked=environment();revoked.data.surveys().push({id:'s1',name:'Antiga',status:'campo',teamIds:['p1']},{id:'s2',name:'Nova',status:'campo',teamIds:['p1']});
  revoked.context.PP_COLLECTION_LOADING.mount();await tick();revoked.resolve('index',undefined,[]);await tick();
  revoked.reject('survey','s1','CollectionDataAuthorizationError');revoked.resolve('previous','s1',null);revoked.resolve('quotas','s1',{});await tick();
  assert.strictEqual(revoked.context.ACOLLECT_SURVEY_ID,null,'não continuar exibindo pesquisa sem autorização');
  revoked.resolve('index',undefined,[]);await tick();
  assert.strictEqual(revoked.context.ACOLLECT_SURVEY_ID,'s2','mesmo índice atrasado não pode recolocar a pesquisa com autorização negada');
  assert.strictEqual(revoked.calls.filter(call=>call.name==='index').length,2,'recuperação deve atualizar o índice sem loop');

  const notice=environment();notice.ready();notice.context.SURVEYS=[{id:'s1',name:'Nome global errado'}];
  notice.context.ACOLLECT_NOTICE_GATE_SURVEY_ID='s1';notice.context.ACOLLECT_NOTICE_GATE_MESSAGES=[{sender_name:'Equipe',body:'Orientação obrigatória',created_at:'2026-10-23T20:00:00Z'}];
  notice.context.ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;
  notice.context.acollectNoticeGateElement=()=>({hidden:true});notice.context.acollectMessageRequiresTrainingVideo=()=>false;
  notice.context.surveyTrainingVideoUrl=()=>'';notice.context.acollectNoticeGateUpdateConfirm=()=>{};
  notice.context.document.body={classList:{add:()=>{}}};
  notice.elements.acollectNoticeGateContent={innerHTML:'',querySelector:()=>null};notice.elements.acollectNoticeGateConfirm={textContent:''};
  vm.runInContext(block("function acollectRenderNoticeGate(errorMessage=''){",'async function acollectFetchPendingNotices'),notice.context);
  notice.context.acollectRenderNoticeGate();
  assert(notice.elements.acollectNoticeGateContent.innerHTML.includes('<strong>Pesquisa escolhida</strong>'));
  assert(!notice.elements.acollectNoticeGateContent.innerHTML.includes('Nome global errado'),'aviso não pode identificar uma pesquisa pelo store legado');
  const start=app.slice(app.indexOf('async function acollectStart(){'),app.indexOf('function acollectCancel()'));
  for(const token of ['acollectRequireNoticesBeforeStart','acollectValidateLocation','quotaEntry.target','acollectReserveRecording','ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF'])assert(start.includes(token),token);
  const form=block('function renderAcollectForm(){','function acollectStartTicking(){');assert(form.includes('acollectCurrentSurvey()'));
  assert(app.includes('Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação do entrevistado no final'));
  console.log('Collection loading integration: PASS — carga paralela, bloqueios em falha, snapshot escolhido, seleção tardia e áudio noturno preservados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
