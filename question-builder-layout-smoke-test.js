const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

assert.match(html, /pesquisapro-app-version" content="20261021152000/);
assert.match(html, /style\.css\?v=20261021152000/);
assert.match(html, /app\.js\?v=20261021152000/);
assert.match(css, /\.q-card\{min-width:0;overflow:hidden\}/);
assert.match(css, /\.q-card \.qc-head\{display:flex;align-items:center;flex-wrap:wrap/);
assert.match(css, /\.q-card \.qc-head \.q-text-inp\{flex:1 1 300px;min-width:220px/);
assert.match(css, /@media\(max-width:900px\)/);
assert.match(css, /@media\(max-width:640px\)/);
assert.match(css, /@media\(max-width:380px\)/);
assert.match(css, /\.q-flow-map\{min-width:0;overflow:hidden\}/);
assert.match(css, /\.q-editor-tabs\{/);
assert.match(css, /\.q-flow-node-card\{/);
assert.match(css, /\.q-flow-canvas-scroll\{/);
assert.match(app, /qSetEditorTab\('flow'\)/);
assert.match(app, /qFlowStartConnect\(event/);

console.log('question-builder-layout-smoke-test: PASS — cabeçalho quebrável, controles responsivos e fluxo condicional contido na largura disponível.');
