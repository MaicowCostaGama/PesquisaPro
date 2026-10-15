const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('deploy/indices-monitoramento-clientes.sql','utf8');
const html=fs.readFileSync('app.html','utf8');
for(const token of [
  'const CLIENT_RPC_TIMEOUT_MS=30000',
  'Promise.allSettled([',
  'quotaError',
  'function reportsFetchClientGroupedOverview',
  "const coded=grouping?.version===2,name=coded?'client_report_coded_questions':'client_report_grouped_questions';",
  "reportsReadAllPages(()=>reportsOverviewOrder(sb.rpc(name",
  'function reportsFetchClientGroupedCross',
  "const coded=grouping?.version===2,name=coded?'client_report_coded_cross':'client_report_grouped_cross';",
  "reportsReadAllPages(()=>reportsCrossOrder(sb.rpc(name",
  'range(offset,offset+pageSize-1)',
  'const deadline=Date.now()+120000',
  'controller.abort(),Math.min(20000,deadline-Date.now())',
  '.abortSignal(controller.signal)',
  'O restante do monitoramento continua disponível',
  'A consulta demorou mais que o limite'
])assert(app.includes(token),`app sem ${token}`);
for(const token of [
  'idx_collection_events_survey_occurred',
  'idx_collection_events_survey_researcher',
  'idx_collection_events_survey_status_calibration',
  'idx_collection_answers_event_question',
  'idx_collection_answers_question_event',
  'idx_survey_questions_survey_position',
  'idx_report_documents_client_survey_status'
])assert(sql.includes(token),`migration sem ${token}`);
assert(!/drop table|drop column|truncate|delete from/i.test(sql),'migration contém operação destrutiva');
assert(html.includes('app.js?v=20261015190500'),'cache não atualizado');
console.log('Client monitoring performance smoke test: PASS — consultas parciais, timeouts e índices verificados.');
