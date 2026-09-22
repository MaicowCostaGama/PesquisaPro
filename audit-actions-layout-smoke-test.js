const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');

for (const token of [
  'class="audit-table-scroll-hint"',
  'class="audit-table-scroll" tabindex="0"',
  'aria-label="Tabela de auditoria. Deslize horizontalmente para ver todas as informações e ações."',
  'class="audit-data-table"',
  'class="audit-actions-header"',
  'class="audit-actions-cell"',
  'class="audit-actions-stack"',
  'A coluna <b>Ações</b> permanece acessível à direita.'
]) {
  assert(app.includes(token), `markup de auditoria ausente: ${token}`);
}

for (const token of [
  '.audit-table-scroll',
  '.audit-table-scroll-hint',
  '.audit-data-table',
  '.audit-actions-header',
  '.audit-actions-cell',
  '.audit-actions-stack',
  'position:sticky',
  'overflow-x:auto',
  '@media(max-width:640px)'
]) {
  assert(css.includes(token), `estilo de auditoria ausente: ${token}`);
}

assert(html.includes('style.css?v=20260922135000'), 'cache do CSS da auditoria não foi atualizado');
assert(html.includes('app.js?v=20260922135000'), 'cache do app da auditoria não foi atualizado');
assert(app.includes("onclick=\"auditReject('${e.id}')\""), 'ação de reprovação ausente');
assert(app.includes("onclick=\"auditToggleCalibration('${e.id}')\""), 'ação de calibração ausente');
assert(app.includes('conversationButton(e.phone'), 'ação de conversa ausente');

console.log('Audit actions layout smoke test OK: tabela rolável, coluna Ações fixa, foco acessível e ações preservadas.');
