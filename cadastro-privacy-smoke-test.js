const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'cadastro.html'), 'utf8');
assert(!source.includes('id="recruiter-box"'), 'card público do recrutador ainda está na página');
assert(!source.includes('id="recruiter-name"'), 'nome do recrutador ainda está exposto no DOM público');
assert(source.includes("params.get('recrutador')"), 'código do recrutador não é lido');
assert(source.includes("sb.rpc('recruiter_public_info'"), 'validação do recrutador ausente');
assert(source.includes("sb.rpc('submit_recruiter_signup'"), 'submissão rastreável ausente');
assert(source.includes('p_recruiter_code:code'), 'código não é enviado para rastreamento');
assert(source.includes('style.css?v=20260830310000'), 'cache atualizado ausente');
console.log('Cadastro privacy smoke test OK: recrutador oculto e rastreamento preservado.');
