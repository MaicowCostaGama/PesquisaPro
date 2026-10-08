const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes('createdAt:row.created_at||null'), 'o snapshot deve preservar a data original da pesquisa');
assert(app.includes('function reportsSurveyNameKey'), 'deve existir uma chave normalizada para comparar nomes');
assert(app.includes('function reportsSurveyOptionLabel'), 'o seletor deve ter rótulo diferenciado para pesquisas homônimas');
assert(app.includes('ID ${String(s.id||\'\').slice(0,8)}'), 'o rótulo deve exibir um identificador curto da pesquisa homônima');
assert(app.includes('function reportsDuplicateSurveyCandidates'), 'deve existir uma lista explícita de versões homônimas');
assert(app.includes("sb.rpc('survey_report_all_questions_v2'"), 'o diagnóstico deve reutilizar apenas a RPC agregada');
assert(app.includes('reportsCheckDuplicateSurveyCoverage'), 'o relatório deve verificar cobertura da versão alternativa');
assert(app.includes('reportsRenderDuplicateNotice'), 'o relatório deve renderizar aviso quando outra versão possui dados');
assert(app.includes('O relatório não mistura pesquisas diferentes'), 'a interface deve evitar mistura silenciosa entre campanhas');
assert(app.includes('id="rp-duplicate-diagnostic"'), 'deve haver área reservada para o aviso de diagnóstico');
assert(css.includes('.reports-duplicate-notice'), 'o aviso deve ter estilo visual próprio');
assert(css.includes('.reports-duplicate-action'), 'a ação para abrir outra versão deve ser visível e responsiva');
console.log('reports duplicate survey smoke test: PASS');
