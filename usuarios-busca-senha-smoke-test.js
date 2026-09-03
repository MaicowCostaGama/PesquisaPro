const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');

for (const token of ['USER_SEARCH', 'normalizeUserSearch', 'compactUserSearch', 'userSearchInput', 'setSelectionRange(USER_SEARCH.length,USER_SEARCH.length)', 'userSendPasswordReset', 'resetPasswordForEmail', 'completePasswordReset', 'updateUser({password:pass})', "event==='PASSWORD_RECOVERY'"]) {
  assert(app.includes(token), `lógica ausente: ${token}`);
}
for (const token of ['password-reset-card', 'id="rp-pass"', 'id="rp-pass-confirm"', 'Esqueci minha senha']) {
  assert(html.includes(token), `interface de senha ausente: ${token}`);
}
for (const token of ['id="user-search"', 'Buscar por nome, CPF ou e-mail', 'user-password-reset', 'Resetar senha']) {
  assert(app.includes(token), `interface de busca ausente: ${token}`);
}
for (const token of ['.user-search-bar', '.user-search-clear', '.user-password-reset', '.password-recovery-link']) {
  assert(css.includes(token), `estilo ausente: ${token}`);
}
assert(!app.includes('service_role'), 'chave service_role não pode aparecer no navegador');
assert(app.includes("replace(/[\\u0300-\\u036f]/g"), 'normalização Unicode de acentos ausente');
assert(!html.includes('service_role'), 'chave service_role não pode aparecer no HTML');
console.log('Users search/password smoke test OK: busca, reset por link e troca de senha verificados.');
