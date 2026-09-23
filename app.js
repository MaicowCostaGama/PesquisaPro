/* ============ STATE ============ */
let selectedRole='admin';
const ROLES={
  admin:{name:'Admin Master',role:'Administrador',initials:'AM',
    nav:['dashboard','commercial','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company','communication']},
  coord:{name:'Carla Menezes',role:'Coordenadora',initials:'CM',
    nav:['dashboard','commercial','surveys','surveys-done','collect','reports','finance']},
  gerente:{name:'Rafael Dias',role:'Gerente',initials:'RD',
    nav:['dashboard','commercial','sample','reports','finance']},
  pesq:{name:'João Pereira',role:'Pesquisador',initials:'JP',
    nav:['dashboard-pesq','researcher-profile','researcher-guide','app-collect','researcher-badge','my-earnings','my-contract','communication','support']},
  cliente:{name:'Prefeitura de Uberlândia',role:'Cliente',initials:'PU',
    nav:['client-surveys','form-approval','client-progress','client-results','communication']},
};
const CLIENT_SELF_IDX=0; /* cliente de referência ao entrar com o perfil "Cliente" */
const NAV_META={
  dashboard:{ico:'▤',label:'Painel geral',group:'Visão geral'},
  'dashboard-pesq':{ico:'▤',label:'Meu painel',group:'Visão geral'},
  'new-survey':{ico:'✦',label:'Nova pesquisa',group:'Pesquisa'},
  surveys:{ico:'❒',label:'Minhas pesquisas',group:'Pesquisa'},
  'surveys-done':{ico:'✓',label:'Concluídas',group:'Pesquisa'},
  sample:{ico:'∑',label:'Cálculo de amostra',group:'Pesquisa'},
  collect:{ico:'⬇',label:'Coleta e campo',group:'Pesquisa'},
  'app-collect':{ico:'▶',label:'Coletar (app)',group:'Campo'},
  'researcher-guide':{ico:'▣',label:'Orientações para coleta',group:'Campo'},
  'researcher-profile':{ico:'☺',label:'Meus dados',group:'Meu perfil'},
  'researcher-badge':{ico:'▤',label:'Crachá virtual',group:'Meu perfil'},
  support:{ico:'☎',label:'Suporte',group:'Ajuda'},
  reports:{ico:'◫',label:'Relatórios',group:'Análise'},
  users:{ico:'☺',label:'Usuários',group:'Administração'},
  permissions:{ico:'⚿',label:'Perfis e permissões',group:'Administração'},
  finance:{ico:'$',label:'Financeiro',group:'Pagamentos'},
  'my-earnings':{ico:'$',label:'Meus ganhos',group:'Pagamentos'},
  contracts:{ico:'✎',label:'Contratos',group:'Pagamentos'},
  'contract-template':{ico:'❒',label:'Modelos de contrato',group:'Pagamentos'},
  'my-contract':{ico:'✎',label:'Meu contrato',group:'Pagamentos'},
  company:{ico:'⌂',label:'Dados da empresa',group:'Administração'},
  communication:{ico:'✉',label:'Comunicação',group:'Comunicação'},
  commercial:{ico:'↗',label:'Comercial',group:'Comercial'},
  recruitment:{ico:'♙',label:'Recrutamento',group:'Administração'},
  'client-surveys':{ico:'▤',label:'Minhas pesquisas',group:'Minha pesquisa'},
  'client-progress':{ico:'◷',label:'Andamento',group:'Minha pesquisa'},
  'form-approval':{ico:'✓',label:'Aprovar formulário',group:'Minha pesquisa'},
  'client-results':{ico:'◫',label:'Resultados',group:'Minha pesquisa'},
};

/* ============ AUTENTICAÇÃO (Supabase) ============
   selectedRole continua existindo (várias partes do app já usam essa
   variável), só que agora ela é preenchida com o "role" de verdade
   vindo da tabela "profiles" do banco, depois de um login real. */
let CURRENT_PROFILE=null; // linha da tabela "profiles" do usuário logado
let RESEARCHER_PROFILE_CITIES=[];
let RESEARCHER_PROFILE_CITIES_DRAFT=[];
let RESEARCHER_PROFILE_CITIES_LOADED=false;
let RESEARCHER_PROFILE_CITIES_LOADING=false;
let RESEARCHER_PROFILE_SAVING=false;
let RESEARCHER_BADGE_UPLOADING=false;
let PASSWORD_RECOVERY_MODE=false;
let PUSH_STATUS='unknown',PUSH_STATUS_LOADING=false,PUSH_SCHEMA_MISSING=false,PUSH_SW_REGISTRATION=null;
let MY_COMMUNICATIONS=[],MY_COMMUNICATIONS_LOADED=false,MY_COMMUNICATIONS_LOADING=false;
let CLIENT_APPROVAL_REQUEST_ID=null,CLIENT_APPROVAL_REQUEST=null,CLIENT_APPROVAL_REQUEST_LOADED=false,CLIENT_APPROVAL_LOADING=false,CLIENT_APPROVAL_RESPONDING=false,CLIENT_APPROVAL_SCHEMA_MISSING=false;
let RESEARCHER_LINK_TOKEN=null,RESEARCHER_LINK_CONTEXT=null,RESEARCHER_LINK_LOADING=false,RESEARCHER_LINK_ACCEPTING=false;
let ADMIN_APPROVAL_STATUS_BY_CLIENT={},ADMIN_APPROVAL_STATUS_LOADING={},ADMIN_APPROVAL_STATUS_LOADED={};

function pushBrowserSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function pushKeyToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=window.atob(base64),output=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;++i)output[i]=rawData.charCodeAt(i);return output;
}
async function loadPushStatusIfNeeded(){
  if(PUSH_STATUS!=='unknown'||PUSH_STATUS_LOADING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return;
  PUSH_STATUS_LOADING=true;
  try{
    const {data,error}=await sb.from('push_subscriptions').select('endpoint').eq('user_id',CURRENT_PROFILE.id).limit(1);
    if(error){if(/push_subscriptions|relation .* does not exist|schema cache/i.test(error.message||''))PUSH_SCHEMA_MISSING=true;throw error;}
    PUSH_STATUS=data?.length?'enabled':'disabled';
  }catch(ex){console.error('Não foi possível consultar o push:',ex);if(PUSH_SCHEMA_MISSING)PUSH_STATUS='unavailable';}
  finally{PUSH_STATUS_LOADING=false;}
}
async function enableResearcherPush(){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  if(!pushBrowserSupported()){alert('Este navegador não oferece notificações push. Use Chrome, Edge ou Firefox em um endereço HTTPS.');return;}
  if(!window.PP_PUSH_PUBLIC_KEY){alert('As notificações push ainda não foram configuradas pela gestão. O administrador precisa cadastrar a chave pública do push.');return;}
  if(PUSH_SCHEMA_MISSING){alert('O cadastro de notificações ainda não foi ativado no banco. Execute a migration equipe-convites-push-grupos.sql no Supabase.');return;}
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){PUSH_STATUS='blocked';go('dashboard-pesq');return;}
    PUSH_SW_REGISTRATION=await navigator.serviceWorker.register('push-sw.js?v=20260919130000',{scope:'./'});
    const subscription=await PUSH_SW_REGISTRATION.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyToUint8Array(window.PP_PUSH_PUBLIC_KEY)});
    const json=subscription.toJSON();
    const {error}=await sb.from('push_subscriptions').upsert({user_id:CURRENT_PROFILE.id,endpoint:json.endpoint,subscription:json,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
    if(error)throw new Error(error.message);
    PUSH_STATUS='enabled';alert('Notificações push ativadas. Você receberá avisos de novos convites mesmo com o aplicativo fechado.');
  }catch(ex){console.error('Falha ao ativar push:',ex);alert('Não foi possível ativar as notificações. Verifique a permissão do navegador e tente novamente.');}
  go('dashboard-pesq');
}
function pushStatusMarkup(){
  if(PUSH_STATUS==='enabled')return '<span class="pill pill-green">● Push ativado</span>';
  if(PUSH_STATUS==='blocked')return '<span class="pill pill-amber">Notificações bloqueadas no navegador</span>';
  if(PUSH_STATUS==='unavailable')return '<span class="pill pill-gray">Push ainda não ativado no banco</span>';
  if(PUSH_STATUS_LOADING)return '<span class="pill pill-gray">Verificando…</span>';
  return '<span class="pill pill-amber">Push não ativado</span>';
}
function researcherPushCard(){
  const ready=PUSH_STATUS==='enabled';
  return `<section class="card mb researcher-push-card"><div><div class="card-t">Avisos de convites <span style="margin-left:5px">${pushStatusMarkup()}</span></div><div class="card-d">Ative as notificações para receber novos convites de pesquisa mesmo quando o aplicativo estiver fechado. Você poderá aceitar ou recusar cada convite no seu painel.</div></div>${ready?'<button class="btn btn-out" onclick="go(\'communication\')">Abrir comunicação</button>':'<button class="btn btn-fill" onclick="enableResearcherPush()">Ativar notificações</button>'}</section>`;
}
function loadMySurveyCommunicationsIfNeeded(){
  if(MY_COMMUNICATIONS_LOADED||MY_COMMUNICATIONS_LOADING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return Promise.resolve();
  MY_COMMUNICATIONS_LOADING=true;
  return (async()=>{
    try{
      const {data,error}=await sb.rpc('get_my_survey_communications');
      if(error){if(/get_my_survey_communications|function .* does not exist|schema cache/i.test(error.message||''))return;throw error;}
      MY_COMMUNICATIONS=data||[];MY_COMMUNICATIONS_LOADED=true;
    }catch(ex){console.error('Não foi possível carregar grupos das pesquisas:',ex);}
    finally{MY_COMMUNICATIONS_LOADING=false;if(document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');}
  })();
}
function mySurveyCommunicationsMarkup(){
  if(!MY_COMMUNICATIONS_LOADED||!MY_COMMUNICATIONS.length)return '';
  return `<section class="card mb researcher-communications-card researcher-first-collection-groups"><div class="card-t">Antes da primeira coleta</div><div class="card-d">Entre no grupo oficial do WhatsApp da pesquisa antes de iniciar a primeira entrevista. Use também o chat para receber instruções e tirar dúvidas. A entrada no grupo é feita manualmente pelo próprio pesquisador.</div>${MY_COMMUNICATIONS.map(item=>`<div class="researcher-communication-row"><div><b>${esc(item.survey_name||'Pesquisa')}</b><small>Convite aceito${item.accepted_at?' em '+esc(new Date(item.accepted_at).toLocaleDateString('pt-BR')):''}</small></div><div class="researcher-communication-actions">${item.chat_channel_id?`<button class="btn btn-out" onclick="openResearcherSurveyChat('${item.survey_id}')">✉ Chat da pesquisa</button>`:'<span class="pill pill-gray">Chat em preparação</span>'}${item.whatsapp_group_url?`<a class="btn btn-fill" href="${esc(item.whatsapp_group_url)}" target="_blank" rel="noopener">Entrar no grupo do WhatsApp</a>`:'<span class="pill pill-gray">Grupo ainda não configurado</span>'}</div></div>`).join('')}</section>`;
}

function showLoginError(message){
  const error=document.getElementById('li-error');
  if(error){error.textContent=message;error.style.display='block';}
}
function openPasswordRecovery(){
  PASSWORD_RECOVERY_MODE=true;
  const login=document.getElementById('login');
  const card=document.getElementById('password-reset-card');
  if(login)login.style.display='flex';
  document.querySelector('.login-card:not(#password-reset-card)')?.style.setProperty('display','none');
  if(card)card.style.display='block';
  document.getElementById('rp-pass')?.focus();
}
function closePasswordRecovery(){
  PASSWORD_RECOVERY_MODE=false;
  const card=document.getElementById('password-reset-card');
  const normal=document.querySelector('.login-card:not(#password-reset-card)');
  if(card)card.style.display='none';
  if(normal)normal.style.display='block';
}
async function completePasswordReset(){
  const pass=document.getElementById('rp-pass')?.value||'';
  const confirmPass=document.getElementById('rp-pass-confirm')?.value||'';
  const error=document.getElementById('rp-error');
  const button=document.getElementById('rp-btn');
  if(error)error.style.display='none';
  if(pass.length<8){if(error){error.textContent='A nova senha deve ter pelo menos 8 caracteres.';error.style.display='block';}return;}
  if(pass!==confirmPass){if(error){error.textContent='As senhas não conferem.';error.style.display='block';}return;}
  if(button){button.disabled=true;button.textContent='Salvando…';}
  try{
    const {error:updateError}=await sb.auth.updateUser({password:pass});
    if(updateError)throw new Error(updateError.message);
    await sb.auth.signOut();
    closePasswordRecovery();
    const loginError=document.getElementById('li-error');
    if(loginError){loginError.textContent='Senha atualizada. Entre novamente com sua nova senha.';loginError.style.display='block';loginError.style.color='var(--green,#047857)';}
    history.replaceState({},document.title,window.location.pathname);
  }catch(ex){
    if(error){error.textContent='Não foi possível atualizar a senha. O link pode ter expirado; solicite uma nova redefinição.';error.style.display='block';}
    console.error(ex);
  }finally{if(button){button.disabled=false;button.textContent='Salvar nova senha';}}
}

const ROLE_NAV={
  admin:['dashboard','commercial','recruitment','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company','communication'],
  coord:['dashboard','commercial','surveys','surveys-done','collect','reports','finance','communication'],
  gerente:['dashboard','commercial','sample','reports','finance','communication'],
  pesq:['dashboard-pesq','researcher-guide','app-collect','researcher-profile','researcher-badge','my-earnings','my-contract','support','communication'],
  cliente:['client-surveys','form-approval','client-progress','client-results','communication'],
  admpro:['dashboard','commercial','recruitment','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company','communication'],
  vendedor:['commercial'],
  indicador:['commercial'],
  recrutador:['recruitment'],
};

function initialsOf(name){
  return (name||'').split(' ').filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('')||'?';
}

async function doLogin(){
  const email=(document.getElementById('li-email').value||'').trim();
  const pass=document.getElementById('li-pass').value||'';
  const errEl=document.getElementById('li-error');
  const btn=document.getElementById('li-btn');
  errEl.style.display='none';
  if(!email||!pass){errEl.textContent='Preencha e-mail e senha.';errEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Entrando…';
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error||!data.user){
      errEl.textContent='E-mail ou senha incorretos.';
      errEl.style.display='block';
      return;
    }
    await afterLogin(data.user);
  }catch(ex){
    errEl.textContent='Não foi possível conectar ao servidor. Tente novamente em instantes.';
    errEl.style.display='block';
  }finally{
    btn.disabled=false;btn.textContent='Entrar';
  }
}

function passwordResetRedirect(){
  const origin=window.location.origin;
  return origin+'/app.html?redefinir-senha=1';
}
function passwordRecoveryLinkPresent(){
  const params=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(String(window.location.hash||'').replace(/^#/,''));
  return params.get('redefinir-senha')==='1'||params.get('code')||hash.get('type')==='recovery'||(hash.get('access_token')&&hash.get('refresh_token'));
}
async function preparePasswordRecoverySession(){
  if(!passwordRecoveryLinkPresent())return false;
  const params=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(String(window.location.hash||'').replace(/^#/,''));
  try{
    const code=params.get('code');
    if(code){const {error}=await sb.auth.exchangeCodeForSession(code);if(error)throw error;}
    const accessToken=hash.get('access_token'),refreshToken=hash.get('refresh_token');
    if(accessToken&&refreshToken){const {error}=await sb.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw error;}
    openPasswordRecovery();
    return true;
  }catch(ex){
    console.error('Falha ao preparar recuperação de senha:',ex);
    const errEl=document.getElementById('li-error');
    if(errEl){errEl.textContent='O link de recuperação expirou ou não está autorizado. Solicite um novo link e abra-o no mesmo navegador.';errEl.style.display='block';}
    return false;
  }
}
async function requestOwnPasswordReset(){
  const email=(document.getElementById('li-email')?.value||'').trim();
  if(!email){showLoginError('Informe seu e-mail para receber o link de redefinição.');return;}
  const button=document.querySelector('.password-recovery-link');
  if(button){button.disabled=true;button.textContent='Enviando…';}
  try{
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:passwordResetRedirect()});
    if(error)throw new Error(error.message);
    showLoginError('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
    const errorEl=document.getElementById('li-error');
    if(errorEl)errorEl.style.color='var(--green,#047857)';
  }catch(ex){showLoginError('Não foi possível enviar o link agora. Verifique o e-mail e tente novamente.');console.error(ex);}
  finally{if(button){button.disabled=false;button.textContent='Esqueci minha senha';}}
}

async function afterLogin(user){
  chatStopRealtime();CHAT_CHANNELS=[];CHAT_CHANNELS_LOADED=false;CHAT_CHANNELS_LOADING=false;CHAT_SCHEMA_MISSING=false;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_MESSAGES_LOADING=false;CHAT_SUPPORT_CHANNEL_ID=null;CHAT_SUPPORT_READY=false;CHAT_SUPPORT_LOADING=false;
  PUSH_STATUS='unknown';PUSH_STATUS_LOADING=false;PUSH_SCHEMA_MISSING=false;PUSH_SW_REGISTRATION=null;MY_COMMUNICATIONS=[];MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS_LOADING=false;
  ACTIVE_CAMPAIGN_ID=null;CLIENT_SURVEY_VIEW_ID=null;
  PAYMENTS=[];PAYMENTS_LOADED=false;PAYMENTS_LOADING=false;PAYMENT_RECEIPTS=[];PAYMENT_RECEIPTS_LOADED=false;PAYMENT_RECEIPTS_LOADING=false;PAYMENT_RECEIPTS_SCHEMA_MISSING=false;
  const profileFields='id,name,email,phone,role,status,cpf,cpf_cnpj,pf_pj,birth,cidade,rua,numero,cep,contact_person,doc_url,doc_foto_url,doc_comprovante_url,pix_key,pix_doc,pix_bank,pix_ag,pix_acc,results_released,approved_at,commission_rate,commission_rate_with_indicator,recruiter_code,recruiter_capture_value,badge_public_token,badge_photo_path';
  let {data:profile,error}=await sb.from('profiles').select(profileFields).eq('id',user.id).single();
  if(error && /badge_public_token|badge_photo_path|column/i.test(error.message||'')){
    const fallbackFields=profileFields.replace(',badge_public_token,badge_photo_path','');
    const fallback=await sb.from('profiles').select(fallbackFields).eq('id',user.id).single();
    profile=fallback.data;error=fallback.error;
  }
  if(error||!profile){
    const errEl=document.getElementById('li-error');
    errEl.textContent='Login feito, mas não encontramos seu perfil no sistema. Fale com o administrador.';
    errEl.style.display='block';
    await sb.auth.signOut();
    return;
  }
  CURRENT_PROFILE={...profile,commissionRate:Number(profile.commission_rate)||0,commissionRateWithIndicator:Number(profile.commission_rate_with_indicator)||0,recruiterCode:profile.recruiter_code||'',recruiterCaptureValue:Number(profile.recruiter_capture_value)||0};
  selectedRole=CURRENT_PROFILE.role;
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('show');
  document.getElementById('tbAvatar').textContent=initialsOf(profile.name);
  document.getElementById('tbName').textContent=profile.name;
  document.getElementById('tbRole').textContent=ROLE_LABEL[profile.role]||profile.role;
  updateCampaignSwitcherButton();
  buildSidebar();
  const nav=ROLE_NAV[profile.role]||['dashboard'];
  go(nav[0]);
  if(typeof openSurveyInviteFromUrl==='function')openSurveyInviteFromUrl();
  if(typeof openClientApprovalFromUrl==='function')openClientApprovalFromUrl();
  if(typeof openResearcherLinkFromUrl==='function')openResearcherLinkFromUrl();
}

async function logout(){
  await sb.auth.signOut();
  chatStopRealtime();
  CHAT_CHANNELS=[];CHAT_CHANNELS_LOADED=false;CHAT_CHANNELS_LOADING=false;CHAT_SCHEMA_MISSING=false;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_MESSAGES_LOADING=false;CHAT_SUPPORT_CHANNEL_ID=null;CHAT_SUPPORT_READY=false;CHAT_SUPPORT_LOADING=false;CHAT_PENDING_SURVEY_ID=null;
  RESEARCHER_PROFILE_CITIES=[];RESEARCHER_PROFILE_CITIES_DRAFT=[];RESEARCHER_PROFILE_CITIES_LOADED=false;PUSH_STATUS='unknown';PUSH_STATUS_LOADING=false;PUSH_SCHEMA_MISSING=false;PUSH_SW_REGISTRATION=null;MY_COMMUNICATIONS=[];MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS_LOADING=false;CLIENT_APPROVAL_REQUEST_ID=null;CLIENT_APPROVAL_REQUEST=null;CLIENT_APPROVAL_LOADING=false;CLIENT_APPROVAL_RESPONDING=false;CLIENT_APPROVAL_SCHEMA_MISSING=false;RESEARCHER_LINK_TOKEN=null;RESEARCHER_LINK_CONTEXT=null;RESEARCHER_LINK_LOADING=false;RESEARCHER_LINK_ACCEPTING=false;
  PAYMENTS=[];PAYMENTS_LOADED=false;PAYMENTS_LOADING=false;PAYMENT_RECEIPTS=[];PAYMENT_RECEIPTS_LOADED=false;PAYMENT_RECEIPTS_LOADING=false;PAYMENT_RECEIPTS_SCHEMA_MISSING=false;
  CURRENT_PROFILE=null;
  ACTIVE_CAMPAIGN_ID=null;CLIENT_SURVEY_VIEW_ID=null;
  updateCampaignSwitcherButton();
  document.getElementById('app').classList.remove('show');
  document.getElementById('login').style.display='flex';
  document.getElementById('li-pass').value='';
}

function isPasswordRecoveryLink(){return passwordRecoveryLinkPresent();}
sb.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY')openPasswordRecovery();
});

/* se já existir uma sessão válida (usuário não fechou o navegador), entra direto;
   links de recuperação ficam na tela própria para o usuário definir a nova senha. */
(async function checkExistingSession(){
  try{
    const recovery=await preparePasswordRecoverySession();
    const {data}=await sb.auth.getSession();
    if(recovery||isPasswordRecoveryLink()){openPasswordRecovery();return;}
    if(data&&data.session&&data.session.user)await afterLogin(data.session.user);
  }catch(ex){console.error('Falha ao inicializar sessão:',ex);}
})();

function buildSidebar(){
  const allow=ROLE_NAV[selectedRole]||(ROLES[selectedRole]&&ROLES[selectedRole].nav)||[];
  const groups={};
  Object.keys(NAV_META).forEach(k=>{
    const m=NAV_META[k];
    if(!groups[m.group])groups[m.group]=[];
    groups[m.group].push({key:k,...m,allowed:allow.includes(k)});
  });
  let html='';
  Object.keys(groups).forEach(g=>{
    const items=groups[g].filter(i=>i.allowed||['Pesquisa','Análise','Administração','Pagamentos','Campo','Visão geral'].includes(g));
    const visible=groups[g].filter(i=>i.allowed);
    if(visible.length===0)return;
    html+=`<div class="nav-group"><div class="ng-label">${g}</div>`;
    visible.forEach(i=>{
      html+=`<button class="nav-item" data-key="${i.key}" onclick="go('${i.key}')"><span class="ico ico-3d">${icon3d(i.ico,'#c9dcff')}</span>${i.label}</button>`;
    });
    html+='</div>';
  });
  // link para sair fica sempre dentro do menu (gaveta) — no celular os
  // botões do topo (inclusive o "Sair" ao lado do avatar) somem por falta de
  // espaço, então sem isso não havia como sair do sistema pelo celular.
  html+=`<div class="nav-group nav-group-exit"><button class="nav-item nav-logout" onclick="logout()"><span class="ico ico-3d">${icon3d('⏻','#c9dcff')}</span>Sair do sistema</button></div>`;
  document.getElementById('sidebar').innerHTML=html;
}

function openResearcherSupport(){
  const phone='5531996683030';
  const name=(CURRENT_PROFILE?.name||'').trim();
  const text='Olá! Sou pesquisador(a) da PesquisaPro'+(name?' ('+name+')':'')+' e preciso de suporte para usar o aplicativo de coleta.';
  const url='https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  window.open(url,'_blank','noopener,noreferrer');
}

function go(key){
  document.querySelectorAll('.nav-item').forEach(n=>{
    const active=n.dataset.key===key;
    n.classList.toggle('on',active);
    if(active)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
  });
  if(window._beforeRender)window._beforeRender(key);
  document.getElementById('main').innerHTML=PAGES[key]?PAGES[key]():'<div class="empty">Em construção</div>';
  updateCampaignSwitcherButton();
  if(window._afterRender)window._afterRender(key);
  closeSidebar(); // no celular, o menu (gaveta) fecha sozinho ao navegar; no computador não faz diferença nenhuma
}
/* menu lateral no celular: no computador o menu fica sempre visível
   (dividindo a tela com o conteúdo); abaixo de 860px de largura ele vira uma
   gaveta que abre por cima da tela, para não sobrar quase nenhum espaço útil
   para o conteúdo — ver o CSS em "APP NO CELULAR" no final do style.css. */
function toggleSidebar(){
  const sb=document.getElementById('sidebar'),bd=document.getElementById('sidebarBackdrop');
  if(!sb)return;
  const open=!sb.classList.contains('open');
  sb.classList.toggle('open',open);
  if(bd)bd.classList.toggle('show',open);
}
function closeSidebar(){
  const sb=document.getElementById('sidebar'),bd=document.getElementById('sidebarBackdrop');
  if(sb)sb.classList.remove('open');
  if(bd)bd.classList.remove('show');
}

/* PAGES object is populated in the next script block */
const PAGES={};

/* ============ COMUNICAÇÃO / CHAT SEGMENTADO ============ */
let CHAT_CHANNELS=[],CHAT_CHANNELS_LOADED=false,CHAT_CHANNELS_LOADING=false,CHAT_SCHEMA_MISSING=false;
let CHAT_ACTIVE_CHANNEL_ID=null,CHAT_MESSAGES=[],CHAT_MESSAGES_LOADED=false,CHAT_MESSAGES_LOADING=false;
let CHAT_REALTIME_CHANNEL=null,CHAT_SENDING=false,CHAT_NEW_AUDIENCE_TYPE='all',CHAT_NEW_SURVEY_ID=null,CHAT_PENDING_SURVEY_ID=null;
let CHAT_SUPPORT_CHANNEL_ID=null,CHAT_SUPPORT_READY=false,CHAT_SUPPORT_LOADING=false;
const CHAT_AUDIENCE_LABELS={all:'Todos os usuários',region:'Região',state:'Estado',city:'Cidade',survey:'Pesquisa',support:'Atendimento privado'};
const CHAT_REGIONS=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
const CHAT_STATES=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
function chatAudienceLabel(type){return CHAT_AUDIENCE_LABELS[type]||'Público';}
function chatChannelDescription(channel){
  if(!channel)return '';
  if(channel.audience_type==='support')return 'Conversa privada com a equipe PesquisaPro';
  if(channel.audience_type==='all')return 'Todos os usuários autenticados';
  if(channel.audience_type==='survey'){const survey=SURVEYS.find(item=>item.id===channel.survey_id);return survey?'Participantes de '+survey.name:'Participantes da pesquisa';}
  return chatAudienceLabel(channel.audience_type)+': '+(channel.audience_value||'—');
}
function chatLocationValues(){
  const values=new Map();
  USERS.forEach(user=>[user?.cidade,...(user?.cidadesAtuacao||[])].filter(Boolean).forEach(value=>{const part=locationParts(value);if(part?.city){const raw=String(part.city)+(part.uf?'/'+part.uf:'');values.set(normalizeUserSearch(raw),raw);}}));
  return [...values.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function chatRefreshChannelList(){
  const list=document.getElementById('chat-channel-list');if(!list)return;
  list.innerHTML=chatChannelListMarkup();
}
function chatChannelListMarkup(){
  if(!CHAT_CHANNELS.length)return '<div class="chat-empty-small">Nenhum canal disponível para seu perfil.</div>';
  return CHAT_CHANNELS.map(channel=>`<button type="button" class="chat-channel-item ${CHAT_ACTIVE_CHANNEL_ID===channel.id?'is-active':''}" onclick="chatOpenChannel('${channel.id}')"><span class="chat-channel-icon">${channel.audience_type==='survey'?'⌁':channel.audience_type==='support'?'◉':'✉'}</span><span class="chat-channel-copy"><b>${esc(channel.name)}</b><small>${esc(chatChannelDescription(channel))}</small>${channel.last_message_at?`<time>${esc(new Date(channel.last_message_at).toLocaleString('pt-BR'))}</time>`:''}</span></button>`).join('');
}
function chatMessageMarkup(message){
  const own=message.sender_id===CURRENT_PROFILE?.id;
  return `<article class="chat-message ${own?'is-own':''}" data-chat-message-id="${esc(message.id)}"><div class="chat-message-avatar">${esc(initialsOf(message.sender_name))}</div><div class="chat-message-content"><div class="chat-message-meta"><b>${own?'Você':esc(message.sender_name)}</b><time>${esc(new Date(message.created_at).toLocaleString('pt-BR'))}</time></div><p>${esc(message.body).replace(/\n/g,'<br>')}</p></div></article>`;
}
function chatRenderMessages(){
  const box=document.getElementById('chat-messages');if(!box)return;
  box.innerHTML=CHAT_MESSAGES.length?CHAT_MESSAGES.map(chatMessageMarkup).join(''):'<div class="chat-empty-room"><span>✉</span><b>Nenhuma mensagem ainda</b><small>Envie a primeira mensagem para iniciar esta conversa.</small></div>';
  box.scrollTop=box.scrollHeight;
}
function chatAppendMessage(message){
  if(!message||CHAT_MESSAGES.some(item=>item.id===message.id))return;
  CHAT_MESSAGES.push(message);CHAT_MESSAGES.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  chatRenderMessages();
  const input=document.getElementById('chat-message-input');if(input)input.focus();
}
async function ensurePrivateSupportChatIfNeeded(){
  if(!['cliente','pesq'].includes(CURRENT_PROFILE?.role)||CHAT_SUPPORT_READY||CHAT_SUPPORT_LOADING)return;
  CHAT_SUPPORT_LOADING=true;
  try{
    const {data,error}=await sb.rpc('get_or_create_private_support_chat');
    if(error){if(/get_or_create_private_support_chat|chat_channels|relation .* does not exist|schema cache/i.test(error.message||'')){CHAT_SCHEMA_MISSING=true;}throw error;}
    CHAT_SUPPORT_CHANNEL_ID=data?.id||null;CHAT_SUPPORT_READY=true;CHAT_CHANNELS_LOADED=false;CHAT_ACTIVE_CHANNEL_ID=CHAT_SUPPORT_CHANNEL_ID;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;
  }catch(ex){console.error('Erro ao preparar o chat privado:',ex);if(CHAT_SCHEMA_MISSING)CHAT_SUPPORT_READY=true;}
  CHAT_SUPPORT_LOADING=false;
  if(document.querySelector('.nav-item.on')?.dataset.key==='communication')go('communication');
}
async function loadChatChannelsIfNeeded(){
  if(CHAT_CHANNELS_LOADED||CHAT_CHANNELS_LOADING||!CURRENT_PROFILE)return;
  CHAT_CHANNELS_LOADING=true;
  try{
    const {data,error}=await sb.from('chat_channels').select('*').order('last_message_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
    if(error){if(/chat_channels|relation .* does not exist|schema cache/i.test(error.message||''))CHAT_SCHEMA_MISSING=true;throw error;}
    const privateSupportOnly=['cliente','pesq'].includes(CURRENT_PROFILE?.role);
    CHAT_CHANNELS=privateSupportOnly?(data||[]).filter(channel=>channel.audience_type==='support'&&channel.private_user_id===CURRENT_PROFILE.id):(data||[]);
    CHAT_CHANNELS_LOADED=true;
    if(CHAT_ACTIVE_CHANNEL_ID&&!CHAT_CHANNELS.some(channel=>channel.id===CHAT_ACTIVE_CHANNEL_ID))CHAT_ACTIVE_CHANNEL_ID=null;
    if(CHAT_PENDING_SURVEY_ID){
      const pending=CHAT_CHANNELS.find(channel=>channel.audience_type==='survey'&&channel.survey_id===CHAT_PENDING_SURVEY_ID);
      if(pending)CHAT_ACTIVE_CHANNEL_ID=pending.id;else if(['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role)){CHAT_NEW_AUDIENCE_TYPE='survey';CHAT_NEW_SURVEY_ID=CHAT_PENDING_SURVEY_ID;}
      CHAT_PENDING_SURVEY_ID=null;
    }
    if(!CHAT_ACTIVE_CHANNEL_ID&&CHAT_CHANNELS.length)CHAT_ACTIVE_CHANNEL_ID=CHAT_CHANNELS[0].id;
  }catch(ex){console.error('Erro ao carregar canais de chat:',ex);if(CHAT_SCHEMA_MISSING)CHAT_CHANNELS_LOADED=true;}
  CHAT_CHANNELS_LOADING=false;
  const key=document.querySelector('.nav-item.on')?.dataset.key;
  if(key==='communication')go('communication');
}
async function loadChatMessagesIfNeeded(){
  if(!CHAT_ACTIVE_CHANNEL_ID||CHAT_MESSAGES_LOADED||CHAT_MESSAGES_LOADING)return;
  CHAT_MESSAGES_LOADING=true;
  try{
    const {data,error}=await sb.from('chat_messages').select('*').eq('channel_id',CHAT_ACTIVE_CHANNEL_ID).order('created_at',{ascending:true}).limit(500);
    if(error){if(/chat_messages|relation .* does not exist|schema cache/i.test(error.message||''))CHAT_SCHEMA_MISSING=true;throw error;}
    CHAT_MESSAGES=data||[];CHAT_MESSAGES_LOADED=true;
    await sb.rpc('chat_mark_read',{p_channel_id:CHAT_ACTIVE_CHANNEL_ID});
  }catch(ex){console.error('Erro ao carregar mensagens:',ex);if(CHAT_SCHEMA_MISSING)CHAT_MESSAGES_LOADED=true;}
  CHAT_MESSAGES_LOADING=false;
  const key=document.querySelector('.nav-item.on')?.dataset.key;
  if(key==='communication')go('communication');
}
function chatStartRealtime(){
  if(CHAT_REALTIME_CHANNEL||!CURRENT_PROFILE||CHAT_SCHEMA_MISSING)return;
  CHAT_REALTIME_CHANNEL=sb.channel('pesquisapro-chat-'+CURRENT_PROFILE.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},payload=>{
      const message=payload.new;
      if(!CHAT_CHANNELS.some(channel=>channel.id===message.channel_id))return;
      const channel=CHAT_CHANNELS.find(item=>item.id===message.channel_id);if(channel)channel.last_message_at=message.created_at;
      if(message.channel_id===CHAT_ACTIVE_CHANNEL_ID)chatAppendMessage(message);
      else chatRefreshChannelList();
    }).subscribe();
}
function chatStopRealtime(){
  if(CHAT_REALTIME_CHANNEL){try{sb.removeChannel(CHAT_REALTIME_CHANNEL);}catch(ex){}CHAT_REALTIME_CHANNEL=null;}
}
function chatSetNewAudienceType(type){CHAT_NEW_AUDIENCE_TYPE=type||'all';go('communication');}
function chatNewAudienceFields(){
  if(CHAT_NEW_AUDIENCE_TYPE==='survey')return `<select class="inp" id="chat-new-survey" aria-label="Pesquisa do canal"><option value="">Selecione a pesquisa</option>${SURVEYS.map(s=>`<option value="${esc(s.id)}" ${CHAT_NEW_SURVEY_ID===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`;
  if(CHAT_NEW_AUDIENCE_TYPE==='region')return `<select class="inp" id="chat-new-value" aria-label="Região do canal"><option value="">Selecione a região</option>${CHAT_REGIONS.map(value=>`<option value="${value}">${value}</option>`).join('')}</select>`;
  if(CHAT_NEW_AUDIENCE_TYPE==='state')return `<select class="inp" id="chat-new-value" aria-label="Estado do canal"><option value="">Selecione o estado</option>${CHAT_STATES.map(value=>`<option value="${value}">${value}</option>`).join('')}</select>`;
  if(CHAT_NEW_AUDIENCE_TYPE==='city')return `<select class="inp" id="chat-new-value" aria-label="Cidade do canal"><option value="">Selecione a cidade</option>${chatLocationValues().map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select>`;
  return '<div class="chat-all-audience-note">Todos os usuários com acesso ao aplicativo poderão ver e responder neste canal.</div>';
}
function chatCreatePanel(){
  const staff=['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role);if(!staff)return '';
  return `<section class="card chat-create-card"><div class="card-t">Criar canal de comunicação</div><div class="card-d">Escolha um público amplo, uma localização específica ou os participantes de uma pesquisa.</div><div class="chat-create-grid"><input class="inp" id="chat-new-name" placeholder="Nome do canal, por exemplo: Avisos da coleta"><select class="inp" id="chat-new-type" aria-label="Público do canal" onchange="chatSetNewAudienceType(this.value)">${Object.entries(CHAT_AUDIENCE_LABELS).map(([value,label])=>`<option value="${value}" ${CHAT_NEW_AUDIENCE_TYPE===value?'selected':''}>${label}</option>`).join('')}</select><div id="chat-new-audience-field">${chatNewAudienceFields()}</div><button type="button" class="btn btn-fill" onclick="chatCreateChannel()">＋ Criar canal</button></div></section>`;
}
async function chatCreateChannel(){
  if(!['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role))return;
  const name=(document.getElementById('chat-new-name')?.value||'').trim(),type=document.getElementById('chat-new-type')?.value||CHAT_NEW_AUDIENCE_TYPE;
  const value=document.getElementById('chat-new-value')?.value||null,surveyId=document.getElementById('chat-new-survey')?.value||null;
  if(!name){alert('Informe um nome para o canal.');return;}
  if(type==='survey'&&!surveyId){alert('Selecione a pesquisa do canal.');return;}
  if(['region','state','city'].includes(type)&&!value){alert('Selecione a localização do canal.');return;}
  try{
    const {data,error}=await sb.rpc('chat_create_channel',{p_name:name,p_audience_type:type,p_audience_value:value,p_survey_id:surveyId});
    if(error)throw new Error(error.message);
    CHAT_CHANNELS_LOADED=false;CHAT_ACTIVE_CHANNEL_ID=data?.id||null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_NEW_AUDIENCE_TYPE='all';CHAT_NEW_SURVEY_ID=null;await loadChatChannelsIfNeeded();
  }catch(ex){alert('Não foi possível criar o canal. Execute a migration deploy/chat-comunicacao-segmentada.sql no Supabase e tente novamente.');console.error(ex);}
}
function chatOpenChannel(channelId){
  if(!CHAT_CHANNELS.some(channel=>channel.id===channelId))return;
  CHAT_ACTIVE_CHANNEL_ID=channelId;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;go('communication');
}
async function openResearcherSurveyChat(surveyId){
  CHAT_PENDING_SURVEY_ID=surveyId;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_CHANNELS_LOADED=false;
  go('communication');
  await loadChatChannelsIfNeeded();
}
function chatOpenSurveyChannel(surveyId){
  if(!CHAT_CHANNELS_LOADED){CHAT_PENDING_SURVEY_ID=surveyId;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=true;go('communication');return;}
  const existing=CHAT_CHANNELS.find(channel=>channel.audience_type==='survey'&&channel.survey_id===surveyId);
  if(existing){chatOpenChannel(existing.id);return;}
  if(['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role)){
    CHAT_NEW_AUDIENCE_TYPE='survey';CHAT_NEW_SURVEY_ID=surveyId;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=true;go('communication');
    return;
  }
  alert('O canal desta pesquisa ainda não foi criado pela gestão.');go('communication');
}
async function chatSendMessage(){
  if(CHAT_SENDING||!CHAT_ACTIVE_CHANNEL_ID)return;
  const input=document.getElementById('chat-message-input'),body=(input?.value||'').trim();if(!body)return;
  CHAT_SENDING=true;if(input)input.disabled=true;
  try{
    const {data,error}=await sb.rpc('chat_send_message',{p_channel_id:CHAT_ACTIVE_CHANNEL_ID,p_body:body});
    if(error)throw new Error(error.message);
    chatAppendMessage(data);const channel=CHAT_CHANNELS.find(item=>item.id===CHAT_ACTIVE_CHANNEL_ID);if(channel)channel.last_message_at=data.created_at;
    if(input){input.value='';input.disabled=false;input.focus();}
  }catch(ex){alert('Não foi possível enviar a mensagem: '+ex.message);if(input)input.disabled=false;}
  CHAT_SENDING=false;
}
function chatHandleKeydown(event){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSendMessage();}}
PAGES.communication=()=>{
  if(!CURRENT_PROFILE)return head('Comunicação','Entre no sistema para acessar o chat')+'<div class="empty">Faça login para acessar suas conversas.</div>';
  if(CHAT_SCHEMA_MISSING){const privateChat=['cliente','pesq'].includes(CURRENT_PROFILE.role);return head('Comunicação',privateChat?'Atendimento direto com a equipe PesquisaPro':'Canais de avisos, suporte e acompanhamento de pesquisas')+`<div class="callout warn chat-migration-callout"><b>Chat ainda não ativado.</b><br>O administrador precisa executar ${privateChat?'<code>deploy/chat-comunicacao-segmentada.sql</code> e <code>deploy/chat-atendimento-privado.sql</code>':'a migration <code>deploy/chat-comunicacao-segmentada.sql</code>'} no SQL Editor do Supabase. As migrations são aditivas e não apagam dados existentes.</div>`;}
  if(['cliente','pesq'].includes(CURRENT_PROFILE.role)&&!CHAT_SUPPORT_READY){ensurePrivateSupportChatIfNeeded();return head('Comunicação','Atendimento direto com a equipe PesquisaPro')+'<div class="empty">Preparando seu chat privado de atendimento…</div>';}
  if(!CHAT_CHANNELS_LOADED){loadChatChannelsIfNeeded();return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando canais de comunicação…</div>';}
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE.role)&&!SURVEYS_LOADED)return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando pesquisas para criar canais…</div>';
  if(CHAT_ACTIVE_CHANNEL_ID&&!CHAT_MESSAGES_LOADED){loadChatMessagesIfNeeded();return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando mensagens…</div>';}
  const active=CHAT_CHANNELS.find(channel=>channel.id===CHAT_ACTIVE_CHANNEL_ID)||null;
  if(active)chatStartRealtime();
  const isPrivateSupport=['cliente','pesq'].includes(CURRENT_PROFILE.role);
  const supportNotice=isPrivateSupport?'<div class="chat-support-banner"><span class="chat-support-banner-icon">◉</span><div><b>Atendimento PesquisaPro</b><p>Este é um chat privado para tirar dúvidas, receber orientações e relatar problemas da pesquisa. Apenas a equipe PesquisaPro administra o atendimento.</p></div></div>':'';
  return head('Comunicação',isPrivateSupport?'Fale diretamente com a equipe PesquisaPro':'Converse com equipes, pesquisadores e participantes de cada pesquisa')+`<div class="chat-page">${supportNotice}${chatCreatePanel()}<div class="chat-layout"><aside class="card chat-channel-panel"><div class="chat-panel-heading"><div><div class="card-t">${isPrivateSupport?'Atendimento':'Canais'}</div><div class="card-d">${isPrivateSupport?'Sua conversa privada com a equipe PesquisaPro.':'Você vê somente os canais permitidos para seu perfil.'}</div></div><span class="pill pill-blue">${CHAT_CHANNELS.length}</span></div><div id="chat-channel-list" class="chat-channel-list">${chatChannelListMarkup()}</div></aside><section class="card chat-room-panel">${active?`<header class="chat-room-header"><div><span class="eyebrow">${esc(chatAudienceLabel(active.audience_type))}</span><h2>${esc(active.name)}</h2><p>${esc(chatChannelDescription(active))}</p></div><span class="chat-live-pill"><i></i> Atualização ao vivo</span></header><div id="chat-messages" class="chat-messages" aria-live="polite">${CHAT_MESSAGES.length?CHAT_MESSAGES.map(chatMessageMarkup).join(''):'<div class="chat-empty-room"><span>✉</span><b>Nenhuma mensagem ainda</b><small>Envie a primeira mensagem para iniciar esta conversa.</small></div>'}</div><form class="chat-compose" onsubmit="event.preventDefault();chatSendMessage()"><textarea id="chat-message-input" class="inp" rows="2" maxlength="4000" placeholder="Escreva sua dúvida ou mensagem para a equipe PesquisaPro…" aria-label="Mensagem" onkeydown="chatHandleKeydown(event)"></textarea><button class="btn btn-fill" type="submit" ${CHAT_SENDING?'disabled':''}>Enviar</button></form>`:'<div class="chat-empty-room chat-no-selection"><span>✉</span><b>Selecione um canal</b><small>Escolha uma conversa na lista ao lado para visualizar e enviar mensagens.</small></div>'}</section></div></div>`;
};

/* ============ carregamento sob demanda de bibliotecas locais ============ */
const LOCAL_ASSETS={
  chart:{src:'vendor/chart.umd.js',ready:()=>typeof window.Chart!=='undefined'},
  qrcode:{src:'vendor/qrcode.min.js',ready:()=>typeof window.QRCode!=='undefined'},
  leaflet:{src:'vendor/leaflet.js',ready:()=>typeof window.L!=='undefined'},
  jspdf:{src:'vendor/jspdf.umd.min.js',ready:()=>typeof window.jspdf!=='undefined'}
};
const LOCAL_ASSET_PROMISES={};
let GOOGLE_MAPS_PROMISE=null;
function loadGoogleMaps(){
  if(window.google?.maps?.Map&&window.google?.maps?.visualization)return Promise.resolve();
  if(GOOGLE_MAPS_PROMISE)return GOOGLE_MAPS_PROMISE;
  const key=String(window.PESQUISAPRO_GOOGLE_MAPS_API_KEY||'').trim();
  if(!key||key.includes('__INSIRA'))return Promise.reject(new Error('Chave do Google Maps não configurada.'));
  GOOGLE_MAPS_PROMISE=new Promise((resolve,reject)=>{
    const callback='__pesquisaproGoogleMapsReady_'+Date.now();
    const timeout=setTimeout(()=>{delete window[callback];reject(new Error('Tempo esgotado ao carregar o Google Maps.'));},15000);
    window[callback]=()=>{clearTimeout(timeout);delete window[callback];resolve();};
    const script=document.createElement('script');
    script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=visualization&loading=async&callback='+callback;
    script.async=true;script.defer=true;script.dataset.ppGoogleMaps='1';
    script.onerror=()=>{clearTimeout(timeout);delete window[callback];reject(new Error('Não foi possível carregar o Google Maps.'));};
    document.head.appendChild(script);
  }).catch(error=>{GOOGLE_MAPS_PROMISE=null;throw error;});
  return GOOGLE_MAPS_PROMISE;
}
function loadLocalAsset(name){
  const asset=LOCAL_ASSETS[name];
  if(!asset)return Promise.reject(new Error('Ativo desconhecido: '+name));
  if(asset.ready())return Promise.resolve();
  if(LOCAL_ASSET_PROMISES[name])return LOCAL_ASSET_PROMISES[name];
  if(name==='leaflet'&&!document.querySelector('link[data-pp-leaflet]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='vendor/leaflet.css';link.dataset.ppLeaflet='1';
    document.head.appendChild(link);
  }
  LOCAL_ASSET_PROMISES[name]=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=asset.src;script.async=true;script.dataset.ppAsset=name;
    script.onload=()=>asset.ready()?resolve():reject(new Error('Ativo carregado sem expor '+name));
    script.onerror=()=>reject(new Error('Não foi possível carregar '+asset.src));
    document.head.appendChild(script);
  }).catch(error=>{delete LOCAL_ASSET_PROMISES[name];throw error;});
  return LOCAL_ASSET_PROMISES[name];
}

/* ============ helpers ============ */
/* Cálculo amostral defensivo: entradas inválidas não podem gerar Infinity/NaN
   nem quebrar cartões, tabelas ou gráficos quando o usuário ainda está digitando. */
function sampleSize(population,error,confidence,proportion){
  const N=Number(population),e=Number(error),Z=Number(confidence),pRaw=Number(proportion);
  if(!Number.isFinite(N)||N<=0||!Number.isFinite(e)||e<=0||e>=1||!Number.isFinite(Z)||Z<=0||!Number.isFinite(pRaw)||pRaw<=0||pRaw>=100)return 0;
  if(N<=1)return 1;
  const p=pRaw/100;
  const variance=Z*Z*p*(1-p);
  const denominator=e*e*(N-1)+variance;
  if(!Number.isFinite(denominator)||denominator<=0)return 0;
  return Math.max(1,Math.ceil((N*variance)/denominator));
}
let _wizCalcFrame=null,_sampleCalcFrame=null;
function scheduleFrame(callback,slot){
  if(slot.value!=null){
    if(window.cancelAnimationFrame)window.cancelAnimationFrame(slot.value);else clearTimeout(slot.value);
  }
  const run=()=>{slot.value=null;callback();};
  slot.value=window.requestAnimationFrame?window.requestAnimationFrame(run):setTimeout(run,0);
}
function scheduleWizCalc(){scheduleFrame(wizCalc,{get value(){return _wizCalcFrame;},set value(v){_wizCalcFrame=v;}});}
function scheduleSampleCalc(){scheduleFrame(calcSample,{get value(){return _sampleCalcFrame;},set value(v){_sampleCalcFrame=v;}});}
const ICON_SVG={
  '▤':'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9h8M8 12h8M8 15h5"/>',
  '✦':'<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/>',
  '❒':'<path d="M6 4h9l3 3v13H6V4Z"/><path d="M15 4v4h4M9 12h6M9 16h4"/>',
  '✓':'<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.3 2.3 4.8-5"/>',
  '∑':'<path d="M17 5H7l5.2 7L7 19h10"/><path d="M8 5h9M8 19h9"/>',
  '⬇':'<path d="M12 3v11M8 10l4 4 4-4"/><path d="M5 18v2h14v-2"/>',
  '▶':'<circle cx="12" cy="12" r="8"/><path d="m10 8 5 4-5 4V8Z"/>',
  '◫':'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 16v-3M12 16V8M16 16v-6"/>',
  '☺':'<circle cx="12" cy="8" r="3"/><path d="M6 20c.5-3.2 2.5-5 6-5s5.5 1.8 6 5"/>',
  '⚿':'<path d="M6 10h12v10H6z"/><path d="M9 10V8a3 3 0 0 1 6 0v2M12 14v3"/>',
  '$':'<rect x="4" y="6" width="16" height="13" rx="3"/><path d="M7 6V5h8l2 1M8 13h8M12 10v6"/>',
  '✎':'<path d="m5 17-.8 3 3-.8L18 8.4a2 2 0 0 0-2.8-2.8L5 17Z"/><path d="m13.5 7.5 3 3"/>',
  '⌂':'<path d="m4 11 8-7 8 7v8H4v-8Z"/><path d="M9 19v-5h6v5"/>',
  '↗':'<path d="M5 17 10 12l3 3 6-7"/><path d="M14 8h5v5"/>',
  '◷':'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  '☼':'<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  '⏻':'<path d="M12 3v9"/><path d="M7.1 6.8a7 7 0 1 0 9.8 0"/>',
  '☏':'<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>'
};
let ICON_UID=0;
function icon3d(token,color){
  const uid=++ICON_UID;
  const body=ICON_SVG[token]||ICON_SVG['❒'];
  return `<svg class="icon3d" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" style="--icon-color:${color};--icon-uid:${uid}"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</g><path d="M7 6.2c1.4-1.1 3.1-1.7 5-1.7" fill="none" stroke="#fff" stroke-opacity=".44" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
function head(title,desc,actions){
  return `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>${actions?`<div class="ph-actions">${actions}</div>`:''}</div>`;
}
function stat(label,val,sub,ico,color){
  return `<div class="stat"><div class="s-top"><span class="s-label">${label}</span>
    <span class="s-ico s-ico-3d" style="--icon-color:${color}">${icon3d(ico,color)}</span></div>
    <div class="s-val">${val}</div><div class="s-sub">${sub}</div></div>`;
}
function quota(label,done,total,color){
  const p=Math.round(done/total*100);
  return `<div class="quota-row"><span class="qr-label">${label}</span>
    <div class="qr-bar"><div class="bar"><span style="width:${p}%;background:${color}"></span></div></div>
    <span class="qr-num">${done}/${total}</span></div>`;
}

/* ============ DASHBOARD (admin/coord/gerente) ============ */
PAGES.dashboard=()=>{
  if(!CONTRACT_SETTINGS_LOADED){loadContractSettingsIfNeeded();return head('Painel geral','Visão consolidada da pesquisa eleitoral · Minas Gerais 2026')+'<div class="empty">Carregando a versão vigente do contrato…</div>';}
  if(!USERS_LOADED)loadUsersIfNeeded();
  if(['admin','admpro'].includes(selectedRole)&&!SIGNUPS_LOADED)loadSignupsIfNeeded();
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
  if(!ALL_CONTRACTS_LOADED)loadAllContractsIfNeeded();
  if(!COMPANY_SIGNATURE_LOADED)loadCompanySignatureIfNeeded();
  const emCampo=SURVEYS.filter(s=>s.status==='campo').length;
  const emEdicao=SURVEYS.filter(s=>s.status==='rascunho').length;
  const finalizadas=SURVEYS.filter(s=>s.status==='encerrada').length;
  const pesqAtivosList=USERS.filter(u=>u.role==='pesq'&&u.status==='ativo');
  const entrevistas=SURVEYS.reduce((sum,s)=>sum+surveyCollectedCount(s),0);
  const clientesAtendidos=USERS.filter(u=>u.role==='cliente'&&u.status==='ativo').length;
  const cadastrosAprovar=SIGNUPS.filter(s=>['novo','diligencia'].includes(s.status)).length;
  const signedIds=new Set(ALL_CONTRACTS.map(c=>c.researcher_id));
  const contratosPendentes=pesqAtivosList.filter(u=>!signedIds.has(u.id)).length;
  const isAdmin=selectedRole==='admin'||selectedRole==='admpro';
  return head('Painel geral','Visão consolidada da pesquisa eleitoral · Minas Gerais 2026')+`
  ${(isAdmin&&COMPANY_SIGNATURE_LOADED&&!COMPANY_SIGNATURE)?'<div class="callout mb">✎ O contrato-quadro dos pesquisadores ainda não foi assinado do lado do PesquisaPro (CONTRATANTE) — assine para que o contrato valha para os pesquisadores. <button class="btn-ghost" style="margin-left:6px" onclick="go(\'contracts\')">Assinar agora →</button></div>':''}
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Pesquisas em campo',String(emCampo),'coletando dados agora','▤','#2563eb')}
    ${stat('Pesquisas em edição',String(emEdicao),'ainda não publicadas','✎','#d97706')}
    ${stat('Pesquisas finalizadas',String(finalizadas),'coleta encerrada','✓','#059669')}
    ${stat('Pesquisadores ativos',String(pesqAtivosList.length),'cadastrados no sistema','☺','#7c3aed')}
  </div>
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Entrevistas realizadas',entrevistas.toLocaleString('pt-BR'),'coletadas através do aplicativo','◫','#0891b2')}
    ${stat('Clientes atendidos',String(clientesAtendidos),'com pesquisa em andamento','◆','#059669')}
    ${stat('Cadastros a aprovar',String(cadastrosAprovar),'pesquisadores aguardando aprovação','◷','#d97706')}
    ${stat('Contratos pendentes',String(contratosPendentes),'pesquisadores sem assinar','✒','#dc2626')}
  </div>
  <div class="card">
    <div class="card-t">Coletas por dia</div>
    <div class="card-d">Últimos 14 dias · todas as regionais</div>
    <div style="position:relative;height:230px"><canvas id="dashChart" role="img" aria-label="Gráfico de coletas diárias"></canvas></div>
  </div>`;
};

/* ============ DASHBOARD pesquisador ============
   Antes era uma tela 100% estática (nome "João" fixo, números fictícios).
   Agora usa dados reais do próprio pesquisador logado: collection_events
   (coletas dele), payments (o que já foi aprovado pra receber) e as cotas
   de verdade da pesquisa em que ele está atuando (via a mesma RPC
   survey_quota_counts usada em "Coletar (app)"). */
function isSameLocalDay(ts,ref){
  const a=new Date(ts);
  return a.getFullYear()===ref.getFullYear()&&a.getMonth()===ref.getMonth()&&a.getDate()===ref.getDate();
}
let DASH_QUOTA_SURVEY_ID=null,DASH_QUOTA_COUNTS={},DASH_QUOTA_LOADED=false,DASH_QUOTA_LOADING=false;
async function loadDashQuotasIfNeeded(){
  const s=acollectMySurveys()[0];
  if(!s){DASH_QUOTA_SURVEY_ID=null;DASH_QUOTA_LOADED=true;return;}
  if(DASH_QUOTA_SURVEY_ID!==s.id){DASH_QUOTA_SURVEY_ID=s.id;DASH_QUOTA_LOADED=false;}
  if(DASH_QUOTA_LOADED||DASH_QUOTA_LOADING)return;
  DASH_QUOTA_LOADING=true;
  DASH_QUOTA_COUNTS=await loadQuotaCounts(s.id);
  DASH_QUOTA_LOADED=true;DASH_QUOTA_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  if(onKey&&onKey.dataset.key==='dashboard-pesq')go('dashboard-pesq');
}
async function loadResearcherProfileCities(){
  if(!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq'||RESEARCHER_PROFILE_CITIES_LOADED||RESEARCHER_PROFILE_CITIES_LOADING)return;
  RESEARCHER_PROFILE_CITIES_LOADING=true;
  try{
    const {data,error}=await sb.from('profile_cidades_atuacao').select('cidade').eq('profile_id',CURRENT_PROFILE.id).order('cidade',{ascending:true});
    if(error)throw new Error(error.message);
    RESEARCHER_PROFILE_CITIES=(data||[]).map(row=>row.cidade).filter(Boolean).slice(0,5);
    RESEARCHER_PROFILE_CITIES_DRAFT=RESEARCHER_PROFILE_CITIES.slice();
    CURRENT_PROFILE.cidadesAtuacao=RESEARCHER_PROFILE_CITIES.slice();
  }catch(ex){console.error('Não foi possível carregar cidades do pesquisador:',ex);}
  finally{
    RESEARCHER_PROFILE_CITIES_LOADED=true;RESEARCHER_PROFILE_CITIES_LOADING=false;
    const key=document.querySelector('.nav-item.on')?.dataset.key;
    if(key==='researcher-profile')go(key);
  }
}
function researcherProfileCityKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function researcherProfileCitiesMarkup(){
  const selected=RESEARCHER_PROFILE_CITIES_DRAFT||[];
  const chips=selected.map(city=>`<span class="chip on" style="margin:2px">${esc(city)} <button type="button" class="chip-remove" aria-label="Remover ${esc(city)}" onclick="researcherProfileCityRemove('${esc(city).replace(/'/g,'&#39;')}')">×</button></span>`).join('')||'<span style="color:var(--ink3);font-size:12.5px">Nenhuma cidade selecionada.</span>';
  if(selected.length>=5)return `<div style="margin-bottom:8px">${chips}</div><div class="callout warn" style="font-size:12px">Limite de 5 cidades atingido. Remova uma para adicionar outra.</div>`;
  return `<div style="margin-bottom:8px">${chips}</div><input class="inp" id="researcher-profile-city-search" placeholder="Buscar cidade…" oninput="researcherProfileCitySearch(this.value)" autocomplete="off"><div id="researcher-profile-city-suggest" class="geo-box" style="display:none;margin-top:6px;max-height:170px"></div>`;
}
function researcherProfileCitySearch(query){
  const box=document.getElementById('researcher-profile-city-suggest');if(!box)return;
  const q=researcherProfileCityKey(String(query||'').trim());
  if(q.length<2){box.style.display='none';box.innerHTML='';return;}
  const all=Array.isArray(window.PP_PUBLIC_CITIES)?window.PP_PUBLIC_CITIES:[];
  const found=all.filter(city=>!RESEARCHER_PROFILE_CITIES_DRAFT.includes(city)&&researcherProfileCityKey(city).includes(q)).slice(0,8);
  box.innerHTML=found.length?found.map(city=>`<div class="geo-city-row" onclick="researcherProfileCityAdd('${esc(city).replace(/'/g,'&#39;')}')">${esc(city)}</div>`).join(''):'<div class="geo-city-row" style="cursor:default;color:var(--ink3)">Nenhuma cidade encontrada</div>';
  box.style.display='';
}
function researcherProfileCityAdd(city){
  if(!city||RESEARCHER_PROFILE_CITIES_DRAFT.includes(city))return;
  if(RESEARCHER_PROFILE_CITIES_DRAFT.length>=5){alert('Você pode escolher no máximo cinco cidades de atuação.');return;}
  RESEARCHER_PROFILE_CITIES_DRAFT.push(city);
  const wrap=document.getElementById('researcher-profile-cities-wrap');if(wrap)wrap.innerHTML=researcherProfileCitiesMarkup();
}
function researcherProfileCityRemove(city){
  RESEARCHER_PROFILE_CITIES_DRAFT=RESEARCHER_PROFILE_CITIES_DRAFT.filter(item=>item!==city);
  const wrap=document.getElementById('researcher-profile-cities-wrap');if(wrap)wrap.innerHTML=researcherProfileCitiesMarkup();
}
PAGES['researcher-profile']=()=>{
  if(CURRENT_PROFILE?.role!=='pesq')return head('Meus dados','Área disponível apenas para pesquisadores')+'<div class="empty">Este recurso está disponível no perfil de pesquisador.</div>';
  if(!RESEARCHER_PROFILE_CITIES_LOADED){loadResearcherProfileCities();return head('Meus dados','Carregando seus dados cadastrais…')+'<div class="empty">Carregando…</div>';}
  const p=CURRENT_PROFILE||{};
  return head('Meus dados','Corrija seus dados cadastrais e mantenha suas cidades de atuação atualizadas')+`<div class="researcher-profile-page">
    <div class="callout mb"><strong>Você pode corrigir seus dados pessoais e de contato.</strong> CPF, e-mail, status, aprovação e documentos oficiais permanecem protegidos e são atualizados somente pela gestão. O PIX é opcional e pode ser informado depois.</div>
    <div class="grid g2">
      <section class="card"><div class="card-t">Dados pessoais</div><div class="card-d">Atualize as informações usadas para contato e identificação.</div>
        <div class="field-row mb"><div><label class="lbl">Nome completo *</label><input class="inp" id="researcher-profile-name" value="${esc(p.name||'')}" autocomplete="name"></div><div><label class="lbl">Data de nascimento</label><input class="inp" id="researcher-profile-birth" type="date" value="${esc(p.birth||'')}"></div></div>
        <div class="field-row mb"><div><label class="lbl">CPF</label><input class="inp" value="${esc(p.cpf||'')}" disabled></div><div><label class="lbl">E-mail</label><input class="inp" value="${esc(p.email||'')}" disabled></div></div>
        <div><label class="lbl">Celular / WhatsApp *</label><input class="inp" id="researcher-profile-phone" value="${esc(p.phone||'')}" autocomplete="tel"></div>
      </section>
      <section class="card"><div class="card-t">Endereço</div><div class="card-d">Corrija o local onde você mora para manter seu cadastro atualizado.</div>
        <div class="mb"><label class="lbl">Cidade onde mora *</label><input class="inp" id="researcher-profile-cidade" value="${esc(p.cidade||'')}" placeholder="Cidade/UF"></div>
        <div class="field-row mb"><div><label class="lbl">Rua</label><input class="inp" id="researcher-profile-rua" value="${esc(p.rua||'')}"></div><div><label class="lbl">Número</label><input class="inp" id="researcher-profile-numero" value="${esc(p.numero||'')}"></div></div>
        <div><label class="lbl">CEP</label><input class="inp" id="researcher-profile-cep" value="${esc(p.cep||'')}" inputmode="numeric"></div>
      </section>
    </div>
    <section class="card mb"><div class="card-t">Cidades em que pode atuar *</div><div class="card-d">Escolha de uma a cinco cidades. Essas informações ajudam a equipe a encontrar pesquisas compatíveis.</div><div id="researcher-profile-cities-wrap">${researcherProfileCitiesMarkup()}</div></section>
    <section class="card mb researcher-profile-chat-card"><div><div class="card-t">Atendimento PesquisaPro</div><div class="card-d">Fale diretamente com a equipe PesquisaPro em um chat privado para tirar dúvidas, receber orientações e relatar problemas de execução.</div></div><button class="btn btn-out" onclick="go('communication')">✉ Abrir chat privado</button></section>
    <section class="card mb"><div class="card-t">Dados de pagamento <span class="pill pill-gray">Opcional</span></div><div class="card-d">Você pode informar ou corrigir o PIX agora ou depois. Ele será usado somente para repasses aprovados.</div>
      <div class="field-row mb"><div><label class="lbl">Chave PIX</label><input class="inp" id="researcher-profile-pix-key" value="${esc(p.pix_key||'')}" placeholder="CPF, e-mail, celular ou chave aleatória"></div><div><label class="lbl">Banco</label><input class="inp" id="researcher-profile-pix-bank" value="${esc(p.pix_bank||'')}"></div></div>
      <div class="field-row"><div><label class="lbl">CPF/CNPJ do titular</label><input class="inp" id="researcher-profile-pix-doc" value="${esc(p.pix_doc||'')}"></div><div><label class="lbl">Agência / conta</label><input class="inp" id="researcher-profile-pix-account" value="${esc([p.pix_ag,p.pix_acc].filter(Boolean).join(' / '))}"></div></div>
    </section>
    <div class="researcher-profile-actions"><button class="btn btn-fill" onclick="saveResearcherOwnProfile()" ${RESEARCHER_PROFILE_SAVING?'disabled':''}>${RESEARCHER_PROFILE_SAVING?'Salvando…':'Salvar meus dados'}</button><button class="btn btn-out" onclick="go('dashboard-pesq')">Cancelar</button></div>
  </div>`;
};
async function saveResearcherOwnProfile(){
  if(RESEARCHER_PROFILE_SAVING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return;
  const get=id=>(document.getElementById(id)?.value||'').trim();
  const name=get('researcher-profile-name'),birth=get('researcher-profile-birth'),phone=get('researcher-profile-phone'),cidade=get('researcher-profile-cidade'),rua=get('researcher-profile-rua'),numero=get('researcher-profile-numero'),cep=get('researcher-profile-cep');
  const cities=(RESEARCHER_PROFILE_CITIES_DRAFT||[]).filter(Boolean).slice(0,5);
  if(!name||!phone||!cidade){alert('Preencha nome completo, celular e cidade onde mora.');return;}
  if(!cities.length){alert('Escolha pelo menos uma cidade em que pode atuar.');return;}
  RESEARCHER_PROFILE_SAVING=true;go('researcher-profile');
  try{
    const account=(get('researcher-profile-pix-account')||'').split('/').map(v=>v.trim());
    const {error}=await sb.rpc('update_my_researcher_profile',{p_name:name,p_birth:birth||null,p_phone:phone,p_cidade:cidade,p_rua:rua||null,p_numero:numero||null,p_cep:cep||null,p_pix_key:get('researcher-profile-pix-key')||null,p_pix_doc:get('researcher-profile-pix-doc')||null,p_pix_bank:get('researcher-profile-pix-bank')||null,p_pix_ag:account[0]||null,p_pix_acc:account.slice(1).join(' / ')||null,p_cidades: cities});
    if(error)throw new Error(error.message);
    CURRENT_PROFILE.name=name;CURRENT_PROFILE.birth=birth;CURRENT_PROFILE.phone=phone;CURRENT_PROFILE.cidade=cidade;CURRENT_PROFILE.rua=rua;CURRENT_PROFILE.numero=numero;CURRENT_PROFILE.cep=cep;CURRENT_PROFILE.pix_key=get('researcher-profile-pix-key');CURRENT_PROFILE.pix_doc=get('researcher-profile-pix-doc');CURRENT_PROFILE.pix_bank=get('researcher-profile-pix-bank');CURRENT_PROFILE.pix_ag=account[0]||'';CURRENT_PROFILE.pix_acc=account.slice(1).join(' / ');RESEARCHER_PROFILE_CITIES=cities.slice();RESEARCHER_PROFILE_CITIES_DRAFT=cities.slice();
    document.getElementById('tbName').textContent=name;document.getElementById('tbAvatar').textContent=initialsOf(name);alert('Seus dados foram atualizados.');
  }catch(ex){alert('Não foi possível salvar seus dados agora: '+ex.message);}
  finally{RESEARCHER_PROFILE_SAVING=false;go('researcher-profile');}
}
function researcherBadgePublicUrl(){
  const token=CURRENT_PROFILE?.badge_public_token||CURRENT_PROFILE?.badgePublicToken;
  if(!token)return '';
  const url=new URL('cracha.html',window.location.href);
  url.searchParams.set('codigo',token);
  return url.href;
}
function researcherBadgePhotoUrl(){
  const path=CURRENT_PROFILE?.badge_photo_path||CURRENT_PROFILE?.badgePhotoPath;
  if(!path)return '';
  if(/^https?:\/\//i.test(path))return path;
  return sb.storage.from('researcher-badge-photos').getPublicUrl(path).data?.publicUrl||'';
}
function renderResearcherBadgeQr(){
  const box=document.getElementById('researcher-badge-qr');
  const url=researcherBadgePublicUrl();
  if(!box||!url)return;
  const draw=()=>{
    box.innerHTML='';
    try{new QRCode(box,{text:url,width:190,height:190,colorDark:'#102a56',colorLight:'#ffffff'});return true;}catch(e){return false;}
  };
  if(typeof window.QRCode!=='undefined'&&draw())return;
  box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code carregando">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">carregando…</div></div>';
  loadLocalAsset('qrcode').then(()=>{if(document.getElementById('researcher-badge-qr')===box&&!draw())throw new Error('QR Code inválido');})
    .catch(()=>{if(document.getElementById('researcher-badge-qr')===box)box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code indisponível">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">indisponível</div></div>';});
}
async function uploadResearcherBadgePhoto(input){
  const file=input?.files?.[0];
  if(!file||!CURRENT_PROFILE?.id)return;
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){alert('Escolha uma foto JPG, PNG ou WebP.');input.value='';return;}
  if(file.size>5*1024*1024){alert('A foto deve ter no máximo 5 MB.');input.value='';return;}
  RESEARCHER_BADGE_UPLOADING=true;
  const currentKey=document.querySelector('[data-badge-upload-label]');
  if(currentKey)currentKey.textContent='Enviando foto…';
  try{
    const ext=(file.type.split('/')[1]||'jpg').replace('jpeg','jpg');
    const random=window.crypto?.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
    const path='profiles/'+CURRENT_PROFILE.id+'/'+random+'.'+ext;
    const {error:uploadError}=await sb.storage.from('researcher-badge-photos').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw new Error(uploadError.message);
    const {data,error:updateError}=await sb.from('profiles').update({badge_photo_path:path}).eq('id',CURRENT_PROFILE.id).select('badge_photo_path').single();
    if(updateError)throw new Error(updateError.message);
    CURRENT_PROFILE.badge_photo_path=data?.badge_photo_path||path;
    CURRENT_PROFILE.badgePhotoPath=CURRENT_PROFILE.badge_photo_path;
    alert('Foto do crachá atualizada.');
    go('researcher-badge');
  }catch(ex){console.error(ex);alert('Não foi possível enviar a foto agora. Confira sua conexão e tente novamente.');}
  finally{RESEARCHER_BADGE_UPLOADING=false;if(input)input.value='';}
}
function downloadResearcherBadgeQr(){
  const canvas=document.querySelector('#researcher-badge-qr canvas');
  if(!canvas){alert('Aguarde o QR Code carregar.');return;}
  const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='cracha-pesquisapro-qr.png';a.click();
}
PAGES['researcher-badge']=()=>{
  if(CURRENT_PROFILE?.role!=='pesq')return head('Crachá virtual','Área disponível apenas para pesquisadores')+'<div class="empty">Este recurso está disponível no perfil de pesquisador.</div>';
  const name=esc(CURRENT_PROFILE.name||'Pesquisador');
  const photo=researcherBadgePhotoUrl();
  const publicUrl=researcherBadgePublicUrl();
  setTimeout(renderResearcherBadgeQr,0);
  return head('Crachá virtual','Mostre que você faz parte da rede de pesquisadores do PesquisaPro')+`<div class="researcher-badge-page">
    <div class="card researcher-badge-intro mb"><div><span class="eyebrow">IDENTIFICAÇÃO DE CAMPO</span><h2>Seu crachá digital</h2><p>Compartilhe o QR Code com a pessoa entrevistada. Ela poderá confirmar seu nome e seu vínculo ativo com o PesquisaPro, sem acessar seus dados pessoais.</p></div><span class="researcher-badge-status">✓ Perfil verificável</span></div>
    <div class="grid g2 researcher-badge-layout mb">
      <section class="card researcher-badge-card" aria-label="Prévia do crachá">
        <div class="researcher-badge-card-head"><span class="researcher-badge-brand">▣ PesquisaPro</span><span class="researcher-badge-check">PESQUISADOR</span></div>
        <div class="researcher-badge-main"><div class="researcher-badge-photo-wrap">${photo?`<img src="${esc(photo)}" alt="Foto de ${name}">`:'<span class="researcher-badge-photo-empty">Foto</span>'}</div><div><h3>${name}</h3><p>Pesquisador de campo</p><strong>✓ Vínculo ativo</strong></div></div>
        <div class="researcher-badge-card-foot"><span>Valide pelo QR Code</span><span>PesquisaPro</span></div>
      </section>
      <section class="card researcher-badge-qr-card"><div class="card-t">QR Code de verificação</div><div class="card-d">Aponte a câmera do celular para abrir a página pública de validação.</div><div id="researcher-badge-qr" class="researcher-badge-qr" aria-live="polite"></div><div class="researcher-badge-url">${publicUrl?esc(publicUrl):'Execute a migration do crachá para gerar o código público.'}</div><div class="researcher-badge-actions"><button class="btn btn-accent" onclick="downloadResearcherBadgeQr()">Baixar QR Code</button>${publicUrl?`<a class="btn btn-ghost" href="${esc(publicUrl)}" target="_blank" rel="noopener">Abrir verificação</a>`:''}</div></section>
    </div>
    <section class="card researcher-badge-photo-panel mb"><div><div class="card-t">Sua foto</div><div class="card-d">Use uma foto frontal, nítida e atualizada. Ela será exibida somente na página pública de validação do seu crachá.</div></div><label class="btn btn-ghost researcher-badge-upload" data-badge-upload-label="">${RESEARCHER_BADGE_UPLOADING?'Enviando foto…':'Escolher foto'}<input type="file" accept="image/jpeg,image/png,image/webp" onchange="uploadResearcherBadgePhoto(this)" hidden></label><small>JPG, PNG ou WebP · máximo 5 MB</small></section>
    <div class="researcher-badge-privacy"><strong>Privacidade:</strong> o QR Code não mostra CPF, e-mail, telefone, endereço, documentos ou dados financeiros. Ele serve apenas para confirmar que o crachá pertence a um pesquisador ativo do PesquisaPro.</div>
  </div>`;
};

PAGES['researcher-guide']=()=>{
  const primeiroNome=(CURRENT_PROFILE&&CURRENT_PROFILE.name)?CURRENT_PROFILE.name.trim().split(' ')[0]:'';
  return head('Orientações para coleta',primeiroNome?('Olá '+primeiroNome+' — aprenda a coletar com segurança e qualidade'):'Aprenda a coletar com segurança e qualidade')+`
  <div class="researcher-guide-page">
    <div class="researcher-guide-hero card mb">
      <div class="guide-hero-copy">
        <span class="eyebrow">GUIA DO PESQUISADOR</span>
        <h2>Como realizar uma coleta completa no PesquisaPro</h2>
        <p>Assista ao tutorial e consulte o passo a passo antes de sair a campo. O objetivo é garantir localização correta, respeito às cotas, qualidade da entrevista e envio sem perda de dados.</p>
        <div class="guide-hero-actions">
          <button class="btn btn-accent" onclick="document.getElementById('researcher-guide-video')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('researcher-guide-video')?.play().catch(()=>{})">▶ Assistir ao tutorial</button>
          <button class="btn btn-ghost" onclick="go('app-collect')">Abrir app de coleta →</button>
        </div>
      </div>
      <div class="guide-hero-badge"><span class="guide-badge-icon">✓</span><strong>Coleta validada</strong><small>GPS, cota e envio conferidos</small></div>
    </div>
    <div class="card mb guide-video-card">
      <div class="card-t">Vídeo tutorial</div>
      <div class="card-d">Veja como iniciar uma coleta, escolher a cota, finalizar a entrevista e enviar os dados.</div>
      <div class="guide-video-frame">
        <video id="researcher-guide-video" controls playsinline preload="metadata" poster="assets/pesquisa-pro-orientacoes-coleta-poster.svg" aria-label="Tutorial de uso do aplicativo de coleta">
          <source src="assets/pesquisa-pro-orientacoes-coleta.mp4" type="video/mp4">
          Seu navegador não conseguiu carregar o vídeo. Use o passo a passo abaixo ou atualize a página.
        </video>
        <div class="guide-video-fallback"><strong>Vídeo em carregamento</strong><span>Se a conexão estiver lenta, siga o guia rápido abaixo.</span></div>
      </div>
    </div>
    <div class="guide-section-title"><span class="eyebrow">PASSO A PASSO</span><h3>Faça a coleta na ordem correta</h3><p>Use esta sequência em todas as entrevistas para reduzir erros e evitar retrabalho.</p></div>
    <div class="guide-step-grid">
      ${[['01','Prepare o celular','Ative o GPS, permita a localização no navegador, confira a internet e mantenha a bateria suficiente para o trabalho.'],['02','Escolha a pesquisa','No menu, abra “Coletar (app)” e confirme se a pesquisa exibida é a correta antes de iniciar.'],['03','Selecione a cota','Toque em uma cota disponível. A instrução “1º selecione uma cota” deve desaparecer antes de iniciar.'],['04','Confirme a localização','A coleta exige georreferenciamento. Aguarde o status de localização ativa e permaneça no local da entrevista.'],['05','Aplique o questionário','Leia as perguntas com neutralidade, registre respostas verdadeiras e não pule campos obrigatórios.'],['06','Finalize e envie','Revise a entrevista, responda à confirmação final se aparecer, envie e aguarde a confirmação do servidor.']].map(([n,t,d])=>`<article class="guide-step"><span class="guide-step-num">${n}</span><div><h4>${t}</h4><p>${d}</p></div></article>`).join('')}
    </div>
    <div class="grid g2 guide-lower-grid">
      <div class="card guide-checklist"><div class="card-t">Antes de enviar, confira</div><div class="card-d">Uma revisão de 20 segundos evita a maioria dos problemas.</div><label><input type="checkbox"> A cota escolhida corresponde ao perfil entrevistado</label><label><input type="checkbox"> A localização está ativa e atualizada</label><label><input type="checkbox"> As respostas foram conferidas com o entrevistado</label><label><input type="checkbox"> A tela confirmou o envio ao servidor</label></div>
      <div class="card guide-support"><div class="card-t">Se algo não funcionar</div><div class="card-d">Não tente repetir várias vezes sem conferir o motivo.</div><div class="guide-support-row"><span>GPS bloqueado</span><strong>Ative a localização e recarregue a página.</strong></div><div class="guide-support-row"><span>Sem cota</span><strong>Verifique se você entrou na pesquisa correta.</strong></div><div class="guide-support-row"><span>Envio pendente</span><strong>Mantenha a página aberta até confirmar o servidor.</strong></div><button class="btn btn-ghost" onclick="go('app-collect')">Voltar para a coleta →</button></div>
    </div>
    <div class="guide-note"><strong>Importante:</strong> nunca compartilhe sua senha, não altere respostas para atingir a meta e procure a coordenação quando houver dúvida sobre uma cota ou abordagem.</div>
  </div>`;
};

function researcherAvailableSurveysMarkup(surveys){
  if(!surveys.length)return `<section class="researcher-available-surveys card mb" aria-labelledby="researcher-available-title"><div class="researcher-available-head"><div><span class="eyebrow">COLETA DE CAMPO</span><h2 id="researcher-available-title">Pesquisas disponíveis para coleta</h2><p>Quando uma pesquisa for liberada e você fizer parte da equipe, ela aparecerá aqui.</p></div><span class="researcher-available-count">0 disponíveis</span></div><div class="researcher-available-empty"><span>⌁</span><div><strong>Nenhuma pesquisa disponível agora</strong><small>Aguarde um convite ou a liberação de uma pesquisa pela coordenação.</small></div></div></section>`;
  const cards=surveys.map(s=>{
    const sample=Number(surveySample(s)||0).toLocaleString('pt-BR');
    const price=Number(s.price)||0;
    return `<article class="researcher-available-item"><div class="researcher-available-item-main"><span class="researcher-available-icon">▣</span><div><div class="researcher-available-item-title"><strong>${esc(s.name)}</strong><span class="pill pill-green">● Em campo</span></div><p>${esc(s.tipo||'Pesquisa de opinião')} · Amostra de ${sample} entrevistas</p><small>${price?brl(price)+' por entrevista aprovada':'Remuneração definida pela coordenação'}</small></div></div><div class="researcher-available-item-action"><span class="researcher-available-location">📍 Coleta com GPS obrigatório</span><button class="btn btn-accent" type="button" onclick="researcherStartCollection('${esc(s.id)}')">▶ Iniciar coleta</button></div></article>`;
  }).join('');
  return `<section class="researcher-available-surveys card mb" aria-labelledby="researcher-available-title"><div class="researcher-available-head"><div><span class="eyebrow">COLETA DE CAMPO</span><h2 id="researcher-available-title">Pesquisas disponíveis para coleta</h2><p>Escolha uma pesquisa e inicie a coleta diretamente pelo botão abaixo.</p></div><span class="researcher-available-count">${surveys.length} ${surveys.length===1?'disponível':'disponíveis'}</span></div><div class="researcher-available-list">${cards}</div></section>`;
}
function researcherStartCollection(surveyId){
  if(!surveyId)return;
  ACOLLECT_SURVEY_ID=surveyId;
  ACOLLECT_SELECTED_QUOTA=null;
  go('app-collect');
}

PAGES['dashboard-pesq']=()=>{
  if(!CONTRACT_SETTINGS_LOADED){loadContractSettingsIfNeeded();return head('Meu painel','Acompanhe suas metas e ganhos')+'<div class="empty">Carregando a versão vigente do contrato…</div>';}
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
  if(!MY_CONTRACT_LOADED)loadMyContractIfNeeded();
  if(!MY_INVITES_LOADED)loadMyInvitesIfNeeded();
  loadPushStatusIfNeeded();
  loadMySurveyCommunicationsIfNeeded();
  const primeiroNome=(CURRENT_PROFILE&&CURRENT_PROFILE.name)?CURRENT_PROFILE.name.trim().split(' ')[0]:'';
  const subtitulo=primeiroNome?('Olá '+primeiroNome+' — acompanhe suas metas e ganhos'):'Acompanhe suas metas e ganhos';
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED){
    return head('Meu painel',subtitulo)+'<div class="empty">Carregando seus dados…</div>';
  }
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const myPayments=PAYMENTS.filter(p=>p.researcherId===myId);
  const aReceber=myPayments.filter(p=>p.status==='aprovado').reduce((sum,p)=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);return sum+p.valid*(s?+s.price:0);
  },0);
  const ganhosEmAnalise=myPayments.filter(p=>p.status!=='aprovado').reduce((sum,p)=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);return sum+p.valid*(s?+s.price:0);
  },0);
  const entrevistasAprovadas=myPayments.reduce((sum,p)=>sum+(Number(p.valid)||0),0);
  const surveysMine=acollectMySurveys();
  const earningsHtml=`<section class="researcher-earnings-hero" aria-labelledby="researcher-earnings-title"><div class="researcher-earnings-copy"><span class="eyebrow">SEU DESEMPENHO</span><h2 id="researcher-earnings-title">Ganhos com pesquisas</h2><p>Valor das entrevistas aprovadas pela auditoria.</p><strong class="researcher-earnings-value">${brl(aReceber)}</strong></div><div class="researcher-earnings-side"><div class="researcher-earnings-metric"><span>Entrevistas aprovadas</span><strong>${entrevistasAprovadas}</strong></div><div class="researcher-earnings-metric"><span>Em análise</span><strong>${brl(ganhosEmAnalise)}</strong></div><button class="btn btn-ghost" type="button" onclick="go('my-earnings')">Ver meus ganhos →</button></div></section>`;
  const invitesHtml=(MY_INVITES_LOADED&&MY_INVITES.length)?`<div class="card mb">
    <div class="card-t">Convite${MY_INVITES.length>1?'s':''} para pesquisa${MY_INVITES.length>1?'s':''}</div>
    <div class="card-d">Você foi convidado(a) pelo administrador — aceite para entrar na equipe e liberar a coleta.</div>
    ${MY_INVITES.map(inv=>{
      const sv=SURVEYS.find(x=>x.id===inv.survey_id);
      const busy=MY_INVITE_RESPONDING===inv.id;
      const focused=INVITE_FOCUS_ID===inv.id;
      return `<div class="approve-row ${focused?'invite-focus':''}">
        <div class="avatar" style="width:30px;height:30px;font-size:11px">${(sv?sv.name:'?').slice(0,2).toUpperCase()}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(sv?sv.name:'Pesquisa')}</div>
          <div style="font-size:11px;color:var(--ink3)">${sv?esc(sv.tipo||''):'carregando…'}${focused?' · convite aberto pelo link':''}</div></div>
        <button class="btn-ghost" style="color:var(--teal)" ${busy?'disabled':''} onclick="respondMyInvite('${inv.id}',true)">${busy?'Enviando…':focused?'Aceitar e entrar na equipe':'Aceitar'}</button>
        <button class="btn-ghost" style="color:var(--red)" ${busy?'disabled':''} onclick="respondMyInvite('${inv.id}',false)">Recusar</button>
      </div>`;
    }).join('')}
  </div>`:'';
  return head('Meu painel',subtitulo)+`
  ${earningsHtml}
  ${mySurveyCommunicationsMarkup()}
  ${researcherAvailableSurveysMarkup(surveysMine)}
  ${invitesHtml}
  ${researcherPushCard()}
  ${(MY_CONTRACT_LOADED&&!MY_CONTRACT)?'<div class="callout mb">✎ Você ainda não assinou seu contrato de prestação de serviços — assine para poder coletar. <button class="btn-ghost" style="margin-left:6px" onclick="go(\'my-contract\')">Assinar agora →</button></div>':''}
  `;
};

/* ============ ÁREA DO CLIENTE ============
   Quando quem está logado é de verdade um cliente (login real via Supabase
   Auth), usamos o próprio CURRENT_PROFILE — nunca o array de referência local
   USERS (que só é carregado para sessões de staff) nem um índice fixo. A
   pesquisa do cliente é achada pelo id real dele em survey_clients
   (SURVEYS[].clientIds), não por casamento de nome. */
function clientSelf(){
  if(CURRENT_PROFILE&&CURRENT_PROFILE.role==='cliente')return profileRowToUser(CURRENT_PROFILE);
  return clienteUsers()[CLIENT_SELF_IDX]; // fallback só usado fora de uma sessão real de cliente
}
let ACTIVE_CAMPAIGN_ID=null;
let CLIENT_SURVEY_VIEW_ID=null;
let CAMPAIGN_SWITCHER_VIEW_ID=null;
function campaignSurveysForCurrentUser(){
  if(!CURRENT_PROFILE)return[];
  if(CURRENT_PROFILE.role==='cliente'){
    const client=clientSelf();
    return SURVEYS.filter(s=>(s.clientIds||[]).includes(CURRENT_PROFILE.id)||(client?.surveys||[]).includes(s.name));
  }
  if(CURRENT_PROFILE.role==='pesq')return typeof acollectMySurveys==='function'?acollectMySurveys():[];
  return SURVEYS.filter(s=>s.status!=='encerrada');
}
function activeCampaignSurvey(){
  const available=campaignSurveysForCurrentUser();
  return available.find(s=>s.id===ACTIVE_CAMPAIGN_ID)||available[0]||null;
}
function updateCampaignSwitcherButton(){
  const button=document.getElementById('campaignSwitcherBtn');
  if(!button)return;
  if(CURRENT_PROFILE?.role==='cliente'){button.hidden=true;button.setAttribute('aria-hidden','true');return;}
  button.hidden=false;button.removeAttribute('aria-hidden');
  const active=activeCampaignSurvey();
  button.textContent=active?`Trocar pesquisa · ${active.name.length>24?active.name.slice(0,24)+'…':active.name} ▾`:'Trocar pesquisa ▾';
  button.title=active?'Pesquisa atual: '+active.name:'Selecione uma pesquisa ou campanha';
}
function campaignDateLabel(value){
  if(!value)return 'Não informado';
  const date=new Date(value+'T00:00:00');
  return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('pt-BR');
}
function campaignLocationLabel(s){
  const states=(s.estados||[]).filter(Boolean);
  const cities=Object.values(s.cidades||{}).flat().filter(Boolean);
  const detail=[];
  if(states.length)detail.push(states.join(', '));
  if(cities.length)detail.push(cities.length>8?cities.slice(0,8).join(', ')+' e mais '+(cities.length-8):cities.join(', '));
  return (ABRANGENCIA_LABELS[s.abrangencia]||'Abrangência não informada')+(detail.length?' · '+detail.join(' · '):'');
}
function campaignSwitcherListMarkup(available,active){
  return available.map(s=>`<button type="button" class="campaign-switcher-option ${active?.id===s.id?'is-active':''}" onclick="viewCampaignDetails('${esc(s.id)}')"><span class="campaign-switcher-option-icon">⌁</span><span><strong>${esc(s.name)}</strong><small>${esc(s.tipo||'Pesquisa de opinião')} · ${esc(STATUS_LABEL?.[s.status]||'Disponível')}</small></span><span class="campaign-switcher-check">›</span></button>`).join('');
}
function campaignDetailsMarkup(s,active){
  const isClient=CURRENT_PROFILE?.role==='cliente';
  const released=isClient&&clientResultsReleasedForSurvey(clientSelf(),s);
  const sample=Number(surveySample(s)||0).toLocaleString('pt-BR');
  const margin=s.err?`± ${Math.round(Number(s.err)*100)}%`:'Não informado';
  return `<button type="button" class="campaign-switcher-back" onclick="renderCampaignSwitcherBody()">← Ver todas as pesquisas</button><div class="campaign-details-hero"><div class="campaign-details-icon">⌁</div><div><span class="eyebrow">INFORMAÇÕES DA PESQUISA</span><h2>${esc(s.name)}</h2><p>${esc(s.tipo||'Pesquisa de opinião')} · <span class="pill ${s.status==='campo'?'pill-green':s.status==='encerrada'?'pill-blue':'pill-amber'}">${esc(STATUS_LABEL?.[s.status]||'Disponível')}</span></p></div></div><div class="campaign-details-grid"><div><span>Período</span><strong>${campaignDateLabel(s.dataIni)} a ${campaignDateLabel(s.dataFim)}</strong></div><div><span>Amostra prevista</span><strong>${sample} entrevistas</strong></div><div><span>Margem de erro</span><strong>${margin}</strong></div><div><span>Confiança</span><strong>${s.conf==='1.96'?'95%':esc(s.conf||'Não informado')}</strong></div><div class="campaign-details-wide"><span>Abrangência</span><strong>${esc(campaignLocationLabel(s))}</strong></div><div><span>Questionário</span><strong>${(s.questions||[]).length} ${(s.questions||[]).length===1?'pergunta':'perguntas'}</strong></div>${isClient?`<div><span>Resultados</span><strong>${released?'Liberados para visualização':'Ainda não liberados'}</strong></div>`:''}</div><div class="campaign-details-actions"><button type="button" class="btn btn-accent" onclick="selectCampaign('${esc(s.id)}')">${active?.id===s.id?'Acompanhar esta pesquisa':'Selecionar pesquisa'}</button>${isClient&&active?.id===s.id?'<button type="button" class="btn btn-ghost" onclick="closeCampaignSwitcher();go(\'client-progress\')">Abrir andamento →</button>':''}</div>`;
}
function renderCampaignSwitcherBody(){
  const body=document.getElementById('campaignSwitcherBody');if(!body)return;
  const available=campaignSurveysForCurrentUser();
  const active=activeCampaignSurvey();
  if(CAMPAIGN_SWITCHER_VIEW_ID){
    const viewed=available.find(s=>s.id===CAMPAIGN_SWITCHER_VIEW_ID);
    if(viewed){body.innerHTML=campaignDetailsMarkup(viewed,active);return;}
    CAMPAIGN_SWITCHER_VIEW_ID=null;
  }
  body.innerHTML=`<div class="campaign-switcher-heading"><span class="eyebrow">PESQUISAS DISPONÍVEIS</span><h2 id="campaignSwitcherTitle">Escolha uma pesquisa</h2><p>Clique em uma pesquisa para consultar suas informações antes de acompanhar os dados.</p></div>${available.length?`<div class="campaign-switcher-list">${campaignSwitcherListMarkup(available,active)}</div>`:'<div class="campaign-switcher-empty"><strong>Nenhuma pesquisa disponível para este perfil</strong><small>Quando uma pesquisa for vinculada ou liberada, ela aparecerá aqui.</small></div>'}`;
}
function viewCampaignDetails(surveyId){
  if(!campaignSurveysForCurrentUser().some(s=>s.id===surveyId))return;
  CAMPAIGN_SWITCHER_VIEW_ID=surveyId;renderCampaignSwitcherBody();
}
async function openCampaignSwitcher(){
  const modal=document.getElementById('campaignSwitcherModal'),body=document.getElementById('campaignSwitcherBody');
  if(!modal||!body)return;
  modal.hidden=false;
  body.innerHTML='<div class="campaign-switcher-loading"><span class="spinner"></span><b>Carregando pesquisas…</b><small>Buscando as pesquisas vinculadas ao seu perfil.</small></div>';
  if(!SURVEYS_LOADED)await loadSurveysIfNeeded();
  const available=campaignSurveysForCurrentUser();
  const active=activeCampaignSurvey();
  if(active&&!ACTIVE_CAMPAIGN_ID)ACTIVE_CAMPAIGN_ID=active.id;
  updateCampaignSwitcherButton();
  CAMPAIGN_SWITCHER_VIEW_ID=null;
  renderCampaignSwitcherBody();
  document.querySelector('.campaign-switcher-close')?.focus();
}
function closeCampaignSwitcher(){
  const modal=document.getElementById('campaignSwitcherModal');if(modal)modal.hidden=true;CAMPAIGN_SWITCHER_VIEW_ID=null;
}
function selectCampaign(surveyId){
  const available=campaignSurveysForCurrentUser();
  if(!available.some(s=>s.id===surveyId))return;
  ACTIVE_CAMPAIGN_ID=surveyId;
  closeCampaignSwitcher();
  updateCampaignSwitcherButton();
  const key=document.querySelector('.nav-item.on')?.dataset.key;
  if(key&&PAGES[key])go(key);
}
function clientSelfSurvey(){
  const c=clientSelf();if(!c)return null;
  if(CURRENT_PROFILE&&CURRENT_PROFILE.role==='cliente'){
    const linked=campaignSurveysForCurrentUser();
    return linked.find(s=>s.id===ACTIVE_CAMPAIGN_ID)||linked[0]||null;
  }
  return SURVEYS.find(s=>s.name===(c.surveys||[])[0])||null;
}
function clientResultsReleasedForSurvey(client,survey){
  if(!client||!survey)return false;
  const clientId=CURRENT_PROFILE?.id||client.id;
  const bySurvey=survey.clientReleaseById||{};
  return !!client.resultsReleased||!!(clientId&&bySurvey[clientId]===true);
}
function clientWithTimeout(request,label,timeoutMs=15000){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo esgotado ao carregar '+label+'.')),timeoutMs);});
  return Promise.race([Promise.resolve(request),timeout]).finally(()=>clearTimeout(timer));
}
let CLIENT_PROGRESS_CACHE={surveyId:null,summary:null,quotas:[]};
let CLIENT_PROGRESS_LOADING=false,CLIENT_PROGRESS_TIMER=null;
let CLIENT_RESEARCHER_PROGRESS_CACHE={surveyId:null,rows:[]};
let CLIENT_RESEARCHER_PROGRESS_LOADING=false;
function clientProgressStatus(done,target){
  const d=Number(done)||0,t=Number(target)||0;
  if(!t)return '<span class="pill pill-gray">Sem meta</span>';
  if(d>=t)return '<span class="pill pill-green">● Meta atingida</span>';
  if(d/t<0.5)return '<span class="pill pill-red">● Atenção</span>';
  return '<span class="pill pill-amber">● Em andamento</span>';
}
function clientProgressQuotaRows(s){
  const rows=CLIENT_PROGRESS_CACHE.quotas||[];
  if(!rows.length)return '<div class="empty" style="padding:15px 0">A pesquisa não possui cotas configuradas para exibição.</div>';
  const colors=['#2563eb','#059669','#ea580c','#7c3aed','#0891b2','#d97706'];
  return rows.map((row,i)=>quota(row.quotaLabel,Number(row.validCount)||0,Number(row.targetCount)||0,colors[i%colors.length])).join('');
}
function clientProgressCoverageRows(s){
  const rows=CLIENT_PROGRESS_CACHE.quotas||[];
  if(!rows.length)return '<tr><td colspan="4" class="empty">Nenhuma meta de cota real foi encontrada.</td></tr>';
  return rows.map(row=>`<tr><td><b>${esc(row.quotaLabel||'Sem cota')}</b><small style="display:block;color:var(--ink3);margin-top:3px">${esc(row.questionText||'Cota da pesquisa')}</small></td><td>${Number(row.validCount||0).toLocaleString('pt-BR')}</td><td>${Number(row.targetCount||0).toLocaleString('pt-BR')}</td><td>${clientProgressStatus(row.validCount,row.targetCount)}</td></tr>`).join('');
}
function clientResearcherProgressRows(){
  const rows=CLIENT_RESEARCHER_PROGRESS_CACHE.rows||[];
  if(!rows.length)return '<tr><td colspan="5" class="empty">Nenhum pesquisador possui coleta registrada nesta pesquisa.</td></tr>';
  return rows.map(row=>`<tr><td><b>${esc(row.researcherName||'Pesquisador não identificado')}</b></td><td>${Number(row.totalCount||0).toLocaleString('pt-BR')}</td><td><span class="pill pill-green">${Number(row.validCount||0).toLocaleString('pt-BR')}</span></td><td>${Number(row.rejectedCount||0).toLocaleString('pt-BR')}</td><td>${row.lastOccurredAt?new Date(row.lastOccurredAt).toLocaleString('pt-BR'):'—'}</td></tr>`).join('');
}
function clientResearcherProgressMarkup(){
  return `<section id="client-researcher-progress" class="card client-researcher-progress-card"><div class="map-panel-head"><div><div class="map-eyebrow">EQUIPE DE CAMPO</div><div class="card-t">Pesquisadores e coletas</div><div class="card-d">Quantidade de entrevistas registradas por pesquisador nesta pesquisa.</div></div><span class="pill pill-blue">Dados agregados</span></div><div class="client-researcher-table-wrap"><table class="client-researcher-table"><thead><tr><th>Pesquisador</th><th>Total</th><th>Válidas</th><th>Reprovadas</th><th>Última coleta</th></tr></thead><tbody><tr><td colspan="5" class="empty">Carregando pesquisadores e coletas…</td></tr></tbody></table></div></section>`;
}
async function clientResearcherProgressLoad(){
  const wrap=document.getElementById('client-researcher-progress');if(!wrap||CLIENT_RESEARCHER_PROGRESS_LOADING)return;
  const c=clientSelf(),s=clientSelfSurvey();if(!c||!s||!clientResultsReleasedForSurvey(c,s))return;
  CLIENT_RESEARCHER_PROGRESS_LOADING=true;
  try{
    const {data,error}=await clientWithTimeout(sb.rpc('client_collection_researcher_progress',{p_survey_id:s.id}),'a equipe de campo');
    if(error)throw error;
    CLIENT_RESEARCHER_PROGRESS_CACHE={surveyId:s.id,rows:(data||[]).map(row=>({researcherName:row.researcher_name||'Pesquisador não identificado',totalCount:Number(row.total_count)||0,validCount:Number(row.valid_count)||0,rejectedCount:Number(row.rejected_count)||0,lastOccurredAt:row.last_occurred_at||null}))};
    const tbody=wrap.querySelector('tbody');if(tbody)tbody.innerHTML=clientResearcherProgressRows();
  }catch(ex){
    const tbody=wrap.querySelector('tbody');if(tbody)tbody.innerHTML=`<tr><td colspan="5"><div class="callout warn"><b>Não foi possível carregar os pesquisadores.</b><br>Execute a migration <code>deploy/progresso-pesquisadores-cliente.sql</code> no Supabase. Detalhe: ${esc(ex?.message||ex)}</div></td></tr>`;
  }finally{CLIENT_RESEARCHER_PROGRESS_LOADING=false;}
}
function clientProgressRender(s,c){
  const host=document.getElementById('client-progress-live');if(!host)return;
  const summary=CLIENT_PROGRESS_CACHE.summary||{};
  const valid=Number(summary.validCount)||0,total=Number(summary.totalCount)||0,rejected=Number(summary.rejectedCount)||0,researchers=Number(summary.researcherCount)||0,sample=surveySample(s),pct=sample?Math.min(100,Math.round(valid/sample*100)):0;
  const last=summary.lastOccurredAt?new Date(summary.lastOccurredAt).toLocaleString('pt-BR'):'Ainda não há entrevistas registradas';
  host.innerHTML=`<div class="grid g4" style="margin-bottom:18px">
    ${stat('Entrevistas válidas',valid.toLocaleString('pt-BR'),'de '+sample.toLocaleString('pt-BR')+' · '+pct+'%','✓','#2563eb')}
    ${stat('Pesquisadores com coleta',researchers.toLocaleString('pt-BR'),'identificados nos eventos reais','☺','#059669')}
    ${stat('Status',STATUS_LABEL[s.status]||'Sem status',last,'◷','#d97706')}
    ${stat('Margem de erro prevista',s.err?('± '+Math.round(+s.err*100)+'%'):'—','nível de confiança '+(s.conf==='1.96'?'95%':s.conf||'não informado'),'∑','#7c3aed')}
  </div>
  <div class="card mb"><div class="card-t">Progresso geral da coleta</div><div class="card-d">Dados reais de entrevistas registrados no banco, atualizados automaticamente.</div><div class="bar" style="height:14px"><span style="width:${pct}%"></span></div><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--ink3);font-weight:600"><span>${valid.toLocaleString('pt-BR')} válidas</span><span>${pct}% da meta</span><span>${sample.toLocaleString('pt-BR')} entrevistas estimadas</span></div><div class="card-d" style="margin-top:10px">Total de eventos registrados: ${total.toLocaleString('pt-BR')} · Reprovadas: ${rejected.toLocaleString('pt-BR')}.</div></div>
  <div class="grid g2"><div class="card"><div class="card-t">Progresso por cota</div><div class="card-d">Metas e contagens retornadas das cotas reais da pesquisa.</div>${clientProgressQuotaRows(s)}</div><div class="card"><div class="card-t">Cobertura por cota/região</div><div class="card-d">Somente categorias com meta configurada na pesquisa.</div><div class="table-scroll"><table><thead><tr><th>Categoria</th><th>Válidas</th><th>Meta</th><th>Status</th></tr></thead><tbody>${clientProgressCoverageRows(s)}</tbody></table></div></div></div>
  <div class="callout mb" style="margin-top:16px">Os dados acima são agregados da pesquisa vinculada. Última atividade consultada: <b>${esc(last)}</b>. O acesso aos resultados continua condicionado à liberação da gestão.</div>`;
}
async function clientProgressLoad(){
  const host=document.getElementById('client-progress-live');if(!host||CLIENT_PROGRESS_LOADING)return;
  const c=clientSelf(),s=clientSelfSurvey();if(!c||!s||!clientResultsReleasedForSurvey(c,s))return;
  CLIENT_PROGRESS_LOADING=true;host.innerHTML='<div class="card"><div class="empty" style="padding:28px 0">Carregando dados reais da coleta…</div></div>';
  try{
    const [{data:summary,error:summaryError},{data:quotas,error:quotaError}]=await Promise.all([
      clientWithTimeout(sb.rpc('client_collection_progress',{p_survey_id:s.id}),'o andamento da coleta'),
      clientWithTimeout(sb.rpc('client_collection_quota_progress',{p_survey_id:s.id}),'as cotas da coleta')
    ]);
    if(summaryError)throw summaryError;if(quotaError)throw quotaError;
    const row=summary?.[0]||{};
    CLIENT_PROGRESS_CACHE={surveyId:s.id,summary:{validCount:row.valid_count,totalCount:row.total_count,rejectedCount:row.rejected_count,researcherCount:row.researcher_count,lastOccurredAt:row.last_occurred_at},quotas:(quotas||[]).map(r=>({questionId:r.question_id,questionText:r.question_text,quotaLabel:r.quota_label,validCount:r.valid_count,targetCount:r.target_count}))};
    clientProgressRender(s,c);
  }catch(ex){host.innerHTML='<div class="card"><div class="callout warn"><b>Não foi possível carregar o andamento real.</b><br>Execute a migration <code>deploy/progresso-clientes-real.sql</code> no Supabase e atualize a página. Detalhe: '+esc(ex?.message||ex)+'</div></div>';
  }finally{CLIENT_PROGRESS_LOADING=false;}
}
function clientProgressStartLive(){if(CLIENT_PROGRESS_TIMER)clearInterval(CLIENT_PROGRESS_TIMER);clientProgressLoad();CLIENT_PROGRESS_TIMER=setInterval(()=>{if(document.querySelector('.nav-item.on')?.dataset.key==='client-progress')clientProgressLoad();},20000);}
function clientProgressStopLive(){if(CLIENT_PROGRESS_TIMER){clearInterval(CLIENT_PROGRESS_TIMER);CLIENT_PROGRESS_TIMER=null;}}
function clientSurveyListMarkup(available,active){
  return `<div class="client-survey-list">${available.map(s=>{
    const released=clientResultsReleasedForSurvey(clientSelf(),s);
    return `<button type="button" class="client-survey-card ${active?.id===s.id?'is-active':''}" onclick="clientViewSurvey('${esc(s.id)}')"><span class="client-survey-card-icon">⌁</span><span class="client-survey-card-copy"><strong>${esc(s.name)}</strong><small>${esc(s.tipo||'Pesquisa de opinião')} · ${esc(STATUS_LABEL?.[s.status]||'Disponível')}</small><em>${esc(campaignLocationLabel(s))}</em></span><span class="client-survey-card-meta"><span class="pill ${released?'pill-green':'pill-gray'}">${released?'Resultados liberados':'Em acompanhamento'}</span><b>Ver informações&nbsp; →</b></span></button>`;
  }).join('')}</div>`;
}
function clientSurveyDetailsMarkup(s,c,active){
  const released=clientResultsReleasedForSurvey(c,s);
  const sample=Number(surveySample(s)||0).toLocaleString('pt-BR');
  const margin=s.err?`± ${Math.round(Number(s.err)*100)}%`:'Não informado';
  return `<div class="client-survey-details card"><button type="button" class="client-survey-back" onclick="clientBackToSurveyList()">← Voltar para minhas pesquisas</button><div class="client-survey-details-hero"><div class="client-survey-details-icon">⌁</div><div><span class="eyebrow">INFORMAÇÕES DA PESQUISA</span><h2>${esc(s.name)}</h2><p>${esc(s.tipo||'Pesquisa de opinião')} · <span class="pill ${s.status==='campo'?'pill-green':s.status==='encerrada'?'pill-blue':'pill-amber'}">${esc(STATUS_LABEL?.[s.status]||'Disponível')}</span></p></div></div><div class="client-survey-details-grid"><div><span>Período</span><strong>${campaignDateLabel(s.dataIni)} a ${campaignDateLabel(s.dataFim)}</strong></div><div><span>Amostra prevista</span><strong>${sample} entrevistas</strong></div><div><span>Margem de erro</span><strong>${margin}</strong></div><div><span>Nível de confiança</span><strong>${s.conf==='1.96'?'95%':esc(s.conf||'Não informado')}</strong></div><div class="client-survey-details-wide"><span>Abrangência</span><strong>${esc(campaignLocationLabel(s))}</strong></div><div><span>Questionário</span><strong>${(s.questions||[]).length} ${(s.questions||[]).length===1?'pergunta':'perguntas'}</strong></div><div><span>Resultados</span><strong>${released?'Liberados para visualização':'Ainda não liberados'}</strong></div></div><div class="client-survey-details-actions"><button type="button" class="btn btn-fill" onclick="clientSelectSurveyAndGo('${esc(s.id)}','client-progress')">${active?.id===s.id?'Abrir andamento':'Selecionar e acompanhar'}</button>${s.formApprovalRequired?`<button type="button" class="btn btn-out" onclick="clientSelectSurveyAndGo('${esc(s.id)}','form-approval')">Aprovar formulário</button>`:''}</div></div>`;
}
function clientViewSurvey(surveyId){
  if(CURRENT_PROFILE?.role!=='cliente'||!campaignSurveysForCurrentUser().some(s=>s.id===surveyId))return;
  CLIENT_SURVEY_VIEW_ID=surveyId;go('client-surveys');
}
function clientBackToSurveyList(){CLIENT_SURVEY_VIEW_ID=null;go('client-surveys');}
function clientSelectSurveyAndGo(surveyId,target){
  if(CURRENT_PROFILE?.role!=='cliente'||!campaignSurveysForCurrentUser().some(s=>s.id===surveyId))return;
  ACTIVE_CAMPAIGN_ID=surveyId;CLIENT_SURVEY_VIEW_ID=null;updateCampaignSwitcherButton();go(target||'client-progress');
}
PAGES['client-surveys']=()=>{
  if(!SURVEYS_LOADED){loadSurveysIfNeeded();return head('Minhas pesquisas','Pesquisas disponibilizadas para sua empresa')+'<div class="card"><div class="empty">Carregando pesquisas…</div></div>';}
  const c=clientSelf(),available=campaignSurveysForCurrentUser(),active=activeCampaignSurvey();
  if(!c||!available.length)return head('Minhas pesquisas','Pesquisas disponibilizadas para sua empresa')+'<div class="card client-surveys-empty"><div class="empty"><strong>Nenhuma pesquisa disponibilizada no momento</strong><br><small>A equipe PesquisaPro mostrará aqui as pesquisas vinculadas à sua conta.</small></div></div>';
  const viewed=available.find(s=>s.id===CLIENT_SURVEY_VIEW_ID);
  if(viewed)return head('Informações da pesquisa','Confira os detalhes antes de acompanhar a coleta')+clientSurveyDetailsMarkup(viewed,c,active);
  return head('Minhas pesquisas','Pesquisas disponibilizadas para sua empresa')+`<section class="client-surveys-page"><div class="client-surveys-intro card"><div><span class="eyebrow">MINHAS PESQUISAS</span><h2>Pesquisas disponibilizadas para você</h2><p>Clique em uma pesquisa para consultar as informações, o período, a abrangência e o estado dos resultados.</p></div><span class="client-surveys-count">${available.length} ${available.length===1?'pesquisa':'pesquisas'}</span></div>${clientSurveyListMarkup(available,active)}</section>`;
};
PAGES['client-progress']=()=>{
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  const c=clientSelf(),s=clientSelfSurvey();
  if(!c||!s)return head('Andamento','Acompanhe o andamento da coleta')+`<div class="card"><div class="empty">Nenhuma pesquisa vinculada à sua conta no momento. <button class="btn btn-out" style="margin-top:16px" onclick="go('client-surveys')">Ver minhas pesquisas</button></div></div>`;
  if(!clientResultsReleasedForSurvey(c,s))return head(s.name,'Andamento da coleta · '+c.company)+`<div class="card" style="text-align:center;padding:44px 24px"><div style="font-weight:800;font-size:18px">Resultados e andamento detalhado ainda não liberados</div><p style="color:var(--ink3);font-size:13.5px;margin-top:8px;line-height:1.6">A equipe PesquisaPro libera os dados agregados nesta área após a validação da pesquisa.</p></div>`;
  return head(s.name,'Andamento da coleta em tempo real · '+c.company,`<button class="btn btn-out" onclick="clientViewSurvey('${esc(s.id)}')">Informações da pesquisa</button>`)+`<section id="client-progress-live"><div class="card"><div class="empty" style="padding:28px 0">Carregando dados reais da coleta…</div></div></section>${clientResearcherProgressMarkup()}<div id="cr-client-report"><div class="empty" style="padding:28px 0">Carregando resultados agregados…</div></div>${clientHeatmapMarkup(s)}<section id="cr-client-geo" class="client-geo-section"><div class="card"><div class="empty" style="padding:28px 0">Carregando georreferenciamento…</div></div></section>${clientPublishedReportsMarkup()}<div class="callout mb" style="margin-top:16px">Resultados, mapa e indicadores exibidos nesta área são agregados e condicionados à liberação da pesquisa para o cliente.</div>`;
};

const STATUS_LABEL={campo:'Em campo',rascunho:'Rascunho',encerrada:'Concluída'};

/* perguntas de uma pesquisa que podem gerar uma distribuição real de
   respostas: precisam ter o id real do banco (dbId) e não podem ser
   "resposta aberta" (texto livre não tem como virar gráfico/contagem) */
function reportsQuestionsForSurvey(s){
  return (s.questions||[]).filter(q=>q.dbId&&q.type!=='open');
}
function reportsCrossQuestionsForSurvey(s){
  return reportsQuestionsForSurvey(s).filter(q=>q.type!=='pair'&&q.type!=='ranking');
}
function heatmapQuestionsForSurvey(s){return (s?.questions||[]).filter(q=>q.dbId&&q.type!=='date');}
function openQuestionsForSurvey(s){return heatmapQuestionsForSurvey(s);}
let RESPONSE_HEATMAP_MAPS={};
function responseHeatmapColor(ratio){if(ratio>=.75)return'#dc2626';if(ratio>=.5)return'#f97316';if(ratio>=.25)return'#facc15';return'#22c55e';}
function googleMapErrorText(error){const message=String(error?.message||error||'');return message.includes('Chave do Google Maps')?'Mapa Google não configurado: insira a chave restrita em google-maps-config.js.':'Não foi possível carregar o Google Maps. Verifique a chave, as APIs habilitadas e as restrições do domínio.';}
function googleMarkerIcon(color,scale=9){return {path:google.maps.SymbolPath.CIRCLE,scale,fillColor:color,fillOpacity:1,strokeColor:'#ffffff',strokeWeight:2};}
function googleBalloonIcon(color='#059669'){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46"><path d="M19 2C9.6 2 2 9.3 2 18.3c0 12.1 13.4 20.9 17 25.7 3.6-4.8 17-13.6 17-25.7C36 9.3 28.4 2 19 2Z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="19" cy="18" r="7" fill="#fff" opacity=".96"/><circle cx="19" cy="18" r="3.2" fill="${color}"/></svg>`;return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(38,46),anchor:new google.maps.Point(19,46),labelOrigin:new google.maps.Point(19,18)};}
function destroyResponseHeatmapMap(owner){const state=RESPONSE_HEATMAP_MAPS[owner];if(state){(state.overlays||[]).forEach(overlay=>overlay.setMap(null));}delete RESPONSE_HEATMAP_MAPS[owner];}
function renderResponseHeatmapMap(owner,elementId,points){
  const mapEl=document.getElementById(elementId);if(!mapEl)return;
  if(!window.google?.maps?.Map){mapEl.innerHTML='<div class="map-loading" style="display:flex">Preparando Google Maps…</div>';loadGoogleMaps().then(()=>{if(document.getElementById(elementId)===mapEl)renderResponseHeatmapMap(owner,elementId,points);}).catch(error=>{mapEl.innerHTML='<div class="map-loading" style="display:flex">'+esc(googleMapErrorText(error))+'</div>';});return;}
  let state=RESPONSE_HEATMAP_MAPS[owner];
  if(!state||state.element!==mapEl){destroyResponseHeatmapMap(owner);state={element:mapEl,map:new google.maps.Map(mapEl,{center:{lat:-18.5,lng:-44.9},zoom:6,mapTypeId:'roadmap',mapTypeControl:true,fullscreenControl:true,streetViewControl:false,gestureHandling:'greedy'}),overlays:[]};RESPONSE_HEATMAP_MAPS[owner]=state;}
  state.overlays.forEach(overlay=>overlay.setMap(null));state.overlays=[];
  const valid=(points||[]).filter(point=>Number.isFinite(Number(point.lat))&&Number.isFinite(Number(point.lng)));const max=Math.max(1,...valid.map(point=>Number(point.point_count)||0));const bounds=new google.maps.LatLngBounds();
  valid.forEach(point=>{const count=Number(point.point_count)||0,ratio=count/max,color=responseHeatmapColor(ratio),radius=Math.min(1200,180+Math.sqrt(Math.max(1,count)/max)*900),position={lat:Number(point.lat),lng:Number(point.lng)};const circle=new google.maps.Circle({map:state.map,center:position,radius,strokeColor:color,strokeOpacity:.9,strokeWeight:2,fillColor:color,fillOpacity:.3});const info=new google.maps.InfoWindow({content:`<div class="map-popup"><div class="map-popup-title">Concentração da resposta</div><div class="map-popup-meta"><b>${count.toLocaleString('pt-BR')}</b> resposta${count===1?'':'s'} nesta área<br>Área aproximada<br>Última ocorrência: ${point.last_occurred_at?new Date(point.last_occurred_at).toLocaleString('pt-BR'):'—'}</div></div>`});circle.addListener('click',()=>info.open({map:state.map,position}));state.overlays.push(circle);bounds.extend(position);});
  if(valid.length){if(valid.length===1){state.map.setCenter(bounds.getCenter());state.map.setZoom(13);}else{state.map.fitBounds(bounds,{top:50,right:50,bottom:50,left:50});}}
  setTimeout(()=>{try{google.maps.event.trigger(state.map,'resize');}catch(e){}},40);
}

function clientPublishedReportsMarkup(){return `<div class="card mb client-published-reports" id="client-published-reports"><div class="card-t">Relatórios finais</div><div class="card-d">Documentos revisados e disponibilizados pela equipe PesquisaPro.</div><div id="client-published-reports-list"><div class="empty" style="padding:16px 0">Carregando relatórios…</div></div></div>`;}
let CR_QUESTION_DBID=null;
let CR_CLIENT_REPORT_CACHE={surveyId:null,overviewRows:[],crossRowsById:{},document:null};
let CR_CLIENT_REPORT_LOADING=false;
let CR_CLIENT_GEO_CACHE={surveyId:null,points:[],feed:[]};
let CR_CLIENT_GEO_LOADING=false;
let CR_CLIENT_GEO_TIMER=null;
let _clientGeoMap=null,_clientGeoTileLayer=null,_clientGeoMarkerLayer=[],_clientGeoInfoWindow=null,_clientGeoDidFit=false;
let CR_CLIENT_GEO_FILTER='all';
PAGES['client-results']=()=>{
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  const c=clientSelf(),s=clientSelfSurvey();
  if(!c||!s)return head('Resultados','Resultados da sua pesquisa')+`<div class="card"><div class="empty">Nenhuma pesquisa vinculada à sua conta no momento.</div></div>`;
  if(!clientResultsReleasedForSurvey(c,s)){
    const sample=surveySample(s),pct=sample?Math.min(100,Math.round(s.collected/sample*100)):0;
    return head('Resultados',s.name)+`<div class="card" style="text-align:center;padding:52px 24px"><div style="width:56px;height:56px;border-radius:16px;background:var(--amber-l);color:var(--amber);font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">🔒</div><div style="font-weight:800;font-size:18px">Resultados ainda não liberados</div><p style="color:var(--ink3);font-size:13.5px;margin-top:8px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.6">A coleta está em <b>${pct}%</b> da meta. Assim que os dados forem validados, a equipe do PesquisaPro libera o relatório nesta área.</p><button class="btn btn-out" style="margin-top:20px" onclick="go('client-progress')">← Ver andamento da coleta</button></div>`;
  }
  const heatmapMarkup=clientHeatmapMarkup(s);return head('Resultados',s.name)+`<div id="cr-client-report"><div class="empty" style="padding:28px 0">Carregando relatório de resultados…</div></div>${heatmapMarkup}<section id="cr-client-geo" class="client-geo-section"><div class="card"><div class="empty" style="padding:28px 0">Carregando georreferenciamento…</div></div></section>${clientPublishedReportsMarkup()}<div class="callout mb" style="margin-top:16px">Os resultados são calculados sobre entrevistas válidas, excluindo coletas reprovadas e de calibração. O mapa mostra áreas aproximadas e dados agregados; ao passar o mouse ou tocar em um marcador, o nome do pesquisador responsável pela área é exibido, sem contatos ou coordenadas exatas.</div>`;
};
function clientResultsPickQuestion(id){CR_QUESTION_DBID=id;clientResultsLoadAndRender();}
function clientGeoNormalizePoint(row){return {lat:Number(row.lat),lng:Number(row.lng),pointCount:Number(row.point_count)||0,validCount:Number(row.valid_count)||0,rejectedCount:Number(row.rejected_count)||0,calibrationCount:Number(row.calibration_count)||0,lastAt:row.last_occurred_at||null,researcherNames:String(row.researcher_names||'Pesquisador não identificado')};}
function clientGeoFilteredPoints(){return CR_CLIENT_GEO_CACHE.points.filter(p=>{if(CR_CLIENT_GEO_FILTER==='valid')return p.validCount>0;if(CR_CLIENT_GEO_FILTER==='rejected')return p.rejectedCount>0;if(CR_CLIENT_GEO_FILTER==='calibration')return p.calibrationCount>0;return true;});}
function clientGeoStatusPill(status,calibration){if(calibration)return '<span class="pill pill-blue">◎ Calibração</span>';if(status==='rejected')return '<span class="pill pill-red">✕ Reprovada</span>';if(status==='valid')return '<span class="pill pill-green">✓ Válida</span>';return '<span class="pill pill-amber">Pendente</span>';}
function clientGeoApplyFilter(){CR_CLIENT_GEO_FILTER=document.getElementById('clientGeoFilter')?.value||'all';_clientGeoDidFit=false;clientGeoRender();}
function clientGeoRefresh(){clientGeoLoad(true);}
function clientGeoStopLive(){if(CR_CLIENT_GEO_TIMER){clearInterval(CR_CLIENT_GEO_TIMER);CR_CLIENT_GEO_TIMER=null;}if(_clientGeoMarkerLayer){_clientGeoMarkerLayer.forEach(marker=>marker.setMap(null));}_clientGeoMarkerLayer=[];_clientGeoMap=null;_clientGeoTileLayer=null;_clientGeoDidFit=false;}
function clientGeoStartLive(){clientGeoStopLive();clientGeoLoad();CR_CLIENT_GEO_TIMER=setInterval(()=>clientGeoLoad(true),20000);}
async function clientGeoLoad(isLive=false){
  const wrap=document.getElementById('cr-client-geo');if(!wrap||CR_CLIENT_GEO_LOADING)return;
  const c=clientSelf(),s=clientSelfSurvey();if(!c||!s||!clientResultsReleasedForSurvey(c,s))return;
  CR_CLIENT_GEO_LOADING=true;
  try{
    const [{data:pointRows,error:pointError},{data:feedRows,error:feedError}]=await Promise.all([
      clientWithTimeout(sb.rpc('client_collection_geo_summary',{p_survey_id:s.id}),'o resumo do georreferenciamento'),
      clientWithTimeout(sb.rpc('client_collection_geo_feed',{p_survey_id:s.id}),'o histórico do georreferenciamento')
    ]);
    if(pointError)throw pointError;if(feedError)throw feedError;
    CR_CLIENT_GEO_CACHE={surveyId:s.id,points:(pointRows||[]).map(clientGeoNormalizePoint),feed:(feedRows||[]).map(r=>({quotaLabel:r.quota_label||'Sem cota',status:r.status||'valid',isCalibration:!!r.is_calibration,occurredAt:r.occurred_at||null,synced:r.synced!==false,accuracyM:Number(r.accuracy_m)||0}))};
    clientGeoRender();
  }catch(ex){wrap.innerHTML='<div class="card"><div class="callout warn"><b>Não foi possível carregar o georreferenciamento.</b><br>Verifique se a migration de georreferenciamento para clientes foi executada no Supabase. Detalhe: '+esc(ex?.message||ex)+'</div></div>';
  }finally{CR_CLIENT_GEO_LOADING=false;}
}
function clientGeoRender(){
  const wrap=document.getElementById('cr-client-geo');if(!wrap)return;
  const points=clientGeoFilteredPoints(),all=CR_CLIENT_GEO_CACHE.points;
  const total=all.reduce((sum,p)=>sum+p.pointCount,0),valid=all.reduce((sum,p)=>sum+p.validCount,0),rejected=all.reduce((sum,p)=>sum+p.rejectedCount,0),calibration=all.reduce((sum,p)=>sum+p.calibrationCount,0);
  wrap.innerHTML=`<div class="card client-geo-card"><div class="map-panel-head"><div><div class="map-eyebrow">MONITORAMENTO DA COLETA</div><div class="card-t">Georreferenciamento em tempo real</div><div class="card-d" id="clientGeoSummary">${points.length} área${points.length===1?'':'s'} aproximada${points.length===1?'':'s'} · ${total.toLocaleString('pt-BR')} entrevista${total===1?'':'s'}</div></div><div class="map-panel-actions"><button class="btn btn-out" onclick="clientGeoRefresh()">↻ Atualizar</button></div></div><div class="grid g4 client-geo-stats"><div class="stat"><div class="s-top"><span class="s-label">Entrevistas</span></div><div class="s-val">${total.toLocaleString('pt-BR')}</div><div class="s-sub">com localização</div></div><div class="stat"><div class="s-top"><span class="s-label">Válidas</span></div><div class="s-val" style="color:var(--teal)">${valid.toLocaleString('pt-BR')}</div><div class="s-sub">consideradas nos resultados</div></div><div class="stat"><div class="s-top"><span class="s-label">Reprovadas</span></div><div class="s-val" style="color:var(--red)">${rejected.toLocaleString('pt-BR')}</div><div class="s-sub">fora dos resultados</div></div><div class="stat"><div class="s-top"><span class="s-label">Calibração</span></div><div class="s-val" style="color:var(--brand)">${calibration.toLocaleString('pt-BR')}</div><div class="s-sub">fora dos resultados</div></div></div><div class="map-toolbar client-geo-toolbar"><label class="map-filter"><span>Exibir no mapa</span><select id="clientGeoFilter" onchange="clientGeoApplyFilter()"><option value="all" ${CR_CLIENT_GEO_FILTER==='all'?'selected':''}>Todas as áreas</option><option value="valid" ${CR_CLIENT_GEO_FILTER==='valid'?'selected':''}>Com entrevistas válidas</option><option value="rejected" ${CR_CLIENT_GEO_FILTER==='rejected'?'selected':''}>Com reprovações</option><option value="calibration" ${CR_CLIENT_GEO_FILTER==='calibration'?'selected':''}>Com calibração</option></select></label><span class="client-geo-privacy-note">Pontos aproximados; o nome do pesquisador aparece somente ao interagir com o marcador.</span></div><div class="map-canvas-wrap"><div id="clientGeoMap" class="collect-map-canvas client-geo-map-canvas" role="application" aria-label="Mapa de áreas aproximadas da coleta"></div><div id="clientGeoMapLoading" class="map-loading" aria-live="polite">Preparando Google Maps…</div></div><div class="map-panel-foot"><div class="map-legend"><span><i class="map-dot map-dot-latest"></i>Área com coleta</span><span><i class="map-dot map-dot-rejected"></i>Com reprovação</span><span><i class="map-dot map-dot-calibration"></i>Com calibração</span></div><div class="map-note">A localização é arredondada para proteger a privacidade de campo.</div></div></div><div class="card client-geo-feed-card"><div class="card-t">Atividade recente da coleta</div><div class="card-d">Últimas movimentações agregadas, atualizadas automaticamente a cada 20 segundos.</div><div id="clientGeoFeed">${clientGeoFeedMarkup()}</div></div>`;
  clientGeoRenderMap();
}
function clientGeoFeedMarkup(){const rows=CR_CLIENT_GEO_CACHE.feed||[];const filtered=CR_CLIENT_GEO_FILTER==='all'?rows:rows.filter(r=>CR_CLIENT_GEO_FILTER==='calibration'?r.isCalibration:CR_CLIENT_GEO_FILTER==='rejected'?r.status==='rejected':r.status==='valid'&&!r.isCalibration);return filtered.slice(0,12).map(r=>`<div class="client-geo-feed-row"><span class="client-geo-feed-icon">📍</span><div><b>${esc(r.quotaLabel||'Sem cota')}</b><span>${r.occurredAt?new Date(r.occurredAt).toLocaleString('pt-BR'):'—'} · precisão informada ${r.accuracyM?`±${Math.round(r.accuracyM)}m`:'—'}</span></div><div>${clientGeoStatusPill(r.status,r.isCalibration)}</div></div>`).join('')||'<div class="empty" style="padding:14px 0">Nenhuma atividade corresponde ao filtro.</div>';}
function clientGeoRenderMap(){
  const mapEl=document.getElementById('clientGeoMap');if(!mapEl)return;const loading=document.getElementById('clientGeoMapLoading');
  if(!window.google?.maps?.Map){if(loading){loading.style.display='flex';loading.textContent='Preparando Google Maps…';}loadGoogleMaps().then(()=>{if(document.getElementById('clientGeoMap')===mapEl)clientGeoRenderMap();}).catch(error=>{if(loading){loading.style.display='flex';loading.textContent=googleMapErrorText(error);}});return;}
  if(loading)loading.style.display='none';if(!_clientGeoMap||_clientGeoMap._ppElement!==mapEl){if(_clientGeoMarkerLayer){_clientGeoMarkerLayer.forEach(marker=>marker.setMap(null));}_clientGeoMarkerLayer=[];_clientGeoMap=new google.maps.Map(mapEl,{center:{lat:-18.5,lng:-44.9},zoom:6,mapTypeId:'roadmap',mapTypeControl:true,fullscreenControl:true,streetViewControl:false,gestureHandling:'greedy'});_clientGeoMap._ppElement=mapEl;_clientGeoInfoWindow=new google.maps.InfoWindow();}
  _clientGeoMarkerLayer.forEach(marker=>marker.setMap(null));_clientGeoMarkerLayer=[];const points=clientGeoFilteredPoints();points.forEach(point=>{if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng))return;const color=point.rejectedCount>0?'#dc2626':point.calibrationCount>0?'#2563eb':'#059669',marker=new google.maps.Marker({map:_clientGeoMap,position:{lat:point.lat,lng:point.lng},icon:googleBalloonIcon(color),label:{text:String(point.pointCount),color:'#102a56',fontWeight:'700',fontSize:'11px'},title:`${point.pointCount} entrevistas · ${point.researcherNames} · área aproximada`});marker.addListener('click',()=>{_clientGeoInfoWindow.setContent(`<div class="map-popup"><div class="map-popup-title">Área aproximada</div><div class="map-popup-meta"><b>Pesquisador${point.researcherNames.includes(',')?'es':''}:</b> ${esc(point.researcherNames)}<br><b>${point.pointCount.toLocaleString('pt-BR')}</b> entrevista${point.pointCount===1?'':'s'}<br>Última atualização: ${point.lastAt?new Date(point.lastAt).toLocaleString('pt-BR'):'—'}</div><div class="map-popup-status"><span class="pill pill-green">${point.validCount} válidas</span> ${point.rejectedCount?`<span class="pill pill-red">${point.rejectedCount} reprovadas</span>`:''} ${point.calibrationCount?`<span class="pill pill-blue">${point.calibrationCount} calibração</span>`:''}</div></div>`);_clientGeoInfoWindow.open({map:_clientGeoMap,anchor:marker});});marker.addListener('mouseover',()=>google.maps.event.trigger(marker,'click'));marker.addListener('mouseout',()=>_clientGeoInfoWindow.close());_clientGeoMarkerLayer.push(marker);});if(points.length&&!_clientGeoDidFit){try{const bounds=new google.maps.LatLngBounds();points.filter(point=>Number.isFinite(point.lat)&&Number.isFinite(point.lng)).forEach(point=>bounds.extend({lat:point.lat,lng:point.lng}));if(!bounds.isEmpty()){_clientGeoMap.fitBounds(bounds,{top:50,right:50,bottom:50,left:50});_clientGeoDidFit=true;}}catch(e){}}
}
let RP_HEATMAP_QUESTION_ID=null,RP_HEATMAP_VALUE='',RP_HEATMAP_ROWS=[],RP_HEATMAP_LOADING=false;
let CR_HEATMAP_QUESTION_ID=null,CR_HEATMAP_VALUE='',CR_HEATMAP_ROWS=[],CR_HEATMAP_LOADING=false;
function heatmapQuestionOptions(qs,selected){return qs.map(q=>`<option value="${q.dbId}" ${q.dbId===selected?'selected':''}>${esc(q.text||'(pergunta sem texto)')}</option>`).join('');}
function heatmapValueOptions(rows,selected){return (rows||[]).map(r=>`<option value="${esc(r.value_label)}" ${r.value_label===selected?'selected':''}>${esc(r.value_label)} · ${Number(r.response_count||0).toLocaleString('pt-BR')} resposta${Number(r.response_count||0)===1?'':'s'}</option>`).join('');}
function responseHeatmapPanelMarkup(prefix,qs,questionId,value,master=false){return `<section class="card response-heatmap-panel ${master?'reports-response-heatmap':'client-response-heatmap'}" id="${prefix}-response-heatmap"><div class="reports-heatmap-head"><div><div class="reports-eyebrow">MAPA DE CALOR POR RESPOSTA</div><h2>Onde essa resposta aconteceu?</h2><p>Escolha uma pergunta e depois uma resposta para visualizar sua concentração geográfica.</p></div><span class="pill pill-blue">Áreas aproximadas</span></div><div class="response-heatmap-controls"><div><label class="lbl">Pergunta</label><select class="inp" id="${prefix}-heatmap-question" onchange="${master?'reportsHeatmapPickQuestion':'clientHeatmapPickQuestion'}(this.value)">${heatmapQuestionOptions(qs,questionId)}</select></div><div><label class="lbl">Resposta selecionada</label><select class="inp" id="${prefix}-heatmap-value" onchange="${master?'reportsHeatmapPickValue':'clientHeatmapPickValue'}(this.value)"><option value="">Carregando respostas…</option></select></div></div><div id="${prefix}-heatmap-summary" class="response-heatmap-summary">Carregando respostas agregadas…</div><div class="map-canvas-wrap response-heatmap-map-wrap"><div id="${prefix}-heatmap-map" class="collect-map-canvas response-heatmap-map" role="application" aria-label="Mapa de calor por resposta"></div><div id="${prefix}-heatmap-map-loading" class="map-loading" aria-live="polite">Preparando mapa de calor…</div></div><div class="response-heatmap-legend"><span><i style="background:#22c55e"></i>Menor concentração</span><span><i style="background:#facc15"></i>Concentração média</span><span><i style="background:#dc2626"></i>Maior concentração</span><small>Localização arredondada para preservar privacidade.</small></div></section>`;}
function reportsHeatmapMarkup(survey){const qs=heatmapQuestionsForSurvey(survey);if(!qs.length)return '';if(!RP_HEATMAP_QUESTION_ID||!qs.some(q=>q.dbId===RP_HEATMAP_QUESTION_ID))RP_HEATMAP_QUESTION_ID=qs[0].dbId;return responseHeatmapPanelMarkup('rp',qs,RP_HEATMAP_QUESTION_ID,RP_HEATMAP_VALUE,true);}
function clientHeatmapMarkup(survey){const qs=heatmapQuestionsForSurvey(survey);if(!qs.length)return '';if(!CR_HEATMAP_QUESTION_ID||!qs.some(q=>q.dbId===CR_HEATMAP_QUESTION_ID))CR_HEATMAP_QUESTION_ID=qs[0].dbId;return responseHeatmapPanelMarkup('cr',qs,CR_HEATMAP_QUESTION_ID,CR_HEATMAP_VALUE,false);}
async function loadResponseHeatmapRows(mode){const isMaster=mode==='master',survey=isMaster?reportsCurrentSurvey():clientSelfSurvey(),questionId=isMaster?RP_HEATMAP_QUESTION_ID:CR_HEATMAP_QUESTION_ID;if(!survey||!questionId)return[];const {data,error}=await clientWithTimeout(sb.rpc('survey_response_values',{p_survey_id:survey.id,p_question_id:questionId}),'as respostas do mapa de calor');if(error)throw error;return data||[];}
async function loadResponseHeatmapPoints(mode,value){const isMaster=mode==='master',survey=isMaster?reportsCurrentSurvey():clientSelfSurvey(),questionId=isMaster?RP_HEATMAP_QUESTION_ID:CR_HEATMAP_QUESTION_ID;if(!survey||!questionId||!value)return[];const {data,error}=await clientWithTimeout(sb.rpc('survey_response_heatmap',{p_survey_id:survey.id,p_question_id:questionId,p_value_label:value}),'os pontos do mapa de calor');if(error)throw error;return data||[];}
function renderResponseHeatmapControls(mode){const prefix=mode==='master'?'rp':'cr',rows=mode==='master'?RP_HEATMAP_ROWS:CR_HEATMAP_ROWS,selected=mode==='master'?RP_HEATMAP_VALUE:CR_HEATMAP_VALUE,select=document.getElementById(prefix+'-heatmap-value'),summary=document.getElementById(prefix+'-heatmap-summary');if(select)select.innerHTML=rows.length?heatmapValueOptions(rows,selected):'<option value="">Nenhuma resposta encontrada</option>';if(summary)summary.textContent=rows.length?`${rows.length} resposta${rows.length===1?'':'s'} encontrada${rows.length===1?'':'s'} · selecione uma para desenhar o mapa de calor.`:'Nenhuma resposta agregada encontrada para esta pergunta.';}
async function responseHeatmapLoad(mode){const isMaster=mode==='master',wrap=document.getElementById((isMaster?'rp':'cr')+'-response-heatmap');if(!wrap||((isMaster?RP_HEATMAP_LOADING:CR_HEATMAP_LOADING)))return;if(!isMaster&&!clientResultsReleasedForSurvey(clientSelf(),clientSelfSurvey()))return;if(isMaster)RP_HEATMAP_LOADING=true;else CR_HEATMAP_LOADING=true;try{const rows=await loadResponseHeatmapRows(mode);if(isMaster){RP_HEATMAP_ROWS=rows;if(!rows.some(r=>r.value_label===RP_HEATMAP_VALUE))RP_HEATMAP_VALUE=rows[0]?.value_label||'';}else{CR_HEATMAP_ROWS=rows;if(!rows.some(r=>r.value_label===CR_HEATMAP_VALUE))CR_HEATMAP_VALUE=rows[0]?.value_label||'';}renderResponseHeatmapControls(mode);const points=await loadResponseHeatmapPoints(mode,isMaster?RP_HEATMAP_VALUE:CR_HEATMAP_VALUE);renderResponseHeatmapMap(isMaster?'master-response-heatmap':'client-response-heatmap',isMaster?'rp-heatmap-map':'cr-heatmap-map',points);const summary=document.getElementById((isMaster?'rp':'cr')+'-heatmap-summary');if(summary)summary.textContent=(isMaster?RP_HEATMAP_VALUE:CR_HEATMAP_VALUE)?`${(isMaster?RP_HEATMAP_VALUE:CR_HEATMAP_VALUE)} · ${points.reduce((sum,p)=>sum+Number(p.point_count||0),0).toLocaleString('pt-BR')} entrevista${points.reduce((sum,p)=>sum+Number(p.point_count||0),0)===1?'':'s'} georreferenciada${points.length===1?'':'s'}`:'Selecione uma resposta para desenhar o mapa de calor.';}catch(ex){const summary=document.getElementById((isMaster?'rp':'cr')+'-heatmap-summary');if(summary)summary.textContent='Não foi possível carregar o mapa de calor: '+(ex?.message||ex);}finally{if(isMaster)RP_HEATMAP_LOADING=false;else CR_HEATMAP_LOADING=false;}}
function reportsHeatmapPickQuestion(id){RP_HEATMAP_QUESTION_ID=id;RP_HEATMAP_VALUE='';go('reports');}
function reportsHeatmapPickValue(value){RP_HEATMAP_VALUE=value;responseHeatmapLoad('master');}
function clientHeatmapPickQuestion(id){CR_HEATMAP_QUESTION_ID=id;CR_HEATMAP_VALUE='';const key=document.querySelector('.nav-item.on')?.dataset.key;go(key==='client-progress'?'client-progress':'client-results');}
function clientHeatmapPickValue(value){CR_HEATMAP_VALUE=value;responseHeatmapLoad('client');}
function clientReportQuestionLabel(qs,id){return qs.find(q=>q.dbId===id)?.text||'(variável sem texto)';}
function clientReportCrossOptionLabels(qs,qid){return (qs.find(q=>q.dbId===qid)?.opts||[]).map(v=>String(v||'').trim()).filter(Boolean);}
function clientReportCrossOrderedValues(rows,index,qid,qs){const values=[],seen=new Set();(rows||[]).forEach(row=>{const value=reportsCrossValue([row.variable_1,row.variable_2,row.variable_3][index]);if(!seen.has(value)){seen.add(value);values.push(value);}});const preferred=clientReportCrossOptionLabels(qs,qid);return [...preferred.filter(v=>seen.has(v)),...values.filter(v=>!preferred.includes(v))];}
function clientReportCrossMatrixModel(rows,ids,thirdValue,qs){const base=Number(rows[0]?.valid_base)||0,filtered=thirdValue==null?rows:rows.filter(row=>reportsCrossValue(row.variable_3)===thirdValue),rowValues=clientReportCrossOrderedValues(filtered,0,ids[0],qs),colValues=ids.length>1?clientReportCrossOrderedValues(filtered,1,ids[1],qs):['% da base'],counts=new Map(),rowTotals=new Map(),colTotals=new Map();filtered.forEach(row=>{const rowValue=reportsCrossValue(row.variable_1),colValue=ids.length>1?reportsCrossValue(row.variable_2):'% da base',count=Number(row.cnt||0);counts.set(rowValue+'\u0000'+colValue,(counts.get(rowValue+'\u0000'+colValue)||0)+count);rowTotals.set(rowValue,(rowTotals.get(rowValue)||0)+count);colTotals.set(colValue,(colTotals.get(colValue)||0)+count);});return {base,rowValues,colValues,counts,rowTotals,colTotals};}
function clientReportCrossMatrixMarkup(model,ids,qs,title=''){const headers=model.colValues.map(v=>`<th>${esc(v)}</th>`).join(''),body=model.rowValues.map(rowValue=>{const cells=model.colValues.map(colValue=>`<td>${reportsCrossPct(model.counts.get(rowValue+'\u0000'+colValue)||0,model.base)}</td>`).join('');return `<tr><th scope="row">${esc(rowValue)}</th>${cells}<td class="cross-total-cell"><strong>${reportsCrossPct(model.rowTotals.get(rowValue)||0,model.base)}</strong></td></tr>`;}).join(''),totals=model.colValues.map(colValue=>`<td class="cross-total-cell"><strong>${reportsCrossPct(model.colTotals.get(colValue)||0,model.base)}</strong></td>`).join('');return `<div class="reports-cross-matrix-wrap">${title?`<h3>${esc(title)}</h3>`:''}<div class="reports-cross-scroll"><table class="reports-cross-matrix"><thead><tr><th>${esc(clientReportQuestionLabel(qs,ids[0]))}</th>${headers}<th>TOTAL</th></tr></thead><tbody>${body||`<tr><td colspan="${model.colValues.length+2}" class="empty">Nenhuma combinação encontrada.</td></tr>`}<tr class="cross-total-row"><th>TOTAL</th>${totals}<td class="cross-total-cell"><strong>${reportsCrossPct([...model.rowTotals.values()].reduce((sum,value)=>sum+value,0),model.base)}</strong></td></tr></tbody></table></div></div>`;}
function clientPublishedCrossings(document,qs){const sec=typeof document?.sections==='string'?JSON.parse(document.sections||'{}'):document?.sections||{};const valid=new Set(qs.map(q=>q.dbId));return reportsNormalizeCrossings(sec).filter(c=>c.include!==false&&reportsCrossingQuestionIds(c).length&&reportsCrossingQuestionIds(c).every(id=>valid.has(id)));}
async function clientLoadReportOverview(){
  const out=document.getElementById('cr-client-report');if(!out||CR_CLIENT_REPORT_LOADING)return;
  const c=clientSelf(),s=clientSelfSurvey(),qs=reportsQuestionsForSurvey(s||{}),crossQs=reportsCrossQuestionsForSurvey(s||{});if(!c||!s||!qs.length)return;
  if(!clientResultsReleasedForSurvey(c,s)){out.innerHTML='<div class="card"><div class="empty">Os resultados ainda não foram liberados.</div></div>';return;}
  CR_CLIENT_REPORT_LOADING=true;out.innerHTML='<div class="empty" style="padding:28px 0">Carregando resultados agregados…</div>';
  try{
    const {data:docs,error:docError}=await clientWithTimeout(sb.from('report_documents').select('id,title,subtitle,presentation,methodology,executive_summary,sections,status,published_at').eq('survey_id',s.id).eq('client_id',CURRENT_PROFILE?.id||c.id).eq('status','published').order('published_at',{ascending:false}).limit(1),'o relatório publicado');
    if(docError)throw docError;
    const publishedDocument=docs?.[0]||null;
    const {data:overviewRows,error:overviewError}=await clientWithTimeout(sb.rpc('client_report_all_questions',{p_survey_id:s.id}),'os resultados agregados');
    if(overviewError)throw overviewError;
    const crossings=clientPublishedCrossings(publishedDocument,crossQs),crossRowsById={};
    for(const crossing of crossings){const ids=reportsCrossingQuestionIds(crossing);const {data,error}=await clientWithTimeout(sb.rpc('client_report_cross_tab',{p_survey_id:s.id,p_question_ids:ids}),'os cruzamentos do relatório');if(error)throw error;crossRowsById[crossing.id]=data||[];}
    CR_CLIENT_REPORT_CACHE={surveyId:s.id,overviewRows:overviewRows||[],crossRowsById,document:publishedDocument};
    clientRenderReportOverview(out,s,qs,overviewRows||[],publishedDocument,crossings);
  }catch(ex){
    out.innerHTML='<div class="callout warn"><b>Não foi possível carregar o relatório completo.</b><br>Verifique se a migration de resultados para clientes foi executada no Supabase. Detalhe: '+esc(ex?.message||ex)+'</div>';
  }finally{CR_CLIENT_REPORT_LOADING=false;}
}
function clientRenderReportOverview(out,survey,qs,rows,document,crossings){const byQ={};(rows||[]).forEach(r=>(byQ[r.question_id]||(byQ[r.question_id]=[])).push(r));const cards=qs.map((q,qi)=>{const data=byQ[q.dbId]||[],base=Number(data[0]?.valid_base)||0,total=data.reduce((sum,r)=>sum+Number(r.cnt||0),0),max=Math.max(1,...data.map(r=>Number(r.cnt||0)));const lines=data.length?data.map(r=>{const cnt=Number(r.cnt||0),pct=reportPercent(cnt,base||total);return `<div class="reports-answer-row"><div class="reports-answer-head"><span>${esc(r.value_label||'(sem resposta)')}</span><strong>${cnt.toLocaleString('pt-BR')} · ${pct}%</strong></div><div class="reports-answer-bar"><i style="width:${Math.min(100,Math.round((cnt/max)*100))}%"></i></div></div>`;}).join(''):'<div class="empty" style="padding:16px 0">Ainda não há respostas válidas.</div>';return `<article class="card reports-question-card"><div class="reports-question-head"><div><span class="reports-question-number">${String(qi+1).padStart(2,'0')}</span><h3>${esc(q.text||'(pergunta sem texto)')}</h3></div><span class="pill pill-blue">${base.toLocaleString('pt-BR')} válidas</span></div><div class="reports-question-meta">${esc(Q_TYPES[q.type]||q.type||'Pergunta')}</div>${lines}</article>`;}).join('');let html=`<div class="reports-overview-head"><div><h2>${esc(document?.title||'Resultados da pesquisa')}</h2><p>${esc(document?.subtitle||'Distribuição atualizada das respostas válidas, pergunta a pergunta.')}</p></div><span class="reports-count-pill">${qs.length} pergunta${qs.length===1?'':'s'}</span></div>`;if(document?.presentation)html+=`<article class="card reports-client-intro"><div class="card-t">Apresentação</div><p>${esc(document.presentation)}</p></article>`;html+=`<div class="reports-question-list">${cards}</div>`;if(document?.executive_summary)html+=`<article class="card reports-client-summary"><div class="card-t">Síntese executiva</div><p>${esc(document.executive_summary)}</p></article>`;if(crossings.length){html+=`<div class="reports-overview-head" style="margin-top:24px"><div><h2>Cruzamentos do relatório</h2><p>Matrizes percentuais sobre a base total de entrevistas válidas.</p></div><span class="reports-count-pill">${crossings.length} análise${crossings.length===1?'':'s'}</span></div>`;crossings.forEach(c=>{const rowsFor=CR_CLIENT_REPORT_CACHE.crossRowsById[c.id]||[],ids=reportsCrossingQuestionIds(c),thirdValues=ids.length>=3?clientReportCrossOrderedValues(rowsFor,2,ids[2],qs):[null];html+=`<article class="card reports-client-crossing"><div class="card-t">${esc(c.title)}</div><div class="card-d">${ids.map((id,i)=>(i+1)+'. '+esc(clientReportQuestionLabel(qs,id))).join(' · ')}</div>${thirdValues.map(tv=>clientReportCrossMatrixMarkup(clientReportCrossMatrixModel(rowsFor,ids,tv,qs),ids,qs,tv==null?'':clientReportQuestionLabel(qs,ids[2])+': '+tv)).join('')}</article>`;});}out.innerHTML=html;}

async function clientLoadPublishedReports(){
  const wrap=document.getElementById('client-published-reports-list');if(!wrap||!sb?.rpc)return;
  const s=clientSelfSurvey();if(!s){wrap.innerHTML='<div class="empty" style="padding:14px 0">Nenhum relatório disponível.</div>';return;}
  try{
    const {data,error}=await clientWithTimeout(sb.rpc('client_published_reports',{p_survey_id:s.id}),'os relatórios publicados');if(error)throw error;
    const reports=data||[];
    if(!reports.length){wrap.innerHTML='<div class="empty" style="padding:14px 0">A equipe ainda não publicou um relatório final para esta pesquisa.</div>';return;}
    const rows=[];
    for(const r of reports){let url='';try{url=(await sb.storage.from('client-reports').createSignedUrl(r.pdf_path,600)).data?.signedUrl||'';}catch(ex){}rows.push(`<div class="client-report-row"><div><b>${esc(r.title||'Relatório final')}</b><span>${esc(r.subtitle||'PesquisaPro')} · publicado em ${r.published_at?new Date(r.published_at).toLocaleDateString('pt-BR'):'—'}</span>${r.executive_summary?`<p>${esc(r.executive_summary).slice(0,220)}${r.executive_summary.length>220?'…':''}</p>`:''}</div>${url?`<a class="btn btn-fill" href="${esc(url)}" target="_blank" rel="noopener">Abrir PDF</a>`:'<span class="pill pill-amber">Preparando arquivo</span>'}</div>`);}
    wrap.innerHTML=rows.join('');
  }catch(ex){wrap.innerHTML='<div class="callout warn">Não foi possível carregar os relatórios publicados agora.</div>';}
}
let _clientResultsChart;
async function clientResultsLoadAndRender(){
  const out=document.getElementById('cr-output');
  if(!out)return;
  const s=clientSelfSurvey();
  if(!s||!CR_QUESTION_DBID){out.innerHTML='';return;}
  out.innerHTML='<div class="empty" style="padding:20px 0">Carregando…</div>';
  let rows;
  try{
    if(!clientResultsReleasedForSurvey(clientSelf(),s)){out.innerHTML='<div class="callout">Os resultados ainda não foram liberados para esta pesquisa.</div>';return;}
    const {data,error}=await sb.rpc('survey_answer_distribution',{p_survey_id:s.id,p_question_id:CR_QUESTION_DBID});
    if(error)throw new Error(error.message);
    rows=data||[];
  }catch(ex){
    out.innerHTML='<div class="callout">Não foi possível carregar os resultados agora ('+esc(ex.message)+').</div>';
    return;
  }
  renderDistributionOutput(out,rows,'cr-canvas',c=>{_clientResultsChart=c;},_clientResultsChart);
}
/* desenha o gráfico + tabela de uma distribuição de respostas (usado tanto
   em Resultados do cliente quanto em Relatórios do staff) — recebe as linhas
   {value_label, cnt} já filtradas (válidas, sem calibração) pela RPC
   survey_answer_distribution. */
function renderDistributionOutput(out,rows,canvasId,setChart,prevChart){
  const total=rows.reduce((sum,r)=>sum+(+r.cnt||0),0);
  if(prevChart){try{prevChart.destroy();}catch(e){}}
  if(!total){
    out.innerHTML='<div class="card"><div class="empty">Ainda não há respostas válidas registradas para esta pergunta.</div></div>';
    return;
  }
  const colors=['#2563eb','#ea580c','#059669','#7c3aed','#d97706','#dc2626','#0891b2','#64748b'];
  const tbl='<table><thead><tr><th></th><th>Respostas</th><th>%</th></tr></thead><tbody>'+
    rows.map((r,i)=>{const pct=Math.round((+r.cnt/total)*100);return `<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${colors[i%colors.length]};margin-right:6px"></span>${esc(r.value_label||'(sem resposta)')}</td><td>${r.cnt}</td><td><b>${pct}%</b></td></tr>`;}).join('')+
    '</tbody></table>';
  out.innerHTML=`<div class="grid g2">
    <div class="card"><div class="card-t">Gráfico</div><div class="card-d">Base: ${total.toLocaleString('pt-BR')} entrevistas válidas</div>
      <div class="reports-distribution-chart"><canvas id="${canvasId}" role="img" aria-label="Gráfico de distribuição de respostas"></canvas></div></div>
    <div class="card"><div class="card-t">Tabela</div><div class="card-d">Percentual sobre o total de respostas válidas</div>${tbl}</div>
  </div>`;
  const cv=document.getElementById(canvasId);
  if(cv){
    const draw=()=>setChart(new Chart(cv,{type:'bar',data:{labels:rows.map(r=>r.value_label||'(sem resposta)'),
      datasets:[{data:rows.map(r=>+r.cnt),backgroundColor:rows.map((r,i)=>colors[i%colors.length]),borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{y:{beginAtZero:true,grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}}));
    if(typeof Chart==='undefined'){
      loadLocalAsset('chart').then(()=>{if(document.getElementById(canvasId)===cv)draw();}).catch(()=>{});
    }else draw();
  }
}

/* ============ SURVEYS / construtor ============ */
/* ============ NEW SURVEY WIZARD ============ */
const WIZ={step:1,total:7,editIndex:null,
  data:{name:'',tipo:'Eleitoral / intenção de voto',dataIni:'',dataFim:'',abrangencia:'estadual',estados:[],cidades:{},
    pop:1000000,err:'0.03',conf:'1.96',prop:50,price:5,priceRemote:8,clientPrice:12,clientes:[],
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{},clientReleaseById:{}}};
let WIZ_QID=1;
const Q_TYPES={single:'Escolha única',multi:'Múltipla escolha',ranking:'Ranking de preferências',pair:'Duas respostas',scale:'Escala 1–5',scale10:'Escala 1–10',nps:'NPS 0–10',open:'Resposta aberta',number:'Número',date:'Data'};
const Q_HAS_OPTS=t=>t==='single'||t==='multi'||t==='ranking';
const Q_HAS_QUOTA_OPTS=t=>t==='single'||t==='multi';
const Q_CLOSED_FIELD_TYPES=['single','multi'];
const DEFAULT_PAIR_FIELDS=()=>[
  {label:'Resposta 1',type:'open',options:[]},
  {label:'Resposta 2',type:'open',options:[]},
];
const WIZ_STEPS=['Pesquisa','Formulário','Amostra','Cotas','Preço','Cliente','Revisão'];

/* abrangência geográfica da pesquisa */
const ABRANGENCIA_LABELS={
  municipal:'Municipal',
  'regional-estadual':'Regional estadual',
  estadual:'Estadual',
  'regional-nacional':'Regional nacional',
  nacional:'Nacional',
};
const ABRANGENCIA_CFG={
  municipal:{multiState:false,multiCity:false},
  'regional-estadual':{multiState:false,multiCity:true},
  estadual:{multiState:false,multiCity:true},
  'regional-nacional':{multiState:true,multiCity:true},
  nacional:{multiState:true,multiCity:true},
};

function blankSurveyData(){
  return {name:'',tipo:'Eleitoral / intenção de voto',dataIni:'',dataFim:'',abrangencia:'estadual',estados:[],cidades:{},
    pop:1000000,err:'0.03',conf:'1.96',prop:50,price:5,priceRemote:8,clientPrice:12,clientes:[],
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{},clientReleaseById:{}};
}

/* store de pesquisas — carregado do Supabase (ver bloco "PESQUISAS — carregamento
   e gravação no Supabase" logo abaixo). Cada item ganha um campo extra `id` (o
   UUID da linha em surveys), usado para localizar a linha certa ao salvar. */
let SURVEYS=[];
let SURVEYS_LOADED=false;
let SURVEYS_LOADING=false;
let SURVEY_END_CONDITION_SCHEMA_MISSING=false;
let SURVEY_NEW_FORMAT_SCHEMA_MISSING=false;

function fmtRelativo(iso){
  if(!iso)return 'agora';
  const then=new Date(iso).getTime();
  if(isNaN(then))return 'agora';
  const diffMs=Date.now()-then;
  if(diffMs<60000)return 'agora';
  const mins=Math.floor(diffMs/60000);
  if(mins<60)return 'há '+mins+' min';
  const hours=Math.floor(mins/60);
  if(hours<24)return 'há '+hours+'h';
  const days=Math.floor(hours/24);
  return 'há '+days+' dia'+(days===1?'':'s');
}

/* transforma a linha de `surveys` (+ perguntas/opções/clientes vinculados já
   carregados junto) na mesma forma de objeto que o assistente (WIZ) e as
   telas de pesquisa sempre usaram — assim o resto do código não muda. */
function surveyRowToSnapshot(row,questionRows,clientCompanyNames,teamNames){
  const quotas={},quotaOff={},remote={};
  const questions=(questionRows||[]).filter(q=>q.is_active!==false).map((q,qi)=>{
    const localId=qi+1;
    const opts=(q.survey_question_options||[]).slice().sort((a,b)=>a.position-b.position);
    if(opts.length){
      if(opts.every(o=>o.quota_enabled===false))quotaOff[localId]=true;
      opts.forEach((o,oi)=>{
        if(o.quota_pct!=null){quotas[localId]=quotas[localId]||{};quotas[localId][oi]=o.quota_pct;}
        if(o.is_remote)remote[oi]=true;
      });
    }
    const fields=(q.survey_question_fields||[]).slice().sort((a,b)=>a.position-b.position).map(field=>{
      let options=field.options_jsonb;
      if(typeof options==='string'){try{options=JSON.parse(options);}catch(ex){options=[];}}
      return {id:field.id,label:field.label||'',type:field.type||'open',options:Array.isArray(options)?options.map(v=>String(v??'')):[]};
    });
    return {id:localId,dbId:q.id,text:q.text||'',type:q.type||'single',opts:opts.map(o=>o.label||''),endsInterview:opts.map(o=>!!o.ends_interview),fields:fields.length===2?fields:DEFAULT_PAIR_FIELDS(),isRegion:!!q.is_region};
  });
  return {
    id:row.id,
    name:row.name,tipo:row.tipo||'',dataIni:row.data_ini||'',dataFim:row.data_fim||'',
    abrangencia:row.abrangencia||'estadual',estados:row.estados||[],cidades:row.cidades||{},
    pop:row.populacao||0,
    err:row.margem_erro!=null?String(row.margem_erro):'0.03',
    conf:row.nivel_confianca!=null?String(row.nivel_confianca):'1.96',
    prop:row.proporcao!=null?row.proporcao:50,
    price:row.price||0,priceRemote:row.price_remote||0,clientPrice:row.client_price||0,
    clientes:clientCompanyNames||[],
    clientIds:(row.survey_clients||[]).map(sc=>sc.client_id), /* ids reais dos clientes vinculados — usado para o cliente logado achar sua própria pesquisa sem depender de nome/USERS carregado */
    clientReleaseById:Object.fromEntries((row.survey_clients||[]).filter(sc=>sc.client_id).map(sc=>[sc.client_id,!!sc.results_released])),
    formStarted:!!row.form_started,formApprovalRequired:!!row.form_approval_required,questions,quotas,quotaOff,remote,
    collected:row.collected||0,status:row.status||'rascunho',
    created:fmtRelativo(row.created_at),
    team:teamNames||[],coord:'',isNew:false,
  };
}
function snapshotToSurveyRow(d){
  return {
    name:d.name||'Pesquisa sem nome',tipo:d.tipo||null,data_ini:d.dataIni||null,data_fim:d.dataFim||null,
    abrangencia:d.abrangencia||null,estados:d.estados||[],cidades:d.cidades||{},
    populacao:+d.pop||0,margem_erro:d.err?+d.err:null,nivel_confianca:d.conf?+d.conf:null,
    proporcao:+d.prop||50,price:+d.price||0,price_remote:+d.priceRemote||0,client_price:+d.clientPrice||0,
    form_started:!!d.formStarted,status:d.status||'rascunho',form_approval_required:!!d.formApprovalRequired,
  };
}
/* atualiza perguntas/opções sem apagar perguntas que já possuem respostas.
   Perguntas removidas do editor ficam inativas quando a migration nova está
   aplicada; assim o histórico continua preservado sem aparecer no formulário. */
async function syncSurveyQuestionsAndOptions(surveyId,d){
  SURVEY_END_CONDITION_SCHEMA_MISSING=false;
  let activeColumnAvailable=true;
  const existingResult=await sb.from('survey_questions').select('id').eq('survey_id',surveyId);
  if(existingResult.error)throw new Error('Não foi possível ler as perguntas atuais: '+existingResult.error.message);
  const existingIds=(existingResult.data||[]).map(row=>row.id);
  const questions=d.questions||[];
  const keptIds=new Set(questions.map(q=>q.dbId).filter(Boolean));
  const removedIds=existingIds.filter(id=>!keptIds.has(id));
  if(removedIds.length){
    let inactiveResult=await sb.from('survey_questions').update({is_active:false}).eq('survey_id',surveyId).in('id',removedIds);
    if(inactiveResult.error&&/is_active|schema cache|column .* does not exist/i.test(inactiveResult.error.message||''))activeColumnAvailable=false;
    else if(inactiveResult.error)throw new Error('Não foi possível preservar perguntas removidas: '+inactiveResult.error.message);
  }
  for(let i=0;i<questions.length;i++){
    const q=questions[i];
    const baseQuestionPayload={
      survey_id:surveyId,position:i,text:q.text||'',type:q.type||'single',is_region:!!q.isRegion,
    };
    let questionResult;
    if(q.dbId&&existingIds.includes(q.dbId)){
      const updatePayload=activeColumnAvailable?{...baseQuestionPayload,is_active:true}:baseQuestionPayload;
      questionResult=await sb.from('survey_questions').update(updatePayload).eq('id',q.dbId).eq('survey_id',surveyId).select().single();
      if(questionResult.error&&activeColumnAvailable&&/is_active|schema cache|column .* does not exist/i.test(questionResult.error.message||'')){
        activeColumnAvailable=false;
        questionResult=await sb.from('survey_questions').update(baseQuestionPayload).eq('id',q.dbId).eq('survey_id',surveyId).select().single();
      }
    }else{
      questionResult=await sb.from('survey_questions').insert(baseQuestionPayload).select().single();
    }
    const {data:qRow,error:qErr}=questionResult;
    if(qErr)throw new Error('Não foi possível salvar as perguntas: '+qErr.message);
    q.dbId=qRow.id;
    const {error:oldOptionsError}=await sb.from('survey_question_options').delete().eq('question_id',qRow.id);
    if(oldOptionsError)throw new Error('Não foi possível atualizar as opções: '+oldOptionsError.message);
    const fieldsResult=await sb.from('survey_question_fields').select('id,position').eq('question_id',qRow.id).order('position');
    const fieldsTableMissing=fieldsResult.error&&/survey_question_fields|schema cache|relation .* does not exist/i.test(fieldsResult.error.message||'');
    if(fieldsResult.error&&!fieldsTableMissing)throw new Error('Não foi possível ler os dois subcampos: '+fieldsResult.error.message);
    const existingFieldRows=fieldsResult.data||[];
    if(Q_HAS_OPTS(q.type)&&q.opts&&q.opts.length){
      const off=!!(d.quotaOff&&d.quotaOff[q.id]);
      const localQuotas=(d.quotas&&d.quotas[q.id])||{};
      // localQuotas é indexado pela posição entre as opções PREENCHIDAS
      // (mesmo critério usado na tela de cotas), não pela posição bruta em
      // q.opts — que pode ter opções em branco no meio. Também cai para a
      // divisão igual como padrão em vez de null, para o caso de a cota
      // nunca ter sido tocada manualmente pelo admin.
      const filledIdx=[];q.opts.forEach((label,oi)=>{if(label&&label.trim())filledIdx.push(oi);});
      const def=filledIdx.length?Math.round(100/filledIdx.length):null;
      const optRows=q.opts.map((label,oi)=>{
        const fi=filledIdx.indexOf(oi);
        const pct=off||fi===-1?null:(localQuotas[fi]!=null?localQuotas[fi]:def);
        return{
          question_id:qRow.id,position:oi,label:label||'',
          is_remote:q.isRegion?!!(d.remote&&d.remote[oi]):false,
          quota_pct:pct,
          quota_enabled:!off,
          ends_interview:!!(q.endsInterview&&q.endsInterview[oi]),
        };
      });
      let optionInsert=await sb.from('survey_question_options').insert(optRows);
      const optionSchemaMissing=optionInsert.error&&/ends_interview|schema cache|column .* does not exist/i.test(optionInsert.error.message||'');
      if(optionSchemaMissing){
        SURVEY_END_CONDITION_SCHEMA_MISSING=true;
        const legacyOptRows=optRows.map(({ends_interview,...row})=>row);
        optionInsert=await sb.from('survey_question_options').insert(legacyOptRows);
      }
      const {error:oErr}=optionInsert;
      if(oErr)throw new Error('Não foi possível salvar as opções: '+oErr.message);
    }
    if(q.type==='pair'){
      if(fieldsTableMissing)throw new Error('Para usar “Duas respostas”, execute a migration deploy/perguntas-ranking-duas-respostas.sql no Supabase.');
      const fields=(q.fields&&q.fields.length===2?q.fields:DEFAULT_PAIR_FIELDS()).map((field,fieldIndex)=>({
        question_id:qRow.id,position:fieldIndex,label:String(field.label||'Resposta '+(fieldIndex+1)).trim()||'Resposta '+(fieldIndex+1),type:Q_CLOSED_FIELD_TYPES.includes(field.type)?field.type:'open',options_jsonb:Q_CLOSED_FIELD_TYPES.includes(field.type)?(field.options||[]).filter(v=>String(v||'').trim()):[],
      }));
      const keptFieldIds=[];
      for(let fieldIndex=0;fieldIndex<fields.length;fieldIndex++){
        const current=existingFieldRows[fieldIndex];let fieldResult;
        if(current)fieldResult=await sb.from('survey_question_fields').update(fields[fieldIndex]).eq('id',current.id).eq('question_id',qRow.id).select().single();
        else fieldResult=await sb.from('survey_question_fields').insert(fields[fieldIndex]).select().single();
        if(fieldResult.error)throw new Error('Não foi possível salvar os dois subcampos: '+fieldResult.error.message);
        keptFieldIds.push(fieldResult.data.id);
        if(q.fields?.[fieldIndex])q.fields[fieldIndex].id=fieldResult.data.id;
      }
      const staleFieldIds=existingFieldRows.map(field=>field.id).filter(id=>!keptFieldIds.includes(id));
      if(staleFieldIds.length){const {error:staleError}=await sb.from('survey_question_fields').delete().in('id',staleFieldIds);if(staleError)throw new Error('Não foi possível remover subcampos antigos: '+staleError.message);}
    }else if(!fieldsTableMissing&&existingFieldRows.length){
      const {error:staleError}=await sb.from('survey_question_fields').delete().in('id',existingFieldRows.map(field=>field.id));
      if(staleError)throw new Error('Não foi possível desassociar subcampos antigos: '+staleError.message);
    }
  }
}
/* apaga e recria os vínculos com clientes (a lista `d.clientes` guarda nomes
   de empresa — resolvidos aqui para o id real do perfil do cliente) */
async function syncSurveyClients(surveyId,companyNames,requestedReleaseById={}){
  const {data:existing,error:existingError}=await sb.from('survey_clients').select('client_id,results_released').eq('survey_id',surveyId);
  if(existingError)throw new Error('Não foi possível ler os acessos atuais: '+existingError.message);
  const releaseById=Object.fromEntries((existing||[]).map(row=>[row.client_id,!!row.results_released]));
  const {error:deleteError}=await sb.from('survey_clients').delete().eq('survey_id',surveyId);
  if(deleteError)throw new Error('Não foi possível atualizar os clientes vinculados: '+deleteError.message);
  const ids=(companyNames||[]).map(name=>{
    const c=clienteUsers().find(x=>x.company===name);
    return c&&c.id;
  }).filter(Boolean);
  if(ids.length){
    const {error}=await sb.from('survey_clients').insert(ids.map(id=>({survey_id:surveyId,client_id:id,results_released:requestedReleaseById[id]===true||releaseById[id]===true})));
    if(error)throw new Error('Não foi possível vincular os clientes: '+error.message);
  }
}
/* apaga e recria a equipe atribuída à pesquisa (os nomes vêm marcados na
   tela "Atribuir equipe" — resolvidos aqui para o id real do pesquisador) */
async function syncSurveyTeam(surveyId,researcherNames){
  await sb.from('survey_team').delete().eq('survey_id',surveyId);
  const ids=(researcherNames||[]).map(name=>{
    const u=pesqUsers().find(x=>x.name===name);
    return u&&u.id;
  }).filter(Boolean);
  if(ids.length){
    const {error}=await sb.from('survey_team').insert(ids.map(id=>({survey_id:surveyId,researcher_id:id})));
    if(error)throw new Error('Não foi possível salvar a equipe: '+error.message);
  }
}
const SURVEY_JOIN_SELECT_LEGACY='*, survey_questions(*, survey_question_options(*)), survey_clients(client_id, results_released), survey_team(researcher_id)';
const SURVEY_JOIN_SELECT='*, survey_questions(*, survey_question_options(*), survey_question_fields(*)), survey_clients(client_id, results_released), survey_team(researcher_id)';
function idsToClientCompanies(ids){return ids.map(id=>{const c=USERS.find(u=>u.id===id);return c?(c.company||c.name):null;}).filter(Boolean);}
function idsToResearcherNames(ids){return ids.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:null;}).filter(Boolean);}
async function reloadSurveySnapshot(surveyId){
  let result=await sb.from('surveys').select(SURVEY_JOIN_SELECT).eq('id',surveyId).single();
  if(result.error&&/survey_question_fields|schema cache|relation .* does not exist/i.test(result.error.message||'')){
    SURVEY_NEW_FORMAT_SCHEMA_MISSING=true;
    result=await sb.from('surveys').select(SURVEY_JOIN_SELECT_LEGACY).eq('id',surveyId).single();
  }
  const {data,error}=result;
  if(error||!data)throw new Error(error?error.message:'Pesquisa não encontrada depois de salvar.');
  const qRows=(data.survey_questions||[]).slice().sort((a,b)=>a.position-b.position);
  const companyNames=idsToClientCompanies((data.survey_clients||[]).map(sc=>sc.client_id));
  const teamNames=idsToResearcherNames((data.survey_team||[]).map(t=>t.researcher_id));
  return surveyRowToSnapshot(data,qRows,companyNames,teamNames);
}
async function loadSurveysIfNeeded(){
  if(SURVEYS_LOADED||SURVEYS_LOADING)return;
  SURVEYS_LOADING=true;
  await loadUsersIfNeeded(); // precisa dos nomes reais para resolver clientes/equipe vinculados
  try{
    let result=await sb.from('surveys').select(SURVEY_JOIN_SELECT).order('created_at',{ascending:false});
    if(result.error&&/survey_question_fields|schema cache|relation .* does not exist/i.test(result.error.message||'')){
      SURVEY_NEW_FORMAT_SCHEMA_MISSING=true;
      result=await sb.from('surveys').select(SURVEY_JOIN_SELECT_LEGACY).order('created_at',{ascending:false});
    }
    const {data,error}=result;
    if(!error){
      SURVEYS=(data||[]).map(row=>{
        const qRows=(row.survey_questions||[]).slice().sort((a,b)=>a.position-b.position);
        const companyNames=idsToClientCompanies((row.survey_clients||[]).map(sc=>sc.client_id));
        const teamNames=idsToResearcherNames((row.survey_team||[]).map(t=>t.researcher_id));
        return surveyRowToSnapshot(row,qRows,companyNames,teamNames);
      });
      SURVEYS_LOADED=true;
    }else console.error('Erro ao carregar pesquisas:',error);
  }catch(ex){console.error('Erro de conexão ao carregar pesquisas:',ex);}
  SURVEYS_LOADING=false;
  refreshClientSurveyLinks();
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='surveys'||k==='surveys-done'||k==='dashboard'||k==='dashboard-pesq'||k==='survey-team'||k==='client-surveys'||k==='client-progress'||k==='client-results'||k==='reports'||k==='communication')go(k);
}
function surveySample(s){
  return Math.ceil(sampleSize(s&&s.pop,s&&s.err,s&&s.conf,s&&s.prop)*1.1);
}
/* total de entrevistas válidas desta pesquisa — assim que a Coleta de campo
   estiver carregada (collection_events reais), usa a contagem de verdade;
   antes disso cai no valor gravado na própria pesquisa (histórico/seed). */
function surveyCollectedCount(s){
  if(COLLECT_EVENTS_LOADED)return COLLECT_EVENTS.filter(e=>e.surveyId===s.id&&e.status==='valid').length;
  return s.collected||0;
}
const STATUS_PILL={
  campo:'<span class="pill pill-green">● Em campo</span>',
  rascunho:'<span class="pill pill-gray">● Rascunho</span>',
  encerrada:'<span class="pill pill-blue">● Encerrada</span>',
};

PAGES['new-survey']=()=>head(WIZ.editIndex!=null?'Editar pesquisa':'Nova pesquisa','Defina formulário, amostra com cotas e preço. A equipe é atribuída depois.',
  '<button class="btn btn-out" onclick="surveyFormPdfDownload()">📄 Baixar formulário PDF</button>')+`
  <div class="wiz-steps" id="wizSteps"></div>
  <div id="wizBody"></div>`;

function wizStepsBar(){
  return WIZ_STEPS.map((s,i)=>{
    const n=i+1;const st=n<WIZ.step?'done':n===WIZ.step?'on':'';
    return `<div class="wiz-step ${st}" style="cursor:pointer" onclick="wizJump(${n})"><div class="ws-num">${n<WIZ.step?'✓':n}</div><span>${s}</span></div>`;
  }).join('<div class="wiz-line"></div>');
}
function wizJump(n){
  if(n===WIZ.step||n<1||n>WIZ.total)return;
  wizSave();
  WIZ.step=n;wizRender();
}

function wizRender(){
  const sb=document.getElementById('wizSteps');if(!sb)return;
  sb.innerHTML=wizStepsBar();
  document.getElementById('wizBody').innerHTML=WIZ_BODY[WIZ.step]();
  if(WIZ.step===1){wizGeoRender();}
  if(WIZ.step===2&&WIZ.data.formStarted){qRender();}
  if(WIZ.step===3){wizCalc();}
  if(WIZ.step===4){renderQuotas();}
  if(WIZ.step===5)wizPrice();
  if(WIZ.step===7)wizReview();
}
function wizGo(d){
  const n=WIZ.step+d;
  if(n<1||n>WIZ.total)return;
  if(d>0)wizSave();
  WIZ.step=n;wizRender();
}
function wizSave(){
  const g=id=>{const e=document.getElementById(id);return e?e.value:null;};
  if(WIZ.step===1&&g('w-name')!=null){
    WIZ.data.name=g('w-name');
    const tipoEl=document.getElementById('w-tipo');if(tipoEl)WIZ.data.tipo=tipoEl.value;
    if(g('w-data-ini')!=null)WIZ.data.dataIni=g('w-data-ini');
    if(g('w-data-fim')!=null)WIZ.data.dataFim=g('w-data-fim');
  }
  if(WIZ.step===3){
    WIZ.data.pop=+g('w-pop');WIZ.data.err=g('w-err');WIZ.data.conf=g('w-conf');WIZ.data.prop=+g('w-prop');
  }
  if(WIZ.step===5){WIZ.data.price=+g('w-price');WIZ.data.priceRemote=+g('w-price-r');WIZ.data.clientPrice=+g('w-client-price')||WIZ.data.clientPrice;}
}

const WIZ_BODY={};
WIZ_BODY[1]=()=>`<div class="card" style="max-width:640px">
  <div class="card-t">Sobre a pesquisa</div><div class="card-d">Identifique a pesquisa que será criada</div>
  <div class="mb"><label class="lbl">Nome da pesquisa</label><input class="inp" id="w-name" value="${esc(WIZ.data.name||'Pesquisa Eleitoral MG · 2026')}"></div>
  <div class="field-row mb">
    <div><label class="lbl">Tipo</label><select class="inp" id="w-tipo">
      ${['Eleitoral / intenção de voto','Avaliação de gestão','Opinião / mercado','Satisfação','Outro'].map(t=>`<option ${WIZ.data.tipo===t?'selected':''}>${t}</option>`).join('')}
    </select></div>
    <div></div>
  </div>
  <div class="field-row mb">
    <div><label class="lbl">Data de início</label><input class="inp" type="date" id="w-data-ini" value="${WIZ.data.dataIni||''}"></div>
    <div><label class="lbl">Data de fim</label><input class="inp" type="date" id="w-data-fim" value="${WIZ.data.dataFim||''}"></div>
  </div>
  <div class="mb"><label class="lbl">Abrangência</label>
    <select class="inp" id="w-abrangencia" onchange="wizAbrangenciaChange(this.value)">
      ${Object.keys(ABRANGENCIA_LABELS).map(k=>`<option value="${k}" ${WIZ.data.abrangencia===k?'selected':''}>${ABRANGENCIA_LABELS[k]}</option>`).join('')}
    </select>
  </div>
  <div id="wiz-geo"></div>
  ${wizNav(true)}</div>`;

/* ---- abrangência geográfica: estado(s) e cidade(s) ---- */
function wizGeoRender(){
  const wrap=document.getElementById('wiz-geo');if(!wrap)return;
  const ab=WIZ.data.abrangencia||'estadual';
  const cfg=ABRANGENCIA_CFG[ab]||ABRANGENCIA_CFG.estadual;
  const ufsOrd=BR_ESTADOS;
  let estadoHtml='';
  if(cfg.multiState){
    const n=WIZ.data.estados.length;
    estadoHtml=`<div class="mb">
      <label class="lbl">Estado(s)</label>
      <div class="geo-actions"><a href="javascript:void(0)" onclick="wizSelectAllEstados()">selecionar todos</a> · <a href="javascript:void(0)" onclick="wizClearEstados()">limpar</a> <span style="margin-left:8px;color:var(--ink3)">${n} selecionado${n===1?'':'s'}</span></div>
      <div class="geo-chip-wrap">${ufsOrd.map(e=>`<button type="button" class="chip ${WIZ.data.estados.includes(e.sigla)?'on':''}" onclick="wizToggleEstado('${e.sigla}')">${e.sigla}</button>`).join('')}</div>
    </div>`;
  }else{
    estadoHtml=`<div class="mb"><label class="lbl">Estado</label>
      <select class="inp" id="w-estado" onchange="wizEstadoChangeSingle(this.value)">
        <option value="">Selecione o estado…</option>
        ${ufsOrd.map(e=>`<option value="${e.sigla}" ${WIZ.data.estados[0]===e.sigla?'selected':''}>${esc(e.nome)} (${e.sigla})</option>`).join('')}
      </select></div>`;
  }
  wrap.innerHTML=estadoHtml+`<div id="geo-city-wrap"></div>`;
  wizGeoRenderCidades();
}
function wizGeoRenderCidades(){
  const wrap=document.getElementById('geo-city-wrap');if(!wrap)return;
  const ab=WIZ.data.abrangencia||'estadual';
  const cfg=ABRANGENCIA_CFG[ab]||ABRANGENCIA_CFG.estadual;
  const ufs=WIZ.data.estados||[];
  if(!ufs.length){
    wrap.innerHTML=`<div class="empty" style="margin-top:6px">Selecione ${cfg.multiState?'ao menos um estado':'um estado'} para escolher ${cfg.multiCity?'as cidades':'a cidade'}.</div>`;
    return;
  }
  if(cfg.multiCity){
    const items=[];
    ufs.forEach(uf=>{(BR_MUNICIPIOS[uf]||[]).forEach(c=>items.push({uf,c}));});
    const selCount=Object.values(WIZ.data.cidades).reduce((a,arr)=>a+arr.length,0);
    wrap.innerHTML=`<div class="mb">
      <label class="lbl">Cidades</label>
      <input class="inp" placeholder="Buscar cidade…" id="geo-search" oninput="wizFilterCidades(this.value)" style="margin-bottom:8px">
      <div class="geo-actions"><a href="javascript:void(0)" onclick="wizSelectAllCidades()">selecionar todas</a> · <a href="javascript:void(0)" onclick="wizClearCidades()">limpar</a> <span id="geo-cidade-count" style="margin-left:8px;color:var(--ink3)">${selCount} selecionada${selCount===1?'':'s'}</span></div>
      <div class="geo-box" id="geo-city-list">
        ${items.map(({uf,c})=>{
          const checked=(WIZ.data.cidades[uf]||[]).includes(c);
          const safeC=jsArg(c);
          return `<label class="geo-city-row" data-name="${esc((c+' '+uf).toLowerCase())}">
            <input type="checkbox" ${checked?'checked':''} onchange="wizToggleCidade(${jsArg(uf)},${safeC})">
            <span>${esc(c)}${ufs.length>1?` <span class="geo-uf-tag">${uf}</span>`:''}</span>
          </label>`;
        }).join('')}
      </div>
    </div>`;
  }else{
    const uf=ufs[0];
    const currentCity=(WIZ.data.cidades[uf]||[])[0]||'';
    wrap.innerHTML=`<div class="mb"><label class="lbl">Cidade</label>
      <select class="inp" id="w-cidade" onchange="wizCidadeChangeSingle(this.value)">
        <option value="">Selecione a cidade…</option>
        ${(BR_MUNICIPIOS[uf]||[]).map(c=>`<option value="${esc(c)}" ${currentCity===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select></div>`;
  }
}
function wizAbrangenciaChange(v){
  const cfg=ABRANGENCIA_CFG[v]||ABRANGENCIA_CFG.estadual;
  WIZ.data.abrangencia=v;
  if(!cfg.multiState&&WIZ.data.estados.length>1){WIZ.data.estados=WIZ.data.estados.slice(0,1);}
  if(!cfg.multiCity){
    const uf=WIZ.data.estados[0];
    const first=uf&&WIZ.data.cidades[uf]&&WIZ.data.cidades[uf][0];
    WIZ.data.cidades=first?{[uf]:[first]}:{};
  }else{
    Object.keys(WIZ.data.cidades).forEach(uf=>{if(!WIZ.data.estados.includes(uf))delete WIZ.data.cidades[uf];});
  }
  wizGeoRender();
}
function wizToggleEstado(uf){
  const i=WIZ.data.estados.indexOf(uf);
  if(i>=0){WIZ.data.estados.splice(i,1);delete WIZ.data.cidades[uf];}
  else{WIZ.data.estados.push(uf);}
  wizGeoRender();
}
function wizEstadoChangeSingle(uf){
  WIZ.data.estados=uf?[uf]:[];
  WIZ.data.cidades={};
  wizGeoRenderCidades();
}
function wizSelectAllEstados(){
  WIZ.data.estados=BR_ESTADOS.map(e=>e.sigla);
  wizGeoRender();
}
function wizClearEstados(){
  WIZ.data.estados=[];WIZ.data.cidades={};
  wizGeoRender();
}
function wizToggleCidade(uf,cidade){
  WIZ.data.cidades[uf]=WIZ.data.cidades[uf]||[];
  const arr=WIZ.data.cidades[uf];
  const i=arr.indexOf(cidade);
  if(i>=0)arr.splice(i,1);else arr.push(cidade);
  if(arr.length===0)delete WIZ.data.cidades[uf];
  const span=document.getElementById('geo-cidade-count');
  if(span){const n=Object.values(WIZ.data.cidades).reduce((a,arr2)=>a+arr2.length,0);span.textContent=n+(n===1?' selecionada':' selecionadas');}
}
function wizCidadeChangeSingle(cidade){
  const uf=WIZ.data.estados[0];
  WIZ.data.cidades=(uf&&cidade)?{[uf]:[cidade]}:{};
}
function wizSelectAllCidades(){
  (WIZ.data.estados||[]).forEach(uf=>{WIZ.data.cidades[uf]=[...(BR_MUNICIPIOS[uf]||[])];});
  wizGeoRenderCidades();
}
function wizClearCidades(){
  WIZ.data.cidades={};
  wizGeoRenderCidades();
}
function wizFilterCidades(q){
  const qq=(q||'').toLowerCase().trim();
  document.querySelectorAll('#geo-city-list .geo-city-row').forEach(row=>{
    row.style.display=(!qq||row.getAttribute('data-name').includes(qq))?'':'none';
  });
}
function wizGeoResumo(){
  const ab=WIZ.data.abrangencia||'estadual';
  const ufs=WIZ.data.estados||[];
  if(!ufs.length)return ABRANGENCIA_LABELS[ab]+' · nenhum estado selecionado';
  const nCidades=Object.values(WIZ.data.cidades).reduce((a,arr)=>a+arr.length,0);
  const ufsTxt=ufs.join(', ');
  const cidadeTxt=(ABRANGENCIA_CFG[ab]||{}).multiCity
    ?(nCidades+(nCidades===1?' cidade':' cidades'))
    :((Object.values(WIZ.data.cidades)[0]||[])[0]||'nenhuma cidade selecionada');
  return ABRANGENCIA_LABELS[ab]+' · '+ufsTxt+' · '+cidadeTxt;
}

WIZ_BODY[2]=()=>{
  if(!WIZ.data.formStarted){
    return `<div class="card" style="max-width:760px">
      <div class="card-t">Formulário</div>
      <div class="card-d">Monte o questionário desta pesquisa. As perguntas viram variáveis para cotas e cruzamentos.</div>
      <div class="form-start">
        <div class="fs-ico">❒</div>
        <div class="fs-title">Nenhum formulário ainda</div>
        <div class="fs-sub">Comece do zero criando suas próprias perguntas, ou parta de um exemplo.</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          <button class="btn btn-fill" onclick="qStart(false)">+ Criar formulário</button>
          <button class="btn btn-out" onclick="qStart(true)">Partir de um exemplo</button>
        </div>
      </div>
      ${wizNav()}</div>`;
  }
  return `<div class="card" style="max-width:760px">
  <div style="display:flex;align-items:center;gap:10px"><div class="card-t" style="margin:0">Formulário</div>
    <span class="pill pill-gray" id="q-count" style="margin-left:6px"></span>
    <button class="btn btn-out" style="margin-left:auto" onclick="qLoadExample()">Carregar exemplo</button>
    <button class="btn btn-out" onclick="qClear()">Limpar tudo</button></div>
  <div class="card-d" style="margin-top:6px">Crie as perguntas desta pesquisa. As variáveis aqui ficam disponíveis para cotas e cruzamentos.</div>
  <div class="q-order-hint"><span aria-hidden="true">⠿</span> Arraste a alça pontilhada para mudar a ordem. Se preferir, use as setas em cada pergunta.</div>
  <div class="q-condition-hint"><span aria-hidden="true">!</span> Nas perguntas de escolha, marque <b>encerrar</b> ao lado de uma resposta para avisar o pesquisador e encerrar a entrevista quando ela for selecionada.</div>
  <div class="q-format-hint"><span aria-hidden="true">↕</span> <b>Ranking de preferências</b> registra a ordem completa das opções. <b>Duas respostas</b> cria dois subcampos independentes, abertos ou fechados.</div>
  <div id="q-list"></div>
  <div class="add-q">
    <span style="font-size:12px;font-weight:600;color:var(--ink2)">Adicionar pergunta:</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${Object.keys(Q_TYPES).map(t=>`<button class="chip" onclick="qAdd('${t}')">+ ${Q_TYPES[t]}</button>`).join('')}
    </div>
  </div>
  ${wizNav()}</div>`;
};

/* perguntas de partida sugeridas (idade/região) — 100% editáveis e removíveis, nada é obrigatório */
function starterQuestions(){
  return [
    {id:1,text:'Qual a sua idade?',type:'single',opts:['16–24','25–34','35–44','45–59','60+']},
    {id:2,text:'Qual região onde você mora?',type:'single',opts:['Centro','Zona Norte','Zona Sul','Zona rural'],isRegion:true},
  ];
}

function qStart(withExample){
  WIZ.data.formStarted=true;
  if(withExample){
    WIZ.data.questions=[
      ...starterQuestions(),
      {id:3,text:'Qual seu gênero?',type:'single',opts:['Masculino','Feminino','Outro / prefiro não dizer']},
      {id:4,text:'Se a eleição fosse hoje, em quem votaria para deputado estadual?',type:'single',opts:['Candidato A','Candidato B','Candidato C','Branco/Nulo','Não sabe']},
    ];
    WIZ_QID=5;
  }else{
    WIZ.data.questions=[];WIZ_QID=1;
  }
  wizRender();
}

/* ---- question builder behaviour ---- */
let Q_DRAG_ID=null;
let Q_DRAG_DROP_BEFORE=true;
let Q_POINTER_DRAG=null;

function qCardAtPoint(x,y){
  const el=document.elementFromPoint(x,y);
  return el&&el.closest?el.closest('.q-card'):null;
}
function qClearDropMarkers(){
  document.querySelectorAll('.q-card.q-drop-before,.q-card.q-drop-after,.q-card.is-dragging').forEach(card=>{
    card.classList.remove('q-drop-before','q-drop-after','is-dragging');
  });
}
function qDragStart(ev,id){
  Q_DRAG_ID=id;Q_DRAG_DROP_BEFORE=true;
  if(ev&&ev.dataTransfer){
    ev.dataTransfer.effectAllowed='move';
    ev.dataTransfer.setData('text/plain',String(id));
  }
  const card=document.querySelector('.q-card[data-qid="'+id+'"]');
  if(card)card.classList.add('is-dragging');
}
function qDragPosition(ev,id){
  if(Q_DRAG_ID==null||id===Q_DRAG_ID)return;
  const target=document.querySelector('.q-card[data-qid="'+id+'"]');
  if(!target)return;
  if(ev&&ev.preventDefault)ev.preventDefault();
  if(ev&&ev.dataTransfer)ev.dataTransfer.dropEffect='move';
  const rect=target.getBoundingClientRect();
  Q_DRAG_DROP_BEFORE=(ev.clientY||0)<rect.top+rect.height/2;
  qClearDropMarkers();
  target.classList.add(Q_DRAG_DROP_BEFORE?'q-drop-before':'q-drop-after');
  const dragged=document.querySelector('.q-card[data-qid="'+Q_DRAG_ID+'"]');
  if(dragged)dragged.classList.add('is-dragging');
}
function qDragOver(ev,id){qDragPosition(ev,id);}
function qDrop(ev,targetId){
  if(ev&&ev.preventDefault)ev.preventDefault();
  if(Q_DRAG_ID==null||targetId===Q_DRAG_ID){qDragEnd();return;}
  const qs=WIZ.data.questions;
  const from=qs.findIndex(q=>q.id===Q_DRAG_ID);
  const targetIndex=qs.findIndex(q=>q.id===targetId);
  if(from<0||targetIndex<0){qDragEnd();return;}
  let insertAt=targetIndex+(Q_DRAG_DROP_BEFORE?0:1);
  const [moved]=qs.splice(from,1);
  if(from<insertAt)insertAt--;
  qs.splice(insertAt,0,moved);
  qRender();
  qDragEnd();
}
function qDragEnd(){
  qClearDropMarkers();
  Q_DRAG_ID=null;Q_DRAG_DROP_BEFORE=true;
}
function qMove(id,delta){
  const qs=WIZ.data.questions;
  const from=qs.findIndex(q=>q.id===id);const to=from+delta;
  if(from<0||to<0||to>=qs.length)return;
  [qs[from],qs[to]]=[qs[to],qs[from]];
  qRender();
}
function qPointerDown(ev,id){
  if(!ev||ev.pointerType==='mouse'||Q_POINTER_DRAG||Q_DRAG_ID!=null)return;
  ev.preventDefault();
  Q_POINTER_DRAG={pointerId:ev.pointerId};
  qDragStart(ev,id);
  document.addEventListener('pointermove',qPointerMove,{passive:false});
  document.addEventListener('pointerup',qPointerUp,{once:true});
  document.addEventListener('pointercancel',qPointerCancel,{once:true});
}
function qPointerMove(ev){
  if(!Q_POINTER_DRAG||ev.pointerId!==Q_POINTER_DRAG.pointerId)return;
  ev.preventDefault();
  const card=qCardAtPoint(ev.clientX,ev.clientY);
  if(card)qDragPosition(ev,Number(card.dataset.qid));
}
function qPointerUp(ev){
  if(!Q_POINTER_DRAG||ev.pointerId!==Q_POINTER_DRAG.pointerId)return;
  qPointerMove(ev);
  const card=qCardAtPoint(ev.clientX,ev.clientY);
  if(card)qDrop(ev,Number(card.dataset.qid));else qDragEnd();
  qPointerCleanup();
}
function qPointerCancel(){
  if(!Q_POINTER_DRAG)return;
  qPointerCleanup();qDragEnd();
}
function qPointerCleanup(){
  document.removeEventListener('pointermove',qPointerMove);
  document.removeEventListener('pointercancel',qPointerCancel);
  Q_POINTER_DRAG=null;
}
function qRender(){
  const wrap=document.getElementById('q-list');if(!wrap)return;
  const qs=WIZ.data.questions;
  document.getElementById('q-count').textContent=qs.length+(qs.length===1?' pergunta':' perguntas');
  if(qs.length===0){wrap.innerHTML='<div class="empty">Nenhuma pergunta ainda. Adicione abaixo.</div>';return;}
  wrap.innerHTML=qs.map((q,i)=>{
    let body='';
    if(q.type==='pair'){
      qEnsurePairFields(q);
      body=`<div class="q-pair-editor">${q.fields.map((field,fi)=>{
        const closed=Q_CLOSED_FIELD_TYPES.includes(field.type);
        const opts=closed?`<div class="q-opts q-pair-options">${field.options.map((option,oi)=>`<div class="opt-edit"><span class="${field.type==='single'?'opt-dot':'opt-sq'}"></span><input class="opt-inp" value="${esc(option)}" oninput="qPairOpt(${q.id},${fi},${oi},this.value)" placeholder="Opção ${oi+1}"><button class="opt-del" title="Remover opção" onclick="qPairOptDel(${q.id},${fi},${oi})">✕</button></div>`).join('')}<button class="opt-add" onclick="qPairOptAdd(${q.id},${fi})">+ adicionar opção</button></div>`:'';
        return `<div class="q-pair-field-editor"><div class="q-pair-field-head"><span class="q-pair-field-number">${fi+1}</span><input class="inp q-pair-label" value="${esc(field.label)}" oninput="qPairFieldLabel(${q.id},${fi},this.value)" placeholder="Nome da variável ${fi+1}"><select class="inp q-pair-type" onchange="qPairFieldType(${q.id},${fi},this.value)">${[['open','Aberta'],['single','Escolha única'],['multi','Múltipla escolha']].map(([type,label])=>`<option value="${type}" ${field.type===type?'selected':''}>${label}</option>`).join('')}</select></div>${opts}</div>`;
      }).join('')}</div><div class="q-pair-hint">Os dois subcampos serão respondidos na mesma entrevista e aparecerão como variáveis separadas nos resultados.</div>`;
    }else if(Q_HAS_OPTS(q.type)){
      body=`<div class="q-opts">`+q.opts.map((o,oi)=>
        `<div class="opt-edit"><span class="${q.type==='single'?'opt-dot':'opt-sq'}"></span>
          <input class="opt-inp" value="${esc(o)}" oninput="qOpt(${q.id},${oi},this.value)" placeholder="Opção ${oi+1}">
          ${q.type==='ranking'?'':`<label class="opt-end" title="Se o entrevistado escolher esta resposta, a entrevista será encerrada"><input type="checkbox" ${q.endsInterview&&q.endsInterview[oi]?'checked':''} ${o&&o.trim()?'':'disabled'} onchange="qEndToggle(${q.id},${oi},this.checked)"> encerrar</label>`}
          <button class="opt-del" title="Remover opção" onclick="qOptDel(${q.id},${oi})">✕</button></div>`).join('')
        +`<button class="opt-add" onclick="qOptAdd(${q.id})">+ adicionar opção</button></div>`;
      if(q.type==='ranking')body+=`<div class="q-ranking-hint">O entrevistado vai arrastar todas as opções da mais preferida para a menos preferida.</div>`;
    } else if(q.type==='scale'){
      body=`<div class="opt-line" style="padding-top:4px">Péssima &nbsp;①②③④⑤&nbsp; Ótima</div>`;
    } else if(q.type==='scale10'){
      body=`<div class="opt-line" style="padding-top:4px">Péssima &nbsp;1 2 3 4 5 6 7 8 9 10&nbsp; Ótima</div>`;
    } else if(q.type==='nps'){
      body=`<div class="opt-line" style="padding-top:4px">0 1 2 3 4 5 6 7 8 9 10</div>`;
    } else if(q.type==='open'){
      body=`<div class="opt-line" style="padding-top:4px;color:var(--ink3)">— campo de texto livre —</div>`;
    } else if(q.type==='number'){
      body=`<div class="opt-line" style="padding-top:4px;color:var(--ink3)">— resposta numérica —</div>`;
    } else if(q.type==='date'){
      body=`<div class="opt-line" style="padding-top:4px;color:var(--ink3)">— seletor de data —</div>`;
    }
    const delBtn=`<button class="q-del" title="Excluir pergunta" onclick="qDel(${q.id})">🗑</button>`;
    const typeCtl=`<select class="q-type-sel" onchange="qType(${q.id},this.value)">
          ${Object.keys(Q_TYPES).map(t=>`<option value="${t}" ${q.type===t?'selected':''}>${Q_TYPES[t]}</option>`).join('')}
        </select>`;
    const canBeRegion=q.type==='single'&&q.opts.some(o=>o&&o.trim());
    const regionCtl=canBeRegion
      ?`<button class="q-region-btn ${q.isRegion?'on':''}" title="Marcar esta pergunta como a pergunta de bairro/região (usada para definir coletas remotas no preço) — você escolhe qual pergunta é essa" onclick="qSetRegion(${q.id})">${q.isRegion?'★ região':'☆ região'}</button>`
      :'';
    const canQuota=Q_HAS_QUOTA_OPTS(q.type)&&q.opts.some(o=>o&&o.trim());
    const quotaOn=canQuota&&!(WIZ.data.quotaOff&&WIZ.data.quotaOff[q.id]);
    const quotaCtl=canQuota
      ?`<button class="q-quota-btn ${quotaOn?'on':''}" title="Definir se esta pergunta terá cota controlada na amostra (ajustável em detalhe no passo Cotas)" onclick="qToggleQuota(${q.id})">${quotaOn?'✓ cota':'sem cota'}</button>`
      :'';
    return `<div class="q-card ${q.isRegion?'is-region':''}" data-qid="${q.id}" ondragover="qDragOver(event,${q.id})" ondrop="qDrop(event,${q.id})">
      <div class="qc-head">
        <span class="q-num">${i+1}</span>
        <input class="q-text-inp" value="${esc(q.text)}" oninput="qText(${q.id},this.value)" placeholder="Digite o enunciado da pergunta">
        ${regionCtl}
        ${quotaCtl}
        ${typeCtl}
        <div class="q-order-controls" aria-label="Ordenar pergunta ${i+1}">
          <button type="button" class="q-order-btn" ${i===0?'disabled':''} onclick="qMove(${q.id},-1)" title="Mover para cima" aria-label="Mover pergunta ${i+1} para cima">↑</button>
          <button type="button" class="q-order-btn" ${i===qs.length-1?'disabled':''} onclick="qMove(${q.id},1)" title="Mover para baixo" aria-label="Mover pergunta ${i+1} para baixo">↓</button>
        </div>
        <button type="button" class="q-drag-handle" draggable="true" ondragstart="qDragStart(event,${q.id})" ondragend="qDragEnd()" onpointerdown="qPointerDown(event,${q.id})" title="Arraste para reordenar" aria-label="Arrastar pergunta ${i+1}">⠿</button>
        ${delBtn}
      </div>
      ${body}
    </div>`;
  }).join('');
}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');}
/* Serializa textos para uso dentro de atributos HTML que chamam funções JS.
   JSON.stringify evita quebra por aspas, apóstrofos, barras ou quebras de linha. */
function jsArg(value){
  return JSON.stringify(String(value??''))
    .replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/"/g,'&quot;');
}
function fmtDataBR(iso){
  if(!iso)return '';
  const p=iso.split('-');if(p.length!==3)return iso;
  return p[2]+'/'+p[1]+'/'+p[0];
}
function qFind(id){return WIZ.data.questions.find(q=>q.id===id);}
function qAdd(type){
  const q={id:WIZ_QID++,text:'',type,opts:Q_HAS_OPTS(type)?['',''] :[],endsInterview:Q_HAS_OPTS(type)?[false,false]:[],fields:type==='pair'?DEFAULT_PAIR_FIELDS():[]};
  WIZ.data.questions.push(q);qRender();
  setTimeout(()=>{const inputs=document.querySelectorAll('.q-text-inp');if(inputs.length)inputs[inputs.length-1].focus();},30);
}
function qDel(id){WIZ.data.questions=WIZ.data.questions.filter(q=>q.id!==id);qRender();}
function qText(id,v){const q=qFind(id);if(q)q.text=v;}
function qEnsurePairFields(q){if(!q)return;const current=Array.isArray(q.fields)?q.fields:[];q.fields=[0,1].map(i=>{const f=current[i]||DEFAULT_PAIR_FIELDS()[i];return {label:String(f.label||'Resposta '+(i+1)),type:Q_CLOSED_FIELD_TYPES.includes(f.type)?f.type:'open',options:Array.isArray(f.options)?f.options.map(v=>String(v??'')):[]};});}
function qType(id,v){const q=qFind(id);if(!q)return;q.type=v;if(Q_HAS_OPTS(v)&&q.opts.length===0){q.opts=['',''];q.endsInterview=[false,false];}if(v==='pair')qEnsurePairFields(q);if(!Q_HAS_OPTS(v)||v!=='single')q.isRegion=false;qRender();}
function qOpt(id,oi,v){const q=qFind(id);if(q){q.opts[oi]=v;if(!String(v||'').trim()&&q.endsInterview)q.endsInterview[oi]=false;}}
function qOptAdd(id){const q=qFind(id);if(q){q.opts.push('');q.endsInterview=q.endsInterview||[];q.endsInterview.push(false);qRender();}}
function qOptDel(id,oi){const q=qFind(id);if(q&&q.opts.length>1){q.opts.splice(oi,1);if(q.endsInterview)q.endsInterview.splice(oi,1);qRender();}}
function qEndToggle(id,oi,checked){const q=qFind(id);if(!q)return;q.endsInterview=q.endsInterview||[];q.endsInterview[oi]=checked===true;qRender();}
function qPairField(qid,fieldIndex){const q=qFind(qid);if(!q||q.type!=='pair')return null;qEnsurePairFields(q);return q.fields[fieldIndex]||null;}
function qPairFieldLabel(qid,fieldIndex,value){const field=qPairField(qid,fieldIndex);if(field)field.label=value;}
function qPairFieldType(qid,fieldIndex,value){const field=qPairField(qid,fieldIndex);if(!field)return;field.type=Q_CLOSED_FIELD_TYPES.includes(value)?value:'open';if(field.type==='open')field.options=[];else if(!field.options.length)field.options=['',''];qRender();}
function qPairOpt(qid,fieldIndex,optionIndex,value){const field=qPairField(qid,fieldIndex);if(field)field.options[optionIndex]=value;}
function qPairOptAdd(qid,fieldIndex){const field=qPairField(qid,fieldIndex);if(field){field.options.push('');qRender();}}
function qPairOptDel(qid,fieldIndex,optionIndex){const field=qPairField(qid,fieldIndex);if(field&&field.options.length>1){field.options.splice(optionIndex,1);qRender();}}
function qToggleQuota(id){
  const off=!!(WIZ.data.quotaOff&&WIZ.data.quotaOff[id]);
  quotaToggle(id,off); // off vira o novo "active": alterna o estado atual
  qRender();
}
function qSetRegion(id){
  const q=qFind(id);if(!q)return;
  if(q.type!=='single'||!q.opts.some(o=>o&&o.trim())){
    alert('Só é possível marcar como pergunta de região uma pergunta de escolha única com opções preenchidas.');
    return;
  }
  const wasOn=!!q.isRegion;
  WIZ.data.questions.forEach(x=>{x.isRegion=false;}); // só uma pergunta pode ser "região" por vez
  q.isRegion=!wasOn; // clicar de novo na que já está marcada desmarca
  qRender();
}
function regionQuestion(){return WIZ.data.questions.find(q=>q.isRegion&&q.type==='single'&&q.opts.some(o=>o&&o.trim()));}
function qClear(){
  if(WIZ.data.questions.length&&!confirm('Remover todas as perguntas do formulário?'))return;
  WIZ.data.questions=[];WIZ_QID=1;qRender();
}
function qLoadExample(){
  if(WIZ.data.questions.length&&!confirm('Substituir todas as perguntas atuais pelo exemplo?'))return;
  WIZ.data.questions=[
    ...starterQuestions(),
    {id:3,text:'Qual seu gênero?',type:'single',opts:['Masculino','Feminino','Outro / prefiro não dizer']},
    {id:4,text:'Se a eleição fosse hoje, em quem votaria para deputado estadual?',type:'single',opts:['Candidato A','Candidato B','Candidato C','Branco/Nulo','Não sabe']},
    {id:5,text:'Como avalia a gestão atual?',type:'scale',opts:[]},
  ];
  WIZ_QID=6;qRender();
}

WIZ_BODY[3]=()=>`<div class="grid g2" style="grid-template-columns:1fr 1fr;align-items:start">
  <div class="card">
    <div class="card-t">Amostra</div><div class="card-d">Margem de erro e confiança determinam o tamanho</div>
    <div class="mb"><label class="lbl">População (eleitores)</label><input class="inp" id="w-pop" type="number" min="1" step="1" value="${WIZ.data.pop}" oninput="scheduleWizCalc()"></div>
    <div class="field-row mb">
      <div><label class="lbl">Margem de erro</label><select class="inp" id="w-err" onchange="scheduleWizCalc()">
        <option value="0.05" ${WIZ.data.err==='0.05'?'selected':''}>± 5%</option>
        <option value="0.04" ${WIZ.data.err==='0.04'?'selected':''}>± 4%</option>
        <option value="0.03" ${WIZ.data.err==='0.03'?'selected':''}>± 3%</option>
        <option value="0.02" ${WIZ.data.err==='0.02'?'selected':''}>± 2%</option></select></div>
      <div><label class="lbl">Confiança</label><select class="inp" id="w-conf" onchange="scheduleWizCalc()">
        <option value="1.645" ${WIZ.data.conf==='1.645'?'selected':''}>90%</option>
        <option value="1.96" ${WIZ.data.conf==='1.96'?'selected':''}>95%</option>
        <option value="2.576" ${WIZ.data.conf==='2.576'?'selected':''}>99%</option></select></div>
    </div>
    <div class="mb"><label class="lbl">Proporção esperada (p)</label><input class="inp" id="w-prop" type="number" min="1" max="99" step="1" value="${WIZ.data.prop}" oninput="scheduleWizCalc()"> <span style="font-size:11px;color:var(--ink3)">% — 50% se desconhecida</span></div>
    <div class="callout"><b>n</b> = [N·Z²·p(1-p)] / [e²(N-1)+Z²·p(1-p)]</div>
  </div>
  <div>
    <div class="sample-out">
      <div class="sample-box"><div class="sb-big" id="w-n">—</div><div class="sb-lbl">Amostra mínima</div></div>
      <div class="sample-box sec"><div class="sb-big" id="w-nadj" style="color:var(--accent)">—</div><div class="sb-lbl">Com folga 10%</div></div>
      <div class="sample-box sec"><div class="sb-big" id="w-margin" style="color:var(--teal)">—</div><div class="sb-lbl">Margem resultante</div></div>
    </div>
    <div style="position:relative;height:180px;margin-top:14px" class="card"><canvas id="wizChart" role="img" aria-label="Amostra por margem de erro"></canvas></div>
  </div>
  <div style="grid-column:1/3">${wizNav()}</div>
</div>`;

WIZ_BODY[4]=()=>{
  const qs=quotaQuestions();
  return `<div class="card" style="max-width:820px">
    <div class="card-t">Cotas da amostra</div>
    <div class="card-d">Escolha, entre as perguntas de escolha única ou múltipla do formulário, quais devem ter cota controlada — e defina a proporção de cada opção. O sistema converte o % em nº de coletas com base na amostra calculada no passo anterior.</div>
    ${qs.length===0?'':`<div class="callout" style="margin-bottom:12px">${qs.length} pergunta${qs.length===1?'':'s'} disponíve${qs.length===1?'l':'is'} para cota (escolha única/múltipla com opções). Use a chave em cada pergunta para ativar ou desativar a cota dela.</div>`}
    <div id="quotas-area"></div>
    ${wizNav()}
  </div>`;
};

WIZ_BODY[5]=()=>{
  const rq=regionQuestion();
  const opts=rq?rq.opts.filter(o=>o&&o.trim()):[];
  const regionRows=opts.map((o,i)=>{
    const isRemote=!!(WIZ.data.remote&&WIZ.data.remote[i]);
    return `<div class="region-row">
      <span class="rr-label">${esc(o)}</span>
      <div class="seg rr-seg">
        <button class="${!isRemote?'on':''}" onclick="setRemote(${i},false)">Padrão</button>
        <button class="${isRemote?'on':''}" onclick="setRemote(${i},true)">Remota</button>
      </div>
      <span class="rr-price" id="rr-price-${i}"></span>
    </div>`;
  }).join('');
  return `<div class="card" style="max-width:720px">
  <div class="card-t">Preço da coleta</div><div class="card-d">Valor pago ao pesquisador por formulário válido</div>
  <div class="field-row mb">
    <div><label class="lbl">Valor por formulário (padrão)</label>
      <div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600">R$</span><input class="inp" id="w-price" type="number" step="0.5" value="${WIZ.data.price}" oninput="wizPrice()"></div></div>
    <div><label class="lbl">Valor em região remota</label>
      <div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600">R$</span><input class="inp" id="w-price-r" type="number" step="0.5" value="${WIZ.data.priceRemote}" oninput="wizPrice()"></div></div>
  </div>
  <div class="divider"></div>
  <div class="card-t" style="font-size:13px">Classificação por região</div>
  <div class="card-d">${rq?`Com base na pergunta <b>"${esc(rq.text)}"</b>, marque quais opções pagam o valor de região remota.`:'Nenhuma pergunta foi marcada como "★ região" ainda.'}</div>
  ${regionRows||'<div class="empty">Volte ao passo Formulário, escolha a pergunta de escolha única que representa o bairro/região do entrevistado e clique em "☆ região" nela para marcá-la.</div>'}
  <div class="divider"></div>
  <div class="card-t" style="font-size:13px">Preço cobrado do cliente</div>
  <div class="card-d">Valor que você cobra do cliente por formulário entregue (define sua receita e margem)</div>
  <div class="field-row mb" style="max-width:340px">
    <div><label class="lbl">Valor por formulário (cliente)</label>
      <div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600">R$</span><input class="inp" id="w-client-price" type="number" step="0.5" value="${WIZ.data.clientPrice}" oninput="wizPrice()"></div></div>
  </div>
  <div class="grid g3">
    <div class="stat"><div class="s-top"><span class="s-label">Custo (pesquisadores)</span></div><div class="s-val" id="w-cost">—</div><div class="s-sub" id="w-cost-sub">com folga de 10%</div></div>
    <div class="stat"><div class="s-top"><span class="s-label">Receita (cliente)</span></div><div class="s-val" id="w-revenue" style="color:var(--brand)">—</div><div class="s-sub" id="w-revenue-sub">amostra × preço cliente</div></div>
    <div class="stat"><div class="s-top"><span class="s-label">Margem bruta</span></div><div class="s-val" id="w-margin-val" style="color:var(--teal)">—</div><div class="s-sub" id="w-margin-sub">receita − custo</div></div>
  </div>
  <div class="grid g2" style="margin-top:14px">
    <div class="stat"><div class="s-top"><span class="s-label">Opções remotas</span></div><div class="s-val" style="font-size:18px" id="w-remote-n">—</div><div class="s-sub">de ${opts.length} regiões</div></div>
    <div class="stat"><div class="s-top"><span class="s-label">Amostra</span></div><div class="s-val" style="font-size:18px" id="w-sample-n">—</div><div class="s-sub">coletas com folga</div></div>
  </div>
  <div class="callout" style="margin-top:14px">A equipe que vai trabalhar nesta pesquisa é atribuída depois, em <b>Minhas pesquisas</b>.</div>
  ${wizNav()}</div>`;
};
function setRemote(i,val){
  WIZ.data.remote=WIZ.data.remote||{};
  WIZ.data.remote[i]=val;
  wizRender(); // re-render to update toggles + counts (step stays 5)
}

WIZ_BODY[6]=()=>{
  WIZ.data.clientes=WIZ.data.clientes||[];
  const sel=WIZ.data.clientes;
  const rows=clienteUsers().map(c=>{
    const on=sel.includes(c.company);
    const safeCompany=jsArg(c.company);
    const statusPill=c.status==='ativo'?'pill-green':c.status==='prospecto'?'pill-amber':'pill-gray';
    const relationReleased=!!(WIZ.data.clientReleaseById?.[c.id]|| (WIZ.editIndex!=null&&SURVEYS[WIZ.editIndex]?.clientReleaseById?.[c.id]));
    const accessReleased=!!c.resultsReleased||relationReleased;
    const accessBtn=on
      ?`<button type="button" class="client-access-btn ${accessReleased?'on':''}" title="Liberar ou não os resultados desta pesquisa para este cliente" onclick="wizToggleClientAccess(${safeCompany})">${accessReleased?'✓ resultado liberado':'🔒 liberar resultado'}</button>`
      :'';
    const searchKey=esc((c.company+' '+(c.contact||'')+' '+(c.email||'')).toLowerCase());
    return `<div class="client-link-row ${on?'on':''}" data-name="${searchKey}">
      <label class="clr-check-label">
        <input type="checkbox" ${on?'checked':''} onchange="wizToggleCliente(${safeCompany})">
        <div class="clr-info">
          <div class="clr-name">${esc(c.company)}</div>
          <div class="clr-sub">${esc(c.contact||'')||'—'}${c.email?' · '+esc(c.email):''}</div>
        </div>
      </label>
      <span class="pill ${statusPill}">${esc(c.status)}</span>
      ${accessBtn}
    </div>`;
  }).join('');
  const note=sel.length===0
    ?'Nenhum cliente vinculado — esta pesquisa não vai aparecer no perfil de nenhum cliente.'
    :sel.length+(sel.length===1?' cliente vinculado':' clientes vinculados')+' a esta pesquisa: '+esc(sel.join(', '))+'.';
  const searchBox=clienteUsers().length>0
    ?`<input class="inp" placeholder="Buscar cliente por nome, contato ou e-mail…" id="client-search" oninput="wizFilterClientes(this.value)" style="margin-bottom:10px">`
    :'';
  return `<div class="card" style="max-width:680px">
    <div class="card-t">Cliente</div>
    <div class="card-d">Vincule quais clientes terão acesso a esta pesquisa no perfil deles (abas Andamento e Resultados). Pode marcar mais de um, ou nenhum por enquanto.</div>
    ${clienteUsers().length===0?'<div class="empty">Nenhum cliente cadastrado ainda. Cadastre em Usuários → Clientes para poder vinculá-lo aqui.</div>':`${searchBox}<div class="client-link-list" id="client-link-list">${rows}</div><div class="empty" id="client-search-empty" style="display:none;padding:16px">Nenhum cliente encontrado para essa busca.</div>`}
    <div class="callout" style="margin-top:14px">${note} Use o botão "liberar acesso" em cada cliente vinculado para dar (ou tirar) acesso total ao andamento em tempo real e aos resultados — normalmente depois de confirmar o pagamento dele. Sem liberar, o cliente ainda vê o percentual da coleta, mas sem os detalhes e sem os resultados.</div>
    ${wizNav()}
  </div>`;
};
function wizFilterClientes(q){
  const qq=(q||'').toLowerCase().trim();
  let visible=0;
  document.querySelectorAll('#client-link-list .client-link-row').forEach(row=>{
    const match=!qq||row.getAttribute('data-name').includes(qq);
    row.style.display=match?'':'none';
    if(match)visible++;
  });
  const empty=document.getElementById('client-search-empty');
  if(empty)empty.style.display=visible===0?'':'none';
}
function wizEditingSurveyId(){return WIZ.editIndex!=null?SURVEYS[WIZ.editIndex]?.id:null;}
function wizClientsRerender(){
  const searchEl=document.getElementById('client-search');
  const q=searchEl?searchEl.value:'';
  document.getElementById('wizBody').innerHTML=WIZ_BODY[6]();
  const newSearchEl=document.getElementById('client-search');
  if(newSearchEl&&q){newSearchEl.value=q;wizFilterClientes(q);}
}
function wizToggleCliente(company){
  WIZ.data.clientes=WIZ.data.clientes||[];
  const i=WIZ.data.clientes.indexOf(company);
  if(i>=0)WIZ.data.clientes.splice(i,1);
  else WIZ.data.clientes.push(company);
  wizClientsRerender();
}
async function wizToggleClientAccess(company){
  const c=clienteUsers().find(x=>x.company===company);
  if(!c)return;
  const surveyId=wizEditingSurveyId();
  const relationReleased=!!(surveyId&&SURVEYS[WIZ.editIndex]?.clientReleaseById?.[c.id]);
  const next=!(c.resultsReleased||relationReleased);
  try{
    if(c.id){
      const {error}=await sb.from('profiles').update({results_released:next}).eq('id',c.id);
      if(error)throw new Error(error.message);
      if(surveyId){
        const {error:linkError}=await sb.from('survey_clients').update({results_released:next}).eq('survey_id',surveyId).eq('client_id',c.id);
        if(linkError)throw new Error(linkError.message);
        SURVEYS[WIZ.editIndex].clientReleaseById=SURVEYS[WIZ.editIndex].clientReleaseById||{};
        SURVEYS[WIZ.editIndex].clientReleaseById[c.id]=next;
        WIZ.data.clientReleaseById=WIZ.data.clientReleaseById||{};WIZ.data.clientReleaseById[c.id]=next;
      }else{
        WIZ.data.clientReleaseById=WIZ.data.clientReleaseById||{};WIZ.data.clientReleaseById[c.id]=next;
      }
    }
  }catch(ex){alert('Não foi possível salvar: '+ex.message);return;}
  c.resultsReleased=next;
  wizClientsRerender();
}

WIZ_BODY[7]=()=>`<div class="card" style="max-width:680px"><div class="card-t">Revisão</div>
  <div class="card-d">Confira antes de ${WIZ.editIndex!=null?'salvar as alterações':'criar a pesquisa'}</div>
  <div id="wizSummary"></div>
  <div style="display:flex;gap:8px;margin-top:18px">
    <button class="btn btn-out" onclick="wizGo(-1)">← Voltar</button>
    <button class="btn btn-fill" style="margin-left:auto" onclick="wizCreate()">✓ ${WIZ.editIndex!=null?'Salvar alterações':'Criar pesquisa'}</button>
  </div></div>`;

/* ---- cotas ---- */
function quotaQuestions(){
  return WIZ.data.questions.filter(q=>Q_HAS_QUOTA_OPTS(q.type)&&q.opts.some(o=>o&&o.trim()));
}
function renderQuotas(){
  const area=document.getElementById('quotas-area');if(!area)return;
  const qs=quotaQuestions();
  const nadj=wizSampleAdj();
  if(qs.length===0){area.innerHTML='<div class="empty">Adicione perguntas de escolha única ou múltipla (com opções) no passo Formulário para poder definir cotas nelas.</div>';return;}
  WIZ.data.quotas=WIZ.data.quotas||{};
  WIZ.data.quotaOff=WIZ.data.quotaOff||{};
  // garante que o valor exibido (mesmo quando é só o padrão calculado,
  // ex.: divisão igual entre as opções) seja gravado no modelo — sem isso,
  // uma cota que o admin nunca editou manualmente (mas que aparece 100%
  // preenchida na tela) seria salva como null no banco.
  qs.forEach(q=>{
    if(WIZ.data.quotaOff[q.id])return;
    const opts=q.opts.filter(o=>o&&o.trim());
    if(!opts.length)return;
    const def=Math.round(100/opts.length);
    WIZ.data.quotas[q.id]=WIZ.data.quotas[q.id]||{};
    opts.forEach((o,i)=>{ if(WIZ.data.quotas[q.id][i]==null)WIZ.data.quotas[q.id][i]=def; });
  });
  const activeN=qs.filter(q=>!WIZ.data.quotaOff[q.id]).length;
  const headerNote=`<div class="card-d" style="margin:-4px 0 12px">${activeN} de ${qs.length} perguntas com cota ativa. As desativadas não entram nas obrigações dos pesquisadores.</div>`;
  area.innerHTML=headerNote+qs.map(q=>{
    const off=!!WIZ.data.quotaOff[q.id];
    const opts=q.opts.filter(o=>o&&o.trim());
    const saved=WIZ.data.quotas[q.id]||{};
    const def=Math.round(100/opts.length);
    let sum=0;
    const rows=opts.map((o,i)=>{
      const val=saved[i]!=null?saved[i]:def; sum+=val;
      const count=Math.round(nadj*val/100);
      return `<div class="quota-edit">
        <span class="qe-label">${esc(o)}</span>
        <input class="qe-inp" type="number" min="0" max="100" value="${val}" ${off?'disabled':''} oninput="quotaSet(${q.id},${i},this.value)">
        <span class="qe-pct">%</span>
        <span class="qe-count" id="qc-${q.id}-${i}">${count.toLocaleString('pt-BR')} coletas</span>
      </div>`;
    }).join('');
    const ok=sum===100;
    const toggle=`<label class="quota-toggle" title="Ativar/desativar cota para esta pergunta">
      <input type="checkbox" ${off?'':'checked'} onchange="quotaToggle(${q.id},this.checked)">
      <span>${off?'cota desativada':'cota ativa'}</span></label>`;
    const sumPill=off?'':`<span class="qb-sum ${ok?'ok':'bad'}" id="qsum-${q.id}">soma: ${sum}%</span>`;
    return `<div class="quota-block ${off?'is-off':''}">
      <div class="qb-head"><b>${esc(q.text||'(pergunta sem título)')}</b>
        ${sumPill}${toggle}</div>
      ${off?'<div class="quota-off-note">Sem cota — os pesquisadores coletam livremente para esta variável.</div>':rows}</div>`;
  }).join('');
}
function quotaToggle(qid,active){
  WIZ.data.quotaOff=WIZ.data.quotaOff||{};
  if(active)delete WIZ.data.quotaOff[qid];
  else WIZ.data.quotaOff[qid]=true;
  renderQuotas();
}
function quotaSet(qid,oi,v){
  WIZ.data.quotas[qid]=WIZ.data.quotas[qid]||{};
  WIZ.data.quotas[qid][oi]=+v||0;
  // update sum + counts live without full re-render (keeps focus)
  const q=qFind(qid);const opts=q.opts.filter(o=>o&&o.trim());
  let sum=0;opts.forEach((o,i)=>{sum+=(WIZ.data.quotas[qid][i]!=null?WIZ.data.quotas[qid][i]:Math.round(100/opts.length));});
  const nadj=wizSampleAdj();
  opts.forEach((o,i)=>{
    const c=document.getElementById('qc-'+qid+'-'+i);
    if(c){const val=WIZ.data.quotas[qid][i]!=null?WIZ.data.quotas[qid][i]:Math.round(100/opts.length);
      c.textContent=Math.round(nadj*val/100).toLocaleString('pt-BR')+' coletas';}
  });
  const s=document.getElementById('qsum-'+qid);
  if(s){s.textContent='soma: '+sum+'%';s.className='qb-sum '+(sum===100?'ok':'bad');}
}

function wizNav(first){
  return `<div style="display:flex;gap:8px;margin-top:18px">
    ${first?'':'<button class="btn btn-out" onclick="wizGo(-1)">← Voltar</button>'}
    <button class="btn btn-fill" style="margin-left:auto" onclick="wizGo(1)">Continuar →</button></div>`;
}
let _wizChart;
function wizSampleN(){
  const gv=(id,fallback)=>{const e=document.getElementById(id);return e?e.value:fallback;};
  return sampleSize(gv('w-pop',WIZ.data.pop),gv('w-err',WIZ.data.err),gv('w-conf',WIZ.data.conf),gv('w-prop',WIZ.data.prop));
}
function wizSampleAdj(){return Math.ceil(wizSampleN()*1.1);}
function wizCalc(){
  if(!document.getElementById('w-n'))return;
  const n=wizSampleN();const nadj=Math.ceil(n*1.1);
  document.getElementById('w-n').textContent=n.toLocaleString('pt-BR');
  document.getElementById('w-nadj').textContent=nadj.toLocaleString('pt-BR');
  document.getElementById('w-margin').textContent='±'+(+document.getElementById('w-err').value*100)+'%';
  WIZ.data.pop=+document.getElementById('w-pop').value;WIZ.data.err=document.getElementById('w-err').value;
  WIZ.data.conf=document.getElementById('w-conf').value;WIZ.data.prop=+document.getElementById('w-prop').value;
  const c=document.getElementById('wizChart');if(!c)return;
  if(typeof Chart==='undefined'){
    loadLocalAsset('chart').then(()=>{if(document.getElementById('wizChart')===c)wizCalc();}).catch(()=>{});
    return;
  }
  const N=WIZ.data.pop,Z=+WIZ.data.conf,p=WIZ.data.prop/100;
  const errs=[0.05,0.04,0.03,0.02];
  const data=errs.map(e=>sampleSize(N,e,Z,p*100));
  if(_wizChart)_wizChart.destroy();
  _wizChart=new Chart(c,{type:'bar',data:{labels:errs.map(e=>'±'+(e*100)+'%'),
    datasets:[{data,backgroundColor:'#7c3aed',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}
function wizPrice(){
  const pe=document.getElementById('w-price'),pre=document.getElementById('w-price-r');
  if(pe)WIZ.data.price=+pe.value;
  if(pre)WIZ.data.priceRemote=+pre.value;
  const nadj=wizSampleAdj();
  const rq=regionQuestion();
  const opts=rq?rq.opts.filter(o=>o&&o.trim()):[];
  const remoteCount=opts.filter((o,i)=>WIZ.data.remote&&WIZ.data.remote[i]).length;
  // blended cost: split sample evenly across regions, remote ones at remote price
  let cost;
  if(opts.length){
    const perRegion=nadj/opts.length;
    cost=opts.reduce((sum,o,i)=>sum+perRegion*((WIZ.data.remote&&WIZ.data.remote[i])?WIZ.data.priceRemote:WIZ.data.price),0);
  }else{
    cost=nadj*WIZ.data.price;
  }
  const cEl=document.getElementById('w-cost');
  if(cEl){cEl.textContent='R$ '+Math.round(cost).toLocaleString('pt-BR');
    document.getElementById('w-cost-sub').textContent=nadj.toLocaleString('pt-BR')+' coletas · '+remoteCount+' região(ões) remota(s)';}
  const rn=document.getElementById('w-remote-n');if(rn)rn.textContent=String(remoteCount);
  const sn=document.getElementById('w-sample-n');if(sn)sn.textContent=nadj.toLocaleString('pt-BR');
  // preço do cliente, receita e margem
  const cpe=document.getElementById('w-client-price');
  if(cpe)WIZ.data.clientPrice=+cpe.value;
  const revenue=nadj*(WIZ.data.clientPrice||0);
  const margin=revenue-cost;
  const rev=document.getElementById('w-revenue');
  if(rev){rev.textContent='R$ '+Math.round(revenue).toLocaleString('pt-BR');
    document.getElementById('w-revenue-sub').textContent=nadj.toLocaleString('pt-BR')+' × R$ '+(WIZ.data.clientPrice||0).toFixed(2);}
  const mv=document.getElementById('w-margin-val');
  if(mv){mv.textContent='R$ '+Math.round(margin).toLocaleString('pt-BR');
    mv.style.color=margin>=0?'var(--teal)':'var(--red)';
    const pctM=revenue>0?Math.round(margin/revenue*100):0;
    document.getElementById('w-margin-sub').textContent=(margin>=0?'lucro ':'prejuízo ')+pctM+'% da receita';}
  // per-region price labels
  opts.forEach((o,i)=>{
    const el=document.getElementById('rr-price-'+i);
    if(el){const remote=WIZ.data.remote&&WIZ.data.remote[i];
      el.textContent='R$ '+(remote?WIZ.data.priceRemote:WIZ.data.price).toFixed(2);
      el.style.color=remote?'var(--accent)':'var(--ink3)';}
  });
}
async function wizCreate(){
  try{ wizSave(); }catch(err){}
  const d=WIZ.data;
  const isNew=WIZ.editIndex==null;
  const row=snapshotToSurveyRow(d);
  const busyBtn=document.querySelector('#wizBody .btn-fill');
  if(busyBtn)busyBtn.disabled=true;
  try{
    let surveyId;
    if(isNew){
      let result=await sb.from('surveys').insert(row).select().single();
      if(result.error&&/form_approval_required|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {form_approval_required,...legacyRow}=row;
        result=await sb.from('surveys').insert(legacyRow).select().single();
      }
      if(result.error)throw new Error(result.error.message);
      surveyId=result.data.id;
    }else{
      surveyId=SURVEYS[WIZ.editIndex].id;
      let result=await sb.from('surveys').update(row).eq('id',surveyId);
      if(result.error&&/form_approval_required|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {form_approval_required,...legacyRow}=row;
        result=await sb.from('surveys').update(legacyRow).eq('id',surveyId);
      }
      if(result.error)throw new Error(result.error.message);
    }
    await syncSurveyQuestionsAndOptions(surveyId,d);
    await syncSurveyClients(surveyId,d.clientes||[],d.clientReleaseById||{});
    const snapshot=await reloadSurveySnapshot(surveyId);
    if(isNew){
      snapshot.isNew=true;
      SURVEYS.unshift(snapshot);
    }else{
      snapshot.team=SURVEYS[WIZ.editIndex].team;snapshot.coord=SURVEYS[WIZ.editIndex].coord;
      SURVEYS[WIZ.editIndex]=snapshot;
    }
    refreshClientSurveyLinks();
    const savedMessage=isNew?'Pesquisa criada! Agora atribua a equipe em Minhas pesquisas.':'Alterações salvas.';
    alert(savedMessage+(SURVEY_END_CONDITION_SCHEMA_MISSING?'\n\nAtenção: as condicionantes de encerramento ainda não foram gravadas porque falta aplicar deploy/condicionante-encerramento-resposta.sql no Supabase. As demais alterações foram salvas.':''));
  }catch(ex){
    if(busyBtn)busyBtn.disabled=false;
    alert('Não foi possível salvar a pesquisa: '+ex.message);
    return;
  }
  WIZ.editIndex=null;
  go('surveys');
}
/* mantém o campo `surveys` de cada cliente (em USERS) em sincronia com o que
   está de fato vinculado no banco (survey_clients, via SURVEYS[].clientes) —
   é o que a área do cliente usa para achar "a pesquisa dele". */
function refreshClientSurveyLinks(){
  if(!USERS_LOADED||!SURVEYS_LOADED)return;
  clienteUsers().forEach(c=>{
    c.surveys=SURVEYS.filter(s=>(s.clientes||[]).includes(c.company)).map(s=>s.name);
  });
}

function wizReview(){
  wizSave();
  const d=WIZ.data;const nadj=wizSampleAdj();
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:42%">${l}</td><td style="font-weight:600">${v}</td></tr>`;
  let quotaTxt='—';
  const qq=quotaQuestions();
  const off=d.quotaOff||{};
  if(qq.length){
    quotaTxt=qq.map(q=>{
      if(off[q.id])return '<div style="margin-bottom:4px"><span style="color:var(--ink3)">'+esc(q.text||'(sem título)')+':</span> <span style="color:var(--ink3)">sem cota</span></div>';
      const opts=q.opts.filter(o=>o&&o.trim());
      const def=Math.round(100/opts.length);
      const parts=opts.map((o,i)=>{const v=(d.quotas[q.id]&&d.quotas[q.id][i]!=null)?d.quotas[q.id][i]:def;return esc(o)+' '+v+'%';});
      return '<div style="margin-bottom:4px"><span style="color:var(--ink2)">'+esc(q.text||'(sem título)')+':</span> '+parts.join(' · ')+'</div>';
    }).join('');
  }
  document.getElementById('wizSummary').innerHTML=`<table style="margin-top:8px">
    ${row('Pesquisa',d.name||'—')}
    ${row('Tipo',d.tipo||'—')}
    ${row('Período de campo',(d.dataIni?fmtDataBR(d.dataIni):'—')+' a '+(d.dataFim?fmtDataBR(d.dataFim):'—'))}
    ${row('Abrangência',esc(wizGeoResumo()))}
    ${row('Perguntas no formulário',d.questions.length+(d.questions.length===1?' pergunta':' perguntas'))}
    ${row('População',(+d.pop).toLocaleString('pt-BR'))}
    ${row('Margem de erro / confiança','±'+(+d.err*100)+'% · '+({'1.645':'90%','1.96':'95%','2.576':'99%'}[d.conf]))}
    ${row('Amostra (com folga)',nadj.toLocaleString('pt-BR')+' coletas')}
    ${row('Preço por formulário (pesquisador)','R$ '+(+d.price).toFixed(2)+' (remota R$ '+(+d.priceRemote).toFixed(2)+')')}
    ${row('Preço por formulário (cliente)','R$ '+(+(d.clientPrice||0)).toFixed(2))}
    ${row('Custo estimado','R$ '+(nadj*d.price).toLocaleString('pt-BR',{maximumFractionDigits:0}))}
    ${row('Receita do cliente','R$ '+(nadj*(d.clientPrice||0)).toLocaleString('pt-BR',{maximumFractionDigits:0}))}
    ${row('Margem bruta','R$ '+(nadj*((d.clientPrice||0)-d.price)).toLocaleString('pt-BR',{maximumFractionDigits:0}))}
    ${row('Cotas',quotaTxt)}
    ${row('Cliente(s) vinculado(s)',(d.clientes&&d.clientes.length)?esc(d.clientes.join(', ')):'nenhum')}
  </table>`;
}

function surveyRow(s,idx,opts){
  const sample=surveySample(s);
  const pct=sample?Math.round(s.collected/sample*100):0;
  const coll=s.status==='rascunho'&&s.collected===0?'—':s.collected.toLocaleString('pt-BR')+' ('+pct+'%)';
  const tag=s.isNew?' <span class="pill pill-amber" style="font-size:9px;padding:1px 6px">nova</span>':'';
  const teamN=(s.team||[]).length;
  const actions=opts&&opts.done
    ?`<button class="btn-ghost" onclick="chatOpenSurveyChannel('${s.id}')">Chat</button>
      <button class="btn-ghost" onclick="go('reports')">Ver relatório</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost survey-pdf-action" onclick="surveyFormPdfDownload(${idx})">📄 PDF formulário</button>
      <button class="btn-ghost" onclick="surveyReopen(${idx})">Reabrir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyDelete(${idx})">Excluir</button>`
    :`${s.status==='rascunho'?`<button class="btn-ghost" style="color:var(--teal)" onclick="surveyStart(${idx})">▶ Iniciar coleta</button>`:''}
      <button class="btn-ghost" onclick="chatOpenSurveyChannel('${s.id}')">Chat</button>
      <button class="btn-ghost" onclick="surveyTeam(${idx})">Equipe</button>
      <button class="btn-ghost" onclick="surveyEdit(${idx})">Editar</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost survey-pdf-action" onclick="surveyFormPdfDownload(${idx})">📄 PDF formulário</button>
      <button class="btn-ghost" onclick="surveyFinish(${idx})">Concluir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyDelete(${idx})">Excluir</button>`;
  return `<tr>
    <td><b>${esc(s.name)}</b>${tag}<div style="font-size:11px;color:var(--ink3)">${esc(s.created)}</div></td>
    <td>${s.questions.length} ${s.questions.length===1?'pergunta':'perguntas'}</td>
    <td>${sample.toLocaleString('pt-BR')}</td>
    <td>${coll}</td>
    <td>${teamN?teamN+(teamN===1?' pessoa':' pessoas'):'<span style="color:var(--ink3)">não atribuída</span>'}</td>
    <td>${STATUS_PILL[s.status]}</td>
    <td style="white-space:nowrap">${actions}</td></tr>`;
}

PAGES.surveys=()=>{
  if(!SURVEYS_LOADED){
    loadSurveysIfNeeded();
    return head('Minhas pesquisas','Pesquisas em desenvolvimento (rascunho e em campo).')+'<div class="empty">Carregando pesquisas do banco de dados…</div>';
  }
  const inDev=SURVEYS.map((s,idx)=>({s,idx})).filter(x=>x.s.status!=='encerrada');
  const rows=inDev.map(x=>surveyRow(x.s,x.idx)).join('')
    ||'<tr><td colspan="7" class="empty">Nenhuma pesquisa em desenvolvimento. Clique em “+ Nova pesquisa”.</td></tr>';
  return head('Minhas pesquisas','Pesquisas em desenvolvimento (rascunho e em campo).',
  '<button class="btn btn-out" onclick="go(\'surveys-done\')">Ver concluídas</button><button class="btn btn-fill" onclick="newSurvey()">+ Nova pesquisa</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Em desenvolvimento',String(inDev.length),'rascunho + em campo','❒','#2563eb')}
    ${stat('Em campo',String(SURVEYS.filter(s=>s.status==='campo').length),'coletando agora','◷','#059669')}
    ${stat('Rascunhos',String(SURVEYS.filter(s=>s.status==='rascunho').length),'aguardando início','✎','#d97706')}
    ${stat('Concluídas',String(SURVEYS.filter(s=>s.status==='encerrada').length),'em outra aba','✓','#7c3aed')}
  </div>
  <div class="card">
    <div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  </div>
  <div class="callout" style="margin-top:16px"><b>Editar</b> reabre a pesquisa no fluxo com seus dados salvos. <b>Concluir</b> move a pesquisa para a aba Concluídas. <b>Duplicar</b> cria uma cópia como novo rascunho (formulário, amostra, cotas e preço), sem copiar equipe nem vínculo com clientes — útil para começar uma pesquisa parecida sem preencher tudo de novo.</div>`;
};

PAGES['surveys-done']=()=>{
  if(!SURVEYS_LOADED){
    loadSurveysIfNeeded();
    return head('Pesquisas concluídas','Pesquisas encerradas — acesse os relatórios ou reabra se precisar.')+'<div class="empty">Carregando pesquisas do banco de dados…</div>';
  }
  const done=SURVEYS.map((s,idx)=>({s,idx})).filter(x=>x.s.status==='encerrada');
  const rows=done.map(x=>surveyRow(x.s,x.idx,{done:true})).join('')
    ||'<tr><td colspan="7" class="empty">Nenhuma pesquisa concluída ainda.</td></tr>';
  return head('Pesquisas concluídas','Pesquisas encerradas — acesse os relatórios ou reabra se precisar.',
  '<button class="btn btn-out" onclick="go(\'surveys\')">← Em desenvolvimento</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Concluídas',String(done.length),'encerradas','✓','#7c3aed')}
    ${stat('Coletas totais',done.reduce((a,x)=>a+(x.s.collected||0),0).toLocaleString('pt-BR'),'somadas','◫','#059669')}
    ${stat('Em desenvolvimento',String(SURVEYS.length-done.length),'na outra aba','❒','#2563eb')}
    ${stat('Total geral',String(SURVEYS.length),'todas as pesquisas','❒','#64748b')}
  </div>
  <div class="card">
    <div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  </div>
  <div class="callout" style="margin-top:16px"><b>Reabrir</b> devolve a pesquisa para "em desenvolvimento". <b>Duplicar</b> cria uma cópia como novo rascunho, sem copiar equipe nem vínculo com clientes.</div>`;
};

async function surveyStart(idx){
  const s=SURVEYS[idx];
  if(s.formApprovalRequired){
    alert('Esta pesquisa exige aprovação do cliente antes de entrar em campo. Envie o formulário para aprovação e aguarde o aceite da versão atual.');
    return;
  }
  if(!confirm('Colocar "'+s.name+'" em campo? Os pesquisadores atribuídos já vão poder começar a coletar.'))return;
  try{
    const {error}=await sb.from('surveys').update({status:'campo'}).eq('id',s.id);
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível iniciar a coleta: '+(String(ex.message||'').includes('form approval required')?'o formulário ainda precisa ser aprovado pelo cliente.':ex.message));return;}
  s.status='campo';go('surveys');
}
async function surveyFinish(idx){
  const s=SURVEYS[idx];
  if(!confirm('Concluir a pesquisa "'+s.name+'"? Ela vai para a aba Concluídas.'))return;
  try{
    const {error}=await sb.from('surveys').update({status:'encerrada'}).eq('id',s.id);
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível concluir: '+ex.message);return;}
  s.status='encerrada';s.isNew=false;go('surveys');
}
async function surveyReopen(idx){
  const s=SURVEYS[idx];
  const newStatus=s.collected>0?'campo':'rascunho';
  try{
    const {error}=await sb.from('surveys').update({status:newStatus}).eq('id',s.id);
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível reabrir: '+ex.message);return;}
  s.status=newStatus;go('surveys-done');
}

function newSurvey(){WIZ.editIndex=null;WIZ.step=1;WIZ.data=blankSurveyData();WIZ_QID=1;go('new-survey');}
async function surveyDuplicate(idx){
  const s=SURVEYS[idx];
  const row=snapshotToSurveyRow({...s,name:(s.name||'Pesquisa sem nome')+' (cópia)',status:'rascunho'});
  try{
    const {data:inserted,error}=await sb.from('surveys').insert(row).select().single();
    if(error)throw new Error(error.message);
    // formulário/cotas/preço são copiados; equipe e vínculo com clientes não —
    // decisão própria de cada pesquisa (mesmo comportamento de antes)
    await syncSurveyQuestionsAndOptions(inserted.id,s);
    const copy=await reloadSurveySnapshot(inserted.id);
    copy.isNew=true;copy.team=[];copy.coord='';
    SURVEYS.unshift(copy);
    alert('Pesquisa duplicada como "'+copy.name+'". Revise os dados e a equipe antes de colocar em campo.');
  }catch(ex){alert('Não foi possível duplicar: '+ex.message);return;}
  go('surveys');
}
async function surveyDelete(idx){
  const s=SURVEYS[idx];
  if(!confirm('Excluir a pesquisa "'+s.name+'"? Esta ação não pode ser desfeita.'))return;
  try{
    if(s.id){
      const {error}=await sb.from('surveys').delete().eq('id',s.id);
      if(error)throw new Error(error.message);
    }
  }catch(ex){alert('Não foi possível excluir: '+ex.message);return;}
  SURVEYS.splice(idx,1);
  refreshClientSurveyLinks();
  go('surveys');
}
function surveyEdit(idx){
  const s=SURVEYS[idx];
  WIZ.editIndex=idx;WIZ.editArmed=true;WIZ.step=1;
  const linkedClientes=s.clientes||clienteUsers().filter(c=>(c.surveys||[]).includes(s.name)).map(c=>c.company);
  WIZ.data=JSON.parse(JSON.stringify({
    name:s.name,
    tipo:s.tipo||'Eleitoral / intenção de voto',dataIni:s.dataIni||'',dataFim:s.dataFim||'',
    abrangencia:s.abrangencia||'estadual',estados:s.estados||[],cidades:s.cidades||{},
    pop:s.pop,err:s.err,conf:s.conf,prop:s.prop,price:s.price,priceRemote:s.priceRemote,clientes:linkedClientes,
    formStarted:s.formStarted!==false,formApprovalRequired:!!s.formApprovalRequired,questions:s.questions||[],clientPrice:s.clientPrice!=null?s.clientPrice:12,quotas:s.quotas||{},quotaOff:s.quotaOff||{},remote:s.remote||{},clientReleaseById:s.clientReleaseById||{}
  }));
  WIZ_QID=(WIZ.data.questions.reduce((m,q)=>Math.max(m,q.id),0)||0)+1;
  go('new-survey');
}

/* ---- equipe / atribuição ----
   O admin/coordenador precisa achar rápido quem pode trabalhar nesta
   pesquisa — por isso a lista é ordenada com quem atua nas cidades (ou pelo
   menos no estado) da pesquisa primeiro, com uma busca por nome/cidade em
   cima. Continua permitindo marcar qualquer pesquisador cadastrado, mesmo
   fora da área (para cobrir cotas remotas ou exceções), só não prioriza. */
function surveyCityTargets(s){
  const cities=new Set(),states=new Set();
  Object.keys(s.cidades||{}).forEach(uf=>{
    states.add(uf);
    (s.cidades[uf]||[]).forEach(c=>cities.add(c+'/'+uf));
  });
  (s.estados||[]).forEach(uf=>states.add(uf));
  return {cities,states};
}
/* {match:true/false, label} — match=true quando o pesquisador atua numa das
   cidades específicas da pesquisa, ou (se a pesquisa não restringiu cidade
   nenhuma dentro do estado) pelo menos no mesmo estado. */
function pesqAreaMatch(u,targets){
  const cid=u.cidadesAtuacao||[];
  if(!cid.length)return {match:false,label:u.cidade||'cidade não informada'};
  if(targets.cities.size&&cid.some(c=>targets.cities.has(c)))return {match:true,label:cid.join(', ')};
  if(!targets.cities.size&&targets.states.size&&[...researcherStateSet(u)].some(state=>targets.states.has(state)))return {match:true,label:cid.join(', ')};
  return {match:false,label:cid.join(', ')};
}
/* ---- convite de pesquisador por WhatsApp (aceitar entra na equipe sozinho,
   via a função respond_survey_invite no banco — ver schema.sql) ---- */
function whatsappDigits(phone){
  let d=(phone||'').replace(/\D/g,'');
  if(!d)return '';
  if(d.length<=11)d='55'+d; // sem DDI: assume Brasil
  return d;
}
function surveyInviteLink(inviteId){
  const url=new URL('app.html',window.location.href);
  url.search='';
  url.searchParams.set('convite',inviteId);
  return url.href;
}
function surveyInvitationMoney(value){
  const amount=Number(value);
  return Number.isFinite(amount)&&amount>0?amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'valor definido no sistema';
}
function surveyInvitationPeriod(s){
  return (s?.dataIni?fmtDataBR(s.dataIni):'início a confirmar')+' até '+(s?.dataFim?fmtDataBR(s.dataFim):'fim a confirmar');
}
function surveyInvitationArea(s){
  const targets=surveyCityTargets(s||{});
  const cities=[...targets.cities].map(value=>String(value).replace('/', ' / '));
  if(cities.length){const shown=cities.slice(0,8);return shown.join(', ')+(cities.length>shown.length?' e mais '+(cities.length-shown.length)+' localidade(s)':'');}
  if(targets.states.size)return [...targets.states].join(', ');
  return ABRANGENCIA_LABELS[s?.abrangencia]||'área definida no aplicativo';
}
function surveyInvitationQuotaText(s,compact=false){
  const quotaOff=s?.quotaOff||{};
  const rows=(s?.questions||[]).filter(q=>['single','multi'].includes(q.type)&&!(quotaOff[q.id])&&Array.isArray(q.opts)&&q.opts.some(value=>String(value||'').trim())).map(q=>{
    const options=q.opts.map(value=>String(value||'').trim()).filter(Boolean);
    const saved=s?.quotas?.[q.id]||{};const def=options.length?Math.round(100/options.length):0;
    const values=options.map((value,index)=>value+' '+(saved[index]!=null?saved[index]:def)+'%');
    return (q.text||'Cota')+': '+values.join(', ');
  });
  if(!rows.length)return 'as cotas disponíveis serão exibidas e controladas pelo aplicativo';
  const shown=rows.slice(0,compact?2:4);return shown.join(' | ')+(rows.length>shown.length?' | e outras cotas da pesquisa':'');
}
function surveyInvitationPriceText(s){
  const standard=surveyInvitationMoney(s?.price),remote=Number(s?.priceRemote);
  return Number.isFinite(remote)&&remote>0&&remote!==Number(s?.price)
    ?standard+' por entrevista válida e aprovada; em região remota, '+surveyInvitationMoney(remote)
    :standard+' por entrevista válida e aprovada';
}
function surveyInvitationGroupText(groupLink,compact=false){
  return groupLink
    ?(compact?'Grupo WhatsApp: ':'Grupo oficial da pesquisa no WhatsApp: ')+groupLink+' — entre antes da primeira coleta.'
    :'O link do grupo WhatsApp será disponibilizado no seu painel antes da primeira coleta.';
}
function surveyInvitationSiteUrl(){return 'https://www.pesquisa-pro.com/app.html';}
function surveyTrainingVideoUrl(){return 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663067279939/aKHKhqQgQgDDwOSj.mp4';}
function whatsappInviteCountMarkup(invite){
  if(!invite)return '';
  const count=Math.max(0,Number(invite.whatsapp_sent_count)||0);
  return `<span class="pill pill-blue whatsapp-invite-count" title="Quantidade de vezes que o convite completo foi aberto pelo botão do WhatsApp">WhatsApp: ${count} envio${count===1?'':'s'}</span>`;
}
async function recordSurveyInviteWhatsappSend(inviteId){
  if(!inviteId)return null;
  try{
    const {data,error}=await sb.rpc('record_survey_invite_whatsapp_send',{p_invite_id:inviteId});
    if(error)throw error;
    const returned=Array.isArray(data)?data[0]:data;
    const local=TEAM_INVITES.find(item=>item.id===inviteId);
    if(local&&returned)Object.assign(local,returned);
    return returned||null;
  }catch(ex){
    console.warn('Contador de WhatsApp indisponível; execute a migration contador-convites-whatsapp.sql:',ex);
    return null;
  }
}
async function teamWhatsappGroupUrl(){
  const s=SURVEYS[TEAM_IDX];if(!s?.id)return '';
  if(TEAM_COMM_SETTINGS_LOADED)return TEAM_COMM_SETTINGS?.whatsapp_group_url||'';
  try{
    const {data,error}=await sb.from('survey_communication_settings').select('whatsapp_group_url').eq('survey_id',s.id).maybeSingle();
    if(error)throw error;
    TEAM_COMM_SETTINGS=data||{};
  }catch(ex){TEAM_COMM_SETTINGS={};console.warn('Não foi possível carregar o link do grupo para o convite:',ex);}
  TEAM_COMM_SETTINGS_LOADED=true;
  return TEAM_COMM_SETTINGS?.whatsapp_group_url||'';
}
function surveyInvitationPushBody(s,researcherName,link,groupLink=''){
  const first=String(researcherName||'').trim().split(/\s+/)[0]||'pesquisador(a)';
  return 'Olá, '+first+'! Convite PesquisaPro para "'+(s?.name||'pesquisa')+'" ('+(s?.tipo||'pesquisa')+'). Período: '+surveyInvitationPeriod(s)+'; área: '+surveyInvitationArea(s)+'. Valor: '+surveyInvitationPriceText(s)+'. Pagamentos semanais: mantenha sua chave Pix atualizada. Respeite o formulário, as cotas ('+surveyInvitationQuotaText(s,true)+'), o georreferenciamento e a eventual confirmação final gravada; a coleta passa por auditoria. '+surveyInvitationGroupText(groupLink,true)+' Aceite e entre automaticamente na equipe: '+link;
}
function surveyInvitationWhatsappMessage(s,u,link,groupLink=''){
  const quotaText=surveyInvitationQuotaText(s);
  return 'Olá, '+(u?.name||'pesquisador(a)')+'! Tudo bem?\n\n'+
    'Você está sendo convidado(a) pela PesquisaPro para participar da pesquisa:\n\n'+
    '*'+(s?.name||'Pesquisa')+'*\n\n'+
    '*Informações da pesquisa:*\n'+
    '• Tipo: '+(s?.tipo||'pesquisa')+'\n'+
    '• Período de coleta: '+surveyInvitationPeriod(s)+'\n'+
    '• Localidades: '+surveyInvitationArea(s)+'\n'+
    '• Valor: '+surveyInvitationPriceText(s)+'\n'+
    '• Forma de coleta: aplicativo PesquisaPro\n'+
    '• Pagamento: realizado semanalmente, após o processamento e a auditoria das entrevistas.\n\n'+
    '*Importante sobre o recebimento:*\n'+
    'Para receber os pagamentos, mantenha sua chave Pix correta e atualizada no cadastro do PesquisaPro. Dados ausentes ou incorretos podem impedir ou atrasar o repasse até a atualização.\n\n'+
    '*Regras para participar:*\n'+
    '• Respeitar o formulário e as orientações exibidas no aplicativo;\n'+
    '• Entrevistar somente pessoas dentro do perfil solicitado;\n'+
    '• Respeitar as cotas disponíveis;\n'+
    '• Não realizar entrevistas fictícias, duplicadas ou sem falar com o entrevistado;\n'+
    '• Registrar corretamente todas as respostas;\n'+
    '• Seguir as orientações da equipe PesquisaPro;\n'+
    '• A coleta poderá passar por auditoria antes da aprovação do pagamento.\n\n'+
    '*Cotas da pesquisa:*\n'+quotaText+'. O aplicativo informará as cotas disponíveis e bloqueará automaticamente as que estiverem completas.\n\n'+
    '*Georreferenciamento:*\nDurante a entrevista, o aplicativo poderá registrar a localização aproximada do aparelho para confirmar o local da coleta e auxiliar na auditoria.\n\n'+
    '*Confirmação gravada ao final:*\nEm parte das entrevistas, poderá ser solicitada uma confirmação curta gravada. Ela dependerá da autorização do entrevistado e será usada somente para verificar se a pesquisa foi realizada corretamente.\n\n'+
    '*Grupo oficial do WhatsApp:*\n'+surveyInvitationGroupText(groupLink)+'\n\n'+
    '*Site do PesquisaPro:*\n'+surveyInvitationSiteUrl()+'\n\n'+
    '*Para aceitar o convite:*\nAcesse o link individual abaixo, entre com sua conta PesquisaPro e toque em "Aceitar e entrar na equipe":\n\n'+link+'\n\n'+
    'Ao aceitar, você entrará automaticamente na equipe desta pesquisa e poderá acompanhar as orientações e coletas no seu painel. Caso não possa participar, você poderá recusar o convite no próprio aplicativo.\n\n'+
    'PesquisaPro — Pesquisa, coleta e auditoria de campo.';
}
function surveyInitialOrientationDefaultTemplate(){
  return 'Olá, {{pesquisador}}! Aqui estão as orientações iniciais da PesquisaPro para a pesquisa "{{pesquisa}}".\n\n'+
    '*Antes de começar:*\n'+
    '• Acesse {{site}} e entre no aplicativo PesquisaPro;\n'+
    '• Selecione a pesquisa e confira a cota disponível antes de iniciar;\n'+
    '• Mantenha o GPS do celular ativo e permita a localização quando solicitado;\n'+
    '• {{grupo}}\n\n'+
    '*Regras da coleta:*\n'+
    '• Aborde somente pessoas dentro do perfil definido no formulário;\n'+
    '• Leia as perguntas e registre exatamente o que a pessoa responder;\n'+
    '• Não invente, replique, acelere ou preencha entrevistas sem falar com o entrevistado;\n'+
    '• Não faça coletas em pontos muito próximos nem em intervalos de tempo incompatíveis com uma entrevista real;\n'+
    '• Preserve a privacidade e nunca fotografe documentos;\n\n'+
    '*Controle de qualidade e confirmação gravada:*\n'+
    'O georreferenciamento, o horário e os dados da coleta podem ser verificados. Algumas entrevistas solicitarão que, no final, o entrevistado grave com sua voz a confirmação de que a entrevista realmente ocorreu e de que foram feitas todas as perguntas.\n\n'+
    'Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação do entrevistado no final. Explique o pedido com transparência e solicite a autorização antes de gravar.\n\n'+
    'Lembre-se: alguém pagou pela informação correta e você recebe por coletar esta informação. Quando todas as partes realizam a prática correta, todos ganham.\n\n'+
    '*Assista a este vídeo para entender como fazer as coletas corretamente e as regras para serem consideradas aptas:*\n{{video}}\n\n'+
    'Entrevistas que não respeitem o perfil, o local, o tempo ou as regras poderão ser anuladas e não serão consideradas nos resultados ou no pagamento. Pesquisadores que insistirem em descumprir as regras ou tentarem burlar os controles poderão ser desligados da operação.\n\n'+
    'Em caso de dúvida, pare a coleta e fale com a equipe PesquisaPro. Boa coleta: precisa, respeitosa e fiel à opinião do entrevistado.';
}
function surveyInitialOrientationWhatsappMessage(s,u,groupLink='',template=''){
  const groupLine=groupLink?'Entre no grupo oficial antes da primeira coleta: '+groupLink:'O link do grupo oficial será disponibilizado no seu painel antes da primeira coleta.';
  const values={
    pesquisador:u?.name||'pesquisador(a)',
    pesquisa:s?.name||'Pesquisa',
    site:surveyInvitationSiteUrl(),
    video:surveyTrainingVideoUrl(),
    grupo:groupLine
  };
  const source=String(template||'').trim()||surveyInitialOrientationDefaultTemplate();
  let message=source.replace(/\{\{\s*(pesquisador|pesquisa|site|video|grupo)\s*\}\}/gi,(_,key)=>values[String(key).toLowerCase()]||'');
  const mandatoryBlocks=[];
  if(!/algumas entrevistas solicitarão/i.test(message))mandatoryBlocks.push('Algumas entrevistas solicitarão que, no final, o entrevistado grave com sua voz a confirmação de que a entrevista realmente ocorreu e de que foram feitas todas as perguntas.');
  if(!/todas as entrevistas realizadas após as 21:00/i.test(message))mandatoryBlocks.push('Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação do entrevistado no final.');
  if(!/alguém pagou pela informação correta/i.test(message))mandatoryBlocks.push('Lembre-se: alguém pagou pela informação correta e você recebe por coletar esta informação. Quando todas as partes realizam a prática correta, todos ganham.');
  if(!message.includes(surveyTrainingVideoUrl()))mandatoryBlocks.push('Assista a este vídeo para entender como fazer as coletas corretamente e as regras para serem consideradas aptas: '+surveyTrainingVideoUrl());
  return mandatoryBlocks.length?message+'\n\n*Avisos obrigatórios da PesquisaPro:*\n'+mandatoryBlocks.join('\n\n'):message;
}
async function copySurveyInviteLink(inviteId){
  const link=surveyInviteLink(inviteId);
  try{await navigator.clipboard.writeText(link);alert('Link do convite copiado.');}
  catch(ex){window.prompt('Copie o link do convite:',link);}
}
let TEAM_INVITES=[],TEAM_INVITES_LOADED=false,TEAM_INVITES_LOADING=false;
let TEAM_COMM_SETTINGS=null,TEAM_COMM_SETTINGS_LOADED=false,TEAM_COMM_SETTINGS_LOADING=false,TEAM_BULK_INVITING=false;
let TEAM_RESEARCHER_LINK=null,TEAM_RESEARCHER_LINK_LOADED=false,TEAM_RESEARCHER_LINK_LOADING=false,TEAM_RESEARCHER_LINK_CREATING=false;
async function loadTeamInvitesIfNeeded(){
  const s=SURVEYS[TEAM_IDX];
  if(!s||TEAM_INVITES_LOADED||TEAM_INVITES_LOADING)return;
  TEAM_INVITES_LOADING=true;
  try{
    const {data,error}=await sb.from('survey_invites').select('*').eq('survey_id',s.id);
    if(!error)TEAM_INVITES=data||[];
    TEAM_INVITES_LOADED=true;
  }catch(ex){ /* sem convites carregados, a tela ainda funciona normalmente */ }
  TEAM_INVITES_LOADING=false;
  // "Atribuir equipe" não é um item do menu lateral (é aberta por um botão
  // dentro de "Pesquisas"), então não dá pra usar o mesmo truque de checar
  // ".nav-item.on" que as outras telas usam pra saber se ainda estão na
  // tela certa antes de re-renderizar — em vez disso, confere se o próprio
  // conteúdo desta página ainda está no ar.
  if(document.getElementById('team-picklist')){go('survey-team');setTimeout(teamFilterRows,0);}
}
async function loadTeamCommunicationSettingsIfNeeded(){
  const s=SURVEYS[TEAM_IDX];
  if(!s||TEAM_COMM_SETTINGS_LOADED||TEAM_COMM_SETTINGS_LOADING)return;
  TEAM_COMM_SETTINGS_LOADING=true;
  try{
    const {data,error}=await sb.from('survey_communication_settings').select('*').eq('survey_id',s.id).maybeSingle();
    if(error)throw new Error(error.message);
    TEAM_COMM_SETTINGS=data||{};TEAM_COMM_SETTINGS_LOADED=true;
  }catch(ex){console.error('Não foi possível carregar a configuração dos grupos:',ex);TEAM_COMM_SETTINGS_LOADED=true;}
  finally{TEAM_COMM_SETTINGS_LOADING=false;if(document.getElementById('team-picklist')){go('survey-team');setTimeout(teamFilterRows,0);}}
}
async function loadTeamResearcherLinkIfNeeded(){
  const s=SURVEYS[TEAM_IDX];
  if(!s||TEAM_RESEARCHER_LINK_LOADED||TEAM_RESEARCHER_LINK_LOADING)return;
  TEAM_RESEARCHER_LINK_LOADING=true;
  try{
    const {data,error}=await sb.from('survey_researcher_links').select('*').eq('survey_id',s.id).eq('active',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;TEAM_RESEARCHER_LINK=data||null;
  }catch(ex){console.error('Não foi possível carregar o link geral da equipe:',ex);TEAM_RESEARCHER_LINK=null;}
  finally{TEAM_RESEARCHER_LINK_LOADED=true;TEAM_RESEARCHER_LINK_LOADING=false;if(document.getElementById('team-picklist')){go('survey-team');setTimeout(teamFilterRows,0);}}
}
function teamResearcherLinkMarkup(){
  const s=SURVEYS[TEAM_IDX];if(!s)return '';
  if(!TEAM_RESEARCHER_LINK_LOADED)return '<div class="card mb"><div class="empty" style="padding:12px 0">Carregando link geral da equipe…</div></div>';
  const link=TEAM_RESEARCHER_LINK?.token?surveyResearcherLinkUrl(TEAM_RESEARCHER_LINK.token):'';
  return `<div class="card mb team-researcher-link-card"><div class="card-t">Convite por link geral</div><div class="card-d">Gere um único link para compartilhar com pesquisadores. Depois do login, o sistema verifica automaticamente documentos, status e compatibilidade com a área desta pesquisa antes de permitir o aceite.</div>${link?`<div class="approval-link-value">${esc(link)}</div><div class="team-researcher-link-actions"><button class="btn btn-out" onclick="copyTextValue(${jsArg(link)},'Link geral copiado.')">Copiar link</button><button class="btn btn-out" onclick="shareResearcherLinkWhatsapp()">Enviar por WhatsApp</button><button class="btn btn-ghost" style="color:var(--red)" onclick="deactivateResearcherLink()">Desativar</button></div>${TEAM_RESEARCHER_LINK.expires_at?`<div class="card-d">Expira em ${esc(new Date(TEAM_RESEARCHER_LINK.expires_at).toLocaleString('pt-BR'))}.</div>`:''}`:'<div class="callout">Nenhum link geral ativo para esta pesquisa.</div>'}<button class="btn btn-fill" style="width:100%;margin-top:10px" onclick="createResearcherLink()">${link?'Gerar novo link e invalidar o anterior':'Gerar link geral da pesquisa'}</button><div class="card-d" style="margin-top:8px">O aceite é individual e autenticado. O link não adiciona ninguém automaticamente sem a confirmação do próprio pesquisador.</div></div>`;
}
async function createResearcherLink(){
  const s=SURVEYS[TEAM_IDX];if(!s||TEAM_RESEARCHER_LINK_CREATING)return;
  if(!confirm('Gerar um novo link geral? O link anterior será desativado.'))return;
  TEAM_RESEARCHER_LINK_CREATING=true;
  try{
    const {data,error}=await sb.rpc('create_survey_researcher_link',{p_survey_id:s.id,p_expires_at:null});
    if(error)throw new Error(error.message);TEAM_RESEARCHER_LINK=data;TEAM_RESEARCHER_LINK_LOADED=true;alert('Link geral gerado. Compartilhe somente com pesquisadores que possam participar desta pesquisa.');
  }catch(ex){alert('Não foi possível gerar o link. Execute a migration deploy/aprovacao-formulario-link-pesquisadores.sql no Supabase. Detalhe: '+ex.message);}
  TEAM_RESEARCHER_LINK_CREATING=false;go('survey-team');
}
function shareResearcherLinkWhatsapp(){
  const s=SURVEYS[TEAM_IDX],link=TEAM_RESEARCHER_LINK?.token?surveyResearcherLinkUrl(TEAM_RESEARCHER_LINK.token):'';if(!s||!link)return;
  window.open('https://wa.me/?text='+encodeURIComponent('Convite para participar da pesquisa "'+s.name+'" no PesquisaPro. Entre com sua conta e aceite se seu perfil for elegível: '+link),'_blank','noopener');
}
async function deactivateResearcherLink(){
  const link=TEAM_RESEARCHER_LINK;if(!link?.id)return;
  if(!confirm('Desativar o link geral? Quem ainda não aceitou não poderá usá-lo.'))return;
  try{const {error}=await sb.from('survey_researcher_links').update({active:false,deactivated_at:new Date().toISOString()}).eq('id',link.id);if(error)throw error;TEAM_RESEARCHER_LINK=null;alert('Link geral desativado.');}catch(ex){alert('Não foi possível desativar o link: '+ex.message);}go('survey-team');
}
function teamCommunicationMarkup(){
  const url=TEAM_COMM_SETTINGS?.whatsapp_group_url||'';
  return `<div class="card mb team-communication-settings"><div class="card-t">Grupos desta pesquisa</div><div class="card-d">Depois de aceitar o convite, o pesquisador terá acesso ao chat da pesquisa e poderá abrir o grupo oficial do WhatsApp pelo link abaixo. O WhatsApp exige que cada pessoa toque no link para entrar; não há inclusão automática por número.</div><label class="lbl" for="team-whatsapp-group-url">Link de convite do grupo do WhatsApp</label><div class="team-communication-url-row"><input class="inp" id="team-whatsapp-group-url" value="${esc(url)}" placeholder="https://chat.whatsapp.com/…" inputmode="url"><button class="btn btn-out" onclick="saveTeamCommunicationSettings()">Salvar link</button></div><div class="team-communication-help">Crie o grupo no WhatsApp, copie o link de convite e cole aqui. O link será mostrado somente aos pesquisadores que aceitarem esta pesquisa.</div></div>`;
}
function teamOrientationMessageMarkup(){
  const value=TEAM_COMM_SETTINGS?.orientation_message_template||surveyInitialOrientationDefaultTemplate();
  return `<div class="card mb team-orientation-message-card"><div class="card-t">Orientações iniciais por WhatsApp</div><div class="card-d">Edite a mensagem que será aberta pelo botão <b>Enviar orientações</b> na tela Coleta e campo. O contador de envios continua separado por pesquisa e pesquisador.</div><label class="lbl" for="team-orientation-message">Mensagem padrão desta pesquisa</label><textarea class="inp team-orientation-message" id="team-orientation-message" rows="14">${esc(value)}</textarea><div class="team-communication-help">Placeholders disponíveis: <code>{{pesquisador}}</code>, <code>{{pesquisa}}</code>, <code>{{grupo}}</code>, <code>{{site}}</code> e <code>{{video}}</code>. Se apagar o conteúdo, o modelo padrão será usado.</div><button class="btn btn-fill" style="margin-top:10px" onclick="saveTeamOrientationMessage()">Salvar orientações desta pesquisa</button></div>`;
}
async function saveTeamOrientationMessage(){
  const s=SURVEYS[TEAM_IDX];if(!s?.id)return;
  const input=document.getElementById('team-orientation-message');
  const text=(input?.value||'').trim();
  if(text.length>12000){alert('A mensagem deve ter no máximo 12.000 caracteres.');return;}
  try{
    const row={survey_id:s.id,orientation_message_template:text||null,updated_by:CURRENT_PROFILE?.id||null,updated_at:new Date().toISOString()};
    const {data,error}=await sb.from('survey_communication_settings').upsert(row,{onConflict:'survey_id'}).select().single();
    if(error)throw error;
    TEAM_COMM_SETTINGS={...(TEAM_COMM_SETTINGS||{}),...(data||row)};TEAM_COMM_SETTINGS_LOADED=true;
    alert('Mensagem de orientações salva para esta pesquisa.');
    go('survey-team');
  }catch(ex){alert('Não foi possível salvar a mensagem. Execute a migration de orientações editáveis no Supabase.');console.error(ex);}
}
async function saveTeamCommunicationSettings(){
  const s=SURVEYS[TEAM_IDX];if(!s)return;
  const input=document.getElementById('team-whatsapp-group-url'),url=(input?.value||'').trim();
  if(url&&!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(url)){alert('Cole um link oficial de convite do WhatsApp no formato https://chat.whatsapp.com/…');return;}
  try{
    const {data,error}=await sb.rpc('save_survey_communication_settings',{p_survey_id:s.id,p_whatsapp_group_url:url||null});
    if(error)throw new Error(error.message);
    TEAM_COMM_SETTINGS=data||{whatsapp_group_url:url};TEAM_COMM_SETTINGS_LOADED=true;alert(url?'Link do grupo salvo.':'Link do grupo removido.');go('survey-team');
  }catch(ex){alert('Não foi possível salvar o link do grupo. Execute a migration equipe-convites-push-grupos.sql no Supabase.');console.error(ex);}
}
function teamEligibleResearchers(){
  const s=SURVEYS[TEAM_IDX];if(!s)return [];
  const targets=surveyCityTargets(s),hasTarget=!!(targets.cities.size||targets.states.size),team=new Set(s.team||[]),f=TEAM_FILTERS,qq=normalizeUserSearch(f.text);
  return pesqUsers().map(u=>({u,area:pesqAreaMatch(u,targets)})).filter(({u,area})=>{
    if(team.has(u.name)||!researcherIsAvailable(u)||(hasTarget&&!area.match))return false;
    if(!teamFilterMatches(u))return false;
    const locations=researcherLocations(u);
    const text=normalizeUserSearch([u.name,area.label,...locations.map(part=>part.city),...locations.map(part=>part.uf),schoolingLabel(u.escolaridade)].join(' '));
    return !qq||text.includes(qq);
  });
}
async function inviteEligibleResearchersBulk(){
  const s=SURVEYS[TEAM_IDX];if(!s||TEAM_BULK_INVITING)return;
  const eligible=teamEligibleResearchers();
  if(!eligible.length){alert('Nenhum pesquisador elegível corresponde aos filtros atuais.');return;}
  const ids=eligible.map(({u})=>u.id).filter(Boolean);
  if(!ids.length){alert('Os pesquisadores encontrados ainda não possuem identificador válido no banco. Recarregue a lista.');return;}
  if(!confirm('Enviar convite para '+ids.length+' pesquisador'+(ids.length===1?'':'es')+' elegível'+(ids.length===1?'':'is')+'? Cada pessoa poderá aceitar ou recusar no próprio painel.'))return;
  TEAM_BULK_INVITING=true;go('survey-team');
  try{
    const {data,error}=await sb.rpc('create_survey_invites_bulk',{p_survey_id:s.id,p_researcher_ids:ids});
    if(error)throw new Error(error.message);
    const returned=data||[];
    const byId=new Map(TEAM_INVITES.map(item=>[item.researcher_id,item]));
    returned.forEach(item=>byId.set(item.researcher_id,item));TEAM_INVITES=[...byId.values()];TEAM_INVITES_LOADED=true;
    let pushMessage='Os convites aparecerão no painel dos pesquisadores.';
    if(typeof sb.functions?.invoke==='function'){
      try{
        const eligibleById=new Map(eligible.map(({u})=>[u.id,u]));
        const groupLink=await teamWhatsappGroupUrl();
        const inviteMessages=Object.fromEntries(returned.map(item=>[item.id,surveyInvitationPushBody(s,eligibleById.get(item.researcher_id)?.name||'pesquisador(a)',surveyInviteLink(item.id),groupLink)]));
        const push=await sb.functions.invoke('send-survey-invite-push',{body:{survey_id:s.id,invite_ids:returned.map(item=>item.id),invite_messages:inviteMessages}});
        if(push.error)throw push.error;
        const result=push.data||{};pushMessage=(result.sent||0)+' push enviado'+((result.sent||0)===1?'':'s')+'; '+(result.skipped||0)+' pesquisador'+((result.skipped||0)===1?'':'es')+' receberá o aviso ao entrar no aplicativo.';
      }catch(pushError){console.warn('Push não enviado; convite interno continua válido:',pushError);pushMessage='Convites registrados. O push real ainda depende da configuração da função de envio; todos também verão o convite ao entrar no painel.';}
    }
    alert(returned.length+' convite'+(returned.length===1?'':'s')+' registrado'+(returned.length===1?'':'s')+'. '+pushMessage);
  }catch(ex){alert('Não foi possível enviar os convites em massa: '+ex.message);}
  TEAM_BULK_INVITING=false;go('survey-team');
}
/* cria o convite (ou reabre um que foi recusado) e abre o WhatsApp com a
   mensagem já pronta — o pesquisador só entra na equipe se ele aceitar
   dentro do app, nunca só por ter recebido a mensagem. */
async function inviteResearcherWhatsapp(researcherId){
  const s=SURVEYS[TEAM_IDX];if(!s)return;
  const u=USERS.find(x=>x.id===researcherId);if(!u)return;
  const digits=whatsappDigits(u.phone);
  if(!digits){alert('Este pesquisador não tem celular cadastrado — peça para ele atualizar o cadastro antes de convidar por WhatsApp.');return;}
  let inviteId='';
  try{
    const {data:existing,error:selErr}=await sb.from('survey_invites').select('*').eq('survey_id',s.id).eq('researcher_id',researcherId);
    if(selErr)throw new Error(selErr.message);
    const row=(existing||[])[0];
    if(row&&row.status==='aceito'){alert('Esse pesquisador já aceitou o convite desta pesquisa.');return;}
    if(row){
      const {error:updErr}=await sb.from('survey_invites').update({status:'pendente',invited_by:CURRENT_PROFILE.id,invited_at:new Date().toISOString(),responded_at:null}).eq('id',row.id);
      if(updErr)throw new Error(updErr.message);
      row.status='pendente';inviteId=row.id;
    }else{
      const {data:inserted,error:insErr}=await sb.from('survey_invites').insert({survey_id:s.id,researcher_id:researcherId,invited_by:CURRENT_PROFILE.id,status:'pendente'}).select().single();
      if(insErr)throw new Error(insErr.message);
      TEAM_INVITES.push(inserted);inviteId=inserted.id;
    }
  }catch(ex){alert('Não foi possível criar o convite: '+ex.message);return;}
  const link=surveyInviteLink(inviteId);
  const groupLink=await teamWhatsappGroupUrl();
  const msg=surveyInvitationWhatsappMessage(s,u,link,groupLink);
  const tracking=recordSurveyInviteWhatsappSend(inviteId);
  window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(msg),'_blank','noopener');
  await tracking;
  go('survey-team');
}
let TEAM_IDX=null;
let TEAM_SHOW_OUT_OF_AREA=false; /* liga/desliga por pesquisa — reseta a cada entrada na tela */
let TEAM_FILTERS={text:'',state:'',city:'',schooling:''};
function teamFilterOptions(pesqs){
  const states=new Set(),cities=new Map();
  pesqs.forEach(({u})=>researcherLocations(u).forEach(part=>{if(part.uf)states.add(part.uf);if(part.city)cities.set(normalizeUserSearch(part.city),part.city+(part.uf?'/'+part.uf:''));}));
  return {states:[...states].sort(),cities:[...cities.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))};
}
function teamFilterMatches(user){
  const states=researcherStateSet(user),cities=researcherCitySet(user),f=TEAM_FILTERS;
  return (!f.state||states.has(f.state))&&(!f.city||cities.has(f.city))&&(!f.schooling||user.escolaridade===f.schooling);
}
function teamFiltersMarkup(pesqs,hasTarget){
  const {states,cities}=teamFilterOptions(pesqs),f=TEAM_FILTERS;
  return `<div class="team-filter-panel"><div class="team-filter-title"><div><b>Encontrar pesquisadores</b><span>Filtre por localização e escolaridade antes de convidar.</span></div><span class="pill pill-blue" id="team-available-count">— disponíveis</span></div><div class="team-filter-grid"><input class="inp" id="team-search" value="${esc(f.text)}" placeholder="Buscar por nome ou cidade…" oninput="teamSetFilter('text',this.value)"><select class="inp" aria-label="Filtrar equipe por estado" onchange="teamSetFilter('state',this.value)"><option value="">Todos os estados</option>${states.map(state=>`<option value="${esc(state)}" ${f.state===state?'selected':''}>${esc(state)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar equipe por cidade" onchange="teamSetFilter('city',this.value)"><option value="">Todas as cidades</option>${cities.map(([value,label])=>`<option value="${esc(value)}" ${f.city===value?'selected':''}>${esc(label)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar equipe por escolaridade" onchange="teamSetFilter('schooling',this.value)"><option value="">Todas as escolaridades</option>${SCHOOLING_OPTIONS.map(([value,label])=>`<option value="${value}" ${f.schooling===value?'selected':''}>${esc(label)}</option>`).join('')}</select></div><div class="team-filter-note">${hasTarget?'A contagem considera pesquisadores ativos, com documentos completos, cidade cadastrada e compatíveis com a área da pesquisa.':'A contagem considera pesquisadores ativos, com documentos completos e cidade cadastrada.'}</div><button class="btn btn-fill team-bulk-invite-btn" id="team-bulk-invite" type="button" onclick="inviteEligibleResearchersBulk()">⚡ Convidar pesquisadores por push</button><div class="team-filter-help">O botão azul envia convite em massa por push. Para WhatsApp, use o botão individual <b>Convidar por WhatsApp</b> na linha de cada pesquisador.</div></div>`;
}
PAGES['survey-team']=()=>{
  const s=SURVEYS[TEAM_IDX];if(!s)return '<div class="empty">Pesquisa não encontrada.</div>';
  if(!USERS_LOADED){
    loadUsersIfNeeded();
    return head('Atribuir equipe — '+s.name,'Carregando pesquisadores cadastrados…')+'<div class="empty">Carregando pesquisadores do banco de dados…</div>';
  }
  if(!TEAM_INVITES_LOADED)loadTeamInvitesIfNeeded();
  if(!TEAM_COMM_SETTINGS_LOADED)loadTeamCommunicationSettingsIfNeeded();
  if(!TEAM_RESEARCHER_LINK_LOADED)loadTeamResearcherLinkIfNeeded();
  const team=s.team||[];
  const targets=surveyCityTargets(s);
  const hasTarget=!!(targets.cities.size||targets.states.size);
  const pesqs=pesqUsers().map(u=>({u,area:pesqAreaMatch(u,targets)}))
    .sort((a,b)=>(b.area.match-a.area.match)||a.u.name.localeCompare(b.u.name));
  const areaNote=targets.cities.size
    ?'cidades da pesquisa: '+[...targets.cities].join(', ')
    :(targets.states.size?'estado(s) da pesquisa: '+[...targets.states].join(', '):'esta pesquisa não tem estado/cidade definidos');
  const foraCount=pesqs.filter(({u,area})=>!area.match).length;
  const rows=pesqs.length?pesqs.map(({u,area})=>{
    const on=team.includes(u.name);
    const pend=u.status!=='ativo';
    // só pode convidar (marcar) quem tem no cadastro a cidade/estado da
    // amostra da pesquisa — quem já estava na equipe antes continua
    // podendo ser removido normalmente, mesmo que hoje não bata mais com
    // a área (por isso o "&&!on" abaixo: nunca bloqueia tirar alguém).
    const foraDaArea=hasTarget&&!area.match;
    const naoSelecionavel=foraDaArea&&!on; // fora da área e nunca esteve na equipe: não pode ser marcado
    const hidden=naoSelecionavel&&!TEAM_SHOW_OUT_OF_AREA;
    const locations=researcherLocations(u),stateKey=[...researcherStateSet(u)].join('|'),cityKey=[...researcherCitySet(u)].join('|'),searchKey=esc(normalizeUserSearch([u.name,area.label,...locations.map(part=>part.city),...locations.map(part=>part.uf),schoolingLabel(u.escolaridade)].join(' '))),available=researcherIsAvailable(u)&&(!hasTarget||area.match);
    const inv=TEAM_INVITES.find(i=>i.researcher_id===u.id);
    // convite por WhatsApp: só faz sentido oferecer pra quem pode mesmo
    // entrar na equipe (não pend, não fora da área, ainda não está na equipe)
    const podeConvidar=!on&&!pend&&!naoSelecionavel&&researcherIsAvailable(u);
    let inviteHtml='';
    if(podeConvidar){
      if(inv&&inv.status==='pendente'){
        inviteHtml=`<span class="pill pill-amber">✉ convite enviado</span>${whatsappInviteCountMarkup(inv)}<button class="btn-ghost team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">↗ Reenviar WhatsApp</button><button class="btn-ghost" style="font-size:11px;padding:4px 8px" onclick="event.preventDefault();copySurveyInviteLink('${inv.id}')">Copiar link</button>`;
      }else if(inv&&inv.status==='recusado'){
        inviteHtml=`<span class="pill pill-red">recusou o convite</span>${whatsappInviteCountMarkup(inv)}<button class="btn-ghost team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">↗ Reenviar WhatsApp</button><button class="btn-ghost" style="font-size:11px;padding:4px 8px" onclick="event.preventDefault();copySurveyInviteLink('${inv.id}')">Copiar link</button>`;
      }else{
        inviteHtml=`<button class="btn btn-out team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">✉ Convidar por WhatsApp</button>`;
      }
    }
    return `<label class="pick t-pesq-row" data-search="${searchKey}" data-state="${esc(stateKey)}" data-city="${esc([...researcherCitySet(u)].join('|'))}" data-schooling="${esc(u.escolaridade||'')}" data-available="${available?'1':'0'}" data-fora="${naoSelecionavel?'1':'0'}" style="${(pend||foraDaArea||!researcherIsAvailable(u))?'opacity:.7':''}${hidden?';display:none':''}">
      <input type="checkbox" class="t-pesq" value="${esc(u.name)}" ${on?'checked':''} ${(pend||naoSelecionavel||(!researcherIsAvailable(u)&&!on))?'disabled':''}>
      <div class="avatar" style="width:30px;height:30px;font-size:11px">${esc(u.name).split(' ').map(n=>n[0]).join('')}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(u.name)}</div>
        <div style="font-size:11px;color:var(--ink3)">${esc(area.label)} · ${esc(schoolingLabel(u.escolaridade))}</div></div>
      ${area.match?'<span class="pill pill-green">● atua na área</span>':''}
      ${foraDaArea?`<span class="pill pill-gray">fora da área${on?' · já na equipe':''}</span>`:''}
      ${pend?'<span class="pill pill-amber">● aguardando aprovação</span>':''}
      ${!pend&&(!u.docFoto||!u.docComprovante)?'<span class="pill pill-red">● docs pendentes</span>':''}
      ${conversationButton(u.phone,'Olá '+u.name+'! Podemos conversar sobre a pesquisa '+s.name+'?')}
      ${inviteHtml}</label>`;
  }).join(''):'<div class="empty">Nenhum pesquisador cadastrado ainda. Cadastre em Usuários → Pesquisadores.</div>';
  return head('Atribuir equipe — '+s.name,'Escolha pesquisadores cadastrados ou envie link de cadastro para novos',
    '<button class="btn btn-out" onclick="go(\'surveys\')">← Voltar</button><button class="btn btn-out" onclick="chatOpenSurveyChannel(\''+s.id+'\')">✉ Chat da pesquisa</button><button class="btn btn-out team-collection-access" onclick="collectOpen('+TEAM_IDX+')">📊 Pesquisadores na coleta</button><button class="btn btn-fill" onclick="teamSave()">Salvar equipe</button>')+`
  ${TEAM_RESEARCHER_LINK_LOADED?teamResearcherLinkMarkup():''}
  ${TEAM_COMM_SETTINGS_LOADED?teamCommunicationMarkup()+teamOrientationMessageMarkup():''}
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div style="display:flex;align-items:flex-start;gap:12px;justify-content:space-between;flex-wrap:wrap"><div><div class="card-t">Pesquisadores cadastrados</div><div class="card-d" style="margin-top:4px">Para acompanhar quem já está coletando, use <b>Pesquisadores na coleta</b> no topo ou abra o botão abaixo.</div></div><button class="btn btn-fill team-collection-access" onclick="collectOpen(${TEAM_IDX})">📊 Ver pesquisadores na coleta</button></div>
      <div class="card-d">${hasTarget?`Só é possível convidar quem tem, no cadastro, disponibilidade para ${esc(areaNote)} — pesquisadores de outras áreas ficam de fora da lista.`:`Marque quem vai trabalhar nesta pesquisa (${esc(areaNote)}, então não há restrição de área).`}</div>
      ${hasTarget&&foraCount?`<label class="pick" style="padding:6px 2px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="team-show-fora" ${TEAM_SHOW_OUT_OF_AREA?'checked':''} onchange="teamToggleShowFora(this.checked)"><span style="font-size:12px;color:var(--ink3)">Mostrar também os ${foraCount} pesquisador${foraCount>1?'es':''} fora da área (não poderão ser marcados — exceção só pelo cadastro dele)</span></label>`:''}
      ${pesqs.length?teamFiltersMarkup(pesqs,hasTarget):''}
      <div class="picklist" id="team-picklist" style="grid-template-columns:1fr">${rows}</div>
      <div class="empty" id="team-no-match" style="display:none">Nenhum pesquisador encontrado para essa busca.</div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">Convites desta pesquisa</div>
        <div class="card-d">Há duas formas de convite: use o botão azul <b>Convidar por push</b> para vários pesquisadores ou o botão <b>Convidar por WhatsApp</b> na linha de cada pesquisador para abrir a mensagem completa. O aceite autenticado coloca o pesquisador automaticamente na equipe.</div>
        <div class="callout" style="margin-bottom:12px"><b>Fluxo seguro:</b> o link abre a tela de login. Depois de entrar com a própria conta, o pesquisador precisa tocar em <b>“Aceitar e entrar na equipe”</b>. Apenas o aceite autenticado grava o vínculo.</div>
        <div class="team-invite-summary">${TEAM_INVITES.length?TEAM_INVITES.map(i=>{const u=USERS.find(x=>x.id===i.researcher_id);return `<div class="team-invite-row"><div><b>${esc(u?u.name:'Pesquisador')}</b><small>${i.status==='aceito'?'Já está na equipe':i.status==='recusado'?'Recusou o convite':'Aguardando aceite'}</small></div><div class="team-invite-actions">${whatsappInviteCountMarkup(i)}${i.status!=='aceito'&&u?.id?`<button class="btn btn-out team-whatsapp-invite-btn" onclick="inviteResearcherWhatsapp(${jsArg(u.id)})">${i.status==='pendente'?'↗ Reenviar WhatsApp':'✉ Enviar WhatsApp'}</button>`:''}${conversationButton(u?.phone,'Olá '+(u?.name||'pesquisador')+'! Podemos conversar sobre o convite da pesquisa?')}<span class="pill ${i.status==='aceito'?'pill-green':i.status==='recusado'?'pill-red':'pill-amber'}">${esc(i.status||'pendente')}</span></div></div>`;}).join(''):'<div class="empty" style="padding:12px 0">Nenhum convite enviado para esta pesquisa.</div>'}</div>
      </div>
      <div class="card">
        <div class="card-t" style="font-size:13px">Ainda não tem cadastro?</div>
        <div class="card-d">Cadastros novos continuam passando pela aprovação administrativa antes de coletar. Depois da aprovação, o pesquisador poderá receber convites específicos por pesquisa.</div>
        <button class="btn btn-out" onclick="alert('O cadastro público deve ser compartilhado pelo administrador responsável.')">Ver orientação de cadastro</button>
      </div>
    </div>
  </div>`;
};
function surveyTeam(idx){TEAM_IDX=idx;TEAM_SHOW_OUT_OF_AREA=false;TEAM_FILTERS={text:'',state:'',city:'',schooling:''};TEAM_INVITES=[];TEAM_INVITES_LOADED=false;TEAM_COMM_SETTINGS=null;TEAM_COMM_SETTINGS_LOADED=false;TEAM_COMM_SETTINGS_LOADING=false;TEAM_BULK_INVITING=false;TEAM_RESEARCHER_LINK=null;TEAM_RESEARCHER_LINK_LOADED=false;TEAM_RESEARCHER_LINK_LOADING=false;TEAM_RESEARCHER_LINK_CREATING=false;go('survey-team');setTimeout(teamFilterRows,0);}
/* liga/desliga a visibilidade de quem está fora da área, sem perder o que
   já foi marcado na tela (por isso mexe direto no DOM em vez de re-renderizar
   a página inteira) — quem está fora da área nunca fica marcável por aqui,
   só visível ou escondido. */
function teamToggleShowFora(checked){
  TEAM_SHOW_OUT_OF_AREA=checked;
  teamFilterRows();
}
function teamSetFilter(key,value){TEAM_FILTERS[key]=value||'';teamFilterRows();}
/* filtra a lista de pesquisadores sem re-renderizar (senão perderia o que já
   estava marcado enquanto a pessoa digita) e atualiza a contagem disponível. */
function teamFilterRows(){
  const qq=normalizeUserSearch(TEAM_FILTERS.text);
  const rows=[...document.querySelectorAll('#team-picklist .t-pesq-row')];
  let visible=0,available=0;
  rows.forEach(row=>{
    const matchesSearch=!qq||(row.dataset.search||'').includes(qq);
    const states=(row.dataset.state||'').split('|').filter(Boolean),cities=(row.dataset.city||'').split('|').filter(Boolean);
    const matchesFilters=(!TEAM_FILTERS.state||states.includes(TEAM_FILTERS.state))&&(!TEAM_FILTERS.city||cities.includes(TEAM_FILTERS.city))&&(!TEAM_FILTERS.schooling||row.dataset.schooling===TEAM_FILTERS.schooling);
    const isFora=row.dataset.fora==='1';
    const show=matchesSearch&&matchesFilters&&(!isFora||TEAM_SHOW_OUT_OF_AREA);
    row.style.display=show?'':'none';
    if(show)visible++;
    if(show&&row.dataset.available==='1')available++;
  });
  const noMatch=document.getElementById('team-no-match');
  if(noMatch)noMatch.style.display=visible?'none':'';
  const count=document.getElementById('team-available-count');
  if(count)count.textContent=available+' disponível'+(available===1?'':'is');
  const bulk=document.getElementById('team-bulk-invite');
  if(bulk){bulk.disabled=TEAM_BULK_INVITING||available===0;bulk.textContent=TEAM_BULK_INVITING?'Enviando convites por push…':'⚡ Convidar '+available+' pesquisador'+(available===1?' elegível':'es elegíveis')+' por push';}
}
async function teamSave(){
  const s=SURVEYS[TEAM_IDX];if(!s)return;
  const names=new Set([...document.querySelectorAll('.t-pesq:checked')].map(c=>c.value));
  // salvaguarda: quem já aceitou um convite entra automaticamente pelo banco
  // (respond_survey_invite) assim que aceita — mas se essa tela foi aberta
  // ANTES do aceite (lista de pesquisadores desatualizada), "Salvar equipe"
  // não pode apagar esse vínculo só porque o checkbox aqui não estava
  // marcado. Garante que quem aceitou continua na lista final.
  TEAM_INVITES.filter(i=>i.status==='aceito').forEach(i=>{
    const u=USERS.find(x=>x.id===i.researcher_id);
    if(u)names.add(u.name);
  });
  const namesArr=[...names];
  try{
    if(s.id)await syncSurveyTeam(s.id,namesArr);
  }catch(ex){alert('Não foi possível salvar a equipe: '+ex.message);return;}
  s.team=namesArr;
  alert('Equipe salva: '+(namesArr.length?namesArr.join(', '):'nenhum pesquisador'));
  go('surveys');
}

/* ============ SAMPLE / amostra ============ */
PAGES.sample=()=>head('Cálculo de amostra','Defina o tamanho da amostra a partir da população, margem de erro e confiança')+`
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Parâmetros</div>
      <div class="card-d">Fórmula para população finita</div>
      <div class="mb"><label class="lbl">População (N) — eleitores</label>
        <input class="inp" id="sp-pop" type="number" min="1" step="1" value="16200000" oninput="scheduleSampleCalc()"></div>
      <div class="field-row mb">
        <div><label class="lbl">Margem de erro</label>
          <select class="inp" id="sp-err" onchange="scheduleSampleCalc()">
            <option value="0.05">± 5%</option><option value="0.04">± 4%</option>
            <option value="0.03">± 3%</option><option value="0.02" selected>± 2%</option></select></div>
        <div><label class="lbl">Nível de confiança</label>
          <select class="inp" id="sp-conf" onchange="scheduleSampleCalc()">
            <option value="1.645">90%</option><option value="1.96" selected>95%</option><option value="2.576">99%</option></select></div>
      </div>
      <div class="mb"><label class="lbl">Proporção esperada (p)</label>
        <input class="inp" id="sp-prop" type="number" min="1" max="99" value="50" step="1" oninput="scheduleSampleCalc()"> <span style="font-size:11px;color:var(--ink3)">% — use 50% se desconhecida (mais conservador)</span></div>
      <div class="callout"><b>Fórmula:</b> n = [N·Z²·p(1-p)] / [e²(N-1) + Z²·p(1-p)]</div>
    </div>
    <div>
      <div class="sample-out">
        <div class="sample-box"><div class="sb-big" id="sp-n">—</div><div class="sb-lbl">Amostra mínima</div></div>
        <div class="sample-box sec"><div class="sb-big" id="sp-nadj" style="color:var(--accent)">—</div><div class="sb-lbl">Com folga 10%</div></div>
        <div class="sample-box sec"><div class="sb-big" id="sp-cost" style="color:var(--teal)">—</div><div class="sb-lbl">Custo estimado</div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-t" style="font-size:13px">Sensibilidade da margem de erro</div>
        <div class="card-d">Quanto a amostra muda conforme a precisão exigida</div>
        <div style="position:relative;height:200px"><canvas id="sampleChart" role="img" aria-label="Sensibilidade da amostra"></canvas></div>
      </div>
      <div class="callout warn" style="margin-top:14px">Definido o total, distribua a amostra entre as cotas para manter a representatividade por sexo, idade e região.</div>
    </div>
  </div>`;

/* ============ QUOTAS ============ */
PAGES.quotas=()=>head('Metas e cotas','Distribua a amostra por variáveis e acompanhe o cumprimento em campo',
  '<button class="btn btn-out" onclick="alert(\'Recurso ainda não configurado: importar perfil populacional (IBGE/TSE)\')">Importar perfil</button><button class="btn btn-fill" onclick="alert(\'Recurso ainda não configurado: salvar plano de cotas\')">Salvar plano</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Amostra total','4.200','plano amostral aprovado','∑','#2563eb')}
    ${stat('Cotas definidas','54','sexo × idade × região','◷','#7c3aed')}
    ${stat('Cotas completas','19','de 54 · 35%','✓','#059669')}
    ${stat('Coletas válidas','2.847','68% do total','✓','#ea580c')}
  </div>
  <div class="card mb">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="card-t" style="margin:0">Distribuição por variáveis</div>
      <div class="seg" style="margin-left:auto" id="quotaSeg">
        <button class="on" onclick="quotaSeg(this,'sexo')">Sexo</button>
        <button onclick="quotaSeg(this,'idade')">Faixa etária</button>
        <button onclick="quotaSeg(this,'regiao')">Macrorregião</button>
      </div>
    </div>
    <div id="quotaBody"></div>
  </div>
  <div class="callout"><b>Como funciona:</b> o sistema cruza as variáveis (ex.: Mulheres × 25–44 × Zona da Mata) e gera uma meta por célula. O app de coleta mostra ao pesquisador apenas as cotas que ainda faltam, evitando excesso de um perfil.</div>`;

/* ============ COLLECT (gestão de campo) ============ */
/* ============ COLLECT (lista de pesquisas → pesquisadores) ============ */
let COLLECT_IDX=null;
let COLLECT_ORIENTATION_COUNTS={},COLLECT_ORIENTATION_COUNTS_STATUS='idle',COLLECT_ORIENTATION_COUNTS_LOADING=false;
const RESEARCHER_INFO={
  'João Pereira':{regional:'Triângulo',link:'…/c/jp-3f9a',meta:180,done:312,sync:'online',phone:'5534999990001'},
  'Fernanda Couto':{regional:'Triângulo',link:'…/c/fc-9a4b',meta:200,done:188,sync:'online',phone:'5534999990002'},
  'Maria Souza':{regional:'Jequitinhonha',link:'…/c/ms-7b2c',meta:150,done:71,sync:'offline',phone:'5533999990003'},
  'Lucas Andrade':{regional:'Vale do Mucuri',link:'…/c/la-1d8e',meta:140,done:62,sync:'online',phone:'5533999990004'},
  'Renata Lima':{regional:'Noroeste',link:'…/c/rl-2k7p',meta:160,done:88,sync:'online',phone:'5538999990005'},
  'Paulo Cruz':{regional:'Norte',link:'…/c/pc-5m1q',meta:320,done:210,sync:'offline',phone:'5538999990006'},
};
function surveyCoveragePct(collected,sample){
  const total=Number(sample)||0,done=Number(collected)||0;
  if(total<=0||done<=0)return '0%';
  const rounded=Math.round((done/total*100)*10)/10;
  return rounded.toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(rounded)?0:1,maximumFractionDigits:1})+'%';
}
function collectionOrientationResearcher(name){
  return USERS.find(u=>u.name===name)||null;
}
function collectionOrientationCountMarkup(name){
  const user=collectionOrientationResearcher(name),id=user?.id;
  if(COLLECT_ORIENTATION_COUNTS_STATUS==='loading')return '<span class="pill pill-gray collection-orientation-count">Orientações: carregando…</span>';
  if(COLLECT_ORIENTATION_COUNTS_STATUS==='unavailable')return '<span class="pill pill-gray collection-orientation-count" title="Execute a migration do contador de orientações no Supabase">Orientações: indisponível</span>';
  if(!id)return '<span class="pill pill-gray collection-orientation-count">Orientações: sem ID</span>';
  const count=Math.max(0,Number(COLLECT_ORIENTATION_COUNTS[id]?.send_count)||0);
  return `<span class="pill ${count?'pill-green':'pill-amber'} collection-orientation-count" title="Quantidade de vezes que as orientações iniciais foram abertas pelo WhatsApp">Orientações: ${count} envio${count===1?'':'s'}</span>`;
}
function collectionTeamRows(s,team){
  return team.length?team.map(name=>{
    const info=RESEARCHER_INFO[name]||{regional:'—',link:'…/c/xxxx',meta:0,done:0,sync:'online',phone:'5500000000000'};
    const user=collectionOrientationResearcher(name),phone=user?.phone||info.phone||'';
    const syncPill=info.sync==='online'?'<span class="pill pill-green">● Online</span>':'<span class="pill pill-amber">● Offline</span>';
    const wa='https://wa.me/'+whatsappDigits(phone);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initialsOf(name))}</div>${esc(name)}</div></td>
      <td>${esc(info.regional)}</td>
      <td><span class="pill pill-blue">${esc(info.link)}</span></td>
      <td>${Number(info.done)||0} / ${Number(info.meta)||0}</td>
      <td>${syncPill}</td>
      <td class="collection-team-actions">
        <div class="collection-orientation-action"><button class="btn btn-out collection-orientation-btn" ${phone?'':'disabled'} onclick="sendCollectionOrientationWhatsapp(${jsArg(name)})">✉ Enviar orientações</button>${collectionOrientationCountMarkup(name)}</div>
        ${phone?`<a class="btn-ghost" style="color:var(--teal);display:inline-block" href="${wa}" target="_blank" rel="noopener" title="Abre uma conversa comum; não registra o envio das orientações">Conversar no WhatsApp</a>`:'<span class="pill pill-gray">Sem telefone</span>'}
      </td></tr>`;
  }).join(''):'<tr><td colspan="6" class="empty">Nenhum pesquisador vinculado. Atribua a equipe em Minhas pesquisas.</td></tr>';
}
function refreshCollectionTeamRows(idx){
  const tbody=document.getElementById('collectTeamBody'),s=SURVEYS[idx];
  if(tbody&&s)tbody.innerHTML=collectionTeamRows(s,s.team||[]);
}
async function loadCollectionOrientationCounts(idx){
  const s=SURVEYS[idx];
  if(!s?.id||COLLECT_ORIENTATION_COUNTS_LOADING)return;
  COLLECT_ORIENTATION_COUNTS_LOADING=true;COLLECT_ORIENTATION_COUNTS_STATUS='loading';refreshCollectionTeamRows(idx);
  try{
    const {data,error}=await sb.rpc('get_survey_orientation_whatsapp_counts',{p_survey_id:s.id});
    if(error)throw error;
    COLLECT_ORIENTATION_COUNTS={};
    (data||[]).forEach(row=>{COLLECT_ORIENTATION_COUNTS[row.researcher_id]=row;});
    COLLECT_ORIENTATION_COUNTS_STATUS='ready';
  }catch(ex){
    COLLECT_ORIENTATION_COUNTS_STATUS='unavailable';
    console.warn('Contador de orientações indisponível; execute a migration contador-orientacoes-whatsapp-coleta.sql:',ex);
  }
  COLLECT_ORIENTATION_COUNTS_LOADING=false;
  if(COLLECT_IDX===idx)refreshCollectionTeamRows(idx);
}
async function collectionOrientationSettings(surveyId){
  try{
    const {data,error}=await sb.from('survey_communication_settings').select('whatsapp_group_url,orientation_message_template').eq('survey_id',surveyId).maybeSingle();
    if(error)throw error;
    return data||{};
  }catch(ex){return {};}
}
async function sendCollectionOrientationWhatsapp(name){
  const s=SURVEYS[COLLECT_IDX],user=collectionOrientationResearcher(name);
  if(!s||!user){alert('Não foi possível identificar este pesquisador no cadastro.');return;}
  const digits=whatsappDigits(user.phone);
  if(!digits){alert('Este pesquisador não tem celular cadastrado.');return;}
  const orientationSettings=await collectionOrientationSettings(s.id);
  const message=surveyInitialOrientationWhatsappMessage(s,user,orientationSettings.whatsapp_group_url||'',orientationSettings.orientation_message_template||'');
  const target='https://wa.me/'+digits+'?text='+encodeURIComponent(message);
  /* Abre o destino diretamente durante o clique para que o navegador não
     bloqueie o WhatsApp. O contador é atualizado logo depois pela RPC; a
     conversa comum acima não passa por este fluxo. */
  window.open(target,'_blank','noopener,noreferrer');
  try{
    const {data,error}=await sb.rpc('record_survey_orientation_whatsapp_send',{p_survey_id:s.id,p_researcher_id:user.id});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(row)COLLECT_ORIENTATION_COUNTS[user.id]=row;
    COLLECT_ORIENTATION_COUNTS_STATUS='ready';
    refreshCollectionTeamRows(COLLECT_IDX);
  }catch(ex){
    console.warn('Envio aberto, mas contador de orientações indisponível; execute a migration contador-orientacoes-whatsapp-coleta.sql:',ex);
    alert('A mensagem foi aberta, mas o contador não foi registrado: '+(ex.message||String(ex)));
  }
}
PAGES.collect=()=>{
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
  if(COLLECT_IDX==null)return collectList();
  return collectDetail(COLLECT_IDX);
};
function collectList(){
  const active=SURVEYS.map((s,i)=>({s,i})).filter(x=>x.s.status==='campo'||x.s.status==='rascunho');
  const rows=active.map(({s,i})=>{
    const sample=surveySample(s);
    const collected=surveyCollectedCount(s);
    const pct=surveyCoveragePct(collected,sample);
    const team=(s.team||[]).length;
    return `<tr style="cursor:pointer" onclick="collectOpen(${i})">
      <td><b>${esc(s.name)}</b><div style="font-size:11px;color:var(--ink3)">${esc(s.created)}</div></td>
      <td>${STATUS_PILL[s.status]}</td>
      <td>${team?team+(team===1?' pesquisador':' pesquisadores'):'<span style="color:var(--ink3)">sem equipe</span>'}</td>
      <td>${collected.toLocaleString('pt-BR')} / ${sample.toLocaleString('pt-BR')} (${pct})</td>
      <td><span class="pill pill-blue">Abrir →</span></td></tr>`;
  }).join('')||'<tr><td colspan="5" class="empty">Nenhuma pesquisa em andamento.</td></tr>';
  return head('Coleta e campo','Selecione uma pesquisa em andamento para ver os pesquisadores vinculados')+`
  <div class="card">
    <div class="card-t">Pesquisas em andamento</div>
    <div class="card-d">Clique numa pesquisa para acompanhar a equipe, reenviar links e falar no WhatsApp</div>
    <table><thead><tr><th>Pesquisa</th><th>Status</th><th>Equipe</th><th>Coletado</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}
function collectOpen(i){COLLECT_IDX=i;COLLECT_ARMED=true;COLLECT_ORIENTATION_COUNTS={};COLLECT_ORIENTATION_COUNTS_STATUS='loading';COLLECT_ORIENTATION_COUNTS_LOADING=false;_collectMapFilters={researcher:'all',status:'all',latest:false};_collectMapDidFit=false;go('collect');}
function collectBack(){COLLECT_IDX=null;COLLECT_ORIENTATION_COUNTS={};COLLECT_ORIENTATION_COUNTS_STATUS='idle';COLLECT_ORIENTATION_COUNTS_LOADING=false;go('collect');}
let COLLECT_ARMED=false;
function collectDetail(idx){
  const s=SURVEYS[idx];if(!s)return collectList();
  const team=s.team||[];
  const rows=collectionTeamRows(s,team);
  const sample=surveySample(s);
  const collected=surveyCollectedCount(s);
  const mapResearchers=[...new Set(team)].sort((a,b)=>a.localeCompare(b));
  const mapResearcherOptions=mapResearchers.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  return head('Coleta e campo — '+s.name,'Pesquisadores vinculados a esta pesquisa',
    '<button class="btn btn-out" onclick="collectBack()">← Pesquisas</button><button class="btn btn-fill" onclick="alert(\'Recurso ainda não configurado: exportar dados brutos (CSV/SPSS)\')">Exportar dados</button>')+`
  <div class="grid g3" style="margin-bottom:16px">
    ${stat('Pesquisadores',String(team.length),'vinculados','☺','#2563eb')}
    ${stat('Coletado',collected.toLocaleString('pt-BR'),'de '+sample.toLocaleString('pt-BR'),'✓','#059669')}
    ${stat('Status',s.status==='campo'?'Em campo':'Rascunho','','◷','#d97706')}
  </div>

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <div class="seg" id="collectTabSeg">
      <button class="on" onclick="collectTab(this,'equipe')">Equipe</button>
      <button onclick="collectTab(this,'mapa')">📍 Mapa ao vivo</button>
      <button onclick="collectTab(this,'auditoria')">🔎 Auditoria</button>
    </div>
    <span class="pill pill-green" style="margin-left:auto"><span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;animation:fade 1.4s ease-in-out infinite alternate"></span> Atualizando ao vivo</span>
  </div>

  <div id="collectTabEquipe">
    <div class="card mb">
      <div class="card-t">Equipe vinculada</div>
      <div class="card-d">Envie as orientações iniciais da pesquisa pelo WhatsApp e acompanhe quem já recebeu o material.</div>
      <div class="callout collection-orientation-callout"><b>Orientações iniciais:</b> use o botão em cada linha para abrir a mensagem completa no WhatsApp. O contador mostra quais pesquisadores já receberam o envio inicial e quais ainda estão pendentes.</div>
      <div class="table-scroll"><table><thead><tr><th>Pesquisador</th><th>Regional</th><th>Link</th><th>Coletado</th><th>Sync</th><th>Orientações e contato</th></tr></thead>
      <tbody id="collectTeamBody">${rows}</tbody></table></div>
    </div>
    <div class="card">
      <div class="card-t">Controles de qualidade automáticos</div>
      <ul class="checklist" style="margin-top:8px">
        <li><span class="ck">✓</span>Georreferenciamento obrigatório — o pesquisador só consegue iniciar uma coleta com o GPS do celular ativo</li>
        <li><span class="ck">✓</span>Localização e horário gravados em toda entrevista, mesmo sem internet — só o envio ao servidor depende de sinal</li>
        <li><span class="ck">✓</span>Validação de GPS — coleta dentro da área designada</li>
        <li><span class="ck">✓</span>Tempo mínimo de aplicação (descarta respostas muito rápidas)</li>
        <li><span class="ck">✓</span>Detecção de duplicidade por dispositivo e entrevistado</li>
      </ul>
    </div>
  </div>

  <div id="collectTabMapa" style="display:none">
    <div class="map-panel card mb">
      <div class="map-panel-head">
        <div><div class="map-eyebrow">MONITORAMENTO DE CAMPO</div><div class="card-t">Mapa de coletas</div><div class="card-d" id="collectMapSummary">Carregando pontos georreferenciados…</div></div>
        <div class="map-panel-actions"><button class="btn btn-out" onclick="collectMapFit()">⌖ Enquadrar pontos</button><button class="btn btn-out" onclick="collectMapRefresh()">↻ Atualizar</button></div>
      </div>
      <div class="map-toolbar">
        <label class="map-filter"><span>Pesquisador</span><select id="collectMapResearcher" onchange="collectMapApplyFilters()"><option value="all">Todos da equipe</option>${mapResearcherOptions}</select></label>
        <label class="map-filter"><span>Status</span><select id="collectMapStatus" onchange="collectMapApplyFilters()"><option value="all">Todos os pontos</option><option value="valid">Válidas</option><option value="rejected">Reprovadas</option><option value="calibration">Calibração</option><option value="pending">Pendentes de sync</option></select></label>
        <label class="map-check"><input type="checkbox" id="collectMapLatest" onchange="collectMapApplyFilters()"><span>Somente a última por pesquisador</span></label>
      </div>
      <div class="map-canvas-wrap"><div id="collectMap" class="collect-map-canvas" role="application" aria-label="Mapa de coletas georreferenciadas"></div><div id="collectMapLoading" class="map-loading" aria-live="polite">Preparando mapa…</div></div>
      <div class="map-panel-foot"><div class="map-legend"><span><i class="map-dot map-dot-latest"></i>Última coleta</span><span><i class="map-dot map-dot-history"></i>Histórico</span><span><i class="map-dot map-dot-rejected"></i>Reprovada</span><span><i class="map-dot map-dot-calibration"></i>Calibração</span></div><div class="map-note" id="collectMapNote">Clique em um ponto para ver o detalhe.</div></div>
    </div>
    <div class="card">
      <div class="card-t">Últimas coletas</div>
      <div class="card-d">Atualizado automaticamente a cada 20 segundos. Use os filtros do mapa para investigar uma equipe ou status específico.</div>
      <div id="liveFeed"></div>
    </div>
  </div>

  <div id="collectTabAuditoria" style="display:none">
    <div id="auditFlaggedWrap" class="card mb" style="display:none">
      <div class="card-t">Reprovações e calibrações desta pesquisa</div>
      <div class="card-d">Coletas marcadas na auditoria abaixo. Desfaça a qualquer momento — a coleta volta a valer normalmente.</div>
      <div id="auditFlagged"></div>
    </div>
    <div class="card">
      <div class="card-t">Auditoria da coleta</div>
      <div class="card-d">Todas as entrevistas desta pesquisa: pesquisador, cota, coordenadas (com a distância até a coleta anterior do mesmo pesquisador), horário, intervalo desde a entrevista anterior, confirmação final e alertas de qualidade. Aproximadamente 20% podem ser selecionadas para uma confirmação curta em áudio, sempre com autorização do entrevistado. Reprove uma coleta com fraude/erro (não entra no pagamento do pesquisador) ou marque como calibração (fica fora do cálculo dos resultados, mas continua contando para o pagamento). As duas ações podem ser desfeitas a qualquer momento, aqui ou no painel acima.</div>
      <div id="auditRecordingSummary" class="recording-summary"></div>
      <div class="audit-table-scroll-hint" role="note"><span aria-hidden="true">↔</span><span><b>Deslize horizontalmente</b> para consultar todos os detalhes. A coluna <b>Ações</b> permanece acessível à direita.</span></div>
      <div class="audit-table-scroll" tabindex="0" aria-label="Tabela de auditoria. Deslize horizontalmente para ver todas as informações e ações.">
      <table class="audit-data-table"><thead><tr><th>Pesquisador</th><th>Cota</th><th>Data/hora</th><th title="Tempo desde a entrevista anterior do mesmo pesquisador">Intervalo</th><th>Coordenadas</th><th>Precisão</th><th>Status</th><th>Duração</th><th>Confirmação</th><th>Alertas</th><th class="audit-actions-header">Ações</th></tr></thead>
      <tbody id="auditBody"></tbody></table>
      </div>
    </div>
  </div>`;
}

function collectTab(btn,which){
  document.querySelectorAll('#collectTabSeg button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const map={equipe:'collectTabEquipe',mapa:'collectTabMapa',auditoria:'collectTabAuditoria'};
  Object.entries(map).forEach(([k,id])=>{
    const el=document.getElementById(id);
    if(el)el.style.display=(k===which)?'block':'none';
  });
  if(which==='mapa'){
    renderCollectMap(COLLECT_IDX);
    setTimeout(()=>{if(_collectMap)_collectMap.invalidateSize();},60);
  }
  if(which==='auditoria'){renderAudit(COLLECT_IDX);}
}

/* ===== Coleta de campo: mapa, feed e auditoria (dados reais, tabela collection_events) ===== */
const COLLECT_COLORS=['#2563eb','#059669','#ea580c','#7c3aed','#dc2626','#d97706'];
const COLLECT_EVENT_SELECT_BASE='id,survey_id,researcher_id,quota_label,lat,lng,accuracy_m,occurred_at,synced,flags,status,reject_reason,rejected_at,is_calibration';
const COLLECT_EVENT_SELECT_DURATION=COLLECT_EVENT_SELECT_BASE+',duration_seconds';
const COLLECT_EVENT_SELECT=COLLECT_EVENT_SELECT_DURATION+',recording_reservation_id,recording_required,recording_consent,recording_status,recording_error,recording_created_at';
const COLLECT_EVENT_SELECT_RECORDING_NO_DURATION=COLLECT_EVENT_SELECT_BASE+',recording_reservation_id,recording_required,recording_consent,recording_status,recording_error,recording_created_at';
let COLLECT_RECORDING_COLUMNS_AVAILABLE=true;
let COLLECT_DURATION_COLUMN_AVAILABLE=true;
let COLLECTION_RECORDINGS={};
let AUDIT_AUDIO_URLS={};
const COLLECTION_RECORDING_STAFF_ROLES=['admin','coord','gerente','admpro'];
function collectionCanManageRecording(){return COLLECTION_RECORDING_STAFF_ROLES.includes(selectedRole);}
async function fetchCollectionEvents({surveyId=null,ownOnly=false}={}){
  const build=select=>{
    let query=sb.from('collection_events').select(select).order('occurred_at',{ascending:false});
    if(surveyId)query=query.eq('survey_id',surveyId);
    if(ownOnly&&CURRENT_PROFILE&&CURRENT_PROFILE.id)query=query.eq('researcher_id',CURRENT_PROFILE.id);
    return query;
  };
  const firstSelect=COLLECT_DURATION_COLUMN_AVAILABLE
    ?(COLLECT_RECORDING_COLUMNS_AVAILABLE?COLLECT_EVENT_SELECT:COLLECT_EVENT_SELECT_DURATION)
    :(COLLECT_RECORDING_COLUMNS_AVAILABLE?COLLECT_EVENT_SELECT_RECORDING_NO_DURATION:COLLECT_EVENT_SELECT_BASE);
  let result=await build(firstSelect);
  if(result.error&&COLLECT_DURATION_COLUMN_AVAILABLE&&/duration_seconds|column|schema cache/i.test(result.error.message||'')){
    COLLECT_DURATION_COLUMN_AVAILABLE=false;
    result=await build(COLLECT_RECORDING_COLUMNS_AVAILABLE?COLLECT_EVENT_SELECT_RECORDING_NO_DURATION:COLLECT_EVENT_SELECT_BASE);
  }
  if(result.error&&COLLECT_RECORDING_COLUMNS_AVAILABLE&&/recording_|column|schema cache/i.test(result.error.message||'')){
    COLLECT_RECORDING_COLUMNS_AVAILABLE=false;
    result=await build(COLLECT_DURATION_COLUMN_AVAILABLE?COLLECT_EVENT_SELECT_DURATION:COLLECT_EVENT_SELECT_BASE);
  }
  return result;
}
async function loadCollectionRecordingsForEvents(events){
  if(!collectionCanManageRecording())return;
  const ids=events.map(e=>e.id).filter(Boolean);
  if(!ids.length)return;
  try{
    const {data,error}=await sb.from('collection_recordings')
      .select('collection_event_id,storage_path,mime_type,duration_ms,created_at')
      .in('collection_event_id',ids);
    if(error)return;
    (data||[]).forEach(r=>{COLLECTION_RECORDINGS[r.collection_event_id]=r;});
  }catch(ex){/* migration ainda não aplicada ou tabela indisponível */}
}
let COLLECT_EVENTS=[];
let COLLECT_EVENTS_LOADED=false,COLLECT_EVENTS_LOADING=false;
let COLLECT_LIVE_TIMER=null;
let _collectMap=null,_collectMarkerLayer=null;

/* traduz uma linha de collection_events (banco) para o formato usado nas
   telas (mesmo "shape" de antes, quando os dados eram simulados) */
function collectionEventRowToEntry(row){
  const u=USERS.find(x=>x.id===row.researcher_id);
  return{
    id:row.id,
    surveyId:row.survey_id,
    researcherId:row.researcher_id,
    name:u?u.name:'(pesquisador removido)',
    phone:u?u.phone||'':'',
    cota:row.quota_label||'',
    lat:Number(row.lat),lng:Number(row.lng),acc:Number(row.accuracy_m)||0,
    ts:row.occurred_at?new Date(row.occurred_at).getTime():Date.now(),
    synced:row.synced!==false,
    flags:row.flags||[],
    status:row.status||'valid',
    rejectReason:row.reject_reason||null,
    rejectedAt:row.rejected_at?new Date(row.rejected_at).getTime():null,
    calibration:!!row.is_calibration,
    recordingRequired:!!row.recording_required,
    recordingConsent:row.recording_consent===true?true:row.recording_consent===false?false:null,
    recordingStatus:row.recording_status||'not_selected',
    recordingError:row.recording_error||'',
    recordingCreatedAt:row.recording_created_at?new Date(row.recording_created_at).getTime():null,
    durationSeconds:Number.isFinite(Number(row.duration_seconds))?Math.max(0,Number(row.duration_seconds)):null,
    recordingPath:['admin','coord','gerente','admpro'].includes(selectedRole)?(row.recording_path||null):null,
  };
}
/* carrega as coletas — o próprio RLS decide o que cada papel enxerga: staff
   (admin/coord/gerente) vê as coletas de todo mundo, pesquisador só vê as
   próprias (por isso essa mesma função serve tanto para o mapa/auditoria do
   admin quanto para o histórico do pesquisador em "Coletar (app)"/"Meus
   ganhos"). */
async function loadCollectEventsIfNeeded(){
  if(COLLECT_EVENTS_LOADED||COLLECT_EVENTS_LOADING)return;
  COLLECT_EVENTS_LOADING=true;
  await loadUsersIfNeeded();
  try{
    const {data,error}=await fetchCollectionEvents({ownOnly:selectedRole==='pesq'});
    if(!error){COLLECT_EVENTS=(data||[]).map(collectionEventRowToEntry);COLLECT_EVENTS_LOADED=true;await loadCollectionRecordingsForEvents(COLLECT_EVENTS);}
    else console.error('Erro ao carregar coletas:',error);
  }catch(ex){console.error('Erro de conexão ao carregar coletas:',ex);}
  COLLECT_EVENTS_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='collect'||k==='app-collect'||k==='my-earnings'||k==='dashboard'||k==='dashboard-pesq')go(k);
}
function eventsForSurveyIdx(idx){
  const s=SURVEYS[idx];if(!s)return[];
  return COLLECT_EVENTS.filter(e=>e.surveyId===s.id);
}
/* re-busca as coletas desta pesquisa direto do banco e atualiza só os
   painéis (feed/mapa/auditoria) sem recarregar a tela inteira — usado tanto
   pelo "ao vivo" da tela do admin/coord quanto depois de o pesquisador
   enviar uma coleta nova pelo app */
async function pollCollectEvents(idx){
  const survey=SURVEYS[idx];
  if(!survey||!survey.id)return;
  try{
    const {data,error}=await fetchCollectionEvents({surveyId:survey.id});
    if(error)return;
    const fresh=(data||[]).map(collectionEventRowToEntry);
    await loadCollectionRecordingsForEvents(fresh);
    /* Mantém no cache as outras pesquisas e substitui somente a pesquisa aberta. */
    COLLECT_EVENTS=COLLECT_EVENTS.filter(e=>e.surveyId!==survey.id).concat(fresh)
      .sort((a,b)=>b.ts-a.ts);
    COLLECT_EVENTS_LOADED=true;
  }catch(ex){return;}
  if(COLLECT_IDX!==idx)return; // usuário já saiu dessa pesquisa enquanto a busca rodava
  renderLiveFeed(idx);
  const mapaTab=document.getElementById('collectTabMapa');
  if(mapaTab&&mapaTab.style.display!=='none')renderCollectMap(idx);
  const audTab=document.getElementById('collectTabAuditoria');
  if(audTab&&audTab.style.display!=='none')renderAudit(idx);
}
function initCollectLive(idx){
  stopCollectLive();
  const s=SURVEYS[idx];if(!s)return;
  (async()=>{
    if(!COLLECT_EVENTS_LOADED)await loadCollectEventsIfNeeded();
    await loadUsersIfNeeded();
    if(COLLECT_IDX!==idx)return;
    loadCollectionOrientationCounts(idx);
    renderLiveFeed(idx);
    renderAudit(idx);
    if(document.getElementById('collectTabMapa')&&document.getElementById('collectTabMapa').style.display!=='none'){
      renderCollectMap(idx);
    }
  })();
  /* "ao vivo" de verdade: busca de novo a cada 20s enquanto esta pesquisa
     estiver aberta (sem inventar coleta nenhuma — só reflete o que os
     pesquisadores realmente enviaram pelo app deles) */
  COLLECT_LIVE_TIMER=setInterval(()=>pollCollectEvents(idx),20000);
}
function stopCollectLive(){
  if(COLLECT_LIVE_TIMER){clearInterval(COLLECT_LIVE_TIMER);COLLECT_LIVE_TIMER=null;}
}

const COLLECT_MAP_MAX_POINTS=120; /* cada coleta fica registrada no mapa (não só a mais recente); limite só por desempenho/legibilidade */
/* dois estilos de fundo: "rua" (mapa vetorial moderno, sem key) e "satélite" (imagem de satélite) */
const COLLECT_MAP_LAYERS={street:'roadmap',sat:'satellite'};
let _collectMapKind='street',_collectMapTileLayer=null;
let _collectMapMarkerLayer=[],_collectMapInfoWindow=null;
let _collectMapDidFit=false;
let _collectMapFilters={researcher:'all',status:'all',latest:false};
function collectMapReadFilters(){
  _collectMapFilters={
    researcher:document.getElementById('collectMapResearcher')?.value||'all',
    status:document.getElementById('collectMapStatus')?.value||'all',
    latest:!!document.getElementById('collectMapLatest')?.checked
  };
  return _collectMapFilters;
}
function collectMapFilterEvents(events){
  const f=_collectMapFilters;
  let out=events.filter(e=>f.researcher==='all'||e.name===f.researcher);
  if(f.status==='valid')out=out.filter(e=>e.status==='valid'&&!e.calibration);
  if(f.status==='rejected')out=out.filter(e=>e.status==='rejected');
  if(f.status==='calibration')out=out.filter(e=>e.calibration);
  if(f.status==='pending')out=out.filter(e=>!e.synced);
  if(f.latest){
    const latest=new Map();out.forEach(e=>{if(!latest.has(e.name)||e.ts>latest.get(e.name).ts)latest.set(e.name,e);});
    out=[...latest.values()].sort((a,b)=>b.ts-a.ts);
  }
  return out;
}
function collectMapApplyFilters(){
  collectMapReadFilters();
  _collectMapDidFit=false;
  renderCollectMap(COLLECT_IDX);
}
function collectMapFit(){
  _collectMapDidFit=false;
  renderCollectMap(COLLECT_IDX);
}
function collectMapRefresh(){
  if(COLLECT_IDX==null)return;
  pollCollectEvents(COLLECT_IDX);
}
function setCollectMapLayer(kind){if(!_collectMap||!window.google?.maps)return;_collectMapKind=kind==='sat'?'sat':'street';_collectMap.setMapTypeId(COLLECT_MAP_LAYERS[_collectMapKind]);}
function mapDisplayPoint(e,events){
  const key=x=>`${x.lat.toFixed(4)},${x.lng.toFixed(4)}`;
  const same=events.filter(x=>key(x)===key(e));
  if(same.length<2)return [e.lat,e.lng];
  const position=Math.max(0,same.findIndex(x=>x.id===e.id));
  const angle=(position/same.length)*Math.PI*2-Math.PI/2;
  const radius=18+Math.min(position,10)*7;
  const latOffset=(radius/111320)*Math.cos(angle);
  const lngOffset=(radius/(111320*Math.max(.25,Math.cos(e.lat*Math.PI/180))))*Math.sin(angle);
  return [e.lat+latOffset,e.lng+lngOffset];
}
function renderCollectMap(idx){
  const mapEl=document.getElementById('collectMap');if(!mapEl)return;const mapLoading=document.getElementById('collectMapLoading');
  if(!window.google?.maps?.Map){if(mapLoading){mapLoading.textContent='Preparando Google Maps…';mapLoading.style.display='flex';}loadGoogleMaps().then(()=>{if(document.getElementById('collectMap')===mapEl)renderCollectMap(idx);}).catch(error=>{if(mapLoading){mapLoading.textContent=googleMapErrorText(error);mapLoading.style.display='flex';}});return;}
  if(mapLoading)mapLoading.style.display='none';
  if(!_collectMap||_collectMap._ppElement!==mapEl){if(_collectMapMarkerLayer){_collectMapMarkerLayer.forEach(marker=>marker.setMap(null));}_collectMapMarkerLayer=[];_collectMapDidFit=false;_collectMap=new google.maps.Map(mapEl,{center:{lat:-18.5,lng:-44.9},zoom:6,mapTypeId:COLLECT_MAP_LAYERS[_collectMapKind],mapTypeControl:true,fullscreenControl:true,streetViewControl:false,gestureHandling:'greedy'});_collectMap._ppElement=mapEl;_collectMapInfoWindow=new google.maps.InfoWindow();}
  _collectMapMarkerLayer.forEach(marker=>marker.setMap(null));_collectMapMarkerLayer=[];const s=SURVEYS[idx];if(!s)return;const team=s.team||[];const colorFor=name=>COLLECT_COLORS[team.indexOf(name)%COLLECT_COLORS.length]||'#2563eb';const allEvents=eventsForSurveyIdx(idx).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));const filtered=collectMapFilterEvents(allEvents);const events=filtered.slice(0,COLLECT_MAP_MAX_POINTS);const shown=events.length,total=filtered.length,latestTsByName={},latestIdByName={};allEvents.forEach(e=>{if(!(e.name in latestTsByName)||e.ts>latestTsByName[e.name]){latestTsByName[e.name]=e.ts;latestIdByName[e.name]=e.id;}});
  events.forEach(e=>{const color=colorFor(e.name),isLatest=latestIdByName[e.name]===e.id,markerState=e.status==='rejected'?'is-rejected':e.calibration?'is-calibration':isLatest?'is-latest':'is-history',position=mapDisplayPoint(e,events),marker=new google.maps.Marker({map:_collectMap,position:{lat:position[0],lng:position[1]},icon:googleMarkerIcon(color,markerState==='is-latest'?10:8),title:`${e.name} · ${e.cota||'Sem cota'}`});marker.addListener('click',()=>goToAuditFromMap(e.id));marker.addListener('mouseover',()=>{_collectMapInfoWindow.setContent(buildMapPopup(e,isLatest));_collectMapInfoWindow.open({map:_collectMap,anchor:marker});});_collectMapMarkerLayer.push(marker);});
  const researchers=new Set(events.map(e=>e.name));const summary=document.getElementById('collectMapSummary');if(summary)summary.textContent=shown?`${shown} ponto${shown===1?'':'s'} visível${shown===1?'':'is'} · ${researchers.size} pesquisador${researchers.size===1?'':'es'}${shown<total?' · limite de visualização aplicado':''}`:'Nenhum ponto corresponde aos filtros atuais.';const note=document.getElementById('collectMapNote');if(note)note.textContent=shown<total?`Mostrando ${shown} de ${total} coletas após os filtros. Clique em um ponto para abrir a coleta na auditoria.`:'Clique em um ponto para abrir a coleta na auditoria.';const pts=events.map(e=>{const point=mapDisplayPoint(e,events);return {lat:point[0],lng:point[1]};});if(pts.length&&!_collectMapDidFit){try{const bounds=new google.maps.LatLngBounds();pts.forEach(point=>bounds.extend(point));if(pts.length===1){_collectMap.setCenter(pts[0]);_collectMap.setZoom(17);}else _collectMap.fitBounds(bounds,{top:70,right:70,bottom:70,left:70});_collectMapDidFit=true;}catch(e){}}
}
function buildMapTooltip(e,isLatest){
  const state=e.status==='rejected'?'Reprovada':e.calibration?'Calibração':isLatest?'Última coleta':'Coleta registrada';
  return `<b>${esc(e.name)}</b><br><span>${esc(e.cota||'Sem cota')} · ${state}</span><br><small>${new Date(e.ts).toLocaleString('pt-BR')}</small>`;
}
function buildMapPopup(e,isLatest){
  const statusExtra=e.status==='rejected'
    ?'<span class="pill pill-red">✕ Reprovada</span>'+(e.rejectReason?`<div class="map-popup-reason">Motivo: ${esc(e.rejectReason)}</div>`:'')
    :e.calibration?'<span class="pill pill-blue">◎ Calibração</span>':'';
  return `<div class="map-popup">
    <div class="map-popup-title">${esc(e.name)}${isLatest?'<span class="map-popup-latest">Última</span>':''}</div>
    <div class="map-popup-meta"><b>${esc(e.cota||'Sem cota')}</b><br>${new Date(e.ts).toLocaleString('pt-BR')}<br>Precisão do GPS: ±${Math.round(e.acc)}m</div>
    <div class="map-popup-status">${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente de sync</span>'}${statusExtra}</div>
    <div class="map-popup-actions">${conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')}<button class="btn-ghost map-popup-action" onclick="goToAuditFromMap('${e.id}')">🔎 Ver na auditoria</button></div>
  </div>`;
}
let AUDIT_HIGHLIGHT_ID=null;
function goToAuditFromMap(id){
  const e=COLLECT_EVENTS.find(x=>x.id===id);if(!e)return;
  AUDIT_HIGHLIGHT_ID=id;
  const auditBtn=document.querySelectorAll('#collectTabSeg button')[2];
  if(auditBtn)collectTab(auditBtn,'auditoria');
}

function renderLiveFeed(idx){
  const el=document.getElementById('liveFeed');if(!el)return;
  const events=eventsForSurveyIdx(idx).slice(0,8);
  el.innerHTML=events.map(e=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:12.5px">
      <div class="avatar" style="width:26px;height:26px;font-size:10.5px;flex-shrink:0">${esc(initialsOf(e.name))}</div>
      <div style="flex:1"><b>${esc(e.name)}</b> coletou <span style="color:var(--ink3)">${esc(e.cota)}</span></div>
      <span style="color:var(--ink3);white-space:nowrap">${geoAgo(e.ts)}</span>
      <span class="pill ${e.synced?'pill-green':'pill-amber'}" style="flex-shrink:0">${e.synced?'Sincronizado':'Pendente'}</span>
      ${conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')}
    </div>`).join('')||'<div class="empty" style="padding:14px 0">Nenhuma coleta ainda.</div>';
}

/* intervalo entre entrevistas consecutivas do mesmo pesquisador — ajuda a flagrar
   fraude (respostas "coletadas" rápido demais para terem sido aplicadas de verdade) */
const AUDIT_GAP_SUSPECT_MIN=3;   // abaixo disso: alerta forte (vermelho)
const AUDIT_GAP_WARN_MIN=8;      // abaixo disso: atenção (âmbar)
function fmtGap(ms){
  const m=Math.round(ms/60000);
  if(m<1)return '<1 min';
  if(m<60)return m+' min';
  const h=Math.floor(m/60),mm=m%60;
  return h+'h'+(mm?String(mm).padStart(2,'0')+'m':'');
}
/* distância entre o georreferenciamento de entrevistas consecutivas do mesmo pesquisador —
   ajuda a flagrar fraude (várias "entrevistas" registradas sem o pesquisador se deslocar) */
const AUDIT_DIST_SUSPECT_M=30;   // abaixo disso: alerta forte (vermelho) — praticamente o mesmo ponto
const AUDIT_DIST_WARN_M=100;     // abaixo disso: atenção (âmbar)
function distMeters(lat1,lng1,lat2,lng2){
  if(![lat1,lng1,lat2,lng2].every(Number.isFinite))return null;
  const R=6371000,toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m){
  return m<1000?Math.round(m)+'m':(m/1000).toFixed(1)+'km';
}
function fmtInterviewDuration(seconds){
  const value=Number(seconds);
  if(!Number.isFinite(value)||value<0)return'—';
  const total=Math.round(value),minutes=Math.floor(total/60),rest=total%60;
  return minutes?minutes+'min '+String(rest).padStart(2,'0')+'s':rest+'s';
}
async function loadAuditRecordingUrl(eventId){
  const rec=COLLECTION_RECORDINGS[eventId];
  if(!rec?.storage_path||AUDIT_AUDIO_URLS[eventId]?.status==='loading'||AUDIT_AUDIO_URLS[eventId]?.status==='ready')return;
  AUDIT_AUDIO_URLS[eventId]={status:'loading'};
  try{
    const {data,error}=await sb.storage.from('collection-recordings').createSignedUrl(rec.storage_path,600);
    if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária indisponível');
    AUDIT_AUDIO_URLS[eventId]={status:'ready',url:data.signedUrl};
  }catch(ex){AUDIT_AUDIO_URLS[eventId]={status:'error',error:ex.message||'Áudio indisponível'};}
  if(COLLECT_IDX!=null)renderAudit(COLLECT_IDX);
}
function collectionRecordingCell(e){
  if(!e.recordingRequired)return'<span class="pill pill-gray">Não solicitada</span>';
  const rec=COLLECTION_RECORDINGS[e.id];
  if(e.recordingStatus==='uploaded'&&rec?.storage_path){
    const duration=rec.duration_ms!=null?`<div class="audit-recording-duration">Duração: ${fmtInterviewDuration(Number(rec.duration_ms)/1000)}</div>`:'';
    const state=AUDIT_AUDIO_URLS[e.id];
    if(!state)loadAuditRecordingUrl(e.id);
    const player=state?.status==='ready'
      ?`<audio class="audit-recording-player" controls preload="none" src="${esc(state.url)}" aria-label="Ouvir confirmação gravada"></audio>`
      :state?.status==='error'
        ?`<div class="audit-recording-error">${esc(state.error||'Áudio indisponível')}</div>`
        :'<span class="audit-recording-loading">Preparando áudio…</span>';
    return'<span class="pill pill-green">✓ Com gravação</span>'+duration+player;
  }
  if(e.recordingStatus==='declined')return'<span class="pill pill-gray">✕ Recusada</span><div class="audit-recording-note">Sem autorização do entrevistado</div>';
  if(e.recordingStatus==='failed')return'<span class="pill pill-red">⚠ Falha técnica</span>'+(e.recordingError?`<div class="audit-recording-note">${esc(e.recordingError)}</div>`:'');
  if(e.recordingStatus==='pending_upload')return'<span class="pill pill-amber">⏳ Áudio pendente</span>';
  return'<span class="pill pill-amber">Selecionada · sem áudio</span>';
}
async function openCollectionRecording(eventId){
  if(!collectionCanManageRecording())return;
  const rec=COLLECTION_RECORDINGS[eventId];
  if(!rec?.storage_path){alert('Esta confirmação ainda não possui áudio disponível.');return;}
  try{
    const {data,error}=await sb.storage.from('collection-recordings').createSignedUrl(rec.storage_path,600);
    if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária indisponível');
    window.open(data.signedUrl,'_blank','noopener');
  }catch(ex){alert('Não foi possível abrir a confirmação gravada: '+ex.message);}
}
function renderAudit(idx){
  const el=document.getElementById('auditBody');if(!el)return;
  const all=eventsForSurveyIdx(idx);
  const selected=all.filter(e=>e.recordingRequired);
  const counts={uploaded:0,declined:0,failed:0,pending:0};
  selected.forEach(e=>{
    if(e.recordingStatus==='uploaded')counts.uploaded++;
    else if(e.recordingStatus==='declined')counts.declined++;
    else if(e.recordingStatus==='failed')counts.failed++;
    else counts.pending++;
  });
  const summary=document.getElementById('auditRecordingSummary');
  if(summary)summary.innerHTML=`<div class="recording-summary-title">Amostra de confirmação</div><div class="recording-summary-items"><span><b>${selected.length}</b> selecionada(s)</span><span class="summary-ok"><b>${counts.uploaded}</b> com áudio</span><span><b>${counts.declined}</b> recusada(s)</span><span class="summary-warn"><b>${counts.failed+counts.pending}</b> pendente(s)/falha(s)</span></div>`;
  const byResearcher={};
  all.forEach(e=>{
    const key=e.researcherId||e.name;
    (byResearcher[key]=byResearcher[key]||[]).push(e);
  });
  const previousById=new Map();
  Object.values(byResearcher).forEach(arr=>{
    arr.sort((a,b)=>a.ts-b.ts);
    arr.forEach((e,i)=>{if(i>0)previousById.set(e.id,arr[i-1]);});
  });
  const previousOf=e=>previousById.get(e.id)||null;
  const gapOf=e=>{const prev=previousOf(e);return prev?e.ts-prev.ts:null;};
  const distOf=e=>{const prev=previousOf(e);return prev?distMeters(e.lat,e.lng,prev.lat,prev.lng):null;};
  let events=all.slice(0,80);
  if(AUDIT_HIGHLIGHT_ID!=null&&!events.some(x=>x.id===AUDIT_HIGHLIGHT_ID)){
    const found=all.find(x=>x.id===AUDIT_HIGHLIGHT_ID);
    if(found)events=[found,...events.slice(0,79)];
  }
  el.innerHTML=events.map(e=>{
    const gapMs=gapOf(e);
    const gapMin=gapMs==null?null:gapMs/60000;
    const suspect=gapMin!=null&&gapMin<AUDIT_GAP_SUSPECT_MIN;
    const warn=gapMin!=null&&!suspect&&gapMin<AUDIT_GAP_WARN_MIN;
    const gapCell=gapMs==null
      ?'<span style="color:var(--ink3)">— 1ª do dia</span>'
      :`<span class="pill ${suspect?'pill-red':warn?'pill-amber':'pill-gray'}">${fmtGap(gapMs)}</span>`;
    const distM=distOf(e);
    const distSuspect=distM!=null&&distM<AUDIT_DIST_SUSPECT_M;
    const distWarn=distM!=null&&!distSuspect&&distM<AUDIT_DIST_WARN_M;
    const distNote=distM==null?'':`<div style="margin-top:3px"><span class="pill ${distSuspect?'pill-red':distWarn?'pill-amber':'pill-gray'}" style="font-size:10.5px">≈${fmtDist(distM)} da anterior</span></div>`;
    const flags=(e.flags||[]).map(String).slice();
    if(suspect)flags.push('Intervalo muito curto p/ outra entrevista');
    if(distSuspect)flags.push('Georreferenciamento muito próximo da coleta anterior');
    const rejected=e.status==='rejected';
    const statusCell=`${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente</span>'}`+
      (rejected?`<div style="margin-top:5px"><span class="pill pill-red" title="${esc(e.rejectReason||'')}">✕ Reprovada</span><div style="font-size:10.5px;color:var(--ink3);margin-top:2px;max-width:170px">${esc(e.rejectReason||'')}</div></div>`:'')+
      (e.calibration?'<div style="margin-top:5px"><span class="pill pill-blue">◎ Calibração</span></div>':'');
    const recordingCell=collectionRecordingCell(e);
    const durationCell=`<span class="audit-duration-value">${e.durationSeconds!=null?fmtInterviewDuration(e.durationSeconds):'<span class="audit-duration-missing">Não registrado</span>'}</span>`;
    const actionsEvidence=`<div class="audit-actions-evidence"><div><span class="audit-evidence-label">Duração</span><b>${e.durationSeconds!=null?fmtInterviewDuration(e.durationSeconds):'Não registrado'}</b></div><div><span class="audit-evidence-label">Gravação</span>${collectionRecordingCell(e)}</div></div>`;
    const actionsCell=`<div class="audit-actions-stack">
      ${actionsEvidence}
      ${conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')}
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditReject('${e.id}')">${rejected?'↺ Reaprovar':'✕ Reprovar'}</button>
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditToggleCalibration('${e.id}')">${e.calibration?'↺ Nos resultados':'◎ Calibração'}</button>
    </div>`;
    return `<tr data-eid="${e.id}"${rejected?' style="background:var(--red-l)"':''}>
      <td>${esc(e.name)}</td>
      <td>${esc(e.cota)}</td>
      <td>${Number.isFinite(e.ts)?new Date(e.ts).toLocaleString('pt-BR'):'—'}</td>
      <td>${gapCell}</td>
      <td>${Number.isFinite(e.lat)&&Number.isFinite(e.lng)?e.lat.toFixed(5)+', '+e.lng.toFixed(5):'—'}${distNote}</td>
      <td>${e.acc>0?'±'+Math.round(e.acc)+'m':'—'}</td>
      <td>${statusCell}</td>
      <td>${durationCell}</td>
      <td>${recordingCell}</td>
      <td>${flags.length?flags.map(f=>'<span class="pill pill-red" style="margin-right:4px;white-space:nowrap">'+esc(f)+'</span>').join(''):'<span style="color:var(--ink3)">—</span>'}</td>
      <td class="audit-actions-cell">${actionsCell}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="11" class="empty">Nenhuma coleta registrada ainda.</td></tr>';
  if(AUDIT_HIGHLIGHT_ID!=null){
    const row=el.querySelector(`tr[data-eid="${AUDIT_HIGHLIGHT_ID}"]`);
    if(row){
      row.scrollIntoView({behavior:'smooth',block:'center'});
      row.classList.add('audit-highlight');
      setTimeout(()=>row.classList.remove('audit-highlight'),2600);
    }
    AUDIT_HIGHLIGHT_ID=null;
  }
  renderAuditFlagged(idx);
}
/* painel de atalho: lista só as coletas reprovadas/calibração desta pesquisa, com botão de desfazer —
   evita ter que procurar a linha na tabela grande para desfazer uma ação */
function renderAuditFlagged(idx){
  const wrap=document.getElementById('auditFlaggedWrap');
  const el=document.getElementById('auditFlagged');
  if(!wrap||!el)return;
  const flagged=eventsForSurveyIdx(idx).filter(e=>e.status==='rejected'||e.calibration)
    .sort((a,b)=>(b.rejectedAt||b.ts)-(a.rejectedAt||a.ts));
  if(!flagged.length){wrap.style.display='none';el.innerHTML='';return;}
  wrap.style.display='block';
  el.innerHTML=flagged.map(e=>{
    const badges=(e.status==='rejected'?'<span class="pill pill-red" style="margin-right:4px">✕ Reprovada</span>':'')+
      (e.calibration?'<span class="pill pill-blue">◎ Calibração</span>':'');
    const reasonTxt=e.status==='rejected'?`<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">Motivo: ${esc(e.rejectReason||'—')}</div>`:'';
    const btns=conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')+
      (e.status==='rejected'?`<button class="btn-ghost" style="font-size:11.5px;padding:4px 9px" onclick="auditReject('${e.id}')">↺ Desfazer reprovação</button>`:'')+
      (e.calibration?`<button class="btn-ghost" style="font-size:11.5px;padding:4px 9px" onclick="auditToggleCalibration('${e.id}')">↺ Remover calibração</button>`:'');
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);flex-wrap:wrap">
      <div>
        <b style="font-size:13px">${esc(e.name)}</b> <span style="color:var(--ink3);font-size:12px">· ${esc(e.cota)} · ${new Date(e.ts).toLocaleString('pt-BR')}</span>
        <div style="margin-top:3px">${badges}</div>
        ${reasonTxt}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">${btns}</div>
    </div>`;
  }).join('');
}
/* ---- ações de auditoria: reprovar coleta (não conta p/ pagamento) e marcar
   como calibração (fora do cálculo de resultados, mas conta p/ pagamento) ----
   Depois de reprovar/reaprovar, o próprio banco recalcula o financeiro
   sozinho (gatilho em collection_events → payments — veja schema.sql), então
   aqui só é preciso gravar a coleta e invalidar o cache local do Financeiro
   para a próxima vez que essa tela for aberta. */
async function auditReject(id){
  const e=COLLECT_EVENTS.find(x=>x.id===id);if(!e)return;
  const idx=SURVEYS.findIndex(s=>s.id===e.surveyId);
  if(e.status==='rejected'){
    try{
      const {error}=await sb.from('collection_events').update({status:'valid',reject_reason:null,rejected_at:null}).eq('id',id);
      if(error)throw new Error(error.message);
    }catch(ex){alert('Não foi possível desfazer a reprovação: '+ex.message);return;}
    e.status='valid';e.rejectReason=null;e.rejectedAt=null;
  }else{
    const motivo=prompt('Motivo da reprovação desta coleta (o pesquisador vai ver este motivo no perfil dele):','');
    if(motivo==null)return;
    const trimmed=motivo.trim();
    if(!trimmed){alert('Informe o motivo da reprovação.');return;}
    const rejectedAtIso=new Date().toISOString();
    try{
      const {error}=await sb.from('collection_events').update({status:'rejected',reject_reason:trimmed,rejected_at:rejectedAtIso}).eq('id',id);
      if(error)throw new Error(error.message);
    }catch(ex){alert('Não foi possível reprovar: '+ex.message);return;}
    e.status='rejected';e.rejectReason=trimmed;e.rejectedAt=new Date(rejectedAtIso).getTime();
  }
  PAYMENTS_LOADED=false; // financeiro recalculado no banco — recarrega na próxima visita
  renderAudit(idx);
}
async function auditToggleCalibration(id){
  const e=COLLECT_EVENTS.find(x=>x.id===id);if(!e)return;
  const next=!e.calibration;
  try{
    const {error}=await sb.from('collection_events').update({is_calibration:next}).eq('id',id);
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível atualizar: '+ex.message);return;}
  e.calibration=next;
  renderAudit(SURVEYS.findIndex(s=>s.id===e.surveyId));
}

/* ============ APP COLLECT (mobile) ============
   Esta é a tela que o pesquisador usa de verdade, no celular dele, em
   campo — por isso é um cartão normal, em largura cheia, sem a moldura
   decorativa de "celular dentro da tela" que existia antes (fazia sentido
   só como mockup visto num computador; no celular de verdade virava um
   celular-dentro-de-celular minúsculo e ilegível).

   Antes de mostrar essa tela, exige-se que o pesquisador já tenha assinado
   eletronicamente o contrato-quadro (ver bloco "CONTRATO-QUADRO DO
   PESQUISADOR" logo abaixo) — sem isso, mostra uma tela de bloqueio com
   link para "Meu contrato" em vez do formulário de coleta. */
PAGES['app-collect']=()=>{
  if(!CURRENT_PROFILE)return head('Coletar (app)','Georreferenciamento obrigatório · envio direto ao servidor')+'<div class="empty">Faça login para coletar.</div>';
  if(!CONTRACT_SETTINGS_LOADED){loadContractSettingsIfNeeded();return head('Coletar (app)','Georreferenciamento obrigatório · envio direto ao servidor')+'<div class="empty">Verificando a versão do contrato…</div>'; }
  if(!MY_CONTRACT_LOADED){
    loadMyContractIfNeeded();
    return head('Coletar (app)','Georreferenciamento obrigatório · envio direto ao servidor')+'<div class="empty">Verificando seu contrato…</div>';
  }
  if(!MY_CONTRACT){
    return head('Coletar (app)','Georreferenciamento obrigatório · envio direto ao servidor')+`
    <div class="card" style="text-align:center;padding:48px 24px">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--amber-l);color:var(--amber);font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">✎</div>
      <div style="font-weight:800;font-size:18px">Assine seu contrato para começar a coletar</div>
      <p style="color:var(--ink3);font-size:13.5px;margin-top:8px;max-width:420px;margin-left:auto;margin-right:auto;line-height:1.6">Antes de iniciar qualquer coleta, você precisa ler e assinar eletronicamente o contrato de prestação de serviços. É rápido, é assinado uma única vez e vale para todas as suas pesquisas.</p>
      <button class="btn btn-accent" style="margin-top:20px" onclick="go('my-contract')">Ler e assinar contrato →</button>
    </div>`;
  }
  return head('Coletar (app)','Georreferenciamento obrigatório · envio direto ao servidor')+`
  <div class="collect-app-grid">
    <div class="card collect-app-main">
      <div id="acollectSurveyLabelWrap" class="card-t" style="margin-bottom:10px">Pesquisa: <span id="acollectSurveyLabel">—</span></div>
      <div id="geoStatus" class="offline-banner">🛰️ Verificando localização…</div>
      <div id="acollectSurveyPicker"></div>
      <div id="acollectQuotas"><div class="empty" style="padding:10px 0">Carregando cotas…</div></div>
      <div id="acollectForm"></div>
      <div id="acollectRecording"></div>
      <div id="acollectMsg"></div>
      <div id="geoHint" class="collect-step-hint is-blocked" role="status" aria-live="polite"><strong>1º selecione uma cota</strong><span>Toque em uma cota disponível acima para liberar o início.</span></div>
      <button id="startCollectBtn" class="btn-primary" style="height:44px;margin-top:10px;font-size:14px" disabled onclick="acollectStart()">▶ Iniciar coleta</button>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">📍 Georreferenciamento obrigatório</div>
        <div class="card-d">O app pede permissão de localização assim que abre. Sem o GPS ativo, o botão "Iniciar coleta" fica bloqueado.</div>
        <ul class="checklist" style="margin-top:2px">
          <li><span class="ck">✓</span>Localização é exigida antes de iniciar qualquer entrevista, para qualquer cota</li>
          <li><span class="ck">✓</span>Coordenadas, horário, cota e as respostas de verdade ficam gravadas no banco assim que a coleta é enviada — é isso que alimenta Relatórios e Resultados</li>
          <li><span class="ck">✓</span>O pesquisador só enxerga e escolhe as cotas desta pesquisa que ainda faltam</li>
          <li><span class="ck">✓</span>Entrevista muito rápida (menos de 1 min entre iniciar e enviar) é sinalizada para a auditoria</li>
          <li><span class="ck">✓</span>Em aproximadamente 20% das entrevistas, o app pode solicitar uma confirmação final curta em áudio, sempre com autorização do entrevistado</li>
        </ul>
        <div style="font-size:11px;color:var(--ink3);margin-top:8px">Ainda não implementado: funcionamento 100% offline com fila de sincronização — por enquanto é preciso ter internet no momento de enviar a coleta (o GPS em si funciona sem internet).</div>
      </div>
      <div class="card mb">
        <div class="card-t" style="font-size:13px">Últimas coletas registradas</div>
        <div class="card-d">Suas entrevistas enviadas, com o status de cada uma</div>
        <div id="geoLog"></div>
      </div>
      <div class="callout">Versão web da coleta. O empacotamento como aplicativo instalável (Android/iOS, via Capacitor) é uma etapa futura do roteiro.</div>
    </div>
  </div>`;
};

/* ===== Georreferenciamento obrigatório na coleta ===== */
let GEO={status:'idle',lat:null,lng:null,acc:null,ts:null,watchId:null};
const GEO_STATUS_UI={
  idle:{cls:'offline-banner',html:'🛰️ Verificando localização…',hint:'Ative a localização para liberar a coleta'},
  requesting:{cls:'offline-banner',html:'🛰️ Obtendo localização — mantenha o GPS ligado…',hint:'Ative a localização para liberar a coleta'},
  granted:()=>({cls:'online-banner',html:'📍 Localização ativa · precisão ±'+Math.round(GEO.acc||0)+'m · atualizado '+geoAgo(GEO.ts),hint:'Localização ativa — pode coletar'}),
  denied:{cls:'offline-banner',html:'⛔ Permissão de localização negada — ative-a nas configurações do navegador. <button class="btn-ghost" style="padding:3px 9px;font-size:10.5px;margin-left:4px" onclick="requestGeo()">Tentar de novo</button>',hint:'Coleta bloqueada até a localização ser permitida'},
  unavailable:{cls:'offline-banner',html:'⚠ Não foi possível obter a localização — verifique se o GPS está ligado. <button class="btn-ghost" style="padding:3px 9px;font-size:10.5px;margin-left:4px" onclick="requestGeo()">Tentar de novo</button>',hint:'Coleta bloqueada até a localização ser encontrada'},
  unsupported:{cls:'offline-banner',html:'⚠ Este navegador não permite geolocalização — a coleta não pode ser iniciada aqui.',hint:'Abra pelo navegador do celular para coletar'},
};
function geoStatusUi(){const u=GEO_STATUS_UI[GEO.status]||GEO_STATUS_UI.idle;return typeof u==='function'?u():u;}

/* cotas reais desta pesquisa: uma "cota" é cada opção com % de cota
   definido numa pergunta que não está com as cotas desligadas — o alvo é
   esse % aplicado sobre o tamanho de amostra calculado da pesquisa (mesmo
   número mostrado em "Amostra" e usado no financeiro/relatórios) */
function surveyQuotas(s){
  const sample=surveySample(s);
  const out=[];
  (s.questions||[]).forEach(q=>{
    if(!Q_HAS_QUOTA_OPTS(q.type))return;
    if(s.quotaOff&&s.quotaOff[q.id])return;
    const qQuotas=(s.quotas&&s.quotas[q.id])||{};
    Object.keys(qQuotas).forEach(oiStr=>{
      const pct=qQuotas[oiStr];
      if(pct==null)return;
      const oi=+oiStr;
      const label=(q.opts&&q.opts[oi])||('Opção '+(oi+1));
      out.push({label,pct,target:Math.max(1,Math.round(sample*pct/100)),questionDbId:q.dbId,questionType:q.type});
    });
  });
  return out;
}

let ACOLLECT_SURVEY_ID=null,ACOLLECT_QUOTA_COUNTS={},ACOLLECT_QUOTA_LIST=[];
let ACOLLECT_SELECTED_QUOTA=null,ACOLLECT_IN_PROGRESS=false,ACOLLECT_SUBMITTING=false,ACOLLECT_STARTED_AT=null;
let ACOLLECT_TICK=null;
let ACOLLECT_ANSWERS={}; /* {questionDbId: {value, locked}} — respostas de verdade da entrevista em andamento */
let ACOLLECT_RANKING_DRAG=null;
let ACOLLECT_RECORDING_FEATURE_AVAILABLE=null;
let ACOLLECT_RECORDING_RESERVATION_ID=null,ACOLLECT_RECORDING_REQUIRED=false,ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF=false,ACOLLECT_RECORDING_CONSENT=null;
let ACOLLECT_RECORDING_STATUS='not_selected',ACOLLECT_RECORDING_BLOB=null,ACOLLECT_RECORDING_MIME='',ACOLLECT_RECORDING_DURATION_MS=null,ACOLLECT_RECORDING_STREAM=null,ACOLLECT_RECORDING_RECORDER=null,ACOLLECT_RECORDING_CHUNKS=[],ACOLLECT_RECORDING_PREVIEW_URL=null,ACOLLECT_RECORDING_STOP_TIMER=null,ACOLLECT_RECORDING_STARTED_AT=null,ACOLLECT_RECORDING_ERROR='';
const ACOLLECT_RECORDING_MAX_SECONDS=12;
const ACOLLECT_RECORDING_CUTOFF_HOUR=21;
const ACOLLECT_MIN_SECONDS=60; /* entrevista concluída mais rápido que isso é sinalizada na auditoria */
const ACOLLECT_SCALE_MAX={scale:5,scale10:10,nps:10}; /* nps vai de 0 a 10 (11 pontos) */
function acollectIsAfterRecordingCutoff(date=new Date()){
  try{return Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'America/Sao_Paulo'}).format(date))>=ACOLLECT_RECORDING_CUTOFF_HOUR;}
  catch(ex){return date.getHours()>=ACOLLECT_RECORDING_CUTOFF_HOUR;}
}

async function initGeoCollect(){
  requestGeo();
  if(!SURVEYS_LOADED)await loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)await loadCollectEventsIfNeeded();
  renderAcollectSurveyPicker();
  await acollectLoadQuotasForCurrent();
  renderGeoLog();
  startAcollectQuotaLive();
}
/* mantém as cotas atualizadas sozinhas enquanto o pesquisador está na tela
   "Coletar (app)" — sem isso, se outro pesquisador (ou ele mesmo, noutro
   aparelho) preenchesse uma cota enquanto esta tela ficasse parada aberta,
   os números ficariam desatualizados e ele poderia achar que ainda dava
   para escolher uma cota que já bateu a meta. */
let ACOLLECT_QUOTA_TIMER=null;
function startAcollectQuotaLive(){
  stopAcollectQuotaLive();
  ACOLLECT_QUOTA_TIMER=setInterval(async()=>{
    if(!ACOLLECT_SURVEY_ID)return;
    const onKey=document.querySelector('.nav-item.on');
    if(!onKey||onKey.dataset.key!=='app-collect')return; // já saiu da tela — para de bater no banco à toa
    ACOLLECT_QUOTA_COUNTS=await loadQuotaCounts(ACOLLECT_SURVEY_ID);
    renderAcollectQuotas();
  },20000);
}
function stopAcollectQuotaLive(){
  if(ACOLLECT_QUOTA_TIMER){clearInterval(ACOLLECT_QUOTA_TIMER);ACOLLECT_QUOTA_TIMER=null;}
}

/* pesquisas em campo onde este pesquisador está mesmo na equipe — o filtro
   por nome é o que garante isso no ambiente de teste offline (que não
   aplica RLS de verdade); em produção o RLS já restringe isso sozinho */
function acollectMySurveys(){
  if(!CURRENT_PROFILE)return[];
  return SURVEYS.filter(s=>s.status==='campo'&&(s.team||[]).includes(CURRENT_PROFILE.name));
}
function renderAcollectSurveyPicker(){
  const wrap=document.getElementById('acollectSurveyPicker');
  const lbl=document.getElementById('acollectSurveyLabel');
  if(!wrap)return;
  const mine=acollectMySurveys();
  if(!mine.length){
    wrap.innerHTML='<div class="empty" style="padding:10px 0">Você não está atribuído a nenhuma pesquisa em campo no momento.</div>';
    ACOLLECT_SURVEY_ID=null;
    const quotasEl=document.getElementById('acollectQuotas');if(quotasEl)quotasEl.innerHTML='';
    if(lbl)lbl.textContent='—';
    renderAcollectActionState();
    return;
  }
  if(ACOLLECT_SURVEY_ID==null||!mine.some(s=>s.id===ACOLLECT_SURVEY_ID))ACOLLECT_SURVEY_ID=mine[0].id;
  const current=mine.find(s=>s.id===ACOLLECT_SURVEY_ID);
  if(lbl)lbl.textContent=(current?current.name:'Pesquisa')+' ▾';
  wrap.innerHTML=mine.length<2?'':`<div class="mb"><label class="lbl">Pesquisa</label>
    <select class="inp" id="acollectSurveySel" onchange="acollectPickSurvey(this.value)">
      ${mine.map(s=>`<option value="${s.id}" ${s.id===ACOLLECT_SURVEY_ID?'selected':''}>${esc(s.name)}</option>`).join('')}
    </select></div>`;
}
async function acollectPickSurvey(id){
  if(ACOLLECT_IN_PROGRESS){alert('Termine ou cancele a entrevista em andamento antes de trocar de pesquisa.');renderAcollectSurveyPicker();return;}
  ACOLLECT_SURVEY_ID=id;
  ACOLLECT_SELECTED_QUOTA=null;
  acollectClearTerminationNotice();
  acollectResetRecordingState();
  renderAcollectSurveyPicker();
  await acollectLoadQuotasForCurrent();
}
async function loadQuotaCounts(surveyId){
  try{
    const {data,error}=await sb.rpc('survey_quota_counts',{p_survey_id:surveyId});
    if(error){console.error('Erro ao carregar progresso das cotas:',error);return{};}
    const map={};
    (data||[]).forEach(r=>{map[r.quota_label]=r.valid_count||0;});
    return map;
  }catch(ex){console.error('Erro de conexão ao carregar progresso das cotas:',ex);return{};}
}
async function acollectLoadQuotasForCurrent(){
  const el=document.getElementById('acollectQuotas');
  if(!el)return;
  if(!ACOLLECT_SURVEY_ID){el.innerHTML='';renderAcollectActionState();return;}
  el.innerHTML='<div class="empty" style="padding:10px 0">Carregando cotas…</div>';
  ACOLLECT_QUOTA_COUNTS=await loadQuotaCounts(ACOLLECT_SURVEY_ID);
  renderAcollectQuotas();
}
function renderAcollectQuotas(){
  const el=document.getElementById('acollectQuotas');
  if(!el)return;
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  if(!s){el.innerHTML='';ACOLLECT_QUOTA_LIST=[];renderAcollectActionState();return;}
  ACOLLECT_QUOTA_LIST=surveyQuotas(s);
  if(!ACOLLECT_QUOTA_LIST.length){
    // diagnóstico: existe pergunta marcada como cota ativa, com opções, mas
    // sem nenhum percentual salvo? isso é diferente de "não tem cota
    // nenhuma" — avisa explicitamente em vez de mostrar a mensagem genérica,
    // pra deixar claro que é preciso reabrir e salvar a pesquisa de novo.
    const temPerguntaSemPct=(s.questions||[]).some(q=>
      q.opts&&q.opts.length&&(!s.quotaOff||!s.quotaOff[q.id])&&!(s.quotas&&s.quotas[q.id]&&Object.keys(s.quotas[q.id]).length));
    el.innerHTML=temPerguntaSemPct
      ?'<div class="card-d" style="margin:6px 0 10px;color:var(--red,#dc2626)">Esta pesquisa tem uma pergunta marcada como cota ativa, mas sem percentual salvo no banco — reabra "Editar pesquisa" para esta pesquisa e clique em "Salvar alterações" de novo (não precisa mudar nada) para corrigir.</div>'
      :'<div class="card-d" style="margin:6px 0 10px">Esta pesquisa não tem cotas configuradas — pode coletar livremente.</div>';
    if(!ACOLLECT_IN_PROGRESS)ACOLLECT_SELECTED_QUOTA='';
    renderAcollectActionState();
    return;
  }
  el.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="font-weight:700;font-size:13px">Cotas de hoje</div>'+
    '<span class="pill pill-green" style="margin-left:auto"><span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;animation:fade 1.4s ease-in-out infinite alternate"></span> Ao vivo</span></div>'+
    '<div style="font-size:11px;color:var(--ink3);margin-bottom:10px">Toque numa cota disponível para escolher · cotas já preenchidas ficam bloqueadas automaticamente</div>'+
    ACOLLECT_QUOTA_LIST.map((q,qi)=>{
      const done=ACOLLECT_QUOTA_COUNTS[q.label]||0;
      const full=done>=q.target;
      const selected=ACOLLECT_SELECTED_QUOTA===q.label;
      const pct=Math.min(100,Math.round(done/q.target*100));
      const color=full?'var(--teal)':'var(--accent)';
      const clickable=!full&&!ACOLLECT_IN_PROGRESS;
      const cardAttrs=clickable
        ?`role="button" tabindex="0" aria-pressed="${selected?'true':'false'}" aria-label="Selecionar cota ${esc(q.label)}" onclick="acollectSelectQuotaIdx(${qi})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();acollectSelectQuotaIdx(${qi})}"`
        :`aria-disabled="true"`;
      return `<div class="q-card quota-choice ${selected?'is-selected':''} ${full?'is-full':''}" style="padding:10px;margin-bottom:8px;cursor:${clickable?'pointer':'default'};${selected?'border-color:var(--accent);background:var(--accent-l)':''}${full?';opacity:.65':''}" ${cardAttrs}>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;font-weight:600"><span>${esc(q.label)}</span><span style="color:${color};white-space:nowrap">${done}/${q.target}${full?' ✓':''}</span></div>
        <div class="bar" style="margin-top:6px"><span style="width:${pct}%;background:${color}"></span></div>
        ${selected?'<div class="quota-selected-hint">✓ Cota selecionada — toque em “Iniciar coleta”</div>':clickable?'<div class="quota-touch-hint">Toque para selecionar</div>':''}
      </div>`;
    }).join('');
  renderAcollectActionState();
}
function acollectSelectQuotaIdx(qi){
  if(ACOLLECT_IN_PROGRESS)return;
  const q=ACOLLECT_QUOTA_LIST[qi];if(!q)return;
  ACOLLECT_SELECTED_QUOTA=q.label;
  renderAcollectQuotas();
}

function acollectClearTerminationNotice(){
  const el=document.getElementById('acollectMsg');
  if(el)el.innerHTML='';
}
function acollectConditionLabels(qDbId,value,optionIndex){
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  const q=(s?.questions||[]).find(item=>item.dbId===qDbId);
  if(!q||!['single','multi'].includes(q.type))return[];
  if(optionIndex!=null)return q.endsInterview&&q.endsInterview[optionIndex]===true?[Array.isArray(value)?value[0]:value]:[];
  const values=Array.isArray(value)?value:[value];
  return values.filter(v=>v!==''&&v!=null).filter(v=>{
    const oi=(q.opts||[]).indexOf(v);
    return oi>=0&&q.endsInterview&&q.endsInterview[oi]===true;
  });
}
function acollectEndByCondition(qDbId,value,optionIndex){
  const labels=acollectConditionLabels(qDbId,value,optionIndex);
  if(!labels.length)return false;
  const labelText=labels.map(label=>'“'+label+'”').join(' e ');
  ACOLLECT_IN_PROGRESS=false;
  ACOLLECT_SUBMITTING=false;
  ACOLLECT_STARTED_AT=null;
  ACOLLECT_SELECTED_QUOTA=null;
  ACOLLECT_ANSWERS={};
  acollectResetRecordingState();
  if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
  const formEl=document.getElementById('acollectForm');
  if(formEl)formEl.innerHTML='';
  const msgEl=document.getElementById('acollectMsg');
  if(msgEl)msgEl.innerHTML=`<div class="collect-termination-card" role="alert" aria-live="assertive"><strong>Mensagem para o entrevistado</strong><span>“Não continue esta entrevista, esta resposta é uma condicionante necessária para o perfil de entrevistado”</span><small>Resposta selecionada: ${labelText}. A entrevista não foi enviada como coleta válida.</small></div>`;
  renderAcollectRecording();
  renderAcollectQuotas();
  renderAcollectActionState();
  alert('Não continue esta entrevista, esta resposta é uma condicionante necessária para o perfil de entrevistado');
  return true;
}

/* ---- questionário de verdade: uma vez iniciada a entrevista, o pesquisador
   responde as perguntas reais desta pesquisa (a pergunta correspondente à
   cota escolhida já vem pré-preenchida e travada, para não haver contradição
   entre a cota escolhida e a resposta) ---- */
function acollectSetAnswer(qDbId,value,rerenderForm,optionIndex){
  ACOLLECT_ANSWERS[qDbId]={...(ACOLLECT_ANSWERS[qDbId]||{}),value};
  /* botões de escala precisam de um novo render para mostrar qual ficou
     marcado; campos de texto/número/data NÃO são re-renderizados aqui para
     não perder o foco/cursor a cada tecla digitada — o próprio campo já
     mostra o que foi digitado sozinho */
  if(rerenderForm)renderAcollectForm();
  renderAcollectActionState();
  acollectEndByCondition(qDbId,value,optionIndex);
}
function acollectToggleMultiAnswer(qDbId,label,optionIndex){
  const cur=(ACOLLECT_ANSWERS[qDbId]&&Array.isArray(ACOLLECT_ANSWERS[qDbId].value))?ACOLLECT_ANSWERS[qDbId].value.slice():[];
  const i=cur.indexOf(label);
  if(i>=0)cur.splice(i,1);else cur.push(label);
  ACOLLECT_ANSWERS[qDbId]={value:cur};
  renderAcollectActionState();
  acollectEndByCondition(qDbId,label,optionIndex);
}
function acollectPairField(qDbId,fieldIndex){
  const current=ACOLLECT_ANSWERS[qDbId]||{};
  const fields=Array.isArray(current.value)&&current.value.length===2?current.value.slice():[[],[]];
  return {current,fields};
}
function acollectSetPairField(qDbId,fieldIndex,value){
  const {current,fields}=acollectPairField(qDbId,fieldIndex);
  fields[fieldIndex]=value;
  ACOLLECT_ANSWERS[qDbId]={...current,value:fields};
  renderAcollectActionState();
}
function acollectTogglePairMulti(qDbId,fieldIndex,label){
  const {current,fields}=acollectPairField(qDbId,fieldIndex);
  const values=Array.isArray(fields[fieldIndex])?fields[fieldIndex].slice():[];
  const index=values.indexOf(label);if(index>=0)values.splice(index,1);else values.push(label);
  fields[fieldIndex]=values;ACOLLECT_ANSWERS[qDbId]={...current,value:fields};
  renderAcollectActionState();
}
function acollectRankingOptions(q){return (q?.opts||[]).map(value=>String(value||'').trim()).filter(Boolean);}
function acollectRankingOrder(q,a){
  const options=acollectRankingOptions(q),saved=Array.isArray(a?.value)?a.value:[];
  return [...saved.filter(value=>options.includes(value)),...options.filter(value=>!saved.includes(value))];
}
function acollectRankingSetOrder(qDbId,order){
  const current=ACOLLECT_ANSWERS[qDbId]||{};
  ACOLLECT_ANSWERS[qDbId]={...current,value:order.slice()};
  renderAcollectForm();renderAcollectActionState();
}
function acollectRankingMove(qDbId,from,to){
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID),q=(s?.questions||[]).find(item=>item.dbId===qDbId);if(!q)return;
  const order=acollectRankingOrder(q,ACOLLECT_ANSWERS[qDbId]);if(from<0||to<0||from>=order.length||to>=order.length)return;
  [order[from],order[to]]=[order[to],order[from]];acollectRankingSetOrder(qDbId,order);
}
function acollectRankingDragStart(ev,qDbId,index){ACOLLECT_RANKING_DRAG={qDbId,index};if(ev?.dataTransfer){ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',String(index));}}
function acollectRankingDrop(ev,qDbId,to){if(ev?.preventDefault)ev.preventDefault();const d=ACOLLECT_RANKING_DRAG;if(!d||d.qDbId!==qDbId){ACOLLECT_RANKING_DRAG=null;return;}const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID),q=(s?.questions||[]).find(item=>item.dbId===qDbId);if(q){const order=acollectRankingOrder(q,ACOLLECT_ANSWERS[qDbId]);const [moved]=order.splice(d.index,1);order.splice(Math.max(0,Math.min(to,order.length)),0,moved);acollectRankingSetOrder(qDbId,order);}ACOLLECT_RANKING_DRAG=null;}
function acollectRankingDragEnd(){ACOLLECT_RANKING_DRAG=null;}
function acollectResetRecordingState(){
  if(ACOLLECT_RECORDING_STOP_TIMER){clearTimeout(ACOLLECT_RECORDING_STOP_TIMER);ACOLLECT_RECORDING_STOP_TIMER=null;}
  const recorder=ACOLLECT_RECORDING_RECORDER;
  ACOLLECT_RECORDING_STATUS='not_selected';
  if(recorder&&recorder.state!=='inactive')recorder.stop();
  if(ACOLLECT_RECORDING_STREAM){ACOLLECT_RECORDING_STREAM.getTracks().forEach(track=>track.stop());ACOLLECT_RECORDING_STREAM=null;}
  if(ACOLLECT_RECORDING_PREVIEW_URL){URL.revokeObjectURL(ACOLLECT_RECORDING_PREVIEW_URL);ACOLLECT_RECORDING_PREVIEW_URL=null;}
  ACOLLECT_RECORDING_FEATURE_AVAILABLE=null;
  ACOLLECT_RECORDING_RESERVATION_ID=null;
  ACOLLECT_RECORDING_REQUIRED=false;
  ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF=false;
  ACOLLECT_RECORDING_CONSENT=null;
  ACOLLECT_RECORDING_BLOB=null;
  ACOLLECT_RECORDING_MIME='';
  ACOLLECT_RECORDING_DURATION_MS=null;
  ACOLLECT_RECORDING_RECORDER=null;
  ACOLLECT_RECORDING_CHUNKS=[];
  ACOLLECT_RECORDING_STARTED_AT=null;
  ACOLLECT_RECORDING_ERROR='';
}
function acollectRecordingMime(){
  if(typeof MediaRecorder==='undefined')return'';
  return ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(x=>MediaRecorder.isTypeSupported?.(x))||'';
}
async function acollectReserveRecording(){
  ACOLLECT_RECORDING_FEATURE_AVAILABLE=false;
  ACOLLECT_RECORDING_REQUIRED=false;
  ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF=acollectIsAfterRecordingCutoff();
  ACOLLECT_RECORDING_STATUS='not_selected';
  if(!ACOLLECT_SURVEY_ID||!CURRENT_PROFILE?.id)return;
  try{
    const {data,error}=await sb.rpc('reserve_collection_recording',{p_survey_id:ACOLLECT_SURVEY_ID});
    if(error||!data?.[0])return;
    ACOLLECT_RECORDING_FEATURE_AVAILABLE=true;
    ACOLLECT_RECORDING_RESERVATION_ID=data[0].reservation_id;
    ACOLLECT_RECORDING_REQUIRED=data[0].recording_required===true||ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF;
    ACOLLECT_RECORDING_STATUS=ACOLLECT_RECORDING_REQUIRED?'awaiting_consent':'not_selected';
  }catch(ex){console.warn('Confirmação de áudio não disponível:',ex);}
  if(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF&&!ACOLLECT_RECORDING_FEATURE_AVAILABLE){
    ACOLLECT_RECORDING_REQUIRED=true;
    ACOLLECT_RECORDING_STATUS='failed';
    ACOLLECT_RECORDING_ERROR='A confirmação após 21h exige a migration de gravação atualizada no Supabase';
  }
}
function renderAcollectRecording(){
  const el=document.getElementById('acollectRecording');
  if(!el)return;
  if(!ACOLLECT_IN_PROGRESS||(!ACOLLECT_RECORDING_FEATURE_AVAILABLE&&!ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF)||!ACOLLECT_RECORDING_REQUIRED){el.innerHTML='';return;}
  if(ACOLLECT_RECORDING_STATUS==='awaiting_consent'){
    el.innerHTML=`<div class="recording-consent-card">
      <div class="recording-consent-title">${ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Confirmação final obrigatória após 21h':'Confirmação final de qualidade'}</div>
      <p>Esta entrevista foi selecionada para uma confirmação curta em áudio. Explique ao entrevistado que a gravação não registra o questionário inteiro, será usada somente para verificar se a pesquisa foi realizada corretamente e ficará disponível apenas para a gestão.</p>
      <p class="recording-prompt">Pergunte: “Você confirma que esta pesquisa foi realizada corretamente e que respondeu às perguntas de forma voluntária?”</p>
      <label class="recording-check"><input type="checkbox" id="acollectRecordingConsent" onchange="acollectRecordingConsentChanged(this.checked)"> O entrevistado autorizou a gravação desta confirmação final.</label>
      <div class="recording-consent-actions"><button type="button" class="btn-ghost" onclick="${ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'acollectCancel()':'acollectRecordingDecline()'}">${ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Cancelar entrevista':'Recusar / enviar sem áudio'}</button><button type="button" class="btn-primary" id="acollectRecordingStartBtn" disabled onclick="acollectRecordingStart()">● Gravar confirmação</button></div>
    </div>`;
    return;
  }
  if(ACOLLECT_RECORDING_STATUS==='recording'){
    el.innerHTML=`<div class="recording-consent-card recording-active"><div class="recording-consent-title">Gravando confirmação final</div><p>Grave apenas a resposta curta do entrevistado. O áudio será interrompido automaticamente em ${ACOLLECT_RECORDING_MAX_SECONDS} segundos.</p><div class="recording-timer" id="acollectRecordingTimer">00:00</div><button type="button" class="btn-danger" onclick="acollectRecordingStop()">■ Parar gravação</button></div>`;
    return;
  }
  if(ACOLLECT_RECORDING_STATUS==='ready'){
    const preview=ACOLLECT_RECORDING_PREVIEW_URL?`<audio controls preload="metadata" src="${ACOLLECT_RECORDING_PREVIEW_URL}"></audio>`:'';
    el.innerHTML=`<div class="recording-consent-card recording-ready"><div class="recording-consent-title">Confirmação pronta</div><p>Revise o trecho abaixo. Se estiver inaudível, grave novamente. O áudio será enviado junto com a entrevista.</p>${preview}<div class="recording-consent-actions"><button type="button" class="btn-ghost" onclick="acollectRecordingRetake()">Gravar novamente</button><span class="pill pill-green">✓ Será anexado ao enviar</span></div></div>`;
    return;
  }
  if(ACOLLECT_RECORDING_STATUS==='declined'){
    el.innerHTML=ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF
      ?'<div class="recording-note recording-note-error"><b>Confirmação obrigatória após 21h.</b> A entrevista não pode ser enviada sem a autorização e a gravação da confirmação final.</div>'
      :'<div class="recording-note"><b>Entrevista sem áudio.</b> O entrevistado não autorizou a confirmação gravada. A entrevista continua válida e pode ser enviada.</div>';
    return;
  }
  if(ACOLLECT_RECORDING_STATUS==='failed'){
    el.innerHTML=ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF
      ?'<div class="recording-note recording-note-error"><b>Gravação obrigatória após 21h.</b> '+esc(ACOLLECT_RECORDING_ERROR||'Falha técnica na gravação')+'. A entrevista não pode ser enviada até a confirmação ser gravada.</div>'
      :'<div class="recording-note recording-note-error"><b>Áudio não anexado.</b> '+esc(ACOLLECT_RECORDING_ERROR||'Falha técnica na gravação')+'. A entrevista continua válida; envie sem o áudio.</div>';
  }
}
function acollectRecordingConsentChanged(checked){
  ACOLLECT_RECORDING_CONSENT=checked===true;
  const btn=document.getElementById('acollectRecordingStartBtn');if(btn)btn.disabled=!checked;
}
function acollectRecordingDecline(){
  if(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF){
    alert('Após 21h, a confirmação final gravada é obrigatória para enviar a entrevista. Autorize a gravação ou cancele a entrevista.');
    return;
  }
  ACOLLECT_RECORDING_CONSENT=false;
  ACOLLECT_RECORDING_STATUS='declined';
  renderAcollectRecording();
  renderAcollectActionState();
}
async function acollectRecordingStart(){
  if(ACOLLECT_RECORDING_CONSENT!==true||ACOLLECT_RECORDING_STATUS!=='awaiting_consent')return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    alert(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Este aparelho ou navegador não permite a gravação segura obrigatória após 21h. Cancele a entrevista ou use um dispositivo compatível.':'Este aparelho ou navegador não permite gravação segura de áudio. A entrevista pode ser enviada sem gravação.');
    ACOLLECT_RECORDING_ERROR='Navegador ou contexto sem suporte seguro ao microfone';
    ACOLLECT_RECORDING_STATUS='failed';renderAcollectRecording();renderAcollectActionState();return;
  }
  const mime=acollectRecordingMime();
  try{
    ACOLLECT_RECORDING_STREAM=await navigator.mediaDevices.getUserMedia({audio:true});
    ACOLLECT_RECORDING_MIME=mime||'audio/webm';
    ACOLLECT_RECORDING_CHUNKS=[];
    ACOLLECT_RECORDING_RECORDER=new MediaRecorder(ACOLLECT_RECORDING_STREAM,mime?{mimeType:mime}:undefined);
    ACOLLECT_RECORDING_RECORDER.ondataavailable=event=>{if(event.data?.size)ACOLLECT_RECORDING_CHUNKS.push(event.data);};
    ACOLLECT_RECORDING_RECORDER.onerror=()=>{ACOLLECT_RECORDING_ERROR='O gravador interrompeu a captura';ACOLLECT_RECORDING_STATUS='failed';acollectRecordingStopTracks();renderAcollectRecording();renderAcollectActionState();};
    ACOLLECT_RECORDING_RECORDER.onstop=()=>{
      if(ACOLLECT_RECORDING_STATUS!=='recording')return;
      const blob=new Blob(ACOLLECT_RECORDING_CHUNKS,{type:ACOLLECT_RECORDING_MIME});
      if(!blob.size){ACOLLECT_RECORDING_ERROR='O navegador não retornou dados de áudio';ACOLLECT_RECORDING_STATUS='failed';renderAcollectRecording();renderAcollectActionState();return;}
      ACOLLECT_RECORDING_BLOB=blob;
      ACOLLECT_RECORDING_DURATION_MS=Math.min(ACOLLECT_RECORDING_MAX_SECONDS*1000,Date.now()-ACOLLECT_RECORDING_STARTED_AT);
      if(ACOLLECT_RECORDING_PREVIEW_URL)URL.revokeObjectURL(ACOLLECT_RECORDING_PREVIEW_URL);
      ACOLLECT_RECORDING_PREVIEW_URL=URL.createObjectURL(blob);
      ACOLLECT_RECORDING_STATUS='ready';
      acollectRecordingStopTracks();
      renderAcollectRecording();renderAcollectActionState();
    };
    ACOLLECT_RECORDING_STATUS='recording';
    ACOLLECT_RECORDING_STARTED_AT=Date.now();
    renderAcollectRecording();
    let seconds=0;
    const timer=setInterval(()=>{
      seconds=Math.floor((Date.now()-ACOLLECT_RECORDING_STARTED_AT)/1000);
      const timerEl=document.getElementById('acollectRecordingTimer');if(timerEl)timerEl.textContent='00:'+String(seconds).padStart(2,'0');
      if(ACOLLECT_RECORDING_STATUS!=='recording')clearInterval(timer);
    },250);
    ACOLLECT_RECORDING_STOP_TIMER=setTimeout(()=>acollectRecordingStop(),ACOLLECT_RECORDING_MAX_SECONDS*1000);
    ACOLLECT_RECORDING_RECORDER.start();
  }catch(ex){
    ACOLLECT_RECORDING_ERROR='Permissão do microfone negada ou dispositivo indisponível';
    ACOLLECT_RECORDING_STATUS='failed';
    acollectRecordingStopTracks();
    renderAcollectRecording();
    renderAcollectActionState();
    alert(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Não foi possível acessar o microfone. Após 21h, a entrevista não pode ser enviada sem a confirmação gravada.':'Não foi possível acessar o microfone. A entrevista pode ser enviada sem gravação.');
  }
}
function acollectRecordingStopTracks(){
  if(ACOLLECT_RECORDING_STOP_TIMER){clearTimeout(ACOLLECT_RECORDING_STOP_TIMER);ACOLLECT_RECORDING_STOP_TIMER=null;}
  if(ACOLLECT_RECORDING_STREAM){ACOLLECT_RECORDING_STREAM.getTracks().forEach(track=>track.stop());ACOLLECT_RECORDING_STREAM=null;}
}
function acollectRecordingStop(){
  if(ACOLLECT_RECORDING_STATUS!=='recording')return;
  ACOLLECT_RECORDING_STOP_TIMER=null;
  if(ACOLLECT_RECORDING_RECORDER&&ACOLLECT_RECORDING_RECORDER.state!=='inactive')ACOLLECT_RECORDING_RECORDER.stop();
}
function acollectRecordingRetake(){
  if(ACOLLECT_RECORDING_PREVIEW_URL){URL.revokeObjectURL(ACOLLECT_RECORDING_PREVIEW_URL);ACOLLECT_RECORDING_PREVIEW_URL=null;}
  ACOLLECT_RECORDING_BLOB=null;ACOLLECT_RECORDING_DURATION_MS=null;ACOLLECT_RECORDING_CONSENT=true;ACOLLECT_RECORDING_STATUS='awaiting_consent';
  renderAcollectRecording();
}
/* perguntas ainda sem resposta (todas exceto "resposta aberta", que é
   opcional) — usado para travar o botão "Concluir e enviar" */
function acollectMissingRequired(){
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  if(!s)return[];
  return (s.questions||[]).filter(q=>q.type!=='open').filter(q=>{
    if(!q.dbId)return false; // pergunta sem id real (não deveria acontecer) — não trava o envio por ela
    const a=ACOLLECT_ANSWERS[q.dbId];
    if(q.type==='pair'){
      const fields=Array.isArray(a?.value)?a.value:[];
      return (q.fields||DEFAULT_PAIR_FIELDS()).some((field,index)=>{
        const value=fields[index];
        return field.type==='multi'?( !Array.isArray(value)||value.length===0 ):String(value??'').trim()==='';
      });
    }
    if(q.type==='ranking')return !a||!Array.isArray(a.value)||a.value.length!==acollectRankingOptions(q).length;
    if(!a)return true;
    if(Array.isArray(a.value))return a.value.length===0;
    return a.value===''||a.value==null;
  });
}
function acollectPairFieldBody(q,field,fieldIndex,value){
  const name='acpair-'+q.dbId+'-'+fieldIndex;
  if(field.type==='single')return (field.options||[]).map(option=>`<label class="collect-option"><input type="radio" name="${name}" ${value===option?'checked':''} onchange="acollectSetPairField('${q.dbId}',${fieldIndex},${jsArg(option)})"> ${esc(option)}</label>`).join('');
  if(field.type==='multi'){
    const values=Array.isArray(value)?value:[];
    return (field.options||[]).map(option=>`<label class="collect-option"><input type="checkbox" ${values.includes(option)?'checked':''} onchange="acollectTogglePairMulti('${q.dbId}',${fieldIndex},${jsArg(option)})"> ${esc(option)}</label>`).join('');
  }
  return `<textarea class="inp collect-pair-open" rows="2" oninput="acollectSetPairField('${q.dbId}',${fieldIndex},this.value)">${esc(value||'')}</textarea>`;
}
function renderAcollectForm(){
  const el=document.getElementById('acollectForm');
  if(!el)return;
  if(!ACOLLECT_IN_PROGRESS){el.innerHTML='';return;}
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  if(!s){el.innerHTML='';return;}
  const qs=(s.questions||[]).filter(q=>q.dbId);
  el.innerHTML='<div style="font-weight:700;font-size:13px;margin:12px 0 4px">Questionário</div>'+
    qs.map(q=>{
      const a=ACOLLECT_ANSWERS[q.dbId];
      const locked=a&&a.locked;
      let body='';
      if(q.type==='single'){
        body=(q.opts||[]).map((opt,oi)=>`<label style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;${locked?'opacity:.7':''}">
          <input type="radio" name="acq-${q.dbId}" ${a&&a.value===opt?'checked':''} ${locked?'disabled':''} onchange="acollectSetAnswer('${q.dbId}',${jsArg(opt)},false,${oi})"> ${esc(opt)}</label>`).join('');
      }else if(q.type==='multi'){
        body=(q.opts||[]).map((opt,oi)=>{
          const checked=a&&Array.isArray(a.value)&&a.value.includes(opt);
          return `<label style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px">
          <input type="checkbox" ${checked?'checked':''} onchange="acollectToggleMultiAnswer('${q.dbId}',${jsArg(opt)},${oi})"> ${esc(opt)}</label>`;
        }).join('');
      }else if(q.type==='ranking'){
        const order=acollectRankingOrder(q,a);
        body=`<div class="collect-ranking-note">Arraste para ordenar da mais preferida à menos preferida. No celular, use as setas.</div><div class="collect-ranking-list">${order.map((option,index)=>`<div class="collect-ranking-row" draggable="true" ondragstart="acollectRankingDragStart(event,'${q.dbId}',${index})" ondragover="event.preventDefault()" ondrop="acollectRankingDrop(event,'${q.dbId}',${index})" ondragend="acollectRankingDragEnd()"><span class="collect-ranking-position">${index+1}</span><span>${esc(option)}</span><span class="collect-ranking-controls"><button type="button" class="collect-ranking-move" ${index===0?'disabled':''} onclick="acollectRankingMove('${q.dbId}',${index},${index-1})" aria-label="Subir ${esc(option)}">↑</button><button type="button" class="collect-ranking-move" ${index===order.length-1?'disabled':''} onclick="acollectRankingMove('${q.dbId}',${index},${index+1})" aria-label="Descer ${esc(option)}">↓</button></span><span class="collect-ranking-grip" aria-hidden="true">⠿</span></div>`).join('')}</div>`;
      }else if(q.type==='pair'){
        const pairValues=Array.isArray(a?.value)?a.value:[];
        body=`<div class="collect-pair-fields">${(q.fields||DEFAULT_PAIR_FIELDS()).map((field,fieldIndex)=>`<div class="collect-pair-field"><label class="lbl">${fieldIndex+1}. ${esc(field.label||'Resposta '+(fieldIndex+1))}</label>${acollectPairFieldBody(q,field,fieldIndex,pairValues[fieldIndex])}</div>`).join('')}</div>`;
      }else if(q.type==='scale'||q.type==='scale10'||q.type==='nps'){
        const max=ACOLLECT_SCALE_MAX[q.type]||5;
        const min=q.type==='nps'?0:1;
        const opts=[];for(let n=min;n<=max;n++)opts.push(n);
        body=`<div style="display:flex;flex-wrap:wrap;gap:5px">${opts.map(n=>`<button type="button" class="btn-ghost" style="padding:5px 9px;font-size:11.5px;${a&&a.value===n?'background:var(--accent);color:#fff':''}" onclick="acollectSetAnswer('${q.dbId}',${n},true)">${n}</button>`).join('')}</div>`;
      }else if(q.type==='number'){
        body=`<input class="inp" type="number" style="height:32px" value="${a&&a.value!=null?a.value:''}" oninput="acollectSetAnswer('${q.dbId}',this.value===''?'':+this.value)">`;
      }else if(q.type==='date'){
        body=`<input class="inp" type="date" style="height:32px" value="${a&&a.value?a.value:''}" onchange="acollectSetAnswer('${q.dbId}',this.value)">`;
      }else{ // open
        body=`<textarea class="inp" rows="2" style="font-size:12px" oninput="acollectSetAnswer('${q.dbId}',this.value)">${esc(a&&a.value?a.value:'')}</textarea>`;
      }
      return `<div class="q-card" style="padding:9px 10px;margin-bottom:7px">
        <div style="font-size:12px;font-weight:600;margin-bottom:5px">${esc(q.text||'(pergunta sem texto)')}${locked?' <span style="color:var(--teal);font-weight:400">· definida pela cota escolhida</span>':''}</div>
        ${body}
      </div>`;
    }).join('');
}
function acollectElapsedLabel(){
  if(!ACOLLECT_STARTED_AT)return'';
  const s=Math.max(0,Math.round((Date.now()-ACOLLECT_STARTED_AT)/1000));
  return s<60?s+'s':Math.floor(s/60)+'min '+String(s%60).padStart(2,'0')+'s';
}
function acollectStartTicking(){
  if(ACOLLECT_TICK)return;
  ACOLLECT_TICK=setInterval(()=>{
    const banner=document.querySelector('#acollectActions .online-banner');
    if(!banner||!ACOLLECT_IN_PROGRESS){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;return;}
    banner.textContent='▶ Entrevista em andamento — '+acollectElapsedLabel();
  },1000);
}
function renderAcollectActionState(){
  const btn=document.getElementById('startCollectBtn');
  const hint=document.getElementById('geoHint');
  if(!btn)return;
  const geoOk=GEO.status==='granted';
  const hasSurvey=!!ACOLLECT_SURVEY_ID;
  const hasQuota=ACOLLECT_SELECTED_QUOTA!==null&&ACOLLECT_SELECTED_QUOTA!==undefined;
  let actionsEl=document.getElementById('acollectActions');
  if(ACOLLECT_IN_PROGRESS){
    btn.style.display='none';
    if(!actionsEl){
      actionsEl=document.createElement('div');
      actionsEl.id='acollectActions';
      btn.parentNode.insertBefore(actionsEl,btn);
    }
    const missing=acollectMissingRequired().length;
    const recordingPending=ACOLLECT_RECORDING_REQUIRED&&(
      ['awaiting_consent','recording'].includes(ACOLLECT_RECORDING_STATUS)||
      (ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF&&ACOLLECT_RECORDING_STATUS!=='ready')
    );
    const submitBlocked=ACOLLECT_SUBMITTING||missing>0||recordingPending;
    actionsEl.innerHTML=`<div class="online-banner" style="margin-bottom:8px">▶ Entrevista em andamento — ${acollectElapsedLabel()}</div>
      ${missing>0?`<div style="font-size:11.5px;color:var(--ink3);margin-bottom:6px">Faltam responder ${missing} pergunta${missing>1?'s':''}</div>`:''}
      ${recordingPending?`<div style="font-size:11.5px;color:var(--ink3);margin-bottom:6px">${ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Após 21h, grave a confirmação final para liberar o envio.':'Conclua a confirmação final ou escolha enviar sem áudio.'}</div>`:''}
      <button class="btn-primary" style="height:40px;font-size:14px;width:100%;${submitBlocked?'opacity:.5':''}" ${submitBlocked?'disabled':''} onclick="acollectSubmit()">${ACOLLECT_SUBMITTING?'Enviando…':'✓ Concluir e enviar'}</button>
      <button class="btn-ghost" style="width:100%;margin-top:6px" ${ACOLLECT_SUBMITTING?'disabled':''} onclick="acollectCancel()">Cancelar</button>`;
    if(hint)hint.textContent='';
    acollectStartTicking();
    return;
  }
  if(actionsEl)actionsEl.innerHTML='';
  btn.style.display='';
  const active=geoOk&&hasSurvey&&hasQuota;
  btn.disabled=!active;
  btn.style.opacity=active?'1':'.5';
  btn.style.cursor=active?'pointer':'not-allowed';
  if(hint){
    const hintState=!geoOk?'is-blocked':!hasSurvey?'is-blocked':!hasQuota?'is-blocked':'is-ready';
    const hintTitle=!geoOk?'Ative a localização':!hasSurvey?'Nenhuma pesquisa disponível':!hasQuota?'1º selecione uma cota':'Cota selecionada — agora inicie a coleta';
    const hintText=!geoOk?geoStatusUi().hint:!hasSurvey?'Não há pesquisa em campo atribuída a você.':!hasQuota?'Toque em uma cota disponível acima para liberar o botão.':'Confira a cota selecionada e toque em “Iniciar coleta”.';
    hint.className='collect-step-hint '+hintState;
    hint.innerHTML='<strong>'+hintTitle+'</strong><span>'+hintText+'</span>';
  }
}
/* antes de começar a entrevista de verdade, revalida a cota escolhida
   direto no banco — o card pode ter ficado desatualizado (mesmo com a
   atualização automática a cada 20s) se outro pesquisador preencheu a
   cota bem nesse intervalo. É essa checagem, não só a cor do card, que
   efetivamente trava a coleta quando a cota já bateu a meta. */
async function acollectStart(){
  if(GEO.status!=='granted'||!ACOLLECT_SURVEY_ID)return;
  // quando a pesquisa não tem cotas configuradas, ACOLLECT_SELECTED_QUOTA é
  // '' de propósito (coleta livre) — só exigir uma cota escolhida quando
  // existe alguma cota pra escolher. Sem essa checagem, o clique em
  // "Iniciar coleta" não fazia nada para pesquisas sem cota, mesmo com o
  // botão habilitado.
  const temCotas=!!ACOLLECT_QUOTA_LIST.length;
  if(temCotas&&(ACOLLECT_SELECTED_QUOTA===null||ACOLLECT_SELECTED_QUOTA===undefined||ACOLLECT_SELECTED_QUOTA===''))return;
  const quotaEntry=temCotas?ACOLLECT_QUOTA_LIST.find(q=>q.label===ACOLLECT_SELECTED_QUOTA):null;
  if(quotaEntry){
    const btn=document.getElementById('startCollectBtn');
    if(btn){btn.disabled=true;btn.textContent='Verificando cota…';}
    ACOLLECT_QUOTA_COUNTS=await loadQuotaCounts(ACOLLECT_SURVEY_ID);
    const doneNow=ACOLLECT_QUOTA_COUNTS[quotaEntry.label]||0;
    if(doneNow>=quotaEntry.target){
      ACOLLECT_SELECTED_QUOTA=null;
      renderAcollectQuotas();
      alert('Essa cota acabou de bater a meta (preenchida agora há pouco). Escolha outra cota disponível.');
      return;
    }
    renderAcollectQuotas();
  }
  acollectResetRecordingState();
  await acollectReserveRecording();
  if(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF){
    ACOLLECT_RECORDING_REQUIRED=true;
    if(ACOLLECT_RECORDING_FEATURE_AVAILABLE)ACOLLECT_RECORDING_STATUS='awaiting_consent';
  }
  ACOLLECT_IN_PROGRESS=true;
  acollectClearTerminationNotice();
  ACOLLECT_STARTED_AT=Date.now();
  ACOLLECT_ANSWERS={};
  if(quotaEntry&&quotaEntry.questionDbId){
    ACOLLECT_ANSWERS[quotaEntry.questionDbId]={value:ACOLLECT_SELECTED_QUOTA,locked:true};
  }
  renderAcollectForm();
  renderAcollectRecording();
  renderAcollectActionState();
}
function acollectCancel(){
  ACOLLECT_IN_PROGRESS=false;
  ACOLLECT_STARTED_AT=null;
  ACOLLECT_SUBMITTING=false;
  ACOLLECT_ANSWERS={};
  acollectClearTerminationNotice();
  acollectResetRecordingState();
  if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
  const formEl=document.getElementById('acollectForm');
  if(formEl)formEl.innerHTML='';
  renderAcollectQuotas();
}
async function loadCollectEventsForced(){
  try{
    const {data,error}=await fetchCollectionEvents({ownOnly:selectedRole==='pesq'});
    if(!error){COLLECT_EVENTS=(data||[]).map(collectionEventRowToEntry);COLLECT_EVENTS_LOADED=true;await loadCollectionRecordingsForEvents(COLLECT_EVENTS);}
  }catch(ex){ /* mantém os dados já carregados se a nova busca falhar */ }
}
/* monta as linhas de collection_answers a partir de ACOLLECT_ANSWERS —
   múltipla escolha vira uma linha por opção marcada; ranking vira uma linha
   por opção com value_number = posição; perguntas compostas usam field_id;
   escala/número usam value_number; o resto usa value_text.
   Perguntas abertas sem resposta simplesmente não geram linha (são opcionais). */
function acollectBuildAnswerRows(eventId){
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  if(!s)return[];
  const rows=[];
  (s.questions||[]).filter(q=>q.dbId).forEach(q=>{
    const a=ACOLLECT_ANSWERS[q.dbId];
    if(!a||a.value===''||a.value==null||(Array.isArray(a.value)&&a.value.length===0))return;
    if(q.type==='multi'){
      a.value.forEach(label=>rows.push({collection_event_id:eventId,question_id:q.dbId,value_text:label}));
    }else if(q.type==='ranking'){
      a.value.forEach((label,index)=>rows.push({collection_event_id:eventId,question_id:q.dbId,value_text:label,value_number:index+1}));
    }else if(q.type==='pair'){
      const fields=q.fields||DEFAULT_PAIR_FIELDS(),values=Array.isArray(a.value)?a.value:[];
      fields.forEach((field,index)=>{
        const fieldId=field.id,value=values[index];if(!fieldId||value===''||value==null||(Array.isArray(value)&&value.length===0))return;
        if(field.type==='multi')value.forEach(label=>rows.push({collection_event_id:eventId,question_id:q.dbId,field_id:fieldId,value_text:label}));
        else rows.push({collection_event_id:eventId,question_id:q.dbId,field_id:fieldId,...(field.type==='open'?{value_text:String(value)}:{value_text:String(value)})});
      });
    }else if(q.type==='scale'||q.type==='scale10'||q.type==='nps'||q.type==='number'){
      rows.push({collection_event_id:eventId,question_id:q.dbId,value_number:a.value});
    }else{ // single, date, open
      rows.push({collection_event_id:eventId,question_id:q.dbId,value_text:String(a.value)});
    }
  });
  return rows;
}
/* envia a entrevista de verdade: geolocalização + horário + cota escolhida +
   as respostas reais do questionário viram linhas reais em collection_events
   e collection_answers. Sinaliza automaticamente se a entrevista foi
   concluída rápido demais para ter sido aplicada de verdade (menos de
   ACOLLECT_MIN_SECONDS entre "Iniciar" e "Concluir e enviar") — fica visível
   para o staff na aba Auditoria. */
async function acollectUploadRecording(eventId){
  if(!ACOLLECT_RECORDING_REQUIRED||ACOLLECT_RECORDING_CONSENT!==true)return{ok:true};
  if(ACOLLECT_RECORDING_STATUS!=='ready'||!ACOLLECT_RECORDING_BLOB){
    const {error}=await sb.rpc('mark_collection_recording_failed',{p_collection_event_id:eventId,p_error:ACOLLECT_RECORDING_ERROR||'Confirmação autorizada sem áudio disponível'});
    return{ok:!error,error:error?.message||''};
  }
  const ext=ACOLLECT_RECORDING_MIME.includes('mp4')?'m4a':ACOLLECT_RECORDING_MIME.includes('ogg')?'ogg':'webm';
  const randomPart=window.crypto?.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2);
  const path='confirmations/'+CURRENT_PROFILE.id+'/'+eventId+'-'+randomPart+'.'+ext;
  const {error:uploadError}=await sb.storage.from('collection-recordings').upload(path,ACOLLECT_RECORDING_BLOB,{contentType:ACOLLECT_RECORDING_MIME||'audio/webm',upsert:false});
  if(uploadError){
    await sb.rpc('mark_collection_recording_failed',{p_collection_event_id:eventId,p_error:uploadError.message});
    return{ok:false,error:uploadError.message};
  }
  const {error:attachError}=await sb.rpc('attach_collection_recording',{p_collection_event_id:eventId,p_storage_path:path,p_mime_type:ACOLLECT_RECORDING_MIME||'audio/webm',p_duration_ms:ACOLLECT_RECORDING_DURATION_MS||null});
  if(attachError){
    await sb.rpc('mark_collection_recording_failed',{p_collection_event_id:eventId,p_error:attachError.message});
    return{ok:false,error:attachError.message};
  }
  return{ok:true};
}
async function acollectSubmit(){
  if(!ACOLLECT_IN_PROGRESS||ACOLLECT_SUBMITTING)return;
  if(GEO.status!=='granted'){alert('A localização foi perdida — aguarde reconectar antes de enviar.');return;}
  if(acollectIsAfterRecordingCutoff()&&!ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF){
    ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF=true;
    ACOLLECT_RECORDING_REQUIRED=true;
    if(ACOLLECT_RECORDING_STATUS!=='ready')ACOLLECT_RECORDING_STATUS=ACOLLECT_RECORDING_FEATURE_AVAILABLE?'awaiting_consent':'failed';
    if(!ACOLLECT_RECORDING_FEATURE_AVAILABLE)ACOLLECT_RECORDING_ERROR='A confirmação após 21h exige a migration de gravação atualizada no Supabase';
    renderAcollectRecording();renderAcollectActionState();
    alert('A partir das 21h, todas as entrevistas precisam da confirmação final gravada. Autorize e grave antes de enviar.');
    return;
  }
  const missing=acollectMissingRequired();
  if(missing.length){alert('Faltam responder '+missing.length+' pergunta(s) antes de enviar.');return;}
  if(ACOLLECT_RECORDING_REQUIRED&&(
    ['awaiting_consent','recording'].includes(ACOLLECT_RECORDING_STATUS)||
    (ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF&&ACOLLECT_RECORDING_STATUS!=='ready')
  )){
    alert(ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Após 21h, a confirmação final gravada é obrigatória antes de finalizar.':'Conclua a confirmação final ou escolha enviar sem áudio antes de finalizar.');return;
  }
  ACOLLECT_SUBMITTING=true;
  renderAcollectActionState();
  const elapsedMs=Date.now()-ACOLLECT_STARTED_AT;
  const elapsedSeconds=Math.max(0,Math.round(elapsedMs/1000));
  const flags=[];
  if(elapsedMs<ACOLLECT_MIN_SECONDS*1000)flags.push('Tempo de aplicação muito curto');
  const quotaLabel=ACOLLECT_SELECTED_QUOTA||null;
  const eventPayload={
    survey_id:ACOLLECT_SURVEY_ID,
    researcher_id:CURRENT_PROFILE.id,
    quota_label:quotaLabel,
    lat:GEO.lat,lng:GEO.lng,accuracy_m:GEO.acc,
    occurred_at:new Date().toISOString(),
    duration_seconds:elapsedSeconds,
    synced:true,
    flags,
    status:'valid',
    is_calibration:false,
  };
  if(ACOLLECT_RECORDING_FEATURE_AVAILABLE===true){
    eventPayload.recording_reservation_id=ACOLLECT_RECORDING_RESERVATION_ID;
    eventPayload.recording_consent=ACOLLECT_RECORDING_CONSENT;
    eventPayload.recording_status=ACOLLECT_RECORDING_STATUS==='failed'?'failed':ACOLLECT_RECORDING_STATUS==='declined'?'declined':'not_selected';
    eventPayload.recording_error=ACOLLECT_RECORDING_ERROR||null;
  }
  let eventId=null;
  try{
    let {data,error}=await sb.from('collection_events').insert(eventPayload).select().single();
    if(error&&COLLECT_DURATION_COLUMN_AVAILABLE&&/duration_seconds|column|schema cache/i.test(error.message||'')){
      COLLECT_DURATION_COLUMN_AVAILABLE=false;
      const legacyPayload={...eventPayload};delete legacyPayload.duration_seconds;
      ({data,error}=await sb.from('collection_events').insert(legacyPayload).select().single());
    }
    if(error)throw new Error(error.message);
    eventId=data.id;
  }catch(ex){
    ACOLLECT_SUBMITTING=false;
    renderAcollectActionState();
    alert('Não foi possível enviar a coleta agora ('+ex.message+'). A entrevista continua em andamento — tente enviar de novo quando tiver internet.');
    return;
  }
  try{
    const answerRows=acollectBuildAnswerRows(eventId);
    if(answerRows.length){
      const {error:ansError}=await sb.from('collection_answers').insert(answerRows);
      if(ansError)throw new Error(ansError.message);
    }
  }catch(ex){
    // a entrevista (collection_events) já foi gravada — não dá para desfazer
    // (o pesquisador não tem permissão para apagar coletas), então avisamos
    // claramente em vez de tentar reverter.
    alert('A coleta foi enviada, mas houve um problema ao salvar as respostas do questionário ('+ex.message+'). Avise o coordenador.');
  }
  let recordingResult={ok:true};
  if(ACOLLECT_RECORDING_REQUIRED&&ACOLLECT_RECORDING_CONSENT===true){
    recordingResult=await acollectUploadRecording(eventId);
  }
  ACOLLECT_IN_PROGRESS=false;ACOLLECT_SUBMITTING=false;ACOLLECT_STARTED_AT=null;ACOLLECT_SELECTED_QUOTA=null;ACOLLECT_ANSWERS={};
  if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
  const formEl=document.getElementById('acollectForm');
  if(formEl)formEl.innerHTML='';
  acollectResetRecordingState();
  renderAcollectRecording();
  PAYMENTS_LOADED=false; // financeiro recalculado no banco (gatilho) — recarrega na próxima visita
  await loadCollectEventsForced();
  ACOLLECT_QUOTA_COUNTS=await loadQuotaCounts(ACOLLECT_SURVEY_ID);
  renderAcollectQuotas();
  renderGeoLog();
  const msg=document.getElementById('acollectMsg');
  if(msg){
    msg.innerHTML=recordingResult.ok
      ?'<div class="online-banner">✓ Coleta enviada com sucesso</div>'
      :'<div class="offline-banner">✓ Coleta enviada; a confirmação de áudio não pôde ser anexada.</div>';
    setTimeout(()=>{if(msg)msg.innerHTML='';},4000);
  }
}

function requestGeo(){
  if(!('geolocation' in navigator)){
    GEO.status='unsupported';
    renderGeoStatus();
    return;
  }
  GEO.status='requesting';
  renderGeoStatus();
  if(GEO.watchId!=null){navigator.geolocation.clearWatch(GEO.watchId);}
  GEO.watchId=navigator.geolocation.watchPosition(pos=>{
    GEO.status='granted';
    GEO.lat=pos.coords.latitude;GEO.lng=pos.coords.longitude;
    GEO.acc=pos.coords.accuracy;GEO.ts=Date.now();
    renderGeoStatus();
  },err=>{
    GEO.status=(err&&err.code===1)?'denied':'unavailable';
    renderGeoStatus();
  },{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
}

function renderGeoStatus(){
  const box=document.getElementById('geoStatus');
  if(!box)return;
  const s=geoStatusUi();
  box.className=s.cls;
  box.innerHTML=s.html;
  renderAcollectActionState();
}

function geoAgo(ts){
  if(!ts)return'';
  const s=Math.max(0,Math.round((Date.now()-ts)/1000));
  if(s<5)return'agora';
  if(s<60)return'há '+s+'s';
  return'há '+Math.round(s/60)+'min';
}

/* histórico de coletas do próprio pesquisador — vem do mesmo COLLECT_EVENTS
   carregado para a auditoria (o RLS já garante que um pesquisador só recebe
   as próprias linhas) */
function renderGeoLog(){
  const el=document.getElementById('geoLog');
  if(!el)return;
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const mine=COLLECT_EVENTS.filter(e=>e.researcherId===myId).sort((a,b)=>b.ts-a.ts).slice(0,6);
  el.innerHTML=mine.length?mine.map(g=>{
    const s=SURVEYS.find(x=>x.id===g.surveyId);
    const statusBadge=g.status==='rejected'?' <span class="pill pill-red">✕ Reprovada</span>':g.calibration?' <span class="pill pill-blue">◎ Calibração</span>':'';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:11.5px">
      <span style="width:16px;text-align:center;flex-shrink:0">${g.synced?'✓':'⏳'}</span>
      <span style="flex:1;color:var(--ink2)">${esc(g.cota||'(sem cota)')}${s?' · <span style="color:var(--ink3)">'+esc(s.name)+'</span>':''}${statusBadge}</span>
      <span style="color:var(--ink3);white-space:nowrap;flex-shrink:0">${geoAgo(g.ts)}</span>
    </div>`;
  }).join(''):'<div class="empty" style="padding:14px 0">Nenhuma coleta registrada ainda.</div>';
}

/* ============ REPORTS ============ */
let RP_SURVEY_ID=null;
let RP_REPORT_MODE='overview';
let RP_CROSS_QUESTION_IDS=[];
let RP_REPORT_LIVE_TIMER=null;
let RP_REPORT_CHANNEL=null;
let RP_REPORT_LOADING=false;
let RP_REPORT_ANALYSIS_CACHE={surveyId:null,overviewRows:[],crossRows:[],crossIds:[]};
let RP_REPORT_CROSS_ANALYSIS_CACHE={};
let RP_REPORT_DOCUMENT_ID=null;
let RP_REPORT_DOCUMENT_STATUS='new';
let RP_REPORT_CLIENTS=[];
let RP_REPORT_DRAFT_HYDRATED=false;
let RP_REPORT_CROSSINGS=[];
let RP_ACTIVE_CROSSING_ID=null;
let RP_REPORT_DRAFT_SECTIONS=null;
function reportsAvailableSurveys(){return SURVEYS.filter(s=>reportsQuestionsForSurvey(s).length>0||openQuestionsForSurvey(s).length>0);}
function reportsCurrentSurvey(){return SURVEYS.find(s=>s.id===RP_SURVEY_ID)||null;}
function reportsCurrentQuestions(){return reportsQuestionsForSurvey(reportsCurrentSurvey()||{});}
function reportsCrossingQuestionIds(crossing){return [...(crossing?.questionIds||crossing?.crossQuestionIds||[])].filter(Boolean).slice(0,3);}
function reportsMakeCrossing(questionIds=[],index=RP_REPORT_CROSSINGS.length){return {id:'cross-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title:'Cruzamento '+(index+1),questionIds:questionIds.filter(Boolean).slice(0,3),include:true};}
function reportsNormalizeCrossings(sections){
  const legacyIds=Array.isArray(sections?.crossQuestionIds)?sections.crossQuestionIds:[];
  const raw=Array.isArray(sections?.crossings)?sections.crossings:(legacyIds.length?[{id:'cross-legacy',title:sections.crossTitle||'Cruzamento 1',questionIds:legacyIds,include:sections.includeCross!==false}]:[]);
  const used=new Set();
  return raw.map((crossing,index)=>{let id=String(crossing?.id||'cross-'+(index+1));while(used.has(id))id+='-'+index;used.add(id);const title=String(crossing?.title||crossing?.crossTitle||'Cruzamento '+(index+1)).trim()||'Cruzamento '+(index+1);return {id,title,questionIds:reportsCrossingQuestionIds(crossing),include:crossing?.include!==false};}).filter(crossing=>crossing.questionIds.length||crossing.title);
}
function reportsActiveCrossing(){return RP_REPORT_CROSSINGS.find(crossing=>crossing.id===RP_ACTIVE_CROSSING_ID)||null;}
function reportsSyncActiveCrossing(){const crossing=reportsActiveCrossing();if(crossing){RP_ACTIVE_CROSSING_ID=crossing.id;RP_CROSS_QUESTION_IDS=reportsCrossingQuestionIds(crossing);}else{RP_ACTIVE_CROSSING_ID=null;RP_CROSS_QUESTION_IDS=[];}}
function reportsEnsureCrossings(qs){
  const valid=new Set(qs.map(q=>q.dbId));
  RP_REPORT_CROSSINGS=RP_REPORT_CROSSINGS.map(crossing=>({...crossing,questionIds:reportsCrossingQuestionIds(crossing).filter(id=>valid.has(id)).slice(0,3)})).filter(crossing=>crossing.questionIds.length||crossing.title);
  if(!RP_REPORT_CROSSINGS.length&&!RP_REPORT_DRAFT_HYDRATED&&qs[0])RP_REPORT_CROSSINGS=[reportsMakeCrossing([qs[0].dbId])];
  if(!RP_ACTIVE_CROSSING_ID||!RP_REPORT_CROSSINGS.some(crossing=>crossing.id===RP_ACTIVE_CROSSING_ID))RP_ACTIVE_CROSSING_ID=RP_REPORT_CROSSINGS[0]?.id||null;
  reportsSyncActiveCrossing();
}
function reportsEnsureCrossSelection(qs){reportsEnsureCrossings(qs);}
function reportsCrossSelectionSummary(crossing=reportsActiveCrossing()){const labels=reportsCrossingQuestionIds(crossing).map((id,index)=>(index+1)+'. '+reportsQuestionLabel(id));return labels.length?labels.join(' · '):'Nenhuma variável selecionada. Este cruzamento não entrará no PDF até receber variáveis.';}
function reportsUpdateCrossSelectionSummary(crossingId=null){document.querySelectorAll('[data-crossing-summary]').forEach(el=>{if(!crossingId||el.dataset.crossingSummary===crossingId){const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===el.dataset.crossingSummary);el.textContent=reportsCrossSelectionSummary(crossing);}});}
function reportsQuestionLabel(id){return reportsCurrentQuestions().find(q=>q.dbId===id)?.text||'(variável sem texto)';}
function reportsModeButton(mode,label,icon){return `<button class="reports-mode-btn ${RP_REPORT_MODE===mode?'on':''}" onclick="reportsSetMode('${mode}')"><span>${icon}</span>${label}</button>`;}
function reportsCrossQuestionSelect(crossingId,index,qs){const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===crossingId);const selected=reportsCrossingQuestionIds(crossing)[index]||'';return `<div class="reports-variable-control"><label class="lbl">Variável ${index+1}${index===0?'':' (opcional)'}</label><select class="inp" data-crossing-question="${esc(crossingId)}" data-crossing-index="${index}" onchange="reportsPickCrossQuestion(${jsArg(crossingId)},${index},this.value)"><option value="">${index===0?'Escolha uma pergunta':'Não usar'}</option>${qs.map(q=>`<option value="${q.dbId}" ${q.dbId===selected?'selected':''}>${esc(q.text||'(pergunta sem texto)')}</option>`).join('')}</select></div>`;}
function reportsCrossingCardMarkup(crossing,index,qs){const safeId=jsArg(crossing.id);return `<article class="reports-crossing-card ${crossing.id===RP_ACTIVE_CROSSING_ID?'is-active':''}" data-crossing-card="${esc(crossing.id)}"><div class="reports-crossing-card-head"><div><div class="reports-crossing-kicker">CRUZAMENTO ${index+1}</div><input class="inp reports-crossing-title" data-crossing-title="${esc(crossing.id)}" value="${esc(crossing.title)}" aria-label="Título do cruzamento ${index+1}" oninput="reportsUpdateCrossingTitle(${safeId},this.value)"></div><div class="reports-crossing-actions"><button class="btn btn-out" onclick="reportsSetActiveCrossing(${safeId})">${crossing.id===RP_ACTIVE_CROSSING_ID?'Visualizando':'Visualizar'}</button><button class="btn btn-out reports-crossing-remove" onclick="reportsRemoveCrossing(${safeId})">Remover</button></div></div><div class="reports-builder-grid">${[0,1,2].map(i=>reportsCrossQuestionSelect(crossing.id,i,qs)).join('')}</div><div class="reports-crossing-card-foot"><label class="reports-section-option"><input type="checkbox" data-crossing-include="${esc(crossing.id)}" ${crossing.include!==false?'checked':''} onchange="reportsToggleCrossingInclude(${safeId},this.checked)"> Incluir este cruzamento no PDF</label><span data-crossing-summary="${esc(crossing.id)}">${esc(reportsCrossSelectionSummary(crossing))}</span></div></article>`;}
function reportsCrossingsBuilderMarkup(qs){const cards=RP_REPORT_CROSSINGS.map((crossing,index)=>reportsCrossingCardMarkup(crossing,index,qs)).join('');return `<div class="reports-crossings-builder">${cards||'<div class="reports-crossings-empty">Nenhum cruzamento salvo nesta estrutura. Adicione o primeiro cruzamento para começar.</div>'}<div class="reports-crossings-builder-actions"><button class="btn btn-out" onclick="reportsAddCrossing()">+ Adicionar outro cruzamento</button><button class="btn btn-out" onclick="reportsSaveDraft()">Salvar cruzamentos na estrutura</button></div></div>`;}
function reportsClientsForSurvey(survey){
  return (survey?.clientIds||[]).map(id=>USERS.find(u=>u.id===id)).filter(Boolean);
}
function reportsDocumentEditorMarkup(survey){
  const clients=reportsClientsForSurvey(survey);RP_REPORT_CLIENTS=clients;
  const defaultClient=clients[0]?.id||'';
  const title='Relatório de resultados — '+(survey?.name||'Pesquisa');
  const draftSections=RP_REPORT_DRAFT_SECTIONS||{};const sections=[['includeMethodology','Ficha técnica e metodologia',draftSections.includeMethodology??true],['includeOverview','Resultados de todas as perguntas',draftSections.includeOverview??(RP_REPORT_MODE==='overview')],['includeCross','Gráficos e tabelas de cruzamentos',draftSections.includeCross??(RP_REPORT_MODE==='builder')],['includeSummary','Síntese executiva',draftSections.includeSummary??true]];
  return `<section class="card reports-document-editor" id="reports-document-editor">
    <div class="reports-document-head"><div><div class="reports-eyebrow">ENTREGA AO CLIENTE</div><h2>Estrutura do relatório final</h2><p>Monte a apresentação, escolha os blocos e disponibilize o PDF somente quando estiver revisado.</p></div><span id="rp-document-status" class="reports-document-status draft">Rascunho</span></div>
    <div class="reports-document-grid">
      <div><label class="lbl">Cliente destinatário</label><select class="inp" id="rp-doc-client" onchange="reportsDocClientChanged()"><option value="">${clients.length?'Selecione o cliente':'Nenhum cliente vinculado'}</option>${clients.map(c=>`<option value="${c.id}" ${c.id===defaultClient?'selected':''}>${esc(c.company||c.name||c.email||'Cliente')}</option>`).join('')}</select></div>
      <div><label class="lbl">Título do relatório</label><input class="inp" id="rp-doc-title" value="${esc(title)}"></div>
      <div><label class="lbl">Subtítulo</label><input class="inp" id="rp-doc-subtitle" value="PesquisaPro · Resultados e análise"></div>
      <div><label class="lbl">Período / identificação</label><input class="inp" id="rp-doc-period" value="${esc(survey?.dataIni||'')} ${survey?.dataFim?'— '+esc(survey.dataFim):''}"></div>
      <div class="reports-crossing-structure-note"><label class="lbl">Cruzamentos analíticos</label><div class="reports-crossing-structure-hint">Configure o título, as variáveis e a inclusão no PDF em cada cartão do modo “Montar relatório”.</div></div>
    </div>
    <div class="reports-document-grid reports-document-texts">
      <div><label class="lbl">Apresentação</label><textarea class="inp" id="rp-doc-presentation" rows="4">Este relatório apresenta os principais resultados da pesquisa, com base nas entrevistas válidas realizadas pela rede de pesquisadores do PesquisaPro.</textarea></div>
      <div><label class="lbl">Metodologia</label><textarea class="inp" id="rp-doc-methodology-text" rows="4">A análise considera entrevistas válidas, excluindo registros reprovados e entrevistas de calibração. Percentuais são calculados sobre a base válida informada em cada tabela.</textarea></div>
      <div><label class="lbl">Síntese executiva</label><textarea class="inp" id="rp-doc-summary-text" rows="4" placeholder="Registre aqui a leitura executiva dos resultados."></textarea></div>
    </div>
    <div class="reports-section-picker"><div class="lbl">Blocos incluídos no PDF</div><div class="reports-section-options">${sections.map(([id,label,checked])=>`<label class="reports-section-option"><input type="checkbox" id="rp-doc-${id.replace('include','').toLowerCase()}" ${checked?'checked':''}> <span>${label}</span></label>`).join('')}</div></div>
    <div class="reports-document-actions"><button class="btn btn-out" onclick="reportsSaveDraft()">Salvar estrutura</button><button class="btn btn-fill" onclick="reportsGeneratePdf()">Gerar PDF</button><button class="btn btn-fill reports-publish-btn" onclick="reportsFinalizeAndPublish()">Finalizar e disponibilizar ao cliente</button></div>
    <div id="rp-document-feedback" class="reports-document-feedback" role="status"></div>
  </section>`;
}
PAGES.reports=()=>{
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
  const surveys=reportsAvailableSurveys();
  if(!surveys.length)return head('Relatórios','Resultados em tempo real e análises cruzadas')+'<div class="card"><div class="empty">Nenhuma pesquisa com perguntas configuradas ainda.</div></div>';
  if(RP_SURVEY_ID==null||!surveys.some(s=>s.id===RP_SURVEY_ID))RP_SURVEY_ID=surveys[0].id;
  const survey=reportsCurrentSurvey()||surveys[0];
  const qs=reportsQuestionsForSurvey(survey),crossQs=reportsCrossQuestionsForSurvey(survey);
  reportsEnsureCrossSelection(crossQs);
  return head('Relatórios','Resultados em tempo real e análises cruzadas')+`
  <div class="card reports-toolbar mb">
    <div class="reports-toolbar-top"><div><div class="reports-eyebrow">CENTRAL DE ANÁLISE</div><h2>Resultados da pesquisa</h2><p>Veja todas as perguntas e monte cruzamentos com até três variáveis.</p></div><span id="rp-live-status" class="reports-live-badge"><i></i>Atualizando automaticamente</span></div>
    <div class="reports-toolbar-grid"><div><label class="lbl">Pesquisa</label><select class="inp" id="rp-survey" onchange="reportsPickSurvey(this.value)">${surveys.map(s=>`<option value="${s.id}" ${s.id===RP_SURVEY_ID?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="reports-mode-switch" role="tablist" aria-label="Modo de relatório">${reportsModeButton('overview','Todas as perguntas','▦')}${reportsModeButton('builder','Montar relatório','⚒')}</div></div>
    ${RP_REPORT_MODE==='builder'?`<div class="reports-builder-note">Cada cartão abaixo representa um cruzamento independente. Cada cruzamento aceita de uma a três variáveis e pode ser incluído ou retirado do PDF separadamente. Ranking e “Duas respostas” aparecem no resultado geral, mas não são escolhidos como uma única variável de cruzamento.</div>${reportsCrossingsBuilderMarkup(crossQs)}`:''}
  </div>
  ${reportsHeatmapMarkup(survey)}
  <div id="rp-output"><div class="empty" style="padding:28px 0">Carregando resultados reais…</div></div>
  ${reportsDocumentEditorMarkup(survey,qs)}
  <div class="callout reports-footnote"><b>Base de análise:</b> entrevistas válidas, excluindo coletas reprovadas e de calibração. Os dados são atualizados automaticamente enquanto esta aba estiver aberta.</div>`;
};
function reportsPickSurvey(id){RP_SURVEY_ID=id;RP_CROSS_QUESTION_IDS=[];RP_REPORT_CROSSINGS=[];RP_ACTIVE_CROSSING_ID=null;RP_REPORT_DRAFT_SECTIONS=null;RP_REPORT_DOCUMENT_ID=null;RP_REPORT_DOCUMENT_STATUS='new';RP_REPORT_DRAFT_HYDRATED=false;RP_REPORT_ANALYSIS_CACHE={surveyId:null,overviewRows:[],crossRows:[],crossIds:[]};RP_REPORT_CROSS_ANALYSIS_CACHE={};go('reports');}
function reportsSetMode(mode){RP_REPORT_MODE=mode;RP_REPORT_DRAFT_HYDRATED=true;go('reports');}
function reportsAddCrossing(){const crossing=reportsMakeCrossing([],RP_REPORT_CROSSINGS.length);RP_REPORT_CROSSINGS=[...RP_REPORT_CROSSINGS,crossing];RP_ACTIVE_CROSSING_ID=crossing.id;reportsSyncActiveCrossing();go('reports');}
function reportsSetActiveCrossing(id){if(!RP_REPORT_CROSSINGS.some(crossing=>crossing.id===id))return;RP_ACTIVE_CROSSING_ID=id;reportsSyncActiveCrossing();go('reports');}
function reportsUpdateCrossingTitle(id,title){const normalized=String(title||'').trim();RP_REPORT_CROSSINGS=RP_REPORT_CROSSINGS.map(crossing=>crossing.id===id?{...crossing,title:normalized||'Cruzamento'}:crossing);}
function reportsToggleCrossingInclude(id,include){RP_REPORT_CROSSINGS=RP_REPORT_CROSSINGS.map(crossing=>crossing.id===id?{...crossing,include:!!include}:crossing);}
function reportsRemoveCrossing(id){const remaining=RP_REPORT_CROSSINGS.filter(crossing=>crossing.id!==id);RP_REPORT_CROSSINGS=remaining;if(RP_ACTIVE_CROSSING_ID===id)RP_ACTIVE_CROSSING_ID=remaining[0]?.id||null;reportsSyncActiveCrossing();go('reports');}
function reportsPickCrossQuestion(crossingId,index,id){const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===crossingId);if(!crossing)return;const next=reportsCrossingQuestionIds(crossing);next[index]=id||null;const questionIds=next.filter(Boolean).slice(0,3);RP_REPORT_CROSSINGS=RP_REPORT_CROSSINGS.map(item=>item.id===crossingId?{...item,questionIds}:item);RP_ACTIVE_CROSSING_ID=crossingId;reportsSyncActiveCrossing();RP_REPORT_DRAFT_HYDRATED=true;reportsUpdateCrossSelectionSummary(crossingId);reportsLoadAndRender();}
function reportsCrossingPayloads(){return RP_REPORT_CROSSINGS.map((crossing,index)=>({id:crossing.id,title:String(crossing.title||'Cruzamento '+(index+1)).trim()||'Cruzamento '+(index+1),questionIds:reportsCrossingQuestionIds(crossing),include:crossing.include!==false})).filter(crossing=>crossing.questionIds.length);}
function reportsCrossingForPayload(crossing){return reportsCrossingPayloads().find(item=>item.id===crossing.id)||null;}
function reportsSetLiveStatus(text,kind='live'){
  const el=document.getElementById('rp-live-status');if(!el)return;
  el.className='reports-live-badge '+kind;el.innerHTML=`<i></i>${esc(text)}`;
}
function reportsStartLive(){
  reportsStopLive();
  RP_REPORT_LIVE_TIMER=setInterval(()=>reportsLoadAndRender(true),15000);
  try{
    RP_REPORT_CHANNEL=sb.channel('reports-live-'+Date.now())
      .on('postgres_changes',{event:'*',schema:'public',table:'collection_events'},()=>reportsLoadAndRender(true))
      .on('postgres_changes',{event:'*',schema:'public',table:'collection_answers'},()=>reportsLoadAndRender(true));
    RP_REPORT_CHANNEL.subscribe();
  }catch(ex){RP_REPORT_CHANNEL=null;}
}
function reportsStopLive(){
  if(RP_REPORT_LIVE_TIMER){clearInterval(RP_REPORT_LIVE_TIMER);RP_REPORT_LIVE_TIMER=null;}
  if(RP_REPORT_CHANNEL&&sb.removeChannel){try{sb.removeChannel(RP_REPORT_CHANNEL);}catch(ex){}}
  RP_REPORT_CHANNEL=null;
}
async function reportsLoadAndRender(isLive=false){
  const out=document.getElementById('rp-output');if(!out||RP_REPORT_LOADING)return;
  const survey=reportsCurrentSurvey();const qs=reportsCurrentQuestions();if(!survey||!qs.length)return;
  RP_REPORT_LOADING=true;if(!isLive)out.innerHTML='<div class="empty" style="padding:28px 0">Carregando resultados reais…</div>';reportsSetLiveStatus(isLive?'Atualizado agora':'Carregando dados…',isLive?'live':'loading');
  try{
    if(RP_REPORT_MODE==='overview'){
      const {data,error}=await sb.rpc('survey_report_all_questions',{p_survey_id:survey.id});
      if(error)throw error;
      RP_REPORT_ANALYSIS_CACHE={surveyId:survey.id,overviewRows:data||[],crossRows:RP_REPORT_ANALYSIS_CACHE.crossRows||[],crossIds:RP_REPORT_ANALYSIS_CACHE.crossIds||[]};
      renderReportsOverview(out,data||[],qs);
    }else{
      const active=reportsActiveCrossing();const ids=reportsCrossingQuestionIds(active);
      if(!ids.length){out.innerHTML='<div class="card"><div class="empty">Escolha pelo menos uma variável no cruzamento ativo para montar a prévia.</div></div>';return;}
      const {data,error}=await sb.rpc('survey_report_cross_tab',{p_survey_id:survey.id,p_question_ids:ids});
      if(error)throw error;
      RP_REPORT_ANALYSIS_CACHE={surveyId:survey.id,overviewRows:RP_REPORT_ANALYSIS_CACHE.overviewRows||[],crossRows:data||[],crossIds:ids};
      renderReportsCross(out,data||[],ids,qs);
    }
    reportsSetLiveStatus(isLive?'Atualizado agora':'Atualização automática ativa','live');
  }catch(ex){
    const msg=String(ex?.message||ex);
    out.innerHTML=`<div class="callout warn"><b>O relatório avançado ainda não está disponível.</b><br>Execute a migration <code>deploy/relatorios-tempo-real-cruzamentos.sql</code> no Supabase. Detalhe técnico: ${esc(msg)}</div>`;
    reportsSetLiveStatus('Aguardando configuração','warn');
  }finally{RP_REPORT_LOADING=false;}
}
function reportPercent(cnt,total){return total?Math.round((Number(cnt)/Number(total))*100):0;}
function renderReportsOverview(out,rows,qs){
  const byQ={};(rows||[]).forEach(r=>(byQ[r.question_id]||(byQ[r.question_id]=[])).push(r));
  const cards=qs.map((q,qi)=>{
    const data=byQ[q.dbId]||[];const base=Number(data[0]?.valid_base)||0;const total=data.reduce((sum,r)=>sum+Number(r.cnt||0),0);const max=Math.max(1,...data.map(r=>Number(r.cnt||0)));
    const lines=data.length?data.map((r,i)=>{const cnt=Number(r.cnt||0),pct=reportPercent(cnt,base||total);return `<div class="reports-answer-row"><div class="reports-answer-head"><span>${esc(r.value_label||'(sem resposta)')}</span><strong>${cnt.toLocaleString('pt-BR')} · ${pct}%</strong></div><div class="reports-answer-bar"><i style="width:${Math.min(100,Math.round((cnt/max)*100))}%"></i></div></div>`;}).join(''):'<div class="empty" style="padding:16px 0">Ainda não há respostas válidas.</div>';
    return `<article class="card reports-question-card"><div class="reports-question-head"><div><span class="reports-question-number">${String(qi+1).padStart(2,'0')}</span><h3>${esc(q.text||'(pergunta sem texto)')}</h3></div><span class="pill pill-blue">${base.toLocaleString('pt-BR')} válidas</span></div><div class="reports-question-meta">${esc(Q_TYPES[q.type]||q.type||'Pergunta')}</div>${lines}</article>`;
  }).join('');
  out.innerHTML=`<div class="reports-overview-head"><div><h2>Todas as perguntas</h2><p>Distribuição atualizada das respostas válidas, pergunta a pergunta.</p></div><span class="reports-count-pill">${qs.length} pergunta${qs.length===1?'':'s'}</span></div><div class="reports-question-list">${cards}</div>`;
}
function reportsCrossOptionLabels(qid){const q=reportsCurrentQuestions().find(item=>item.dbId===qid);return (q?.opts||[]).map(value=>String(value||'').trim()).filter(Boolean);}
function reportsCrossValue(value){return String(value==null||value===''?'(sem resposta)':value);}
function reportsCrossOrderedValues(rows,index,qid){const values=[];const seen=new Set();(rows||[]).forEach(row=>{const value=reportsCrossValue([row.variable_1,row.variable_2,row.variable_3][index]);if(!seen.has(value)){seen.add(value);values.push(value);}});const preferred=reportsCrossOptionLabels(qid);return [...preferred.filter(value=>seen.has(value)),...values.filter(value=>!preferred.includes(value))];}
function reportsCrossPct(value,base){return base?((Number(value||0)/base)*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'0,0%';}
function reportsCrossMatrixModel(rows,ids,thirdValue=null){const base=Number(rows[0]?.valid_base)||0;const filtered=thirdValue==null?rows:rows.filter(row=>reportsCrossValue(row.variable_3)===thirdValue);const rowValues=reportsCrossOrderedValues(filtered,0,ids[0]);const colValues=ids.length>1?reportsCrossOrderedValues(filtered,1,ids[1]):['% da base'];const counts=new Map(),rowTotals=new Map(),colTotals=new Map();filtered.forEach(row=>{const rowValue=reportsCrossValue(row.variable_1),colValue=ids.length>1?reportsCrossValue(row.variable_2):'% da base',count=Number(row.cnt||0);counts.set(rowValue+'\u0000'+colValue,(counts.get(rowValue+'\u0000'+colValue)||0)+count);rowTotals.set(rowValue,(rowTotals.get(rowValue)||0)+count);colTotals.set(colValue,(colTotals.get(colValue)||0)+count);});return {base,rowValues,colValues,counts,rowTotals,colTotals,title:thirdValue==null?'':reportsQuestionLabel(ids[2])+': '+thirdValue};}
function reportsCrossMatrixMarkup(model,ids){const rowLabel=reportsQuestionLabel(ids[0]),colLabel=ids.length>1?reportsQuestionLabel(ids[1]):'Percentual da base';const headers=model.colValues.map(value=>`<th>${esc(value)}</th>`).join('');const body=model.rowValues.map(rowValue=>{const cells=model.colValues.map(colValue=>`<td>${reportsCrossPct(model.counts.get(rowValue+'\u0000'+colValue)||0,model.base)}</td>`).join('');return `<tr><th scope="row">${esc(rowValue)}</th>${cells}<td class="cross-total-cell"><strong>${reportsCrossPct(model.rowTotals.get(rowValue)||0,model.base)}</strong></td></tr>`;}).join('');const totals=model.colValues.map(colValue=>`<td class="cross-total-cell"><strong>${reportsCrossPct(model.colTotals.get(colValue)||0,model.base)}</strong></td>`).join('');return `<div class="reports-cross-matrix-wrap">${model.title?`<h3>${esc(model.title)}</h3>`:''}<div class="reports-cross-scroll"><table class="reports-cross-matrix"><thead><tr><th>${esc(rowLabel)}</th>${headers}<th>TOTAL</th></tr></thead><tbody>${body||`<tr><td colspan="${model.colValues.length+2}" class="empty">Nenhuma combinação encontrada.</td></tr>`}<tr class="cross-total-row"><th>TOTAL</th>${totals}<td class="cross-total-cell"><strong>${reportsCrossPct([...model.rowTotals.values()].reduce((sum,value)=>sum+value,0),model.base)}</strong></td></tr></tbody></table></div></div>`;}
function renderReportsCross(out,rows,ids,qs){const base=Number(rows[0]?.valid_base)||0;const thirdValues=ids.length>=3?reportsCrossOrderedValues(rows,2,ids[2]):[null];const matrices=thirdValues.map(thirdValue=>reportsCrossMatrixMarkup(reportsCrossMatrixModel(rows,ids,thirdValue),ids)).join('');out.innerHTML=`<div class="reports-cross-head"><div><h2>Relatório montado</h2><p>Matriz percentual sobre ${base.toLocaleString('pt-BR')} entrevistas válidas. As células e os totais usam a base total da pesquisa.</p></div><button class="btn btn-out" onclick="reportsExportCurrent()">↧ Exportar CSV</button></div><div class="reports-cross-matrices card">${matrices||'<div class="empty">Nenhuma combinação encontrada.</div>'}</div>`;}
function reportsDocValue(id){return (document.getElementById(id)?.value||'').trim();}
function reportsDocChecked(id){return !!document.getElementById(id)?.checked;}
function reportsDocPayload(){
  const survey=reportsCurrentSurvey();
  const active=reportsActiveCrossing();const crossings=reportsCrossingPayloads();return {surveyId:survey?.id||null,clientId:reportsDocValue('rp-doc-client'),title:reportsDocValue('rp-doc-title'),subtitle:reportsDocValue('rp-doc-subtitle'),period:reportsDocValue('rp-doc-period'),presentation:reportsDocValue('rp-doc-presentation'),methodology:reportsDocValue('rp-doc-methodology-text'),executiveSummary:reportsDocValue('rp-doc-summary-text'),sections:{includeMethodology:reportsDocChecked('rp-doc-methodology'),includeOverview:reportsDocChecked('rp-doc-overview'),includeCross:reportsDocChecked('rp-doc-cross'),includeSummary:reportsDocChecked('rp-doc-summary'),period:reportsDocValue('rp-doc-period'),crossTitle:active?.title||'Cruzamentos selecionados',crossQuestionIds:reportsCrossingQuestionIds(active),crossings}};
}
function reportsDocFeedback(text,kind=''){const el=document.getElementById('rp-document-feedback');if(el){el.className='reports-document-feedback '+kind;el.textContent=text;}}
function reportsSetDocumentStatus(status){RP_REPORT_DOCUMENT_STATUS=status||'draft';const el=document.getElementById('rp-document-status');if(!el)return;el.className='reports-document-status '+status;el.textContent=status==='published'?'Publicado':status==='draft'?'Rascunho':'Novo';}
function reportsFillDraft(r){
  if(!r)return;RP_REPORT_DOCUMENT_ID=r.id||null;reportsSetDocumentStatus(r.status||'draft');
  const values={ 'rp-doc-client':r.client_id,'rp-doc-title':r.title,'rp-doc-subtitle':r.subtitle,'rp-doc-presentation':r.presentation,'rp-doc-methodology-text':r.methodology,'rp-doc-summary-text':r.executive_summary };
  Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&value!=null)el.value=value;});
  const sec=typeof r.sections==='string'?JSON.parse(r.sections||'{}'):r.sections||{};
  RP_REPORT_DRAFT_SECTIONS=sec;
  RP_REPORT_CROSSINGS=reportsNormalizeCrossings(sec);RP_ACTIVE_CROSSING_ID=RP_REPORT_CROSSINGS[0]?.id||null;reportsSyncActiveCrossing();
  document.querySelectorAll('[data-crossing-question]').forEach(el=>{const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===el.dataset.crossingQuestion);const index=Number(el.dataset.crossingIndex||0);el.value=reportsCrossingQuestionIds(crossing)[index]||'';});
  document.querySelectorAll('[data-crossing-title]').forEach(el=>{const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===el.dataset.crossingTitle);if(crossing)el.value=crossing.title;});
  document.querySelectorAll('[data-crossing-include]').forEach(el=>{const crossing=RP_REPORT_CROSSINGS.find(item=>item.id===el.dataset.crossingInclude);if(crossing)el.checked=crossing.include!==false;});
  const checks={methodology:sec.includeMethodology,overview:sec.includeOverview,cross:sec.includeCross,summary:sec.includeSummary};
  Object.entries(checks).forEach(([k,value])=>{const el=document.getElementById('rp-doc-'+k);if(el&&value!=null)el.checked=!!value;});
  const period=document.getElementById('rp-doc-period');if(period&&sec.period!=null)period.value=sec.period;
  reportsUpdateCrossSelectionSummary();
}
async function reportsLoadDraft(){
  if(RP_REPORT_DRAFT_HYDRATED)return;
  const survey=reportsCurrentSurvey(),clientId=reportsDocValue('rp-doc-client');if(!survey||!clientId||!sb?.rpc){RP_REPORT_DRAFT_HYDRATED=true;return;}
  try{const {data,error}=await sb.rpc('report_document_latest',{p_survey_id:survey.id,p_client_id:clientId});if(error)throw error;reportsFillDraft(Array.isArray(data)?data[0]:data);}catch(ex){/* migration ainda não aplicada: o editor continua utilizável localmente */}
  RP_REPORT_DRAFT_HYDRATED=true;reportsUpdateCrossSelectionSummary();
}
function reportsDocClientChanged(){RP_REPORT_DOCUMENT_ID=null;RP_CROSS_QUESTION_IDS=[];RP_REPORT_CROSSINGS=[];RP_ACTIVE_CROSSING_ID=null;RP_REPORT_DRAFT_SECTIONS=null;RP_REPORT_CROSS_ANALYSIS_CACHE={};RP_REPORT_DRAFT_HYDRATED=false;reportsSetDocumentStatus('new');reportsLoadDraft();}
async function reportsSaveDraft(silent=false){
  const p=reportsDocPayload();
  if(!p.surveyId||!p.clientId){if(!silent)reportsDocFeedback('Selecione o cliente vinculado à pesquisa antes de salvar.','warn');return null;}
  if(!p.title){if(!silent)reportsDocFeedback('Informe um título para o relatório.','warn');return null;}
  try{
    const {data,error}=await sb.rpc('report_document_save',{p_report_id:RP_REPORT_DOCUMENT_ID,p_survey_id:p.surveyId,p_client_id:p.clientId,p_title:p.title,p_subtitle:p.subtitle,p_presentation:p.presentation,p_methodology:p.methodology,p_executive_summary:p.executiveSummary,p_sections:p.sections});
    if(error)throw error;RP_REPORT_DOCUMENT_ID=data;reportsSetDocumentStatus('draft');if(!silent)reportsDocFeedback('Estrutura salva como rascunho.','ok');return data;
  }catch(ex){if(!silent)reportsDocFeedback('Não foi possível salvar. Execute a migration relatorios-pdf-clientes.sql. '+(ex.message||ex),'warn');return null;}
}
function reportsPdfLines(doc,text,x,y,width,lineHeight=5){const lines=doc.splitTextToSize(String(text||''),width);doc.text(lines,x,y);return y+lines.length*lineHeight;}
function reportsPdfHeader(doc,title,subtitle){const W=doc.internal.pageSize.getWidth();doc.setFillColor(15,42,86);doc.rect(0,0,W,18,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('PesquisaPro',16,11);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(subtitle||'Relatório de pesquisa',W-16,11,{align:'right'});doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(title||'Relatório de resultados',16,31);return 42;}
function reportsPdfFooter(doc){const pages=doc.internal.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();doc.setDrawColor(220,228,238);doc.line(16,H-12,W-16,H-12);doc.setTextColor(100,116,139);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('PesquisaPro · documento gerado pela plataforma',16,H-6);doc.text('Página '+i+' de '+pages,W-16,H-6,{align:'right'});}}
function surveyFormPdfData(source){
  const data=source||{};
  return {
    name:String(data.name||'Pesquisa sem nome'),tipo:String(data.tipo||'—'),dataIni:data.dataIni||'',dataFim:data.dataFim||'',
    abrangencia:data.abrangencia||'estadual',estados:Array.isArray(data.estados)?data.estados:[],cidades:data.cidades||{},
    pop:Number(data.pop)||0,questions:Array.isArray(data.questions)?data.questions.map((q,index)=>({
      text:String(q.text||''),type:q.type||'single',opts:Array.isArray(q.opts)?q.opts.map(v=>String(v??'')):[],
      endsInterview:Array.isArray(q.endsInterview)?q.endsInterview.map(Boolean):[],
      fields:Array.isArray(q.fields)?q.fields.map(field=>({label:String(field.label||''),type:field.type||'open',options:Array.isArray(field.options)?field.options.map(v=>String(v??'')):[]})):[],
    })):[],clientes:Array.isArray(data.clientes)?data.clientes.map(v=>String(v||'')).filter(Boolean):[]
  };
}
function surveyFormPdfGeo(data){
  const label=ABRANGENCIA_LABELS[data.abrangencia]||data.abrangencia||'—';
  const states=data.estados.join(', ');
  const cities=Object.entries(data.cidades||{}).flatMap(([uf,list])=>(Array.isArray(list)?list:[]).map(city=>city+(data.estados.length>1?' / '+uf:'')));
  const location=[label,states,cities.length?cities.length+' cidade'+(cities.length===1?'':'s'):null].filter(Boolean);
  return location.join(' · ')||'—';
}
function surveyFormPdfQuestionKind(q){return Q_TYPES[q.type]||q.type||'Pergunta';}
function surveyFormPdfPage(doc,y,title,subtitle){
  const H=doc.internal.pageSize.getHeight();
  if(y+20>H-20){doc.addPage();return reportsPdfHeader(doc,title,subtitle);}
  return y;
}
function surveyFormPdfWriteLines(doc,text,x,y,width,size=10,lineHeight=5){
  doc.setFontSize(size);const lines=doc.splitTextToSize(String(text||''),width);doc.text(lines,x,y,{lineHeightFactor:lineHeight/size});return y+(lines.length*lineHeight);
}
function surveyFormPdfCover(doc,data,logoData){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=16,bodyW=W-(M*2);
  doc.setFillColor(15,42,86);doc.rect(0,0,W,H,'F');
  if(logoData){const logoW=116,logoH=logoW*(248/960);doc.addImage(logoData,'PNG',M,22,logoW,logoH,undefined,'FAST');}
  else{doc.setFillColor(37,99,235);doc.roundedRect(M,25,70,11,5.5,5.5,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('PesquisaPro',M+35,32.5,{align:'center'});}
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(27);
  const titleLines=doc.splitTextToSize(data.name,bodyW);doc.text(titleLines.slice(0,4),M,78,{lineHeightFactor:1.08});
  const subtitleY=78+(Math.min(titleLines.length,4)*29)+14;doc.setTextColor(219,234,254);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('Formulário de pesquisa',M,subtitleY);
  doc.setDrawColor(96,165,250);doc.setLineWidth(.5);doc.line(M,subtitleY+12,W-M,subtitleY+12);
  const metaY=subtitleY+28;doc.setFillColor(24,57,110);doc.roundedRect(M,metaY,bodyW,88,4,4,'F');
  const meta=[['TIPO',data.tipo],['PERÍODO',(data.dataIni?fmtDataBR(data.dataIni):'—')+' a '+(data.dataFim?fmtDataBR(data.dataFim):'—')],['ABRANGÊNCIA',surveyFormPdfGeo(data)],['PERGUNTAS',String(data.questions.length)],['CLIENTE(S)',data.clientes.length?data.clientes.join(', '):'A definir']];
  let my=metaY+12;meta.forEach(([label,value])=>{doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(label,M+8,my);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10.5);const lines=doc.splitTextToSize(String(value||'—'),bodyW-16).slice(0,2);doc.text(lines,M+8,my+7);my+=15+(lines.length>1?5:0);});
  doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Documento preparado na plataforma PesquisaPro para revisão e envio ao cliente.',M,H-24,{maxWidth:bodyW});
}
function surveyFormPdfWriteQuestion(doc,data,q,index,y){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=16,bodyW=W-(M*2),title='Formulário da pesquisa',subtitle=data.name;
  y=surveyFormPdfPage(doc,y,title,subtitle);
  const questionTitle=(index+1)+'. '+(q.text||'(pergunta sem texto)');
  doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(11);
  const titleLines=doc.splitTextToSize(questionTitle,bodyW);if(y+titleLines.length*5+15>H-20){doc.addPage();y=reportsPdfHeader(doc,title,subtitle);}
  doc.text(titleLines,M,y,{lineHeightFactor:.95});y+=titleLines.length*5+2;
  doc.setTextColor(100,116,139);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(surveyFormPdfQuestionKind(q),M,y);y+=7;
  const optionLine=(label,extra='')=>{
    const text=String(label||'')+(extra?'  · '+extra:'');const lines=doc.splitTextToSize(text,bodyW-13);if(y+lines.length*4.5+4>H-20){doc.addPage();y=reportsPdfHeader(doc,title,subtitle);}
    doc.setDrawColor(51,65,85);doc.setLineWidth(.45);doc.rect(M+3,y-3.4,3.2,3.2,'S');
    doc.setTextColor(51,65,85);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(lines,M+9,y,{lineHeightFactor:.9});y+=lines.length*4.5+2;
  };
  if(Q_HAS_OPTS(q.type)){
    q.opts.filter(option=>option.trim()).forEach((option,oi)=>optionLine(option,q.endsInterview[oi]?'encerrar entrevista':''));
  }else if(q.type==='pair'){
    const fields=q.fields.length===2?q.fields:DEFAULT_PAIR_FIELDS();fields.forEach((field,fi)=>{y=surveyFormPdfPage(doc,y,title,subtitle);doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text((fi+1)+'. '+(field.label||'Resposta '+(fi+1)),M+3,y);y+=6;if(Q_CLOSED_FIELD_TYPES.includes(field.type)){(field.options||[]).filter(option=>option.trim()).forEach(option=>optionLine(option));}else{doc.setDrawColor(148,163,184);doc.line(M+3,y, W-M-3,y);y+=9;}});
  }else if(q.type==='scale'){optionLine('Péssima    ① ② ③ ④ ⑤    Ótima');}
  else if(q.type==='scale10'){optionLine('Péssima    1  2  3  4  5  6  7  8  9  10    Ótima');}
  else if(q.type==='nps'){optionLine('0  1  2  3  4  5  6  7  8  9  10');}
  else if(q.type==='open'){doc.setDrawColor(148,163,184);for(let i=0;i<4;i++){doc.line(M+3,y,W-M-3,y);y+=8;}}
  else if(q.type==='number'){optionLine('Resposta numérica: ________________________________');}
  else if(q.type==='date'){optionLine('Data: ____ / ____ / ______');}
  doc.setDrawColor(226,232,240);doc.line(M,y+3,W-M,y+3);return y+12;
}
async function surveyFormPdfDownload(index){
  try{
    let source;
    if(index==null){wizSave();source=JSON.parse(JSON.stringify(WIZ.data));}
    else source=SURVEYS[Number(index)];
    const data=surveyFormPdfData(source);
    if(!data.questions.length){alert('Adicione pelo menos uma pergunta ao formulário antes de gerar o PDF.');return;}
    await loadLocalAsset('jspdf');const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('Gerador PDF indisponível.');
    const logoData=await reportsLoadCoverLogo();const doc=new jsPDF({unit:'mm',format:'a4'});
    surveyFormPdfCover(doc,data,logoData);doc.addPage();let y=reportsPdfHeader(doc,'Formulário da pesquisa',data.name);
    doc.setTextColor(51,65,85);doc.setFont('helvetica','normal');doc.setFontSize(9.5);y=surveyFormPdfWriteLines(doc,'Este documento reproduz as perguntas e opções cadastradas na PesquisaPro para revisão e envio ao cliente.',16,y,178,9.5,4.8)+10;
    data.questions.forEach((q,qi)=>{y=surveyFormPdfWriteQuestion(doc,data,q,qi,y);});reportsPdfFooter(doc);
    const safe=data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'pesquisa';
    const url=URL.createObjectURL(doc.output('blob'));const a=document.createElement('a');a.href=url;a.download='formulario-pesquisapro-'+safe+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(ex){alert('Não foi possível gerar o PDF do formulário: '+(ex.message||String(ex)));console.error(ex);}
}
async function reportsEnsurePdfData(payload){
  const survey=reportsCurrentSurvey();if(!survey)return;
  if(payload.sections.includeOverview&&RP_REPORT_ANALYSIS_CACHE.surveyId!==survey.id||payload.sections.includeOverview&&!RP_REPORT_ANALYSIS_CACHE.overviewRows.length){const {data,error}=await sb.rpc('survey_report_all_questions',{p_survey_id:survey.id});if(error)throw error;RP_REPORT_ANALYSIS_CACHE.overviewRows=data||[];RP_REPORT_ANALYSIS_CACHE.surveyId=survey.id;}
  const crossings=payload.sections.includeCross?(payload.sections.crossings||[]).filter(crossing=>crossing.include!==false&&crossing.questionIds?.length):[];
  for(const crossing of crossings){const ids=reportsCrossingQuestionIds(crossing);const cached=RP_REPORT_CROSS_ANALYSIS_CACHE[crossing.id];if(!cached||cached.surveyId!==survey.id||JSON.stringify(cached.ids)!==JSON.stringify(ids)){const {data,error}=await sb.rpc('survey_report_cross_tab',{p_survey_id:survey.id,p_question_ids:ids});if(error)throw error;RP_REPORT_CROSS_ANALYSIS_CACHE[crossing.id]={surveyId:survey.id,ids,rows:data||[]};}}
}
function reportsPdfWriteCrossing(doc,crossing,payload,M,bodyW){
  const ids=reportsCrossingQuestionIds(crossing),rows=(RP_REPORT_CROSS_ANALYSIS_CACHE[crossing.id]?.rows)||[],thirdValues=ids.length>=3?reportsCrossOrderedValues(rows,2,ids[2]):[null];
  thirdValues.forEach(thirdValue=>{doc.addPage('a4','landscape');const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),left=16,right=16,tableW=W-left-right;let y=reportsPdfHeader(doc,crossing.title||'Cruzamento',payload.title);const model=reportsCrossMatrixModel(rows,ids,thirdValue);if(model.title){doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(model.title,left,y);y+=7;}doc.setTextColor(51,65,85);doc.setFont('helvetica','normal');doc.setFontSize(8.5);y=reportsPdfLines(doc,ids.map((id,index)=>(index+1)+'. '+reportsQuestionLabel(id)).join(' · '),left,y,tableW,4)+6;
    const totalW=25,rowW=Math.min(62,tableW*.24),colW=(tableW-rowW-totalW)/Math.max(1,model.colValues.length),widths=[rowW,...model.colValues.map(()=>colW),totalW],headers=[...model.colValues,'TOTAL'],headerH=18;let x=left;doc.setFillColor(15,42,86);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(7.2);const headerLabels=[reportsQuestionLabel(ids[0]),...headers];headerLabels.forEach((label,index)=>{doc.setFillColor(15,42,86);doc.setTextColor(255,255,255);doc.rect(x,y,widths[index],headerH,'F');const lines=doc.splitTextToSize(String(label||'—'),widths[index]-4).slice(0,3);doc.text(lines,x+2,y+5,{maxWidth:widths[index]-4});x+=widths[index];});y+=headerH;doc.setFont('helvetica','normal');doc.setFontSize(7.5);model.rowValues.forEach((rowValue,rowIndex)=>{if(y>H-28){doc.addPage('a4','landscape');y=reportsPdfHeader(doc,crossing.title||'Cruzamento',payload.title);y+=4;}x=left;const cells=[rowValue,...model.colValues.map(colValue=>reportsCrossPct(model.counts.get(rowValue+'\u0000'+colValue)||0,model.base)),reportsCrossPct(model.rowTotals.get(rowValue)||0,model.base)];cells.forEach((cell,index)=>{doc.setFillColor(rowIndex%2?248:241,245,249);doc.setTextColor(51,65,85);doc.rect(x,y,widths[index],8,'F');doc.text(String(cell||'—').slice(0,32),x+2,y+5.2,{maxWidth:widths[index]-4});x+=widths[index];});y+=8;});if(y>H-28){doc.addPage('a4','landscape');y=reportsPdfHeader(doc,crossing.title||'Cruzamento',payload.title);y+=4;}x=left;const totalCells=['TOTAL',...model.colValues.map(colValue=>reportsCrossPct(model.colTotals.get(colValue)||0,model.base)),reportsCrossPct([...model.rowTotals.values()].reduce((sum,value)=>sum+value,0),model.base)];totalCells.forEach((cell,index)=>{doc.setFillColor(226,232,240);doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.rect(x,y,widths[index],8,'F');doc.text(String(cell||'—').slice(0,32),x+2,y+5.2,{maxWidth:widths[index]-4});x+=widths[index];});
  });
}
let RP_REPORT_LOGO_DATA_URL=null;
function reportsLoadCoverLogo(){
  if(RP_REPORT_LOGO_DATA_URL)return Promise.resolve(RP_REPORT_LOGO_DATA_URL);
  return fetch('assets/logo-wide.png',{cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error('Logo oficial indisponível');return response.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{RP_REPORT_LOGO_DATA_URL=reader.result;resolve(RP_REPORT_LOGO_DATA_URL);};reader.onerror=()=>reject(reader.error||new Error('Não foi possível ler a logo oficial'));reader.readAsDataURL(blob);})).catch(()=>null);
}
function reportsPdfCover(doc,payload,survey,client,logoData){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=16,bodyW=W-(M*2);
  doc.setFillColor(15,42,86);doc.rect(0,0,W,H,'F');
  if(logoData){const logoW=116,logoH=logoW*(248/960);doc.addImage(logoData,'PNG',M,22,logoW,logoH,undefined,'FAST');}else{doc.setFillColor(37,99,235);doc.roundedRect(M,25,70,11,5.5,5.5,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('PesquisaPro',M+35,32.5,{align:'center'});}
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(27);const titleLines=doc.splitTextToSize(payload.title||'Relatório de resultados',bodyW);const titleY=76;doc.text(titleLines.slice(0,4),M,titleY,{lineHeightFactor:1.08});
  const subtitleY=titleY+(Math.min(titleLines.length,4)*29)+13;doc.setFont('helvetica','normal');doc.setFontSize(13);doc.setTextColor(219,234,254);const subtitleLines=doc.splitTextToSize(payload.subtitle||'Resultados e análise',bodyW-8);doc.text(subtitleLines.slice(0,3),M,subtitleY,{lineHeightFactor:1.25});
  const dividerY=subtitleY+(Math.min(subtitleLines.length,3)*16)+10;doc.setDrawColor(96,165,250);doc.setLineWidth(.5);doc.line(M,dividerY,W-M,dividerY);
  const metaY=dividerY+18;doc.setFillColor(24,57,110);doc.roundedRect(M,metaY,bodyW,56,4,4,'F');doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text('CLIENTE',M+8,metaY+12);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(String(client?.company||client?.name||'—'),M+8,metaY+20,{maxWidth:bodyW-16});doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.text('PESQUISA',M+8,metaY+33);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(String(survey?.name||'—'),M+8,metaY+41,{maxWidth:bodyW-16});if(payload.period){doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.text('PERÍODO',M+105,metaY+33);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(String(payload.period),M+105,metaY+41,{maxWidth:bodyW-113});}
  doc.setTextColor(191,219,254);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Relatório preparado na plataforma de pesquisa e coleta de campo PesquisaPro',M,H-24,{maxWidth:bodyW});
}
async function reportsCreateMultiCrossPdfBlob(payload){
  await loadLocalAsset('jspdf');const jsPDF=window.jspdf?.jsPDF;if(!jsPDF)throw new Error('Gerador PDF indisponível.');
  const logoData=await reportsLoadCoverLogo();const doc=new jsPDF({unit:'mm',format:'a4'}),survey=reportsCurrentSurvey(),client=reportsClientsForSurvey(survey).find(c=>c.id===payload.clientId),W=210,M=16,bodyW=178;
  reportsPdfCover(doc,payload,survey,client,logoData);doc.addPage();let y=reportsPdfHeader(doc,payload.title,payload.subtitle);
  if(payload.presentation){doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('Apresentação',M,y);y+=9;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,65,85);y=reportsPdfLines(doc,payload.presentation,M,y,bodyW,5)+8;}
  if(payload.sections.includeMethodology){doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(15,42,86);doc.text('Ficha técnica e metodologia',M,y);y+=9;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(51,65,85);y=reportsPdfLines(doc,payload.methodology,M,y,bodyW,5)+8;}
  if(payload.sections.includeSummary&&payload.executiveSummary){doc.setFillColor(239,246,255);doc.roundedRect(M,y,bodyW,34,3,3,'F');doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('Síntese executiva',M+6,y+9);doc.setFont('helvetica','normal');doc.setTextColor(51,65,85);doc.setFontSize(9.5);reportsPdfLines(doc,payload.executiveSummary,M+6,y+17,bodyW-12,4.8);y+=45;}
  if(payload.sections.includeOverview){doc.addPage();y=reportsPdfHeader(doc,'Resultados por pergunta',payload.title);const byQ={};(RP_REPORT_ANALYSIS_CACHE.overviewRows||[]).forEach(row=>(byQ[row.question_id]||(byQ[row.question_id]=[])).push(row));for(const [qi,q] of reportsCurrentQuestions().entries()){const rows=byQ[q.dbId]||[];if(!rows.length)continue;if(y>250){doc.addPage();y=reportsPdfHeader(doc,'Resultados por pergunta',payload.title);}doc.setTextColor(15,42,86);doc.setFont('helvetica','bold');doc.setFontSize(11);y=reportsPdfLines(doc,(qi+1)+'. '+q.text,M,y,bodyW,5)+3;const base=Number(rows[0]?.valid_base)||rows.reduce((sum,row)=>sum+Number(row.cnt||0),0);for(const row of rows){const cnt=Number(row.cnt||0),pct=base?Math.round(cnt/base*100):0;doc.setTextColor(51,65,85);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(String(row.value_label||'(sem resposta)'),M,y);doc.text(cnt.toLocaleString('pt-BR')+' · '+pct+'%',194,y,{align:'right'});doc.setFillColor(226,232,240);doc.roundedRect(M,y+2,bodyW,3,1,1,'F');doc.setFillColor(37,99,235);doc.roundedRect(M,y+2,Math.max(1,bodyW*Math.min(100,pct)/100),3,1,1,'F');y+=11;}y+=7;}}
  const crossings=payload.sections.includeCross?(payload.sections.crossings||[]).filter(crossing=>crossing.include!==false&&reportsCrossingQuestionIds(crossing).length):[];crossings.forEach(crossing=>reportsPdfWriteCrossing(doc,crossing,payload,M,bodyW));reportsPdfFooter(doc);return {blob:doc.output('blob'),payload};
}
async function reportsCreatePdfBlob(){
  const payload=reportsDocPayload();if(!payload.surveyId)throw new Error('Selecione uma pesquisa válida.');
  await reportsEnsurePdfData(payload);return reportsCreateMultiCrossPdfBlob(payload);
}
async function reportsGeneratePdf(){
  reportsDocFeedback('Gerando PDF com os blocos selecionados…');try{const id=await reportsSaveDraft(true);if(!id)throw new Error('Salve uma estrutura com cliente e título antes de gerar.');const result=await reportsCreatePdfBlob();const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download='relatorio-pesquisapro-'+new Date().toISOString().slice(0,10)+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);reportsDocFeedback('PDF gerado e baixado. Revise o arquivo antes de publicar ao cliente.','ok');}catch(ex){reportsDocFeedback(ex.message||String(ex),'warn');}}
async function reportsFinalizeAndPublish(){
  reportsDocFeedback('Salvando, gerando e publicando o PDF…');try{const id=await reportsSaveDraft(true);if(!id)throw new Error('Salve uma estrutura com cliente e título antes de finalizar.');const result=await reportsCreatePdfBlob();const path='reports/'+id+'/'+Date.now()+'.pdf';const {error:uploadError}=await sb.storage.from('client-reports').upload(path,result.blob,{upsert:true,contentType:'application/pdf'});if(uploadError)throw uploadError;const {error:publishError}=await sb.rpc('report_document_publish',{p_report_id:id,p_pdf_path:path});if(publishError)throw publishError;reportsSetDocumentStatus('published');reportsDocFeedback('Relatório finalizado e disponibilizado ao cliente.','ok');}catch(ex){reportsDocFeedback(ex.message||String(ex),'warn');}}
function reportsExportCurrent(){
  const table=document.querySelector('#rp-output table');if(!table){alert('Gere um relatório antes de exportar.');return;}
  const lines=[...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(cell=>'"'+String(cell.textContent||'').replace(/"/g,'""').trim()+'"').join(';'));
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='relatorio-pesquisa-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ============ USERS (todos os perfis: pesquisador, cliente, adm, vendedor, indicador) ============ */
let USERS=[
  {name:'Admin Master',cpf:'000.000.000-00',birth:'1980-01-01',email:'admin@pesquisapro.com.br',phone:'(31) 99999-0000',addr:'Belo Horizonte/MG',role:'admin',doc:'RG_admin.pdf',status:'ativo'},
  {name:'Carla Menezes',cpf:'111.111.111-11',birth:'1988-05-12',email:'carla@pesquisapro.com.br',phone:'(38) 98888-1111',addr:'Montes Claros/MG',role:'coord',doc:'CNH_carla.jpg',status:'ativo'},
  {name:'Rafael Dias',cpf:'222.222.222-22',birth:'1985-09-03',email:'rafael@pesquisapro.com.br',phone:'(31) 97777-2222',addr:'Belo Horizonte/MG',role:'gerente',doc:'RG_rafael.pdf',status:'ativo'},
  {name:'João Pereira',cpf:'123.456.789-00',birth:'1995-03-21',email:'joao@email.com',phone:'(34) 96666-3333',cidade:'Uberlândia/MG',rua:'Av. Rondon Pacheco',numero:'1200',cep:'38400-100',role:'pesq',docFoto:'CNH_joao.jpg',docComprovante:'comprovante_joao.pdf',cidadesAtuacao:['Uberlândia/MG','Uberaba/MG'],status:'ativo',pixKey:'123.456.789-00',pixDoc:'123.456.789-00',pixBank:'Banco do Brasil',pixAg:'1234',pixAcc:'56789-0'},
  {name:'Maria Souza',cpf:'333.333.333-33',birth:'1992-11-08',email:'maria@email.com',phone:'(33) 95555-4444',cidade:'Diamantina/MG',rua:'',numero:'',cep:'',role:'pesq',docFoto:'',docComprovante:'',cidadesAtuacao:['Diamantina/MG'],status:'pendente'},
  {name:'Prefeitura de Uberlândia',company:'Prefeitura de Uberlândia',cpfCnpj:'18.000.000/0001-00',pfpj:'pj',contact:'Sec. de Comunicação',email:'comunica@uberlandia.mg.gov.br',phone:'(34) 3000-1000',cidade:'Uberlândia/MG',rua:'',numero:'',cep:'',role:'cliente',surveys:['Pesquisa Eleitoral MG · 2026'],status:'ativo',resultsReleased:false},
  {name:'Campanha Dep. Estadual XYZ',company:'Campanha Dep. Estadual XYZ',cpfCnpj:'29.111.111/0001-11',pfpj:'pj',contact:'João Coordenador',email:'contato@campanhaxyz.com.br',phone:'(31) 99999-1234',cidade:'Belo Horizonte/MG',rua:'',numero:'',cep:'',role:'cliente',surveys:['Avaliação de gestão · Capital'],status:'ativo',resultsReleased:false},
  {name:'Comércio Local Ltda',company:'Comércio Local Ltda',cpfCnpj:'33.222.222/0001-22',pfpj:'pj',contact:'Maria Gestora',email:'maria@comerciolocal.com',phone:'(33) 98888-5678',cidade:'Diamantina/MG',rua:'',numero:'',cep:'',role:'cliente',surveys:[],status:'prospecto',resultsReleased:false},
  {name:'Fernando Ribeiro',cpf:'444.111.222-33',phone:'(31) 98888-2020',email:'fernando.ribeiro@pesquisapro.com.br',cidade:'Belo Horizonte/MG',role:'admpro',status:'ativo'},
  {name:'Bruno Salgado',cpf:'555.222.333-44',phone:'(31) 97777-3030',email:'bruno.salgado@pesquisapro.com.br',cidade:'Contagem/MG',role:'vendedor',status:'ativo'},
  {name:'Camila Duarte',cpf:'666.333.444-55',phone:'(31) 96666-4040',email:'camila.duarte@pesquisapro.com.br',cidade:'Betim/MG',role:'indicador',status:'ativo'},
];
const ROLE_LABEL={admin:'Administrador',coord:'Coordenador',gerente:'Gerente',pesq:'Pesquisador',cliente:'Cliente',admpro:'ADM PesquisaPro',vendedor:'Vendedor',indicador:'Indicador de Clientes',recrutador:'Recrutador'};
const ROLE_PILL={
  admin:'<span class="pill" style="background:var(--purple-l);color:var(--purple)">Administrador</span>',
  coord:'<span class="pill pill-blue">Coordenador</span>',
  gerente:'<span class="pill pill-amber">Gerente</span>',
  pesq:'<span class="pill pill-gray">Pesquisador</span>',
  cliente:'<span class="pill" style="background:#eef2ff;color:#4338ca">Cliente</span>',
  admpro:'<span class="pill" style="background:var(--purple-l);color:var(--purple)">ADM PesquisaPro</span>',
  vendedor:'<span class="pill pill-blue">Vendedor</span>',
  indicador:'<span class="pill pill-amber">Indicador de Clientes</span>',
  recrutador:'<span class="pill" style="background:#ecfeff;color:#0f766e">Recrutador</span>',
};
/* abas de gestão da tela Usuários — cada perfil é gerenciado separadamente */
const USER_TABS=[
  {key:'pesq',label:'Pesquisadores'},
  {key:'cliente',label:'Clientes'},
  {key:'admpro',label:'ADM PesquisaPro'},
  {key:'vendedor',label:'Vendedores'},
  {key:'indicador',label:'Indicadores de Clientes'},
  {key:'recrutador',label:'Recrutadores'},
  {key:'staff',label:'Administração'},
];
const USER_TAB_ROLES={pesq:['pesq'],cliente:['cliente'],admpro:['admpro'],vendedor:['vendedor'],indicador:['indicador'],recrutador:['recrutador'],staff:['admin','coord','gerente']};
let USER_TAB='pesq';
let USER_SEARCH='';
let USER_GENERAL_FILTERS={status:'',city:''};
let USER_RESEARCHER_FILTERS={state:'',city:'',schooling:''};
function normalizeUserSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function compactUserSearch(value){return normalizeUserSearch(value).replace(/[^a-z0-9]/g,'');}
function researcherIsAvailable(user){return user?.role==='pesq'&&user.status==='ativo'&&!!user.docFoto&&!!user.docComprovante&&researcherLocations(user).length>0;}
function userSearchText(user){return [user.name,user.email,user.cpf,user.cpfCnpj,user.phone,user.contact,user.cidade,user.addr,(user.cidadesAtuacao||[]).join(' '),schoolingLabel(user.escolaridade),ROLE_LABEL[user.role]||user.role].filter(Boolean).join(' ');}
function userMatchesSearch(user){
  const query=normalizeUserSearch(USER_SEARCH);
  if(!query)return true;
  const text=normalizeUserSearch(userSearchText(user));
  const compactQuery=compactUserSearch(USER_SEARCH);
  const compactText=compactUserSearch(userSearchText(user));
  return text.includes(query)||(compactQuery&&compactText.includes(compactQuery));
}
function userCitySet(user){
  return new Set([user?.cidade,user?.addr,...(user?.cidadesAtuacao||[])].filter(Boolean).flatMap(value=>{const part=locationParts(value);return part?[normalizeUserSearch(part.city),normalizeUserSearch(String(part.city)+'/'+String(part.uf||''))]:[]}).filter(Boolean));
}
function userMatchesGeneralFilters(user,tab=USER_TAB){
  if(USER_GENERAL_FILTERS.status&&user?.status!==USER_GENERAL_FILTERS.status)return false;
  if(USER_GENERAL_FILTERS.city&&!userCitySet(user).has(USER_GENERAL_FILTERS.city))return false;
  return true;
}
function userMatchesResearcherFilters(user,tab=USER_TAB){
  if(tab!=='pesq'||user?.role!=='pesq')return true;
  const filters=USER_RESEARCHER_FILTERS,states=researcherStateSet(user),cities=researcherCitySet(user);
  return (!filters.state||states.has(filters.state))&&(!filters.city||cities.has(filters.city))&&(!filters.schooling||user.escolaridade===filters.schooling);
}
function usersInTab(tab){const roles=USER_TAB_ROLES[tab]||[];return USERS.map((u,i)=>({u,i})).filter(x=>roles.includes(x.u.role)&&userMatchesSearch(x.u)&&userMatchesGeneralFilters(x.u,tab)&&userMatchesResearcherFilters(x.u,tab));}
function userGeneralFilterOptions(tab){
  const roles=USER_TAB_ROLES[tab]||[],base=USERS.filter(user=>roles.includes(user.role)),cities=new Map();
  base.forEach(user=>[user.cidade,user.addr,...(user.cidadesAtuacao||[])].filter(Boolean).forEach(value=>{const part=locationParts(value);if(part?.city){const key=normalizeUserSearch(part.city);cities.set(key,part.city+(part.uf?'/'+part.uf:''));}}));
  return {cities:[...cities.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))};
}
const USER_STATUS_LABELS={ativo:'Ativos',pendente:'Pendentes',prospecto:'Prospectos',encerrado:'Encerrados'};
function userGeneralFilterSet(key,value){USER_GENERAL_FILTERS[key]=value||'';go('users');}
function userGeneralFilterClear(){USER_GENERAL_FILTERS={status:'',city:''};go('users');}
function userClearAllFilters(){USER_SEARCH='';USER_GENERAL_FILTERS={status:'',city:''};USER_RESEARCHER_FILTERS={state:'',city:'',schooling:''};go('users');}
function userGeneralFiltersMarkup(tab){
  const {cities}=userGeneralFilterOptions(tab),f=USER_GENERAL_FILTERS,active=!!(f.status||f.city),base=USERS.filter(user=>(USER_TAB_ROLES[tab]||[]).includes(user.role)),statuses=[...new Set(base.map(user=>user.status).filter(Boolean))];
  return `<div class="user-filter-panel"><div class="user-filter-title"><div><b>Refinar usuários</b><span>Combine a busca textual com situação e cidade.</span></div><span class="user-filter-result"><strong>${usersInTab(tab).length}</strong> resultado${usersInTab(tab).length===1?'':'s'}</span></div><div class="user-filter-grid"><select class="inp" aria-label="Filtrar por situação" onchange="userGeneralFilterSet('status',this.value)"><option value="">Todas as situações</option>${statuses.map(status=>`<option value="${esc(status)}" ${f.status===status?'selected':''}>${esc(USER_STATUS_LABELS[status]||status)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar por cidade" onchange="userGeneralFilterSet('city',this.value)"><option value="">Todas as cidades</option>${cities.map(([value,label])=>`<option value="${esc(value)}" ${f.city===value?'selected':''}>${esc(label)}</option>`).join('')}</select>${active?'<button class="btn btn-out" type="button" onclick="userGeneralFilterClear()">Limpar filtros</button>':''}</div></div>`;
}
function signupMatchesUsersView(signup){return userMatchesSearch(signup)&&userMatchesGeneralFilters(signup,'pesq')&&userMatchesResearcherFilters(signup,'pesq');}
function userResearcherFilterOptions(){
  const list=pesqUsers(),states=new Set(),cities=new Map();
  list.forEach(user=>researcherLocations(user).forEach(part=>{if(part.uf)states.add(part.uf);if(part.city)cities.set(normalizeUserSearch(part.city),part.city+(part.uf?'/'+part.uf:''));}));
  return {states:[...states].sort(),cities:[...cities.entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))};
}
function userResearcherFilterSet(key,value){USER_RESEARCHER_FILTERS[key]=value||'';go('users');}
function userResearcherFilterClear(){USER_RESEARCHER_FILTERS={state:'',city:'',schooling:''};go('users');}
function userResearcherFiltersMarkup(list){
  const {states,cities}=userResearcherFilterOptions(),f=USER_RESEARCHER_FILTERS,available=list.filter(({u})=>researcherIsAvailable(u)).length,active=!!(f.state||f.city||f.schooling);
  return `<div class="researcher-filter-panel"><div class="researcher-filter-title"><div><b>Filtrar disponibilidade</b><span>Refine por estado, cidade de atuação e escolaridade.</span></div><span class="pill pill-green">${available} disponível${available===1?'':'is'}</span></div><div class="researcher-filter-grid"><select class="inp" aria-label="Filtrar por estado" onchange="userResearcherFilterSet('state',this.value)"><option value="">Todos os estados</option>${states.map(state=>`<option value="${esc(state)}" ${f.state===state?'selected':''}>${esc(state)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar por cidade" onchange="userResearcherFilterSet('city',this.value)"><option value="">Todas as cidades</option>${cities.map(([value,label])=>`<option value="${esc(value)}" ${f.city===value?'selected':''}>${esc(label)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar por escolaridade" onchange="userResearcherFilterSet('schooling',this.value)"><option value="">Todas as escolaridades</option>${SCHOOLING_OPTIONS.map(([value,label])=>`<option value="${value}" ${f.schooling===value?'selected':''}>${label}</option>`).join('')}</select>${active?'<button class="btn btn-out" type="button" onclick="userResearcherFilterClear()">Limpar filtros</button>':''}</div></div>`;
}
function userSearchInput(value){
  USER_SEARCH=value||'';
  go('users');
  const input=document.getElementById('user-search');
  if(input){input.focus();input.setSelectionRange(USER_SEARCH.length,USER_SEARCH.length);}
}
function userClearSearch(){USER_SEARCH='';go('users');document.getElementById('user-search')?.focus();}
async function userSendPasswordReset(idx){
  const user=USERS[idx];
  if(!user)return;
  if(!user.email){alert('Este usuário não possui e-mail cadastrado. Atualize o cadastro antes de enviar a redefinição.');return;}
  if(!confirm('Enviar um link de redefinição de senha para '+user.email+'? A senha atual não será exibida.'))return;
  try{
    const {error}=await sb.auth.resetPasswordForEmail(user.email,{redirectTo:passwordResetRedirect()});
    if(error)throw new Error(error.message);
    alert('Link de redefinição enviado para o e-mail cadastrado. O usuário deverá abrir a mensagem e criar uma nova senha.');
  }catch(ex){alert('Não foi possível enviar a redefinição: '+ex.message);}
}
function clienteUsers(){return USERS.filter(u=>u.role==='cliente');}
function pesqUsers(){return USERS.filter(u=>u.role==='pesq');}
const SCHOOLING_OPTIONS=[
  ['fundamental_incompleto','Ensino fundamental incompleto'],
  ['fundamental_completo','Ensino fundamental completo'],
  ['medio_incompleto','Ensino médio incompleto'],
  ['medio_completo','Ensino médio completo'],
  ['superior_incompleto','Ensino superior incompleto'],
  ['superior_completo','Ensino superior completo'],
  ['pos_graduacao','Pós-graduação / especialização'],
  ['mestrado','Mestrado'],
  ['doutorado','Doutorado'],
];
const SCHOOLING_LABELS=Object.fromEntries(SCHOOLING_OPTIONS);
function schoolingLabel(value){return SCHOOLING_LABELS[value]||String(value||'Não informada');}
function locationParts(value){
  const raw=String(value||'').trim();if(!raw)return null;
  const match=raw.match(/(?:\/|,\s*|-\s*)([A-Za-z]{2})\s*$/);
  if(!match)return {city:raw,uf:''};
  return {city:raw.slice(0,match.index).trim().replace(/[,-]\s*$/,''),uf:match[1].toUpperCase()};
}
function researcherLocations(user){return [...new Set([user?.cidade,...(user?.cidadesAtuacao||[])].filter(Boolean).map(locationParts).filter(Boolean).map(part=>({city:part.city,uf:part.uf,raw:String(part.city)+(part.uf?'/'+part.uf:'')})))];}
function researcherStateSet(user){return new Set(researcherLocations(user).map(part=>part.uf).filter(Boolean));}
function researcherCitySet(user){return new Set(researcherLocations(user).map(part=>normalizeUserSearch(part.city)).filter(Boolean));}
let USER_EDIT=null; // index sendo editado, ou 'new', ou null (lista)
let USER_NEW_ROLE='pesq'; // perfil pré-selecionado ao clicar em "+ Novo" numa aba

/* ============ USUÁRIOS — carregamento e gravação no Supabase ============
   USERS continua sendo o array em memória que todo o resto da tela usa
   (userList/userView/userForm etc. não mudam) — só a origem dos dados e o
   destino da gravação passam a ser o banco de verdade, através das funções
   abaixo. Cada usuário carregado ganha um campo extra `id` (o UUID da linha
   em profiles/auth.users), usado para localizar a linha certa ao salvar. */
let USERS_LOADED=false;
let USERS_LOADING=false;
let PROFILE_SCHOOLING_SCHEMA_MISSING=false;

function staffRoleOf(role){return ['admin','coord','gerente'].includes(role);}
function lightRoleOf(role){return ['admpro','vendedor','indicador','recrutador'].includes(role);}

function profileRowToUser(row){
  const base={id:row.id,name:row.name,email:row.email||'',phone:row.phone||'',role:row.role,status:row.status,commissionRate:Number(row.commission_rate)||0,commissionRateWithIndicator:Number(row.commission_rate_with_indicator)||0,recruiterCode:row.recruiter_code||'',recruiterCaptureValue:Number(row.recruiter_capture_value)||0};
  if(staffRoleOf(row.role))return {...base,cpf:row.cpf||'',birth:row.birth||'',addr:row.cidade||'',doc:row.doc_url||''};
  if(row.role==='cliente')return {...base,company:row.name,cpfCnpj:row.cpf_cnpz||row.cpf_cnpj||'',pfpj:row.pf_pj||'pj',birth:row.birth||'',
    contact:row.contact_person||'',cidade:row.cidade||'',rua:row.rua||'',numero:row.numero||'',cep:row.cep||'',
    surveys:[],resultsReleased:!!row.results_released};
  if(row.role==='pesq')return {...base,cpf:row.cpf||'',birth:row.birth||'',escolaridade:row.escolaridade||'',cidade:row.cidade||'',rua:row.rua||'',numero:row.numero||'',cep:row.cep||'',
    docFoto:row.doc_foto_url||'',docComprovante:row.doc_comprovante_url||'',
    cidadesAtuacao:(row.profile_cidades_atuacao||[]).map(c=>c.cidade),
    pixKey:row.pix_key||'',pixDoc:row.pix_doc||'',pixBank:row.pix_bank||'',pixAg:row.pix_ag||'',pixAcc:row.pix_acc||''};
  return {...base,cpf:row.cpf||'',cidade:row.cidade||''}; // admpro, vendedor, indicador
}
function isValidUuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function userIdForEdit(index){const id=USERS[index]?.id;if(!isValidUuid(id)){alert('Este cadastro não possui um identificador válido no banco. Nenhum dado foi alterado. Recarregue a lista ou peça a reconciliação do cadastro antes de editar.');return null;}return id;}
function userToProfileRow(rec,role){
  const row={role,status:rec.status||'ativo',name:rec.name,email:rec.email||null,phone:rec.phone||null};
  if(staffRoleOf(role)){row.cpf=rec.cpf||null;row.birth=rec.birth||null;row.cidade=rec.addr||null;row.doc_url=rec.doc||null;}
  else if(role==='cliente'){row.cpf_cnpj=rec.cpfCnpj||null;row.pf_pj=rec.pfpj||'pj';row.birth=rec.birth||null;row.contact_person=rec.contact||null;
    row.cidade=rec.cidade||null;row.rua=rec.rua||null;row.numero=rec.numero||null;row.cep=rec.cep||null;row.results_released=!!rec.resultsReleased;}
  else if(role==='pesq'){row.cpf=rec.cpf||null;row.birth=rec.birth||null;row.escolaridade=rec.escolaridade||null;row.cidade=rec.cidade||null;row.rua=rec.rua||null;row.numero=rec.numero||null;row.cep=rec.cep||null;
    row.doc_foto_url=rec.docFoto||null;row.doc_comprovante_url=rec.docComprovante||null;
    row.pix_key=rec.pixKey||null;row.pix_doc=rec.pixDoc||null;row.pix_bank=rec.pixBank||null;row.pix_ag=rec.pixAg||null;row.pix_acc=rec.pixAcc||null;}
  else{row.cpf=rec.cpf||null;row.cidade=rec.cidade||null;row.commission_rate=Number(rec.commissionRate)||0;row.commission_rate_with_indicator=role==='vendedor'?(Number(rec.commissionRateWithIndicator)||0):0;row.recruiter_capture_value=role==='recrutador'?(Number(rec.recruiterCaptureValue)||0):0;row.recruiter_code=role==='recrutador'?(rec.recruiterCode||null):null;} // admpro, vendedor, indicador, recrutador
  return row;
}
function isSchoolingColumnError(error){return !!error&&/escolaridade|schema cache|column .* does not exist/i.test(error.message||'');}
function profileRowWithoutSchooling(row){const copy={...row};delete copy.escolaridade;return copy;}
async function insertProfileSafe(row){
  let result=await sb.from('profiles').insert(row).select().single();
  if(isSchoolingColumnError(result.error)){PROFILE_SCHOOLING_SCHEMA_MISSING=true;result=await sb.from('profiles').insert(profileRowWithoutSchooling(row)).select().single();}
  return result;
}
async function updateProfileSafe(id,row){
  let result=await sb.from('profiles').update(row).eq('id',id);
  if(isSchoolingColumnError(result.error)){PROFILE_SCHOOLING_SCHEMA_MISSING=true;result=await sb.from('profiles').update(profileRowWithoutSchooling(row)).eq('id',id);}
  return result;
}
async function updateProfileSafeSelect(id,row){
  let result=await sb.from('profiles').update(row).eq('id',id).select().single();
  if(isSchoolingColumnError(result.error)){PROFILE_SCHOOLING_SCHEMA_MISSING=true;result=await sb.from('profiles').update(profileRowWithoutSchooling(row)).eq('id',id).select().single();}
  return result;
}
let _usersLoadPromise=null;
/* `await`-ável de qualquer lugar: se já tem um carregamento em andamento
   (ex.: chamado ao mesmo tempo pelo Painel e pela tela de Pesquisas), quem
   chamar depois espera o mesmo carregamento terminar em vez de disparar
   outro ou seguir em frente com USERS ainda vazio. */
function loadUsersIfNeeded(){
  if(USERS_LOADED)return Promise.resolve();
  if(_usersLoadPromise)return _usersLoadPromise;
  _usersLoadPromise=(async()=>{
    USERS_LOADING=true;
    try{
      let result=await sb.from('profiles').select('id,name,email,phone,role,status,cpf,cpf_cnpj,pf_pj,birth,escolaridade,cidade,rua,numero,cep,contact_person,doc_url,doc_foto_url,doc_comprovante_url,pix_key,pix_doc,pix_bank,pix_ag,pix_acc,results_released,approved_at,commission_rate,commission_rate_with_indicator,recruiter_code,recruiter_capture_value,profile_cidades_atuacao(cidade)').order('created_at',{ascending:false});
      if(result.error&&/escolaridade|schema cache|column .* does not exist/i.test(result.error.message||'')){
        PROFILE_SCHOOLING_SCHEMA_MISSING=true;
        result=await sb.from('profiles').select('id,name,email,phone,role,status,cpf,cpf_cnpj,pf_pj,birth,cidade,rua,numero,cep,contact_person,doc_url,doc_foto_url,doc_comprovante_url,pix_key,pix_doc,pix_bank,pix_ag,pix_acc,results_released,approved_at,commission_rate,commission_rate_with_indicator,recruiter_code,recruiter_capture_value,profile_cidades_atuacao(cidade)').order('created_at',{ascending:false});
      }
      const {data,error}=result;
      if(!error){USERS=(data||[]).map(profileRowToUser);USERS_LOADED=true;}
      else console.error('Erro ao carregar usuários:',error);
    }catch(ex){console.error('Erro de conexão ao carregar usuários:',ex);}
    USERS_LOADING=false;
    _usersLoadPromise=null;
    refreshClientSurveyLinks();
    const onKey=document.querySelector('.nav-item.on');
    const k=onKey&&onKey.dataset.key;
    if(k==='users'||k==='dashboard'||k==='survey-team'||k==='contracts'||k==='recruitment'||k==='communication'){go(k);if(k==='survey-team')setTimeout(teamFilterRows,0);}
  })();
  return _usersLoadPromise;
}
async function syncPesqCidades(profileId,cidades){
  const {error:delErr}=await sb.from('profile_cidades_atuacao').delete().eq('profile_id',profileId);
  if(delErr)throw new Error('Não foi possível salvar as cidades de atuação: '+delErr.message);
  if(cidades&&cidades.length){
    const {error:insErr}=await sb.from('profile_cidades_atuacao').insert(cidades.map(c=>({profile_id:profileId,cidade:c})));
    if(insErr)throw new Error('Não foi possível salvar as cidades de atuação: '+insErr.message);
  }
}
async function createLoginAndProfile(email,password,role,rec){
  const tmp=tempAuthClient();
  const {data,error}=await tmp.auth.signUp({email,password});
  if(error)throw new Error('Não foi possível criar o login: '+error.message);
  if(!data||!data.user)throw new Error('Não foi possível criar o login.');
  const row=userToProfileRow(rec,role);
  row.id=data.user.id;
  const {data:inserted,error:insErr}=await insertProfileSafe(row);
  if(insErr)throw new Error('Login criado, mas não foi possível salvar o perfil: '+insErr.message);
  return inserted;
}
let SIGNUPS=[
  {name:'Ana Botelho',cpf:'444.444.444-44',birth:'1990-07-15',email:'ana.botelho@email.com',phone:'(31) 94444-5555',cidade:'Sete Lagoas/MG',rua:'',numero:'',cep:'',cidadesAtuacao:['Sete Lagoas/MG'],role:'pesq',docFoto:'CNH_ana.jpg',docComprovante:'comprovante_ana.pdf',status:'novo',sent:'há 2h',pixKey:'ana.botelho@email.com',pixDoc:'444.444.444-44',pixBank:'Nubank',pixAg:'0001',pixAcc:'112233-4'},
  {name:'Pedro Nunes',cpf:'555.555.555-55',birth:'1998-02-28',email:'pedro.nunes@email.com',phone:'(35) 93333-6666',cidade:'Poços de Caldas/MG',rua:'',numero:'',cep:'',cidadesAtuacao:['Poços de Caldas/MG'],role:'pesq',docFoto:'',docComprovante:'',status:'novo',sent:'há 5h',pixKey:'',pixDoc:'',pixBank:'',pixAg:'',pixAcc:''},
  {name:'Beatriz Rocha',cpf:'666.666.666-66',birth:'1993-12-09',email:'bia.rocha@email.com',phone:'(34) 92222-7777',cidade:'Uberaba/MG',rua:'',numero:'',cep:'',cidadesAtuacao:['Uberaba/MG'],role:'pesq',docFoto:'RG_bia.pdf',docComprovante:'',status:'diligencia',note:'Foto do documento ilegível',sent:'há 1 dia',pixKey:'666.666.666-66',pixDoc:'666.666.666-66',pixBank:'Caixa',pixAg:'4567',pixAcc:'89012-3'},
];
const SIGNUP_PILL={
  novo:'<span class="pill pill-blue">● Novo</span>',
  diligencia:'<span class="pill pill-amber">● Em diligência</span>',
  aprovado:'<span class="pill pill-green">● Aprovado</span>',
  reprovado:'<span class="pill pill-red">● Reprovado</span>',
};
let SIGNUPS_LOADED=false;
let SIGNUPS_LOAD_PROMISE=null;
function signupRowToLocal(row){return {id:row.id,name:row.name||'',cpf:row.cpf||'',birth:row.birth||'',escolaridade:row.escolaridade||'',email:row.email||'',phone:row.phone||'',cidade:row.cidade||'',rua:row.rua||'',numero:row.numero||'',cep:row.cep||'',cidadesAtuacao:(row.signup_cidades_atuacao||[]).map(c=>c.cidade),role:'pesq',docFoto:row.doc_foto_url||'',docComprovante:row.doc_comprovante_url||'',pixKey:row.pix_key||'',pixDoc:row.pix_doc||'',pixBank:row.pix_bank||'',pixAg:row.pix_ag||'',pixAcc:row.pix_acc||'',status:row.status||'novo',note:row.note||'',sent:row.sent_at?new Date(row.sent_at).toLocaleString('pt-BR'):'agora',recruiterId:row.recruiter_id||null,recruiterCode:row.recruiter_code||'',recruiterCaptureValue:Number(row.recruiter_capture_value)||0,approvedProfileId:row.approved_profile_id||null,authUserId:row.auth_user_id||null};}
function signupPendingRows(){return SIGNUPS.filter(s=>['novo','diligencia'].includes(s.status));}
function signupOrphanRows(){return SIGNUPS.filter(s=>s.status==='aprovado'&&!isValidUuid(s.approvedProfileId));}
function signupApprovalRecord(s){return {name:s.name,cpf:s.cpf,birth:s.birth,escolaridade:s.escolaridade||'',email:s.email,phone:s.phone,cidade:s.cidade,rua:s.rua||'',numero:s.numero||'',cep:s.cep||'',role:'pesq',status:'ativo',docFoto:s.docFoto,docComprovante:s.docComprovante,cidadesAtuacao:s.cidadesAtuacao||[],pixKey:s.pixKey||'',pixDoc:s.pixDoc||'',pixBank:s.pixBank||'',pixAg:s.pixAg||'',pixAcc:s.pixAcc||''};}
function signupTemporaryPassword(){return 'Pp-'+crypto.randomUUID()+'-9a';}
async function signupEnsureApprovedProfile(i){
  const s=SIGNUPS[i];
  if(!s||!isValidUuid(s.id))throw new Error('Cadastro sem ID UUID válido; nenhum dado foi alterado.');
  if(!s.email)throw new Error('O cadastro não possui e-mail; informe um e-mail antes de aprovar.');
  const rec=signupApprovalRecord(s);
  let profile=null,newProfile=false,resetSent=false;
  const {data:existing,error:findError}=await sb.from('profiles').select('id').eq('email',s.email).eq('role','pesq').maybeSingle();
  if(findError)throw new Error('Não foi possível verificar se o pesquisador já possui perfil: '+findError.message);
  if(existing?.id){
    const {data:updated,error:updateError}=await updateProfileSafeSelect(existing.id,userToProfileRow(rec,'pesq'));
    if(updateError)throw new Error('Não foi possível atualizar o perfil existente: '+updateError.message);
    profile=updated;
    await syncPesqCidades(profile.id,rec.cidadesAtuacao);
  }else if(isValidUuid(s.authUserId)){
    const row=userToProfileRow(rec,'pesq');row.id=s.authUserId;
    const {data:inserted,error:insertError}=await insertProfileSafe(row);
    if(insertError)throw new Error('Não foi possível criar o perfil vinculado à conta de acesso: '+insertError.message);
    profile=inserted;
    await syncPesqCidades(profile.id,rec.cidadesAtuacao);
    newProfile=true;
  }else{
    profile=await createLoginAndProfile(s.email,signupTemporaryPassword(),'pesq',rec);
    newProfile=true;
    await syncPesqCidades(profile.id,rec.cidadesAtuacao);
    const {error:resetError}=await sb.auth.resetPasswordForEmail(s.email,{redirectTo:passwordResetRedirect()});
    resetSent=!resetError;
  }
  const {error:approvalError}=await sb.from('signups').update({status:'aprovado',approved_profile_id:profile.id,approved_at:new Date().toISOString()}).eq('id',s.id);
  if(approvalError)throw new Error('Perfil criado, mas não foi possível vincular o cadastro aprovado: '+approvalError.message);
  const local=profileRowToUser({...profile,profile_cidades_atuacao:(rec.cidadesAtuacao||[]).map(cidade=>({cidade}))});
  const existingIndex=USERS.findIndex(u=>u.id===profile.id);
  if(existingIndex>=0)USERS[existingIndex]=local;else USERS.unshift(local);
  s.status='aprovado';s.approvedProfileId=profile.id;
  return {newProfile,resetSent};
}
function loadSignupsIfNeeded(){
  if(SIGNUPS_LOADED)return Promise.resolve();
  if(SIGNUPS_LOAD_PROMISE)return SIGNUPS_LOAD_PROMISE;
  SIGNUPS_LOAD_PROMISE=(async()=>{
    try{
      let result=await sb.from('signups').select('id,name,cpf,birth,escolaridade,email,phone,cidade,rua,numero,cep,doc_foto_url,doc_comprovante_url,pix_key,pix_doc,pix_bank,pix_ag,pix_acc,status,note,sent_at,recruiter_id,recruiter_code,recruiter_capture_value,approved_profile_id,auth_user_id,signup_cidades_atuacao(cidade)').in('status',['novo','diligencia','aprovado']).order('sent_at',{ascending:false});
      if(result.error&&/approved_profile_id|escolaridade|column/i.test(result.error.message||''))result=await sb.from('signups').select('id,name,cpf,birth,email,phone,cidade,rua,numero,cep,doc_foto_url,doc_comprovante_url,pix_key,pix_doc,pix_bank,pix_ag,pix_acc,status,note,sent_at,recruiter_id,recruiter_code,recruiter_capture_value,auth_user_id,signup_cidades_atuacao(cidade)').in('status',['novo','diligencia','aprovado']).order('sent_at',{ascending:false});
      if(result.error)throw new Error(result.error.message);
      SIGNUPS=(result.data||[]).map(signupRowToLocal);SIGNUPS_LOADED=true;
    }catch(ex){console.warn('Fila de cadastros ainda não disponível:',ex.message);}
    SIGNUPS_LOAD_PROMISE=null;
    const key=document.querySelector('.nav-item.on')?.dataset.key;
    if(key==='users'||key==='dashboard'||key==='recruitment')go(key);
  })();
  return SIGNUPS_LOAD_PROMISE;
}

const CLIENT_STATUS={ativo:'<span class="pill pill-green">● Ativo</span>',prospecto:'<span class="pill pill-amber">● Prospecto</span>',encerrado:'<span class="pill pill-gray">● Encerrado</span>'};
const USER_TAB_NEW_LABEL={pesq:'pesquisador',cliente:'cliente',admpro:'ADM PesquisaPro',vendedor:'vendedor',indicador:'indicador de clientes',recrutador:'recrutador',staff:'usuário administrativo'};
PAGES.users=()=>{
  if(!['admin','admpro'].includes(selectedRole)){
    return head('Usuários','Gestão de usuários')+`
      <div class="callout warn">Apenas o <b>Administrador master</b> e o <b>ADM PesquisaPro</b> podem cadastrar e gerenciar usuários. Você está conectado como <b>${ROLE_LABEL[selectedRole]}</b>.</div>`;
  }
  if(!USERS_LOADED){
    loadUsersIfNeeded();
    return head('Usuários','Gestão de usuários')+'<div class="empty">Carregando usuários do banco de dados…</div>';
  }
  if(USER_TAB==='pesq'&&!SIGNUPS_LOADED){
    loadSignupsIfNeeded();
    return head('Usuários','Gestão de usuários')+'<div class="empty">Carregando cadastros de pesquisadores…</div>';
  }
  if(USER_VIEW!=null)return userView();
  if(USER_EDIT!=null)return userForm();
  return userList();
};
function userSetTab(tab){USER_GENERAL_FILTERS={status:'',city:''};USER_RESEARCHER_FILTERS={state:'',city:'',schooling:''};USER_TAB=tab;USER_VIEW=null;USER_EDIT=null;USER_ARMED=true;go('users');}
function userTabBar(){
  const total=usersInTab(USER_TAB).length;
  const activeLabel=(USER_TABS.find(t=>t.key===USER_TAB)||{}).label||'Usuários';
  return `<nav class="user-tabs" aria-label="Tipos de usuário">
    <div class="user-tabs-head"><div><span class="eyebrow">CATEGORIA</span><strong>Escolha um perfil para administrar</strong></div><div class="user-tab-context"><span class="user-tab-context-icon">${icon3d('☺','#2563eb')}</span><div><span class="eyebrow">${activeLabel.toUpperCase()}</span><strong>${total} ${total===1?'registro':'registros'}</strong></div></div></div>
    <div class="user-tabs-track">${USER_TABS.map(t=>{const count=usersInTab(t.key).length;return `<button class="user-tab ${USER_TAB===t.key?'is-active':''}" aria-current="${USER_TAB===t.key?'page':'false'}" onclick="userSetTab('${t.key}')"><span>${t.label}</span><b>${count}</b></button>`;}).join('')}</div>
  </nav>`;
}
function userTabStats(tab){
  const list=usersInTab(tab).map(x=>x.u);
  if(tab==='pesq'){
    const pendingSignups=signupPendingRows().filter(signupMatchesUsersView);
    const pendingProfiles=list.filter(u=>u.status==='pendente');
    const missingDocs=list.filter(u=>!u.docFoto||!u.docComprovante).length+pendingSignups.filter(s=>!s.docFoto||!s.docComprovante).length;
    return `<div class="grid g4" style="margin-bottom:16px">
      ${stat('Pesquisadores',String(list.length),'cadastrados','☺','#2563eb')}
      ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'liberados para coleta','✓','#059669')}
      ${stat('Aguardando análise',String(pendingProfiles.length+pendingSignups.length),'perfis e cadastros pendentes','◷','#d97706')}
      ${stat('Docs faltando',String(missingDocs),'com algum documento pendente','◷','#dc2626')}
    </div>`;
  }
  if(tab==='cliente'){
    return `<div class="grid g3" style="margin-bottom:16px">
      ${stat('Clientes',String(list.length),'cadastrados','☼','#2563eb')}
      ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'com pesquisa em andamento','✓','#059669')}
      ${stat('Prospectos',String(list.filter(u=>u.status==='prospecto').length),'em negociação','◷','#d97706')}
    </div>`;
  }
  const tabLabel=(USER_TABS.find(t=>t.key===tab)||{}).label||tab;
  const pending=list.filter(u=>u.status==='pendente').length;
  return `<div class="grid g3 user-stat-grid" style="margin-bottom:16px">
    ${stat(tabLabel,String(list.length),'cadastrados','◎','#2563eb')}
    ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'liberados no sistema','✓','#059669')}
    ${stat('Pendentes',String(pending),'aguardando ativação','◷','#d97706')}
  </div>`;
}
function userTableHead(tab){
  if(tab==='pesq')return '<tr><th>Nome</th><th>CPF</th><th>Cidade / estado</th><th>Escolaridade</th><th>Documentos</th><th>PIX</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  if(tab==='cliente')return '<tr><th>Cliente</th><th>CPF/CNPJ</th><th>Celular</th><th>Pesquisas</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  if(tab==='recrutador')return '<tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Celular</th><th>Valor por captação</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  return '<tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Celular</th><th>Comissão</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
}
function userTableRows(tab){
  const items=usersInTab(tab);
  if(items.length===0){
    const colspan=tab==='pesq'?8:tab==='cliente'?6:7;
    return `<tr><td colspan="${colspan}" class="empty">Nenhum cadastro nesta aba ainda.</td></tr>`;
  }
  if(tab==='pesq'){
    return items.map(({u,i})=>{
      const st=u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>';
      const docsOk=u.docFoto&&u.docComprovante;
      const docCount=(u.docFoto?1:0)+(u.docComprovante?1:0);
      const docPillTop=docsOk?'<span class="pill pill-green">● 2/2 anexados</span>':`<span class="pill pill-red">● ${docCount}/2 anexados</span>`;
      const docLine=(val,kind)=>val?`<div style="font-size:11px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="${esc(val)}"><a href="#" onclick="event.stopPropagation();event.preventDefault();userOpenPesqDocument(${i},'${kind}')" style="color:var(--teal);text-decoration:none">📎 ${esc(val)}</a></div>`:'';
      const docPill=`<div>${docPillTop}</div>${docLine(u.docFoto,'foto')}${docLine(u.docComprovante,'comprovante')}`;
      const pixPill=u.pixKey?`<span class="pill pill-green" title="${esc(u.pixBank||'')} ${esc(u.pixAg||'')}/${esc(u.pixAcc||'')}">● ${esc((u.pixKey||'').length>16?u.pixKey.slice(0,15)+'…':u.pixKey)}</span>`:'<span class="pill pill-gray">— não informado</span>';
      const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
      const nCidades=(u.cidadesAtuacao||[]).length;
      const locations=researcherLocations(u);
      const locationLabel=locations.length?locations.map(part=>part.raw).join(', '):'—';
      return `<tr style="cursor:pointer" onclick="userShow(${i})">
        <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${initials}</div>
          <div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--ink3)">${esc(u.email)}</div></div></div></td>
        <td>${esc(u.cpf)}</td>
        <td><div>${esc(locationLabel)}</div><small style="color:var(--ink3)">${nCidades?nCidades+' cidade'+(nCidades===1?'':'s'):'nenhuma cadastrada'}</small></td>
        <td>${u.escolaridade?esc(schoolingLabel(u.escolaridade)):'<span class="pill pill-gray">Não informada</span>'}</td>
        <td>${docPill}</td>
        <td>${pixPill}</td>
        <td>${st}</td>
        <td class="user-actions-cell" onclick="event.stopPropagation()">
          ${conversationButton(u.phone,'Olá '+u.name+'! Podemos conversar sobre seu cadastro e as próximas coletas?')}
          ${u.status!=='ativo'?`<button class="btn-ghost" style="color:var(--teal)" onclick="userPesqApproveList(${i})">Aprovar</button>`:''}
          <button class="btn-ghost" onclick="userShow(${i})">Ver dados</button>
          <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
          ${userPasswordResetButton(u,i)}
          <button class="btn-ghost" style="color:var(--red)" onclick="userDelete(${i})">Excluir</button>
        </td></tr>`;
    }).join('');
  }
  if(tab==='cliente'){
    return items.map(({u,i})=>`<tr style="cursor:pointer" onclick="userShow(${i})">
      <td><b>${esc(u.name)}</b><div style="font-size:11px;color:var(--ink3)">${esc(u.contact||'')}</div></td>
      <td>${esc(u.cpfCnpj||'')}</td>
      <td>${esc(u.phone||'')}</td>
      <td>${(u.surveys||[]).length} pesquisa(s)</td>
      <td>${CLIENT_STATUS[u.status]||u.status}${u.resultsReleased?' <span class="pill pill-blue" style="margin-left:4px">📊 Acesso total liberado</span>':''}</td>
      <td class="user-actions-cell" onclick="event.stopPropagation()">
        ${conversationButton(u.phone,'Olá '+(u.contact||u.name)+'! Podemos conversar sobre sua pesquisa?')}
        <button class="btn-ghost" onclick="userShow(${i})">Abrir</button>
        <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
        ${userPasswordResetButton(u,i)}
        <button class="btn-ghost" style="color:var(--red)" onclick="userDelete(${i})">Excluir</button>
      </td></tr>`).join('');
  }
  return items.map(({u,i})=>{
    const st=u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>';
    const commission=u.role==='vendedor'&&u.commissionRateWithIndicator>0?`${u.commissionRate}% <span style="font-size:10px;color:var(--ink3)">/ ${u.commissionRateWithIndicator}% c/ ind.</span>`:`${u.commissionRate||0}%`;
    const earning=u.role==='recrutador'?`R$ ${Number(u.recruiterCaptureValue||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`:commission;
    const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
    return `<tr style="cursor:pointer" onclick="userShow(${i})">
      <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${initials}</div>
        <div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--ink3)">${esc(u.email||'')}</div></div></div></td>
      <td>${esc(u.cpf||'')}</td>
      <td>${ROLE_PILL[u.role]||u.role}</td>
      <td>${esc(u.phone||'')}</td>
      <td><span class="pill ${u.role==='recrutador'?'pill-teal':'pill-blue'}">${earning}</span></td>
      <td>${st}</td>
      <td class="user-actions-cell" onclick="event.stopPropagation()">
        ${conversationButton(u.phone,'Olá '+u.name+'! Podemos conversar sobre suas atividades no PesquisaPro?')}
        <button class="btn-ghost" onclick="userShow(${i})">Ver dados</button>
        <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
        ${userPasswordResetButton(u,i)}
        <button class="btn-ghost" style="color:var(--red)" onclick="userDelete(${i})">Excluir</button>
      </td></tr>`;
  }).join('');
}
let USER_SIGNUP_OPEN=false;
function userSignupToggle(){USER_SIGNUP_OPEN=!USER_SIGNUP_OPEN;go('users');}
function userList(){
  const tab=USER_TAB;
  const tabInfo={pesq:['REDE DE CAMPO','Pesquisadores cadastrados e documentos para liberação de coleta.'],cliente:['BASE DE CLIENTES','Organizações e contatos que acompanham suas pesquisas.'],admpro:['EQUIPE INTERNA','Perfis ADM PesquisaPro autorizados no sistema.'],vendedor:['TIME COMERCIAL','Vendedores, percentuais de comissão e acesso ao funil.'],indicador:['PARCEIROS COMERCIAIS','Indicadores de clientes e percentuais de comissão.'],recrutador:['REDE DE CAPTAÇÃO','Parceiros que trazem novos pesquisadores para a rede.'],staff:['ADMINISTRAÇÃO','Usuários com acesso operacional e permissões de gestão.']}[tab]||['CADASTROS','Gestão dos perfis de acesso.'];
  const currentCount=usersInTab(tab).length;
  const extras = tab==='pesq' ? `
  ${signupOrphanRowsMarkup()}
  <div class="card" style="margin-top:16px">
    <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="userSignupToggle()">
      <div class="card-t" style="margin:0">🔗 Autocadastro — link e QR Code</div>
      <span style="margin-left:auto;color:var(--ink3);font-size:13px">${USER_SIGNUP_OPEN?'Ocultar ▴':'Mostrar ▾'}</span>
    </div>
    ${USER_SIGNUP_OPEN?`
    <div class="card-d">Envie para que a pessoa preencha o próprio cadastro com todos os campos obrigatórios. O cadastro entra na fila acima para sua aprovação.</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <input class="inp" value="pesquisapro.com.br/cadastro/mg2026-x8f3" readonly>
      <button class="btn btn-out" onclick="alert('Recurso ainda não configurado: link copiado')">Copiar</button>
    </div>
    <div style="display:flex;gap:14px;align-items:center">
      <div id="signup-qr" class="qr-box"></div>
      <div style="flex:1">
        <button class="btn btn-fill" style="width:100%;margin-bottom:8px;background:var(--teal)" onclick="sendSignupWhatsApp()">Enviar link + QR por WhatsApp</button>
        <button class="btn btn-out" style="width:100%;margin-bottom:8px" onclick="alert('Recurso ainda não configurado: link enviado por e-mail')">Enviar por e-mail</button>
        <button class="btn btn-out" style="width:100%" onclick="alert('Recurso ainda não configurado: QR Code baixado/impresso')">Baixar QR Code</button>
      </div>
    </div>`:''}
  </div>
  <div class="callout" style="margin-top:16px">Todo pesquisador é cadastrado por um administrador, ou via autocadastro por link/QR com aprovação. Campos obrigatórios: nome completo, CPF, data de nascimento, celular, cidade, rua, número, CEP, e-mail, chave PIX, até 5 cidades de atuação e os 2 documentos (com foto e comprovante de residência).</div>`
  : tab==='cliente' ? `
  <div class="callout" style="margin-top:16px">Clientes são cadastrados manualmente por um administrador — não há autocadastro para este perfil.</div>`
  : `
  <div class="callout" style="margin-top:16px">Este perfil só pode ser incluído manualmente pelo Administrador master ou por um ADM PesquisaPro autorizado — não há autocadastro.</div>`;
  const hasUserFilters=!!(USER_SEARCH||USER_GENERAL_FILTERS.status||USER_GENERAL_FILTERS.city||(tab==='pesq'&&(USER_RESEARCHER_FILTERS.state||USER_RESEARCHER_FILTERS.city||USER_RESEARCHER_FILTERS.schooling)));
  const tableContent=currentCount?`<div class="user-table-scroll" tabindex="0" aria-label="Tabela de usuários. Deslize horizontalmente para ver todas as informações."><div class="user-table-scroll-hint"><span aria-hidden="true">↔</span> Deslize horizontalmente para ver todos os dados. A coluna <b>Ações</b> permanece acessível à direita.</div><table class="user-data-table user-data-table-${tab}"><thead>${userTableHead(tab)}</thead><tbody>${userTableRows(tab)}</tbody></table></div>`:`<div class="users-empty-state"><div class="users-empty-icon">＋</div><div><h3>${hasUserFilters?'Nenhum resultado encontrado':'Nenhum '+(USER_TAB_NEW_LABEL[tab]||'usuário')+' cadastrado'}</h3><p>${hasUserFilters?'Ajuste ou limpe os filtros para visualizar outros usuários.':'Comece adicionando o primeiro perfil nesta categoria para liberar o fluxo correspondente.'}</p>${hasUserFilters?'<button class="btn btn-out" onclick="userClearAllFilters()">Limpar filtros e busca</button>':`<button class="btn btn-fill" onclick="userOpen('new')">Cadastrar ${USER_TAB_NEW_LABEL[tab]||'usuário'}</button>`}</div></div>`;
  const searchBar=`<div class="user-search-bar" role="search"><div class="user-search-main"><label class="sr-only" for="user-search">Buscar usuário</label><span class="user-search-icon">⌕</span><input id="user-search" class="inp" type="search" value="${esc(USER_SEARCH)}" placeholder="Buscar por nome, CPF, cidade ou e-mail…" autocomplete="off" oninput="userSearchInput(this.value)">${USER_SEARCH?'<button type="button" class="user-search-clear" title="Limpar busca" aria-label="Limpar busca" onclick="userClearSearch()">×</button>':''}</div><span class="user-search-hint">A busca vale para a aba ${esc((USER_TABS.find(t=>t.key===tab)||{}).label||'atual')} e ignora acentos e pontuação.</span></div>`;
  const generalFilters=userGeneralFiltersMarkup(tab);
  const researcherFilters=tab==='pesq'?userResearcherFiltersMarkup(usersInTab('pesq')):'';
  const researcherQueue=tab==='pesq'?researcherApprovalQueueMarkup():'';
  return `<div class="users-page"><div class="users-context"><div><span class="eyebrow">${tabInfo[0]}</span><p>${tabInfo[1]}</p></div><span class="users-count-chip">${currentCount} ${currentCount===1?'perfil':'perfis'}</span></div>`+
  head('Usuários','Cadastre e gerencie os diferentes perfis de usuário do sistema',
    `<button class="btn btn-fill" onclick="userOpen('new')">＋ Novo ${USER_TAB_NEW_LABEL[tab]||'usuário'}</button>`)+
  userTabBar()+
  userTabStats(tab)+
  researcherQueue+
  searchBar+generalFilters+researcherFilters+
  `<div class="card user-table-card" ${tab==='pesq'?'id="researcher-table"':''}><div class="user-table-heading"><div><div class="card-t">${USER_TAB_NEW_LABEL[tab]||'Usuários'} encontrados</div><div class="card-d">${currentCount?`Mostrando ${currentCount} ${currentCount===1?'registro':'registros'} com os filtros atuais.`:'Nenhum registro corresponde aos filtros atuais.'}</div></div><span class="users-table-count" aria-label="Quantidade encontrada">${currentCount}</span></div>${tableContent}
  </div>${extras}</div>`;
}
function signupRows(){
  const pending=SIGNUPS.map((s,i)=>({s,i})).filter(({s})=>['novo','diligencia'].includes(s.status)&&signupMatchesUsersView(s));
  if(pending.length===0)return '<div class="empty">Nenhum cadastro pendente.</div>';
  return pending.map(({s,i})=>{
    const initials=s.name.split(' ').map(n=>n[0]).slice(0,2).join('');
    const docsOk=s.docFoto&&s.docComprovante;
    const docCount=(s.docFoto?1:0)+(s.docComprovante?1:0);
    const docPill=docsOk?'<span class="pill pill-green">● docs ok</span>':`<span class="pill pill-red">● ${docCount}/2 docs</span>`;
    const docActions=`<span class="signup-doc-actions">${s.docFoto?`<button class="btn-ghost" onclick="event.stopPropagation();signupOpenDocument(${i},'foto')">Documento</button>`:''}${s.docComprovante?`<button class="btn-ghost" onclick="event.stopPropagation();signupOpenDocument(${i},'comprovante')">Endereço</button>`:''}</span>`;
    const note=s.status==='diligencia'&&s.note?`<div class="signup-note">⚠ Em diligência: ${esc(s.note)}</div>`:'';
    return `<div class="signup-row">
      <div class="signup-top">
        <div class="avatar" style="width:30px;height:30px;font-size:11px;background:#d97706">${initials}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${esc(s.name)} ${SIGNUP_PILL[s.status]||''}</div>
          <div style="font-size:11px;color:var(--ink3)">${esc(s.cpf)} · ${esc(s.email)} · ${s.sent}</div>
        </div>
        ${conversationButton(s.phone,'Olá '+s.name+'! Podemos conversar sobre seu cadastro no PesquisaPro?')}
        <button class="btn-ghost" onclick="signupView(${i})">Ver dados</button>
      </div>
      <div class="signup-actions">
        ${docPill}${docActions}
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn-ghost" style="color:var(--teal)" onclick="signupApprove(${i})">Aprovar</button>
          <button class="btn-ghost" style="color:var(--amber)" onclick="signupDiligence(${i})">Diligenciar</button>
          <button class="btn-ghost" style="color:var(--red)" onclick="signupReject(${i})">Reprovar</button>
        </div>
      </div>
      ${note}
    </div>`;
  }).join('');
}
function signupOrphanRowsMarkup(){
  const orphan=SIGNUPS.map((s,i)=>({s,i})).filter(({s})=>s.status==='aprovado'&&!isValidUuid(s.approvedProfileId));
  if(!orphan.length)return '';
  return `<div class="card mb" style="margin-top:16px;border-color:var(--amber,#d97706)"><div style="display:flex;align-items:center;gap:8px"><div class="card-t" style="margin:0">Aprovados aguardando reconciliação</div><span class="pill pill-amber" style="margin-left:auto">${orphan.length}</span></div><div class="card-d">Estes cadastros foram marcados como aprovados, mas ainda não têm perfil vinculado. Nenhum dado será apagado; reconcilie para criar ou localizar o perfil real.</div><div>${orphan.map(({s,i})=>`<div class="signup-row"><div class="signup-top"><div class="avatar" style="width:30px;height:30px;font-size:11px;background:var(--teal)">${initialsOf(s.name)}</div><div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(s.name)} ${SIGNUP_PILL.aprovado}</div><div style="font-size:11px;color:var(--ink3)">${esc(s.cpf)} · ${esc(s.email)} · ${s.sent}</div></div><button class="btn-ghost" onclick="signupView(${i})">Ver dados</button></div><div class="signup-actions"><span class="pill pill-amber">● perfil não vinculado</span><button class="btn-ghost" style="margin-left:auto;color:var(--teal)" onclick="signupReconcileApproved(${i})">Reconciliar perfil</button></div></div>`).join('')}</div></div>`;
}
function researcherPendingProfileRows(){return usersInTab('pesq').filter(({u})=>u.status==='pendente');}
function signupQueueDocumentActions(s,i){
  const actions=[];
  if(s.docFoto)actions.push(`<button class="btn-ghost queue-doc-btn" onclick="event.stopPropagation();signupOpenDocument(${i},'foto')">Abrir foto</button><button class="btn-ghost queue-doc-download" onclick="event.stopPropagation();signupDownloadDocument(${i},'foto')">Baixar</button>`);
  if(s.docComprovante)actions.push(`<button class="btn-ghost queue-doc-btn" onclick="event.stopPropagation();signupOpenDocument(${i},'comprovante')">Abrir endereço</button><button class="btn-ghost queue-doc-download" onclick="event.stopPropagation();signupDownloadDocument(${i},'comprovante')">Baixar</button>`);
  return actions.length?`<div class="queue-document-actions" aria-label="Documentos do cadastro">${actions.join('')}</div>`:'<span class="queue-no-docs">Nenhum documento anexado</span>';
}
function profileQueueDocumentActions(u,i){
  const actions=[];
  if(u.docFoto)actions.push(`<button class="btn-ghost queue-doc-btn" onclick="event.stopPropagation();userOpenPesqDocument(${i},'foto')">Abrir foto</button><button class="btn-ghost queue-doc-download" onclick="event.stopPropagation();userDownloadPesqDocument(${i},'foto')">Baixar</button>`);
  if(u.docComprovante)actions.push(`<button class="btn-ghost queue-doc-btn" onclick="event.stopPropagation();userOpenPesqDocument(${i},'comprovante')">Abrir endereço</button><button class="btn-ghost queue-doc-download" onclick="event.stopPropagation();userDownloadPesqDocument(${i},'comprovante')">Baixar</button>`);
  return actions.length?`<div class="queue-document-actions" aria-label="Documentos do perfil">${actions.join('')}</div>`:'<span class="queue-no-docs">Nenhum documento anexado</span>';
}
function researcherQueueItemMarkup(entry){
  const isSignup=entry.kind==='signup',item=entry.item,index=entry.index;
  const location=isSignup?(item.cidade||'Localização não informada'):(researcherLocations(item).map(part=>part.raw).join(', ')||'Localização não informada');
  const docs=isSignup?signupQueueDocumentActions(item,index):profileQueueDocumentActions(item,index);
  const meta=isSignup?`${SIGNUP_PILL[item.status]||''}<span class="pill pill-gray">Autocadastro</span>${item.docFoto&&item.docComprovante?'<span class="pill pill-green">Docs completos</span>':'<span class="pill pill-red">Docs incompletos</span>'}`:`<span class="pill pill-amber">● Pendente</span><span class="pill pill-gray">Perfil manual</span>${item.docFoto&&item.docComprovante?'<span class="pill pill-green">Docs completos</span>':'<span class="pill pill-red">Docs incompletos</span>'}`;
  const message=isSignup?'Olá '+item.name+'! Podemos conversar sobre seu cadastro no PesquisaPro?':'Olá '+item.name+'! Podemos conversar sobre seu cadastro e as próximas coletas?';
  const viewAction=isSignup?`signupView(${index})`:`userShow(${index})`;
  const approveAction=isSignup?`signupApprove(${index})`:`userPesqApproveList(${index})`;
  return `<article class="researcher-queue-item"><div class="researcher-queue-person"><span class="avatar" style="width:34px;height:34px;font-size:11px;background:#d97706">${initialsOf(item.name)}</span><div><strong>${esc(item.name)}</strong><small>${esc(location)}${isSignup&&item.sent?' · '+item.sent:''}</small></div></div><div class="researcher-queue-item-meta">${meta}</div>${docs}<div class="researcher-queue-actions">${conversationButton(item.phone,message)}<button class="btn btn-out" onclick="${viewAction}">Ver dados</button><button class="btn btn-fill" style="background:var(--teal)" onclick="${approveAction}">Aprovar</button></div></article>`;
}
function researcherApprovalQueueMarkup(){
  const pendingSignups=SIGNUPS.map((s,i)=>({s,i})).filter(({s})=>['novo','diligencia'].includes(s.status)&&signupMatchesUsersView(s));
  const pendingProfiles=researcherPendingProfileRows();
  const pendingItems=[...pendingSignups.map(({s,i})=>({kind:'signup',item:s,index:i})),...pendingProfiles.map(({u,i})=>({kind:'profile',item:u,index:i}))];
  const total=pendingItems.length,visibleItems=pendingItems.slice(0,6);
  const list=total?visibleItems.map(researcherQueueItemMarkup).join(''):`<div class="researcher-queue-empty"><span>✓</span><div><strong>Nenhuma pendência de autorização</strong><small>Autocadastros e perfis manuais estão em dia.</small></div></div>`;
  return `<section class="researcher-approval-queue" aria-labelledby="researcher-approval-title"><div class="researcher-queue-head"><div><span class="eyebrow">AUTORIZAÇÃO E DOCUMENTOS</span><h2 id="researcher-approval-title">Pendências de autorização</h2><p>Autocadastros e perfis manuais ficam na mesma fila para visualizar, conversar e aprovar.</p></div><div class="researcher-queue-head-actions"><button class="btn btn-out researcher-queue-table-link" onclick="document.getElementById('researcher-table')?.scrollIntoView({behavior:'smooth',block:'start'})">Ver lista completa</button><div class="researcher-queue-total"><strong>${total}</strong><span>${total===1?'pendência':'pendências'}</span></div></div></div><div class="researcher-queue-grid researcher-queue-grid-unified"><div class="researcher-queue-card researcher-queue-card-unified"><div class="researcher-queue-card-head"><div><strong>Fila única de autorização</strong><small>Autocadastros e perfis cadastrados manualmente</small></div><span class="pill pill-amber">${total}</span></div><div class="researcher-queue-list ${total===1?'is-single':''}">${list}</div>${total>6?`<div class="researcher-queue-more">+ ${total-6} pendência(s) na lista completa abaixo</div>`:''}</div></div></section>`;
}
function refreshSignups(){
  const el=document.getElementById('signup-list');if(el)el.innerHTML=signupRows();
  const orphan= document.querySelector('.signup-orphan-placeholder');if(orphan)orphan.outerHTML=signupOrphanRowsMarkup();
  if(document.querySelector('.nav-item.on')?.dataset.key==='users')go('users');
}
function renderSignupQR(){
  const box=document.getElementById('signup-qr');if(!box)return;
  const url='https://pesquisapro.com.br/cadastro/mg2026-x8f3';
  const draw=()=>{
    box.innerHTML='';
    try{new QRCode(box,{text:url,width:108,height:108,colorDark:'#0f172a',colorLight:'#ffffff'});return true;}catch(e){return false;}
  };
  if(typeof window.QRCode!=='undefined'&&draw())return;
  box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code indisponível no momento">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">carregando…</div></div>';
  loadLocalAsset('qrcode').then(()=>{if(document.getElementById('signup-qr')===box&&!draw())throw new Error('QR Code inválido');})
    .catch(()=>{if(document.getElementById('signup-qr')===box)box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code indisponível no momento">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">indisponível offline</div></div>';});
}
function sendSignupWhatsApp(){
  const url='https://pesquisapro.com.br/cadastro/mg2026-x8f3';
  const phone=prompt('Telefone do convidado (com DDD), ou deixe em branco para abrir o WhatsApp e escolher o contato:','');
  if(phone===null)return;
  const msg=encodeURIComponent('Olá! Você foi convidado(a) para ser pesquisador(a) na PesquisaPro. Faça seu cadastro por este link (também disponível em QR Code): '+url);
  const digits=(phone||'').replace(/\D/g,'');
  const base=digits?('https://wa.me/'+(digits.length<=11?'55'+digits:digits)):'https://wa.me/';
  window.open(base+'?text='+msg,'_blank','noopener');
}
async function signupGetDocumentUrl(path){
  if(/^https?:\/\//i.test(path))return path;
  const {data,error}=await sb.storage.from('researcher-documents').createSignedUrl(path,600);
  if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária indisponível');
  return data.signedUrl;
}
function signupDocumentName(path,kind){
  const raw=String(path||'').split('?')[0].split('/').pop()||'';
  try{return decodeURIComponent(raw)||`documento-${kind}`;}catch(ex){return raw||`documento-${kind}`;}
}
async function signupOpenDocument(i,kind){
  const s=SIGNUPS[i];
  const path=kind==='foto'?s.docFoto:s.docComprovante;
  if(!path){alert('Este documento não foi anexado.');return;}
  const popup=window.open('about:blank','_blank','noopener');
  try{
    const url=await signupGetDocumentUrl(path);
    if(popup)popup.location.href=url;else window.location.href=url;
  }catch(ex){if(popup)popup.close();alert('Não foi possível abrir este documento. Verifique se a migration de documentos foi executada e se o arquivo ainda existe.');console.error(ex);}
}
async function signupDownloadDocument(i,kind){
  const s=SIGNUPS[i],path=kind==='foto'?s?.docFoto:s?.docComprovante;
  if(!path){alert('Este documento não foi anexado.');return;}
  try{
    const response=await fetch(await signupGetDocumentUrl(path));
    if(!response.ok)throw new Error(`download HTTP ${response.status}`);
    const blob=await response.blob(),objectUrl=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=objectUrl;link.download=signupDocumentName(path,kind);link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }catch(ex){alert('Não foi possível baixar este documento. Verifique se o arquivo existe e se o bucket de documentos está configurado.');console.error(ex);}
}
function signupView(i){
  const s=SIGNUPS[i];
  const pix=s.pixKey?('\n\nPIX: '+s.pixKey+'\nTitular: '+(s.pixDoc||'—')+'\nBanco: '+(s.pixBank||'—')+' · Ag '+(s.pixAg||'—')+' · Conta '+(s.pixAcc||'—')):'\n\nPIX: não informado';
  const cidades=(s.cidadesAtuacao||[]).join(', ')||'nenhuma informada';
  alert('Cadastro de '+s.name+':\n\nCPF: '+s.cpf+'\nNascimento: '+s.birth+'\nEscolaridade: '+schoolingLabel(s.escolaridade)+'\nE-mail: '+s.email+'\nCelular: '+s.phone+'\nCidade: '+s.cidade+'\nCidades de atuação: '+cidades+'\nDocumento com foto: '+(s.docFoto||'NÃO ANEXADO')+'\nComprovante de residência: '+(s.docComprovante||'NÃO ANEXADO')+pix);
}
async function signupApprove(i){
  const s=SIGNUPS[i];
  if(!s||s.status==='aprovado'){return signupReconcileApproved(i);}
  if(!s.docFoto||!s.docComprovante){alert('Não é possível aprovar: faltam documentos (documento com foto e/ou comprovante de residência). Use "Diligenciar" para solicitar o envio.');return;}
  if(!confirm('Aprovar o cadastro de '+s.name+'? Será criado um perfil real de pesquisador, vinculado ao cadastro e enviado um link de redefinição de senha para o e-mail informado.'))return;
  try{
    const result=await signupEnsureApprovedProfile(i);
    SIGNUPS.splice(i,1);
    alert(result.resetSent?'Cadastro aprovado e perfil criado. Um link para definir a senha foi enviado ao e-mail.':'Cadastro aprovado e perfil criado. Oriente o pesquisador a usar a recuperação de senha no primeiro acesso.');
    go('users');
  }catch(ex){alert('Não foi possível aprovar sem risco de inconsistência: '+ex.message);console.error(ex);}
}
async function signupReconcileApproved(i){
  const s=SIGNUPS[i];if(!s||s.status!=='aprovado')return;
  if(!confirm('Este cadastro foi aprovado, mas não possui perfil vinculado. Criar ou localizar o perfil real agora?'))return;
  try{
    const result=await signupEnsureApprovedProfile(i);
    SIGNUPS.splice(i,1);
    alert(result.newProfile?'Perfil reconciliado e link de senha enviado ao e-mail.':'Perfil existente reconciliado com o cadastro aprovado.');
    go('users');
  }catch(ex){alert('Não foi possível reconciliar este cadastro sem risco de inconsistência: '+ex.message);console.error(ex);}
}
async function signupDiligence(i){
  const motivo=prompt('O que precisa ser corrigido/complementado? (a pessoa recebe esta mensagem)','Reenvie a foto do documento legível');
  if(motivo==null)return;
  const s=SIGNUPS[i];
  if(s.id){const {error}=await sb.from('signups').update({status:'diligencia',note:motivo}).eq('id',s.id);if(error){alert('Não foi possível registrar a diligência: '+error.message);return;}}
  s.status='diligencia';s.note=motivo;
  alert('Cadastro devolvido para diligência. A pessoa foi notificada.');
  refreshSignups();
}
async function signupReject(i){
  const s=SIGNUPS[i];
  if(!confirm('Reprovar o cadastro de '+s.name+'? O histórico de origem será preservado.'))return;
  if(s.id){const {error}=await sb.from('signups').update({status:'reprovado'}).eq('id',s.id);if(error){alert('Não foi possível registrar a reprovação: '+error.message);return;}}
  SIGNUPS.splice(i,1);
  alert('Cadastro reprovado. O histórico da captação foi preservado.');
  refreshSignups();
}
function userOpen(idx){
  USER_VIEW=null;USER_EDIT=idx;
  const role=idx==='new'?(USER_TAB==='staff'?'admin':USER_TAB):USERS[idx].role;
  if(idx==='new')USER_NEW_ROLE=role;
  if(role==='pesq'){_pesqCidadesDraft=idx==='new'?[]:(USERS[idx].cidadesAtuacao||[]).slice();_docFotoDraft=null;_docCompDraft=null;}
  if(['admin','coord','gerente'].includes(role))_docDraft=null;
  USER_ARMED=true;go('users');
}
function userBack(){USER_EDIT=null;go('users');}
let USER_ARMED=false;
let USER_VIEW=null;
function userShow(idx){USER_VIEW=idx;USER_ARMED=true;go('users');}
function userViewBack(){USER_VIEW=null;go('users');}
function userEditFromView(){
  const i=USER_VIEW;USER_VIEW=null;USER_EDIT=i;
  const u=USERS[i];
  if(u&&u.role==='pesq'){_pesqCidadesDraft=(u.cidadesAtuacao||[]).slice();_docFotoDraft=null;_docCompDraft=null;}
  if(u&&['admin','coord','gerente'].includes(u.role))_docDraft=null;
  USER_ARMED=true;go('users');
}
function conversationUrl(phone,msg){
  const digits=(phone||'').replace(/\D/g,'');
  if(!digits)return '';
  const num=digits.length<=11?'55'+digits:digits;
  return 'https://wa.me/'+num+(msg?'?text='+encodeURIComponent(msg):'');
}
function userWhatsApp(phone){
  const href=conversationUrl(phone,'');
  if(!href){alert('Este usuário não tem telefone cadastrado.');return;}
  window.open(href,'_blank','noopener');
}
function userPasswordResetButton(user,index){
  return user.email
    ? `<button type="button" class="btn-ghost user-password-reset" title="Enviar link seguro de redefinição de senha" onclick="event.preventDefault();event.stopPropagation();userSendPasswordReset(${index})">Resetar senha</button>`
    : '';
}
function clientWhatsAppMsg(phone,msg){
  const href=conversationUrl(phone,msg);
  if(!href){alert('Cliente sem telefone cadastrado.');return;}
  window.open(href,'_blank','noopener');
}
function conversationButton(phone,context='Olá! Podemos conversar sobre a pesquisa?'){
  if(!phone)return '';
  return `<button type="button" class="btn-ghost conversation-btn" title="Abrir conversa no WhatsApp" onclick="event.preventDefault();event.stopPropagation();clientWhatsAppMsg(${jsArg(phone)},${jsArg(context)})">${icon3d('☏','#0f766e')}<span>Conversar</span></button>`;
}
function userView(){
  const u=USERS[USER_VIEW];if(!u)return userList();
  if(u.role==='cliente')return userViewCliente(u,USER_VIEW);
  if(u.role==='pesq')return userViewPesq(u,USER_VIEW);
  return userViewGeneric(u);
}
function userViewGeneric(u){
  const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
  const dash='<span style="color:var(--ink3);font-weight:400">—</span>';
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:38%">${l}</td><td style="font-weight:600">${v||dash}</td></tr>`;
  const isStaff=['admin','coord','gerente'].includes(u.role);
  const docBlock=u.doc
    ?`<div class="doc-attached" style="margin:0"><span>📎 ${esc(u.doc)}</span><button class="btn-ghost" onclick="alert('Recurso ainda não configurado: abrir/baixar documento')">abrir</button></div>`
    :'<span class="pill pill-red">● documento não anexado</span>';
  return '<div class="profile-page profile-page-generic">'+head(u.name,'Dados do usuário',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp(${jsArg(u.phone)})">WhatsApp</button>
     ${userPasswordResetButton(u,USER_VIEW)}
     <button class="btn btn-fill" onclick="userEditFromView()">Editar</button>`)+`
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
    <div class="avatar" style="width:54px;height:54px;font-size:20px">${initials}</div>
    <div>
      <div style="font-weight:700;font-size:18px">${esc(u.name)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        ${ROLE_PILL[u.role]||u.role}
        ${u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>'}
      </div>
    </div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Dados pessoais</div>
      <table style="margin-top:6px">
        ${row('Nome completo',esc(u.name))}
        ${row('CPF',esc(u.cpf))}
        ${isStaff?row('Data de nascimento',esc(u.birth)):''}
        ${row('E-mail',esc(u.email))}
        ${row('Celular',esc(u.phone))}
        ${row(isStaff?'Endereço':'Cidade',esc(isStaff?u.addr:u.cidade))}
        ${row('Perfil',ROLE_LABEL[u.role]||u.role)}
      </table>
      ${isStaff?`<div class="divider"></div><div class="lbl">Documento (RG / CPF / CNH)</div>${docBlock}`:''}
    </div>
    <div class="card">
      <div class="card-t">Acesso</div>
      <div class="card-d">${isStaff?'Perfil interno com acesso administrativo às áreas definidas em Perfis e permissões.':'Perfil incluído manualmente por um administrador — sem autocadastro nem aprovação pendente.'}</div>
      <table style="margin-top:6px">
        ${row('Status',u.status==='ativo'?'Ativo':'Pendente')}
      </table>
    </div>
  </div></div>`;
}
async function userGetPesqDocumentUrl(path){
  if(/^https?:\/\//i.test(path))return path;
  const {data,error}=await sb.storage.from('researcher-documents').createSignedUrl(path,600);
  if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária indisponível');
  return data.signedUrl;
}
function userPesqDocumentName(path,kind){
  const raw=String(path||'').split('?')[0].split('/').pop()||'';
  try{return decodeURIComponent(raw)||`documento-${kind}`;}catch(ex){return raw||`documento-${kind}`;}
}
async function userOpenPesqDocument(index,kind){
  const u=USERS[index];
  const path=kind==='foto'?u?.docFoto:u?.docComprovante;
  if(!path){alert('Este documento não foi anexado.');return;}
  const popup=window.open('about:blank','_blank','noopener');
  try{
    const url=await userGetPesqDocumentUrl(path);
    if(popup)popup.location.href=url;else window.open(url,'_blank','noopener');
  }catch(ex){if(popup)popup.close();alert('Não foi possível abrir este documento. Verifique se o arquivo existe e se o bucket de documentos está configurado.');console.error(ex);}
}
async function userDownloadPesqDocument(index,kind){
  const u=USERS[index];
  const path=kind==='foto'?u?.docFoto:u?.docComprovante;
  if(!path){alert('Este documento não foi anexado.');return;}
  try{
    const response=await fetch(await userGetPesqDocumentUrl(path));
    if(!response.ok)throw new Error(`download HTTP ${response.status}`);
    const blob=await response.blob();
    const objectUrl=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=objectUrl;
    link.download=userPesqDocumentName(path,kind);
    link.style.display='none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }catch(ex){alert('Não foi possível baixar este documento. Verifique se o arquivo existe e se o bucket de documentos está configurado.');console.error(ex);}
}
function userViewPesq(u,idx){
  const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
  const dash='<span style="color:var(--ink3);font-weight:400">—</span>';
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:38%">${l}</td><td style="font-weight:600">${v||dash}</td></tr>`;
  const docRow=(label,val,kind)=>val
    ?`<div class="doc-attached profile-document-row" title="${esc(val)}"><span class="doc-file-label"><span class="doc-file-icon" aria-hidden="true">📎</span><span class="doc-file-copy"><strong>${esc(label)}</strong><small>${esc(userPesqDocumentName(val,kind))}</small></span></span><span class="doc-action-buttons"><button class="btn-ghost" onclick="userOpenPesqDocument(${idx},'${kind}')">Abrir</button><button class="btn-ghost doc-download-btn" onclick="userDownloadPesqDocument(${idx},'${kind}')">Baixar</button></span></div>`
    :`<div style="margin-bottom:8px"><span class="pill pill-red">● ${esc(label)}: não anexado</span></div>`;
  const cidades=(u.cidadesAtuacao||[]).length
    ?u.cidadesAtuacao.map(c=>`<span class="chip" style="margin:2px">${esc(c)}</span>`).join('')
    :dash;
  return '<div class="profile-page profile-page-pesq">'+head(u.name,'Dados do pesquisador',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp(${jsArg(u.phone)})">WhatsApp</button>
     ${userPasswordResetButton(u,idx)}
     ${u.status!=='ativo'?`<button class="btn btn-fill" style="background:var(--teal)" onclick="userPesqApprove(${idx})">Aprovar</button>`:''}
     <button class="btn btn-fill" onclick="userEditFromView()">Editar</button>`)+`
  <div class="profile-identity">
    <div class="avatar profile-identity-avatar">${initials}</div>
    <div>
      <div style="font-weight:700;font-size:18px">${esc(u.name)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        ${ROLE_PILL.pesq}
        ${u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>'}
      </div>
    </div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Dados pessoais</div>
      <table style="margin-top:6px">
        ${row('Nome completo',esc(u.name))}
        ${row('CPF',esc(u.cpf))}
        ${row('Data de nascimento',esc(u.birth))}
        ${row('Escolaridade',esc(schoolingLabel(u.escolaridade)))}
        ${row('E-mail',esc(u.email))}
        ${row('Celular',esc(u.phone))}
        ${row('Cidade',esc(u.cidade))}
        ${row('Rua',esc(u.rua))}
        ${row('Número',esc(u.numero))}
        ${row('CEP',esc(u.cep))}
      </table>
      <div class="divider"></div>
      <div class="lbl">Cidades em que pode atuar (até 5)</div>
      <div>${cidades}</div>
    </div>
    <div>
      <div class="card mb profile-documents-card">
        <div class="profile-card-title"><span class="profile-card-icon" aria-hidden="true">▣</span><div><div class="card-t">Documentos obrigatórios</div><div class="profile-card-sub">Arquivos privados do pesquisador</div></div></div>
        ${docRow('Documento com foto',u.docFoto,'foto')}
        ${docRow('Comprovante de residência',u.docComprovante,'comprovante')}
      </div>
      <div class="card">
        <div class="card-t">Dados para pagamento (PIX) <span class="pill pill-gray">Opcional</span></div>
        <table style="margin-top:6px">
          ${row('Chave PIX',esc(u.pixKey))}
          ${row('CPF/CNPJ do titular',esc(u.pixDoc))}
          ${row('Banco',esc(u.pixBank))}
          ${row('Agência',esc(u.pixAg))}
          ${row('Conta',esc(u.pixAcc))}
        </table>
        ${!u.pixKey?'<div class="callout warn" style="margin-top:12px;font-size:12px">Dados de PIX não informados. Edite o cadastro para incluí-los antes de processar pagamentos.</div>':''}
      </div>
    </div>
  </div></div>`;
}
function userViewCliente(u,idx){
  const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const dash='<span style="color:var(--ink3);font-weight:400">—</span>';
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:38%">${l}</td><td style="font-weight:600">${v||dash}</td></tr>`;
  const surveys=(u.surveys||[]).length?u.surveys.map(s=>`<div class="chip" style="margin:2px">${esc(s)}</div>`).join(''):dash;
  const enderecoParts=[[u.rua,u.numero].filter(Boolean).join(', '),u.cidade,u.cep?('CEP '+u.cep):''].filter(Boolean);
  const endereco=enderecoParts.join(' · ');
  return '<div class="profile-page profile-page-client">'+head(u.name,'Dados do cliente',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp(${jsArg(u.phone)})">WhatsApp</button>
     ${userPasswordResetButton(u,idx)}
     <button class="btn btn-fill" onclick="userEditFromView()">Editar</button>`)+`
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
    <div class="avatar" style="width:54px;height:54px;font-size:18px;background:var(--purple)">${initials}</div>
    <div><div style="font-weight:700;font-size:18px">${esc(u.name)}</div>
      <div style="margin-top:4px">${CLIENT_STATUS[u.status]||u.status} ${u.pfpj==='pf'?'<span class="pill pill-gray">Pessoa física</span>':'<span class="pill pill-gray">Pessoa jurídica</span>'}</div></div>
  </div>
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Dados do cliente</div>
      <table style="margin-top:6px">
        ${row('Nome completo / Razão social',esc(u.name))}
        ${row('CPF/CNPJ',esc(u.cpfCnpj))}
        ${u.pfpj==='pf'?row('Data de nascimento',esc(u.birth)):''}
        ${row('Pessoa de contato',esc(u.contact))}
        ${row('E-mail',esc(u.email))}
        ${row('Celular',esc(u.phone))}
        ${row('Endereço',esc(endereco))}
      </table>
      <div class="divider"></div>
      <div class="lbl">Pesquisas vinculadas</div>
      <div>${surveys}</div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">Aprovação do formulário</div>
        <div class="card-d">Selecione uma pesquisa vinculada e envie ao cliente um link real para revisar, aprovar ou solicitar ajustes.</div>
        ${adminClientApprovalMarkup(u,idx)}
      </div>
      <div class="card">
        <div class="card-t">Acesso do cliente (andamento + resultados)</div>
        <div class="card-d">Sem liberar, o cliente só vê o percentual da coleta no perfil dele. Liberando (normalmente após confirmar o pagamento), ele passa a ver o andamento detalhado em tempo real e os resultados da pesquisa.</div>
        <button class="btn ${u.resultsReleased?'btn-out':'btn-fill'}" style="width:100%;${u.resultsReleased?'color:var(--teal);border-color:var(--teal)':''}" onclick="userClienteToggleAccess(${idx})">
          ${u.resultsReleased?'✓ Acesso total liberado — clique para bloquear':'🔓 Liberar acesso total (andamento + resultados)'}
        </button>
        <div class="divider"></div>
        <button class="btn btn-fill" style="width:100%;background:var(--teal)" onclick="userClienteSendReport(${idx})">Enviar relatório via WhatsApp</button>
        <button class="btn btn-out" style="width:100%;margin-top:8px" onclick="alert('Recurso ainda não configurado: relatório (PDF) enviado por e-mail')">Enviar relatório por e-mail</button>
        <button class="btn btn-out" style="width:100%;margin-top:8px" onclick="go('reports')">Abrir relatório (visão interna)</button>
      </div>
    </div>
  </div></div>`;
}
async function approvePesqCommon(i){
  const u=USERS[i];
  if(!u||!userIdForEdit(i))return false;
  if(!u.docFoto||!u.docComprovante){alert('Não é possível aprovar: faltam documentos (documento com foto e/ou comprovante). Edite o cadastro para anexá-los.');return false;}
  if(!confirm('Aprovar o cadastro de '+u.name+'? O pesquisador passará a ficar ativo e poderá ser vinculado a pesquisas.'))return false;
  const {error}=await sb.from('profiles').update({status:'ativo'}).eq('id',u.id);
  if(error){alert('Não foi possível registrar a aprovação: '+error.message);return false;}
  u.status='ativo';
  alert('Cadastro aprovado. Pesquisador ativo e salvo no banco.');
  return true;
}
async function userPesqApprove(i){
  if(!await approvePesqCommon(i))return;
  USER_VIEW=i;USER_ARMED=true;go('users');
}
async function userPesqApproveList(i){
  if(!await approvePesqCommon(i))return;
  go('users');
}
async function userClienteToggleAccess(i){
  const u=USERS[i];
  const next=!u.resultsReleased;
  try{
    if(u.id){
      const {error}=await sb.from('profiles').update({results_released:next}).eq('id',u.id);
      if(error)throw new Error(error.message);
    }
  }catch(ex){alert('Não foi possível salvar: '+ex.message);return;}
  u.resultsReleased=next;
  USER_VIEW=i;USER_ARMED=true;go('users');
}
function userClienteSendReport(i){
  const c=USERS[i];
  clientWhatsAppMsg(c.phone,'Olá '+(c.contact||c.name)+'! O relatório com os resultados da sua pesquisa está disponível: https://pesquisapro.com.br/relatorio/'+(i+1)+'x');
}
async function userDelete(idx){
  const u=USERS[idx];
  if(!confirm('Excluir o cadastro de "'+u.name+'"? Isso remove o perfil do sistema (o login de acesso, se existir, precisa ser removido separadamente pelo suporte técnico).'))return;
  if(u.id){
    const {error}=await sb.from('profiles').delete().eq('id',u.id);
    if(error){
      const errorText=String(error.message||'');
      if(error.code==='23503'&&errorText.includes('collection_events')){
        alert('Este pesquisador possui histórico de coletas. Execute a migration deploy/exclusao-pesquisador-com-coletas.sql no Supabase para preservar as entrevistas e permitir a exclusão do perfil.');
      }else if(error.code==='23503'&&errorText.includes('payments')){
        alert('O histórico financeiro ainda está bloqueando a exclusão. Execute também a migration deploy/exclusao-pesquisador-pagamentos.sql no Supabase.');
      }else{
        alert('Não foi possível excluir: '+errorText);
      }
      return;
    }
  }
  USERS.splice(idx,1);USER_VIEW=null;USER_EDIT=null;go('users');
}
function userForm(){
  const isNew=USER_EDIT==='new';
  const role=isNew?USER_NEW_ROLE:USERS[USER_EDIT].role;
  if(role==='cliente')return userFormCliente(isNew);
  if(role==='pesq')return userFormPesq(isNew);
  if(['admin','coord','gerente'].includes(role))return userFormStaff(isNew);
  return userFormLight(isNew,role);
}
function userFormStaff(isNew){
  const u=isNew?{name:'',cpf:'',birth:'',email:'',phone:'',addr:'',role:'admin',doc:'',status:'ativo'}:USERS[USER_EDIT];
  const staffRoles=['admin','coord','gerente'];
  const roleOpt=staffRoles.map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${ROLE_LABEL[r]}</option>`).join('');
  return head(isNew?'Novo usuário administrativo':'Editar usuário','Preencha todos os campos obrigatórios',
    '<button class="btn btn-out" onclick="userBack()">← Voltar</button>')+`
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Dados pessoais</div>
      <div class="mb"><label class="lbl">Nome completo *</label><input class="inp" id="u-name" value="${esc(u.name)}"></div>
      <div class="field-row mb">
        <div><label class="lbl">CPF *</label><input class="inp" id="u-cpf" value="${esc(u.cpf)}" placeholder="000.000.000-00"></div>
        <div><label class="lbl">Data de nascimento *</label><input class="inp" id="u-birth" type="date" value="${esc(u.birth)}"></div>
      </div>
      <div class="field-row mb">
        <div><label class="lbl">E-mail *</label><input class="inp" id="u-email" type="email" value="${esc(u.email)}"></div>
        <div><label class="lbl">Celular *</label><input class="inp" id="u-phone" value="${esc(u.phone)}" placeholder="(00) 00000-0000"></div>
      </div>
      <div class="mb"><label class="lbl">Endereço *</label><input class="inp" id="u-addr" value="${esc(u.addr)}" placeholder="Rua, nº, bairro, cidade/UF"></div>
      ${isNew?`<div class="mb"><label class="lbl">Senha provisória *</label><input class="inp" id="u-password" type="text" placeholder="Defina uma senha (mín. 6 caracteres) — repasse para a pessoa"></div>`:''}
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">Perfil e acesso</div>
        <div class="mb"><label class="lbl">Perfil de acesso *</label><select class="inp" id="u-role">${roleOpt}</select></div>
        <div class="mb"><label class="lbl">Status</label><select class="inp" id="u-status">
          <option value="ativo" ${u.status==='ativo'?'selected':''}>Ativo</option>
          <option value="pendente" ${u.status==='pendente'?'selected':''}>Pendente</option></select></div>
        <div class="callout" style="font-size:12px">Este perfil só pode ser incluído manualmente pelo Administrador master ou por um ADM PesquisaPro autorizado. Os acessos detalhados de cada perfil ficam em <b>Perfis e permissões</b>.</div>
      </div>
      <div class="card">
        <div class="card-t">Documento *</div>
        <div class="card-d">Anexe RG, CPF ou CNH (foto ou PDF)</div>
        ${u.doc?`<div class="doc-attached"><span>📎 ${esc(u.doc)}</span><button class="btn-ghost" style="color:var(--red)" onclick="userDocClear()">remover</button></div>`:''}
        <div class="doc-drop" onclick="userDocPick()" id="u-doc-drop">
          <div style="font-size:22px">⬆</div>
          <div style="font-weight:600;font-size:13px">${u.doc?'Substituir documento':'Anexar documento'}</div>
          <div style="font-size:11px;color:var(--ink3)">RG, CPF ou CNH · JPG, PNG ou PDF</div>
        </div>
        <input type="file" id="u-doc-file" accept="image/*,application/pdf" style="display:none" onchange="userDocChange(this)">
      </div>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-top:16px;max-width:none">
    <button class="btn btn-out" onclick="userBack()">Cancelar</button>
    <button class="btn btn-fill" style="margin-left:auto" onclick="userSave()">${isNew?'Cadastrar usuário':'Salvar alterações'}</button>
  </div>`;
}
function userFormLight(isNew,role){
  const u=isNew?{name:'',cpf:'',phone:'',email:'',cidade:'',role,status:'ativo',commissionRate:0,commissionRateWithIndicator:0,recruiterCaptureValue:0}:USERS[USER_EDIT];
  return head(isNew?('Novo — '+ROLE_LABEL[role]):'Editar usuário','Preencha os dados do cadastro',
    '<button class="btn btn-out" onclick="userBack()">← Voltar</button>')+`
  <div class="card" style="max-width:640px">
    <div class="card-t">Dados do usuário — ${ROLE_LABEL[role]}</div>
    <div class="mb"><label class="lbl">Nome completo *</label><input class="inp" id="u-name" value="${esc(u.name)}"></div>
    <div class="field-row mb">
      <div><label class="lbl">CPF *</label><input class="inp" id="u-cpf" value="${esc(u.cpf)}" placeholder="000.000.000-00"></div>
      <div><label class="lbl">Celular *</label><input class="inp" id="u-phone" value="${esc(u.phone)}" placeholder="(00) 00000-0000"></div>
    </div>
    <div class="field-row mb">
      <div><label class="lbl">E-mail *</label><input class="inp" id="u-email" type="email" value="${esc(u.email)}"></div>
      <div><label class="lbl">Cidade</label><input class="inp" id="u-cidade" value="${esc(u.cidade||'')}" placeholder="Cidade/UF"></div>
    </div>
    ${isNew?`<div class="mb"><label class="lbl">Senha provisória *</label><input class="inp" id="u-password" type="text" placeholder="Defina uma senha (mín. 6 caracteres) — repasse para a pessoa"></div>`:''}
    ${role==='vendedor'||role==='indicador'?`<div class="field-row mb"><div><label class="lbl">Comissão padrão (%) *</label><input class="inp" id="u-commission" type="number" min="0" max="100" step="0.01" value="${esc(u.commissionRate??0)}"><div style="font-size:11px;color:var(--ink3);margin-top:4px">Comece em 0% e defina conforme o acordo comercial.</div></div>${role==='vendedor'?`<div><label class="lbl">Comissão do vendedor com indicador (%)</label><input class="inp" id="u-commission-indicator" type="number" min="0" max="100" step="0.01" value="${esc(u.commissionRateWithIndicator??0)}"><div style="font-size:11px;color:var(--ink3);margin-top:4px">Deve ser menor ou igual à comissão padrão.</div></div>`:''}</div>`:''}
    ${role==='recrutador'?`<div class="mb"><label class="lbl">Valor por pesquisador captado (R$) *</label><input class="inp" id="u-recruiter-value" type="number" min="0" step="0.01" value="${esc(u.recruiterCaptureValue??0)}"><div style="font-size:11px;color:var(--ink3);margin-top:4px">Esse valor será reservado por cadastro atribuído a este recrutador.</div></div>`:''}
    <div class="mb" style="max-width:220px"><label class="lbl">Status</label><select class="inp" id="u-status">
      <option value="ativo" ${u.status==='ativo'?'selected':''}>Ativo</option>
      <option value="pendente" ${u.status==='pendente'?'selected':''}>Pendente</option></select></div>
    <div class="callout" style="font-size:12px">Este perfil só pode ser incluído manualmente pelo Administrador master ou por um ADM PesquisaPro autorizado — não há autocadastro.</div>
  </div>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn btn-out" onclick="userBack()">Cancelar</button>
    <button class="btn btn-fill" style="margin-left:auto" onclick="userSave()">${isNew?'Cadastrar usuário':'Salvar alterações'}</button>
  </div>`;
}
function userFormCliente(isNew){
  const u=isNew?{name:'',cpfCnpj:'',pfpj:'pj',birth:'',contact:'',email:'',phone:'',cidade:'',rua:'',numero:'',cep:'',status:'prospecto',surveys:[],resultsReleased:false}:USERS[USER_EDIT];
  const statusOpt=['ativo','prospecto','encerrado'].map(s=>`<option value="${s}" ${u.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
  return head(isNew?'Novo cliente':'Editar cliente','Preencha os dados do cliente',
    '<button class="btn btn-out" onclick="userBack()">← Voltar</button>')+`
  <div class="card" style="max-width:680px">
    <div class="card-t">Dados do cliente</div>
    <div class="mb" style="max-width:220px"><label class="lbl">Tipo de cliente</label>
      <select class="inp" id="c-pfpj" onchange="userClientePfPjToggle()">
        <option value="pj" ${u.pfpj!=='pf'?'selected':''}>Pessoa jurídica</option>
        <option value="pf" ${u.pfpj==='pf'?'selected':''}>Pessoa física</option>
      </select>
    </div>
    <div class="mb"><label class="lbl">Nome completo / Razão social *</label><input class="inp" id="c-name" value="${esc(u.name)}"></div>
    <div class="field-row mb">
      <div><label class="lbl">CPF ou CNPJ *</label><input class="inp" id="c-cpfcnpj" value="${esc(u.cpfCnpj)}" placeholder="000.000.000-00 ou 00.000.000/0001-00"></div>
      <div id="c-birth-wrap" style="${u.pfpj==='pf'?'':'display:none'}"><label class="lbl">Data de nascimento *</label><input class="inp" id="c-birth" type="date" value="${esc(u.birth||'')}"></div>
    </div>
    <div class="mb"><label class="lbl">Pessoa de contato</label><input class="inp" id="c-contact" value="${esc(u.contact||'')}" placeholder="Opcional — para pessoa jurídica"></div>
    <div class="field-row mb">
      <div><label class="lbl">E-mail *</label><input class="inp" id="c-email" type="email" value="${esc(u.email)}"></div>
      <div><label class="lbl">Celular *</label><input class="inp" id="c-phone" value="${esc(u.phone)}" placeholder="(00) 00000-0000"></div>
    </div>
    <div class="field-row mb">
      <div><label class="lbl">Cidade *</label><input class="inp" id="c-cidade" value="${esc(u.cidade||'')}" placeholder="Cidade/UF"></div>
      <div><label class="lbl">CEP</label><input class="inp" id="c-cep" value="${esc(u.cep||'')}" placeholder="00000-000"></div>
    </div>
    <div class="field-row mb">
      <div><label class="lbl">Rua</label><input class="inp" id="c-rua" value="${esc(u.rua||'')}"></div>
      <div><label class="lbl">Número</label><input class="inp" id="c-numero" value="${esc(u.numero||'')}"></div>
    </div>
    ${isNew?`<div class="mb"><label class="lbl">Senha provisória *</label><input class="inp" id="c-password" type="text" placeholder="Defina uma senha (mín. 6 caracteres) — repasse para o cliente"></div>`:''}
    <div class="mb" style="max-width:220px"><label class="lbl">Status</label><select class="inp" id="c-status">${statusOpt}</select></div>
  </div>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn btn-out" onclick="userBack()">Cancelar</button>
    <button class="btn btn-fill" style="margin-left:auto" onclick="userSave()">${isNew?'Cadastrar cliente':'Salvar alterações'}</button>
  </div>`;
}
function userClientePfPjToggle(){
  const v=document.getElementById('c-pfpj').value;
  const wrap=document.getElementById('c-birth-wrap');
  if(wrap)wrap.style.display=v==='pf'?'':'none';
}
let _pesqCidadesDraft=[];
function userFormPesq(isNew){
  const u=isNew?{name:'',cpf:'',birth:'',escolaridade:'',email:'',phone:'',cidade:'',rua:'',numero:'',cep:'',role:'pesq',status:'ativo',docFoto:'',docComprovante:'',cidadesAtuacao:[],pixKey:'',pixDoc:'',pixBank:'',pixAg:'',pixAcc:''}:USERS[USER_EDIT];
  return head(isNew?'Novo pesquisador':'Editar pesquisador','Preencha todos os campos obrigatórios',
    '<button class="btn btn-out" onclick="userBack()">← Voltar</button>')+`
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Dados pessoais</div>
      <div class="mb"><label class="lbl">Nome completo *</label><input class="inp" id="u-name" value="${esc(u.name)}"></div>
      <div class="field-row mb">
        <div><label class="lbl">CPF *</label><input class="inp" id="u-cpf" value="${esc(u.cpf)}" placeholder="000.000.000-00"></div>
        <div><label class="lbl">Data de nascimento *</label><input class="inp" id="u-birth" type="date" value="${esc(u.birth)}"></div>
      </div>
      <div class="mb"><label class="lbl">Escolaridade</label><select class="inp" id="u-escolaridade"><option value="">Não informada</option>${SCHOOLING_OPTIONS.map(([value,label])=>`<option value="${value}" ${u.escolaridade===value?'selected':''}>${label}</option>`).join('')}</select></div>
      <div class="field-row mb">
        <div><label class="lbl">E-mail *</label><input class="inp" id="u-email" type="email" value="${esc(u.email)}"></div>
        <div><label class="lbl">Celular *</label><input class="inp" id="u-phone" value="${esc(u.phone)}" placeholder="(00) 00000-0000"></div>
      </div>
      <div class="field-row mb">
        <div><label class="lbl">Cidade *</label><input class="inp" id="u-cidade" value="${esc(u.cidade)}" placeholder="Cidade/UF"></div>
        <div><label class="lbl">CEP *</label><input class="inp" id="u-cep" value="${esc(u.cep)}" placeholder="00000-000"></div>
      </div>
      <div class="field-row mb">
        <div><label class="lbl">Rua *</label><input class="inp" id="u-rua" value="${esc(u.rua)}"></div>
        <div><label class="lbl">Número *</label><input class="inp" id="u-numero" value="${esc(u.numero)}"></div>
      </div>
      ${isNew?`<div class="mb"><label class="lbl">Senha provisória *</label><input class="inp" id="u-password" type="text" placeholder="Defina uma senha (mín. 6 caracteres) — repasse para o pesquisador"></div>`:''}
      <div class="mb"><label class="lbl">Chave PIX (opcional)</label><input class="inp" id="u-pix-key" value="${esc(u.pixKey||'')}" placeholder="CPF, e-mail, telefone ou aleatória"></div>
      <div class="field-row mb">
        <div><label class="lbl">CPF/CNPJ do titular</label><input class="inp" id="u-pix-doc" value="${esc(u.pixDoc||'')}" placeholder="000.000.000-00"></div>
        <div><label class="lbl">Banco</label><input class="inp" id="u-pix-bank" value="${esc(u.pixBank||'')}" placeholder="Ex.: Banco do Brasil"></div>
      </div>
      <div class="field-row">
        <div><label class="lbl">Agência</label><input class="inp" id="u-pix-ag" value="${esc(u.pixAg||'')}" placeholder="0000"></div>
        <div><label class="lbl">Conta</label><input class="inp" id="u-pix-acc" value="${esc(u.pixAcc||'')}" placeholder="00000-0"></div>
      </div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">Cidades em que pode atuar *</div>
        <div class="card-d">Escolha até 5 cidades onde este pesquisador pode fazer coleta</div>
        <div id="pesq-cidades-wrap">${renderPesqCidadesWidget()}</div>
      </div>
      <div class="card mb">
        <div class="card-t">Documentos obrigatórios *</div>
        <div class="card-d">Anexe os 2 documentos exigidos para o cadastro</div>
        <div class="lbl" style="margin-top:2px">Documento com foto (RG, CPF ou CNH)</div>
        ${u.docFoto?`<div class="doc-attached"><span>📎 ${esc(u.docFoto)}</span><button class="btn-ghost" style="color:var(--red)" onclick="userDocClear('foto')">remover</button></div>`:''}
        <div class="doc-drop" onclick="userDocPick('foto')" id="u-doc-foto-drop">
          <div style="font-size:22px">⬆</div>
          <div style="font-weight:600;font-size:13px">${u.docFoto?'Substituir documento':'Anexar documento com foto'}</div>
          <div style="font-size:11px;color:var(--ink3)">JPG, PNG ou PDF</div>
        </div>
        <input type="file" id="u-doc-foto-file" accept="image/*,application/pdf" style="display:none" onchange="userDocChange('foto',this)">
        <div class="lbl" style="margin-top:14px">Comprovante de residência</div>
        ${u.docComprovante?`<div class="doc-attached"><span>📎 ${esc(u.docComprovante)}</span><button class="btn-ghost" style="color:var(--red)" onclick="userDocClear('comp')">remover</button></div>`:''}
        <div class="doc-drop" onclick="userDocPick('comp')" id="u-doc-comp-drop">
          <div style="font-size:22px">⬆</div>
          <div style="font-weight:600;font-size:13px">${u.docComprovante?'Substituir documento':'Anexar comprovante de residência'}</div>
          <div style="font-size:11px;color:var(--ink3)">JPG, PNG ou PDF · conta de água, luz, etc.</div>
        </div>
        <input type="file" id="u-doc-comp-file" accept="image/*,application/pdf" style="display:none" onchange="userDocChange('comp',this)">
      </div>
      <div class="card">
        <div class="card-t">Status</div>
        <select class="inp" id="u-status">
          <option value="ativo" ${u.status==='ativo'?'selected':''}>Ativo</option>
          <option value="pendente" ${u.status==='pendente'?'selected':''}>Pendente</option></select>
      </div>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-top:16px;max-width:none">
    <button class="btn btn-out" onclick="userBack()">Cancelar</button>
    <button class="btn btn-fill" style="margin-left:auto" onclick="userSave()">${isNew?'Cadastrar pesquisador':'Salvar alterações'}</button>
  </div>`;
}
function renderPesqCidadesWidget(){
  const chips=_pesqCidadesDraft.map(c=>`<span class="chip on" style="margin:2px">${esc(c)} <a href="javascript:void(0)" onclick="pesqCidadeRemove('${esc(c).replace(/'/g,'&#39;')}')" style="margin-left:4px;color:inherit">✕</a></span>`).join('')||'<span style="color:var(--ink3);font-size:12.5px">Nenhuma cidade selecionada ainda.</span>';
  const full=_pesqCidadesDraft.length>=5;
  return `<div style="margin-bottom:8px">${chips}</div>
    ${full?'<div class="callout warn" style="font-size:12px">Limite de 5 cidades atingido. Remova uma para adicionar outra.</div>'
      :`<input class="inp" placeholder="Buscar cidade…" id="pesq-cidade-search" oninput="pesqCidadeSearch(this.value)" autocomplete="off">
      <div id="pesq-cidade-suggest" class="geo-box" style="display:none;margin-top:6px;max-height:170px"></div>`}`;
}
function pesqCidadeSearch(q){
  const box=document.getElementById('pesq-cidade-suggest');if(!box)return;
  const qq=(q||'').trim().toLowerCase();
  if(qq.length<2){box.style.display='none';box.innerHTML='';return;}
  const out=[];
  outer: for(const uf of Object.keys(BR_MUNICIPIOS)){
    for(const c of BR_MUNICIPIOS[uf]){
      if(c.toLowerCase().includes(qq)){
        const val=c+'/'+uf;
        if(!_pesqCidadesDraft.includes(val))out.push(val);
        if(out.length>=8)break outer;
      }
    }
  }
  box.innerHTML=out.length
    ?out.map(v=>`<div class="geo-city-row" onclick="pesqCidadeAdd('${v.replace(/'/g,'&#39;')}')">${esc(v)}</div>`).join('')
    :'<div class="geo-city-row" style="cursor:default;color:var(--ink3)">Nenhuma cidade encontrada</div>';
  box.style.display='';
}
function pesqCidadeAdd(city){
  if(_pesqCidadesDraft.length>=5){alert('Você já escolheu 5 cidades — o máximo permitido. Remova uma para adicionar outra.');return;}
  if(!_pesqCidadesDraft.includes(city))_pesqCidadesDraft.push(city);
  const wrap=document.getElementById('pesq-cidades-wrap');
  if(wrap)wrap.innerHTML=renderPesqCidadesWidget();
}
function pesqCidadeRemove(city){
  _pesqCidadesDraft=_pesqCidadesDraft.filter(c=>c!==city);
  const wrap=document.getElementById('pesq-cidades-wrap');
  if(wrap)wrap.innerHTML=renderPesqCidadesWidget();
}
let _docDraft=null,_docFotoDraft=null,_docCompDraft=null;
function userDocPick(which){
  if(which==='foto')document.getElementById('u-doc-foto-file').click();
  else if(which==='comp')document.getElementById('u-doc-comp-file').click();
  else document.getElementById('u-doc-file').click();
}
function userDocChange(which,input){
  if(typeof which!=='string'){input=which;which=null;}
  const f=input&&input.files&&input.files[0];
  if(!f)return;
  if(which==='foto'){
    _docFotoDraft=f.name;
    const drop=document.getElementById('u-doc-foto-drop');
    if(drop){drop.querySelector('div:nth-child(2)').textContent='Selecionado: '+f.name;drop.style.borderColor='var(--teal)';drop.style.background='var(--teal-l)';}
  }else if(which==='comp'){
    _docCompDraft=f.name;
    const drop=document.getElementById('u-doc-comp-drop');
    if(drop){drop.querySelector('div:nth-child(2)').textContent='Selecionado: '+f.name;drop.style.borderColor='var(--teal)';drop.style.background='var(--teal-l)';}
  }else{
    _docDraft=f.name;
    const drop=document.getElementById('u-doc-drop');
    if(drop){drop.querySelector('div:nth-child(2)').textContent='Selecionado: '+f.name;drop.style.borderColor='var(--teal)';drop.style.background='var(--teal-l)';}
  }
}
function userDocClear(which){
  if(which==='foto'){
    if(USER_EDIT!=='new'&&USERS[USER_EDIT])USERS[USER_EDIT].docFoto='';
    _docFotoDraft=null;
  }else if(which==='comp'){
    if(USER_EDIT!=='new'&&USERS[USER_EDIT])USERS[USER_EDIT].docComprovante='';
    _docCompDraft=null;
  }else{
    if(USER_EDIT!=='new'&&USERS[USER_EDIT])USERS[USER_EDIT].doc='';
    _docDraft=null;
  }
  USER_ARMED=true;go('users');
}
function userSave(){
  const isNew=USER_EDIT==='new';
  if(!isNew&&!userIdForEdit(USER_EDIT))return;
  const role=isNew?USER_NEW_ROLE:USERS[USER_EDIT].role;
  if(role==='cliente')return userSaveCliente(isNew);
  if(role==='pesq')return userSavePesq(isNew);
  if(['admin','coord','gerente'].includes(role))return userSaveStaff(isNew);
  return userSaveLight(isNew,role);
}
function userSaveSetBusy(busy){
  const btns=document.querySelectorAll('.btn-fill');
  btns.forEach(b=>{if(b.textContent.includes('adastr')||b.textContent.includes('Salvar')){b.disabled=busy;}});
}
async function userSaveStaff(isNew){
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const name=g('u-name'),cpf=g('u-cpf'),birth=g('u-birth'),email=g('u-email'),phone=g('u-phone'),addr=g('u-addr');
  const password=isNew?g('u-password'):'';
  const missing=[];
  if(!name)missing.push('Nome');if(!cpf)missing.push('CPF');if(!birth)missing.push('Data de nascimento');
  if(!email)missing.push('E-mail');if(!phone)missing.push('Celular');if(!addr)missing.push('Endereço');
  const existingDoc=isNew?'':(USERS[USER_EDIT]?USERS[USER_EDIT].doc:'');
  const doc=_docDraft||existingDoc;
  if(!doc)missing.push('Documento (anexo)');
  if(isNew&&(!password||password.length<6))missing.push('Senha provisória (mínimo 6 caracteres)');
  if(missing.length){alert('Preencha os campos obrigatórios:\n• '+missing.join('\n• '));return;}
  const role=g('u-role'),rec={name,cpf,birth,email,phone,addr,role,status:g('u-status')||'ativo',doc};
  userSaveSetBusy(true);
  try{
    if(isNew){
      const inserted=await createLoginAndProfile(email,password,role,rec);
      USERS.unshift(profileRowToUser(inserted));
    }else{
      const {error}=await sb.from('profiles').update(userToProfileRow(rec,role)).eq('id',USERS[USER_EDIT].id);
      if(error)throw new Error(error.message);
      Object.assign(USERS[USER_EDIT],rec);
    }
  }catch(ex){userSaveSetBusy(false);alert('Não foi possível salvar: '+ex.message);return;}
  _docDraft=null;USER_EDIT=null;
  alert(isNew?'Usuário cadastrado.':'Alterações salvas.');
  go('users');
}
async function userSaveLight(isNew,role){
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const name=g('u-name'),cpf=g('u-cpf'),phone=g('u-phone'),email=g('u-email');
  const password=isNew?g('u-password'):'';
  const missing=[];
  if(!name)missing.push('Nome completo');if(!cpf)missing.push('CPF');
  if(!phone)missing.push('Celular');if(!email)missing.push('E-mail');
  if(isNew&&(!password||password.length<6))missing.push('Senha provisória (mínimo 6 caracteres)');
  if(missing.length){alert('Preencha os campos obrigatórios:\n• '+missing.join('\n• '));return;}
  const commissionRate=(role==='vendedor'||role==='indicador')?Number(g('u-commission').replace(',','.')):0;
  const commissionRateWithIndicator=role==='vendedor'?Number(g('u-commission-indicator').replace(',','.')):0;
  const recruiterCaptureValue=role==='recrutador'?Number(g('u-recruiter-value').replace(',','.')):0;
  if(!Number.isFinite(commissionRate)||commissionRate<0||commissionRate>100){alert('A comissão padrão deve estar entre 0% e 100%.');return;}
  if(!Number.isFinite(commissionRateWithIndicator)||commissionRateWithIndicator<0||commissionRateWithIndicator>100){alert('A comissão do vendedor com indicador deve estar entre 0% e 100%.');return;}
  if(role==='vendedor'&&commissionRateWithIndicator>commissionRate){alert('Quando houver indicador, a comissão do vendedor deve ser menor ou igual à comissão padrão.');return;}
  if(!Number.isFinite(recruiterCaptureValue)||recruiterCaptureValue<0){alert('O valor por pesquisador captado deve ser igual ou maior que R$ 0,00.');return;}
  const generatedRecruiterCode=isNew&&role==='recrutador'?('rec-'+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,'').slice(0,10):Math.random().toString(36).slice(2,12))):'';
  const recruiterCode=role==='recrutador'?(isNew?generatedRecruiterCode:(USERS[USER_EDIT]?.recruiterCode||generatedRecruiterCode)):'';
  const rec={name,cpf,phone,email,cidade:g('u-cidade'),role,status:g('u-status')||'ativo',commissionRate,commissionRateWithIndicator,recruiterCaptureValue,recruiterCode};
  userSaveSetBusy(true);
  try{
    if(isNew){
      const inserted=await createLoginAndProfile(email,password,role,rec);
      USERS.unshift(profileRowToUser(inserted));
    }else{
      const {error}=await sb.from('profiles').update(userToProfileRow(rec,role)).eq('id',USERS[USER_EDIT].id);
      if(error)throw new Error(error.message);
      Object.assign(USERS[USER_EDIT],rec);
    }
  }catch(ex){userSaveSetBusy(false);alert('Não foi possível salvar: '+ex.message);return;}
  USER_EDIT=null;
  alert(isNew?'Usuário cadastrado.':'Alterações salvas.');
  go('users');
}
async function userSaveCliente(isNew){
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const pfpj=g('c-pfpj')||'pj';
  const name=g('c-name'),cpfCnpj=g('c-cpfcnpj'),email=g('c-email'),phone=g('c-phone'),cidade=g('c-cidade');
  const birth=pfpj==='pf'?g('c-birth'):'';
  const password=isNew?g('c-password'):'';
  const missing=[];
  if(!name)missing.push('Nome completo / Razão social');if(!cpfCnpj)missing.push('CPF ou CNPJ');
  if(pfpj==='pf'&&!birth)missing.push('Data de nascimento');
  if(!email)missing.push('E-mail');if(!phone)missing.push('Celular');if(!cidade)missing.push('Cidade');
  if(isNew&&(!password||password.length<6))missing.push('Senha provisória (mínimo 6 caracteres)');
  if(missing.length){alert('Preencha os campos obrigatórios:\n• '+missing.join('\n• '));return;}
  const rec={name,company:name,cpfCnpj,pfpj,birth,contact:g('c-contact'),email,phone,cidade,rua:g('c-rua'),numero:g('c-numero'),cep:g('c-cep'),role:'cliente',status:g('c-status')||'prospecto'};
  userSaveSetBusy(true);
  try{
    if(isNew){
      rec.surveys=[];rec.resultsReleased=false;
      const inserted=await createLoginAndProfile(email,password,'cliente',rec);
      USERS.unshift(profileRowToUser(inserted));
    }else{
      const {error}=await sb.from('profiles').update(userToProfileRow(rec,'cliente')).eq('id',USERS[USER_EDIT].id);
      if(error)throw new Error(error.message);
      Object.assign(USERS[USER_EDIT],rec);
    }
  }catch(ex){userSaveSetBusy(false);alert('Não foi possível salvar: '+ex.message);return;}
  USER_EDIT=null;
  alert(isNew?'Cliente cadastrado.':'Alterações salvas.');
  go('users');
}
async function userSavePesq(isNew){
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const name=g('u-name'),cpf=g('u-cpf'),birth=g('u-birth'),escolaridade=g('u-escolaridade'),email=g('u-email'),phone=g('u-phone');
  const cidade=g('u-cidade'),cep=g('u-cep'),rua=g('u-rua'),numero=g('u-numero'),pixKey=g('u-pix-key');
  const password=isNew?g('u-password'):'';
  const missing=[];
  if(!name)missing.push('Nome completo');if(!cpf)missing.push('CPF');if(!birth)missing.push('Data de nascimento');
  if(!email)missing.push('E-mail');if(!phone)missing.push('Celular');
  if(!cidade)missing.push('Cidade');if(!cep)missing.push('CEP');if(!rua)missing.push('Rua');if(!numero)missing.push('Número');
    if(!_pesqCidadesDraft.length)missing.push('Cidades em que pode atuar (pelo menos 1)');
  const existingFoto=isNew?'':(USERS[USER_EDIT]?USERS[USER_EDIT].docFoto:'');
  const existingComp=isNew?'':(USERS[USER_EDIT]?USERS[USER_EDIT].docComprovante:'');
  const docFoto=_docFotoDraft||existingFoto;
  const docComprovante=_docCompDraft||existingComp;
  if(!docFoto)missing.push('Documento com foto');
  if(!docComprovante)missing.push('Comprovante de residência');
  if(isNew&&(!password||password.length<6))missing.push('Senha provisória (mínimo 6 caracteres)');
  if(missing.length){alert('Preencha os campos obrigatórios:\n• '+missing.join('\n• '));return;}
  const cidadesAtuacao=_pesqCidadesDraft.slice();
  const rec={name,cpf,birth,escolaridade,email,phone,cidade,rua,numero,cep,role:'pesq',status:g('u-status')||'ativo',
    docFoto,docComprovante,cidadesAtuacao,
    pixKey,pixDoc:g('u-pix-doc'),pixBank:g('u-pix-bank'),pixAg:g('u-pix-ag'),pixAcc:g('u-pix-acc')};
  userSaveSetBusy(true);
  try{
    if(isNew){
      const inserted=await createLoginAndProfile(email,password,'pesq',rec);
      await syncPesqCidades(inserted.id,cidadesAtuacao);
      const user=profileRowToUser(inserted);user.cidadesAtuacao=cidadesAtuacao;
      USERS.unshift(user);
    }else{
      const {error}=await updateProfileSafe(USERS[USER_EDIT].id,userToProfileRow(rec,'pesq'));
      if(error)throw new Error(error.message);
      await syncPesqCidades(USERS[USER_EDIT].id,cidadesAtuacao);
      Object.assign(USERS[USER_EDIT],rec);
    }
  }catch(ex){userSaveSetBusy(false);alert('Não foi possível salvar: '+ex.message);return;}
  _docFotoDraft=null;_docCompDraft=null;_pesqCidadesDraft=[];USER_EDIT=null;
  alert(isNew?'Pesquisador cadastrado.':'Alterações salvas.');
  go('users');
}

/* ============ PERMISSIONS ============ */
PAGES.permissions=()=>head('Perfis e permissões','Defina o que cada perfil pode fazer no sistema',
  '<button class="btn btn-out" onclick="permAdd()">+ Nova permissão</button><button class="btn btn-fill" onclick="permSave()">Salvar</button>')+`
  <div class="callout" style="margin-bottom:16px">Clique nas células para conceder ou remover cada permissão por perfil. Você pode adicionar novas permissões.</div>
  <div class="card">
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Permissão</th>${PERM_ROLES.map(r=>`<th style="text-align:center;white-space:nowrap">${ROLE_LABEL[r]}</th>`).join('')}<th></th></tr></thead>
      <tbody id="permBody"></tbody>
    </table>
    </div>
  </div>`;

/* ============ FINANCE ============ */
/* ============ FINANCEIRO — carregamento e gravação no Supabase ============
   Válidos/rejeitados de cada pesquisador em cada pesquisa vêm de verdade da
   Coleta de campo agora: um gatilho no banco (veja schema.sql) recalcula
   esses números automaticamente toda vez que uma coleta é enviada pelo app
   do pesquisador ou reprovada/reaprovada na auditoria — por isso eles
   aparecem aqui como somente leitura. O que o staff ainda decide manualmente
   é só o status do pagamento em si (pendente/aprovado/em auditoria), em
   "Definir status". Todo pesquisador atribuído à equipe da pesquisa aparece
   na lista mesmo sem nenhuma coleta ainda, com 0 entrevistas — só vira uma
   linha de verdade no banco quando a primeira coleta dele é enviada. */
let PAYMENTS=[]; // {id, surveyId, researcherId, name, pixKey, valid, rejected, status}
let PAYMENTS_LOADED=false,PAYMENTS_LOADING=false;
let PAYMENT_RECEIPTS=[]; // {id,paymentId,researcherId,amount,paidAt,note,createdBy,createdAt}
let PAYMENT_RECEIPTS_LOADED=false,PAYMENT_RECEIPTS_LOADING=false,PAYMENT_RECEIPTS_SCHEMA_MISSING=false;
const FIN_STATUS={
  aprovado:{pill:'<span class="pill pill-green">● Aprovado</span>'},
  pendente:{pill:'<span class="pill pill-amber">● Dados bancários pendentes</span>'},
  auditoria:{pill:'<span class="pill pill-blue">● Em auditoria</span>'},
};
let FIN_IDX=null,FIN_ARMED=false;
const brl=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
function maskPix(v){
  if(!v)return null;
  return v.length<=4?'•••'+v:'•••'+v.slice(-4);
}
function paymentRowToEntry(row){
  const u=USERS.find(x=>x.id===row.researcher_id);
  return {id:row.id,surveyId:row.survey_id,researcherId:row.researcher_id,
    name:u?u.name:'(pesquisador removido)',pixKey:u?u.pixKey:'',
    valid:row.valid_count||0,rejected:row.rejected_count||0,status:row.status||'pendente'};
}
function paymentReceiptRowToEntry(row){
  return {id:row.id,paymentId:row.payment_id,researcherId:row.researcher_id,
    amount:Number(row.amount)||0,paidAt:row.paid_at||'',note:row.note||'',
    createdBy:row.created_by||'',createdAt:row.created_at||''};
}
function paymentReceiptsFor(paymentId){return PAYMENT_RECEIPTS.filter(r=>r.paymentId===paymentId);}
function paymentReceivedValue(paymentId){return paymentId?paymentReceiptsFor(paymentId).reduce((sum,r)=>sum+r.amount,0):0;}
function paymentDueValue(row,price){return Math.max(0,(Number(row?.valid)||0)*(Number(price)||0));}
function paymentBalanceValue(row,price){return Math.max(0,paymentDueValue(row,price)-paymentReceivedValue(row?.id));}
function paymentReceiptMigrationNotice(){
  return PAYMENT_RECEIPTS_SCHEMA_MISSING
    ? '<div class="callout warn payment-ledger-warning"><b>Livro de recebimentos ainda não habilitado.</b> Execute a migration <code>deploy/pagamentos-recebimentos-extrato.sql</code> no Supabase para liberar aprovações em lote, lançamentos pagos e extrato de recebimentos.</div>'
    : '';
}
async function loadPaymentsIfNeeded(){
  if(PAYMENTS_LOADED||PAYMENTS_LOADING)return;
  PAYMENTS_LOADING=true;
  await loadUsersIfNeeded();
  try{
    const {data,error}=await sb.from('payments').select('*');
    if(!error){PAYMENTS=(data||[]).map(paymentRowToEntry);PAYMENTS_LOADED=true;}
    else console.error('Erro ao carregar financeiro:',error);
  }catch(ex){console.error('Erro de conexão ao carregar financeiro:',ex);}
  PAYMENTS_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='finance'||k==='my-earnings'||k==='dashboard-pesq')go(k);
}
async function loadPaymentReceiptsIfNeeded(){
  if(PAYMENT_RECEIPTS_LOADED||PAYMENT_RECEIPTS_LOADING)return;
  PAYMENT_RECEIPTS_LOADING=true;
  try{
    const {data,error}=await sb.from('payment_receipts').select('*').order('paid_at',{ascending:false});
    if(error){
      PAYMENT_RECEIPTS_SCHEMA_MISSING=/payment_receipts|relation|schema cache|does not exist/i.test(error.message||'');
      console.error('Erro ao carregar livro de recebimentos:',error);
    }else PAYMENT_RECEIPTS=(data||[]).map(paymentReceiptRowToEntry);
  }catch(ex){
    PAYMENT_RECEIPTS_SCHEMA_MISSING=/payment_receipts|relation|schema cache|does not exist/i.test(ex.message||'');
    console.error('Erro de conexão ao carregar livro de recebimentos:',ex);
  }
  PAYMENT_RECEIPTS_LOADED=true;PAYMENT_RECEIPTS_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='finance'||k==='my-earnings')go(k);
}
/* define só o status do pagamento (pendente/aprovado/auditoria) — válidos e
   rejeitados não são mais editáveis aqui: vêm de verdade da Coleta de campo
   e são recalculados sozinhos por um gatilho no banco (schema.sql) */
async function saveFinStatus(surveyId,researcherId,status){
  const existing=PAYMENTS.find(p=>p.surveyId===surveyId&&p.researcherId===researcherId);
  if(existing&&status!=='aprovado'&&paymentReceivedValue(existing.id)>0)throw new Error('Este pagamento já possui recebimento registrado e não pode voltar para pendente ou auditoria.');
  if(existing){
    const {error}=await sb.from('payments').update({status}).eq('id',existing.id);
    if(error)throw new Error(error.message);
    existing.status=status;
  }else{
    const {data:inserted,error}=await sb.from('payments').insert({survey_id:surveyId,researcher_id:researcherId,valid_count:0,rejected_count:0,status}).select().single();
    if(error)throw new Error(error.message);
    PAYMENTS.push(paymentRowToEntry(inserted));
  }
}
function finRows(idx){
  const s=SURVEYS[idx];if(!s)return [];
  const real=PAYMENTS.filter(p=>p.surveyId===s.id);
  const covered=new Set(real.map(p=>p.researcherId));
  const virtual=(s.team||[]).map(name=>pesqUsers().find(u=>u.name===name)).filter(Boolean)
    .filter(u=>!covered.has(u.id))
    .map(u=>({surveyId:s.id,researcherId:u.id,name:u.name,pixKey:u.pixKey||'',valid:0,rejected:0,status:'pendente',virtual:true}));
  return [...real,...virtual];
}
function finTotals(idx){
  const s=SURVEYS[idx];const rows=finRows(idx);const price=s?+s.price:5;
  const valid=rows.reduce((a,r)=>a+r.valid,0);
  const rejected=rows.reduce((a,r)=>a+r.rejected,0);
  const valor=rows.reduce((a,r)=>a+r.valid*price,0);
  const pendingValor=rows.filter(r=>r.status!=='aprovado').reduce((a,r)=>a+r.valid*price,0);
  const recebido=rows.reduce((a,r)=>a+paymentReceivedValue(r.id),0);
  const aReceber=rows.filter(r=>r.status==='aprovado').reduce((a,r)=>a+paymentBalanceValue(r,price),0);
  const rejeitadoValor=rejected*price;
  return{valid,rejected,valor,pendingValor,recebido,aReceber,rejeitadoValor,count:rows.length};
}
PAGES.finance=()=>{
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED||!PAYMENT_RECEIPTS_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    if(!PAYMENT_RECEIPTS_LOADED)loadPaymentReceiptsIfNeeded();
    return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada')+'<div class="empty">Carregando dados financeiros…</div>';
  }
  if(FIN_IDX!=null)return financeDetail(FIN_IDX);
  return financeList();
};
function financeList(){
  const entries=SURVEYS.map((s,i)=>({s,i,t:finTotals(i)}));
  const totalValor=entries.reduce((a,e)=>a+e.t.valor,0);
  const totalPend=entries.reduce((a,e)=>a+e.t.pendingValor,0);
  const totalRecebido=entries.reduce((a,e)=>a+e.t.recebido,0);
  const totalAReceber=entries.reduce((a,e)=>a+e.t.aReceber,0);
  const totalValid=entries.reduce((a,e)=>a+e.t.valid,0);
  const totalPesq=entries.reduce((a,e)=>a+e.t.count,0);
  const body=entries.map(({s,i,t})=>`<tr style="cursor:pointer" onclick="financeOpen(${i})">
      <td><b>${esc(s.name)}</b><div style="margin-top:2px">${STATUS_PILL[s.status]||s.status}</div></td>
      <td>${t.count?t.count+' pesquisador'+(t.count===1?'':'es'):'<span style="color:var(--ink3)">sem coleta</span>'}</td>
      <td>${t.valid.toLocaleString('pt-BR')}</td>
      <td><b>${brl(t.valor)}</b></td>
      <td>${t.aReceber?'<span class="pill pill-blue">'+brl(t.aReceber)+' a receber</span>':t.pendingValor?'<span class="pill pill-amber">'+brl(t.pendingValor)+' pendente</span>':(t.count?'<span class="pill pill-green">Tudo em dia</span>':'<span style="color:var(--ink3)">—</span>')}</td>
      <td><span class="pill pill-blue">Abrir →</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma pesquisa cadastrada.</td></tr>';
  return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada')+`
  ${paymentReceiptMigrationNotice()}
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('A pagar (todas as pesquisas)',brl(totalValor),totalValid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('Pendente de pagamento',brl(totalPend),'aguardando aprovação','◷','#d97706')}
    ${stat('A receber',brl(totalAReceber),'pagamentos aprovados','◷','#2563eb')}
    ${stat('Recebido',brl(totalRecebido),'repasses lançados','✓','#059669')}
    ${stat('Pesquisadores remunerados',String(totalPesq),'com entrevistas válidas','☺','#059669')}
    ${stat('Valor padrão por formulário','R$ 5,00','pode variar por pesquisa','◷','#7c3aed')}
  </div>
  <div class="card">
    <div class="card-t">Pesquisas</div>
    <div class="card-d">Clique numa pesquisa para ver o valor a pagar por pesquisador que coletou entrevistas válidas nela</div>
    <table><thead><tr><th>Pesquisa</th><th>Equipe</th><th>Entrevistas válidas</th><th>Total a pagar</th><th>Situação</th><th></th></tr></thead>
    <tbody>${body}</tbody></table>
  </div>`;
}
function financeOpen(i){FIN_IDX=i;FIN_ARMED=true;go('finance');}
function financeBack(){FIN_IDX=null;go('finance');}
function financeDetail(idx){
  const s=SURVEYS[idx];if(!s)return financeList();
  const rows=finRows(idx);
  const t=finTotals(idx);
  const price=+s.price,priceRemote=+s.priceRemote;
  const body=rows.length?rows.map(r=>{
    const st=FIN_STATUS[r.status]||FIN_STATUS.pendente;
    const valor=paymentDueValue(r,price);
    const recebido=paymentReceivedValue(r.id);
    const aReceber=r.status==='aprovado'?Math.max(0,valor-recebido):0;
    const pixShown=maskPix(r.pixKey);
    const approveButton=r.virtual||!r.valid?'':'<button class="btn-ghost finance-action-approve" onclick="finApprovePayment('+idx+','+jsArg(r.researcherId)+')">'+(r.status==='aprovado'?'✓ Pagamento aprovado':'Aprovar pagamento')+'</button>';
    const receiptButton=r.virtual||!r.valid||r.status!=='aprovado'||aReceber<=0?'':'<button class="btn-ghost finance-action-receipt" onclick="finRegisterPayment('+idx+','+jsArg(r.researcherId)+')">＋ Registrar pagamento</button>';
    const statusButton=r.virtual?'':'<button class="btn-ghost" onclick="finEditPayment('+idx+','+jsArg(r.researcherId)+')">Alterar status</button>';
    return `<tr><td><b>${esc(r.name)}</b>${r.virtual?'<div class="finance-row-note">Sem pagamento criado ainda</div>':''}</td><td>${r.valid}</td><td>${r.rejected}</td><td><b>${brl(valor)}</b></td><td>${brl(recebido)}</td><td>${aReceber?'<b class="finance-to-receive">'+brl(aReceber)+'</b>':'<span class="pill pill-gray">R$ 0,00</span>'}</td><td>${pixShown||'<span style="color:var(--ink3)">—</span>'}</td><td>${st.pill}</td>
      <td><div class="finance-row-actions">${approveButton}${receiptButton}${statusButton}</div></td></tr>`;
  }).join(''):'<tr><td colspan="9" class="empty">Nenhum pesquisador atribuído a esta pesquisa ainda — atribua a equipe em Minhas pesquisas.</td></tr>';
  return head('Financeiro — '+s.name,'Pagamento por entrevista válida coletada nesta pesquisa',
    '<button class="btn btn-out" onclick="financeBack()">← Financeiro</button>'+ 
    (rows.length?'<button class="btn btn-out" onclick="finApproveAll('+idx+')">✓ Aprovar todos os pagamentos</button><button class="btn btn-out" onclick="alert(\'A exportação de remessa bancária será adicionada em uma etapa posterior.\')">Exportar remessa</button>':''))+`
  ${paymentReceiptMigrationNotice()}
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('A pagar nesta pesquisa',brl(t.valor),t.valid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('Pesquisadores',String(t.count),'com coleta nesta pesquisa','☺','#059669')}
    ${stat('Valor por formulário',brl(price),'região remota: '+brl(priceRemote),'◷','#7c3aed')}
    ${stat('Pendente',brl(t.pendingValor),'aguardando aprovação','◷','#d97706')}
    ${stat('A receber',brl(t.aReceber),'pagamentos aprovados','◷','#2563eb')}
    ${stat('Recebido',brl(t.recebido),'repasses lançados','✓','#059669')}
  </div>
  <div class="card mb">
    <div class="card-t">Pagamentos por pesquisador</div>
    <div class="card-d">Válidos e rejeitados vêm das coletas de campo. Rejeitadas são apenas informativas e não entram em pendente, a receber ou recebido. <b>Aprovar pagamento</b> move o valor válido para “A receber”; <b>Registrar pagamento</b> lança um repasse total ou parcial com data.</div>
    <div class="finance-table-scroll"><table class="finance-data-table"><thead><tr><th>Pesquisador</th><th>Válidos</th><th>Rejeitados</th><th>Valor aprovado</th><th>Recebido</th><th>A receber</th><th>Chave PIX</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${body}</tbody></table>
    </div>
  </div>
  ${financeReceiptHistoryHtml(idx)}
  <div class="grid g2">
    <div class="card"><div class="card-t" style="font-size:13px">Tabela de valores desta pesquisa</div>
      <table style="margin-top:6px"><tbody>
        <tr><td>Formulário padrão</td><td style="text-align:right"><b>${brl(price)}</b></td></tr>
        <tr><td>Formulário em região remota</td><td style="text-align:right"><b>${brl(priceRemote)}</b></td></tr>
        <tr><td>Bônus meta diária batida</td><td style="text-align:right"><b>+ R$ 20,00</b></td></tr>
      </tbody></table>
      <button class="btn btn-out" style="margin-top:10px" onclick="alert('Recurso ainda não configurado: editar tabela de valores desta pesquisa')">Editar valores</button>
    </div>
    <div class="card"><div class="card-t" style="font-size:13px">Repasse acumulado nesta pesquisa</div>
      <div style="position:relative;height:180px;margin-top:6px"><canvas id="finChart" role="img" aria-label="Repasse acumulado"></canvas></div>
    </div>
  </div>`;
}
function financeReceiptHistoryHtml(idx){
  const s=SURVEYS[idx];if(!s)return '';
  const rows=finRows(idx),byId=new Map(rows.map(r=>[r.id,r]));
  const receipts=PAYMENT_RECEIPTS.filter(receipt=>byId.has(receipt.paymentId)).sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt))||String(b.createdAt).localeCompare(String(a.createdAt)));
  const body=receipts.length?receipts.map(r=>`<tr><td>${esc(byId.get(r.paymentId)?.name||'(pesquisador removido)')}</td><td>${esc(r.paidAt||'—')}</td><td><b>${brl(r.amount)}</b></td><td>${esc(r.note||'—')}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Nenhum repasse lançado nesta pesquisa.</td></tr>';
  return `<div class="card mb"><div class="card-t">Histórico de recebimentos</div><div class="card-d">Lançamentos registrados para ${esc(s.name)}. O histórico é cumulativo e não apaga as entrevistas nem as reprovações.</div><div class="finance-table-scroll"><table class="finance-data-table finance-receipts-table"><thead><tr><th>Pesquisador</th><th>Data do pagamento</th><th>Valor recebido</th><th>Observação</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function financeReturnToDetail(idx){FIN_IDX=idx;FIN_ARMED=true;go('finance');}
async function finApprovePayment(idx,researcherId){
  const s=SURVEYS[idx],current=finRows(idx).find(r=>r.researcherId===researcherId);if(!s||!current||current.virtual||!current.valid)return;
  if(current.status==='aprovado'){alert('Este pagamento já está aprovado e disponível em “A receber”.');return;}
  const due=paymentDueValue(current,+s.price);
  if(!confirm('Aprovar '+brl(due)+' para '+current.name+'? O valor ficará em “A receber” até um repasse ser registrado.'))return;
  try{await saveFinStatus(s.id,researcherId,'aprovado');}catch(ex){alert('Não foi possível aprovar o pagamento: '+ex.message);return;}
  financeReturnToDetail(idx);
}
async function finApproveAll(idx){
  const s=SURVEYS[idx];if(!s)return;
  const eligible=finRows(idx).filter(r=>!r.virtual&&r.valid&&r.status!=='aprovado');
  if(!eligible.length){alert('Não há pagamentos pendentes de aprovação nesta pesquisa.');return;}
  const total=eligible.reduce((sum,r)=>sum+paymentDueValue(r,+s.price),0);
  if(!confirm('Aprovar '+eligible.length+' pagamento(s), no total de '+brl(total)+'? Os valores ficarão em “A receber”.'))return;
  try{
    const {data,error}=await sb.rpc('approve_payment_batch',{p_survey_id:s.id});
    if(error)throw new Error(error.message);
    const approvedCount=Number(data)||eligible.length;
    PAYMENTS.filter(p=>p.surveyId===s.id&&p.valid>0).forEach(p=>{p.status='aprovado';});
    alert(approvedCount+' pagamento(s) aprovado(s).');
  }catch(ex){alert('Não foi possível aprovar em lote. Execute a migration pagamentos-recebimentos-extrato.sql no Supabase e tente novamente.');console.error(ex);return;}
  financeReturnToDetail(idx);
}
function parsePaymentAmount(value){
  const raw=String(value??'').trim().replace(/[^\d,.-]/g,'');if(!raw)return null;
  const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
  const amount=Number(normalized);return Number.isFinite(amount)&&amount>0?Math.round(amount*100)/100:null;
}
function validPaymentDate(value){
  const date=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const parsed=new Date(date+'T00:00:00Z');return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;
}
async function finRegisterPayment(idx,researcherId){
  const s=SURVEYS[idx],current=finRows(idx).find(r=>r.researcherId===researcherId);if(!s||!current||current.virtual||current.status!=='aprovado')return;
  if(PAYMENT_RECEIPTS_SCHEMA_MISSING){alert('Execute primeiro a migration deploy/pagamentos-recebimentos-extrato.sql no Supabase.');return;}
  const due=paymentDueValue(current,+s.price),received=paymentReceivedValue(current.id),balance=Math.max(0,due-received);if(balance<=0){alert('Este pagamento já foi recebido integralmente.');return;}
  const amount=parsePaymentAmount(prompt('Valor pago para '+current.name+' (máximo '+brl(balance)+'). Pagamentos parciais são permitidos:',String(balance.toFixed(2)).replace('.',',')));
  if(amount==null){alert('Informe um valor pago válido.');return;}
  if(amount>balance){alert('O valor informado ultrapassa o saldo a receber de '+brl(balance)+'.');return;}
  const today=new Date().toISOString().slice(0,10);
  const paidAt=prompt('Data do pagamento (AAAA-MM-DD):',today);if(paidAt==null)return;
  if(!validPaymentDate(paidAt)){alert('Informe uma data válida no formato AAAA-MM-DD.');return;}
  const note=prompt('Observação ou referência do pagamento (opcional):','');if(note==null)return;
  try{
    const {data,error}=await sb.rpc('record_payment_receipt',{p_payment_id:current.id,p_amount:amount,p_paid_at:paidAt,p_note:note.trim()||null});
    if(error)throw new Error(error.message);
    const row=Array.isArray(data)?data[0]:data;if(row)PAYMENT_RECEIPTS.unshift(paymentReceiptRowToEntry(row));
  }catch(ex){alert('Não foi possível registrar o pagamento. Verifique se a migration pagamentos-recebimentos-extrato.sql foi executada e se o valor ainda está disponível.');console.error(ex);return;}
  alert('Pagamento registrado em '+paidAt+'.');
  financeReturnToDetail(idx);
}
/* define o status do pagamento de um pesquisador nesta pesquisa — válidos e
   rejeitados não são mais perguntados aqui: vêm de verdade da Coleta de
   campo (contados automaticamente pelo banco a partir das entrevistas
   enviadas pelo app e da auditoria) */
async function finEditPayment(idx,researcherId){
  const s=SURVEYS[idx];if(!s)return;
  const current=finRows(idx).find(r=>r.researcherId===researcherId);
  if(!current)return;
  const statusStr=(prompt('Status do pagamento de '+current.name+' — digite: pendente, aprovado ou auditoria\n(Válidos: '+current.valid+' · Rejeitados: '+current.rejected+' — calculados automaticamente pela Coleta de campo.)',current.status)||'').trim().toLowerCase();
  if(!statusStr)return;
  const status=['pendente','aprovado','auditoria'].includes(statusStr)?statusStr:current.status;
  try{
    await saveFinStatus(s.id,researcherId,status);
  }catch(ex){alert('Não foi possível salvar: '+ex.message);return;}
  go('finance');
}

/* ============ MY EARNINGS (pesquisador) ============ */
PAGES['my-earnings']=()=>{
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED||!COLLECT_EVENTS_LOADED||!PAYMENT_RECEIPTS_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
    if(!PAYMENT_RECEIPTS_LOADED)loadPaymentReceiptsIfNeeded();
    return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+'<div class="empty">Carregando seus dados financeiros…</div>';
  }
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const mine=PAYMENTS.filter(p=>p.researcherId===myId);
  const rowsData=mine.map(p=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);
    const price=s?+s.price:0;
    const valor=paymentDueValue(p,price),recebido=paymentReceivedValue(p.id),aReceber=p.status==='aprovado'?Math.max(0,valor-recebido):0;
    return {payment:p,survey:s?s.name:'(pesquisa removida)',valid:p.valid,rejected:p.rejected,valor,recebido,aReceber,rejectedValor:p.rejected*price,status:p.status};
  });
  const aReceber=rowsData.reduce((a,r)=>a+r.aReceber,0),recebido=rowsData.reduce((a,r)=>a+r.recebido,0);
  const pendente=rowsData.filter(r=>r.status==='pendente').reduce((a,r)=>a+r.valor,0),auditoria=rowsData.filter(r=>r.status==='auditoria').reduce((a,r)=>a+r.valor,0);
  const rejeitadas=rowsData.reduce((a,r)=>a+r.rejected,0),rejeitadasValor=rowsData.reduce((a,r)=>a+r.rejectedValor,0);
  const histRows=rowsData.length?rowsData.map(r=>`<tr><td><b>${esc(r.survey)}</b></td><td>${r.valid}</td><td>${r.rejected}${r.rejectedValor?'<div class="earnings-rejected-value">'+brl(r.rejectedValor)+' não contabilizado</div>':''}</td><td>${brl(r.valor)}</td><td>${brl(r.recebido)}</td><td>${r.aReceber?'<b class="finance-to-receive">'+brl(r.aReceber)+'</b>':'<span class="pill pill-gray">R$ 0,00</span>'}</td><td>${(FIN_STATUS[r.status]||FIN_STATUS.pendente).pill}</td></tr>`).join('')
    :'<tr><td colspan="7" class="empty">Nenhuma coleta ainda — assim que você enviar sua primeira entrevista em "Coletar (app)", aparece aqui.</td></tr>';
  return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+`
  ${paymentReceiptMigrationNotice()}
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Recebido',brl(recebido),'repasses registrados','✓','#059669')}
    ${stat('A receber',brl(aReceber),'pagamentos aprovados','$','#2563eb')}
    ${stat('Pendente / revisão',brl(pendente+auditoria),'entrevistas válidas ainda não aprovadas','◷','#d97706')}
    ${stat('Rejeitadas',String(rejeitadas),brl(rejeitadasValor)+' apenas informativo','✕','#dc2626')}
  </div>
  <div class="card mb">
    <div class="card-t">Extrato por pesquisa</div>
    <div class="card-d">Entrevistas rejeitadas aparecem somente para informação e nunca entram em pendente, a receber ou recebido. “A receber” diminui somente quando a PesquisaPro registra um pagamento.</div>
    <div class="finance-table-scroll"><table class="finance-data-table earnings-table" style="margin-top:6px"><thead><tr><th>Pesquisa</th><th>Válidas</th><th>Rejeitadas</th><th>Valor aprovado</th><th>Recebido</th><th>A receber</th><th>Situação</th></tr></thead>
    <tbody>${histRows}</tbody></table>
    </div>
  </div>
  ${myReceiptHistoryHtml(rowsData)}
  <div class="card mb">
    <div class="card-t" style="font-size:13px">Coletas reprovadas</div>
    <div class="card-d">Reprovadas pelo administrador ou coordenador na auditoria de campo — não entram no seu pagamento.</div>
    <div id="myRejected"></div>
  </div>
  <div class="card">
    <div class="card-t" style="font-size:13px">Meus dados de pagamento</div>
    <div class="card-d">Necessários para receber. Armazenados com segurança.</div>
    <div class="field-row mb"><div><label class="lbl">Chave PIX</label><input class="inp" id="me-pix-key" value="${esc((CURRENT_PROFILE&&CURRENT_PROFILE.pix_key)||'')}"></div><div><label class="lbl">Banco</label><input class="inp" id="me-pix-bank" value="${esc((CURRENT_PROFILE&&CURRENT_PROFILE.pix_bank)||'')}"></div></div>
    <button class="btn btn-fill" onclick="saveMyPixData()">Salvar dados</button>
  </div>`;
};
function myReceiptHistoryHtml(rowsData){
  const paymentNames=new Map(rowsData.map(r=>[r.payment.id,r.survey]));
  const receipts=PAYMENT_RECEIPTS.filter(r=>paymentNames.has(r.paymentId)).sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt))||String(b.createdAt).localeCompare(String(a.createdAt)));
  const body=receipts.length?receipts.map(r=>`<tr><td>${esc(paymentNames.get(r.paymentId)||'Pesquisa')}</td><td>${esc(r.paidAt||'—')}</td><td><b>${brl(r.amount)}</b></td><td>${esc(r.note||'—')}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Nenhum repasse registrado ainda.</td></tr>';
  return `<div class="card mb"><div class="card-t">Histórico de recebimentos</div><div class="card-d">Aqui ficam os valores efetivamente registrados como pagos, com a data informada pela PesquisaPro.</div><div class="finance-table-scroll"><table class="finance-data-table finance-receipts-table"><thead><tr><th>Pesquisa</th><th>Data</th><th>Valor recebido</th><th>Observação</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}
async function saveMyPixData(){
  if(!CURRENT_PROFILE)return;
  const pixKey=(document.getElementById('me-pix-key').value||'').trim();
  const pixBank=(document.getElementById('me-pix-bank').value||'').trim();
  try{
    const {error}=await sb.from('profiles').update({pix_key:pixKey,pix_bank:pixBank}).eq('id',CURRENT_PROFILE.id);
    if(error)throw new Error(error.message);
    CURRENT_PROFILE.pix_key=pixKey;CURRENT_PROFILE.pix_bank=pixBank;
  }catch(ex){alert('Não foi possível salvar: '+ex.message);return;}
  alert('Dados de pagamento salvos.');
}
function renderMyRejected(){
  const el=document.getElementById('myRejected');if(!el)return;
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const rej=COLLECT_EVENTS.filter(e=>e.researcherId===myId&&e.status==='rejected').sort((a,b)=>(b.rejectedAt||0)-(a.rejectedAt||0));
  if(!rej.length){el.innerHTML='<div class="empty">Nenhuma coleta reprovada até agora.</div>';return;}
  el.innerHTML=rej.map(e=>{
    const s=SURVEYS.find(x=>x.id===e.surveyId);
    return `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <b style="font-size:13px">${esc(s?s.name:'Pesquisa')}</b>
        <span class="pill pill-red">✕ Reprovada</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink3);margin-top:2px">${esc(e.cota)} · ${new Date(e.ts).toLocaleString('pt-BR')}</div>
      <div style="font-size:12.5px;margin-top:4px"><b>Motivo:</b> ${esc(e.rejectReason||'—')}</div>
    </div>`;
  }).join('');
}

/* ============ CONTRATOS ============
   Antes era uma lista 100% fictícia (pesquisadores e datas inventados).
   Agora mostra o status real de assinatura de cada pesquisador ativo
   (tabela researcher_contracts) e é onde um ADMINISTRADOR assina
   eletronicamente pelo lado da CONTRATANTE (tabela
   company_contract_signatures) — uma única vez por versão do contrato,
   não uma vez por pesquisador. O texto do contrato em si e a assinatura do
   lado do pesquisador estão no bloco "CONTRATO-QUADRO DO PESQUISADOR". */
let ALL_CONTRACTS=[],ALL_CONTRACTS_LOADED=false,ALL_CONTRACTS_LOADING=false;
async function loadAllContractsIfNeeded(){
  if(ALL_CONTRACTS_LOADED||ALL_CONTRACTS_LOADING)return;
  ALL_CONTRACTS_LOADING=true;
  try{
    const {data,error}=await sb.from('researcher_contracts').select('*').eq('contract_version',CONTRACT_VERSION);
    if(!error){ALL_CONTRACTS=data||[];ALL_CONTRACTS_LOADED=true;}
    else console.error('Erro ao carregar assinaturas dos pesquisadores:',error);
  }catch(ex){console.error('Erro de conexão ao carregar assinaturas:',ex);}
  ALL_CONTRACTS_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='contracts'||k==='dashboard')go(k);
}
PAGES.contracts=()=>{
  if(!CONTRACT_SETTINGS_LOADED){loadContractSettingsIfNeeded();return head('Contratos','Assinatura eletrônica do contrato de prestação de serviços')+'<div class="empty">Carregando a versão vigente…</div>';}
  if(!USERS_LOADED)loadUsersIfNeeded();
  if(!ALL_CONTRACTS_LOADED)loadAllContractsIfNeeded();
  if(!COMPANY_SIGNATURE_LOADED)loadCompanySignatureIfNeeded();
  if(!USERS_LOADED||!ALL_CONTRACTS_LOADED||!COMPANY_SIGNATURE_LOADED){
    return head('Contratos','Assinatura eletrônica do contrato de prestação de serviços')+'<div class="empty">Carregando…</div>';
  }
  const pesqs=USERS.filter(u=>u.role==='pesq'&&u.status==='ativo');
  const isAdmin=selectedRole==='admin'||selectedRole==='admpro';
  const signedMap={};
  ALL_CONTRACTS.forEach(c=>{signedMap[c.researcher_id]=c;});
  const assinados=pesqs.filter(u=>signedMap[u.id]).length;
  const pendentes=pesqs.length-assinados;
  const rows=pesqs.length?pesqs.map(u=>{
    const c=signedMap[u.id];
    const action=!c&&isAdmin?`<button class="btn-ghost" style="color:var(--teal);white-space:nowrap" data-admin-sign="${esc(u.id)}" data-admin-sign-name="${esc(u.name)}" onclick="adminSignResearcherContract(this.dataset.adminSign,this.dataset.adminSignName)">Assinar</button>`:(c?'<span style="font-size:11px;color:var(--ink3)">—</span>':'');
    return `<tr><td>${esc(u.name)}</td><td>${esc(u.cidade||'—')}</td>
      <td>${c?'<span class="pill pill-green">● Assinado</span>':'<span class="pill pill-amber">● Aguardando assinatura</span>'}</td>
      <td>${c?esc(new Date(c.accepted_at).toLocaleString('pt-BR')):'—'}</td><td>${action}</td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty">Nenhum pesquisador ativo cadastrado ainda.</td></tr>';
  const nome=CURRENT_PROFILE?CURRENT_PROFILE.name:'';
  const companyPanel=COMPANY_SIGNATURE?`
    <div class="card">
      <div class="card-t">Assinatura da CONTRATANTE (PesquisaPro)</div>
      ${companySignPadHtml()}
      ${isAdmin?'<button class="btn btn-out" style="margin-top:10px" onclick="createContractVersion()">＋ Criar nova versão para assinatura</button>':''}
    </div>`:(isAdmin?`
    <div class="card">
      <div class="card-t">Assinatura eletrônica da CONTRATANTE</div>
      <div class="card-d">Assine uma única vez em nome do PesquisaPro — esta ação libera a assinatura da CONTRATANTE para todos os contratos desta versão (${esc(CONTRACT_VERSION)}). Não é necessário assinar pesquisador por pesquisador.</div>
      ${companySignPadHtml()}
      <div class="field-row mb" style="margin-top:10px">
        <div><label class="lbl">Seu nome (quem assina)</label><input class="inp" id="company-signer-name" value="${esc(nome)}"></div>
        <div><label class="lbl">Cargo/função representando a empresa</label><input class="inp" id="company-signer-role" placeholder="ex.: Sócio-administrador"></div>
      </div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink2);cursor:pointer;margin-bottom:14px">
        <input type="checkbox" id="companyAgree" style="margin-top:3px">
        <span>Confirmo que estou autorizado(a) a assinar este contrato em nome da CONTRATANTE, e que esta assinatura vale para todos os pesquisadores que aceitarem este contrato a partir de agora.</span>
      </label>
      <div id="companySignMsg"></div>
      <button class="btn btn-accent" id="companySignBtn" onclick="signCompanyContract()">✎ Assinar todos os contratos pela CONTRATANTE</button>
    </div>`:`
    <div class="card">
      <div class="card-t">Assinatura da CONTRATANTE (PesquisaPro)</div>
      ${companySignPadHtml()}
      <div class="card-d" style="margin-top:6px">Apenas um administrador pode assinar pela empresa. A assinatura registrada vale para todos os contratos desta versão.</div>
    </div>`);
  return head('Contratos','Assinatura eletrônica do contrato de prestação de serviços')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Pesquisadores ativos',String(pesqs.length),'com cadastro aprovado','☺','#2563eb')}
    ${stat('Já assinaram',String(assinados),'lado do pesquisador','✎','#059669')}
    ${stat('Aguardando assinatura',String(pendentes),'pesquisadores ativos','◷','#d97706')}
    ${stat('CONTRATANTE',COMPANY_SIGNATURE?'Assinado':'Pendente','lado do PesquisaPro',COMPANY_SIGNATURE?'✓':'◷',COMPANY_SIGNATURE?'#059669':'#dc2626')}
  </div>
  ${companyPanel}
  <div class="card mb" style="margin-top:16px">
    <div class="card-t">Pesquisadores</div>
    <div class="card-d">Status de assinatura do contrato-quadro (versão ${esc(CONTRACT_VERSION)}) por pesquisador ativo.</div>
    <table style="margin-top:6px"><thead><tr><th>Pesquisador</th><th>Cidade</th><th>Status</th><th>Assinado em</th><th>Ação</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>
  <div class="sec-title">Pré-visualização do contrato</div>
  <div class="contract-doc">${contractHtml('[nome do pesquisador]','[CPF]','')}</div>`;
};
async function adminSignResearcherContract(researcherId,researcherName){
  if(!CURRENT_PROFILE||!['admin','admpro'].includes(selectedRole)){alert('Apenas um administrador pode assinar pelo pesquisador.');return;}
  if(!researcherId||researcherId==='undefined'){alert('Pesquisador inválido. Atualize a lista e tente novamente.');return;}
  if(!confirm('Confirma registrar a assinatura administrativa para '+researcherName+' na versão '+CONTRACT_VERSION+'?\\n\\nEsta ação ficará registrada com seu usuário, data, hora e versão do contrato.'))return;
  const text=contractPlainText(researcherName,'','');
  let hash='';try{hash=await sha256Hex(text);}catch(ex){hash='';}
  try{
    const {data,error}=await sb.rpc('admin_sign_researcher_contract',{
      p_researcher_id:researcherId,
      p_contract_version:CONTRACT_VERSION,
      p_content_hash:hash||'indisponível neste navegador',
      p_ip_address:await fetchClientIp(),
      p_user_agent:(navigator&&navigator.userAgent)||null,
    });
    if(error)throw new Error(error.message);
    if(!data)throw new Error('A assinatura não retornou registro.');
    ALL_CONTRACTS_LOADED=false;
    await loadAllContractsIfNeeded();
    go('contracts');
  }catch(ex){
    alert('Não foi possível assinar este cadastro: '+ex.message+'\\n\\nVerifique se a migration assinatura-admin-pesquisador.sql foi aplicada no Supabase.');
  }
}

async function signCompanyContract(){
  if(!CURRENT_PROFILE)return;
  const isAdmin=selectedRole==='admin'||selectedRole==='admpro';
  if(!isAdmin){alert('Apenas um administrador pode assinar pela CONTRATANTE.');return;}
  const msgEl=document.getElementById('companySignMsg');
  const agree=document.getElementById('companyAgree');
  if(!agree||!agree.checked){
    if(msgEl)msgEl.innerHTML='<div class="callout" style="margin:10px 0 0;border-color:var(--red)">Marque a caixa de confirmação acima antes de assinar.</div>';
    return;
  }
  const nome=(document.getElementById('company-signer-name')?.value||'').trim();
  const cargo=(document.getElementById('company-signer-role')?.value||'').trim();
  if(!nome||!cargo){
    if(msgEl)msgEl.innerHTML='<div class="callout" style="margin:10px 0 0;border-color:var(--red)">Preencha seu nome e o cargo/função antes de assinar.</div>';
    return;
  }
  if(!confirm('Confirma a assinatura eletrônica em nome da CONTRATANTE, como '+nome+' ('+cargo+')?\n\nEsta única assinatura vale para todos os contratos desta versão ('+CONTRACT_VERSION+'), registra data, hora e, quando disponível, o IP do dispositivo, e não pode ser desfeita.'))return;
  const btn=document.getElementById('companySignBtn');
  if(btn){btn.disabled=true;btn.textContent='Assinando todos…';}
  const text=contractPlainText('[nome do pesquisador]','[CPF]','');
  let hash='';
  try{hash=await sha256Hex(text);}catch(ex){hash='';}
  const ip=await fetchClientIp();
  try{
    const {data:inserted,error}=await sb.rpc('sign_company_contract',{
      p_contract_version:CONTRACT_VERSION,
      p_signer_name:nome,
      p_signer_role:cargo,
      p_content_hash:hash||'indisponível neste navegador',
      p_ip_address:ip,
      p_user_agent:(navigator&&navigator.userAgent)||null,
    });
    if(error)throw new Error(error.message);
    if(!inserted)throw new Error('A assinatura foi processada, mas não retornou registro. Atualize a tela e tente novamente.');
    COMPANY_SIGNATURE=companySignatureRowToEntry(inserted);
    COMPANY_SIGNATURE_LOADED=true;
  }catch(ex){
    alert('Não foi possível registrar a assinatura da CONTRATANTE: '+ex.message+'\n\nSe a migration de contratos ainda não foi aplicada, execute-a no Supabase e tente novamente.');
    if(btn){btn.disabled=false;btn.textContent='✎ Assinar todos os contratos pela CONTRATANTE';}
    return;
  }
  go('contracts');
}

/* ============ CONTRACT TEMPLATE EDITOR ============ */
PAGES['contract-template']=()=>head('Modelos de contrato','Use seu próprio modelo. Os campos entre {chaves} são preenchidos automaticamente para cada pessoa.',
  '<button class="btn btn-out" onclick="alert(\'Recurso ainda não configurado: importar .docx / .pdf como modelo\')">⬆ Importar arquivo</button><button class="btn btn-fill" onclick="alert(\'Recurso ainda não configurado: modelo salvo. Passa a ficar disponível ao gerar contratos.\')">Salvar modelo</button>')+`
  <div class="grid g2" style="grid-template-columns:1.15fr .85fr;align-items:start">
    <div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="card-t" style="margin:0">Editor do modelo</div>
        <select class="inp" style="width:auto;height:34px;margin-left:auto" id="tpl-pick" onchange="loadTpl(this.value)">
          <option value="pesq">Pesquisador PF (padrão)</option>
          <option value="coord">Coordenador</option>
          <option value="blank">Modelo em branco</option>
        </select>
      </div>
      <div class="field-row mb">
        <div><label class="lbl">Nome do modelo</label><input class="inp" id="tpl-name" value="Pesquisador PF"></div>
        <div><label class="lbl">Aplicar ao perfil</label>
          <select class="inp"><option>Pesquisador</option><option>Coordenador</option><option>Gerente</option><option>Todos</option></select></div>
      </div>
      <label class="lbl">Texto do contrato</label>
      <textarea class="inp" id="tpl-text" rows="16" style="font-family:var(--sans);line-height:1.7" oninput="renderTplPreview()"></textarea>
      <div style="margin-top:6px;font-size:11px;color:var(--ink3)">Dica: escreva como quiser e insira os campos abaixo onde precisar — o sistema substitui no envio.</div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t" style="font-size:13px">Campos disponíveis</div>
        <div class="card-d">Clique para inserir no texto. O sistema preenche com os dados reais de cada contrato.</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="tpl-fields"></div>
      </div>
      <div class="card mb">
        <div class="card-t" style="font-size:13px">Assinatura eletrônica</div>
        <ul class="checklist" style="margin-top:4px">
          <li><span class="ck">✓</span>Bloco de assinatura adicionado automaticamente ao final</li>
          <li><span class="ck">✓</span>Registro de data, IP e hash do documento</li>
          <li><span class="ck">✓</span>Envio do link de assinatura por e-mail/WhatsApp</li>
        </ul>
        <div style="margin-top:8px;font-size:11px;color:var(--ink3)">Para validade jurídica plena, integra-se a um provedor de assinatura (ex.: ICP-Brasil / e-CPF) na versão de produção.</div>
      </div>
    </div>
  </div>

  <div class="sec-title">Pré-visualização (campos preenchidos com dados de exemplo)</div>
  <div class="contract-doc" id="tpl-preview"></div>`;

/* template data + behaviour */
const TPL_FIELDS=[
  ['{contratada_razao}','Razão social (sua empresa)'],
  ['{contratada_cnpj}','CNPJ (sua empresa)'],
  ['{contratada_endereco}','Endereço (sua empresa)'],
  ['{nome}','Nome do contratado'],
  ['{cpf}','CPF do contratado'],
  ['{funcao}','Função'],
  ['{regional}','Regional / pólo'],
  ['{valor_form}','Valor por formulário'],
  ['{pesquisa}','Nome da pesquisa'],
  ['{data}','Data'],
  ['{cidade}','Cidade'],
];
const TPL_SAMPLE={
  '{contratada_razao}':'Instituto de Pesquisa [Sua Empresa] Ltda',
  '{contratada_cnpj}':'00.000.000/0001-00',
  '{contratada_endereco}':'Av. Afonso Pena, 1000 — Belo Horizonte/MG',
  '{nome}':'João Pereira','{cpf}':'123.456.789-00','{funcao}':'Pesquisador de campo',
  '{regional}':'Triângulo','{valor_form}':'R$ 5,00','{pesquisa}':'Pesquisa Eleitoral MG 2026',
  '{data}':'24/06/2026','{cidade}':'Belo Horizonte/MG'
};
const TPL_TEXTS={
  pesq:`CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PESQUISA DE CAMPO

CONTRATANTE: {contratada_razao}, CNPJ {contratada_cnpj}, com sede em {contratada_endereco}.

CONTRATADO: {nome}, CPF {cpf}, na função de {funcao}, atuando na regional {regional}.

OBJETO: aplicação de questionários da {pesquisa}.

REMUNERAÇÃO: o CONTRATADO será remunerado em {valor_form} por formulário válido, conforme critérios de auditoria de qualidade definidos pela CONTRATANTE.

{cidade}, {data}.`,
  coord:`CONTRATO DE COORDENAÇÃO DE PESQUISA

CONTRATANTE: {contratada_razao}, CNPJ {contratada_cnpj}.

CONTRATADO: {nome}, CPF {cpf}, na função de {funcao}, responsável pela regional {regional}.

OBJETO: coordenação de equipe de campo da {pesquisa}, incluindo supervisão de pesquisadores e controle de cotas.

{cidade}, {data}.`,
  blank:`[Cole ou escreva seu contrato aqui]

Use os campos como {nome}, {cpf} e {valor_form} onde quiser que o sistema preencha automaticamente.`
};
function loadTpl(which){
  document.getElementById('tpl-text').value=TPL_TEXTS[which]||'';
  document.getElementById('tpl-name').value={pesq:'Pesquisador PF',coord:'Coordenador',blank:'Novo modelo'}[which]||'Novo modelo';
  renderTplPreview();
}
function insertField(tag){
  const ta=document.getElementById('tpl-text');
  const s=ta.selectionStart??ta.value.length;
  ta.value=ta.value.slice(0,s)+tag+ta.value.slice(ta.selectionEnd??s);
  ta.focus();renderTplPreview();
}
function renderTplPreview(){
  let txt=document.getElementById('tpl-text').value;
  Object.keys(TPL_SAMPLE).forEach(k=>{
    txt=txt.split(k).join('<b>'+TPL_SAMPLE[k]+'</b>');
  });
  // highlight any unfilled fields
  txt=txt.replace(/\{[^}]+\}/g,m=>'<span style="background:var(--amber-l);color:var(--amber);padding:0 4px;border-radius:4px">'+m+'</span>');
  const lines=txt.split('\n');
  let html='';
  lines.forEach((l,i)=>{
    if(i===0&&l.trim())html+='<div style="text-align:center;font-weight:700;font-size:14px;color:var(--ink);margin-bottom:8px">'+l+'</div>';
    else html+='<p style="margin:0 0 8px">'+(l.trim()===''?'&nbsp;':l)+'</p>';
  });
  html+='<div class="sign-pad">Área de assinatura eletrônica — preenchida pelo contratado ao assinar</div>';
  document.getElementById('tpl-preview').innerHTML=html;
}


/* ============ CONTRATO-QUADRO DO PESQUISADOR (assinatura eletrônica) ============
   Contrato único, assinado uma única vez pelo pesquisador, que passa a
   valer automaticamente para todas as pesquisas que ele aceitar depois —
   por isso "contrato-quadro". Enquanto não houver uma linha assinada com a
   versão vigente (CONTRACT_VERSION) na tabela researcher_contracts, a tela
   "Coletar (app)" fica bloqueada (ver PAGES['app-collect'] acima).

   ATENÇÃO — antes de publicar de verdade: os dados de EMPRESA_CONTRATO
   abaixo estão com valores de exemplo entre colchetes. Troque pela razão
   social, CNPJ, endereço e responsável legal reais do PesquisaPro. Este
   texto foi redigido com cuidado para deixar claras a ausência de vínculo
   empregatício e as condições de pagamento, mas — como qualquer contrato —
   vale a pena passar por um advogado antes do uso definitivo.

   Se este texto mudar no futuro (novas cláusulas, valores, etc.), basta
   subir CONTRACT_VERSION (ex.: 'v2-2027') — todo pesquisador passa a
   precisar assinar a nova versão antes de conseguir coletar de novo; a
   assinatura da versão antiga continua guardada, intacta, para histórico.
*/
let CONTRACT_VERSION='v1-2026';
let CONTRACT_SETTINGS_LOADED=false,CONTRACT_SETTINGS_LOADING=false;
async function loadContractSettingsIfNeeded(){
  if(CONTRACT_SETTINGS_LOADED||CONTRACT_SETTINGS_LOADING)return;
  CONTRACT_SETTINGS_LOADING=true;
  try{
    const {data,error}=await sb.rpc('get_current_contract_version');
    if(!error&&data){CONTRACT_VERSION=typeof data==='string'?data:(data.current_version||data[0]?.current_version||CONTRACT_VERSION);}
    else if(error)console.warn('Versão persistente indisponível; usando a versão local:',error.message);
  }catch(ex){console.warn('Não foi possível carregar a versão vigente:',ex.message);}
  CONTRACT_SETTINGS_LOADED=true;CONTRACT_SETTINGS_LOADING=false;
  const k=document.querySelector('.nav-item.on')?.dataset.key;
  if(k==='contracts'||k==='my-contract'||k==='app-collect'||k==='dashboard'||k==='dashboard-pesq')go(k);
}
function resetContractCachesForVersion(){
  ALL_CONTRACTS=[];ALL_CONTRACTS_LOADED=false;ALL_CONTRACTS_LOADING=false;
  COMPANY_SIGNATURE=null;COMPANY_SIGNATURE_LOADED=false;COMPANY_SIGNATURE_LOADING=false;
  MY_CONTRACT=null;MY_CONTRACT_LOADED=false;MY_CONTRACT_LOADING=false;
}
async function createContractVersion(){
  if(!CURRENT_PROFILE||!['admin','admpro'].includes(selectedRole)){alert('Apenas um administrador pode criar uma nova versão.');return;}
  const suggestion=(CONTRACT_VERSION.match(/^v(\\d+)/)?.[1]||'1');
  const next=prompt('Informe a nova versão do contrato. Exemplo: v'+(Number(suggestion)+1)+'-2026', 'v'+(Number(suggestion)+1)+'-2026');
  if(next===null)return;
  const version=next.trim();
  if(!/^v\\d+-\\d{4}([.-][A-Za-z0-9_-]+)?$/.test(version)){alert('Use um formato como v2-2026.');return;}
  if(version===CONTRACT_VERSION){alert('Essa versão já é a versão vigente.');return;}
  if(!confirm('Criar a versão '+version+'? A versão '+CONTRACT_VERSION+' será preservada no histórico e a nova versão ficará pendente de assinatura da CONTRATANTE e dos pesquisadores.'))return;
  try{
    const {data,error}=await sb.rpc('create_contract_version',{p_new_version:version});
    if(error)throw new Error(error.message);
    CONTRACT_VERSION=typeof data==='string'?data:version;
    resetContractCachesForVersion();
    CONTRACT_SETTINGS_LOADED=true;
    alert('Nova versão '+CONTRACT_VERSION+' criada. O formulário de assinatura está disponível nesta tela.');
    go('contracts');
  }catch(ex){alert('Não foi possível criar a nova versão: '+ex.message+'\\n\\nExecute a migration contratos-versoes.sql no Supabase e tente novamente.');}
}
const EMPRESA_CONTRATO={
  razao:'[RAZÃO SOCIAL DA CONTRATANTE LTDA.]',
  cnpj:'[00.000.000/0001-00]',
  endereco:'[endereço completo da sede]',
  representante:'[nome do responsável legal pela CONTRATANTE]',
};
function contractClauses(nome,cpf,cidade){
  const c=EMPRESA_CONTRATO;
  return [
    {t:'Das partes',p:`De um lado, ${c.razao}, inscrita no CNPJ sob o nº ${c.cnpj}, com sede em ${c.endereco}, doravante denominada CONTRATANTE, neste ato representada por ${c.representante}; e de outro lado ${nome||'[nome do pesquisador]'}, portador(a) do CPF nº ${cpf||'[CPF não informado]'}, pessoa física, autônomo(a), doravante denominado(a) CONTRATADO(A), têm entre si justo e contratado o presente Contrato de Prestação de Serviços Autônomos de Coleta de Dados de Pesquisa ("Contrato"), que se regerá pelas cláusulas seguintes.`},
    {t:'1ª. Do objeto',p:'O presente Contrato tem por objeto a prestação, pelo(a) CONTRATADO(A), de serviços autônomos e eventuais de aplicação de questionários e coleta de dados em campo (entrevistas presenciais georreferenciadas, e eventualmente remotas), para pesquisas de opinião, mercado ou similares realizadas pela CONTRATANTE ou por seus clientes, por meio da plataforma eletrônica PesquisaPro (aplicativo/site).'},
    {t:'2ª. Da adesão por pesquisa e do caráter de contrato-quadro',p:'Este Contrato é firmado uma única vez e vigora, sem necessidade de nova assinatura, para todas as pesquisas que a CONTRATANTE vier a disponibilizar ao(à) CONTRATADO(A) na plataforma. Cada pesquisa específica é oferecida ao(à) CONTRATADO(A) como um convite individual, do qual constam, no mínimo: (i) a cidade ou região de atuação; (ii) o valor pago por formulário/entrevista válida (coleta presencial e, quando houver, coleta remota); e (iii) o período estimado de coleta. O(A) CONTRATADO(A) tem plena liberdade para aceitar ou recusar cada convite, sem qualquer penalidade, e a aceitação eletrônica de um convite específico dentro do aplicativo constitui a ordem de serviço daquela pesquisa, regida pelas condições gerais deste Contrato.'},
    {t:'3ª. Da natureza autônoma e da ausência de vínculo empregatício',p:'As partes reconhecem e declaram, para todos os fins de direito, que a relação ora estabelecida é de natureza exclusivamente civil e autônoma, não gerando, em nenhuma hipótese, vínculo empregatício entre as partes, nos termos do art. 442-B da Consolidação das Leis do Trabalho (CLT), com redação dada pela Lei nº 13.467/2017, tampouco vínculo de qualquer outra natureza. Não há relação de subordinação jurídica, hierárquica ou disciplinar entre as partes: o(a) CONTRATADO(A) organiza livremente sua rotina, define seus próprios horários de trabalho dentro do período de coleta de cada pesquisa, utiliza equipamento e meio de locomoção próprios, e pode, a qualquer tempo, recusar convites, aceitar convites de outras pesquisas — inclusive de concorrentes da CONTRATANTE — e prestar serviços a terceiros, não havendo exclusividade nem pessoalidade obrigatória. A remuneração é feita exclusivamente por produção aprovada (formulário/entrevista válida), nunca por jornada, o que reforça o caráter autônomo da prestação. Em razão dessa natureza, não são devidos pela CONTRATANTE ao(à) CONTRATADO(A) 13º salário, férias, aviso prévio, FGTS, adicionais ou qualquer outra verba de natureza trabalhista, sendo de responsabilidade exclusiva do(a) CONTRATADO(A) o recolhimento dos tributos e contribuições incidentes sobre os valores recebidos, inclusive perante o INSS na qualidade de contribuinte individual/autônomo, e perante a Receita Federal, quando aplicável.'},
    {t:'4ª. Da remuneração e das condições de pagamento',p:'O(A) CONTRATADO(A) receberá, por cada entrevista/formulário considerado válido e aprovado, o valor informado no convite da respectiva pesquisa no momento em que este for aceito, podendo esse valor variar entre pesquisas e entre coleta presencial e coleta remota. O pagamento correspondente a cada pesquisa é devido somente após o encerramento da coleta daquela pesquisa e a conclusão da auditoria de qualidade das entrevistas nela realizadas, sendo calculado exclusivamente sobre os formulários aprovados (não reprovados), conforme demonstrativo disponibilizado ao(à) CONTRATADO(A) na tela "Meus ganhos" do aplicativo. Os valores serão pagos via PIX, na chave informada pelo(a) próprio(a) CONTRATADO(A) em seu cadastro na plataforma, sendo de sua exclusiva responsabilidade mantê-la correta e atualizada. Formulários ainda pendentes de auditoria na data de encerramento de uma pesquisa serão pagos assim que a respectiva auditoria for concluída.'},
    {t:'5ª. Dos critérios de validação e reprovação das coletas',p:'Considera-se válida a entrevista que atender, cumulativamente, aos seguintes critérios, verificados eletronicamente pela plataforma e/ou por auditoria da equipe da CONTRATANTE: (i) georreferenciamento obrigatório, com coordenadas de GPS registradas dentro da área geográfica definida para a pesquisa e para a cota respondida, observadas as regras de proximidade e de distância mínima entre coletas de um mesmo pesquisador estabelecidas pela CONTRATANTE para coibir fraudes; (ii) tempo mínimo de aplicação do questionário, sendo entrevistas concluídas abaixo do tempo mínimo estipulado sinalizadas para auditoria e passíveis de reprovação; (iii) ausência de duplicidade de entrevistado e/ou de dispositivo utilizado; e (iv) ausência de indícios de fraude, inconsistência ou preenchimento de má-fé. A CONTRATANTE, por seus administradores e coordenadores, poderá reprovar, de forma justificada e com o motivo registrado no aplicativo, qualquer entrevista que não atenda a esses critérios, hipótese em que ela não será remunerada. A reprovação de entrevistas não gera, por si só, qualquer outra penalidade contratual ao(à) CONTRATADO(A), ressalvada a hipótese de fraude comprovada, que autoriza a rescisão imediata deste Contrato, sem prejuízo das demais medidas cabíveis.'},
    {t:'6ª. Das obrigações do(a) CONTRATADO(A)',p:'Sem que isso implique subordinação, o(a) CONTRATADO(A) se compromete a: (i) aplicar os questionários com honestidade, zelo e fidelidade às respostas efetivamente obtidas dos entrevistados; (ii) manter ativa a localização (GPS) do dispositivo durante toda a aplicação; (iii) manter atualizados seus dados cadastrais e de pagamento na plataforma; (iv) preservar o sigilo do conteúdo dos questionários e da metodologia das pesquisas perante terceiros; e (v) tratar os entrevistados e seus dados pessoais com respeito e em conformidade com a legislação aplicável.'},
    {t:'7ª. Das obrigações da CONTRATANTE',p:'A CONTRATANTE se compromete a: (i) disponibilizar ao(à) CONTRATADO(A), pela plataforma, informações claras sobre cada convite de pesquisa antes de sua aceitação, incluindo valor por formulário, área geográfica e cotas; (ii) disponibilizar, na tela "Meus ganhos", o resultado da auditoria de cada entrevista enviada; e (iii) efetuar o pagamento dos formulários aprovados na forma e no prazo previstos na Cláusula 4ª.'},
    {t:'8ª. Da proteção de dados pessoais (LGPD)',p:'As partes se comprometem a tratar os dados pessoais a que tiverem acesso em razão deste Contrato — inclusive os dados pessoais dos entrevistados coletados durante as pesquisas e os dados pessoais do(a) próprio(a) CONTRATADO(A) — em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), utilizando-os exclusivamente para as finalidades de execução das pesquisas e da relação contratual ora firmada, vedados o uso, a cópia, a divulgação ou o compartilhamento para qualquer outra finalidade.'},
    {t:'9ª. Da confidencialidade e da propriedade dos dados coletados',p:'Todos os dados, respostas e informações coletados durante a execução das pesquisas são de propriedade exclusiva da CONTRATANTE e/ou de seus clientes, não podendo o(a) CONTRATADO(A) deles se utilizar, copiá-los, divulgá-los ou reproduzi-los, no todo ou em parte, para qualquer finalidade diversa da execução deste Contrato, mesmo após o seu término.'},
    {t:'10ª. Da vigência e da rescisão',p:'Este Contrato vigora por prazo indeterminado a partir da data de sua assinatura eletrônica, podendo ser rescindido, a qualquer tempo e sem necessidade de justificativa, por qualquer das partes, mediante simples comunicação — inclusive por e-mail ou pela própria plataforma —, sem multa ou aviso prévio, dada a natureza autônoma e não exclusiva da prestação de serviços. A rescisão não afeta o direito do(a) CONTRATADO(A) ao pagamento das entrevistas já aprovadas até a data da rescisão, tampouco desobriga as partes das cláusulas de confidencialidade e proteção de dados, que permanecem vigentes após o término do Contrato.'},
    {t:'11ª. Da assinatura eletrônica',p:'As partes reconhecem, desde já, a validade jurídica e a força probatória da assinatura eletrônica utilizada para a celebração deste Contrato, nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, e do art. 107 do Código Civil (Lei nº 10.406/2002), que consagra a liberdade das formas de manifestação de vontade. A aceitação eletrônica deste Contrato pelo(a) CONTRATADO(A), realizada dentro da plataforma mediante identificação (nome e CPF cadastrados), declaração expressa de concordância e registro de data, hora, endereço IP (quando disponível) e do resumo criptográfico (hash) do texto exato então apresentado, é havida pelas partes como manifestação de vontade válida, inequívoca e suficiente para todos os efeitos deste Contrato, dispensando-se a assinatura manuscrita ou por certificado digital ICP-Brasil.'},
    {t:'12ª. Do foro',p:`Fica eleito o foro da comarca de ${cidade||'domicílio da CONTRATANTE'}, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou controvérsias oriundas deste Contrato.`},
  ];
}
const CONTRACT_TITLE='CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUTÔNOMOS DE COLETA DE DADOS DE PESQUISA';
function contractHtml(nome,cpf,cidade){
  return '<div style="text-align:center;font-weight:700;font-size:14px;color:var(--ink)">'+esc(CONTRACT_TITLE)+'</div>'+
    contractClauses(nome,cpf,cidade).map(c=>`<h3>${esc(c.t)}</h3><p style="margin:0 0 10px;text-align:justify">${esc(c.p)}</p>`).join('');
}
function contractPlainText(nome,cpf,cidade){
  return CONTRACT_TITLE+'\n\n'+contractClauses(nome,cpf,cidade).map(c=>c.t.toUpperCase()+'\n'+c.p).join('\n\n');
}
/* resumo criptográfico (SHA-256) do texto exato assinado — evidência de
   integridade: se o texto do contrato mudar depois, o hash não bate mais
   com o registrado na assinatura antiga. Best effort: navegadores muito
   antigos ou contexto sem HTTPS podem não ter crypto.subtle — nesse caso
   a assinatura ainda é gravada (o que garante o direito ao pagamento é o
   registro do aceite em si, não o hash), só sem esse reforço extra. */
async function sha256Hex(text){
  const enc=new TextEncoder().encode(text);
  const buf=await crypto.subtle.digest('SHA-256',enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
/* IP de quem está assinando — evidência adicional de praxe em assinatura
   eletrônica simples. Também best effort: serviço externo indisponível (ou
   sem internet) não deve impedir a assinatura, só fica sem esse dado. */
async function fetchClientIp(){
  try{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),3000);
    const res=await fetch('https://api.ipify.org?format=json',{signal:ctrl.signal});
    clearTimeout(timer);
    if(!res.ok)return null;
    const data=await res.json();
    return data.ip||null;
  }catch(ex){return null;}
}

/* assinatura eletrônica da CONTRATANTE (PesquisaPro): diferente da do
   pesquisador (uma por pessoa), esta é uma única linha por versão do
   contrato — um administrador assina uma vez (tela "Contratos") e isso
   passa a valer para todos os pesquisadores que assinarem depois. Todo
   usuário logado pode consultar esse status (é isso que permite a tela
   "Meu contrato" do pesquisador mostrar os dois lados assinados). */
let COMPANY_SIGNATURE=null,COMPANY_SIGNATURE_LOADED=false,COMPANY_SIGNATURE_LOADING=false;
function companySignatureRowToEntry(row){
  return {id:row.id,version:row.contract_version,name:row.signer_name,role:row.signer_role,
    hash:row.content_hash,ip:row.ip_address,ts:row.signed_at?new Date(row.signed_at).getTime():Date.now()};
}
async function loadCompanySignatureIfNeeded(){
  if(COMPANY_SIGNATURE_LOADED||COMPANY_SIGNATURE_LOADING)return;
  COMPANY_SIGNATURE_LOADING=true;
  try{
    const {data,error}=await sb.from('company_contract_signatures').select('*').eq('contract_version',CONTRACT_VERSION);
    if(!error){COMPANY_SIGNATURE=(data&&data[0])?companySignatureRowToEntry(data[0]):null;COMPANY_SIGNATURE_LOADED=true;}
    else console.error('Erro ao carregar assinatura da contratante:',error);
  }catch(ex){console.error('Erro de conexão ao carregar assinatura da contratante:',ex);}
  COMPANY_SIGNATURE_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='contracts'||k==='my-contract'||k==='dashboard-pesq'||k==='dashboard')go(k);
}
/* bloco de assinatura da CONTRATANTE, usado tanto em "Meu contrato" (lado
   do pesquisador) quanto em "Contratos" (lado do admin) — assim os dois
   lugares mostram sempre o mesmo status, sem duplicar lógica. */
function companySignPadHtml(){
  if(!COMPANY_SIGNATURE_LOADED)return '<div class="sign-pad">Verificando assinatura da CONTRATANTE…</div>';
  if(!COMPANY_SIGNATURE)return '<div class="sign-pad">⏳ Aguardando assinatura eletrônica da CONTRATANTE (PesquisaPro)</div>';
  const c=COMPANY_SIGNATURE;
  return `<div class="sign-pad signed">✓ Assinado eletronicamente pela CONTRATANTE por ${esc(c.name)} (${esc(c.role)}) em ${esc(new Date(c.ts).toLocaleString('pt-BR'))} · hash ${esc((c.hash||'—').slice(0,16))}…</div>`;
}
let MY_CONTRACT=null,MY_CONTRACT_LOADED=false,MY_CONTRACT_LOADING=false;
function contractRowToEntry(row){
  return {id:row.id,version:row.contract_version,fullName:row.full_name,cpf:row.cpf,
    hash:row.content_hash,ip:row.ip_address,ts:row.accepted_at?new Date(row.accepted_at).getTime():Date.now()};
}
async function loadMyContractIfNeeded(){
  if(MY_CONTRACT_LOADED||MY_CONTRACT_LOADING)return;
  if(!CURRENT_PROFILE){MY_CONTRACT_LOADED=true;return;}
  MY_CONTRACT_LOADING=true;
  try{
    const {data,error}=await sb.from('researcher_contracts').select('*')
      .eq('researcher_id',CURRENT_PROFILE.id).eq('contract_version',CONTRACT_VERSION);
    if(!error){MY_CONTRACT=(data&&data[0])?contractRowToEntry(data[0]):null;MY_CONTRACT_LOADED=true;}
    else console.error('Erro ao carregar contrato:',error);
  }catch(ex){console.error('Erro de conexão ao carregar contrato:',ex);}
  MY_CONTRACT_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='app-collect'||k==='my-contract'||k==='dashboard-pesq')go(k);
}
/* ---- convites de equipe recebidos por WhatsApp (aceitar/recusar em "Meu
   painel") — ver PAGES['dashboard-pesq'] pelo card, e
   inviteResearcherWhatsapp() no lado do admin pela criação do convite. ---- */
let MY_INVITES=[],MY_INVITES_LOADED=false,MY_INVITES_LOADING=false,MY_INVITES_LOAD_PROMISE=null;
function loadMyInvitesIfNeeded(){
  if(MY_INVITES_LOADED)return Promise.resolve();
  if(MY_INVITES_LOAD_PROMISE)return MY_INVITES_LOAD_PROMISE;
  if(!CURRENT_PROFILE){MY_INVITES_LOADED=true;return Promise.resolve();}
  MY_INVITES_LOADING=true;
  MY_INVITES_LOAD_PROMISE=(async()=>{
    try{
      const {data,error}=await sb.from('survey_invites').select('*')
        .eq('researcher_id',CURRENT_PROFILE.id).eq('status','pendente');
      if(!error){MY_INVITES=data||[];MY_INVITES_LOADED=true;}
      else console.error('Erro ao carregar convites:',error);
    }catch(ex){console.error('Erro de conexão ao carregar convites:',ex);}
    finally{
      MY_INVITES_LOADING=false;MY_INVITES_LOAD_PROMISE=null;
      const onKey=document.querySelector('.nav-item.on');
      if(onKey&&onKey.dataset.key==='dashboard-pesq')go('dashboard-pesq');
    }
  })();
  return MY_INVITES_LOAD_PROMISE;
}
let MY_INVITE_RESPONDING=null; /* id do convite sendo respondido agora — trava os botões pra não clicar 2x */
async function respondMyInvite(inviteId,accept){
  if(MY_INVITE_RESPONDING)return;
  MY_INVITE_RESPONDING=inviteId;
  go('dashboard-pesq');
  try{
    let detail=null;
    const detailed=await sb.rpc('respond_survey_invite_details',{p_invite_id:inviteId,p_accept:accept});
    if(detailed.error){
      const legacy=await sb.rpc('respond_survey_invite',{p_invite_id:inviteId,p_accept:accept});
      if(legacy.error)throw new Error(legacy.error.message);
    }else detail=detailed.data;
    MY_INVITES=MY_INVITES.filter(i=>i.id!==inviteId);
    if(accept){
      // o convite aceito grava o vínculo direto no banco (survey_team) — só
      // precisamos recarregar as pesquisas pra essa passar a aparecer nas
      // cotas/coleta desta conta.
      SURVEYS_LOADED=false;
      await loadSurveysIfNeeded();
      MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS=[];
      await loadMySurveyCommunicationsIfNeeded();
      if(detail?.whatsapp_group_url)alert('Convite aceito. O chat da pesquisa já está disponível no seu painel. Use o botão "Entrar no grupo do WhatsApp" para solicitar sua entrada no grupo oficial.');
      else alert('Convite aceito. O chat da pesquisa já está disponível no seu painel. A gestão ainda não configurou o link do grupo do WhatsApp.');
    }
    INVITE_FOCUS_ID=null;
    const cleanUrl=new URL(window.location.href);cleanUrl.searchParams.delete('convite');
    window.history.replaceState({},'',cleanUrl.href);
  }catch(ex){alert('Não foi possível responder ao convite: '+ex.message);}
  MY_INVITE_RESPONDING=null;
  go('dashboard-pesq');
}
let INVITE_FOCUS_ID=null;
async function openSurveyInviteFromUrl(){
  const inviteId=new URLSearchParams(window.location.search).get('convite');
  if(!inviteId||!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return;
  INVITE_FOCUS_ID=inviteId;
  if(!MY_INVITES_LOADED)await loadMyInvitesIfNeeded();
  const invite=MY_INVITES.find(i=>i.id===inviteId);
  if(invite){go('dashboard-pesq');return;}
  try{
    const {data,error}=await sb.from('survey_invites').select('id,status').eq('id',inviteId).eq('researcher_id',CURRENT_PROFILE.id).maybeSingle();
    if(error)throw new Error(error.message);
    if(data&&data.status==='aceito')alert('Este convite já foi aceito e você já está na equipe da pesquisa.');
    else if(data&&data.status==='recusado')alert('Este convite já foi recusado. Peça um novo convite ao responsável pela pesquisa.');
    else alert('Este convite não está disponível para esta conta. Confira se você entrou com o e-mail correto.');
  }catch(ex){alert('Não foi possível abrir o convite: '+ex.message);}
}
PAGES['my-contract']=()=>{
  if(!CURRENT_PROFILE)return head('Meu contrato','Seu contrato de prestação de serviços')+'<div class="empty">Faça login para ver seu contrato.</div>';
  if(!CONTRACT_SETTINGS_LOADED){loadContractSettingsIfNeeded();return head('Meu contrato','Seu contrato de prestação de serviços')+'<div class="empty">Carregando a versão vigente…</div>'; }
  if(!MY_CONTRACT_LOADED)loadMyContractIfNeeded();
  if(!COMPANY_SIGNATURE_LOADED)loadCompanySignatureIfNeeded();
  if(!MY_CONTRACT_LOADED||!COMPANY_SIGNATURE_LOADED){
    return head('Meu contrato','Seu contrato de prestação de serviços')+'<div class="empty">Carregando seu contrato…</div>';
  }
  const nome=CURRENT_PROFILE.name||'';
  const cpf=CURRENT_PROFILE.cpf||'';
  const cidade=(CURRENT_PROFILE.cidade||'').split('/')[0];
  const docHtml=contractHtml(nome,cpf,cidade);
  if(MY_CONTRACT){
    return head('Meu contrato','Contrato de prestação de serviços — assinado eletronicamente')+`
    <div class="contract-doc mb">${docHtml}
      <h3>Assinaturas</h3>
      ${companySignPadHtml()}
      <div class="sign-pad signed">✓ Assinado eletronicamente por ${esc(MY_CONTRACT.fullName)}${MY_CONTRACT.cpf?(' · CPF '+esc(MY_CONTRACT.cpf)):''} em ${esc(new Date(MY_CONTRACT.ts).toLocaleString('pt-BR'))}${MY_CONTRACT.ip?(' · IP '+esc(MY_CONTRACT.ip)):' · IP não disponível'} · hash ${esc((MY_CONTRACT.hash||'—').slice(0,16))}…</div>
    </div>
    <button class="btn btn-out" onclick="window.print()">🖨️ Imprimir / salvar em PDF</button>
    <button class="btn-ghost" onclick="downloadContractCopy()">⬇ Baixar cópia (.txt)</button>`;
  }
  return head('Meu contrato','Leia com atenção — este contrato vale para todas as suas pesquisas')+`
  <div class="callout mb">📄 Este é um contrato único: ao assinar, ele passa a valer automaticamente para todas as pesquisas que você aceitar na plataforma — não é preciso assinar de novo a cada pesquisa. <b>Enquanto não assinar, a tela "Coletar (app)" fica bloqueada.</b></div>
  <div class="contract-doc mb">${docHtml}<h3>Assinaturas</h3>${companySignPadHtml()}</div>
  <div class="card">
    <div class="card-t">Assinatura eletrônica</div>
    <div class="card-d">Seus dados abaixo são os mesmos do seu cadastro na plataforma.</div>
    <div class="field-row mb">
      <div><label class="lbl">Nome completo</label><input class="inp" value="${esc(nome)}" disabled style="background:var(--bg);color:var(--ink3)"></div>
      <div><label class="lbl">CPF</label><input class="inp" value="${esc(cpf||'não informado no seu cadastro')}" disabled style="background:var(--bg);color:var(--ink3)"></div>
    </div>
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink2);cursor:pointer;margin-bottom:14px">
      <input type="checkbox" id="contractAgree" style="margin-top:3px">
      <span>Li e concordo integralmente com os termos acima, em especial quanto à <b>ausência de vínculo empregatício</b> (Cláusula 3ª) e às <b>condições de pagamento</b> (Cláusulas 4ª e 5ª), e reconheço a validade desta assinatura eletrônica (Cláusula 11ª).</span>
    </label>
    <div id="contractSignMsg"></div>
    <button class="btn btn-accent" id="contractSignBtn" style="font-size:15px;padding:12px 22px" onclick="signContract()"${cpf?'':' disabled'}>✎ Assinar eletronicamente</button>
    ${cpf?'':'<div style="font-size:11.5px;color:var(--red);margin-top:6px">Seu cadastro está sem CPF — peça a um administrador para completá-lo antes de assinar.</div>'}
  </div>`;
};
async function signContract(){
  if(!CURRENT_PROFILE)return;
  const msgEl=document.getElementById('contractSignMsg');
  const agree=document.getElementById('contractAgree');
  if(!agree||!agree.checked){
    if(msgEl)msgEl.innerHTML='<div class="callout" style="margin:10px 0 0;border-color:var(--red)">Marque a caixa de concordância acima antes de assinar.</div>';
    return;
  }
  const nome=CURRENT_PROFILE.name||'';
  const cpf=CURRENT_PROFILE.cpf||'';
  if(!cpf){alert('Seu cadastro está sem CPF — peça a um administrador para completá-lo antes de assinar.');return;}
  const cidade=(CURRENT_PROFILE.cidade||'').split('/')[0];
  if(!confirm('Confirma a assinatura eletrônica deste contrato como '+nome+', CPF '+cpf+'?\n\nEsta ação registra data, hora e (quando disponível) o endereço IP do dispositivo, e não pode ser desfeita.'))return;
  const btn=document.getElementById('contractSignBtn');
  if(btn){btn.disabled=true;btn.textContent='Assinando…';}
  const text=contractPlainText(nome,cpf,cidade);
  let hash='';
  try{hash=await sha256Hex(text);}catch(ex){hash='';}
  const ip=await fetchClientIp();
  try{
    const {data:inserted,error}=await sb.from('researcher_contracts').insert({
      researcher_id:CURRENT_PROFILE.id,
      contract_version:CONTRACT_VERSION,
      full_name:nome,
      cpf,
      content_hash:hash||'indisponível neste navegador',
      ip_address:ip,
      user_agent:(navigator&&navigator.userAgent)||null,
    }).select().single();
    if(error)throw new Error(error.message);
    MY_CONTRACT=contractRowToEntry(inserted);
    MY_CONTRACT_LOADED=true;
  }catch(ex){
    alert('Não foi possível registrar sua assinatura agora: '+ex.message);
    if(btn){btn.disabled=false;btn.textContent='✎ Assinar eletronicamente';}
    return;
  }
  go('my-contract');
}
function downloadContractCopy(){
  if(!MY_CONTRACT||!CURRENT_PROFILE)return;
  const cidade=(CURRENT_PROFILE.cidade||'').split('/')[0];
  const text=contractPlainText(MY_CONTRACT.fullName,MY_CONTRACT.cpf,cidade)+
    '\n\n----------------------------------------\nASSINATURA ELETRÔNICA\n'+
    'Assinado por: '+MY_CONTRACT.fullName+' (CPF '+(MY_CONTRACT.cpf||'—')+')\n'+
    'Data/hora: '+new Date(MY_CONTRACT.ts).toLocaleString('pt-BR')+'\n'+
    'Endereço IP: '+(MY_CONTRACT.ip||'não disponível')+'\n'+
    'Hash SHA-256 do documento: '+(MY_CONTRACT.hash||'—')+'\n'+
    'Versão do contrato: '+MY_CONTRACT.version+'\n';
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='contrato-pesquisapro-'+(MY_CONTRACT.fullName||'pesquisador').replace(/\s+/g,'_')+'.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

/* ============ COMPANY ============ */
PAGES.company=()=>head('Dados da empresa','Informações usadas em contratos e relatórios oficiais',
  '<button class="btn btn-fill" onclick="alert(\'Recurso ainda não configurado: CNPJ, endereço e contato salvos\')">Salvar</button>')+`
  <div class="callout mb">🔒 O PesquisaPro é a única empresa cadastrada no sistema — por isso, apenas <b>CNPJ</b>, <b>endereço</b> e <b>contato</b> podem ser alterados aqui. Os demais dados de identificação são fixos.</div>
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Identificação</div>
      <div class="mb"><label class="lbl">Razão social <span class="pill pill-gray">🔒 fixo</span></label><input class="inp" value="PesquisaPro Pesquisas e Opinião Ltda" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      <div class="field-row mb">
        <div><label class="lbl">CNPJ</label><input class="inp" value="00.000.000/0001-00"></div>
        <div><label class="lbl">Inscrição estadual <span class="pill pill-gray">🔒 fixo</span></label><input class="inp" value="Isento" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      </div>
      <div class="mb"><label class="lbl">Endereço</label><input class="inp" value="Av. Afonso Pena, 1000 — Belo Horizonte/MG"></div>
      <div class="field-row"><div><label class="lbl">Telefone</label><input class="inp" value="(31) 99668-3030"></div><div><label class="lbl">E-mail</label><input class="inp" value="contato@pesquisapro.com.br"></div></div>
    </div>
    <div class="card">
      <div class="card-t">Marca e responsável técnico <span class="pill pill-gray">🔒 fixo</span></div>
      <div class="mb"><label class="lbl">Logotipo (usado em relatórios e contratos)</label>
        <div style="border:1px solid var(--line);border-radius:var(--r-s);height:90px;display:flex;align-items:center;justify-content:center;background:var(--bg)">
          <img src="assets/logo-wide.png" alt="PesquisaPro" style="height:34px;width:auto;border-radius:6px">
        </div></div>
      <div class="mb"><label class="lbl">Responsável técnico (estatístico)</label><input class="inp" value="Dr. Responsável Técnico · CONRE 0000" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      <div class="callout">Identidade visual e dados técnicos são únicos do PesquisaPro e aparecem automaticamente no cabeçalho dos contratos e na ficha técnica dos relatórios.</div>
    </div>
  </div>`;

/* ============ render hooks (charts, dynamic tables) ============ */
/* _beforeRender resets list/detail "armed" state BEFORE the page HTML is built,
   so PAGES[key]() always sees the correct state for THIS navigation (fixes a
   one-click-behind bug where returning to a list via the sidebar first
   re-rendered the previous detail view). */
window._beforeRender=function(key){
  if(key==='collect'){ if(!COLLECT_ARMED)COLLECT_IDX=null; COLLECT_ARMED=false; }
  if(key==='users'){ if(!USER_ARMED){USER_EDIT=null;USER_VIEW=null;} USER_ARMED=false; }
  if(key==='new-survey'){
    if(!WIZ.editArmed){WIZ.editIndex=null;WIZ.step=1;WIZ.data=blankSurveyData();WIZ_QID=1;}
    WIZ.editArmed=false;
  }
  if(key==='finance'){ if(!FIN_ARMED)FIN_IDX=null; FIN_ARMED=false; }
};

window._afterRender=function(key){
  if(key!=='collect'){stopCollectLive();}if(key!=='client-results'&&key!=='client-progress'){clientGeoStopLive();}if(key!=='client-progress'){clientProgressStopLive();}
  if(key!=='app-collect'){stopAcollectQuotaLive();}
  if(key!=='reports'){reportsStopLive();}
  if(key!=='communication'){chatStopRealtime();}
  if(key!=='dashboard'&&key!=='finance')disposeDashboardCharts();
  if(key==='collect'){
    if(COLLECT_IDX!=null){initCollectLive(COLLECT_IDX);}else{stopCollectLive();}
  }
  if(key==='users'){
    if(selectedRole==='admin'&&USER_EDIT==null&&USER_VIEW==null)renderSignupQR();
  }
  if(key==='new-survey'){
    wizRender();
  }
  if(key==='dashboard')drawDash();
  if(key==='app-collect'&&MY_CONTRACT)initGeoCollect(); /* só inicia GPS/coleta se o contrato já estiver assinado — ver PAGES['app-collect'] */
  if(key==='client-progress'){clientProgressStartLive();clientResearcherProgressLoad();clientLoadReportOverview();clientLoadPublishedReports();clientGeoStartLive();responseHeatmapLoad('client');}
  if(key==='client-results'){clientLoadReportOverview();clientLoadPublishedReports();clientGeoStartLive();responseHeatmapLoad('client');}
  if(key==='reports'){reportsLoadAndRender();reportsStartLive();reportsLoadDraft();responseHeatmapLoad('master');}
  if(key==='my-earnings')renderMyRejected();
  if(key==='sample'){calcSample();}
  if(key==='quotas'){quotaSeg(document.querySelector('#quotaSeg button'),'sexo');}
  if(key==='permissions'){drawPerms();}
  if(key==='finance'){
    drawFin();
  }
  if(key==='contract-template'){
    document.getElementById('tpl-fields').innerHTML=TPL_FIELDS.map(f=>
      `<button class="chip" title="${f[1]}" onclick="insertField('${f[0]}')">${f[0]}</button>`).join('');
    loadTpl('pesq');
  }
};

let _dashChart,_finChart;
function disposeDashboardCharts(){
  [_dashChart,_finChart].forEach(chart=>{if(chart){try{chart.destroy();}catch(e){}}});
  _dashChart=null;_finChart=null;
}
function drawDash(){
  const c=document.getElementById('dashChart');if(!c)return;
  if(typeof Chart==='undefined'){
    loadLocalAsset('chart').then(()=>{if(document.getElementById('dashChart')===c)drawDash();}).catch(()=>{});
    return;
  }
  if(_dashChart){try{_dashChart.destroy();}catch(e){}}
  _dashChart=new Chart(c,{type:'line',data:{labels:['1','2','3','4','5','6','7','8','9','10','11','12','13','14'],
    datasets:[{label:'Coletas',data:[120,180,210,160,240,290,180,220,310,280,330,300,360,340],
      borderColor:'#2563eb',backgroundColor:'rgba(31,95,168,.12)',fill:true,tension:.35,pointRadius:0,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}
function drawFin(){
  const c=document.getElementById('finChart');if(!c)return;
  if(typeof Chart==='undefined'){
    loadLocalAsset('chart').then(()=>{if(document.getElementById('finChart')===c)drawFin();}).catch(()=>{});
    return;
  }
  if(_finChart){try{_finChart.destroy();}catch(e){}}
  _finChart=new Chart(c,{type:'bar',data:{labels:['Sem 1','Sem 2','Sem 3','Sem 4'],
    datasets:[{label:'Repasse',data:[4200,6800,9100,14235],backgroundColor:'#059669',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>'R$ '+(v/1000)+'k'},grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}

/* sample calculator */
function calcSample(){
  const N=+document.getElementById('sp-pop').value||0;
  const e=+document.getElementById('sp-err').value;
  const Z=+document.getElementById('sp-conf').value;
  const p=+document.getElementById('sp-prop').value||0;
  const n=sampleSize(N,e,Z,p);
  const nadj=Math.ceil(n*1.1);
  document.getElementById('sp-n').textContent=n.toLocaleString('pt-BR');
  document.getElementById('sp-nadj').textContent=nadj.toLocaleString('pt-BR');
  document.getElementById('sp-cost').textContent='R$ '+(nadj*12.5).toLocaleString('pt-BR',{maximumFractionDigits:0});
  drawSampleChart(N,Z,p);
}
let _sampleChart;
function drawSampleChart(N,Z,p){
  const c=document.getElementById('sampleChart');if(!c)return;
  if(typeof Chart==='undefined'){
    loadLocalAsset('chart').then(()=>{if(document.getElementById('sampleChart')===c)drawSampleChart(N,Z,p);}).catch(()=>{});
    return;
  }
  const errs=[0.05,0.04,0.03,0.025,0.02,0.015];
  const data=errs.map(e=>sampleSize(N,e,Z,p*100));
  if(_sampleChart)_sampleChart.destroy();
  _sampleChart=new Chart(c,{type:'bar',data:{labels:errs.map(e=>'±'+(e*100)+'%'),
    datasets:[{label:'Amostra',data,backgroundColor:'#7c3aed',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}

/* quotas segmented */
function quotaSeg(btn,which){
  document.querySelectorAll('#quotaSeg button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const sets={
    sexo:[['Masculino',1380,2058,'#2563eb'],['Feminino',1467,2142,'#059669']],
    idade:[['16–24',390,535,'#2563eb'],['25–44',830,1065,'#059669'],['45–59',920,1280,'#ea580c'],['60+',707,1320,'#7c3aed']],
    regiao:[['Central',640,890,'#2563eb'],['Zona da Mata',410,560,'#059669'],['Triângulo',528,610,'#ea580c'],['Norte',430,640,'#7c3aed'],['Vale do Rio Doce',390,500,'#d97706'],['Demais',449,1000,'#dc2626']]
  };
  document.getElementById('quotaBody').innerHTML=sets[which].map(r=>quota(r[0],r[1],r[2],r[3])).join('');
}

/* permissions matrix — uma coluna por perfil (PERM_ROLES), cada linha é {name, [role]:0|1} */
const PERM_ROLES=['admin','coord','gerente','pesq','cliente','admpro','vendedor','indicador'];
let PERMS=[
  {name:'Criar / editar questionários',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Calcular amostra e cotas',admin:1,coord:1,gerente:1,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Gerar links de coleta',admin:1,coord:1,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Coletar no app',admin:1,coord:1,gerente:0,pesq:1,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Ver relatórios',admin:1,coord:1,gerente:1,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Exportar dados brutos',admin:1,coord:1,gerente:1,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Gerenciar usuários',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Editar perfis e permissões',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Aprovar / processar pagamentos',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Definir valores por formulário',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Gerar e enviar contratos',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
  {name:'Gerenciar clientes',admin:1,coord:0,gerente:1,pesq:0,cliente:0,admpro:1,vendedor:1,indicador:1},
  {name:'Editar dados da empresa',admin:1,coord:0,gerente:0,pesq:0,cliente:0,admpro:1,vendedor:0,indicador:0},
];
function drawPerms(){
  const cell=(v,r,role)=>`<td style="text-align:center;cursor:pointer" onclick="permToggle(${r},'${role}')">${
    v?'<span class="perm-on">✓</span>':'<span class="perm-off">—</span>'}</td>`;
  document.getElementById('permBody').innerHTML=PERMS.map((p,r)=>
    `<tr><td>${esc(p.name)}</td>${PERM_ROLES.map(role=>cell(p[role],r,role)).join('')}
      <td style="text-align:center"><button class="btn-ghost" style="color:var(--red);padding:4px 8px" title="Remover permissão" onclick="permDel(${r})">✕</button></td></tr>`).join('');
}
function permToggle(r,role){PERMS[r][role]=PERMS[r][role]?0:1;drawPerms();}
function permDel(r){if(!confirm('Remover a permissão "'+PERMS[r].name+'"?'))return;PERMS.splice(r,1);drawPerms();}
function permAdd(){
  const name=prompt('Nome da nova permissão:','');
  if(!name||!name.trim())return;
  const row={name:name.trim()};
  PERM_ROLES.forEach(role=>row[role]=0);
  PERMS.push(row);drawPerms();
}
function permSave(){alert('Permissões salvas. Cada perfil passa a ter exatamente os acessos marcados.');}


/* ============ APROVAÇÃO DO FORMULÁRIO E LINK GERAL DE EQUIPE ============ */
function surveyApprovalLink(requestId){
  const url=new URL('app.html',window.location.href);url.search='';url.searchParams.set('aprovar',requestId);return url.href;
}
function surveyResearcherLinkUrl(token){
  const url=new URL('app.html',window.location.href);url.search='';url.searchParams.set('equipe',token);return url.href;
}
function approvalStatusMarkup(status){
  if(status==='aprovado')return '<span class="pill pill-green">✓ Aprovado pelo cliente</span>';
  if(status==='ajustes_solicitados')return '<span class="pill pill-amber">Ajustes solicitados</span>';
  if(status==='cancelado')return '<span class="pill pill-gray">Versão substituída</span>';
  if(status==='nao_enviado')return '<span class="pill pill-gray">Ainda não enviado</span>';
  return '<span class="pill pill-blue">Aguardando aprovação</span>';
}
function approvalQuestionTypeLabel(type){return Q_TYPES[type]||({pair:'Duas respostas',ranking:'Ranking de preferências'}[type]||type||'Pergunta');}
function approvalSnapshotMarkup(snapshot){
  const questions=Array.isArray(snapshot?.questions)?snapshot.questions:[];
  if(!questions.length)return '<div class="empty">Este formulário ainda não possui perguntas configuradas.</div>';
  return `<div class="approval-form-question-list">${questions.slice().sort((a,b)=>(a.position||0)-(b.position||0)).map((q,i)=>{
    const options=Array.isArray(q.options)?q.options:[],fields=Array.isArray(q.fields)?q.fields:[];
    const optionMarkup=options.length?`<div class="approval-form-options">${options.slice().sort((a,b)=>(a.position||0)-(b.position||0)).map(o=>`<span class="approval-form-option">${esc(o.label||'')}</span>`).join('')}</div>`:'';
    const fieldMarkup=fields.length?`<div class="approval-form-fields">${fields.slice().sort((a,b)=>(a.position||0)-(b.position||0)).map(f=>`<div class="approval-form-field"><b>${esc(f.label||'Resposta')}</b><span>${esc(approvalQuestionTypeLabel(f.type))}${Array.isArray(f.options)&&f.options.length?' · '+esc(f.options.join(' · ')):''}</span></div>`).join('')}</div>`:'';
    return `<article class="approval-form-question"><div class="approval-form-question-head"><span class="approval-form-question-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(q.text||'(pergunta sem texto)')}</h3><span class="pill pill-gray">${esc(approvalQuestionTypeLabel(q.type))}</span></div></div>${optionMarkup}${fieldMarkup}</article>`;
  }).join('')}</div>`;
}
function clientApprovalRequestLinkMarkup(request){
  if(!request?.id)return '';
  const link=surveyApprovalLink(request.id);
  return `<div class="callout" style="margin-top:14px"><b>Link de aprovação</b><div class="approval-link-value">${esc(link)}</div><button class="btn btn-out" style="margin-top:8px" onclick="copyTextValue(${jsArg(link)},'Link de aprovação copiado.')">Copiar link</button></div>`;
}
async function loadClientApprovalRequest(){
  if(CLIENT_APPROVAL_REQUEST_LOADED||CLIENT_APPROVAL_LOADING||!CURRENT_PROFILE||CURRENT_PROFILE.role!=='cliente')return;
  CLIENT_APPROVAL_LOADING=true;
  try{
    const {data,error}=await sb.rpc('get_client_form_approval_request',{p_request_id:CLIENT_APPROVAL_REQUEST_ID||null});
    if(error){if(/get_client_form_approval_request|function .* does not exist|schema cache/i.test(error.message||'')){CLIENT_APPROVAL_SCHEMA_MISSING=true;}else throw error;}
    CLIENT_APPROVAL_REQUEST=data||null;
  }catch(ex){console.error('Não foi possível carregar a aprovação do formulário:',ex);}
  finally{CLIENT_APPROVAL_REQUEST_LOADED=true;CLIENT_APPROVAL_LOADING=false;if(document.querySelector('.nav-item.on')?.dataset.key==='form-approval')go('form-approval');}
}
async function respondClientFormApproval(status){
  if(CLIENT_APPROVAL_RESPONDING||!CLIENT_APPROVAL_REQUEST?.id)return;
  const comment=(document.getElementById('client-approval-comment')?.value||'').trim();
  if(status==='ajustes_solicitados'&&!comment){alert('Descreva quais ajustes precisam ser feitos antes de solicitar alterações.');return;}
  if(status==='aprovado'&&!confirm('Confirmar a aprovação desta versão do formulário?'))return;
  CLIENT_APPROVAL_RESPONDING=true;go('form-approval');
  try{
    const {data,error}=await sb.rpc('respond_survey_form_approval',{p_request_id:CLIENT_APPROVAL_REQUEST.id,p_status:status,p_comment:comment||null});
    if(error)throw new Error(error.message);
    CLIENT_APPROVAL_REQUEST={...CLIENT_APPROVAL_REQUEST,status:data?.status||status,client_comment:data?.client_comment||comment||null,responded_at:data?.responded_at||new Date().toISOString()};
    alert(status==='aprovado'?'Formulário aprovado. A equipe já pode prosseguir conforme as regras da pesquisa.':'Pedido de ajustes registrado e enviado à equipe do PesquisaPro.');
  }catch(ex){alert('Não foi possível registrar sua resposta. '+(CLIENT_APPROVAL_SCHEMA_MISSING?'Execute a migration deploy/aprovacao-formulario-link-pesquisadores.sql no Supabase.':'Detalhe: '+ex.message));}
  CLIENT_APPROVAL_RESPONDING=false;go('form-approval');
}
PAGES['form-approval']=()=>{
  if(!CURRENT_PROFILE||CURRENT_PROFILE.role!=='cliente')return head('Aprovação do formulário','Área exclusiva do cliente')+'<div class="card"><div class="empty">Entre com uma conta de cliente para revisar um formulário.</div></div>';
  if(!CLIENT_APPROVAL_REQUEST_LOADED){loadClientApprovalRequest();return head('Aprovação do formulário','Carregando a solicitação enviada pela equipe…')+'<div class="empty">Carregando formulário para aprovação…</div>';}
  if(CLIENT_APPROVAL_SCHEMA_MISSING)return head('Aprovação do formulário','Revisão da pesquisa')+'<div class="card"><div class="callout warn"><b>Este recurso ainda não foi ativado no banco.</b><br>A equipe precisa executar a migration <code>deploy/aprovacao-formulario-link-pesquisadores.sql</code> no Supabase.</div></div>';
  const request=CLIENT_APPROVAL_REQUEST;
  if(!request)return head('Aprovação do formulário','Revisão da pesquisa')+'<div class="card" style="text-align:center;padding:44px 24px"><div style="font-weight:800;font-size:18px">Nenhum formulário aguardando sua revisão</div><p style="color:var(--ink3);max-width:520px;margin:10px auto;line-height:1.6">Quando a equipe enviar uma pesquisa, ela aparecerá aqui para você revisar, aprovar ou solicitar ajustes.</p></div>';
  const snapshot=request.form_snapshot||{};
  const canRespond=request.status==='pendente'||request.status==='ajustes_solicitados';
  return head('Aprovação do formulário',snapshot.name||request.survey_name||'Pesquisa',`<span class="pill pill-blue">Versão ${Number(request.form_version)||1}</span>`)+`<section class="card approval-form-intro"><div class="approval-form-status-row"><div><div class="card-t">Revise o formulário da pesquisa</div><div class="card-d">Confira o texto das perguntas e as opções exatamente como serão apresentadas aos entrevistados.</div></div>${approvalStatusMarkup(request.status)}</div><div class="approval-form-meta"><span><b>Pesquisa:</b> ${esc(request.survey_name||snapshot.name||'—')}</span><span><b>Tipo:</b> ${esc(snapshot.tipo||'—')}</span><span><b>Período:</b> ${esc(snapshot.data_ini||'—')} a ${esc(snapshot.data_fim||'—')}</span><span><b>Perguntas:</b> ${(snapshot.questions||[]).length}</span></div></section><section class="card approval-form-preview"><div class="card-t">Formulário apresentado</div><div class="card-d">Versão congelada no momento do envio. Alterações posteriores gerarão uma nova versão para aprovação.</div>${approvalSnapshotMarkup(snapshot)}</section>${request.client_comment?`<section class="card approval-client-comment"><div class="card-t">Seu último comentário</div><p>${esc(request.client_comment)}</p></section>`:''}${canRespond?`<section class="card approval-form-response"><div class="card-t">Sua decisão</div><div class="card-d">Aprove o formulário ou descreva os ajustes necessários para a equipe.</div><textarea class="inp" id="client-approval-comment" rows="4" placeholder="Comentário opcional na aprovação; obrigatório ao solicitar ajustes.">${esc(request.client_comment||'')}</textarea><div class="approval-response-actions"><button class="btn btn-out" onclick="respondClientFormApproval('ajustes_solicitados')">Solicitar ajustes</button><button class="btn btn-fill" onclick="respondClientFormApproval('aprovado')">✓ Aprovar formulário</button></div></section>`:'<div class="callout">Esta versão já recebeu uma resposta. A equipe poderá enviar uma nova versão se o formulário for alterado.</div>'}`;
};
function openClientApprovalFromUrl(){
  const id=new URLSearchParams(window.location.search).get('aprovar');
  if(!id||!CURRENT_PROFILE||CURRENT_PROFILE.role!=='cliente')return;
  CLIENT_APPROVAL_REQUEST_ID=id;CLIENT_APPROVAL_REQUEST=null;CLIENT_APPROVAL_REQUEST_LOADED=false;CLIENT_APPROVAL_SCHEMA_MISSING=false;go('form-approval');
}
async function copyTextValue(value,message='Copiado.'){
  try{await navigator.clipboard.writeText(value);alert(message);}catch(ex){window.prompt('Copie o valor:',value);}
}
async function loadResearcherLinkContext(){
  if(RESEARCHER_LINK_LOADING||!RESEARCHER_LINK_TOKEN||!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return;
  RESEARCHER_LINK_LOADING=true;
  try{
    const {data,error}=await sb.rpc('get_survey_researcher_link_context',{p_token:RESEARCHER_LINK_TOKEN});
    if(error)throw error;RESEARCHER_LINK_CONTEXT=data||null;
  }catch(ex){RESEARCHER_LINK_CONTEXT={valid:false,reason:'Não foi possível carregar o convite. Execute a migration de aprovação e links no Supabase.'};console.error(ex);}
  finally{RESEARCHER_LINK_LOADING=false;if(document.querySelector('.nav-item.on')?.dataset.key==='researcher-link-invite')go('researcher-link-invite');}
}
PAGES['researcher-link-invite']=()=>{
  if(!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return head('Convite de pesquisa','Área exclusiva de pesquisadores')+'<div class="card"><div class="empty">Entre com a conta de pesquisador que deseja usar para aceitar o convite.</div></div>';
  if(!RESEARCHER_LINK_CONTEXT){loadResearcherLinkContext();return head('Convite de pesquisa','Verificando sua elegibilidade…')+'<div class="empty">Carregando convite…</div>';}
  const context=RESEARCHER_LINK_CONTEXT;
  if(!context.valid)return head('Convite de pesquisa','Convite indisponível')+'<div class="card"><div class="callout warn">'+esc(context.reason||'Este link não está disponível.')+'</div></div>';
  const canAccept=!!context.eligible&&!context.already_member;
  return head('Convite de pesquisa',context.survey_name||'Pesquisa')+`<section class="card researcher-link-invite-card"><div class="researcher-link-icon">✉</div><div class="card-t">Você foi convidado(a) para participar desta pesquisa</div><p class="researcher-link-survey-name">${esc(context.survey_name||'Pesquisa')}</p><div class="callout ${canAccept?'':'warn'}">${esc(context.reason||'')}</div>${context.expires_at?`<div class="card-d">Este link expira em ${esc(new Date(context.expires_at).toLocaleString('pt-BR'))}.</div>`:''}<div class="researcher-link-actions">${context.already_member?'<button class="btn btn-fill" onclick="go(\'dashboard-pesq\')">Abrir meu painel</button>':canAccept?'<button class="btn btn-fill" onclick="acceptResearcherLinkInvite()">✓ Aceitar e entrar na equipe</button>':'<button class="btn btn-out" onclick="go(\'researcher-profile\')">Atualizar meu perfil</button>'}</div><p class="card-d" style="margin-top:14px">Ao aceitar, você entra automaticamente na equipe da pesquisa e terá acesso ao chat de orientações. O grupo de WhatsApp, quando configurado, será disponibilizado no seu painel.</p></section>`;
};
async function acceptResearcherLinkInvite(){
  if(RESEARCHER_LINK_ACCEPTING||!RESEARCHER_LINK_TOKEN)return;
  RESEARCHER_LINK_ACCEPTING=true;
  try{
    const {data,error}=await sb.rpc('accept_survey_researcher_link',{p_token:RESEARCHER_LINK_TOKEN});
    if(error)throw new Error(error.message);
    SURVEYS_LOADED=false;await loadSurveysIfNeeded();MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS=[];await loadMySurveyCommunicationsIfNeeded();
    alert('Convite aceito. Você entrou automaticamente na equipe da pesquisa e o chat de orientações está disponível no seu painel.');
    const clean=new URL(window.location.href);clean.searchParams.delete('equipe');window.history.replaceState({},'',clean.href);RESEARCHER_LINK_TOKEN=null;RESEARCHER_LINK_CONTEXT=null;go('dashboard-pesq');
  }catch(ex){alert('Não foi possível aceitar o convite. Verifique sua elegibilidade e se a migration foi executada. Detalhe: '+ex.message);}
  RESEARCHER_LINK_ACCEPTING=false;
}
function openResearcherLinkFromUrl(){
  const token=new URLSearchParams(window.location.search).get('equipe');
  if(!token||!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return;
  RESEARCHER_LINK_TOKEN=token;RESEARCHER_LINK_CONTEXT=null;go('researcher-link-invite');
}

function loadAdminClientApprovalStatus(clientId,surveyIds){
  if(!clientId||!surveyIds.length||ADMIN_APPROVAL_STATUS_LOADING[clientId]||ADMIN_APPROVAL_STATUS_LOADED[clientId])return;
  ADMIN_APPROVAL_STATUS_LOADING[clientId]=true;
  Promise.all(surveyIds.map(surveyId=>sb.rpc('get_staff_form_approval_summary',{p_survey_id:surveyId}))).then(results=>{
    results.forEach((result,i)=>{
      if(result.error)return;
      (result.data||[]).filter(row=>row.client_id===clientId).forEach(row=>{ADMIN_APPROVAL_STATUS_BY_CLIENT[clientId+'|'+surveyIds[i]]=row;});
    });
    ADMIN_APPROVAL_STATUS_LOADED[clientId]=true;
    if(USER_VIEW!=null){USER_ARMED=true;go('users');}
  }).catch(ex=>console.warn('Status de aprovação ainda indisponível:',ex)).finally(()=>{delete ADMIN_APPROVAL_STATUS_LOADING[clientId];});
}
function adminClientApprovalMarkup(client,index){
  if(!client?.id)return '<div class="callout warn">Este cliente ainda não possui um identificador persistido.</div>';
  if(!SURVEYS_LOADED){USER_ARMED=true;loadSurveysIfNeeded();return '<div class="empty" style="padding:12px 0">Carregando pesquisas vinculadas…</div>';}
  const linked=SURVEYS.filter(s=>(s.clientIds||[]).includes(client.id)||(client.surveys||[]).includes(s.name));
  if(!linked.length)return '<div class="empty" style="padding:12px 0">Nenhuma pesquisa está vinculada a este cliente. Vincule o cliente no assistente da pesquisa antes de enviar o formulário.</div>';
  const surveyIds=linked.map(s=>s.id);loadAdminClientApprovalStatus(client.id,surveyIds);
  return `<label class="lbl" for="admin-approval-survey-${index}">Pesquisa para aprovação</label><select class="inp" id="admin-approval-survey-${index}" onchange="adminApprovalSelectionChanged(${index},${jsArg(client.id)})">${linked.map(s=>{const row=ADMIN_APPROVAL_STATUS_BY_CLIENT[client.id+'|'+s.id];return `<option value="${esc(s.id)}">${esc(s.name)}${row&&row.status&&row.status!=='nao_enviado'?' · '+(row.status==='aprovado'?'aprovado':row.status==='ajustes_solicitados'?'ajustes solicitados':'aguardando'):''}</option>`;}).join('')}</select><div id="admin-approval-status-${index}" class="card-d" style="margin-top:8px">${adminApprovalStatusText(client.id,linked[0]?.id)}</div><button class="btn btn-fill" style="width:100%;margin-top:10px;background:var(--teal)" onclick="requestSurveyFormApprovalForClient(${index})">Enviar formulário via WhatsApp</button><button class="btn btn-out" style="width:100%;margin-top:8px" onclick="requestSurveyFormApprovalForClient(${index},true)">Gerar e copiar link</button><div class="card-d" style="margin-top:10px">O cliente deverá entrar com a própria conta para aprovar ou solicitar ajustes. Uma nova versão é criada quando o formulário for reenviado.</div>`;
}
function adminApprovalStatusText(clientId,surveyId){
  const row=ADMIN_APPROVAL_STATUS_BY_CLIENT[clientId+'|'+surveyId];
  if(!row)return 'Status de aprovação será carregado quando a migration estiver disponível.';
  if(row.status==='nao_enviado')return 'Nenhuma versão enviada para aprovação.';
  const status=row.status==='aprovado'?'aprovada':row.status==='ajustes_solicitados'?'com ajustes solicitados':row.status==='pendente'?'aguardando resposta':'cancelada';
  return 'Versão '+(row.form_version||'—')+' '+status+(row.client_comment?' · comentário: '+esc(row.client_comment):'');
}
function adminApprovalSelectionChanged(index,clientId){
  const surveyId=document.getElementById('admin-approval-survey-'+index)?.value;
  const el=document.getElementById('admin-approval-status-'+index);if(el)el.innerHTML=adminApprovalStatusText(clientId,surveyId);
}
async function requestSurveyFormApprovalForClient(clientIndex,copyOnly=false){
  const client=USERS[clientIndex];if(!client?.id)return;
  const surveyId=document.getElementById('admin-approval-survey-'+clientIndex)?.value;
  const survey=SURVEYS.find(s=>s.id===surveyId);
  if(!surveyId||!survey){alert('Selecione uma pesquisa vinculada a este cliente.');return;}
  try{
    const {data,error}=await sb.rpc('request_survey_form_approval',{p_survey_id:surveyId,p_client_id:client.id});
    if(error)throw new Error(error.message);
    const request=data||{};
    if(!request.id)throw new Error('A solicitação foi criada sem identificador.');
    ADMIN_APPROVAL_STATUS_BY_CLIENT[client.id+'|'+surveyId]={client_id:client.id,form_version:request.form_version,status:'pendente',client_comment:null};
    const statusEl=document.getElementById('admin-approval-status-'+clientIndex);if(statusEl)statusEl.innerHTML=adminApprovalStatusText(client.id,surveyId);
    const link=surveyApprovalLink(request.id);
    if(copyOnly){await copyTextValue(link,'Link de aprovação copiado.');return;}
    const msg='Olá, '+(client.contact||client.name)+'! O formulário da pesquisa "'+survey.name+'" está disponível para sua revisão. Acesse com sua conta, aprove ou solicite ajustes neste link: '+link;
    const href=conversationUrl(client.phone,msg);
    if(href)window.open(href,'_blank','noopener');else await copyTextValue(link,'Cliente sem telefone cadastrado. Link de aprovação copiado.');
    alert('Solicitação de aprovação criada para a versão '+(request.form_version||1)+'.');
  }catch(ex){alert('Não foi possível enviar o formulário para aprovação. '+(String(ex.message||'').match(/function|schema cache|approval_requests/i)?'Execute a migration deploy/aprovacao-formulario-link-pesquisadores.sql no Supabase.':'Detalhe: '+ex.message));}
}
function userClienteSendForm(i){requestSurveyFormApprovalForClient(i,false);}
