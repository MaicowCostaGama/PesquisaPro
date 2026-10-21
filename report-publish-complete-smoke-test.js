const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const checks=[
  ['botão identifica PDF completo',app.includes('Finalizar e disponibilizar PDF completo ao cliente')],
  ['orientação informa todos os cruzamentos',app.includes('todos os cruzamentos configurados com até três variáveis entram no PDF publicado')],
  ['preparação completa existe',app.includes('function reportsPrepareCompletePublication')],
  ['todos os blocos são forçados na publicação',app.includes("['methodology','overview','cross','summary'].forEach")],
  ['cruzamentos configurados são forçados no PDF',app.includes('{...crossing,include:true}')],
  ['cruzamento acima do limite bloqueia publicação',app.includes('excede três variáveis. Ajuste-o antes de publicar o relatório completo')],
  ['PDF retorna quantidade de páginas',app.includes('pageCount:doc.internal.getNumberOfPages()')],
  ['PDF retorna quantidade de cruzamentos',app.includes('crossingCount:crossings.length')],
  ['finalização usa publicação completa',app.includes('const profile=CURRENT_PROFILE,payload=reportsPrepareCompletePublication()')],
  ['mensagem confirma páginas e cruzamentos',app.includes("Relatório completo finalizado e disponibilizado: '+result.pageCount+' páginas e '+result.crossingCount")],
  ['cache v203',html.includes('20261021204500')],
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('report-publish-complete-smoke-test: PASS');
