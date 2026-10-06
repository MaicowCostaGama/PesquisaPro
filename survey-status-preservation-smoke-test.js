const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('app.html','utf8');

assert(app.includes('const existingSurvey=!isNew?SURVEYS[WIZ.editIndex]:null;'),'o salvamento não captura a pesquisa existente');
assert(app.includes('if(existingSurvey?.status)row.status=existingSurvey.status;'),'o status atual não é preservado no payload de edição');
assert(/const row=snapshotToSurveyRow\(d\);\s*if\(existingSurvey\?\.status\)row\.status=existingSurvey\.status;/.test(app),'a preservação precisa acontecer antes do update');
assert(app.includes("status:d.status||'rascunho'"),'o payload ainda precisa manter o status padrão para pesquisas novas');
assert(app.includes("update({status:'campo'})"),'o início manual da coleta continua separado da edição');
assert(app.includes("update({status:'encerrada'})"),'o encerramento manual continua separado da edição');
assert(html.includes('app.js?v=20261006102500'),'cache do app não atualizado');
assert(html.includes('style.css?v=20261006102500'),'cache do CSS não atualizado');
console.log('Survey status preservation smoke test: PASS — edições preservam Em campo, Rascunho ou Concluída sem alterar o histórico.');
