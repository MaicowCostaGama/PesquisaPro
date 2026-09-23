const assert = require('assert');
const fs = require('fs');

const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');

for (const token of [
  '#app.show{display:grid;width:100%;height:100vh;height:100dvh;min-height:0;',
  'grid-template-columns:232px minmax(0,1fr)',
  'grid-template-rows:60px minmax(0,1fr)',
  'overflow:hidden}',
  '.sidebar{background:var(--surface);border-right:1px solid var(--line);padding:16px 12px;min-width:0;min-height:0;overflow-x:hidden;overflow-y:auto}',
  '.main{padding:26px 30px;min-width:0;min-height:0;overflow-x:hidden;overflow-y:auto;height:auto}',
  'body:has(#app.show){overflow:hidden}',
  'height:auto;min-height:0;padding:22px 16px'
]) {
  assert(css.includes(token), `regra global de layout ausente: ${token}`);
}

assert(html.includes('style.css?v=20260922222000'), 'cache do layout não foi atualizado');
assert(html.includes('app.js?v=20260922222000'), 'cache do app não foi atualizado');
assert(css.includes('.finance-table-scroll{'), 'rolagem horizontal de tabela financeira deve continuar localizada');
assert(css.includes('.audit-table-scroll{'), 'rolagem horizontal da auditoria deve continuar localizada');
assert(css.includes('.user-table-scroll{'), 'rolagem horizontal de usuários deve continuar localizada');

console.log('Global layout smoke test OK: shell com uma rolagem vertical, overflow externo bloqueado e tabelas roláveis apenas em seus contêineres.');
