const assert = require('assert');
const fs = require('fs');

const files = ['index.html', 'app.html', 'app.js', 'recruitment.js', 'commercial.js', 'style.css'];
const content = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');

for (const term of ['Protótipo', 'Prototipo', 'demonstração', 'demonstracao', 'não envia dados de verdade', 'não envia dados reais']) {
  assert(!content.toLowerCase().includes(term.toLowerCase()), `termo de demonstração ainda presente: ${term}`);
}
const landing = fs.readFileSync('index.html', 'utf8');
assert(landing.includes('https://wa.me/5531996683030?text='), 'formulário sem envio para o WhatsApp oficial');
assert(landing.includes('(31) 99668-3030'), 'telefone comercial não atualizado na landing page');
const recruitment = fs.readFileSync('recruitment.js', 'utf8');
assert(recruitment.includes("BUSINESS_WHATSAPP='5531996683030'"), 'WhatsApp comercial do recrutamento não atualizado');
assert(!content.includes('553996683030'), 'número comercial antigo ainda presente');
assert(!landing.includes('(31) 99999-0000'), 'telefone antigo ainda presente na landing page');
assert(landing.includes('lpSuccessText'), 'retorno do envio do formulário ausente');
assert(landing.includes('Pesquisa de opinião, coleta de campo e decisões mais seguras.'), 'mensagem institucional da home ausente');
console.log('Sem protótipo smoke test OK: landing page, formulário, painel e módulos sem disclaimer de demonstração.');
