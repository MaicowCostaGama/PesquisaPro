const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const checks=[
  ['busca compartilhada por pesquisador',app.includes('collectResearcherSearch')&&app.includes('collectApplyResearcherSearch')&&app.includes('collectClearResearcherSearch')],
  ['filtro textual aplicado aos eventos',app.includes('collectResearcherFilterEvents')&&app.includes('filteredAll=collectResearcherFilterEvents(all)')],
  ['coordenadas com ação Ver no mapa',app.includes('audit-geo-link')&&app.includes('goToMapFromAudit(${jsArg(e.id)})')],
  ['navegação para a aba Mapa ao vivo',app.includes('collectTabMapaBtn')&&app.includes("collectTab(mapBtn,'mapa')")],
  ['foco na coleta escolhida',app.includes('focusCollectMapEvent')&&app.includes('_collectMapFocusId')&&app.includes('_collectMap.setCenter(position)')],
  ['marcador destacado da coleta',app.includes("googleBalloonIcon('#f97316')")&&app.includes('zIndex:999')],
  ['estilos da busca e do link geográfico',css.includes('.collect-researcher-search')&&css.includes('.audit-geo-link')&&css.includes('.audit-geo-cell')],
  ['foco acessível por teclado',css.includes('.audit-geo-link:focus-visible')]
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('geo-collection-navigation-smoke-test: PASS');
