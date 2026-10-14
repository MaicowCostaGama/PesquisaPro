const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const take=(a,b)=>{const i=app.indexOf(a);assert(i>=0,a);const j=app.indexOf(b,i);assert(j>=i,b);return app.slice(i,j);};
const ctx={CURRENT_PROFILE:{id:'staff'},reportsCurrentQuestions:()=>[{dbId:'open',type:'open'}],reportsReadAllPages:null,reportsOverviewOrder:v=>v,reportsCrossOrder:v=>v,reportsFetchCross:async()=>({data:[],error:null}),JSON,Promise,Error};
vm.createContext(ctx);vm.runInContext(take('let RP_REPORT_GROUPED_REQUESTS=[];','async function reportsRequireDraft('),ctx);
let calls,pending;
function controlled(){calls=[];pending=[];ctx.sb={rpc(name,args){calls.push({name,args});return {name,args};}};ctx.reportsReadAllPages=makeQuery=>{makeQuery();return new Promise((resolve,reject)=>pending.push({resolve,reject}));};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const grouping={version:1,surveyId:'survey',questions:{open:{groups:[{id:'g',label:'Categoria',members:['Original']}],denominator:'answered'}}};
const answer={data:[{question_id:'open',value_label:'Categoria',cnt:10,valid_base:10}],error:null,count:1};
(async()=>{
 controlled();const a=ctx.reportsFetchStaffGroupedOverview('survey',grouping),b=ctx.reportsFetchStaffGroupedOverview('survey',JSON.parse(JSON.stringify(grouping)));await flush();assert.equal(calls.length,1,'Consultas idênticas simultâneas devem compartilhar o mesmo trabalho');pending[0].resolve(answer);const both=await Promise.all([a,b]);assert.strictEqual(both[0],both[1]);
 const fresh=ctx.reportsFetchStaffGroupedOverview('survey',grouping);await flush();assert.equal(calls.length,2,'Resultado concluído não pode virar cache potencialmente desatualizado');pending[1].resolve(answer);await fresh;
 controlled();const one=ctx.reportsFetchStaffGroupedOverview('survey',grouping),two=ctx.reportsFetchStaffGroupedOverview('survey',{...grouping,questions:{}});await flush();assert.equal(calls.length,2,'Agrupamentos diferentes precisam de consultas diferentes');pending.forEach(p=>p.resolve(answer));await Promise.all([one,two]);
 controlled();const old=ctx.reportsFetchStaffGroupedOverview('survey',grouping);ctx.CURRENT_PROFILE={id:'staff'};const newSession=ctx.reportsFetchStaffGroupedOverview('survey',grouping);await flush();assert.equal(calls.length,2,'Outra sessão não pode compartilhar consultas antigas mesmo com mesmo ID');pending.forEach(p=>p.resolve(answer));await Promise.all([old,newSession]);
 controlled();const reportA=ctx.reportsFetchClientGroupedOverview('survey','reportA'),reportB=ctx.reportsFetchClientGroupedOverview('survey','reportB');await flush();assert.equal(calls.length,2,'Documentos publicados distintos precisam usar seus próprios snapshots');assert(calls.every(c=>!('p_grouping' in c.args)));pending.forEach(p=>p.resolve(answer));await Promise.all([reportA,reportB]);
 controlled();const first=ctx.reportsFetchTreatedCross('survey',['open','closed'],grouping),same=ctx.reportsFetchTreatedCross('survey',['open','closed'],grouping),reversed=ctx.reportsFetchTreatedCross('survey',['closed','open'],grouping);await flush();assert.equal(calls.length,2,'A ordem das variáveis deve fazer parte da identidade');pending.forEach(p=>p.resolve({data:[{variable_1:'Categoria',variable_2:'Sim',cnt:10,valid_base:10}],error:null}));await Promise.all([first,same,reversed]);assert(calls.every(c=>c.name==='survey_report_grouped_cross'));
 controlled();const failed=ctx.reportsFetchStaffGroupedOverview('survey',grouping);await flush();const rejected=assert.rejects(failed,/banco excedeu o prazo/);pending[0].reject({code:'57014',message:'canceling statement due to statement timeout'});await rejected;const retry=ctx.reportsFetchStaffGroupedOverview('survey',grouping);await flush();assert.equal(calls.length,2,'Falha não deve deixar consulta presa nem causar repetição automática');pending[1].resolve(answer);await retry;
 const ordinary={code:'42501',message:'not authorized'};assert.strictEqual(ctx.reportsGroupingActivationError(ordinary),ordinary);assert(ctx.reportsGroupingActivationError({code:'57014',message:'statement timeout'}).message.includes('v163.sql'));assert(ctx.reportsGroupingActivationError({code:'PGRST202'}).message.includes('v163.sql'));
 const busy={RP_REPORT_EXPORT_BUSY:true,RP_REPORT_LOADING:false,document:{getElementById:()=>({})},reportsCurrentSurvey(){throw Error('Não deveria consultar durante a geração');}};vm.createContext(busy);vm.runInContext(take('async function reportsLoadAndRender(','function reportPercent('),busy);await busy.reportsLoadAndRender(true);
 assert(app.includes('if(!out||RP_REPORT_LOADING||RP_REPORT_EXPORT_BUSY)return;'));
 let crossCalls=0;const pdf={CURRENT_PROFILE:{id:'staff'},reportsCurrentSurvey:()=>({id:'survey'}),reportsCrossingQuestionIds:v=>v.questionIds,reportsFetchTreatedCross:async()=>{crossCalls++;return {data:[{variable_1:'Categoria',cnt:10,valid_base:10}],error:null};},RP_REPORT_CROSS_ANALYSIS_CACHE:{},Map,JSON};vm.createContext(pdf);vm.runInContext(take('async function reportsEnsurePdfData(','function reportsPdfWriteCrossing('),pdf);
 const payload={surveyId:'survey',sections:{includeOverview:false,includeCross:true,openAnswerGrouping:grouping,crossings:[{id:'a',questionIds:['open'],include:true},{id:'b',questionIds:['open'],include:true},{id:'skip',questionIds:['closed'],include:false}]}};
 await pdf.reportsEnsurePdfData(payload);assert.equal(crossCalls,1);assert.strictEqual(pdf.RP_REPORT_CROSS_ANALYSIS_CACHE.a.rows,pdf.RP_REPORT_CROSS_ANALYSIS_CACHE.b.rows);await pdf.reportsEnsurePdfData(payload);assert.equal(crossCalls,2,'Uma nova geração deve recarregar os cruzamentos, sem cache antigo');
 const activity=[],feedback=[],failure={
   CURRENT_PROFILE:{id:'staff'},reportsRequireDraft:async()=>{},
   reportsDocPayload:()=>({surveyId:'survey',clientId:'client',sections:{openAnswerGrouping:grouping}}),
   reportsSaveDraft:async()=>{activity.push('save');return 'draft';},reportsDocFeedback:text=>feedback.push(text),
   document:{createElement:()=>({click:()=>activity.push('download')})},
   URL:{createObjectURL:()=>{activity.push('url');return 'blob:test';}},
   sb:{rpc:async()=>{activity.push('publish');return {};},storage:{from:()=>({upload:async()=>{activity.push('upload');return {};}})}}
 };
 vm.createContext(failure);vm.runInContext(take('async function reportsCreatePdfBlob(','function reportsCrossCsvLines('),failure);
 failure.reportsCreatePdfBlob=async()=>{throw ctx.reportsGroupingActivationError({code:'57014',message:'statement timeout'});};
 await failure.reportsGeneratePdf();await failure.reportsFinalizeAndPublish();assert.deepEqual(activity,['save','save']);
 assert(feedback.some(text=>text.includes('Nenhum PDF ou resultado parcial')));assert.equal(vm.runInContext('RP_REPORT_EXPORT_BUSY',failure),false,'A falha precisa liberar os controles de exportação');
 console.log('reports-grouped-performance-smoke-test: PASS — consultas únicas em andamento, sem cache antigo, snapshots e sessões isolados, ordem preservada, falha segura e atualização automática pausada durante PDF.');
})().catch(error=>{console.error(error);process.exitCode=1;});
