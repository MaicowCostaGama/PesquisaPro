/* PesquisaPro v182 — mensagens Push administrativas na aba Usuários.
   O módulo não grava conteúdo de mensagem no banco: prepara e envia uma vez pela Edge Function protegida. */
(function(){
  'use strict';
  const MAX_TITLE=80,MAX_BODY=1000;
  let state={open:false,target:'all_active',title:'Aviso do PesquisaPro',body:'',busy:false,notice:'',generation:0,controller:null};
  const STAFF=['admin','admpro'];
  const statusLabel={ativo:'Ativo',pendente:'Pendente',prospecto:'Prospecto',encerrado:'Encerrado'};
  function authorized(){
    return typeof CURRENT_PROFILE!=='undefined'&&CURRENT_PROFILE?.status==='ativo'
      &&STAFF.includes(CURRENT_PROFILE.role)
      &&typeof selectedRole!=='undefined'&&STAFF.includes(selectedRole);
  }
  function validId(value){return typeof isValidUuid==='function'&&isValidUuid(value);}
  function allUsers(){return typeof USERS!=='undefined'&&Array.isArray(USERS)?USERS:[];}
  function currentUser(id){return allUsers().find(user=>user?.id===id)||null;}
  function activeUsers(users){return (Array.isArray(users)?users:allUsers()).filter(user=>user?.status==='ativo'&&validId(user.id));}
  function selectedTargetLabel(target,visible){
    if(target==='all_active')return 'Todos os usuários ativos do sistema';
    if(target==='tab_active')return 'Todos os usuários ativos nesta aba/filtro ('+activeUsers(visible).length+')';
    const user=target.startsWith('user:')?currentUser(target.slice(5)):null;
    return user?'Somente '+(user.name||'usuário'):'Destinatário individual';
  }
  function headerButton(){
    if(!authorized())return '';
    return '<button type="button" class="btn btn-out users-push-open" onclick="window.PP_USERS_PUSH.open()">◉ Enviar Push</button>';
  }
  function rowButton(user){
    if(!authorized()||!user||user.status!=='ativo'||!validId(user.id))return '';
    return '<button type="button" class="btn-ghost users-push-row" onclick="event.preventDefault();event.stopPropagation();window.PP_USERS_PUSH.openForUser('+jsArg(user.id)+')" title="Enviar mensagem Push somente para este usuário">Enviar Push</button>';
  }
  function targetOptions(visible){
    const users=activeUsers(visible),selected=state.target;
    const options=[
      '<option value="all_active" '+(selected==='all_active'?'selected':'')+'>Todos os usuários ativos do sistema</option>',
      '<option value="tab_active" '+(selected==='tab_active'?'selected':'')+'>Todos os ativos nesta aba/filtro ('+users.length+')</option>'
    ];
    users.forEach(user=>{
      const value='user:'+user.id;
      options.push('<option value="'+esc(value)+'" '+(selected===value?'selected':'')+'>'+esc(user.name||'Usuário')+' — '+esc(user.email||statusLabel[user.status]||'Ativo')+'</option>');
    });
    return options.join('');
  }
  function panel(visibleUsers){
    if(!authorized()||!state.open)return '';
    const visible=Array.isArray(visibleUsers)?visibleUsers:[];
    const targetLabel=selectedTargetLabel(state.target,visible);
    const notice=state.notice?'<div class="users-push-notice" role="status" aria-live="polite">'+esc(state.notice)+'</div>':'';
    const busy=state.busy;
    return '<section class="card users-push-panel" id="users-push-panel" aria-labelledby="users-push-title">'
      +'<div class="users-push-head"><div><span class="eyebrow">COMUNICAÇÃO IMEDIATA</span><h2 id="users-push-title">Enviar mensagem Push</h2><p>Envie um aviso para usuários com acesso ativo e Push cadastrado neste dispositivo.</p></div><button type="button" class="btn-ghost" onclick="window.PP_USERS_PUSH.close()" '+(busy?'disabled':'')+'>Fechar</button></div>'
      +'<div class="users-push-grid">'
      +'<div class="field"><label class="lbl" for="users-push-target">Destinatários</label><select class="inp" id="users-push-target" onchange="window.PP_USERS_PUSH.setTarget(this.value)" '+(busy?'disabled':'')+'>'+targetOptions(visible)+'</select><small class="users-push-target-note">'+esc(targetLabel)+'. Usuários sem inscrição Push serão informados no resultado e não receberão a mensagem.</small></div>'
      +'<div class="field"><label class="lbl" for="users-push-title-input">Título *</label><input class="inp" id="users-push-title-input" maxlength="'+MAX_TITLE+'" value="'+esc(state.title)+'" placeholder="Ex.: Aviso importante" oninput="window.PP_USERS_PUSH.setTitle(this.value)" '+(busy?'disabled':'')+'></div>'
      +'</div>'
      +'<div class="field"><label class="lbl" for="users-push-body-input">Mensagem *</label><textarea class="inp users-push-body" id="users-push-body-input" maxlength="'+MAX_BODY+'" rows="4" placeholder="Escreva a mensagem que aparecerá como notificação no celular ou computador." oninput="window.PP_USERS_PUSH.setBody(this.value)" '+(busy?'disabled':'')+'>'+esc(state.body)+'</textarea><small class="users-push-counter">'+state.body.length+'/'+MAX_BODY+' caracteres</small></div>'
      +'<div class="users-push-actions"><button type="button" class="btn btn-fill" onclick="window.PP_USERS_PUSH.send()" '+(busy?'disabled':'')+'>'+ (busy?'Enviando…':'Enviar mensagem agora')+'</button><span class="users-push-safety">A mensagem será enviada apenas após sua confirmação. Este envio não altera cadastros.</span></div>'
      +notice+'</section>';
  }
  function open(target){
    if(!authorized()){alert('Apenas o Administrador master e o ADM PesquisaPro podem enviar Push.');return;}
    state.open=true;state.target=target||'all_active';state.notice='';
    if(typeof go==='function')go('users');
    setTimeout(()=>document.getElementById('users-push-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }
  function openForUser(id){
    if(!validId(id)||!currentUser(id)||currentUser(id).status!=='ativo'){alert('Este usuário não está ativo ou não possui identificador válido para receber a mensagem.');return;}
    open('user:'+id);
  }
  function close(){if(state.busy)return;state.open=false;state.notice='';if(typeof go==='function')go('users');}
  function setTarget(value){state.target=['all_active','tab_active'].includes(value)||value.startsWith('user:')?value:'all_active';if(typeof go==='function')go('users');}
  function setTitle(value){state.title=String(value||'').slice(0,MAX_TITLE);}
  function setBody(value){state.body=String(value||'').slice(0,MAX_BODY);}
  function reset(){state.generation++;if(state.controller)state.controller.abort();state.controller=null;state.busy=false;state.open=false;state.notice='';}
  function targetIds(visible){
    if(state.target==='all_active')return {mode:'all_active',ids:[]};
    if(state.target==='tab_active')return {mode:'selected',ids:activeUsers(visible).map(user=>user.id)};
    const id=state.target.startsWith('user:')?state.target.slice(5):'';
    return {mode:'selected',ids:validId(id)?[id]:[]};
  }
  async function send(){
    if(!authorized()||state.busy)return;
    const title=state.title.trim(),body=state.body.trim();
    if(!title){alert('Informe um título para a mensagem.');return;}
    if(!body){alert('Informe o texto da mensagem.');return;}
    if(title.length>MAX_TITLE||body.length>MAX_BODY){alert('A mensagem excede o limite permitido.');return;}
    const visible=typeof usersInTab==='function'?usersInTab(typeof USER_TAB!=='undefined'?USER_TAB:'pesq').map(item=>item.u):[];
    const target=targetIds(visible),label=selectedTargetLabel(state.target,visible);
    if(target.mode==='selected'&&!target.ids.length){alert('Não há usuários ativos válidos para este destinatário.');return;}
    const confirmation='Enviar esta mensagem Push?\n\nDestinatários: '+label+'\nTítulo: '+title+'\n\n'+body+'\n\nApenas dispositivos com Push cadastrado receberão a notificação.';
    if(!confirm(confirmation))return;
    const generation=state.generation,actor=CURRENT_PROFILE?.id;state.busy=true;state.notice='Enviando para a função protegida…';
    state.controller=new AbortController();
    let timeoutId;
    try{
      const invoke=sb.functions.invoke('send-admin-user-push',{body:{target_mode:target.mode,user_ids:target.ids,title,body}});
      const timeout=new Promise((_,reject)=>{timeoutId=setTimeout(()=>reject(new Error('Tempo limite ao enviar. Recarregue a lista e confira antes de tentar novamente.')),30000);});
      const result=await Promise.race([invoke,timeout]);
      if(generation!==state.generation||!authorized()||CURRENT_PROFILE?.id!==actor)return;
      if(result.error)throw result.error;
      const data=result.data||{};
      state.notice='Resultado: '+Number(data.sent||0)+' dispositivo(s) notificado(s), '+Number(data.skipped||0)+' sem Push cadastrado e '+Number(data.failed||0)+' falha(s). Destinatários considerados: '+Number(data.recipients||0)+'.';
      state.body='';
      if(typeof go==='function')go('users');
    }catch(ex){
      if(generation!==state.generation)return;
      state.notice='';
      const message=String(ex?.message||ex||'Falha desconhecida');
      alert(/send-admin-user-push|function.*(not found|does not exist)|schema cache/i.test(message)?'O envio Push ainda não está configurado. A função Edge send-admin-user-push precisa ser publicada no Supabase e usar os segredos VAPID já configurados.':'Não foi possível enviar a mensagem Push: '+message);
    }finally{if(timeoutId)clearTimeout(timeoutId);if(generation===state.generation){state.busy=false;state.controller=null;if(typeof go==='function'&&document.getElementById('users-push-panel'))go('users');}}
  }
  window.PP_USERS_PUSH={authorized,headerButton,rowButton,panel,open,openForUser,close,setTarget,setTitle,setBody,send,reset,busy:()=>state.busy};
})();
