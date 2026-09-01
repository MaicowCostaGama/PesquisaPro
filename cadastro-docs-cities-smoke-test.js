const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'cadastro.html'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, 'deploy', 'recrutamento-documentos.sql'), 'utf8');
const cities = fs.readFileSync(path.join(__dirname, 'public-cities.js'), 'utf8');

assert(html.includes('id="doc-foto"') && html.includes('required'), 'documento com foto obrigatório ausente');
assert(html.includes('id="doc-comprovante"') && html.includes('required'), 'comprovante obrigatório ausente');
assert(html.includes('id="city-search"'), 'busca de cidades ausente');
assert(html.includes('maxCities=5'), 'limite de cinco cidades ausente');
assert(html.includes('normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g'), 'busca sem normalização de acentos');
assert(html.includes('p_cidades_atuacao:selectedCities'), 'cidades selecionadas não são enviadas');
assert(html.includes('p_doc_foto_url:fotoPath'), 'documento com foto não é enviado');
assert(html.includes('p_doc_comprovante_url:comprovantePath'), 'comprovante não é enviado');
assert(html.includes("sb.storage.from('researcher-documents').upload"), 'upload privado ausente');
assert(html.includes('public-cities.js'), 'lista local de cidades não é carregada');
const cityValues = [...cities.matchAll(/"([^"]+\/(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO))"/g)].map(match => match[1]);
const cityUfs = new Set(cityValues.map(city => city.split('/').pop()));
assert(cityValues.length === 5571, `lista nacional deveria ter 5.571 municípios, encontrou ${cityValues.length}`);
assert(cityUfs.size === 27, `lista nacional deveria ter 27 UFs, encontrou ${cityUfs.size}`);
['Belo Horizonte/MG', 'São Paulo/SP', 'Salvador/BA', 'Manaus/AM', 'Porto Alegre/RS', 'Brasília/DF'].forEach(city => assert(cityValues.includes(city), `lista nacional não contém ${city}`));
assert(migration.includes("researcher-documents"), 'bucket privado ausente na migration');
assert(migration.includes('p_doc_foto_url text'), 'assinatura de documento com foto ausente');
assert(migration.includes('p_doc_comprovante_url text'), 'assinatura de comprovante ausente');
assert(migration.includes('Escolha no máximo cinco cidades'), 'limite de cidades não é reforçado no banco');
assert(migration.includes('Caminho de documento inválido'), 'validação de caminho privado ausente');
console.log('Cadastro documents/cities smoke test OK: documentos, cidades e RPC rastreável verificados.');
