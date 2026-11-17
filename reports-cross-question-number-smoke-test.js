const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const client=fs.readFileSync(__dirname+'/reports-client.js','utf8');
function extractFunction(source,name){
  const start=source.search(new RegExp('^(?:async )?function '+name+'\\(','m'));
  assert(start>=0,`função ${name} ausente`);
  const lineEnd=source.indexOf('\n',start);
  if(source.slice(start,lineEnd).trim().endsWith('}'))return source.slice(start,lineEnd);
  return source.slice(start,source.indexOf('\n}',start)+2);
}
const fullQuestions=[
  {dbId:'q-1',type:'single',text:'Primeira pergunta'},
  {dbId:'q-2',type:'pair',text:'Pergunta de duas respostas (não selecionável)'},
  {dbId:'q-3',type:'single',text:'Qual região onde você mora?'}
];
let currentQuestions=fullQuestions;
const context={
  Array,String,Number,JSON,
  RP_REPORT_CROSSINGS:[{id:'cross-1'}],
  reportsCurrentQuestions:()=>currentQuestions,
  reportsCrossingQuestionIds:()=>[],
  esc:value=>String(value),
  jsArg:value=>JSON.stringify(value)
};
vm.createContext(context);
vm.runInContext([
  extractFunction(app,'reportsCrossQuestionOptionLabel'),
  extractFunction(app,'reportsCrossQuestionSelect')
].join('\n'),context);
const selectable=[fullQuestions[0],fullQuestions[2]];
const management=context.reportsCrossQuestionSelect('cross-1',0,selectable);
assert.match(management,/value="q-3"[^>]*>Pergunta 03 — Qual região onde você mora\?/,'a gestão deve ver o número original da pergunta sem alterar o valor do option');
assert.equal(context.reportsCrossQuestionOptionLabel(selectable[1]),'Pergunta 03 — Qual região onde você mora?');
const clientContext={Array,String,clientCrossQuestionOptionLabel:null};
vm.createContext(clientContext);
vm.runInContext(extractFunction(client,'clientCrossQuestionOptionLabel')+'\nthis.label=clientCrossQuestionOptionLabel;',clientContext);
assert.equal(clientContext.label(fullQuestions,selectable[1]),'Pergunta 03 — Qual região onde você mora?');
assert(client.includes('clientCrossQuestionOptionLabel(s.questions,q)'),'o dropdown do perfil cliente deve usar o label numerado');
console.log('reports-cross-question-number-smoke-test: PASS — gestão e cliente mostram a numeração original da pergunta, preservando IDs e ordem.');
