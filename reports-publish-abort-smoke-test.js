const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function extractBetween(startMarker,endMarker){
  const start=app.indexOf(startMarker),end=app.indexOf(endMarker,start);
  assert(start>=0&&end>start,`não foi possível extrair ${startMarker}`);
  return app.slice(start,end);
}
const actions=[];let feedback='';
const payload={surveyId:'survey-1',clientId:'client-1',sections:{includeOverview:true,includeCross:true,crossings:[]}};
const context={
  console,Date,AbortController,JSON,Array,Number,String,Math,
  setTimeout(fn){fn();return 1;},clearTimeout(){},
  RP_REPORT_EXPORT_BUSY:false,CURRENT_PROFILE:{id:'staff-1'},
  reportsSimpleBusy:()=>false,
  reportsDocFeedback:text=>{feedback=String(text);},
  reportsRequireDraft:async()=>{},
  reportsPrepareCompletePublication:()=>payload,
  reportsValidatePdfCrossings:()=>{},
  reportsSaveDraft:async()=>{actions.push('save-draft');return 'report-1';},
  reportsVerifyDocumentSnapshot:()=>{},
  reportsSetDocumentStatus:status=>actions.push('status:'+status),
  reportsCreatePdfBlob:async()=>context.reportsReadAllPages(()=>({
    range(){return this;},
    abortSignal(signal){this.signal=signal;return this;},
    then(resolve,reject){
      if(this.signal.aborted){const error=new Error('signal is aborted without reason');error.name='AbortError';return Promise.reject(error).then(resolve,reject);}
      return Promise.resolve({data:[],error:null,count:0}).then(resolve,reject);
    }
  })),
  sb:{storage:{from:()=>({upload:async()=>{actions.push('upload');return {error:null};}})},rpc:async name=>{actions.push('rpc:'+name);return {data:true,error:null};}},
  document:{getElementById:()=>null,querySelectorAll:()=>[]}
};
context.window=context;
vm.createContext(context);
vm.runInContext(
  extractBetween('async function reportsReadAllPages(','\nfunction reportsOverviewOrder(')+'\n'+
  extractBetween('async function reportsFinalizeAndPublish(){','\nfunction reportsCrossCsvLines('),
  context
);
(async()=>{
  await context.reportsFinalizeAndPublish();
  assert(actions.includes('save-draft'),'o rascunho deve permanecer salvo');
  assert(!actions.includes('upload'),'nenhum PDF parcial pode ser enviado ao storage');
  assert(!actions.includes('rpc:report_document_publish'),'a publicação não pode ser chamada após falha de geração');
  assert.match(feedback,/página 1 do relatório excedeu o prazo mesmo após uma nova tentativa/i);
  assert(!feedback.includes('signal is aborted without reason'));
  assert.equal(context.RP_REPORT_EXPORT_BUSY,false);
  console.log('reports-publish-abort-smoke-test: PASS — AbortError repetido é tratado, sem upload ou publicação parcial.');
})().catch(error=>{console.error(error);process.exitCode=1;});
