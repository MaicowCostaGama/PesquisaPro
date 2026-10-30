/* Não resposta explícita: configuração independente; nunca altera listas de opções. */
(function(global){
  'use strict';
  const LABEL='Não respondeu';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const TYPES=new Set(['single','multi','ranking','pair','scale','scale10','nps','open','number','date']);
  const BLOCKED={survey_archived:'Pesquisa arquivada: configuração bloqueada.',survey_closed:'Pesquisa concluída: configuração bloqueada.',question_inactive:'Pergunta inativa: configuração bloqueada.',region_question:'Pergunta de região: a localização/cota deve ser informada.',ends_interview:'Pergunta de triagem: uma resposta pode encerrar a entrevista.',route_targets:'Pergunta com caminhos condicionais: resposta necessária para definir o percurso.',direct_target:'Pergunta com conexão de fluxo: não resposta bloqueada.',quota_active:'Pergunta com cotas ativas: não resposta não pode contornar a cota.',unsupported_type:'Este tipo de pergunta não permite não resposta.'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profile=()=>typeof CURRENT_PROFILE==='undefined'?null:CURRENT_PROFILE;
  const epoch=()=>typeof APP_DATA_SESSION_EPOCH==='undefined'?0:APP_DATA_SESSION_EPOCH;
  let modal=null,operation=null,generation=0;
  function canManage(){const p=profile();return p?.status==='ativo'&&['admin','admpro','coord'].includes(p.role);}
  function eligible(q,s){
    if(!q||!TYPES.has(q.type)||q.isRegion||q.is_active===false)return false;
    if(s&&(s.archivedAt||s.status==='encerrada'))return false;
    if((q.endsInterview||[]).some(Boolean)||(q.routeTargets||[]).some(v=>String(v??'').trim())||String(q.directTarget??'').trim())return false;
    if(s&&['single','multi'].includes(q.type)&&!(s.quotaOff&&s.quotaOff[q.id])&&Object.values(s.quotas?.[q.id]||{}).some(v=>v!=null))return false;
    return true;
  }
  function allowed(q,s,a){return q?.allowNonresponse===true&&eligible(q,s)&&!a?.locked;}
  function marked(a){return a?.isNonresponse===true;}
  function collectScope(qid,requirePermission=true){
    const p=profile();
    if(p?.role!=='pesq'||p.status!=='ativo'||!ACOLLECT_IN_PROGRESS||ACOLLECT_SUBMITTING||global.PP_COLLECTION_WITHDRAWALS?.active())return null;
    const s=acollectCurrentSurvey(),q=(s?.questions||[]).find(item=>item.dbId===qid);
    const visible=global.PP_CONDITIONAL_FLOW?.visibleQuestions?.(s?.questions||[],ACOLLECT_ANSWERS)||s?.questions||[];
    if(!q||!visible.includes(q)||ACOLLECT_ANSWERS[qid]?.locked||(requirePermission&&!allowed(q,s,ACOLLECT_ANSWERS[qid])))return null;
    return {q,s};
  }
  function mark(qid){
    if(!collectScope(qid))return;
    if(!confirm('O entrevistado preferiu não responder esta pergunta?\n\nSerá registrado “Não respondeu”. A entrevista continuará, e essa recusa isolada não é reprovação. Uma resposta já preenchida nesta pergunta será substituída.'))return;
    if(!collectScope(qid))return;
    ACOLLECT_ANSWERS[qid]={value:null,isNonresponse:true};
    renderAcollectForm();renderAcollectActionState();
  }
  function clear(qid){
    if(!collectScope(qid,false)||!marked(ACOLLECT_ANSWERS[qid]))return;
    delete ACOLLECT_ANSWERS[qid];
    renderAcollectForm();renderAcollectActionState();
  }
  function control(q,a,s){
    if(!allowed(q,s,a)&&(!marked(a)||a?.locked))return '';
    const busy=typeof ACOLLECT_SUBMITTING!=='undefined'&&ACOLLECT_SUBMITTING;
    const id=esc(q.dbId);
    return `<div class="nonresponse-control">${marked(a)?`<strong role="status">${LABEL} · recusa registrada</strong><button type="button" class="btn btn-out" ${busy?'disabled':''} onclick="window.PP_QUESTION_NONRESPONSE.clear('${id}')">Responder esta pergunta</button>`:`<button type="button" class="btn btn-out" ${busy?'disabled':''} onclick="window.PP_QUESTION_NONRESPONSE.mark('${id}')">${LABEL}</button><small>Use somente se o entrevistado preferir não responder. Não encerra a entrevista.</small>`}</div>`;
  }
  function answerRows(q,eventId,a){
    if(!marked(a))return [];
    const row={collection_event_id:eventId,question_id:q.dbId,value_text:LABEL,value_number:null,is_nonresponse:true};
    if(q.type==='pair')return (q.fields||[]).filter(f=>f.id).map(f=>({...row,field_id:f.id}));
    return [row];
  }
  function declaredQuestionIds(s,answers){
    const questions=global.PP_CONDITIONAL_FLOW?.visibleQuestions?.(s?.questions||[],answers)||s?.questions||[];
    return questions.filter(q=>UUID.test(String(q.dbId||''))&&marked(answers[q.dbId])&&allowed(q,s,answers[q.dbId])).map(q=>q.dbId);
  }
  function manageButton(s){
    if(!canManage()||!UUID.test(String(s?.id||''))||s.archivedAt||s.status==='encerrada')return '';
    return `<button type="button" class="btn btn-out" onclick="window.PP_QUESTION_NONRESPONSE.open('${esc(s.id)}')">Configurar “Não respondeu”</button>`;
  }
  function editorControl(q){
    if(!canManage())return '';
    if(!q.dbId)return '<div class="nonresponse-editor-note">Salve a pesquisa primeiro para configurar “Não respondeu” sem regravar opções.</div>';
    const id=typeof wizEditingSurveyId==='function'?wizEditingSurveyId():null;
    if(!UUID.test(String(id||'')))return '';
    return `<div class="nonresponse-editor-note"><button type="button" class="btn btn-out" onclick="window.PP_QUESTION_NONRESPONSE.open('${esc(id)}','${esc(q.dbId)}')">Configurar “Não respondeu” nesta pergunta</button><small>Configuração salva separadamente, sem alterar opções. ${q.allowNonresponse?'Habilitada no banco.':'Desabilitada no banco.'}</small></div>`;
  }
  function same(op){return operation===op&&op.owner===profile()&&op.epoch===epoch()&&op.generation===generation;}
  function close(){
    if(operation?.busy)return;
    operation?.controller?.abort();generation++;operation=null;modal?.remove();modal=null;
  }
  function reset(){if(operation)operation.busy=false;close();}
  function errorText(error){
    if(['PGRST202','42883','42703'].includes(error?.code)||/schema cache|does not exist/i.test(String(error?.message||'')))return 'Configuração ainda não instalada. Execute manualmente o SQL de Não respondeu no Supabase.';
    if(error?.code==='42501')return 'Sua sessão não tem permissão para esta configuração. Reabra o aplicativo com um administrador ou coordenador ativo.';
    if(error?.code==='40001'||String(error?.message||'').includes('nonresponse_conflict'))return 'A configuração mudou em outra sessão. Recarregue a configuração e confira o valor antes de tentar novamente.';
    for(const [code,label] of Object.entries(BLOCKED))if(String(error?.message||'').includes(code))return label;
    return String(error?.message||'Não foi possível concluir a configuração. Tente novamente.');
  }
  async function rpc(op,name,payload){
    const controller=new AbortController();op.controller=controller;
    let timer;
    try{
      const query=sb.rpc(name,payload).abortSignal(controller.signal);
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Tempo esgotado. Confira a conexão e recarregue a configuração para confirmar o estado salvo.'));},15000);});
      const result=await Promise.race([Promise.resolve(query),timeout]);
      if(result?.error)throw result.error;
      return result?.data;
    }finally{clearTimeout(timer);if(op.controller===controller)op.controller=null;}
  }
  function render(){
    const op=operation;if(!modal||!op)return;
    const questions=op.questions.filter(q=>!op.focus||q.question_id===op.focus);
    modal.querySelector('.nonresponse-modal-content').innerHTML=`<p>Ative somente onde o entrevistado pode recusar uma resposta sem invalidar sua participação. Perguntas de região, cotas e caminhos condicionais são protegidas. Campos antigos em branco não serão convertidos.</p><p>Esta configuração altera apenas a permissão da pergunta. Não exclui nem reconstrói opções, respostas, metas ou regras.</p>${op.error?`<div role="alert" class="nonresponse-error">${esc(op.error)}</div>`:''}${op.message?`<div role="status" class="nonresponse-message">${esc(op.message)}</div>`:''}${op.loading?'<p role="status">Carregando configurações…</p>':questions.map(q=>`<div class="nonresponse-config-row"><strong>${Number(q.position)+1}. ${esc(q.text)}</strong><small>${q.eligible?'Permite registrar a recusa sem encerrar a entrevista.':esc(BLOCKED[q.blocked_reason]||'Pergunta protegida contra não resposta.')}</small><label><input type="checkbox" data-nonresponse-id="${esc(q.question_id)}" ${q.allow_nonresponse?'checked':''} ${op.busy||(!q.eligible&&!q.allow_nonresponse)?'disabled':''}> Habilitar “Não respondeu”</label></div>`).join('')}${!op.loading&&!questions.length?'<p>Nenhuma pergunta salva disponível.</p>':''}<button type="button" class="btn btn-out" data-nonresponse-reload ${op.busy||op.loading?'disabled':''}>Recarregar configuração</button><small class="nonresponse-editor-note">Após salvar, a equipe deve reabrir o aplicativo antes da próxima entrevista, sem interromper uma entrevista em andamento. Em “Duas respostas”, a recusa se aplica aos dois subcampos.</small>`;
    modal.querySelector('[data-nonresponse-close]').disabled=op.busy;
    modal.querySelectorAll('[data-nonresponse-id]').forEach(el=>el.addEventListener('change',()=>set(el.dataset.nonresponseId,el.checked)));
    modal.querySelector('[data-nonresponse-reload]').addEventListener('click',load);
  }
  async function load(){
    const op=operation;if(!op||op.busy||!same(op))return;
    op.loading=true;op.busy=true;op.error='';render();
    try{
      const data=await rpc(op,'list_question_nonresponse',{p_survey_id:op.surveyId});
      if(!same(op))return;
      if(data?.survey_id!==op.surveyId||!Array.isArray(data.questions))throw new Error('O servidor não confirmou a configuração desta pesquisa.');
      op.questions=data.questions;
      for(const q of op.questions)updateLocal(q.question_id,q.allow_nonresponse===true,op.surveyId);
    }catch(ex){if(same(op))op.error=errorText(ex);}
    finally{if(same(op)){op.loading=false;op.busy=false;render();}}
  }
  function updateLocal(qid,enabled,surveyId){
    if(typeof SURVEYS!=='undefined')for(const s of SURVEYS){if(s.id===surveyId)for(const q of s.questions||[])if(q.dbId===qid)q.allowNonresponse=enabled;}
    if(typeof WIZ!=='undefined'&&typeof wizEditingSurveyId==='function'&&wizEditingSurveyId()===surveyId)for(const q of WIZ.data?.questions||[])if(q.dbId===qid)q.allowNonresponse=enabled;
    if(typeof qRender==='function'&&document.getElementById('q-list'))qRender();
  }
  async function set(qid,enabled){
    const op=operation,q=op?.questions.find(q=>q.question_id===qid);
    if(!op||!q||op.busy||!same(op)||!canManage())return;
    if(enabled&&!q.eligible){render();return;}
    if(!confirm(`${enabled?'Habilitar':'Desabilitar'} “Não respondeu” nesta pergunta?\n\nA configuração será salva agora, separadamente do editor. Não altera opções nem respostas antigas. Para novas entrevistas, oriente a equipe a reabrir o aplicativo.`)){render();return;}
    if(!same(op)||!canManage())return;
    op.busy=true;op.error='';op.message='Salvando configuração…';render();
    try{
      const data=await rpc(op,'set_question_nonresponse',{p_question_id:qid,p_enabled:enabled,p_expected_enabled:q.allow_nonresponse===true});
      if(!same(op))return;
      if(data?.question_id!==qid||data.allow_nonresponse!==enabled)throw new Error('O servidor não confirmou a alteração. Recarregue a configuração.');
      q.allow_nonresponse=enabled;updateLocal(qid,enabled,op.surveyId);
      op.message='Configuração salva. As opções e as respostas anteriores foram preservadas.';
    }catch(ex){if(same(op)){op.error=errorText(ex);op.message='';}}
    finally{if(same(op)){op.busy=false;render();}}
  }
  function open(surveyId,focus=null){
    if(!canManage()||!UUID.test(String(surveyId||''))||operation?.busy)return;
    close();operation={surveyId,focus,owner:profile(),epoch:epoch(),generation,questions:[],loading:false,busy:false,error:'',message:''};
    modal=document.createElement('div');modal.className='nonresponse-modal';
    modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="nonresponse-title" tabindex="-1"><div class="nonresponse-modal-head"><h2 id="nonresponse-title">Configurar “Não respondeu”</h2><button type="button" class="btn btn-out" data-nonresponse-close aria-label="Fechar configuração">Fechar</button></div><div class="nonresponse-modal-content"></div></section>';
    document.body.appendChild(modal);modal.querySelector('[data-nonresponse-close]').addEventListener('click',close);
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key!=='Tab')return;
      const nodes=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')];if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    modal.querySelector('section').focus();load();
  }
  global.PP_QUESTION_NONRESPONSE={LABEL,canManage,eligible,allowed,marked,mark,clear,control,answerRows,declaredQuestionIds,manageButton,editorControl,open,close,reset};
})(window);
