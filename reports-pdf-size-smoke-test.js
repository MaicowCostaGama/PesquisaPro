const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const jspdf=require(__dirname+'/vendor/jspdf.umd.min.js');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function extract(startMarker,endMarker){
  const start=app.indexOf(startMarker),end=app.indexOf(endMarker,start);
  assert(start>=0&&end>start,`não foi possível extrair ${startMarker}`);
  return app.slice(start,end);
}
const feedback=[];const actions=[];
const context={
  Date,Error,Number,String,Math,JSON,Array,Object,RegExp,Boolean,
  CURRENT_PROFILE:{id:'staff-test'},RP_REPORT_EXPORT_BUSY:false,
  reportsSimpleBusy:()=>false,
  reportsDocFeedback:text=>feedback.push(String(text)),
  reportsRequireDraft:async()=>{},
  reportsPrepareCompletePublication:()=>({surveyId:'survey-1',clientId:'client-1',sections:{crossings:[]}}),
  reportsValidatePdfCrossings:()=>{},
  reportsSaveDraft:async()=>{actions.push('save-draft');return 'report-1';},
  reportsCreatePdfBlob:async()=>({blob:{size:25*1048576},pageCount:600,crossingCount:2}),
  reportsVerifyDocumentSnapshot:()=>{},
  reportsSetDocumentStatus:()=>actions.push('published'),
  sb:{
    storage:{from:bucket=>{assert.equal(bucket,'client-reports');return {upload:async()=>({error:{message:'The object exceeded the maximum allowed size'}})};}},
    rpc:async()=>{actions.push('publish-rpc');return {data:true,error:null};}
  },
  document:{getElementById:()=>null,querySelectorAll:()=>[]}
};
vm.createContext(context);
vm.runInContext(extract('function reportsPdfUploadError(','\nasync function reportsFinalizeAndPublish(){')+'\n'+extract('async function reportsFinalizeAndPublish(){','\nfunction reportsCrossCsvLines('),context);
(async()=>{
  const makeSample=compress=>{
    const doc=new jspdf.jsPDF({unit:'mm',format:'a4',compress,putOnlyUsedFonts:true});
    for(let page=0;page<40;page++){
      if(page)doc.addPage();
      doc.setFontSize(10);
      for(let row=0;row<24;row++)doc.text(`Pergunta ${row+1} · Categoria de resposta ${row+1} · entrevistas válidas 1.182 · percentual 23,45%`,16,18+row*10);
    }
    return doc.output('arraybuffer').byteLength;
  };
  const uncompressedBytes=makeSample(false),compressedBytes=makeSample(true);
  assert(compressedBytes<uncompressedBytes*.8,`compressão deve reduzir o PDF de teste (${compressedBytes} vs ${uncompressedBytes} bytes)`);
  await context.reportsFinalizeAndPublish();
  assert(actions.includes('save-draft'),'rascunho continua salvo');
  assert(!actions.includes('publish-rpc')&&!actions.includes('published'),'arquivo acima do limite não é disponibilizado');
  assert.equal(context.RP_REPORT_EXPORT_BUSY,false,'a trava da interface é liberada após falha');
  const message=feedback.at(-1)||'';
  assert.match(message,/25,00 MB/);
  assert.match(message,/Global file size limit/);
  assert.match(message,/Buckets > client-reports/);
  assert.match(message,/não foi disponibilizado/);
  assert(!message.includes('The object exceeded the maximum allowed size'));
  const generic=new Error('erro de rede');
  assert.strictEqual(context.reportsPdfUploadError(generic,{size:1}),generic,'outros erros devem preservar a mensagem original');
  console.log(`reports-pdf-size-smoke-test: PASS — PDF de teste reduzido em ${Math.round((1-compressedBytes/uncompressedBytes)*100)}%; limite traduzido e publicação bloqueada após rejeição.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
