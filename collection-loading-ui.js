/* Integração visual da carga por pesquisa, sem substituir os controles da entrevista. */
(function(){
  'use strict';
  let navigation=0,mountKey=null,mountPromise=null,preparing=null;
  const unavailable=new Set();
  function data(){return CURRENT_PROFILE?.role==='pesq'?window.PP_COLLECTION_DATA:null;}
  function active(){return document.querySelector('.nav-item.on')?.dataset.key==='app-collect';}
  function allowed(s){
    return !s.archivedAt&&(isCollectionTestUser()?['rascunho','campo'].includes(s.status)&&s.formStarted:s.status==='campo'&&(s.teamIds||[]).includes(CURRENT_PROFILE?.id));
  }
  function surveys(){return (data()?.surveys()||[]).filter(item=>allowed(item)&&!unavailable.has(item.id));}
  function state(name,id=ACOLLECT_SURVEY_ID){return data()?.state(name,id)||{status:'idle',error:''};}
  function ready(){
    return !!data()?.survey(ACOLLECT_SURVEY_ID)&&['survey','previous','quotas'].every(name=>state(name).status==='ready')&&CONTRACT_SETTINGS_LOADED&&MY_CONTRACT_LOADED&&!!MY_CONTRACT;
  }
  function retryButton(name){return '<button type="button" class="btn btn-out" onclick="window.PP_COLLECTION_LOADING.retry(\''+name+'\')">Tentar novamente</button>';}
  function stage(name,title,id=ACOLLECT_SURVEY_ID){
    const status=state(name,id);
    const label=status.status==='ready'?'Pronto':status.status==='error'?'Não foi possível carregar':status.status==='loading'?'Carregando…':'Aguardando…';
    return '<div class="collection-load-stage"><strong>'+esc(title)+'</strong><span>'+label+'</span>'+
      (status.status==='error'?'<small>'+esc(status.error||'Verifique sua conexão.')+'</small>'+retryButton(name):'')+'</div>';
  }
  function statusMarkup(){
    const hasId=!!ACOLLECT_SURVEY_ID;
    if(ready()&&state('index',null).status==='ready')return '<div class="collection-load-ready" role="status">Dados da pesquisa carregados · questionário, cotas e coleta anterior conferidos.</div>';
    return '<div class="collection-load-stages" role="status" aria-live="polite">'+stage('index','Pesquisas disponíveis',null)+
      (hasId?stage('survey','Questionário da pesquisa')+stage('quotas','Cotas atuais')+stage('previous','Verificação da coleta anterior'):'')+'</div>';
  }
  function picker(){
    const wrap=document.getElementById('acollectSurveyPicker'),label=document.getElementById('acollectSurveyLabel');
    if(!wrap)return;
    const list=surveys(),current=data()?.survey(ACOLLECT_SURVEY_ID)||list.find(item=>item.id===ACOLLECT_SURVEY_ID);
    if(label)label.textContent=current?.name||(ACOLLECT_SURVEY_ID?'Carregando pesquisa…':'—');
    if(state('index',null).status!=='ready'){
      const loading=state('index',null);
      wrap.innerHTML=loading.status==='error'?'<div class="callout warn">Não foi possível atualizar a lista de pesquisas. '+retryButton('index')+'</div>':'<div class="card-d">Carregando a lista de pesquisas…</div>';
      return;
    }
    if(!list.length){
      wrap.innerHTML='<div class="empty" style="padding:10px 0">Nenhuma pesquisa autorizada para coleta está disponível no momento.</div>';
      return;
    }
    wrap.innerHTML=list.length<2?'':'<div class="mb"><label class="lbl">Pesquisa</label><select class="inp" id="acollectSurveySel" '+
      (ACOLLECT_IN_PROGRESS||ACOLLECT_START_LOADING?'disabled':'')+' onchange="acollectPickSurvey(this.value)">'+
      list.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===ACOLLECT_SURVEY_ID?'selected':'')+'>'+esc(item.name)+'</option>').join('')+'</select></div>';
  }
  function quotaPlaceholder(){
    const box=document.getElementById('acollectQuotas');if(!box)return;
    if(!ACOLLECT_SURVEY_ID){box.innerHTML='';return;}
    const questionnaire=state('survey'),quotas=state('quotas');
    if(questionnaire.status!=='ready')box.innerHTML=questionnaire.status==='error'?'<div class="callout warn">Questionário indisponível. '+retryButton('survey')+'</div>':'<div class="empty" style="padding:10px 0">Carregando o questionário da pesquisa escolhida…</div>';
    else box.innerHTML=quotas.status==='error'?'<div class="callout warn">Não foi possível conferir as cotas. O início permanece bloqueado. '+retryButton('quotas')+'</div>':'<div class="empty" style="padding:10px 0">Atualizando as cotas desta pesquisa…</div>';
  }
  function refresh(name,id){
    if(!data()||!active())return;
    if(id&&id!==ACOLLECT_SURVEY_ID&&name!=='index'&&name!=='recent')return;
    picker();
    const status=document.getElementById('acollectLoadStatus');if(status)status.innerHTML=statusMarkup();
    if(!ACOLLECT_IN_PROGRESS&&!ACOLLECT_START_LOADING){
      if(state('survey').status==='ready'&&state('quotas').status==='ready'){
        ACOLLECT_QUOTA_COUNTS=data().quotas(ACOLLECT_SURVEY_ID)||{};
        renderAcollectQuotas();
      }else{
        if(state('survey').status!=='ready'){ACOLLECT_QUOTA_LIST=[];ACOLLECT_SELECTED_QUOTA=null;}
        quotaPlaceholder();
      }
    }
    renderGeoLog();renderAcollectActionState();
  }
  function reconcileSelection(){
    if(!data()||!active()||ACOLLECT_IN_PROGRESS||ACOLLECT_START_LOADING||state('index',null).status!=='ready')return;
    const list=surveys();
    if(list.some(item=>item.id===ACOLLECT_SURVEY_ID)){refresh();return;}
    ACOLLECT_SURVEY_ID=null;ACOLLECT_SELECTED_QUOTA=null;ACOLLECT_QUOTA_LIST=[];ACOLLECT_QUOTA_COUNTS={};
    if(list[0])return prepare(list[0].id);
    refresh();
  }
  function recoverAuthorization(id,owner,token){
    if(owner!==CURRENT_PROFILE||token!==navigation||id!==ACOLLECT_SURVEY_ID||!active()||ACOLLECT_IN_PROGRESS||ACOLLECT_START_LOADING)return;
    const loader=data();unavailable.add(id);
    ACOLLECT_SURVEY_ID=null;ACOLLECT_SELECTED_QUOTA=null;ACOLLECT_QUOTA_LIST=[];ACOLLECT_QUOTA_COUNTS={};
    loader.invalidate('index');
    return loader.ensureIndex().then(()=>{
      if(owner===CURRENT_PROFILE&&token===navigation)return reconcileSelection();
    }).catch(()=>{if(owner===CURRENT_PROFILE&&token===navigation)refresh();});
  }
  function prepare(id,{forceMetadata=false}={}){
    if(!data()||!id||ACOLLECT_IN_PROGRESS||ACOLLECT_START_LOADING)return Promise.resolve();
    if(preparing&&preparing.id===id&&preparing.owner===CURRENT_PROFILE)return preparing.promise;
    const owner=CURRENT_PROFILE,token=navigation;
    ACOLLECT_SURVEY_ID=id;ACOLLECT_SELECTED_QUOTA=null;ACOLLECT_QUOTA_LIST=[];ACOLLECT_QUOTA_COUNTS={};
    const loader=data();
    const work=Promise.allSettled([
      loader.loadSurvey(id,{force:forceMetadata}),
      loader.loadPrevious(id,{force:true}),
      loader.loadQuotas(id,{force:true})
    ]).then(results=>{
      if(owner!==CURRENT_PROFILE||token!==navigation||id!==ACOLLECT_SURVEY_ID)return;
      if(results[0].status==='rejected'&&results[0].reason?.name==='CollectionDataAuthorizationError')return recoverAuthorization(id,owner,token);
      refresh();
    }).finally(()=>{if(preparing?.promise===work)preparing=null;});
    preparing={id,owner,promise:work};refresh();return work;
  }
  function mount(){
    const loader=data();if(!loader)return Promise.resolve();
    loader.setOnChange(refresh);
    if(ACOLLECT_IN_PROGRESS){
      picker();renderAcollectForm();renderAcollectRecording();renderAcollectActionState();return Promise.resolve();
    }
    if(mountKey?.owner===CURRENT_PROFILE&&mountKey.token===navigation){refresh();return mountPromise||Promise.resolve();}
    const owner=CURRENT_PROFILE,token=navigation;
    mountKey={owner,token};
    const requested=ACOLLECT_SURVEY_ID;
    const preparation=requested?prepare(requested):Promise.resolve();
    const index=loader.ensureIndex().then(()=>{
      if(owner!==CURRENT_PROFILE||token!==navigation||!active())return;
      return reconcileSelection();
    }).catch(()=>{if(owner===CURRENT_PROFILE&&token===navigation)refresh();});
    // O histórico visual não bloqueia questionário, cotas ou verificação de distância.
    loader.loadRecent({force:true}).catch(()=>{});
    mountPromise=Promise.allSettled([index,preparation]);refresh();return mountPromise;
  }
  function retry(name){
    const loader=data();if(!loader||ACOLLECT_IN_PROGRESS||ACOLLECT_START_LOADING)return;
    if(name==='index'){
      unavailable.clear();loader.invalidate('index');mountKey=null;mount();return;
    }
    if(name==='recent'){loader.loadRecent({force:true}).catch(()=>{});return;}
    const id=ACOLLECT_SURVEY_ID;if(!id)return;
    const owner=CURRENT_PROFILE,token=navigation;
    loader.invalidate(name,id);
    const operation=name==='survey'?loader.loadSurvey(id,{force:true}):name==='previous'?loader.loadPrevious(id,{force:true}):loader.loadQuotas(id,{force:true});
    operation.catch(error=>{if(name==='survey'&&error?.name==='CollectionDataAuthorizationError')return recoverAuthorization(id,owner,token);});refresh();
  }
  function navigate(key,previousKey){
    if(key===previousKey)return;
    if(key==='app-collect'||previousKey==='app-collect'){
      navigation++;mountKey=null;mountPromise=null;preparing=null;unavailable.clear();
      if(previousKey==='app-collect'){
        data()?.setOnChange(null);
        if(!ACOLLECT_IN_PROGRESS)data()?.cancelPending();
      }
    }
  }
  function reset(){navigation++;mountKey=null;mountPromise=null;preparing=null;unavailable.clear();}
  window.PP_COLLECTION_LOADING={mount,prepare,refresh,picker,ready,retry,navigate,reset,statusMarkup};
})();
