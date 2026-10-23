/* Resumo exclusivo do painel: nunca preenche SURVEYS/PAYMENTS com dados parciais.
   Questionários, opções importadas e regras de coleta continuam no store completo. */
(function(){
  'use strict';
  const TIMEOUT_MS=15000;
  const PAGE_SIZE=500;
  const CACHE_MS=30000;
  const SURVEY_FIELDS='id,name,tipo,status,form_started,archived_at,price,price_remote,populacao,margem_erro,nivel_confianca,proporcao,survey_team(researcher_id)';
  const PAYMENT_FIELDS='id,survey_id,researcher_id,valid_count,rejected_count,status';
  let session=null;
  let generation=0;
  let resources={};
  let auxiliary={};

  function emptyResource(){return {status:'idle',rows:[],error:'',loadedAt:0,controller:null,request:null};}
  function reset(){
    generation++;
    Object.values(resources).forEach(resource=>resource.controller?.abort());
    Object.values(auxiliary).forEach(item=>{clearTimeout(item.timer);item.controller?.abort();});
    session=null;
    resources={surveys:emptyResource(),payments:emptyResource()};
    auxiliary={};
  }
  function syncSession(){
    if(session!==CURRENT_PROFILE){reset();session=CURRENT_PROFILE;}
    return session?.role==='pesq';
  }
  function refreshView(owner,version){
    if(CURRENT_PROFILE!==owner||generation!==version)return;
    if(document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');
  }
  function surveySummary(row){
    return {id:row.id,name:row.name,tipo:row.tipo||'',status:row.status||'rascunho',
      archivedAt:row.archived_at||null,formStarted:!!row.form_started,
      price:Number(row.price)||0,priceRemote:Number(row.price_remote)||0,
      pop:row.populacao||0,err:row.margem_erro!=null?String(row.margem_erro):'0.03',
      conf:row.nivel_confianca!=null?String(row.nivel_confianca):'1.96',
      prop:row.proporcao!=null?row.proporcao:50,
      teamIds:(row.survey_team||[]).map(member=>member.researcher_id)};
  }
  function paymentSummary(row){
    return {id:row.id,surveyId:row.survey_id,researcherId:row.researcher_id,
      valid:Number(row.valid_count)||0,rejected:Number(row.rejected_count)||0,
      status:row.status||'pendente'};
  }
  async function readPages(name,owner,signal){
    const rows=[];
    for(let offset=0;;offset+=PAGE_SIZE){
      if(signal.aborted)throw new Error('A consulta foi cancelada.');
      let query=sb.from(name==='surveys'?'surveys':'payments')
        .select(name==='surveys'?SURVEY_FIELDS:PAYMENT_FIELDS);
      if(name==='payments')query=query.eq('researcher_id',owner.id);
      const {data,error}=await query.order('id',{ascending:true})
        .range(offset,offset+PAGE_SIZE-1).abortSignal(signal);
      if(error)throw new Error(error.message||'Não foi possível consultar os dados.');
      const page=data||[];
      rows.push(...page);
      if(page.length<PAGE_SIZE)break;
    }
    return rows.map(name==='surveys'?surveySummary:paymentSummary);
  }
  function load(name){
    if(!syncSession())return Promise.resolve();
    const resource=resources[name];
    if(!resource||resource.status==='loading'||resource.status==='error')return resource?.request||Promise.resolve();
    if(resource.status==='ready'&&Date.now()-resource.loadedAt<CACHE_MS)return Promise.resolve();
    const owner=session,version=generation;
    const controller=new AbortController();
    resource.status='loading';resource.error='';resource.controller=controller;
    let timer;
    const deadline=new Promise((resolve,reject)=>{
      timer=setTimeout(()=>{
        reject(new Error('A consulta demorou mais que o limite de 15 segundos. Verifique sua conexão e tente novamente.'));
        controller.abort();
      },TIMEOUT_MS);
    });
    resource.request=(async()=>{
      try{
        const rows=await Promise.race([readPages(name,owner,controller.signal),deadline]);
        if(CURRENT_PROFILE!==owner||generation!==version||resources[name]!==resource)return;
        resource.rows=rows;resource.status='ready';resource.loadedAt=Date.now();
      }catch(error){
        if(CURRENT_PROFILE!==owner||generation!==version||resources[name]!==resource)return;
        resource.error=error?.message||'Não foi possível carregar os dados agora.';
        resource.status='error';
        console.warn('Resumo do painel indisponível ('+name+'):',error);
      }finally{
        clearTimeout(timer);
        resource.controller=null;resource.request=null;
        refreshView(owner,version);
      }
    })();
    return resource.request;
  }
  function ensure(){load('surveys');load('payments');}
  function invalidate(name){
    if(!syncSession())return;
    const names=name?[name]:['surveys','payments'];
    names.forEach(key=>{
      const previous=resources[key];
      if(!previous)return;
      previous.controller?.abort();
      resources[key]=emptyResource();
    });
  }
  function retry(name){
    if(!syncSession()||!resources[name]||resources[name].status==='loading')return;
    invalidate(name);load(name);
    refreshView(session,generation);
  }
  /* Um carregador auxiliar falho não é reexecutado a cada atualização de outra
     seção. A nova tentativa é explícita, sem bloquear ganhos e pesquisas. */
  function loadAuxiliary(name,loader,isReady){
    if(!syncSession()||isReady())return;
    if(auxiliary[name]?.status==='ready')delete auxiliary[name];
    if(auxiliary[name])return;
    const owner=session,version=generation;
    const controller=new AbortController();
    const item={status:'loading',timer:null,controller};auxiliary[name]=item;
    const deadline=new Promise((resolve,reject)=>{
      item.timer=setTimeout(()=>{
        reject(new Error('A consulta auxiliar excedeu 15 segundos.'));
        controller.abort();
        if(typeof cancelSessionDataRequest==='function')cancelSessionDataRequest(name);
      },TIMEOUT_MS);
    });
    Promise.race([Promise.resolve().then(()=>loader({signal:controller.signal,render:false})),deadline]).then(()=>{
      if(CURRENT_PROFILE!==owner||generation!==version||auxiliary[name]!==item)return;
      item.status=isReady()?'ready':'error';
    }).catch(error=>{
      if(CURRENT_PROFILE!==owner||generation!==version||auxiliary[name]!==item)return;
      item.status='error';console.warn('Seção auxiliar indisponível ('+name+'):',error);
    }).finally(()=>{
      clearTimeout(item.timer);
      if(auxiliary[name]===item)refreshView(owner,version);
    });
  }
  function retryAuxiliary(){
    if(!syncSession())return;
    Object.keys(auxiliary).forEach(name=>{
      if(auxiliary[name].status==='error')delete auxiliary[name];
    });
    refreshView(session,generation);
  }
  function auxiliaryNotice(){
    const items=Object.values(auxiliary);
    if(!items.some(item=>item.status==='error'||item.status==='waiting'))return '';
    const retryable=items.some(item=>item.status==='error');
    return '<div class="callout warn" role="status">Alguns avisos, convites ou dados de contrato ainda não puderam ser carregados. Isso não impede consultar o resumo; as verificações obrigatórias continuam sendo feitas antes da coleta.'+
      (retryable?' <button type="button" class="btn btn-out" onclick="window.PP_RESEARCHER_DASHBOARD.retryAuxiliary()">Tentar novamente</button>':' Aguarde a resposta ou abra a seção pelo menu.')+'</div>';
  }
  function statusMarkup(name,title){
    const resource=resources[name];
    if(resource?.status==='error')return '<section class="card mb" role="status"><div class="card-t">'+esc(title)+'</div><div class="callout warn">'+esc(resource.error)+' <button type="button" class="btn btn-out" onclick="window.PP_RESEARCHER_DASHBOARD.retry(\''+name+'\')">Tentar novamente</button></div></section>';
    return '<section class="card mb" aria-busy="true"><div class="card-t">'+esc(title)+'</div><div class="empty" style="padding:16px 0">Carregando '+(name==='surveys'?'pesquisas disponíveis':'seu resumo de ganhos')+'…</div></section>';
  }
  function onNavigate(key,previousKey){
    if(key!=='dashboard-pesq'||previousKey===key||!syncSession())return;
    // Retornar ao painel revalida resumos antigos, sem reiniciar consultas pendentes.
    Object.values(resources).forEach(resource=>{
      if(resource.status==='ready'&&Date.now()-resource.loadedAt>=CACHE_MS)resource.loadedAt=0;
    });
  }
  reset();
  window.PP_RESEARCHER_DASHBOARD={ensure,reset,invalidate,retry,onNavigate,
    loadAuxiliary,retryAuxiliary,auxiliaryNotice,statusMarkup,
    ready:name=>resources[name]?.status==='ready',
    surveys:()=>resources.surveys.rows,payments:()=>resources.payments.rows};
})();
