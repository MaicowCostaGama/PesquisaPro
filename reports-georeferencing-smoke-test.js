const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('style.css','utf8');
const moduleStart=app.indexOf('/* Georreferenciamento geral dos Relatórios:'),moduleEnd=app.indexOf('PAGES.reports=()=>{',moduleStart);
assert(moduleStart>0&&moduleEnd>moduleStart);
const page=app.slice(moduleEnd,app.indexOf('\nfunction reportsPickSurvey',moduleEnd));
assert(page.indexOf('${reportsHeatmapMarkup(survey)}')<page.indexOf('${reportsGeoMarkup(survey)}'));
assert(page.indexOf('${reportsGeoMarkup(survey)}')<page.indexOf('id="rp-output"'));
assert(app.includes('reportsGeoReset();'),'sessão não limpa mapa');
assert(app.includes('reportsLoadAndRender(true);reportsGeoLoad(true);'),'atualização ao vivo ausente');
assert(css.includes('.reports-geo-controls')&&css.includes('.reports-geo-map{height:430px'));
assert(!app.includes('COLLECT_MAP_MAX_POINTS'),'corte de 120 ainda presente');
const geoModule=app.slice(moduleStart,moduleEnd);
for(const token of ['storage_path','pix','phone','email','value_text','innerHTML=error','localStorage','getPublicUrl'])assert(!geoModule.includes(token),`dado/ação indevida no módulo: ${token}`);
const elements={};
function element(id){return elements[id]={id,isConnected:true,dataset:{},style:{},value:'',hidden:false,textContent:'',innerHTML:''};}
for(const id of ['rp-georeferencing','rp-geo-refresh','rp-geo-stats','rp-geo-researcher','rp-geo-status','rp-geo-summary','rp-geo-error','rp-geo-map','rp-geo-map-loading'])element(id);
elements['rp-georeferencing'].dataset.surveyId='survey-a';
let survey={id:'survey-a',name:'Pesquisa de teste',status:'closed'},result={data:[],error:null},request=null;
const markers=[];
class MapStub{setCenter(){}setZoom(){}fitBounds(){}}
class MarkerStub{constructor(options){this.options=options;this.listeners={};markers.push(this);}setMap(map){this.removed=map===null;}addListener(event,fn){this.listeners[event]=fn;}}
class InfoStub{setContent(value){this.content=value;}open(){}close(){this.closed=true;}}
class BoundsStub{extend(){}getCenter(){return {lat:-23,lng:-46};}}
const google={maps:{Map:MapStub,Marker:MarkerStub,InfoWindow:InfoStub,LatLngBounds:BoundsStub,event:{clearInstanceListeners(){}}}};
const context={clientReportsViewSurvey:()=>survey,clientReportsFullAllowed:()=>false,CURRENT_PROFILE:{id:'staff',role:'admin'},USERS:[{id:'r1',name:'Pesquisador <Teste>'}],loadUsersIfNeeded:async()=>{},document:{getElementById:id=>elements[id]||null},window:{google},google,Date,console,esc:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),googleBalloonIcon:color=>({color}),googleMapErrorText:()=> 'Não foi possível carregar Google Maps.',reportsCurrentSurvey:()=>survey,fetchCollectionEvents:async options=>{request=options;return result;},loadGoogleMaps:async()=>{}};
vm.createContext(context);
const helperStart=app.indexOf('function isCollectionTestEvent('),helperEnd=app.indexOf('\nlet RESEARCHER_PROFILE_CITIES',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'helper de isolamento não encontrado');
vm.runInContext(app.slice(helperStart,helperEnd),context);
vm.runInContext(geoModule+'\nthis.geo={allowed:reportsGeoAllowed,normalize:reportsGeoNormalizeRows,model:reportsGeoModel,markup:reportsGeoMarkup,load:reportsGeoLoad,render:reportsGeoRender,filters:reportsGeoApplyFilters,reset:reportsGeoReset,stop:reportsGeoStop,map:reportsGeoRenderMap};',context);
const run=code=>vm.runInContext(code,context),geo=context.geo;
assert.strictEqual(run('isCollectionTestEvent({is_collection_test:true})'),true);
assert.strictEqual(run('isCollectionTestEvent({researcher_id:"r1"})'),false);
const row=(id,overrides={})=>({id,survey_id:'survey-a',researcher_id:'r1',status:'valid',is_calibration:false,lat:-23.551234,lng:-46.633789,occurred_at:'2026-10-12T12:00:00Z',...overrides});
(async()=>{
  const rows=[row('valid'),row('rejected',{status:'rejected'}),row('calibration',{is_calibration:true}),row('pending',{status:'pending_recording'}),row('missing',{lat:null}),row('invalid',{lat:95}),row('zero',{lat:0,lng:0}),row('blank',{lng:''}),row('another',{researcher_id:'r2',lat:-22,lng:-43})];
  const normalized=geo.normalize(rows);
  assert.equal(normalized[0].lat,-23.551);assert.equal(normalized[0].lng,-46.634);
  assert.equal(normalized.filter(event=>!event.hasGps).length,4);
  assert(!('phone' in normalized[0])&&!('survey_id' in normalized[0]));
  const all=geo.model(normalized,{researcher:'all',status:'all'});
  assert.equal(all.total,9);assert.equal(all.withGps,5);assert.equal(all.withoutGps,4);assert.equal(all.areas.length,2);assert.equal(all.areas.reduce((sum,area)=>sum+area.count,0),all.withGps);
  assert.equal(geo.model(normalized,{researcher:'r1',status:'valid'}).withGps,1);
  for(const status of ['rejected','calibration','pending'])assert.equal(geo.model(normalized,{researcher:'all',status}).selected,1);
  assert(geo.markup(survey).includes('Disponível também após concluir a pesquisa'));
  result={data:rows,error:null};await geo.load();
  assert.equal(request.surveyId,'survey-a');assert.equal(run('RP_GEO_CACHE.events.length'),rows.length);
  assert(elements['rp-geo-summary'].textContent.includes('sem GPS válido'));
  assert(markers.length>0);assert(!elements['rp-geo-error'].textContent);
  const previous=run('RP_GEO_CACHE.events');result={data:[row('partial')],error:{message:'falha de página'}};await geo.load(true);
  assert.strictEqual(run('RP_GEO_CACHE.events'),previous);assert(run('RP_GEO_CACHE.error').includes('Mantido o último histórico completo'));
  assert.equal(elements['rp-geo-refresh'].disabled,false);
  elements['rp-geo-researcher'].value='all';elements['rp-geo-status'].value='all';geo.filters();
  assert(markers.every(marker=>!marker.options.position||Math.round(marker.options.position.lat*1000)===marker.options.position.lat*1000));
  const groupMarker=markers[markers.length-2];groupMarker.listeners.click();
  assert(run('RP_GEO_MAP_STATE.info.content').includes('&lt;Teste&gt;'));
  assert(!run('RP_GEO_MAP_STATE.info.content').includes('-23.551'));
  // Dados sintéticos de teste: mais de 5.000 áreas não são silenciosamente descartadas.
  const many=Array.from({length:6001},(_,i)=>({lat:-20+i*.001,lng:-40,count:1,counts:{valid:1,rejected:0,calibration:0,pending:0},researcherIds:new Set(['r1']),lastAt:null}));
  geo.map(many);assert.equal(run('RP_GEO_MAP_STATE.markers.length'),6001);
  // Uma resposta antiga não pode entrar na pesquisa nova.
  let resolve;context.fetchCollectionEvents=()=>new Promise(r=>resolve=r);
  const oldLoad=geo.load(true);await new Promise(resolveTick=>setImmediate(resolveTick));survey={id:'survey-b',name:'Outra pesquisa',status:'active'};elements['rp-georeferencing'].dataset.surveyId='survey-b';
  resolve({data:[row('stale')],error:null});await oldLoad;assert.strictEqual(run('RP_GEO_CACHE.events'),previous);
  // O reset remove dados e marcadores; perfis sem liberação não recebem dados da gestão.
  geo.reset();assert.equal(run('RP_GEO_CACHE.events.length'),0);assert.equal(run('RP_GEO_MAP_STATE'),null);
  survey={id:'survey-a',name:'Teste'};elements['rp-georeferencing'].dataset.surveyId='survey-a';context.fetchCollectionEvents=async()=>({data:[row('partial')],error:{message:'timeout'}});
  await geo.load();assert.equal(run('RP_GEO_CACHE.loaded'),false);assert.equal(run('RP_GEO_CACHE.events.length'),0);assert(run('RP_GEO_CACHE.error').includes('Nenhum mapa parcial'));
  for(const role of ['cliente','pesq','recrutador']){context.CURRENT_PROFILE={id:'other',role};assert(!geo.allowed());assert.equal(geo.markup(survey),'');let calls=0;context.fetchCollectionEvents=async()=>{calls++;return result;};await geo.load(true);assert.equal(calls,0);}
  for(const role of ['admin','admpro','coord','gerente']){context.CURRENT_PROFILE={id:role,role};assert(geo.allowed());}
  console.log('Georreferenciamento dos relatórios: PASS (posição, filtros, 6.001 áreas, GPS, privacidade, erro e isolamento).');
})().catch(error=>{console.error(error);process.exit(1);});
