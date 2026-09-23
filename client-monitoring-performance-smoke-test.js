const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('deploy/indices-monitoramento-clientes.sql','utf8');
const html=fs.readFileSync('app.html','utf8');
for(const token of [
  'const CLIENT_RPC_TIMEOUT_MS=30000',
  'Promise.allSettled([',
  'quotaError',
  'clientWithTimeout(sb.rpc(\'client_report_all_questions\'',
  "'os resultados agregados',45000",
  "'os cruzamentos do relatório',45000",
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
assert(html.includes('app.js?v=20260923062000'),'cache não atualizado');
console.log('Client monitoring performance smoke test: PASS — consultas parciais, timeouts e índices verificados.');
