const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function mapDisplayPoint');
const end = app.indexOf('function renderCollectMap');
assert(start >= 0 && end > start, 'função de separação não encontrada');
const context = {};
vm.createContext(context);
vm.runInContext(`${app.slice(start,end)}\nthis.display=mapDisplayPoint;`, context);
const events = [
  {id:'a',lat:-19.92,lng:-43.94},
  {id:'b',lat:-19.92,lng:-43.94},
  {id:'c',lat:-19.92,lng:-43.94}
];
const points = events.map(e => context.display(e, events));
assert.notDeepStrictEqual(points[0], points[1]);
assert.notDeepStrictEqual(points[1], points[2]);
assert(Math.abs(points[0][0] - events[0].lat) < 0.001);
assert(Math.abs(points[0][1] - events[0].lng) < 0.001);
console.log('Map overlap smoke test OK: entrevistas sobrepostas recebem posições visuais distintas.');
