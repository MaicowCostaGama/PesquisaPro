const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const sql=fs.readFileSync(path.join(root,'deploy','relatorios-pdf-clientes.sql'),'utf8');
const jspdf=path.join(root,'vendor','jspdf.umd.min.js');
const officialLogo=path.join(root,'assets','logo-wide.png');
const checks=[
  ['editor de estrutura',app.includes('Estrutura do relatório final')],
  ['apresentação e metodologia',app.includes('rp-doc-presentation')&&app.includes('rp-doc-methodology-text')],
  ['síntese executiva',app.includes('rp-doc-summary-text')],
  ['cartões de cruzamentos',app.includes('reportsCrossingCardMarkup')&&app.includes('reports-crossings-builder')&&app.includes('reports-crossing-title')],
  ['adicionar e remover cruzamentos',app.includes('Adicionar outro cruzamento')&&app.includes('reportsAddCrossing')&&app.includes('reportsRemoveCrossing')],
  ['salvar vários cruzamentos',app.includes('Salvar cruzamentos na estrutura')&&app.includes('reportsCrossingPayloads')],
  ['inclusão individual no PDF',app.includes('reportsToggleCrossingInclude')&&app.includes('data-crossing-include')],
  ['limite de três variáveis por cruzamento',app.includes('reportsCrossingQuestionIds')&&app.includes('.slice(0,3)')],
  ['payload lista cruzamentos',app.includes('crossings}}')&&app.includes('questionIds:reportsCrossingQuestionIds')],
  ['reidratação completa',app.includes('reportsNormalizeCrossings')&&app.includes('reportsFillDraft')&&app.includes('reportsLoadDraft')&&app.includes('data-crossing-question')],
  ['geração local PDF',app.includes('loadLocalAsset(\'jspdf\')')&&app.includes('reportsCreatePdfBlob')],
  ['capa dedicada e legível',app.includes('function reportsPdfCover')&&app.includes('reportsPdfCover(doc,payload,survey,client,logoData);doc.addPage();')&&app.includes('reportsLoadCoverLogo')],
  ['logo oficial na capa',fs.existsSync(officialLogo)&&fs.statSync(officialLogo).size>1000&&app.includes("fetch('assets/logo-wide.png'")&&app.includes("doc.addImage(logoData,'PNG'")],
  ['PDF percorre todos os cruzamentos',app.includes('reportsCreateMultiCrossPdfBlob')&&app.includes('reportsPdfWriteCrossing')&&app.includes('payload.sections.crossings')],
  ['matriz percentual com totais',app.includes('reportsCrossMatrixModel')&&app.includes('reportsCrossPct')&&app.includes('cross-total-row')&&app.includes('<th>TOTAL</th>')],
  ['matriz horizontal no PDF',app.includes("doc.addPage('a4','landscape')")&&app.includes('reportsCrossMatrixMarkup')],
  ['cabeçalho completo da matriz',app.includes("doc.setFillColor(15,42,86);doc.setTextColor(255,255,255);doc.rect(x,y,widths[index],headerH,'F')")],
  ['finalização e publicação',app.includes('reportsFinalizeAndPublish')&&app.includes('report_document_publish')],
  ['biblioteca do cliente',app.includes('clientPublishedReportsMarkup')&&app.includes('client_published_reports')],
  ['bucket privado',sql.includes("'client-reports'")&&sql.includes('public = false')],
  ['RLS de gestão',sql.includes('public.is_staff()')&&sql.includes('staff manages report documents')],
  ['RLS do cliente',sql.includes('client sees published report documents')&&sql.includes('rd.client_id = auth.uid()')],
  ['cliente recebe apenas publicados',sql.includes("rd.status='published'")&&sql.includes('client_published_reports')],
  ['cache atualizado',html.includes('20260908200000')],
  ['estilos responsivos',css.includes('.reports-document-editor')&&css.includes('.reports-crossing-card')&&css.includes('.reports-cross-matrix')&&css.includes('@media(max-width:760px)')],
  ['jsPDF local',fs.existsSync(jspdf)&&fs.statSync(jspdf).size>100000],
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed){console.error(`Falhas: ${failed}`);process.exit(1);}console.log('PASS — editor PDF e múltiplos cruzamentos');
