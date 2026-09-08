const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'deploy','schema.sql'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const checks=[
  ['cliente localiza pesquisa pelo vínculo real',app.includes("SURVEYS.find(s=>(s.clientIds||[]).includes(CURRENT_PROFILE.id))")],
  ['snapshot carrega liberação por pesquisa',app.includes('clientReleaseById:Object.fromEntries')&&app.includes('results_released')],
  ['cliente considera liberação global ou por pesquisa',app.includes('function clientResultsReleasedForSurvey')&&app.includes('client.resultsReleased')&&app.includes('bySurvey[clientId]===true')],
  ['resultados bloqueados antes da liberação',app.includes('Resultados ainda não liberados')&&app.includes('!clientResultsReleasedForSurvey(c,s)')],
  ['cliente chama distribuição agregada',app.includes("sb.rpc('survey_answer_distribution'")&&app.includes('p_survey_id:s.id')],
  ['consulta protegida novamente antes da RPC',app.includes('Os resultados ainda não foram liberados para esta pesquisa.')],
  ['RPC autoriza cliente vinculado',schema.includes("exists (select 1 from public.survey_clients sc where sc.survey_id = p_survey_id and sc.client_id = auth.uid())")],
  ['permissão de perguntas do cliente',schema.includes('cliente vê perguntas das suas pesquisas')&&schema.includes('survey_questions')],
  ['vínculo traz estado de liberação',app.includes('survey_clients(client_id, results_released)')],
  ['toggle do master grava vínculo da pesquisa',app.includes("from('survey_clients').update({results_released:next})")],
  ['cache atualizado',html.includes('20260908180000')],
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('client-results-release-smoke-test: PASS');
