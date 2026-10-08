const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

for(const token of [
  'collectTabEvolucaoBtn',
  "data-collect-tab=\"evolucao\"",
  "evolucao:'collectTabEvolucao'",
  "if(which==='evolucao'){renderCollectEvolution(COLLECT_IDX);}",
  "<div id=\"collectTabEvolucao\" style=\"display:none\">",
  'collectEvolutionModeSet',
  'collectEvolutionRefresh',
  "COLLECT_EVOLUTION_MODE='day'",
  'function collectEvolutionKey(ts,mode)',
  'function collectEvolutionLabel(key,mode)',
  'function collectEvolutionSeries(idx,mode)',
  'function renderCollectEvolution(idx)',
  "event.status==='valid'",
  'eventsForSurveyIdx(idx)',
  "loadLocalAsset('chart')",
  'refreshCollectionTeamFunnelLive(idx)',
  "if(evolutionTab&&evolutionTab.style.display!=='none')renderCollectEvolution(idx);",
  'renderCollectEvolution(idx);'
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.collect-evolution-card',
  '.collect-evolution-head',
  '.collect-evolution-mode',
  '.collect-evolution-summary',
  '.collect-evolution-stat',
  '.collect-evolution-chart-wrap',
  '.collect-evolution-note',
  '@media(max-width:600px)'
])assert(css.includes(token),`CSS sem ${token}`);
assert(css.includes('.finance-table-scroll'),'CSS financeiro foi perdido');
assert(html.includes('app.js?v=20261008095930'),'cache do app não atualizado');
assert(html.includes('style.css?v=20261008095930'),'cache do CSS não atualizado');
assert(!/create table|alter table|drop table|delete from/i.test(app),'evolução não deve alterar o banco pelo frontend');
console.log('collection-evolution-smoke-test: OK');
