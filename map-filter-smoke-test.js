const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function collectMapFilterEvents');
const end = app.indexOf('function collectMapApplyFilters');
assert(start >= 0 && end > start, 'função de filtro não encontrada');
const context = {_collectMapFilters:{researcher:'all',status:'all',latest:false},_collectMapOnlyEventId:null,USERS:[],CURRENT_PROFILE:null};
vm.createContext(context);
const helperStart = app.indexOf('function isCollectionTestEvent(');
const helperEnd = app.indexOf('\nlet RESEARCHER_PROFILE_CITIES', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'helper de isolamento não encontrado');
vm.runInContext(app.slice(helperStart, helperEnd), context);
vm.runInContext(`${app.slice(start,end)}\nthis.filter=collectMapFilterEvents;`, context);
assert.strictEqual(vm.runInContext('isCollectionTestEvent({isTestCollection:true})',context),true);
assert.strictEqual(vm.runInContext('isCollectionTestEvent({researcher_id:"unknown"})',context),false);
const events = [
  {id:'joao-1',name:'João',status:'valid',calibration:false,synced:true,ts:3},
  {id:'joao-2',name:'João',status:'valid',calibration:false,synced:true,ts:2},
  {id:'maria-1',name:'Maria',status:'rejected',calibration:false,synced:false,ts:4},
  {id:'lucas-1',name:'Lucas',status:'valid',calibration:true,synced:true,ts:5}
];
assert.strictEqual(context.filter(events).length, 4);
context._collectMapFilters={researcher:'João',status:'all',latest:false};
assert.strictEqual(context.filter(events).length, 2);
context._collectMapFilters={researcher:'all',status:'rejected',latest:false};
assert.strictEqual(context.filter(events).length, 1);
context._collectMapFilters={researcher:'all',status:'pending',latest:false};
assert.strictEqual(context.filter(events).length, 1);
context._collectMapFilters={researcher:'all',status:'all',latest:true};
assert.strictEqual(context.filter(events).length, 3);
context._collectMapFilters={researcher:'all',status:'valid',latest:false};
assert.strictEqual(context.filter(events).length, 2);
context._collectMapFilters={researcher:'all',researcherQuery:'',status:'all',latest:false};
context._collectMapOnlyEventId='joao-2';
assert.deepStrictEqual(context.filter(events).map(event=>event.id),['joao-2'],'a visão individual deve mostrar somente o ID escolhido, não todo o pesquisador');
context._collectMapOnlyEventId=null;
assert.strictEqual(context.filter(events).length,4,'a saída da visão individual deve restaurar o mapa completo');
console.log('Map filter smoke test OK: coleta exata, pesquisador, status, sync, calibração e últimas coletas verificados.');
