/* Desistências são ocorrências neutras em tabela própria, nunca entrevistas. */
(function(global){
  'use strict';
  const REASONS=Object.freeze({declined_continue:'Preferiu não continuar',no_time:'Não tinha mais tempo',uncomfortable:'Não se sentiu à vontade',other:'Outro motivo / não informado'});
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const TIMEOUT_MS=15000;
  let pending=null,reason='declined_continue',generation=0;
  const historyRequests=new Set();
  const historyOwners=new WeakMap();
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profile=()=>typeof CURRENT_PROFILE==='undefined'?null:CURRENT_PROFILE;
  const epoch=()=>typeof APP_DATA_SESSION_EPOCH==='undefined'?0:APP_DATA_SESSION_EPOCH;
  function allowed(){const p=profile();return p?.role==='pesq'&&p.status==='ativo';}
  function same(operation){return pending===operation&&operation.owner===profile()&&operation.epoch===epoch()&&operation.generation===generation&&ACOLLECT_IN_PROGRESS&&ACOLLECT_SURVEY_ID===operation.surveyId&&ACOLLECT_STARTED_AT===operation.startedAt;}
  function active(){return pending!==null;}
  function busy(){return !!pending?.busy;}
  function reset(){generation++;pending?.controller?.abort();pending=null;reason='declined_continue';historyRequests.forEach(c=>c.abort());historyRequests.clear();}
  function reasonChanged(value){if(!active()&&Object.hasOwn(REASONS,value))reason=value;}
  function quickControl(){return allowed()?`<div class="withdrawal-quick"><button type="button" class="btn btn-out" ${ACOLLECT_SUBMITTING?'disabled':''} onclick="window.PP_COLLECTION_WITHDRAWALS.request()">Entrevistado desistiu</button><small>Registro neutro, sem impacto na sua avaliação.</small></div>`:'';}
  function controls(){
    if(!allowed())return '';
    return `<section class="withdrawal-controls"><label class="lbl" for="acollectWithdrawalReason">Se o entrevistado desistir</label><select class="inp" id="acollectWithdrawalReason" onchange="window.PP_COLLECTION_WITHDRAWALS.reasonChanged(this.value)">${Object.entries(REASONS).map(([key,label])=>`<option value="${key}" ${key===reason?'selected':''}>${label}</option>`).join('')}</select><button type="button" class="btn btn-out" ${ACOLLECT_SUBMITTING?'disabled':''} onclick="window.PP_COLLECTION_WITHDRAWALS.request()">Registrar desistência do entrevistado</button><small>Não conta como coleta, reprovação, pagamento ou nota. Não use para corrigir uma entrevista já enviada.</small></section>`;
  }
  function renderPending(){
    if(!pending)return '';
    return `<section class="withdrawal-pending" role="status" aria-live="polite"><strong>Entrevista encerrada por desistência do entrevistado</strong><p>Sem impacto na nota, ranking, metas ou pagamento. As respostas parciais foram descartadas; nenhum áudio será enviado.</p>${pending.busy?'<p>Registrando a ocorrência…</p>':`<p class="withdrawal-error">${escape(pending.error||'O registro ainda não foi confirmado pelo servidor.')} Mantenha esta tela aberta e tente novamente com internet.</p><button type="button" class="btn btn-out" onclick="window.PP_COLLECTION_WITHDRAWALS.save()">Tentar registrar novamente</button>`}</section>`;
  }
  function refresh(){renderAcollectForm();renderAcollectRecording();renderAcollectActionState();}
  async function request(){
    if(!allowed()||active()||!ACOLLECT_IN_PROGRESS||ACOLLECT_SUBMITTING||!UUID.test(String(ACOLLECT_SURVEY_ID||''))||!Number.isFinite(ACOLLECT_STARTED_AT))return;
    const selected=document.getElementById('acollectWithdrawalReason')?.value||reason;
    if(!Object.hasOwn(REASONS,selected)){alert('Selecione um motivo válido para a desistência.');return;}
    if(!confirm('O entrevistado desistiu de continuar?\n\nA entrevista será encerrada, e as respostas parciais e o áudio local serão descartados. Será registrado apenas o motivo da desistência, sem contar como coleta, reprovação, pagamento ou avaliação do pesquisador.'))return;
    const requestId=global.crypto?.randomUUID?.();
    if(!UUID.test(String(requestId||''))){alert('Não foi possível gerar um identificador seguro. Atualize o navegador antes de registrar a desistência.');return;}
    pending={owner:profile(),epoch:epoch(),generation,surveyId:ACOLLECT_SURVEY_ID,startedAt:ACOLLECT_STARTED_AT,busy:false,error:'',controller:null,payload:Object.freeze({p_survey_id:ACOLLECT_SURVEY_ID,p_client_request_id:requestId,p_started_at:new Date(ACOLLECT_STARTED_AT).toISOString(),p_quota_label:ACOLLECT_SELECTED_QUOTA||null,p_reason_code:selected})};
    ACOLLECT_ANSWERS={};
    acollectResetRecordingState();
    refresh();
    await save();
  }
  async function save(){
    const operation=pending;
    if(!operation||operation.busy||!same(operation))return;
    operation.busy=true;operation.error='';
    const controller=new AbortController();operation.controller=controller;
    let timer;
    try{
      refresh();
      const query=sb.rpc('register_collection_withdrawal',operation.payload).abortSignal(controller.signal);
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Tempo esgotado ao registrar a desistência.'));},TIMEOUT_MS);});
      const result=await Promise.race([Promise.resolve(query),timeout]);
      if(!same(operation))return;
      if(result?.error)throw result.error;
      if(!UUID.test(String(result?.data||'')))throw new Error('O servidor não confirmou o identificador da desistência.');
      pending=null;reason='declined_continue';
      // Somente agora libera uma nova entrevista; nenhum cache oficial é alterado.
      acollectCancel();
      renderAcollectRecording();
      const msg=document.getElementById('acollectMsg');
      if(msg)msg.innerHTML='<div class="withdrawal-pending" role="status"><strong>Desistência registrada.</strong><p>Sem impacto na avaliação do pesquisador. Não conta para metas, cotas, pagamento, ranking ou resultados.</p></div>';
      alert('Desistência do entrevistado registrada. Não é reprovação e não altera sua nota, ranking ou pagamento. Você já pode iniciar outra entrevista.');
    }catch(error){
      if(!same(operation))return;
      const missing=['PGRST202','42883','42P01'].includes(error?.code)||/schema cache|does not exist/i.test(String(error?.message||''));
      operation.error=missing?'Recurso não ativado no banco. A gestão deve executar manualmente deploy/desistencia-entrevistado-20261029.sql.':'Não foi possível confirmar o registro da desistência. Confira a conexão e tente novamente.';
    }finally{
      clearTimeout(timer);
      if(same(operation)){operation.busy=false;operation.controller=null;refresh();}
    }
  }
  function canLeave(key){if(active()&&key!=='app-collect'){alert('A desistência ainda não foi confirmada. Use “Tentar registrar novamente” antes de sair desta tela.');return false;}return true;}
  function historyMarkup(scope,surveyId=null){
    const p=profile();
    if(scope==='own'&&!allowed())return '';
    if(scope==='staff'&&(!p||p.status!=='ativo'||!['admin','admpro','coord','gerente'].includes(p.role)||!UUID.test(String(surveyId||''))))return '';
    if(!['own','staff'].includes(scope))return '';
    const id=scope==='staff'?`'${surveyId}'`:'null';
    return `<details class="card mb withdrawal-history"><summary>Desistências do entrevistado — registros neutros</summary><p>Histórico separado. Não são entrevistas reprovadas e não participam da avaliação, dos mapas, das metas, dos pagamentos ou dos resultados.</p><div class="withdrawal-history-list"></div><button type="button" class="btn btn-out" onclick="window.PP_COLLECTION_WITHDRAWALS.loadHistory(this,'${scope}',${id})">Consultar registros</button></details>`;
  }
  async function loadHistory(button,scope,surveyId=null,page=0){
    const owner=profile(),session=epoch(),gen=generation;
    const host=button?.closest?.('.withdrawal-history'),list=host?.querySelector?.('.withdrawal-history-list');
    if(!host||!list||button.disabled||!Number.isInteger(page)||page<0||page>10000)return;
    if(scope==='own'&&!allowed())return;
    if(scope==='staff'&&(!owner||owner.status!=='ativo'||!['admin','admpro','coord','gerente'].includes(owner.role)||!UUID.test(String(surveyId||''))))return;
    if(!['own','staff'].includes(scope))return;
    const controller=new AbortController();
    historyOwners.get(host)?.abort();historyOwners.set(host,controller);
    const valid=()=>profile()===owner&&epoch()===session&&generation===gen&&host.isConnected!==false&&historyOwners.get(host)===controller;
    historyRequests.add(controller);button.disabled=true;
    const limit=scope==='own'?6:20,offset=page*limit;
    let timer;
    try{
      list.innerHTML='<p role="status">Consultando desistências…</p>';
      let query=sb.from('collection_withdrawals').select('id,survey_id,researcher_id,registered_at,started_at,quota_label,reason_code,is_test');
      query=scope==='own'?query.eq('researcher_id',owner.id):query.eq('survey_id',surveyId);
      query=query.order('registered_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+limit).abortSignal(controller.signal);
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Tempo esgotado'));},TIMEOUT_MS);});
      const {data,error}=await Promise.race([Promise.resolve(query),timeout]);
      if(!valid())return;
      if(error)throw error;
      if(!Array.isArray(data))throw new Error('Resposta inválida');
      const more=data.length>limit,rows=data.slice(0,limit);
      const researcherLabel=id=>{if(scope==='own')return 'Sua entrevista interrompida';const users=typeof USERS==='undefined'?[]:USERS;return users.find(u=>u.id===id)?.name||'Pesquisador '+String(id||'não identificado');};
      list.innerHTML=rows.length?rows.map(row=>`<article class="withdrawal-history-item"><strong>${escape(researcherLabel(row.researcher_id))}</strong><time>${escape(new Date(row.registered_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</time><span>${escape(REASONS[row.reason_code]||'Motivo não informado')}${row.quota_label?' · '+escape(row.quota_label):''}</span><small>${row.is_test?'Teste autorizado · ':''}Desistência do entrevistado — sem impacto na avaliação</small></article>`).join(''):'<p>Nenhuma desistência nesta página.</p>';
      const arg=scope==='staff'?`'${surveyId}'`:'null';
      if(page>0||more)list.innerHTML+=`<div class="withdrawal-history-pages">${page>0?`<button type="button" class="btn btn-out" onclick="window.PP_COLLECTION_WITHDRAWALS.loadHistory(this,'${scope}',${arg},${page-1})">Anteriores</button>`:''}${more?`<button type="button" class="btn btn-out" onclick="window.PP_COLLECTION_WITHDRAWALS.loadHistory(this,'${scope}',${arg},${page+1})">Próximos</button>`:''}</div>`;
    }catch(error){if(valid())list.innerHTML='<p class="withdrawal-error" role="alert">Não foi possível consultar as desistências. Tente novamente. Se o recurso não estiver ativado, a gestão deve executar desistencia-entrevistado-20261029.sql.</p>';}
    finally{clearTimeout(timer);historyRequests.delete(controller);if(profile()===owner&&generation===gen&&button.isConnected!==false)button.disabled=false;}
  }
  global.addEventListener?.('beforeunload',event=>{if(active()){event.preventDefault();event.returnValue='';}});
  global.PP_COLLECTION_WITHDRAWALS=Object.freeze({active,busy,reset,reasonChanged,quickControl,controls,renderPending,request,save,canLeave,historyMarkup,loadHistory});
})(window);
