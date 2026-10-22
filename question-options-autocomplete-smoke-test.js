const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=__dirname;
const moduleSource=fs.readFileSync(root+'/question-options-autocomplete.js','utf8');
const excelSource=fs.readFileSync(root+'/question-options-excel.js','utf8');
const app=fs.readFileSync(root+'/app.js','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const hosts=new Map();
const document={querySelector(selector){const match=selector.match(/data-q-autocomplete="([^"]+)"/);return match?hosts.get(match[1])||null:null;}};
const context={console,Map,Set,Array,Object,String,Number,JSON,document,window:null,acollectSetAnswer(){},acollectToggleMultiAnswer(){},acollectSetPairField(){},acollectTogglePairMulti(){}};
context.window=context;
vm.createContext(context);
vm.runInContext(moduleSource,context);
const api=context.PP_QUESTION_OPTIONS_AUTOCOMPLETE;
let checks=0;
function ok(label,fn){fn();checks++;console.log('OK — '+label);}
const options=['Fiat Uno','Fiat Argo','Honda Civic','Toyota Corolla','Volkswagen Gol','Chevrolet Onix','Renault Kwid','Jeep Compass','Ford Ka'];
const host={querySelector(){return {innerHTML:''};}};
hosts.set('single:q-1:',host);

ok('módulo e cache versionado estão carregados',()=>{
  assert.match(moduleSource,/PP_QUESTION_OPTIONS_AUTOCOMPLETE/);
  assert.match(html,/question-options-autocomplete\.js\?v=\d+/);
  assert.match(html,/pesquisapro-app-version" content="\d+/);
  assert.match(app,/acollectOptionAutocompleteBody\('single'/);
  assert.match(app,/q\.optionsImported===true/);
  assert.match(app,/q\.fieldOptionsImported\?\.\[fieldIndex\]===true/);
  assert.match(excelSource,/q\.optionsImported=true/);
  assert.match(excelSource,/q\.fieldOptionsImported/);
  assert.match(css,/q-autocomplete/);
});
ok('a filtragem prioriza início do texto e limita sugestões',()=>{
  const result=api.filtered(options,'fiat');
  assert.deepEqual(Array.from(result).map(item=>item.label),['Fiat Uno','Fiat Argo']);
  assert.ok(api.MAX_SUGGESTIONS<=20);
});
ok('a busca ignora acentos e caixa',()=>{
  const result=api.filtered(['São Paulo','Santo André','Belo Horizonte'],'SAO');
  assert.equal(result[0].label,'São Paulo');
});
ok('o renderer do construtor tem caixa rolável e salto para o final',()=>{
  assert.match(app,/q-opts-scroll/);
  assert.match(app,/qScrollOptionsToEnd/);
  assert.match(app,/Ir para a última/);
  assert.match(css,/max-height:244px/);
});
ok('o renderer da coleta atende escolha única, múltipla e subcampo',()=>{
  assert.match(app,/acollectOptionAutocompleteBody\('multi'/);
  assert.match(app,/acollectOptionAutocompleteBody\('pair-single'/);
  assert.match(app,/acollectOptionAutocompleteBody\('pair-multi'/);
});
ok('perguntas sem importação continuam com controles tradicionais',()=>{
  assert.match(app,/if\(useAutocomplete&&autocomplete\?\.mount\)/);
  assert.match(app,/useAutocomplete=false/);
});
ok('mount registra opções sem criar uma lista completa no HTML',()=>{
  const markup=api.mount('single','q-1',null,options,[]);
  assert.match(markup,/q-autocomplete-input/);
  assert.match(markup,/Digite para buscar uma opção/);
  assert.ok(markup.length<8000,'o campo inicial não deve renderizar milhares de opções');
});
ok('não expõe segredos nem endpoint remoto',()=>{
  assert.doesNotMatch(moduleSource,/SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|OPENAI_API_KEY/);
  assert.doesNotMatch(moduleSource,/supabase\.co|fetch\(/i);
});
console.log(`question-options-autocomplete-smoke-test: PASS — ${checks} verificações.`);
