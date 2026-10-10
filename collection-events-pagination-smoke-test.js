const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
function context({cap=1000,total=1001,withoutCount=false,failOffset=null,repeat=false,drift=false,role='admin',schema=false,recordingFirst=false}={}){
  const profile={id:'owner',role},calls=[],rows=Array.from({length:total},(_,i)=>({id:String(total-i).padStart(8,'0'),survey_id:'survey',researcher_id:'owner',quota_label:i===total-1?'Centro':'Zona Sul',occurred_at:'2026-10-09T12:00:00Z',status:'valid',is_calibration:false}));
  rows.slice(-47).forEach(r=>r.quota_label='Centro');
  let c;
  const sb={from(table){let select='',offset=0,end=1000,filters=[],orders=[],time='';const q={
    select(s,opt){select=s;q.countExact=opt?.count==='exact';return q;},
    eq(k,v){filters.push([k,v]);return q;},lte(k,v){time=[k,v];return q;},
    order(k,opt){orders.push([k,opt]);return q;},range(a,b){offset=a;end=b;return q;},
    then(resolve,reject){const call={table,select,offset,end,filters,orders,time,countExact:q.countExact};calls.push(call);
      let data=rows.filter(r=>filters.every(([k,v])=>r[k]===v));
      if(schema&&recordingFirst&&select.includes('recording_status'))return Promise.resolve({data:null,error:{message:'column recording_status does not exist'}}).then(resolve,reject);
      if(schema&&select.includes('duration_seconds'))return Promise.resolve({data:null,error:{message:'column duration_seconds does not exist'}}).then(resolve,reject);
      if(schema&&select.includes('recording_status'))return Promise.resolve({data:null,error:{message:'column recording_status does not exist'}}).then(resolve,reject);
      if(failOffset===offset)return Promise.resolve({data:null,error:{message:'falha na segunda página'}}).then(resolve,reject);
      const page=data.slice(offset,offset+Math.min(cap,end-offset+1));
      if(repeat&&offset>0&&page.length)page[0]=data[0];
      const result={data:page,error:null,count:withoutCount?null:data.length+(drift&&offset>0?1:0)};
      if(c.onPage)c.onPage(call,c);
      return Promise.resolve(result).then(resolve,reject);
    }};return q;}};
  c=vm.createContext({sb,CURRENT_PROFILE:profile,selectedRole:role,Date,Map,Set,JSON,Number,Promise,console,
    clientWithTimeout:async request=>request,stopCollectLive(){},loadUsersIfNeeded:async()=>{},
    SURVEYS:[{id:'survey'}],USERS:[],document:{querySelector:()=>null,getElementById:()=>null},
    refreshCollectCount(){},refreshCollectionTeamRows(){},renderLiveFeed(){},refreshCollectionTeamFunnelLive(){},
    go(){},calls,rows});
  const a=app.indexOf('const COLLECT_EVENT_SELECT_BASE='),b=app.indexOf('\nasync function loadCollectionRecordingsForEvents',a);
  vm.runInContext(app.slice(a,b)+'\nlet COLLECT_EVENTS=[],COLLECT_EVENTS_LOADED=false,COLLECT_EVENTS_LOADING=false;const COLLECT_IDX=0;async function loadCollectionRecordingsForEvents(){}',c);
  const m=app.indexOf('function collectionEventRowToEntry('),n=app.indexOf('\nfunction initCollectLive(',m);
  vm.runInContext(app.slice(m,n),c);
  vm.runInContext('function surveyQuotas(){return [{label:"Centro",target:47,text:"Região"}];}',c);
  const x=app.indexOf('function collectQuotaProgressRows('),y=app.indexOf('\nfunction collectQuotaStatus',x);
  vm.runInContext(app.slice(x,y),c);
  return c;
}
(async()=>{
  // A consulta antiga retorna só os 1.000 mais recentes. O registro mais antigo é do Centro.
  const c=context();
  const before=c.rows.slice(0,1000).filter(r=>r.quota_label==='Centro').length;
  assert.equal(before,46,'reprodução: Centro deve perder uma coleta no retorno truncado');
  let result=await vm.runInContext('fetchCollectionEvents({surveyId:"survey"})',c);
  assert.equal(result.error,null);assert.equal(result.data.length,1001);
  vm.runInContext('COLLECT_EVENTS=rows.map(collectionEventRowToEntry);COLLECT_EVENTS_LOADED=true;',c);
  const centro=vm.runInContext('collectQuotaProgressRows(0).quotas[0]',c);
  assert.equal(centro.collected,47);assert.equal(centro.remaining,0);
  assert.equal(c.calls.length,3);
  for(const call of c.calls){assert.equal(call.countExact,true);assert.deepEqual(call.orders.map(o=>o[0]),['occurred_at','id']);if(call.offset)assert.equal(call.time[0],'occurred_at');assert.ok(call.filters.some(f=>f[0]==='survey_id'&&f[1]==='survey'));}
  assert.equal(new Set(c.calls.filter(call=>call.offset).map(call=>call.time[1])).size,1,'snapshot deve ser o mesmo em todas as páginas');
  const lower=context({cap:125,total:1103});result=await vm.runInContext('fetchCollectionEvents()',lower);
  assert.equal(result.data.length,1103,'limite do servidor menor que o lote não deve truncar');
  const noCount=context({cap:100,total:1101,withoutCount:true});result=await vm.runInContext('fetchCollectionEvents()',noCount);assert.equal(result.data.length,1101);
  const empty=context({total:0});result=await vm.runInContext('fetchCollectionEvents()',empty);assert.equal(result.data.length,0);
  const failed=context({failOffset:500});vm.runInContext('COLLECT_EVENTS=[{id:"old",surveyId:"survey",cota:"Centro",status:"valid"}];COLLECT_EVENTS_LOADED=true;',failed);
  result=await vm.runInContext('fetchCollectionEvents({surveyId:"survey"})',failed);assert.equal(result.data,null);assert.ok(result.error);
  await vm.runInContext('pollCollectEvents(0)',failed);assert.equal(vm.runInContext('COLLECT_EVENTS[0].id',failed),'old','erro não pode aplicar uma contagem parcial');
  for(const options of [{repeat:true},{drift:true}]){const x=context(options);result=await vm.runInContext('fetchCollectionEvents()',x);assert.equal(result.data,null);assert.ok(result.error);}
  const own=context({role:'pesq'});await vm.runInContext('fetchCollectionEvents({surveyId:"survey"})',own);assert.ok(own.calls.every(call=>call.filters.some(f=>f[0]==='researcher_id'&&f[1]==='owner')));
  const unauth=context();unauth.CURRENT_PROFILE=null;result=await vm.runInContext('fetchCollectionEvents({ownOnly:true})',unauth);assert.ok(result.error);assert.equal(unauth.calls.length,0);
  const session=context();session.onPage=(_,x)=>{x.CURRENT_PROFILE={id:'another',role:'pesq'};};result=await vm.runInContext('fetchCollectionEvents()',session);assert.equal(result.data,null);assert.ok(result.error);
  const concurrent=context();const results=await vm.runInContext('Promise.all([fetchCollectionEvents({surveyId:"survey"}),fetchCollectionEvents({surveyId:"survey"})])',concurrent);assert.equal(results[0].data.length,1001);assert.equal(concurrent.calls.length,3,'requisições iguais simultâneas devem compartilhar páginas');
  const compatible=context({schema:true});result=await vm.runInContext('fetchCollectionEvents()',compatible);assert.equal(result.data.length,1001,'schema histórico deve manter paginação completa');
  const reverseSchema=context({schema:true,recordingFirst:true});result=await vm.runInContext('fetchCollectionEvents()',reverseSchema);assert.equal(result.data.length,1001,'schema deve funcionar independentemente da primeira coluna ausente');
  // A regra continua excluindo reprovações e calibrações; não se fabrica uma meta atingida.
  vm.runInContext('COLLECT_EVENTS[COLLECT_EVENTS.length-1].status="rejected";',c);assert.equal(vm.runInContext('collectQuotaProgressRows(0).quotas[0].collected',c),46);
  vm.runInContext('COLLECT_EVENTS[COLLECT_EVENTS.length-1].status="valid";COLLECT_EVENTS[COLLECT_EVENTS.length-1].calibration=true;',c);assert.equal(vm.runInContext('collectQuotaProgressRows(0).quotas[0].collected',c),46);
  assert.match(app,/async function afterLogin\(user\)\{\s*resetCollectionEventCache\(\)/);
  assert.match(app,/async function logout\(\)\{\s*resetCollectionEventCache\(\)/);
  assert.match(app,/query\.range\(offset,offset\+COLLECTION_EVENTS_PAGE_SIZE-1\)/);
  assert.match(app,/ids\.slice\(offset,offset\+250\)/,'vínculos de áudio devem ser carregados em lotes');
  assert.match(app,/COLLECTION_EVENTS_TOTAL_TIMEOUT_MS=60000/);
  console.log('collection-events-pagination-smoke-test: PASS — reprodução 46/47, 1.001+ coletas completas, limites menores, erros, sessão, RLS e compatibilidade.');
})().catch(ex=>{console.error(ex);process.exitCode=1;});
