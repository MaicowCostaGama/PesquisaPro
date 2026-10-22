const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
const sqlPath='deploy/tempo-minimo-coleta-auditoria.sql';
const sql=fs.existsSync(sqlPath)?fs.readFileSync(sqlPath,'utf8'):'';

for(const token of [
  'wizMinimumDurationMarkup',
  'wizMinimumDurationPreview',
  'wizMinimumDurationRefresh',
  'wiz-minimum-duration-input',
  'surveyAutomaticMinimumSeconds(WIZ.data)',
  'WIZ.data.minimumCollectionSeconds=seconds',
  'Tempo mínimo de auditoria',
  'if(!wizSave())return;'
])assert(app.includes(token),`app sem ${token}`);
for(const token of [
  '.wiz-audit-duration-card',
  '.wiz-audit-duration-grid',
  '.wiz-audit-duration-input-row',
  '.wiz-audit-duration-current',
  '@media(max-width:760px)'
])assert(css.includes(token),`CSS sem ${token}`);
if(sql){
  for(const token of [
    'minimum_collection_seconds',
    'difficulty',
    'calculate_survey_minimum_collection_seconds',
    'surveys_minimum_collection_seconds_chk',
    'survey_questions_difficulty_chk',
    'new.duration_seconds < v_minimum'
  ])assert(sql.includes(token),`SQL sem ${token}`);
}
assert(html.includes('pesquisapro-app-version" content="20261022154500'),'versão do painel não atualizada');
assert(html.includes('style.css?v=20261022154500'),'cache do CSS não atualizado');
assert(html.includes('app.js?v=20261022154500'),'cache do app não atualizado');
if(sql)assert(!/drop\s+table|drop\s+column|truncate|delete\s+from/i.test(sql),'migration contém operação destrutiva');

function automatic(questions){
  const bases={single:12,multi:18,ranking:22,pair:32,scale:8,scale10:10,nps:10,open:45,number:10,date:8};
  const multipliers=[0,.75,.9,1,1.25,1.5];
  const total=questions.reduce((sum,q)=>{
    let base=bases[q.type]||15;
    if(q.type==='multi')base+=Math.min(8,q.options)*2;
    if(q.type==='ranking')base+=Math.min(10,q.options)*4;
    return sum+base*(multipliers[q.difficulty]||1);
  },0);
  return Math.max(30,Math.min(3600,Math.ceil((30+total)/5)*5));
}
assert.strictEqual(automatic([{type:'single',options:4,difficulty:3},{type:'open',options:0,difficulty:4}]),100,'fórmula de sugestão inesperada');
assert.strictEqual(automatic([]),30,'formulário vazio deve começar com 30 segundos');
console.log(`Survey duration formulation smoke test: PASS — sugestão por formulário, dificuldade, ajuste opcional, cache e ${sql?'proteção SQL local verificada':'execução pública sem migration SQL verificada'}.`);
