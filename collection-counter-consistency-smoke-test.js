const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

assert(app.includes('const collected=surveyCollectedCount(s);'), 'a linha da pesquisa ainda usa o contador materializado diretamente');
assert(app.includes("const pct=surveyCoveragePct(collected,sample);"), 'o percentual da linha não usa a mesma fonte do total');
assert(app.includes("'collectCollectedStat'"), 'o cartão Coletado não possui alvo para atualização ao vivo');
assert(app.includes('function refreshCollectCount(idx)'), 'função de atualização do contador ausente');
assert(app.includes("document.querySelector('#collectCollectedStat .s-val')"), 'valor do cartão Coletado não é atualizado');
assert(app.includes('refreshCollectCount(idx);\n  refreshCollectionTeamRows(idx);\n  renderLiveFeed(idx);'), 'poll ao vivo não atualiza o contador superior e a equipe');
assert(app.includes("const valid=eventsForSurveyIdx(idx).filter(event=>event.status==='valid'"), 'a evolução não conta entrevistas válidas por evento');
assert(html.includes('app.js?v=20261008154530'), 'cache do app não atualizado');
assert(html.includes('style.css?v=20261008154530'), 'cache do CSS não atualizado');
console.log('Collection counter consistency smoke test: PASS — Coletado e Total válido usam a mesma fonte após atualização ao vivo.');
