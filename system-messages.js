/* PesquisaPro v184 — mensagens internas obrigatórias do sistema.
   Depende da migration deploy/mensagens-sistema-obrigatorias.sql.
   Sem a migration, não bloqueia o acesso nem tenta usar Push como substituto. */
(function(){
  'use strict';
  const MAX_TITLE=120,MAX_BODY=4000;
  const STAFF=['admin','admpro'];
  let state={
    open:false,target:'all_active',title:'Aviso importante do PesquisaPro',body:'',busy:false,
    notice:'',pending:[],loading:false,checking:false,blocking:false,loaded:false,
    schemaMissing:false,error:'',generation:0,lastLoadedAt:0
  };
  let focusHandlerInstalled=false;

  function authorized(){
    return typeof CURRENT_PROFILE!=='undefined'&&CURRENT_PROFILE?.status==='ativo'
      &&STAFF.includes(CURRENT_PROFILE.role)
      &&typeof selectedRole!=='undefined'&&STAFF.includes(selectedRole);
  }
  function activeUser(){return typeof CURRENT_PROFILE!=='undefined'&&!!CURRENT_PROFILE?.id&&CURRENT_PROFILE?.status==='ativo';}
  function validId(value){return typeof isValidUuid==='function'&&isValidUuid(value);}
  function escText(value){
    if(typeof esc==='function')return esc(value);
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function allUsers(){return typeof USERS!=='undefined'&&Array.isArray(USERS)?USERS:[];}
  function currentUser(id){return allUsers().find(user=>user?.id===id)||null;}
  function activeUsers(users){return (Array.isArray(users)?users:allUsers()).filter(user=>user?.status==='ativo'&&validId(user.id));}
  function targetLabel(target,visible){
    if(target==='all_active')return 'Todos os perfis ativos do sistema';
    const id=String(target||'').startsWith('user:')?String(target).slice(5):'';
    const user=currentUser(id)||activeUsers(visible).find(item=>item.id===id);
    return user?'Somente '+(user.name||'usuário'):'Destinatário individual';
  }
  function schemaError(message){
    return /system_messages|system_message_recipients|send_system_message|get_my_pending_system_messages|acknowledge_system_message|schema cache|relation .* does not exist|function .* does not exist|could not find the function/i.test(String(message||''));
  }
  function safeError(ex){return String(ex?.message||ex||'Não foi possível consultar as mensagens obrigatórias.');}
  function overlay(){
    let el=document.getElementById('systemMessageGate');
    if(el)return el;
    el=document.createElement('div');
    el.id='systemMessageGate';el.className='system-message-gate';el.hidden=true;
    el.innerHTML='<section class="system-message-gate-dialog" role="alertdialog" aria-modal="true" aria-labelledby="systemMessageGateTitle" aria-describedby="systemMessageGateHelp"><div class="system-message-gate-content" id="systemMessageGateContent"></div><div class="system-message-gate-footer"><span class="system-message-gate-lock">🔒 Confirmação obrigatória</span><button type="button" class="btn btn-fill" id="systemMessageGateConfirm" onclick="window.PP_SYSTEM_MESSAGES.acknowledge()" disabled>Li e estou ciente</button></div></section>';
    el.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();return;}
      if(event.key!=='Tab')return;
      const focusable=[...el.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
      if(!focusable.length)return;
      if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
      else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
    });
    document.body.appendChild(el);
    return el;
  }
  function hide(){
    const el=document.getElementById('systemMessageGate');
    if(el)el.hidden=true;
    document.body.classList.remove('system-message-gate-open');
  }
  function render(){
    const el=overlay(),content=document.getElementById('systemMessageGateContent'),button=document.getElementById('systemMessageGateConfirm');
    if(!state.blocking){hide();return;}
    const message=state.pending[0];
    const count=state.pending.length;
    let body='';
    if(state.error){
      body='<span class="eyebrow">VERIFICAÇÃO DE SEGURANÇA</span><h2 id="systemMessageGateTitle">Não foi possível verificar os avisos</h2><p id="systemMessageGateHelp">Por segurança, o acesso fica pausado até o sistema confirmar se há alguma mensagem obrigatória pendente.</p><div class="callout warn" role="alert">'+escText(state.error)+'</div><p class="system-message-gate-help">Verifique sua conexão e tente novamente. Se o problema persistir, fale com a gestão.</p>';
    }else if(state.loading||state.checking){
      body='<span class="eyebrow">PESQUISAPRO · VERIFICAÇÃO</span><h2 id="systemMessageGateTitle">Conferindo avisos obrigatórios…</h2><p id="systemMessageGateHelp">Aguarde enquanto verificamos se existe alguma orientação da gestão que precise da sua confirmação.</p><div class="system-message-gate-loading" role="status">Consultando mensagens seguras…</div>';
    }else if(message){
      body='<span class="eyebrow">AVISO DA GESTÃO · '+count+' '+(count===1?'PENDENTE':'PENDENTES')+'</span><h2 id="systemMessageGateTitle">Leia e confirme para continuar</h2><p id="systemMessageGateHelp">Esta mensagem precisa ser confirmada antes de continuar usando o PesquisaPro. A confirmação fica registrada com sua conta. '+(count>1?'Depois desta, ainda haverá '+(count-1)+' mensagem(ns) pendente(s).':'')+'</p><article class="system-message-gate-message"><div><strong>'+escText(message.sender_name||'Equipe PesquisaPro')+'</strong><time>'+escText(new Date(message.created_at).toLocaleString('pt-BR'))+'</time></div><h3>'+escText(message.title||'Aviso importante')+'</h3><p>'+escText(message.body||'')+'</p></article><label class="system-message-gate-consent"><input type="checkbox" onchange="window.PP_SYSTEM_MESSAGES.consentChanged(this.checked)"> Li integralmente esta mensagem e estou ciente do seu conteúdo.</label>';
    }
    content.innerHTML=body;
    button.disabled=state.busy||state.loading||state.checking||!message||!content.querySelector('input[type="checkbox"]')?.checked;
    button.textContent=state.busy?'Registrando confirmação…':message?'Li e estou ciente':'Tentar novamente';
    if(state.error||(!state.loading&&!state.checking&&!message)){
      button.disabled=state.busy;
      button.textContent=state.busy?'Tentando…':'Tentar novamente';
      button.onclick=()=>load(true);
    }else{
      button.onclick=()=>acknowledge();
    }
    el.hidden=false;document.body.classList.add('system-message-gate-open');
    const focusTarget=content.querySelector('input[type="checkbox"]')||button;
    if(document.activeElement!==focusTarget)focusTarget?.focus({preventScroll:true});
  }
  function consentChanged(checked){
    const button=document.getElementById('systemMessageGateConfirm');
    if(button&&state.pending[0]&&!state.busy)button.disabled=!checked;
  }
  async function load(force=false){
    if(!activeUser()||state.loading)return false;
    if(!force&&state.loaded&&Date.now()-state.lastLoadedAt<30000)return !state.blocking;
    if(typeof ACOLLECT_IN_PROGRESS!=='undefined'&&ACOLLECT_IN_PROGRESS)return true;
    const generation=++state.generation;
    state.loading=true;state.checking=true;state.error='';state.schemaMissing=false;state.blocking=true;render();
    try{
      const {data,error}=await sb.rpc('get_my_pending_system_messages');
      if(generation!==state.generation||!activeUser())return false;
      if(error)throw error;
      state.pending=Array.isArray(data)?data.filter(row=>row?.message_id):[];
      state.loaded=true;state.lastLoadedAt=Date.now();state.blocking=state.pending.length>0;
      return !state.blocking;
    }catch(ex){
      if(generation!==state.generation)return false;
      if(schemaError(safeError(ex))){
        state.schemaMissing=true;state.pending=[];state.loaded=true;state.blocking=false;state.error='';
        console.warn('Mensagens obrigatórias ainda não ativadas: execute deploy/mensagens-sistema-obrigatorias.sql no Supabase.');
        return true;
      }
      state.loaded=false;state.blocking=true;state.error='Não foi possível consultar os avisos obrigatórios agora. Tente novamente com internet.';
      console.warn('Falha ao consultar mensagens obrigatórias:',ex);
      return false;
    }finally{
      if(generation===state.generation){state.loading=false;state.checking=false;render();}
    }
  }
  async function acknowledge(){
    const message=state.pending[0],checkbox=document.querySelector('#systemMessageGateContent input[type="checkbox"]');
    if(!message||!checkbox?.checked||state.busy||state.loading)return;
    state.busy=true;render();
    try{
      const {error}=await sb.rpc('acknowledge_system_message',{p_message_id:message.message_id});
      if(error)throw error;
      state.pending=state.pending.slice(1);state.lastLoadedAt=Date.now();state.blocking=state.pending.length>0;state.error='';
    }catch(ex){
      state.error=schemaError(safeError(ex))?'A migration de mensagens obrigatórias ainda não está ativa. A gestão precisa executar deploy/mensagens-sistema-obrigatorias.sql no Supabase.':'Não foi possível registrar sua confirmação. Nenhum acesso foi liberado; tente novamente.';
      console.warn('Falha ao confirmar mensagem obrigatória:',ex);state.blocking=true;
    }finally{state.busy=false;render();}
  }
  function guardNavigation(){
    if(state.blocking){render();return false;}
    return true;
  }
  function start(){state.loaded=false;state.lastLoadedAt=0;return load(true);}
  function reset(){state.generation++;state.open=false;state.pending=[];state.loading=false;state.checking=false;state.blocking=false;state.loaded=false;state.schemaMissing=false;state.error='';state.busy=false;hide();}
  function headerButton(){
    if(!authorized())return '';
    return '<button type="button" class="btn btn-out users-system-message-open" onclick="window.PP_SYSTEM_MESSAGES.open()">▣ Enviar aviso obrigatório</button>';
  }
  function rowButton(user){
    if(!authorized()||!user||user.status!=='ativo'||!validId(user.id))return '';
    return '<button type="button" class="btn-ghost users-system-message-row" onclick="event.preventDefault();event.stopPropagation();window.PP_SYSTEM_MESSAGES.openForUser('+jsArg(user.id)+')" title="Enviar aviso interno obrigatório somente para este usuário">Enviar aviso</button>';
  }
  function targetOptions(visible){
    const users=activeUsers(visible),selected=state.target;
    const options=['<option value="all_active" '+(selected==='all_active'?'selected':'')+'>Todos os perfis ativos do sistema</option>'];
    users.forEach(user=>{const value='user:'+user.id;options.push('<option value="'+escText(value)+'" '+(selected===value?'selected':'')+'>'+escText(user.name||'Usuário')+' — '+escText(user.email||'Ativo')+'</option>');});
    return options.join('');
  }
  function panel(visibleUsers){
    if(!authorized()||!state.open)return '';
    const visible=Array.isArray(visibleUsers)?visibleUsers:[],busy=state.busy;
    const note=state.schemaMissing?'<div class="users-system-message-notice warn" role="alert">Execute manualmente <code>deploy/mensagens-sistema-obrigatorias.sql</code> no Supabase para ativar este envio. Nada foi enviado ainda.</div>':state.notice?'<div class="users-system-message-notice" role="status" aria-live="polite">'+escText(state.notice)+'</div>':'';
    return '<section class="card users-system-message-panel" id="users-system-message-panel" aria-labelledby="users-system-message-title">'
      +'<div class="users-system-message-head"><div><span class="eyebrow">COMUNICAÇÃO INTERNA · CONFIRMAÇÃO OBRIGATÓRIA</span><h2 id="users-system-message-title">Enviar aviso pelo sistema</h2><p>O destinatário verá um balão obrigatório ao entrar e precisará confirmar a leitura antes de continuar.</p></div><button type="button" class="btn-ghost" onclick="window.PP_SYSTEM_MESSAGES.close()" '+(busy?'disabled':'')+'>Fechar</button></div>'
      +'<div class="users-system-message-grid"><div class="field"><label class="lbl" for="users-system-message-target">Destinatários</label><select class="inp" id="users-system-message-target" onchange="window.PP_SYSTEM_MESSAGES.setTarget(this.value)" '+(busy?'disabled':'')+'>'+targetOptions(visible)+'</select><small class="users-system-message-help">'+escText(targetLabel(state.target,visible))+'. Somente perfis com status ativo podem receber.</small></div><div class="field"><label class="lbl" for="users-system-message-title-input">Título *</label><input class="inp" id="users-system-message-title-input" maxlength="'+MAX_TITLE+'" value="'+escText(state.title)+'" placeholder="Ex.: Orientação importante" oninput="window.PP_SYSTEM_MESSAGES.setTitle(this.value)" '+(busy?'disabled':'')+'></div></div>'
      +'<div class="field"><label class="lbl" for="users-system-message-body-input">Mensagem *</label><textarea class="inp users-system-message-body" id="users-system-message-body-input" maxlength="'+MAX_BODY+'" rows="6" placeholder="Escreva a orientação que o usuário deverá ler e confirmar." oninput="window.PP_SYSTEM_MESSAGES.setBody(this.value)" '+(busy?'disabled':'')+'>'+escText(state.body)+'</textarea><small class="users-system-message-help">'+state.body.length+'/'+MAX_BODY+' caracteres. A confirmação ficará registrada no sistema.</small></div>'
      +'<div class="users-system-message-actions"><button type="button" class="btn btn-fill" onclick="window.PP_SYSTEM_MESSAGES.send()" '+(busy?'disabled':'')+'>'+ (busy?'Publicando…':'Publicar aviso obrigatório')+'</button><span>Use somente para orientações que realmente precisam ser vistas. O Push continua opcional e não substitui este aviso.</span></div>'
      +note+'</section>';
  }
  function open(target){
    if(!authorized()){alert('Apenas o Administrador master e o ADM PesquisaPro podem enviar avisos obrigatórios.');return;}
    state.open=true;state.target=target||'all_active';state.notice='';state.schemaMissing=false;
    if(typeof go==='function')go('users');
    setTimeout(()=>document.getElementById('users-system-message-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }
  function openForUser(id){
    if(!validId(id)||!currentUser(id)||currentUser(id).status!=='ativo'){alert('Este usuário não está ativo ou não possui identificador válido.');return;}
    open('user:'+id);
  }
  function close(){if(state.busy)return;state.open=false;state.notice='';if(typeof go==='function')go('users');}
  function setTarget(value){state.target=value==='all_active'||String(value||'').startsWith('user:')?value:'all_active';if(typeof go==='function')go('users');}
  function setTitle(value){state.title=String(value||'').slice(0,MAX_TITLE);}
  function setBody(value){state.body=String(value||'').slice(0,MAX_BODY);}
  function resetForm(){state.title='Aviso importante do PesquisaPro';state.body='';state.target='all_active';}
  async function send(){
    if(!authorized()||state.busy)return;
    const title=state.title.trim(),body=state.body.trim();
    if(!title){alert('Informe um título para o aviso.');return;}
    if(!body){alert('Informe o texto do aviso.');return;}
    const visible=typeof usersInTab==='function'?usersInTab(typeof USER_TAB!=='undefined'?USER_TAB:'pesq').map(item=>item.u):[];
    const selectedId=String(state.target||'').startsWith('user:')?String(state.target).slice(5):null;
    if(selectedId&&(!validId(selectedId)||!currentUser(selectedId)||currentUser(selectedId).status!=='ativo')){alert('Selecione um usuário ativo válido.');return;}
    const label=targetLabel(state.target,visible);
    const confirmation='Publicar este aviso obrigatório?\n\nDestinatário: '+label+'\nTítulo: '+title+'\n\n'+body+'\n\nO destinatário precisará confirmar a leitura para continuar no sistema.';
    if(!confirm(confirmation))return;
    const generation=state.generation;state.busy=true;state.notice='Publicando aviso e preparando os destinatários…';state.error='';render();
    try{
      const {data,error}=await sb.rpc('send_system_message',{p_title:title,p_body:body,p_target_mode:selectedId?'selected':'all_active',p_recipient_id:selectedId,p_is_mandatory:true,p_expires_at:null});
      if(generation!==state.generation||!authorized())return;
      if(error)throw error;
      const count=Number(data?.recipient_count||0);
      state.notice='Aviso publicado para '+count+' destinatário(s). A confirmação será registrada quando cada pessoa entrar no sistema.';
      state.body='';
      if(typeof go==='function')go('users');
    }catch(ex){
      if(generation!==state.generation)return;
      state.notice='';state.schemaMissing=schemaError(safeError(ex));
      alert(state.schemaMissing?'O envio ainda não está ativo. Execute manualmente deploy/mensagens-sistema-obrigatorias.sql no Supabase e tente novamente.':'Não foi possível publicar o aviso: '+safeError(ex));
    }finally{if(generation===state.generation){state.busy=false;if(typeof go==='function'&&document.getElementById('users-system-message-panel'))go('users');}}
  }
  if(!focusHandlerInstalled){focusHandlerInstalled=true;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&activeUser())load(true);});}
  window.PP_SYSTEM_MESSAGES={authorized,headerButton,rowButton,panel,open,openForUser,close,setTarget,setTitle,setBody,send,acknowledge,consentChanged,start,load,reset,guardNavigation,resetForm,busy:()=>state.busy,state:()=>({...state,pending:state.pending.slice()})};
})();
