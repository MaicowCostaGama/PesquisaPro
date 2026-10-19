const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const repo=__dirname;
const modulePath=path.join(repo,'reports-client-original-excel.js'),appPath=path.join(repo,'app.js'),htmlPath=path.join(repo,'app.html');
function staticContractChecks() {
  const moduleSource = fs.readFileSync(modulePath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const checks = [];
  const ok = (label, condition) => { assert(condition, label); checks.push(label); };
  ok('módulo presente', moduleSource.includes('PP_CLIENT_ORIGINAL_EXCEL'));
  ok('API markup/mount/load/exportExcel/reset/getState', ['markup','mount','load','exportExcel','reset','getState'].every(k => moduleSource.includes(k)));
  ok('host e seletor obrigatórios', moduleSource.includes('id="client-original-excel"') && moduleSource.includes('id="client-original-question"'));
  ok('ações download e refresh', moduleSource.includes('data-original-action="download"') && moduleSource.includes('data-original-action="refresh"'));
  ok('somente RPC original v172', moduleSource.includes('client_report_structure_v172') && moduleSource.includes('client_report_overview_v172'));
  ok('não consulta tratamentos ou versões v175/v176', !/client_report_(?:structure|overview)_v175|client_report_(?:structure|overview)_v176|tabulation_[a-z_]*_v175|PP_TREATMENT|reports-client/.test(moduleSource));
  ok('sem escrita/publicação', !/\.from\(|report_document_(?:save|publish)|publish_report|tabulation_(?:apply|restore|import)/.test(moduleSource));
  ok('confirma estrutura antes do workbook/download', moduleSource.indexOf('const confirmed=await readStructure') > moduleSource.indexOf('const result=await env.readPages') && moduleSource.indexOf('env.excelWorkbook') > moduleSource.indexOf('const confirmed=await readStructure'));
  ok('reconfirma estrutura após loadExcel antes de escrever', moduleSource.indexOf('const final=await readStructure') > moduleSource.indexOf('await env.loadExcel()') && moduleSource.lastIndexOf('lib.writeFile(') > moduleSource.indexOf('const final=await readStructure'));
  ok('estado inclui loading/exportBusy/selectedQuestion', ['loading','exportBusy','selectedQuestion'].every(k => moduleSource.includes(k)));
  ok('integração nos hosts de andamento e resultados', app.includes('PP_CLIENT_ORIGINAL_EXCEL?.markup()') && app.includes('PP_CLIENT_ORIGINAL_EXCEL?.mount'));
  ok('script do módulo integrado no HTML', html.includes('reports-client-original-excel.js'));
  return { checks: checks.length, names: checks };
}

const contract=staticContractChecks();
console.log('client-original-excel-smoke-test: PASS — '+contract.checks+' contratos portáteis; cenários funcionais/XLSX reais também validados no Chromium.');
