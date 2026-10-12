const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('function collectMapHasGps'),end=app.indexOf('function buildMapTooltip',start);
assert(start>0&&end>start);
const events=Array.from({length:1177},(_,i)=>({id:'test-'+i,name:'Pesquisador de teste',cota:'Centro',lat:-23.55+(i%40)*.001,lng:-46.63+Math.floor(i/40)*.001,ts:i,status:'valid',calibration:false}));
events.push({id:'no-gps',name:'Pesquisador de teste',lat:NaN,lng:NaN,status:'valid'});
const nodes={collectMap:{},collectMapLoading:{style:{}},collectMapSummary:{},collectMapNote:{}};
const markers=[];let opened=null;
class MapStub{setCenter(){}setZoom(){}fitBounds(){}}
class MarkerStub{constructor(options){this.options=options;this.listeners={};markers.push(this);}setMap(value){this.removed=value===null;}addListener(type,fn){this.listeners[type]=fn;}}
class InfoStub{setContent(){}open(){}}
class BoundsStub{extend(){}}
const google={maps:{Map:MapStub,Marker:MarkerStub,InfoWindow:InfoStub,LatLngBounds:BoundsStub}};
const context={_collectMapFocusMarker:null,_collectMap:null,_collectMapMarkerLayer:[],_collectMapDidFit:false,_collectMapKind:'street',_collectMapInfoWindow:null,COLLECT_MAP_LAYERS:{street:'roadmap',sat:'satellite'},COLLECT_COLORS:['#2563eb'],SURVEYS:[{id:'survey',team:['Pesquisador de teste']}],eventsForSurveyIdx:()=>events,collectMapFilterEvents:values=>values,google,window:{google},document:{getElementById:id=>nodes[id]},googleMarkerIcon:()=>({}),buildMapPopup:()=>'',goToAuditFromMap:id=>opened=id,loadGoogleMaps:async()=>{},googleMapErrorText:()=>'',console};
vm.createContext(context);vm.runInContext(app.slice(start,end)+'\nthis.helpers={hasGps:collectMapHasGps,positions:collectMapDisplayPositions,display:mapDisplayPoint,render:renderCollectMap};',context);
context.helpers.render(0);
assert.equal(context._collectMapMarkerLayer.length,1177,'mapa ainda corta o histórico');
assert(nodes.collectMapSummary.textContent.includes('histórico completo'));
assert(nodes.collectMapNote.textContent.includes('1.177'));
assert(nodes.collectMapNote.textContent.includes('1 sem localização válida'));
markers[1176].listeners.click();assert.equal(opened,'test-1176','última coleta sem acesso à auditoria');
context.helpers.render(0);assert.equal(context._collectMapMarkerLayer.length,1177);assert(markers.slice(0,1177).every(marker=>marker.removed));
const same=[{id:'a',lat:-19.92,lng:-43.94},{id:'b',lat:-19.92,lng:-43.94},{id:'c',lat:-19.92,lng:-43.94}];
const positions=context.helpers.positions(same);
for(const event of same)assert.deepStrictEqual(positions.get(event.id),context.helpers.display(event,same),'posição otimizada diverge da separação original');
assert.notDeepStrictEqual(positions.get('a'),positions.get('b'));
for(const event of [{lat:NaN,lng:NaN},{lat:0,lng:0},{lat:91,lng:-40},{lat:-20,lng:181}])assert(!context.helpers.hasGps(event));
assert(context.helpers.hasGps({lat:0,lng:-40}),'equador não pode ser rejeitado');
console.log('Mapa completo da coleta: PASS (1.177 pontos, última coleta clicável, GPS, redesenho e sobreposição).');
