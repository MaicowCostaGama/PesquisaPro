const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2] || '/tmp/ibge-municipios.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const getUf = (item) => item?.microrregiao?.mesorregiao?.UF?.sigla
  || item?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;

const cities = source
  .map((item) => {
    const name = String(item?.nome || '').trim();
    const uf = getUf(item);
    return name && uf ? `${name}/${uf}` : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, 'pt-BR'));

if (cities.length < 5000 || new Set(cities).size !== cities.length) {
  throw new Error(`Lista nacional inválida: ${cities.length} cidades, ${new Set(cities).size} valores únicos.`);
}

const output = `// Lista nacional de municípios para o cadastro público do PesquisaPro.\n// Fonte: IBGE Localidades API: https://servicodados.ibge.gov.br/api/v1/localidades/municipios\n// Formato: Município/UF.\nwindow.PP_PUBLIC_CITIES = ${JSON.stringify(cities, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, 'public-cities.js'), output);
console.log(`Geradas ${cities.length} cidades em public-cities.js`);
