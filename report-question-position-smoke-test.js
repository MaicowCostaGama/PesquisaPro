const fs=require('fs');
const app=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/app.js','utf8');
const sql=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/deploy/corrigir-associacao-relatorio-por-posicao.sql','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(/survey_report_all_questions_v2/.test(app),'Frontend não chama a RPC v2');
assert(/survey_report_all_questions'/.test(app),'Fallback para a RPC anterior ausente');
assert(/position:Number\.isFinite\(Number\(q\.position\)\)/.test(app),'Posição persistida não está no snapshot local');
assert(/question_position/.test(app)&&/byPosition\[q\.position\]/.test(app),'Renderização não possui fallback por posição');
assert(/normalizeReportQuestionText/.test(app)&&/byText\[normalizeReportQuestionText\(q\.text\)\]/.test(app),'Renderização não possui fallback por texto normalizado');
assert(/create or replace function public\.survey_report_all_questions_v2/.test(sql),'RPC v2 ausente');
assert(/question_position integer/.test(sql)&&/question_text text/.test(sql),'RPC v2 não retorna metadados de posição/texto');
assert(/q\.position::integer/.test(sql)&&/q\.survey_id = p_survey_id/.test(sql),'RPC v2 não restringe a pergunta à pesquisa e não retorna sua posição');
assert(/coalesce\(ce\.is_calibration, false\) = false/.test(sql),'RPC v2 não preserva o filtro de calibração');
console.log('report-question-position-smoke-test: PASS');
