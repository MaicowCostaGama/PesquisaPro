const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert/strict');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const helper=app.slice(app.indexOf('async function reportsReadAllPages('),app.indexOf('function reportsAvailableSurveys('));
const render=app.slice(app.indexOf('function reportPercent('),app.indexOf('function reportsCrossOptionLabels('));
function fixture(){
  const qs=Array.from({length:22},(_,i)=>({dbId:'q'+String(i).padStart(2,'0'),position:i,text:'Pergunta '+(i+1),type:i===11?'open':'single'}));
  const rows=qs.flatMap((q,i)=>Array.from({length:i===11?1100:1},(_,n)=>({question_id:q.dbId,question_position:i,question_text:q.text,value_label:'Categoria '+String(n).padStart(4,'0'),cnt:i===11?1:675,valid_base:677})));
  return {qs,rows};
}
function environment(rows,options={}){
  const calls=[];
  const sb={rpc(name,args,config){
    const call={name,args,config,order:[],from:null,to:null};calls.push(call);
    return {order(column,direction){call.order.push([column,direction]);return this;},range(from,to){call.from=from;call.to=to;return this;},abortSignal(signal){call.signal=signal;return this;},then(resolve,reject){
      try{
        const answer=options.reply?options.reply(call,calls):null;
        if(answer)return Promise.resolve(answer).then(resolve,reject);
        let data=rows.slice(call.from,Math.min(call.to+1,call.from+(options.serverCap||500)));
        if(options.transform)data=options.transform(data,call,calls);
        return Promise.resolve({data,error:null,count:options.noCount?null:rows.length}).then(resolve,reject);
      }catch(error){return Promise.reject(error).then(resolve,reject);}
    }};
  }};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const context={sb,AbortController,setTimeout,clearTimeout,esc,COLLECT_EVENTS_LOADED:true,COLLECT_EVENTS:Array.from({length:677},()=>({surveyId:'survey-A',status:'valid',calibration:false})),reportsCurrentSurvey:()=>({id:'survey-A'}),Q_TYPES:{single:'Escolha única'}};
  vm.createContext(context);vm.runInContext(helper+'\n'+render,context);
  return {context,calls};
}
(async()=>{
  const {qs,rows}=fixture();
  const {context,calls}=environment(rows);
  const original={innerHTML:''};context.renderReportsOverview(original,rows.slice(0,1000),qs);
  assert(original.innerHTML.includes('Nenhuma resposta foi registrada'), 'a carga antiga deve reproduzir o vazio a partir da pergunta 13');
  const complete=await context.reportsFetchOverview('survey-A');
  assert.equal(complete.data.length,rows.length);
  assert.equal(new Set(complete.data.map(r=>r.question_id)).size,22);
  assert.deepEqual(calls.map(c=>c.from),[0,500,1000]);
  assert(calls.every(c=>c.config.count==='exact'&&c.args.p_survey_id==='survey-A'));
  assert(calls.every(c=>c.order.map(x=>x[0]).join(',')==='question_id,cnt,value_label'&&c.order[1][1].ascending===false));
  const output={innerHTML:''};context.renderReportsOverview(output,complete.data,qs);
  assert(!output.innerHTML.includes('Nenhuma resposta foi registrada'), 'a paginação deve restaurar categorias nas perguntas 13 a 22');
  assert(output.innerHTML.includes('Pergunta 22'));

  // Um limite do servidor menor que a página solicitada não pode encerrar a carga cedo.
  const capped=environment(rows,{serverCap:100});
  assert.equal((await capped.context.reportsFetchOverview('survey-A')).data.length,rows.length);
  assert.equal(capped.calls[1].from,100);
  const unknown=environment(rows,{serverCap:100,noCount:true});
  assert.equal((await unknown.context.reportsFetchOverview('survey-A')).data.length,rows.length);

  // Quantidade exata de páginas: não precisa consultar uma página fora do resultado.
  const exact=environment(rows.slice(0,1000));
  assert.equal((await exact.context.reportsFetchOverview('survey-A')).data.length,1000);
  assert.equal(exact.calls.length,2);
  const empty=environment([]);
  assert.equal((await empty.context.reportsFetchOverview('survey-A')).data.length,0);

  // Se a segunda página falhar, nunca retornar o primeiro lote como relatório completo.
  const failed=environment(rows,{reply:c=>c.from>=500?{data:null,error:{code:'XX000',message:'Falha simulada'},count:null}:null});
  await assert.rejects(failed.context.reportsFetchOverview('survey-A'),e=>e.message==='Falha simulada');
  const stopped=environment(rows,{reply:c=>c.from>=500?{data:[],error:null,count:rows.length}:null});
  await assert.rejects(stopped.context.reportsFetchOverview('survey-A'),/interrompeu/);

  // Retentar uma coleta que mudou entre páginas, sem somar snapshots diferentes.
  let snapshotChanged=false;
  const moving=environment(rows,{transform:(data,c)=>{if(c.from===500&&!snapshotChanged){snapshotChanged=true;return data.map(r=>({...r,valid_base:678}));}return data;}});
  assert.equal((await moving.context.reportsFetchOverview('survey-A')).data.length,rows.length);
  assert.deepEqual(moving.calls.map(c=>c.from),[0,500,0,500,1000]);
  const movingCount=environment(rows,{reply:(c,calls)=>calls.length===2?{data:rows.slice(500,1000),error:null,count:rows.length+1}:null});
  assert.equal((await movingCount.context.reportsFetchOverview('survey-A')).data.length,rows.length);
  const unstable=environment(rows,{transform:(data,c)=>data.map(r=>({...r,valid_base:c.from===0?677:678}))});
  await assert.rejects(unstable.context.reportsFetchOverview('survey-A'),/mudou durante/);

  // Compatibilidade apenas quando v2 estiver ausente; falhas de autorização não podem fazer fallback.
  const legacy=environment(rows,{reply:c=>c.name.endsWith('_v2')?{data:null,error:{code:'PGRST202',message:'Could not find the function'},count:null}:null});
  assert.equal((await legacy.context.reportsFetchOverview('survey-A')).data.length,rows.length);
  assert.equal(legacy.calls[1].name,'survey_report_all_questions');
  const denied=environment(rows,{reply:()=>({data:null,error:{code:'42501',message:'not authorized'},count:null})});
  await assert.rejects(denied.context.reportsFetchOverview('survey-A'),e=>e.code==='42501');
  assert.equal(denied.calls.length,1);
  const limit=environment(Array.from({length:100001},()=>rows[0]));
  await assert.rejects(limit.context.reportsFetchOverview('survey-A'),/limite seguro/);

  assert(app.includes("reportsReadAllPages(()=>reportsOverviewOrder(sb.rpc('client_report_all_questions'"),'cliente deve paginar sua própria RPC protegida');
  assert(app.includes("reportsReadAllPages(()=>reportsCrossOrder(sb.rpc('client_report_cross_tab'"));
  assert(app.includes("reportsReadAllPages(()=>reportsCrossOrder(sb.rpc('survey_report_cross_tab'"));
  const pdf=app.slice(app.indexOf('async function reportsEnsurePdfData('),app.indexOf('function reportsPdfWriteCrossing('));
  assert(pdf.includes('reportsFetchOverview(survey.id)')&&pdf.includes('reportsReadAllPages('),'PDF deve usar carregamento completo');
  console.log('reports-pagination-smoke-test: PASS — corte de 1.000 reproduzido, 22 perguntas restauradas, limites menores, erros, snapshot, fallback, cliente e PDF validados.');
})().catch(error=>{console.error(error);process.exit(1);});
