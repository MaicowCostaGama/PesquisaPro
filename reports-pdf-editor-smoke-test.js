const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'deploy','relatorios-pdf-clientes.sql'),'utf8');
const jspdf=path.join(root,'vendor','jspdf.umd.min.js');
const checks=[
  ['editor de estrutura',app.includes('Estrutura do relatório final')],
  ['apresentação e metodologia',app.includes('rp-doc-presentation')&&app.includes('rp-doc-methodology')],
  ['síntese executiva',app.includes('rp-doc-summary')],
  ['blocos do PDF',app.includes('rp-doc-overview')&&app.includes('rp-doc-cross')],
  ['geração local PDF',app.includes('loadLocalAsset(\'jspdf\')')&&app.includes('reportsCreatePdfBlob')],
  ['finalização e publicação',app.includes('reportsFinalizeAndPublish')&&app.includes('report_document_publish')],
  ['biblioteca do cliente',app.includes('clientPublishedReportsMarkup')&&app.includes('client_published_reports')],
  ['bucket privado',sql.includes("'client-reports'")&&sql.includes('public = false')],
  ['RLS de gestão',sql.includes('public.is_staff()')&&sql.includes('staff manages report documents')],
  ['RLS do cliente',sql.includes('client sees published report documents')&&sql.includes('rd.client_id = auth.uid()')],
  ['cliente recebe apenas publicados',sql.includes("rd.status='published'")&&sql.includes('client_published_reports')],
  ['limite de três variáveis preservado',app.includes('.slice(0,3)')&&app.includes('crossQuestionIds')],
  ['cache atualizado',html.includes('20260908120000')],
  ['estilos responsivos',css.includes('.reports-document-editor')&&css.includes('.client-report-row')&&css.includes('@media(max-width:760px)')],
  ['jsPDF local',fs.existsSync(jspdf)&&fs.statSync(jspdf).size>100000],
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed){console.error(`Falhas: ${failed}`);process.exit(1);}console.log('PASS — editor PDF e entrega ao cliente');
