const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const graph=app.match(/function qFlowGraphMarkup\(qs\)\{[\s\S]*?\n\}/)?.[0]||'';

assert.match(app,/function qFlowRulesPanelMarkup\(qs\)/,'painel externo de configuração de saídas ausente');
assert.match(app,/function qFlowEdgeLabel\(edge\)/,'rótulo das respostas nas setas ausente');
assert.match(graph,/Fluxo simples da entrevista/,'título do mapa simplificado ausente');
assert.match(graph,/qFlowRulesPanelMarkup\(qs\)/,'configuração externa das saídas não foi integrada ao mapa');
assert.doesNotMatch(graph,/qFlowNodeOptionsMarkup\(q,index,qs\)/,'os balões ainda renderizam respostas e seletores');
assert.match(graph,/<span class="q-flow-node-index">\$\{index\+1\}<\/span><div><b>\$\{esc\(q\.text\|\|'\(sem título\)'\)\}<\/b><\/div>/,'balão não contém somente número e enunciado');
assert.match(css,/\.q-flow-node-card\{[^}]*width:240px[^}]*min-height:0/,'cartão compacto do mapa ausente');
assert.match(css,/\.q-flow-edge-label\{/,'estilo do rótulo de seta ausente');
assert.match(css,/\.q-flow-rules-panel\{/,'estilo do painel externo de saídas ausente');

console.log('question-flow-compact-nodes-smoke-test: PASS — balões mostram somente número e enunciado; saídas ficam fora do mapa.');
