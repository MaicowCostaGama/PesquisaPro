const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function collectMapFilterEvents');
const end = app.indexOf('function collectMapApplyFilters');
assert(start >= 0 && end > start, 'função de filtro não encontrada');
const context = {_collectMapFilters:{researcher:'all',status:'all',latest:false}};
vm.createContext(context);
vm.runInContext(`${app.slice(start,end)}\nthis.filter=collectMapFilterEvents;`, context);
const events = [
  {name:'João',status:'valid',calibration:false,synced:true,ts:3},
  {name:'João',status:'valid',calibration:false,synced:true,ts:2},
  {name:'Maria',status:'rejected',calibration:false,synced:false,ts:4},
  {name:'Lucas',status:'valid',calibration:true,synced:true,ts:5}
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
console.log('Map filter smoke test OK: pesquisador, status, sync, calibração e últimas coletas verificados.');
