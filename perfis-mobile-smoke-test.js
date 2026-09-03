const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const recruitment = fs.readFileSync('recruitment.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

for (const token of ['profile-page profile-page-generic', 'profile-page profile-page-pesq', 'profile-page profile-page-client']) {
  assert(app.includes(token), `contêiner de perfil ausente: ${token}`);
}
assert(recruitment.includes('recruiter-personal-page'), 'perfil pessoal do recrutador sem contêiner móvel');
for (const token of ['.profile-page .grid.g2{grid-template-columns:minmax(0,1fr)}', '.profile-page table{width:100%;min-width:0;table-layout:fixed}', '.user-actions-cell', '.recruiter-personal-page .recruitment-hero', '@media(max-width:580px)', '@media(max-width:380px)']) {
  assert(css.includes(token), `regra móvel ausente: ${token}`);
}
console.log('Profiles mobile smoke test OK: pesquisadores, clientes, recrutadores, equipe e perfis comerciais cobertos.');
