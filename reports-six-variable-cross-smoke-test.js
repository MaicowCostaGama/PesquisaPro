const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const take=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
const qs=Array.from({length:7},(_,i)=>({dbId:'q'+(i+1),text:'Pergunta '+(i+1),type:'single',opts:i===0?['A','B']:[]}));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ctx={esc,jsArg:v=>esc(JSON.stringify(v)),reportsCurrentQuestions:()=>qs,reportsCurrentSurvey:()=>({id:'survey',questions:qs}),reportsCrossQuestionsForSurvey:s=>s.questions,document:{querySelectorAll:()=>[]},RP_REPORT_CROSSINGS:[],RP_ACTIVE_CROSSING_ID:null,RP_CROSS_QUESTION_IDS:[],RP_REPORT_DRAFT_HYDRATED:false,reportsLoadAndRender(){},AbortController,setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(take('async function reportsReadAllPages(','function reportsAvailableSurveys(')+take('function reportsCrossingQuestionIds(','function reportsClientsForSurvey(')+take('function reportsUpdateCrossControls(','function reportsSetLiveStatus(')+take('function reportsCrossOptionLabels(','function reportsDocValue(')+take('function clientReportQuestionLabel(','function clientPublishedCrossings(')+take('function reportsCrossCsvLines(','function reportsExportCurrent('),ctx);
const ids=qs.slice(0,6).map(q=>q.dbId);
const rows=[
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',variable_4:'F',variable_5:'Jovem',variable_6:'Baixa',cnt:20,valid_base:100},
 {variable_1:'B',variable_2:'Não',variable_3:'Norte',variable_4:'F',variable_5:'Jovem',variable_6:'Baixa',cnt:10,valid_base:100},
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',variable_4:'F',variable_5:'Jovem',variable_6:'Alta',cnt:15,valid_base:100},
 {variable_1:'A',variable_2:'Sim',variable_3:'Norte',variable_4:'F',variable_5:'Idoso',variable_6:'Baixa',cnt:25,valid_base:100},
 {variable_1:'B',variable_2:'Sim',variable_3:'Norte',variable_4:'M',variable_5:'Jovem',variable_6:'Baixa',cnt:20,valid_base:100},
 {variable_1:'B',variable_2:null,variable_3:'Sul',variable_4:null,variable_5:'Idoso',variable_6:'Alta',cnt:10,valid_base:100},
];
const before=JSON.stringify(rows),parts=ctx.reportsCrossPartitions(rows,ids);
assert.equal(parts.length,5,'As variáveis 3, 4, 5 e 6 devem distinguir recortes');
assert.equal(parts.flatMap(p=>p.rows).length,rows.length);
assert.equal(parts.reduce((sum,p)=>sum+p.rows.reduce((n,r)=>n+r.cnt,0),0),100);
for(const part of parts){
 const model=ctx.reportsCrossMatrixModel(part.rows,ids,part.values);
 const client=ctx.clientReportCrossMatrixModel(part.rows,ids,part.values,qs);
 assert.equal(model.base,100,'Base do recorte não pode substituir a base total');
 assert.equal(model.counts.size,client.counts.size);
 assert.equal(JSON.stringify([...model.rowTotals]),JSON.stringify([...client.rowTotals]));
 assert(model.title.includes('Pergunta 6:'));
 assert.equal([...model.rowTotals.values()].reduce((a,b)=>a+b,0),part.rows.reduce((a,b)=>a+b.cnt,0));
}
assert.equal(ctx.reportsCrossMatrixModel(rows,ids,['Norte','F','Jovem','Baixa']).counts.get('A\u0000Sim'),20);
assert.equal(ctx.reportsCrossMatrixModel(rows,ids,['Norte','F','Jovem','Alta']).counts.get('A\u0000Sim'),15);
assert.equal(ctx.reportsCrossPct(20,100),'20,0%');
assert.equal(ctx.reportsCrossPartitions(rows,ids.slice(0,2)).length,1);
assert.equal(ctx.reportsCrossPartitions(rows,ids.slice(0,3)).length,2);
assert.equal(ctx.reportsCrossMatrixModel(rows,ids.slice(0,3),'Norte').title,'Pergunta 3: Norte');
assert.equal(ctx.reportsCrossPartitions([],ids).length,0);
assert.equal(ctx.reportsCrossOrderedValues(rows,5,'q6').length,2);
const hostile=rows.map(r=>({...r,variable_5:'<img src=x onerror=alert(1)>'}));
const out={innerHTML:''};ctx.renderReportsCross(out,hostile,ids,qs);
assert(!out.innerHTML.includes('<img src=x'));
assert(out.innerHTML.includes('&lt;img'));
assert(out.innerHTML.includes('6 variáveis')&&out.innerHTML.includes('Exportar CSV completo'));
assert(out.innerHTML.includes('reports-cross-slice'));
const csv=ctx.reportsCrossCsvLines(rows,ids);
assert.equal(csv.length,rows.length+1);
assert.equal(csv[0].split(';').length,9);
assert(csv[0].includes('Variável 6: Pergunta 6')&&csv.some(line=>line.includes('"Alta"')));
assert(csv.some(line=>line.includes('"20";"100";"20,0%"')));
assert.equal(JSON.stringify(rows),before,'Nenhuma resposta original pode ser alterada');
const crossing=ctx.reportsMakeCrossing(ids),legacy=ctx.reportsNormalizeCrossings({crossQuestionIds:ids.slice(0,3),crossTitle:'Antigo'});
assert.equal(crossing.questionIds.length,6);
assert.equal(ctx.reportsCrossingQuestionIds({questionIds:[...ids,'q7']}).length,6);
assert.equal(ctx.reportsCrossingQuestionIds({questionIds:['q1','q1','q2']}).join(','),'q1,q2');
assert.equal(legacy[0].questionIds.length,3);
const restored=ctx.reportsNormalizeCrossings({crossings:[crossing]});assert.equal(restored[0].questionIds.length,6);
ctx.RP_REPORT_CROSSINGS=[crossing];ctx.RP_ACTIVE_CROSSING_ID=crossing.id;
const markup=ctx.reportsCrossingCardMarkup(crossing,0,qs);
assert.equal((markup.match(/data-crossing-index=/g)||[]).length,6);
assert(markup.includes('Recorte combinado da matriz'));
ctx.reportsPickCrossQuestion(crossing.id,6,'q7');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,6);
ctx.reportsPickCrossQuestion(crossing.id,4,'q1');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds[4],'q5','Repetição não pode substituir a seleção');
ctx.reportsPickCrossQuestion(crossing.id,5,'');assert.equal(ctx.RP_REPORT_CROSSINGS[0].questionIds.length,5);
ctx.reportsPickCrossQuestion(crossing.id,5,'q6');assert.equal(ctx.reportsCrossingPayloads()[0].questionIds.length,6);
function mock(reply){const calls=[];ctx.sb={rpc(name,args,config){const c={name,args,config,orders:[],from:0,to:0};calls.push(c);return {order(v){c.orders.push(v);return this;},range(from,to){c.from=from;c.to=to;return this;},abortSignal(){return this;},then(resolve,reject){return Promise.resolve(reply(c,calls)).then(resolve,reject);}};}};return calls;}
(async()=>{
 let calls=mock(c=>({data:rows.slice(c.from,c.to+1),error:null,count:rows.length}));
 const result=await ctx.reportsFetchCross('survey',ids);
 assert.equal(result.data.length,6);assert.equal(calls[0].name,'survey_report_cross_tab_v2');
 assert.equal(calls[0].orders.join(','),'variable_1,variable_2,variable_3,variable_4,variable_5,variable_6');
 assert.equal(calls[0].args.p_question_ids.length,6);assert.equal(calls[0].config.count,'exact');
 calls=mock(c=>({data:rows,error:null,count:6}));await ctx.reportsFetchCross('survey',ids,'client');assert.equal(calls[0].name,'client_report_cross_tab_v2');
 calls=mock(c=>c.name.endsWith('_v2')?{error:{code:'PGRST202',message:'Could not find the function'},data:null}:{data:rows,error:null,count:6});
 await ctx.reportsFetchCross('survey',ids.slice(0,3));assert.equal(calls[1].name,'survey_report_cross_tab');
 calls=mock(()=>({error:{code:'PGRST202',message:'Could not find the function'},data:null}));
 await assert.rejects(ctx.reportsFetchCross('survey',ids),/relatorios-cruzamentos-seis-variaveis-v160.sql/);assert.equal(calls.length,1,'Nunca truncar seis variáveis para usar RPC antiga');
 calls=mock(()=>({error:{code:'42501',message:'not authorized'},data:null}));await assert.rejects(ctx.reportsFetchCross('survey',ids),e=>e.code==='42501');assert.equal(calls.length,1);
 calls=mock(()=>({data:[{variable_1:'A',variable_2:'Sim',variable_3:'Norte',cnt:1,valid_base:1}],error:null,count:1}));await assert.rejects(ctx.reportsFetchCross('survey',ids),/todas as variáveis/);
 const many=Array.from({length:1201},(_,i)=>({...rows[0],variable_6:'Valor '+i,cnt:1,valid_base:1201}));
 calls=mock(c=>({data:many.slice(c.from,c.to+1),error:null,count:many.length}));assert.equal((await ctx.reportsFetchCross('survey',ids)).data.length,1201);assert.equal(calls.length,3);
 calls=mock(c=>c.from?{data:null,error:{message:'falha de página'}}:{data:many.slice(0,500),error:null,count:1201});await assert.rejects(ctx.reportsFetchCross('survey',ids),e=>e.message==='falha de página');
 console.log('reports-six-variable-cross-smoke-test: PASS — seis dimensões, bases, recortes, CSV, seleção, persistência, compatibilidade e paginação.');
})().catch(error=>{console.error(error);process.exit(1);});
