const assert=require('assert');
const fs=require('fs');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const sql=fs.readFileSync(root+'/deploy/condicionante-encerramento-resposta.sql','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
function ok(condition,message){assert(condition,message);}

ok(app.includes('endsInterview'), 'estado da condicionante não existe no questionário');
ok(app.includes('qEndToggle'), 'controle administrativo de encerramento ausente');
ok(app.includes('ends_interview:!!'), 'condicionante não é enviada ao banco');
ok(app.includes('optionSchemaMissing')&&app.includes('legacyOptRows'), 'compatibilidade com migration ainda não aplicada ausente');
ok(app.includes('Atenção: as condicionantes de encerramento ainda não foram gravadas'), 'aviso de migration pendente ausente');
ok(app.includes('acollectConditionLabels'), 'detecção da resposta condicionante ausente');
ok(app.includes('acollectEndByCondition'), 'encerramento da entrevista ausente');
ok(app.includes('Não continue esta entrevista, esta resposta é uma condicionante necessária para o perfil de entrevistado'), 'mensagem exata para o entrevistado ausente');
ok(app.includes('A entrevista não foi enviada como coleta válida'), 'proteção contra envio da entrevista encerrada ausente');
ok(app.includes('acollectToggleMultiAnswer')&&app.includes('acollectSetAnswer'), 'condicionante não cobre escolha única e múltipla');
ok(sql.includes('add column if not exists ends_interview boolean not null default false'), 'migration aditiva não existe');
ok(sql.includes('survey_question_options'), 'migration não altera a tabela correta');
ok(css.includes('.opt-end')&&css.includes('.collect-termination-card'), 'estilos da configuração e do aviso ausentes');
ok(html.includes('app.js?v=20260921191500')&&html.includes('style.css?v=20260921191500'), 'cache da nova versão não foi atualizado');
console.log('conditional-termination-smoke-test: PASS');
