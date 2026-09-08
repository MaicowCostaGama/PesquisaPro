const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/app.js','utf8');
const start=source.indexOf('function reportsCrossOptionLabels');
const end=source.indexOf('function renderReportsCross',start);
assert(start>=0&&end>start,'Funções puras da matriz não encontradas');
const context={reportsQuestionLabel:id=>context.reportsCurrentQuestions().find(question=>question.dbId===id)?.text||'(variável sem texto)',reportsCurrentQuestions:()=>[
  {dbId:'income',text:'Renda',opts:['Menos de R$ 724','De R$ 725 a R$ 1448','Mais de R$ 3621']},
  {dbId:'evaluation',text:'Avaliação Prefeitura',opts:['Ótimo','Bom','Regular +']},
  {dbId:'region',text:'Região',opts:['Norte','Sul']},
]};
vm.runInNewContext(source.slice(start,end),context);
const rows=[
  {variable_1:'Ótimo',variable_2:'Menos de R$ 724',cnt:2,valid_base:100},
  {variable_1:'Ótimo',variable_2:'De R$ 725 a R$ 1448',cnt:8,valid_base:100},
  {variable_1:'Bom',variable_2:'Menos de R$ 724',cnt:13,valid_base:100},
  {variable_1:'Bom',variable_2:'De R$ 725 a R$ 1448',cnt:75,valid_base:100},
  {variable_1:'Regular +',variable_2:'Mais de R$ 3621',cnt:2,valid_base:100},
];
const model=context.reportsCrossMatrixModel(rows,['evaluation','income']);
assert.equal(JSON.stringify(model.rowValues),JSON.stringify(['Ótimo','Bom','Regular +']));
assert.equal(JSON.stringify(model.colValues),JSON.stringify(['Menos de R$ 724','De R$ 725 a R$ 1448','Mais de R$ 3621']));
assert.equal(model.rowTotals.get('Ótimo'),10);
assert.equal(model.colTotals.get('De R$ 725 a R$ 1448'),83);
assert.equal(model.counts.get('Bom\u0000De R$ 725 a R$ 1448'),75);
assert.equal(context.reportsCrossPct(75,100),'75,0%');
const third=context.reportsCrossMatrixModel(rows.map(row=>({...row,variable_3:'Norte'})),['evaluation','income','region'],'Norte');
assert.equal(third.title,'Região: Norte');
console.log('reports-cross-matrix-smoke-test: PASS — ordem, matriz, percentuais e totais verificados.');
