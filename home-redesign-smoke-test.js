const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const recruitment = fs.readFileSync('recruitment.js', 'utf8');

for (const token of ['lp-audience-grid', 'lp-audience-researcher', 'lp-audience-client', 'lp-band-researcher', 'lp-band-client', 'lp-hero-card', 'lp-contact-info-item']) {
  assert(html.includes(token), `componente da home ausente: ${token}`);
}
for (const token of ['Transforme opinião em', 'Para pesquisadores', 'Para clientes', 'Quero ser pesquisador', 'Contratar uma pesquisa', 'https://wa.me/5531996683030', '(31) 99668-3030', 'Abrir conversa no WhatsApp']) {
  assert(html.includes(token), `conteúdo da home ausente: ${token}`);
}
assert(!html.includes('(31) 99999-0000'), 'telefone antigo presente na home');
assert(recruitment.includes("BUSINESS_WHATSAPP='5531996683030'"), 'WhatsApp do recrutamento não atualizado');
for (const token of ['.lp-audience-card', '.lp-band-panel', '.lp-header-whatsapp', '@media(max-width:640px)', '@media(max-width:380px)']) {
  assert(css.includes(token), `estilo da home ausente: ${token}`);
}
console.log('Home redesign smoke test OK: identidade para pesquisadores/clientes, CTAs, contato e responsividade verificados.');
