const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const jspdf = 'vendor/jspdf.umd.min.js';

for (const token of [
  'surveyFormPdfData',
  'surveyFormPdfCover',
  'surveyFormPdfWriteQuestion',
  'surveyFormPdfDownload',
  "loadLocalAsset('jspdf')",
  "a.download='formulario-pesquisapro-",
  'Baixar formulário PDF',
  'PDF formulário',
  'Q_HAS_OPTS(q.type)',
  'Q_CLOSED_FIELD_TYPES.includes(field.type)',
  'encerrar entrevista',
  'doc.rect(M+3,y-3.4,3.2,3.2',
  'doc.setLineWidth(.45)',
  'reportsPdfFooter(doc)'
]) {
  assert(app.includes(token), `recurso de PDF do formulário ausente: ${token}`);
}

for (const token of ['.survey-pdf-action', '.survey-table-scroll', '.survey-table-scroll table{min-width:1050px', '@media(max-width:720px)']) {
  assert(css.includes(token), `estilo de PDF do formulário ausente: ${token}`);
}

assert(fs.existsSync(jspdf) && fs.statSync(jspdf).size > 100000, 'jsPDF local não encontrado');
assert(html.includes('style.css?v=20260925092000'), 'cache do CSS não foi atualizado');
assert(html.includes('app.js?v=20260925092000'), 'cache do app não foi atualizado');
assert(app.includes("surveyFormPdfDownload(${idx})"), 'PDF não está disponível na lista de pesquisas');
assert(app.includes("surveyFormPdfDownload()"), 'PDF não está disponível no editor');
assert(!app.includes("const text='□ "), 'o PDF voltou a usar o quadrado Unicode incompatível');
console.log('Survey form PDF smoke test OK: acesso no editor e listas, capa, metadados, perguntas, opções, condicionantes, subcampos, jsPDF local e download verificados.');
