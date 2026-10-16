// Nome legado v160; v173 testa o novo teto três e o bloqueio de definições antigas com seis.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const take=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
const qs=Array.from({length:7},(_,i)=>({dbId:'q'+(i+1),text:'Pergunta '+(i+1),type:'single',opts:i===0?['A','B']:[]}));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ctx={esc,jsArg:v=>esc(JSON.stringify(v)),reportsCurrentQuestions:()=>qs,reportsCurrentSurvey:()=>({id:'survey',questions:qs}),reportsCrossQuestionsForSurvey:s=>s.questions,document:{querySelectorAll:()=>[],getElementById:()=>null},RP_REPORT_CROSSINGS:[],RP_ACTIVE_CROSSING_ID:null,RP_CROSS_QUESTION_IDS:[],RP_REPORT_DRAFT_HYDRATED:false,RP_REPORT_EXPORT_BUSY:false,RP_REPORT_CROSS_ANALYSIS_CACHE:{},RP_REPORT_ANALYSIS_CACHE:{},reportsLoadAndRender(){},reportsDocFeedback(){},reportsOpenCanEdit:()=>true,go(){},reportsRequireDraft:async()=>{},AbortController,setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(take('async function reportsReadAllPages(','function reportsAvailableSurveys(')+take('function reportsCrossingQuestionIds(','function reportsClientsForSurvey(')+take('function reportsUpdateCrossControls(','function reportsSetLiveStatus(')+take('function reportsCrossOptionLabels(','function reportsDocValue(')+take('function clientReportQuestionLabel(','function clientPublishedCrossings(')+take('function reportsCrossCsvLines(','function reportsExportCurrent(')+take('function reportsValidatePdfCrossings(','async function reportsEnsurePdfData('),ctx);
const ids=qs.slice(0,3).map(q=>q.dbId),six=qs.slice(0,6).map(q=>q.dbId);
const rows=[
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',cnt:20,valid_base:100},
 {variable_1:'B',variable_2:'Não',variable_3:'Norte',cnt:10,valid_base:100},
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',cnt:15,valid_base:100},
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',cnt:25,valid_base:100},
 {variable_1:'B',variable_2:'Sim',variable_3:'Norte',cnt:20,valid_base:100},
 {variable_1:'B',variable_2:null,variable_3:'Sul',cnt:10,valid_base:100},
];
const before=JSON.stringify(rows),parts=ctx.reportsCrossPartitions(rows,ids);
assert.equal(parts.length,2,'Só a terceira variável distingue recortes');
assert.equal(parts.flatMap(p=>p.rows).length,rows.length);
assert.equal(parts.reduce((sum,p)=>sum+p.rows.reduce((n,r)=>n+r.cnt,0),0),100);
for(const part of parts){const model=ctx.reportsCrossMatrixModel(part.rows,ids,part.values),client=ctx.clientReportCrossMatrixModel(part.rows,ids,part.values,qs);assert.equal(model.base,100);assert.equal(model.counts.size,client.counts.size);assert.equal(JSON.stringify([...model.rowTotals]),JSON.stringify([...client.rowTotals]));assert(model.title.includes('Pergunta 3:'));assert.equal([...model.rowTotals.values()].reduce((a,b)=>a+b,0),part.rows.reduce((a,b)=>a+b.cnt,0));}
assert.equal(ctx.reportsCrossMatrixModel(rows,ids,['Norte']).counts.get('A\u0000Sim'),60);
assert.equal(ctx.reportsCrossPct(20,100),'20,0%');assert.equal(ctx.reportsCrossPartitions(rows,ids.slice(0,2)).length,1);
assert.equal(ctx.reportsCrossMatrixModel(rows,ids,'Norte').title,'Pergunta 3: Norte');assert.equal(ctx.reportsCrossPartitions([],ids).length,0);
for(const n of [4,5,6,7])assert.throws(()=>ctx.reportsCrossPartitions(rows,qs.slice(0,n).map(q=>q.dbId)),/três/);
const hostile=rows.map(r=>({...r,variable_3:'<img src=x onerror=alert(1)>'})),out={innerHTML:''};ctx.renderReportsCross(out,hostile,ids,qs);assert(!out.innerHTML.includes('<img src=x'));assert(out.innerHTML.includes('&lt;img'));assert(out.innerHTML.includes('3 variáveis')&&out.innerHTML.includes('Exportar CSV completo'));
const csv=ctx.reportsCrossCsvLines(rows,ids);assert.equal(csv.length,rows.length+1);assert.equal(csv[0].split(';').length,6);assert(csv[0].includes('Variável 3: Pergunta 3'));assert(csv.some(line=>line.includes('"20";"100";"20,0%"')));assert.throws(()=>ctx.reportsCrossCsvLines(rows,six),/três/);assert.equal(JSON.stringify(rows),before);
const crossing=ctx.reportsMakeCrossing(ids),old=ctx.reportsNormalizeCrossings({crossQuestionIds:six,crossTitle:'Antigo'});assert.equal(crossing.questionIds.length,3);assert.equal(old[0].questionIds.length,6);assert.equal(ctx.reportsCrossingQuestionIds({questionIds:[...six,'q7']}).length,7,'Nunca truncar definição carregada');assert.equal(ctx.reportsCrossingQuestionIds({questionIds:['q1','q1','q2']}).join(','),'q1,q2');
ctx.RP_REPORT_CROSSINGS=[crossing];ctx.RP_ACTIVE_CROSSING_ID=crossing.id;const markup=ctx.reportsCrossingCardMarkup(crossing,0,qs);assert.equal((markup.match(/data-crossing-index=/g)||[]).length,3);assert(markup.includes('Recorte da matriz'));
ctx.RP_REPORT_CROSSINGS=old;ctx.RP_ACTIVE_CROSSING_ID=old[0].id;ctx.reportsEnsureCrossings(qs);assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,6);assert.equal(ctx.reportsCrossingPayloads()[0].questionIds.length,6);const oldMarkup=ctx.reportsCrossingCardMarkup(old[0],0,qs);assert(oldMarkup.includes('definição foi preservada'));assert(oldMarkup.includes('reportsReduceCrossing'));assert.equal((oldMarkup.match(/data-crossing-index=/g)||[]).length,3);assert.equal((oldMarkup.match(/this.value\)" disabled/g)||[]).length,3);
assert.throws(()=>ctx.reportsValidatePdfCrossings({sections:{includeCross:true,crossings:old}}),/excede três/);assert.doesNotThrow(()=>ctx.reportsValidatePdfCrossings({sections:{includeCross:false,crossings:old}}));assert.doesNotThrow(()=>ctx.reportsValidatePdfCrossings({sections:{includeCross:true,crossings:old.map(x=>({...x,include:false}))}}));
function mock(reply){const calls=[];ctx.sb={rpc(name,args,config){const c={name,args,config,orders:[],from:0,to:0};calls.push(c);return {order(v){c.orders.push(v);return this;},range(from,to){c.from=from;c.to=to;return this;},abortSignal(){return this;},then(resolve,reject){return Promise.resolve(reply(c,calls)).then(resolve,reject);}};}};return calls;}
(async()=>{
const oldCopy=JSON.stringify(old);await ctx.reportsPickCrossQuestion(old[0].id,1,'q7');assert.equal(JSON.stringify(ctx.RP_REPORT_CROSSINGS),oldCopy,'Nenhum ajuste silencioso do cruzamento antigo');
let calls=mock(()=>({data:rows,error:null,count:rows.length}));for(const n of [4,5,6,7])await assert.rejects(ctx.reportsFetchCross('survey',qs.slice(0,n).map(q=>q.dbId)),/três/);assert.equal(calls.length,0,'Rejeitar antes de RPC');
await ctx.reportsReduceCrossing(old[0].id);assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,3);assert.equal(calls.length,0,'Ajustar não salva automaticamente');assert.equal(old[0].questionIds.length,6,'Objeto original preservado');
ctx.RP_REPORT_CROSSINGS=[crossing];ctx.RP_ACTIVE_CROSSING_ID=crossing.id;await ctx.reportsPickCrossQuestion(crossing.id,3,'q4');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,3);await ctx.reportsPickCrossQuestion(crossing.id,2,'q1');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds[2],'q3');await ctx.reportsPickCrossQuestion(crossing.id,2,'');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,2);await ctx.reportsPickCrossQuestion(crossing.id,2,'q3');assert.equal(ctx.reportsCrossingPayloads()[0].questionIds.length,3);
calls=mock(c=>({data:rows.slice(c.from,c.to+1),error:null,count:rows.length}));const result=await ctx.reportsFetchCross('survey',ids);assert.equal(result.data.length,6);assert.equal(calls[0].name,'survey_report_cross_tab_v2');assert.equal(calls[0].orders.join(','),'variable_1,variable_2,variable_3');assert.equal(calls[0].args.p_question_ids.length,3);assert.equal(calls[0].config.count,'exact');
for(const n of [1,2,3]){calls=mock(()=>({data:rows,error:null,count:6}));await ctx.reportsFetchCross('survey',ids.slice(0,n),'client');assert.equal(calls[0].name,'client_report_cross_tab_v2');}
calls=mock(c=>c.name.endsWith('_v2')?{error:{code:'PGRST202',message:'Could not find the function'},data:null}:{data:rows,error:null,count:6});await ctx.reportsFetchCross('survey',ids);assert.equal(calls[1].name,'survey_report_cross_tab');
calls=mock(()=>({error:{code:'42501',message:'not authorized'},data:null}));await assert.rejects(ctx.reportsFetchCross('survey',ids),e=>e.code==='42501');assert.equal(calls.length,1);
calls=mock(()=>({data:[{variable_1:'A',cnt:1,valid_base:1}],error:null,count:1}));await assert.rejects(ctx.reportsFetchCross('survey',ids),/todas as variáveis/);
const many=Array.from({length:1201},(_,i)=>({...rows[0],variable_3:'Valor '+i,cnt:1,valid_base:1201}));calls=mock(c=>({data:many.slice(c.from,c.to+1),error:null,count:many.length}));assert.equal((await ctx.reportsFetchCross('survey',ids)).data.length,1201);assert.equal(calls.length,3);calls=mock(c=>c.from?{data:null,error:{message:'falha de página'}}:{data:many.slice(0,500),error:null,count:1201});await assert.rejects(ctx.reportsFetchCross('survey',ids),e=>e.message==='falha de página');
console.log('reports-six-variable-cross-smoke-test: PASS — teto três, seis antigas bloqueadas sem truncar, bases, recortes, CSV/PDF, seleção, persistência, compatibilidade e 1201 linhas paginadas.');
})().catch(error=>{console.error(error);process.exit(1);});
