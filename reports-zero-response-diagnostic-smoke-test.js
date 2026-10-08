const fs=require('fs');
const app=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/app.js','utf8');
const sql=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/deploy/corrigir-relatorios-respostas-validas.sql','utf8');
const clientSql=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/deploy/relatorios-resultados-clientes.sql','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(/function reportsLocalValidBase\(surveyId\)/.test(app),'Fallback da base válida local ausente');
assert(/event\.status==='valid'&&!event\.calibration/.test(app),'Fallback não filtra somente entrevistas válidas não calibradas');
assert(/Nenhuma resposta foi registrada para esta pergunta na base válida/.test(app),'Mensagem de diagnóstico de respostas ausentes não encontrada');
assert((sql.match(/coalesce\(ce\.is_calibration, false\) = false/g)||[]).length>=5,'Migration não protege todas as RPCs contra is_calibration NULL');
assert(/create or replace function public\.survey_report_all_questions/.test(sql),'RPC de relatório da gestão ausente');
assert(/create or replace function public\.client_report_all_questions/.test(sql),'RPC de relatório do cliente ausente');
assert(/create or replace function public\.survey_answer_distribution/.test(sql),'RPC de distribuição de respostas ausente');
assert(/coalesce\(ce\.is_calibration, false\) = false/.test(clientSql),'SQL de resultados do cliente não foi atualizado');
console.log('reports-zero-response-diagnostic-smoke-test: PASS');
