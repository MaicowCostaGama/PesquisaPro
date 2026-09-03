const assert = require('assert');
const fs = require('fs');

const files = ['index.html', 'app.html', 'app.js', 'recruitment.js', 'commercial.js', 'style.css'];
const content = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');

for (const term of ['Protótipo', 'Prototipo', 'demonstração', 'demonstracao', 'não envia dados de verdade', 'não envia dados reais']) {
  assert(!content.toLowerCase().includes(term.toLowerCase()), `termo de demonstração ainda presente: ${term}`);
}
const landing = fs.readFileSync('index.html', 'utf8');
assert(landing.includes('https://wa.me/553996683030?text='), 'formulário sem envio para o WhatsApp oficial');
assert(landing.includes('lpSuccessText'), 'retorno do envio do formulário ausente');
assert(landing.includes('Indicadores apresentados podem variar conforme a operação.'), 'nota pública não atualizada');
console.log('Sem protótipo smoke test OK: landing page, formulário, painel e módulos sem disclaimer de demonstração.');
