const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const XLSX=require('./vendor/xlsx.full.min.js');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const moduleSource=fs.readFileSync(root+'/question-options-excel.js','utf8');
const fakeBody={appendChild(node){node.parentNode=this;},removeChild(node){node.parentNode=null;}};
const fakeElement=()=>({parentNode:null,className:'',innerHTML:'',querySelectorAll:()=>[],querySelector:()=>({focus(){},addEventListener(){}}),addEventListener(){}});
const context={console,Set,Map,Array,Object,String,Number,JSON,Date,DataView,Uint8Array,window:null,XLSX,document:{body:fakeBody,createElement:fakeElement},loadLocalAsset:async()=>{},qFind:id=>({id,type:'single',opts:['Opção atual']})};
context.window=context;
vm.createContext(context);
vm.runInContext(moduleSource,context);
const api=context.PP_QUESTION_OPTIONS_EXCEL;
let checks=0;
function check(label,fn){return Promise.resolve().then(fn).then(()=>{checks++;console.log('OK — '+label);});}
function workbook(rows){const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Opções');return book;}
function xlsxFile(rows,name='opcoes.xlsx'){
  const buffer=XLSX.write(workbook(rows),{bookType:'xlsx',type:'array',compression:true});
  return {name,size:buffer.byteLength,arrayBuffer:async()=>buffer};
}
(async()=>{
  await check('módulo e botão de importação estão integrados',()=>{
    assert.match(moduleSource,/PP_QUESTION_OPTIONS_EXCEL/);
    assert.match(app,/PP_QUESTION_OPTIONS_EXCEL\.buttonMarkup/);
    assert.match(moduleSource,/Importar opções do Excel/);
    assert.match(app,/qPair.*PP_QUESTION_OPTIONS_EXCEL|PP_QUESTION_OPTIONS_EXCEL.*pair/);
    assert.match(html,/question-options-excel\.js\?v=20261021152000/);
    assert.match(html,/pesquisapro-app-version" content="20261021152000/);
    assert.match(css,/q-excel-import-overlay/);
  });
  await check('leitura XLSX usa a primeira aba e a primeira coluna preenchida',()=>{
    const parsed=api.parseWorkbook(XLSX,workbook([['Descrição','Código'],['Fiat Uno','1'],['Fiat Uno','2'],['Honda Civic','3'],['','4']]));
    assert.equal(parsed.sheetName,'Opções');
    assert.equal(parsed.column,0);
    assert.deepEqual(Array.from(parsed.rawValues),['Descrição','Fiat Uno','Fiat Uno','Honda Civic','']);
  });
  await check('deduplicação ignora caixa e acentos, mas preserva o primeiro texto',()=>{
    assert.deepEqual(Array.from(api.cleanValues(['Fiat Uno','fiat uno','  FIÁT ÚNO  ','Honda Civic','','Honda Civic'])),['Fiat Uno','Honda Civic']);
  });
  await check('limite de 10.000 opções é aceito e o excesso é recusado',()=>{
    assert.equal(api.MAX_ROWS,10000);
    const tenThousand=Array.from({length:10000},(_,index)=>`Opção ${index+1}`);
    assert.equal(api.cleanValues(tenThousand).length,10000);
    assert.throws(()=>api.cleanValues([...tenThousand,'Opção excedente']),/10\.000 opções/);
  });
  await check('adicionar mantém opções atuais e substituição troca a lista',()=>{
    assert.deepEqual(Array.from(api.buildOptionList(['A','B'],['B','C'],'append')),['A','B','C']);
    assert.deepEqual(Array.from(api.buildOptionList(['A','B'],['B','C'],'replace')),['B','C']);
  });
  await check('arquivo Excel real é aceito e preserva tamanho seguro',async()=>{
    const f=xlsxFile([['Marca'],['Fiat'],['Honda']]);
    await api.reviewFile(f,7,null);
    assert.equal(api.getPreview().fileName,'opcoes.xlsx');
    assert.deepEqual(Array.from(api.getPreview().rawValues),['Marca','Fiat','Honda']);
    api.close();
  });
  await check('fórmula é recusada antes da aplicação',()=>{
    const book=workbook([['Opção'],['valor']]);
    book.Sheets.Opções.A2.f='SUM(1,2)';
    assert.throws(()=>api.parseWorkbook(XLSX,book),/fórmulas/i);
  });
  await check('limite de opção é aplicado',()=>assert.throws(()=>api.cleanValues(['x'.repeat(201)]),/200 caracteres/));
  await check('botão de subcampo gera argumentos de pergunta e campo',()=>{
    const markup=api.buttonMarkup(9,1,'pair');
    assert.match(markup,/PP_QUESTION_OPTIONS_EXCEL\.open\(9,1\)/);
    assert.match(markup,/subcampo/);
  });
  await check('controle não expõe segredo nem endpoint remoto',()=>{
    assert.doesNotMatch(moduleSource,/SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|OPENAI_API_KEY/);
    assert.doesNotMatch(moduleSource,/supabase\.co|fetch\(/i);
  });
  console.log(`question-options-excel-smoke-test: PASS — ${checks} verificações.`);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
