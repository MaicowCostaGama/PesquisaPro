const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
const checks=[
  ['gráfico usa classe compacta',app.includes('reports-distribution-chart')],
  ['gráfico desktop compacto',css.includes('.reports-distribution-chart{position:relative;height:220px')],
  ['gráfico mobile compacto',css.includes('.reports-distribution-chart{height:185px')],
  ['mapa de calor desktop compacto',css.includes('.response-heatmap-panel .response-heatmap-map{height:300px')],
  ['mapa de calor mobile compacto',css.includes('.response-heatmap-panel .response-heatmap-map{height:245px')],
  ['georreferenciamento desktop compacto',css.includes('.client-geo-section .client-geo-map-canvas{height:300px')],
  ['georreferenciamento mobile compacto',css.includes('.client-geo-section .client-geo-map-canvas{height:245px')],
  ['cartões de resultados compactos',css.includes('.reports-question-card{padding:16px 18px}')&&css.includes('.reports-client-crossing{padding:15px 17px}')],
  ['cache atualizado',html.includes('20260908250000')]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('results-layout-smoke-test: PASS');
