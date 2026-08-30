const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'commercial.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `função ${name} não encontrada`);
  let depth = 0;
  let opened = false;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') { depth++; opened = true; }
    if (source[i] === '}') { depth--; if (opened && depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`não foi possível extrair ${name}`);
}

const ctx = { brl: value => `R$ ${Number(value).toFixed(2)}` };
vm.runInNewContext(`${extractFunction('commercialParseItems')}\nthis.commercialParseItems=commercialParseItems;`, ctx);
const items = ctx.commercialParseItems('Planejamento amostral | 1 | 2500\nColeta de campo | 300 | 25');
assert.strictEqual(items.length, 2);
assert.strictEqual(items[0].total, 2500);
assert.strictEqual(items[1].total, 7500);
assert.strictEqual(items.reduce((sum, item) => sum + item.total, 0), 10000);
assert(Array.isArray(ctx.commercialParseItems('')));
assert.strictEqual(ctx.commercialParseItems('').length, 0);

const migration = fs.readFileSync(path.join(__dirname, 'deploy', 'comercial.sql'), 'utf8');
for (const table of ['commercial_opportunities', 'commercial_proposals', 'commercial_proposal_items']) {
  assert(migration.includes(`create table if not exists public.${table}`), `tabela ausente: ${table}`);
}
for (const stage of ['novo','qualificacao','briefing','proposta','negociacao','ganha','perdida']) {
  assert(migration.includes(`'${stage}'`), `estágio ausente: ${stage}`);
}
assert(migration.includes('vendedor gerencia suas oportunidades comerciais'));
assert(migration.includes('vendedor gerencia propostas das suas oportunidades'));
assert(migration.includes('vendedor gerencia itens das suas propostas'));
assert(source.includes("window.open(href,'_blank','noopener')"));
assert(source.includes("sent_via:via"));
console.log('Commercial smoke test OK: itens, totais, estágios, RLS e envio verificados.');
