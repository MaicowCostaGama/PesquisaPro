const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'deploy', 'otimizacao-performance-seguranca.sql'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert(start >= 0, `função ${name} não encontrada`);
  let depth = 0;
  let opened = false;
  for (let i = app.indexOf('{', start); i < app.length; i++) {
    if (app[i] === '{') { depth++; opened = true; }
    if (app[i] === '}') { depth--; if (opened && depth === 0) return app.slice(start, i + 1); }
  }
  throw new Error(`não foi possível extrair ${name}`);
}

const context = {};
vm.runInNewContext(`${extractFunction('sampleSize')}\n${extractFunction('jsArg')}\nthis.sampleSize=sampleSize;this.jsArg=jsArg;`, context);
assert.strictEqual(context.sampleSize(1000000, 0.03, 1.96, 50), 1066);
assert.strictEqual(context.sampleSize(1000000, 0, 1.96, 50), 0);
assert.strictEqual(context.sampleSize(1000000, 0.03, 1.96, 0), 0);
assert(Number.isFinite(context.sampleSize(1000000, 0.03, 1.96, 50)));
const encoded = context.jsArg("Olho d'Água \"Centro\"");
assert(encoded.includes('&quot;'));
assert(!encoded.includes('<') && !encoded.includes('>'));

for (const file of ['vendor/chart.umd.js', 'vendor/qrcode.min.js', 'vendor/leaflet.js', 'vendor/leaflet.css']) {
  assert(fs.existsSync(path.join(root, file)), `ativo ausente: ${file}`);
}
assert(html.includes("loadLocalAsset('chart')") === false);
assert(html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2'));
assert(app.includes("src:'vendor/chart.umd.js'"));
assert(app.includes(".eq('survey_id',survey.id)"));
assert(sql.includes('idx_collection_events_survey_occurred'));
assert(sql.includes("raise exception 'question does not belong to survey'"));

console.log('Smoke test OK: cálculo, sanitização, ativos locais e migração verificados.');
