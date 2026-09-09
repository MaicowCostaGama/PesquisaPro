const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const sql = fs.readFileSync(path.join(root,'deploy','mapa-calor-respostas-abertas.sql'),'utf8');
const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
const html = fs.readFileSync(path.join(root,'app.html'),'utf8');
const checks = [
  ['perguntas respondíveis disponíveis', app.includes('heatmapQuestionsForSurvey') && app.includes("q.type!=='date'")],
  ['seleção de pergunta no master', app.includes('reportsHeatmapPickQuestion') && app.includes("responseHeatmapPanelMarkup('rp'")],
  ['seleção de resposta no master', app.includes('reportsHeatmapPickValue') && app.includes("responseHeatmapPanelMarkup('rp'")],
  ['seleção de pergunta no cliente', app.includes('clientHeatmapPickQuestion') && app.includes("responseHeatmapPanelMarkup('cr'")],
  ['seleção de resposta no cliente', app.includes('clientHeatmapPickValue') && app.includes("responseHeatmapPanelMarkup('cr'")],
  ['RPC de valores de resposta', app.includes("sb.rpc('survey_response_values'") && sql.includes('survey_response_values')],
  ['RPC de pontos do mapa', app.includes("sb.rpc('survey_response_heatmap'") && sql.includes('survey_response_heatmap')],
  ['validação de pergunta respondível', sql.includes("q.type<>'date'") && sql.includes('question must be answerable')],
  ['autorização master ou cliente liberado', sql.includes('public.is_staff() or public.client_results_released')],
  ['respostas somente válidas', sql.includes("ce.status='valid'") && sql.includes('ce.is_calibration=false')],
  ['coordenadas arredondadas', sql.includes('round(ce.lat::numeric,3)') && sql.includes('round(ce.lng::numeric,3)')],
  ['círculos Google ponderados por intensidade', app.includes('google.maps.Circle') && app.includes('responseHeatmapColor') && app.includes('point_count')],
  ['legenda de intensidade', app.includes('Menor concentração') && app.includes('Maior concentração')],
  ['cliente protegido antes da RPC', app.includes('clientResultsReleasedForSurvey(clientSelf(),clientSelfSurvey())')],
  ['estilos responsivos', css.includes('.response-heatmap-controls') && css.includes('.response-heatmap-map') && css.includes('@media(max-width:760px)')],
  ['Google Maps configurado separadamente', app.includes('loadGoogleMaps') && fs.existsSync(require('path').join(__dirname,'google-maps-config.js'))],
  ['cache atualizado', html.includes('app.js?v=20260908230000') && html.includes('google-maps-config.js?v=20260908230000')]
];
for (const [label, ok] of checks) { assert.ok(ok, label); console.log('PASS — '+label); }
console.log('response-heatmap-smoke-test: PASS');
