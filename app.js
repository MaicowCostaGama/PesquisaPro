/* ============ STATE ============ */
let selectedRole='admin';
const ROLES={
  admin:{name:'Admin Master',role:'Administrador',initials:'AM',
    nav:['dashboard','commercial','new-survey','surveys','surveys-done','sample','collect','reports','researcher-ranking','users','permissions','finance','contracts','contract-template','company','communication']},
  coord:{name:'Carla Menezes',role:'Coordenadora',initials:'CM',
    nav:['dashboard','commercial','surveys','surveys-done','collect','reports','researcher-ranking','finance']},
  gerente:{name:'Rafael Dias',role:'Gerente',initials:'RD',
    nav:['dashboard','commercial','sample','reports','researcher-ranking','finance']},
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
  'researcher-my-ranking':{ico:'★',label:'Seu Ranking',group:'Meu perfil'},
  'researcher-badge':{ico:'▤',label:'Crachá virtual',group:'Meu perfil'},
  support:{ico:'☎',label:'Suporte',group:'Ajuda'},
  reports:{ico:'◫',label:'Relatórios',group:'Análise'},
  'researcher-ranking':{ico:'★',label:'Ranking de pesquisadores',group:'Análise'},
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
const APP_BUILD_VERSION=document.querySelector('meta[name="pesquisapro-app-version"]')?.content||'20261008155630';
let RESEARCHER_UPDATE_PENDING=false,RESEARCHER_UPDATE_TARGET_VERSION='',RESEARCHER_UPDATE_TIMER=null,RESEARCHER_VERSION_MONITOR=null,RESEARCHER_UPDATE_CHECKING=false;
let RESEARCHER_PROFILE_CITIES=[];
let RESEARCHER_PROFILE_CITIES_DRAFT=[];
let RESEARCHER_PROFILE_CITIES_LOADED=false;
let RESEARCHER_PROFILE_CITIES_LOADING=false;
let RESEARCHER_PROFILE_SAVING=false;
let RESEARCHER_REFERRALS=[];
let RESEARCHER_REFERRALS_LOADED=false;
let RESEARCHER_REFERRALS_LOADING=false;
let RESEARCHER_REFERRALS_SCHEMA_MISSING=false;
let RESEARCHER_BADGE_UPLOADING=false;
let PASSWORD_RECOVERY_MODE=false;
let PUSH_STATUS='unknown',PUSH_STATUS_LOADING=false,PUSH_SCHEMA_MISSING=false,PUSH_SW_REGISTRATION=null;
let RESEARCHER_ALERT_PREFS={email_enabled:false,push_enabled:false},RESEARCHER_ALERT_PREFS_LOADED=false,RESEARCHER_ALERT_PREFS_LOADING=false,RESEARCHER_ALERT_PREFS_SAVING=false,RESEARCHER_ALERT_PREFS_SCHEMA_MISSING=false,RESEARCHER_ALERT_PREFS_ERROR=false;
let MY_COMMUNICATIONS=[],MY_COMMUNICATIONS_LOADED=false,MY_COMMUNICATIONS_LOADING=false;
let MY_SURVEY_RESEARCHER_MESSAGES=[],MY_SURVEY_RESEARCHER_MESSAGES_LOADED=false,MY_SURVEY_RESEARCHER_MESSAGES_LOADING=false,MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING=false;
let MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0,MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR=false;
let CLIENT_APPROVAL_REQUEST_ID=null,CLIENT_APPROVAL_REQUEST=null,CLIENT_APPROVAL_REQUEST_LOADED=false,CLIENT_APPROVAL_LOADING=false,CLIENT_APPROVAL_RESPONDING=false,CLIENT_APPROVAL_SCHEMA_MISSING=false;
let RESEARCHER_LINK_TOKEN=null,RESEARCHER_LINK_CONTEXT=null,RESEARCHER_LINK_LOADING=false,RESEARCHER_LINK_ACCEPTING=false;
let ADMIN_APPROVAL_STATUS_BY_CLIENT={},ADMIN_APPROVAL_STATUS_LOADING={},ADMIN_APPROVAL_STATUS_LOADED={};
let STAFF_NAV_PENDING_COUNTS=null,STAFF_NAV_PENDING_LOADING=false,STAFF_NAV_PENDING_LAST_LOADED=0,STAFF_NAV_PENDING_TIMER=null,STAFF_NAV_PENDING_REFRESH_TIMER=null,STAFF_NAV_PENDING_GENERATION=0;

function researcherUpdateVersionFromHtml(html){
  const match=String(html||'').match(/name=["']pesquisapro-app-version["'][^>]*content=["']([^"']+)["']/i);
  return match?.[1]||'';
}
function researcherUpdateIsStale(latest){
  const current=Number(APP_BUILD_VERSION),remote=Number(latest);
  return Boolean(latest&&Number.isFinite(remote)&&Number.isFinite(current)&&remote>current);
}
function researcherUpdateOverlay(){return document.getElementById('researcherUpdateRequired');}
function researcherUpdateStatus(message){
  const el=document.getElementById('researcherUpdateStatus');if(el)el.textContent=message;
}
function forceResearcherAppReload(){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  if(ACOLLECT_IN_PROGRESS){RESEARCHER_UPDATE_PENDING=true;researcherUpdateStatus('A atualização será feita depois que a entrevista terminar.');return;}
  if(RESEARCHER_UPDATE_TIMER){clearTimeout(RESEARCHER_UPDATE_TIMER);RESEARCHER_UPDATE_TIMER=null;}
  const target=RESEARCHER_UPDATE_TARGET_VERSION||'latest';
  try{sessionStorage.setItem('pesquisapro-update-attempt',target);}catch(ex){}
  researcherUpdateStatus('Recarregando o aplicativo…');
  const url=new URL(window.location.href);url.searchParams.set('pp_reload',String(Date.now()));
  window.setTimeout(()=>window.location.replace(url.toString()),120);
}
function showResearcherUpdateRequired(latest){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  RESEARCHER_UPDATE_PENDING=true;RESEARCHER_UPDATE_TARGET_VERSION=latest||'';
  const overlay=researcherUpdateOverlay();
  if(!overlay)return;
  if(ACOLLECT_IN_PROGRESS){
    overlay.hidden=false;overlay.classList.add('is-pending');document.body.classList.remove('researcher-update-lock');
    researcherUpdateStatus('A atualização será feita depois que a entrevista terminar.');
    return;
  }
  overlay.classList.remove('is-pending');
  overlay.hidden=false;document.body.classList.add('researcher-update-lock');
  let alreadyAttempted=false;try{alreadyAttempted=sessionStorage.getItem('pesquisapro-update-attempt')===RESEARCHER_UPDATE_TARGET_VERSION;}catch(ex){}
  if(alreadyAttempted){researcherUpdateStatus('Se a tela não atualizar, toque em “Atualizar agora” novamente.');return;}
  researcherUpdateStatus('Recarregamento automático em alguns instantes…');
  if(!RESEARCHER_UPDATE_TIMER)RESEARCHER_UPDATE_TIMER=window.setTimeout(forceResearcherAppReload,1800);
}
async function checkResearcherAppVersion(){
  if(CURRENT_PROFILE?.role!=='pesq'||RESEARCHER_UPDATE_CHECKING)return false;
  RESEARCHER_UPDATE_CHECKING=true;
  try{
    const response=await fetch('app.html?pp_version_check='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)return false;
    const latest=researcherUpdateVersionFromHtml(await response.text());
    if(researcherUpdateIsStale(latest)){showResearcherUpdateRequired(latest);return true;}
  }catch(ex){console.warn('Não foi possível verificar a versão do aplicativo:',ex);}
  finally{RESEARCHER_UPDATE_CHECKING=false;}
  return false;
}
function startResearcherVersionMonitor(){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  if(RESEARCHER_VERSION_MONITOR)clearInterval(RESEARCHER_VERSION_MONITOR);
  RESEARCHER_VERSION_MONITOR=window.setInterval(()=>{checkResearcherAppVersion();},60000);
}
function stopResearcherVersionMonitor(){
  if(RESEARCHER_VERSION_MONITOR){clearInterval(RESEARCHER_VERSION_MONITOR);RESEARCHER_VERSION_MONITOR=null;}
  if(RESEARCHER_UPDATE_TIMER){clearTimeout(RESEARCHER_UPDATE_TIMER);RESEARCHER_UPDATE_TIMER=null;}
  RESEARCHER_UPDATE_PENDING=false;RESEARCHER_UPDATE_TARGET_VERSION='';
  const overlay=researcherUpdateOverlay();if(overlay){overlay.hidden=true;overlay.classList.remove('is-pending');}
  document.body.classList.remove('researcher-update-lock');
}
function applyPendingResearcherUpdateIfSafe(){
  if(RESEARCHER_UPDATE_PENDING&&CURRENT_PROFILE?.role==='pesq'&&!ACOLLECT_IN_PROGRESS)forceResearcherAppReload();
}

function pushBrowserSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function pushKeyToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4),base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=window.atob(base64),output=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;++i)output[i]=rawData.charCodeAt(i);return output;
}
async function loadPushStatusIfNeeded(){
  if(PUSH_STATUS!=='unknown'||PUSH_STATUS_LOADING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return;
  if(!pushBrowserSupported()||!window.PP_PUSH_PUBLIC_KEY){
    PUSH_STATUS=pushBrowserSupported()?'unavailable':'unsupported';
    queueMicrotask(()=>{if(CURRENT_PROFILE?.role==='pesq'&&document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');});
    return;
  }
  PUSH_STATUS_LOADING=true;
  try{
    const registration=await navigator.serviceWorker.getRegistration();
    const local=await registration?.pushManager?.getSubscription();
    const {data,error}=await sb.from('push_subscriptions').select('endpoint').eq('user_id',CURRENT_PROFILE.id).limit(100);
    if(error){if(/push_subscriptions|relation .* does not exist|schema cache/i.test(error.message||''))PUSH_SCHEMA_MISSING=true;throw error;}
    PUSH_STATUS=local&&(data||[]).some(row=>row.endpoint===local.endpoint)?'enabled':'disabled';
  }catch(ex){console.error('Não foi possível consultar o push:',ex);if(PUSH_SCHEMA_MISSING)PUSH_STATUS='unavailable';}
  finally{PUSH_STATUS_LOADING=false;if(CURRENT_PROFILE?.role==='pesq'&&document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');}
}
function loadResearcherAlertPreferencesIfNeeded(){
  if(RESEARCHER_ALERT_PREFS_LOADED||RESEARCHER_ALERT_PREFS_LOADING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return Promise.resolve();
  RESEARCHER_ALERT_PREFS_LOADING=true;
  const identity=CURRENT_PROFILE.id;
  return (async()=>{
    try{
      const {data,error}=await sb.from('researcher_alert_preferences').select('email_enabled,push_enabled').eq('researcher_id',identity).maybeSingle();
      if(error){if(/researcher_alert_preferences|schema cache|does not exist/i.test(error.message||''))RESEARCHER_ALERT_PREFS_SCHEMA_MISSING=true;throw error;}
      if(CURRENT_PROFILE?.id!==identity)return;
      RESEARCHER_ALERT_PREFS={email_enabled:data?.email_enabled===true,push_enabled:data?.push_enabled===true};
    }catch(ex){if(CURRENT_PROFILE?.id!==identity)return;RESEARCHER_ALERT_PREFS_ERROR=!RESEARCHER_ALERT_PREFS_SCHEMA_MISSING;console.error('Não foi possível consultar as preferências de alertas:',ex);}
    finally{if(CURRENT_PROFILE?.id===identity){RESEARCHER_ALERT_PREFS_LOADING=false;RESEARCHER_ALERT_PREFS_LOADED=true;if(document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');}}
  })();
}
async function saveResearcherAlertPreferences(){
  if(CURRENT_PROFILE?.role!=='pesq'||RESEARCHER_ALERT_PREFS_SAVING||RESEARCHER_ALERT_PREFS_SCHEMA_MISSING)return;
  const identity=CURRENT_PROFILE.id;
  const emailEnabled=Boolean(document.getElementById('researcher-alert-email')?.checked);
  const pushEnabled=Boolean(document.getElementById('researcher-alert-push')?.checked);
  if(pushEnabled&&!RESEARCHER_ALERT_PREFS.push_enabled&&(PUSH_STATUS!=='enabled'||!window.PP_PUSH_PUBLIC_KEY)){alert('Ative primeiro as notificações neste dispositivo para habilitar o alerta Push.');return;}
  RESEARCHER_ALERT_PREFS_SAVING=true;
  try{
    const {error}=await sb.rpc('save_my_researcher_alert_preferences',{p_email_enabled:emailEnabled,p_push_enabled:pushEnabled});
    if(error)throw error;
    if(CURRENT_PROFILE?.id!==identity)return;
    RESEARCHER_ALERT_PREFS={email_enabled:emailEnabled,push_enabled:pushEnabled};
    alert('Preferências salvas. O envio externo depende da configuração do serviço pela gestão; os avisos continuam disponíveis no aplicativo.');
  }catch(ex){console.error('Falha ao salvar preferências:',ex);alert('Não foi possível salvar as preferências. Nenhum alerta externo novo foi ativado.');}
  finally{RESEARCHER_ALERT_PREFS_SAVING=false;if(CURRENT_PROFILE?.id===identity)go('dashboard-pesq');}
}
async function enableResearcherPush(){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  if(!pushBrowserSupported()){alert('Este navegador não oferece notificações push. Use Chrome, Edge ou Firefox em um endereço HTTPS.');return;}
  if(!window.PP_PUSH_PUBLIC_KEY){alert('As notificações push ainda não foram configuradas pela gestão. O administrador precisa cadastrar a chave pública do push.');return;}
  if(PUSH_SCHEMA_MISSING){alert('O cadastro de notificações ainda não foi ativado no banco. Execute a migration equipe-convites-push-grupos.sql no Supabase.');return;}
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){PUSH_STATUS='blocked';go('dashboard-pesq');return;}
    PUSH_SW_REGISTRATION=await navigator.serviceWorker.register('push-sw.js?v=20261008155630',{scope:'./'});
    const subscription=await PUSH_SW_REGISTRATION.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushKeyToUint8Array(window.PP_PUSH_PUBLIC_KEY)});
    const json=subscription.toJSON();
    const {error}=await sb.from('push_subscriptions').upsert({user_id:CURRENT_PROFILE.id,endpoint:json.endpoint,subscription:json,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
    if(error)throw new Error(error.message);
    PUSH_STATUS='enabled';
    if(RESEARCHER_ALERT_PREFS_SCHEMA_MISSING){alert('Dispositivo inscrito, mas as preferências de alertas ainda não estão disponíveis. Isso não comprova o envio de notificações.');}
    else{
      const {error:preferenceError}=await sb.rpc('save_my_researcher_alert_preferences',{p_email_enabled:RESEARCHER_ALERT_PREFS.email_enabled,p_push_enabled:true});
      if(preferenceError){console.error('Push inscrito, preferência não salva:',preferenceError);alert('Dispositivo inscrito, mas a preferência não foi salva. Tente salvar novamente no cartão abaixo.');}
      else{RESEARCHER_ALERT_PREFS={...RESEARCHER_ALERT_PREFS,push_enabled:true};alert('Dispositivo inscrito para Push. Os alertas externos só serão enviados depois que a gestão configurar o emissor e ativar a função de entrega.');}
    }
  }catch(ex){console.error('Falha ao ativar push:',ex);alert('Não foi possível ativar as notificações. Verifique a permissão do navegador e tente novamente.');}
  go('dashboard-pesq');
}
function pushStatusMarkup(){
  if(PUSH_STATUS==='enabled')return '<span class="pill pill-green">● Push ativado</span>';
  if(PUSH_STATUS==='blocked')return '<span class="pill pill-amber">Notificações bloqueadas no navegador</span>';
  if(PUSH_STATUS==='unavailable')return '<span class="pill pill-gray">Push ainda não configurado</span>';
  if(PUSH_STATUS==='unsupported')return '<span class="pill pill-gray">Push indisponível neste navegador</span>';
  if(PUSH_STATUS_LOADING)return '<span class="pill pill-gray">Verificando…</span>';
  return '<span class="pill pill-amber">Push não ativado</span>';
}
function researcherPushCard(){
  const ready=PUSH_STATUS==='enabled';
  return `<section class="card mb researcher-push-card"><div><div class="card-t">Avisos de convites e orientações <span style="margin-left:5px">${pushStatusMarkup()}</span></div><div class="card-d">O aviso completo fica no aplicativo. Push e e-mail são lembretes opcionais, sujeitos à configuração dos emissores pela gestão; inscrição do navegador não comprova entrega.</div></div>${ready?'<button class="btn btn-out" onclick="go(\'communication\')">Abrir comunicação</button>':`<button type="button" class="btn btn-fill" onclick="enableResearcherPush()" ${PUSH_STATUS==='unavailable'||PUSH_STATUS==='unsupported'?'disabled':''}>Ativar notificações</button>`}${PUSH_STATUS==='unavailable'?'<small>A gestão precisa configurar a chave pública VAPID e o emissor no Supabase.</small>':''}</section>`;
}
function researcherAlertPreferencesCard(){
  if(RESEARCHER_ALERT_PREFS_SCHEMA_MISSING)return '<section class="card mb researcher-alert-prefs"><div class="card-t">Preferências de alertas</div><p>O cadastro de preferências ainda não está ativo. Os convites e orientações continuam disponíveis aqui no aplicativo.</p></section>';
  if(RESEARCHER_ALERT_PREFS_ERROR)return '<section class="card mb researcher-alert-prefs"><div class="card-t">Preferências de alertas</div><p>Não foi possível consultar as preferências agora. Nenhuma alteração foi feita.</p></section>';
  if(!RESEARCHER_ALERT_PREFS_LOADED)return '<section class="card mb researcher-alert-prefs"><div class="card-t">Preferências de alertas</div><p>Carregando…</p></section>';
  return `<section class="card mb researcher-alert-prefs"><div class="card-t">Preferências de alertas</div><p>Receba um lembrete apenas quando um convite ainda não tiver resposta ou uma orientação ainda não tiver confirmação. Os textos completos e a confirmação permanecem no aplicativo.</p><label><input id="researcher-alert-email" type="checkbox" ${RESEARCHER_ALERT_PREFS.email_enabled?'checked':''}> Quero receber lembretes por e-mail no endereço verificado da minha conta.</label><label><input id="researcher-alert-push" type="checkbox" ${RESEARCHER_ALERT_PREFS.push_enabled?'checked':''} ${PUSH_STATUS==='enabled'||RESEARCHER_ALERT_PREFS.push_enabled?'':'disabled'}> Quero receber alertas Push nos dispositivos inscritos.</label><small>${PUSH_STATUS==='enabled'?'Push inscrito neste dispositivo.':'Ative o Push neste dispositivo antes de habilitar sua preferência; se ele já estava ativo em outro aparelho, você pode desligá-lo aqui.'} Você pode desligar os lembretes quando quiser; isso não oculta mensagens internas.</small><button type="button" class="btn btn-out" onclick="saveResearcherAlertPreferences()" ${RESEARCHER_ALERT_PREFS_SAVING?'disabled':''}>${RESEARCHER_ALERT_PREFS_SAVING?'Salvando…':'Salvar preferências'}</button></section>`;
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
function loadMySurveyResearcherMessagesIfNeeded(){
  if(MY_SURVEY_RESEARCHER_MESSAGES_LOADING||!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq'||MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING)return Promise.resolve();
  if(MY_SURVEY_RESEARCHER_MESSAGES_LOADED&&Date.now()-MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED<60000)return Promise.resolve();
  MY_SURVEY_RESEARCHER_MESSAGES_LOADING=true;
  return (async()=>{
    try{
      MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR=false;
      const selectMessages=fields=>sb.from('survey_researcher_message_recipients').select(fields).eq('researcher_id',CURRENT_PROFILE.id).order('created_at',{ascending:false}).limit(100);
      let {data,error}=await selectMessages('message_id,read_at,acknowledged_at,created_at,message:survey_researcher_messages(id,survey_id,sender_name,body,created_at)');
      if(error&&/acknowledged_at/i.test(error.message||''))({data,error}=await selectMessages('message_id,read_at,created_at,message:survey_researcher_messages(id,survey_id,sender_name,body,created_at)'));
      if(error){if(/survey_researcher_message|relation .* does not exist|schema cache/i.test(error.message||''))MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING=true;throw error;}
      MY_SURVEY_RESEARCHER_MESSAGES=(data||[]).filter(row=>row.message).sort((a,b)=>new Date(b.message.created_at||b.created_at)-new Date(a.message.created_at||a.created_at));
      MY_SURVEY_RESEARCHER_MESSAGES_LOADED=true;
      MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=Date.now();
    }catch(ex){console.error('Não foi possível carregar os avisos das pesquisas:',ex);MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR=!MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING;MY_SURVEY_RESEARCHER_MESSAGES_LOADED=true;MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=Date.now();}
    finally{MY_SURVEY_RESEARCHER_MESSAGES_LOADING=false;if(document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')go('dashboard-pesq');}
  })();
}
function refreshMySurveyResearcherMessages(){
  if(MY_SURVEY_RESEARCHER_MESSAGES_LOADING)return;
  MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0;
  loadMySurveyResearcherMessagesIfNeeded();
}
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&CURRENT_PROFILE?.role==='pesq'&&document.querySelector('.nav-item.on')?.dataset.key==='dashboard-pesq')loadMySurveyResearcherMessagesIfNeeded();
});
function mySurveyResearcherMessagesMarkup(){
  if(MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING)return '<section class="card mb researcher-survey-messages-card"><div class="card-t">Avisos das pesquisas</div><div class="callout warn">Os avisos internos ainda não estão ativados. A gestão precisa executar a migration <code>deploy/mensagens-pesquisa-pesquisadores.sql</code> no Supabase.</div></section>';
  if(MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR)return '<section class="card mb researcher-survey-messages-card"><div class="card-t">Avisos das pesquisas</div><div class="callout warn">Não foi possível consultar os avisos agora. Os dados exibidos podem estar desatualizados. <button type="button" class="btn btn-out" onclick="refreshMySurveyResearcherMessages()">Tentar novamente</button></div></section>';
  if(!MY_SURVEY_RESEARCHER_MESSAGES_LOADED)return '<section class="card mb researcher-survey-messages-card"><div class="card-t">Avisos das pesquisas</div><div class="empty" style="padding:14px 0">Carregando avisos da gestão…</div></section>';
  const rows=MY_SURVEY_RESEARCHER_MESSAGES.map(row=>{
    const message=row.message||{},survey=SURVEYS.find(item=>item.id===message.survey_id),unread=!row.read_at;
    return `<article class="researcher-survey-message ${unread?'is-unread':''}"><div class="researcher-survey-message-head"><div><span class="eyebrow">${unread?'NOVO AVISO':'AVISO DA PESQUISA'}</span><strong>${esc(survey?.name||'Pesquisa')}</strong></div><time>${esc(new Date(message.created_at||row.created_at).toLocaleString('pt-BR'))}</time></div><p>${esc(message.body||'').replace(/\n/g,'<br>')}</p><div class="researcher-survey-message-foot"><span>Enviado por ${esc(message.sender_name||'Equipe PesquisaPro')}</span>${row.acknowledged_at?'<span class="pill pill-green">Leitura confirmada</span>':unread?`<button type="button" class="btn-ghost" onclick="markMySurveyResearcherMessageRead(${jsArg(message.id)})">Marcar como lido</button>`:'<span class="pill pill-gray">Lido · confirme antes de coletar</span>'}</div></article>`;
  }).join('');
  return `<section class="card mb researcher-survey-messages-card"><div class="researcher-survey-messages-heading"><div><div class="card-t">Avisos das pesquisas</div><div class="card-d">Mensagens internas da gestão. Marcar como lido aqui não substitui confirmar a leitura antes de iniciar a próxima coleta da pesquisa.</div></div><button type="button" class="btn btn-out" onclick="refreshMySurveyResearcherMessages()" ${MY_SURVEY_RESEARCHER_MESSAGES_LOADING?'disabled':''}>Atualizar avisos</button><span class="pill ${MY_SURVEY_RESEARCHER_MESSAGES.some(row=>!row.read_at)?'pill-amber':'pill-green'}">${MY_SURVEY_RESEARCHER_MESSAGES.filter(row=>!row.read_at).length} não lido${MY_SURVEY_RESEARCHER_MESSAGES.filter(row=>!row.read_at).length===1?'':'s'}</span></div>${rows||'<div class="researcher-survey-messages-empty"><span>✉</span><div><b>Nenhum aviso novo</b><small>Quando a gestão enviar uma mensagem para sua equipe, ela aparecerá aqui.</small></div></div>'}</section>`;
}
async function markMySurveyResearcherMessageRead(messageId){
  if(!messageId)return;
  try{
    const {error}=await sb.rpc('mark_survey_researcher_message_read',{p_message_id:messageId});
    if(error)throw error;
    const row=MY_SURVEY_RESEARCHER_MESSAGES.find(item=>item.message_id===messageId);
    if(row)row.read_at=new Date().toISOString();
    go('dashboard-pesq');
  }catch(ex){alert('Não foi possível marcar este aviso como lido. '+(ex.message||''));}
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
  admin:['dashboard','commercial','recruitment','new-survey','surveys','surveys-done','sample','collect','reports','researcher-ranking','users','permissions','finance','contracts','contract-template','company','communication'],
  coord:['dashboard','commercial','surveys','surveys-done','collect','reports','researcher-ranking','finance','communication'],
  gerente:['dashboard','commercial','sample','reports','researcher-ranking','finance','communication'],
  pesq:['dashboard-pesq','researcher-guide','app-collect','researcher-profile','researcher-my-ranking','researcher-badge','my-earnings','my-contract','support','communication'],
  cliente:['client-surveys','form-approval','client-progress','client-results','communication'],
  admpro:['dashboard','commercial','recruitment','new-survey','surveys','surveys-done','sample','collect','reports','researcher-ranking','users','permissions','finance','contracts','contract-template','company','communication'],
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
  stopResearcherVersionMonitor();
  stopStaffNavPendingMonitor();
  chatStopRealtime();CHAT_CHANNELS=[];CHAT_CHANNELS_LOADED=false;CHAT_CHANNELS_LOADING=false;CHAT_SCHEMA_MISSING=false;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_MESSAGES_LOADING=false;CHAT_SUPPORT_CHANNEL_ID=null;CHAT_SUPPORT_READY=false;CHAT_SUPPORT_LOADING=false;
  PUSH_STATUS='unknown';PUSH_STATUS_LOADING=false;PUSH_SCHEMA_MISSING=false;PUSH_SW_REGISTRATION=null;RESEARCHER_ALERT_PREFS={email_enabled:false,push_enabled:false};RESEARCHER_ALERT_PREFS_LOADED=false;RESEARCHER_ALERT_PREFS_LOADING=false;RESEARCHER_ALERT_PREFS_SAVING=false;RESEARCHER_ALERT_PREFS_SCHEMA_MISSING=false;RESEARCHER_ALERT_PREFS_ERROR=false;MY_COMMUNICATIONS=[];MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS_LOADING=false;MY_SURVEY_RESEARCHER_MESSAGES=[];MY_SURVEY_RESEARCHER_MESSAGES_LOADED=false;MY_SURVEY_RESEARCHER_MESSAGES_LOADING=false;MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING=false;MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0;MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR=false;
  ACTIVE_CAMPAIGN_ID=null;CLIENT_SURVEY_VIEW_ID=null;
  PAYMENTS=[];PAYMENTS_LOADED=false;PAYMENTS_LOADING=false;PAYMENT_RECEIPTS=[];PAYMENT_RECEIPTS_LOADED=false;PAYMENT_RECEIPTS_LOADING=false;PAYMENT_RECEIPTS_SCHEMA_MISSING=false;PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING=false;
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
  if(profile.role==='pesq'&&profile.status==='encerrado'){
    const errEl=document.getElementById('li-error');
    if(errEl){errEl.textContent='Este acesso foi encerrado a pedido do pesquisador. Entre em contato com a gestão caso precise solicitar uma reativação.';errEl.style.display='block';}
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
  startStaffNavPendingMonitor();
  if(profile.role==='pesq'){
    startResearcherVersionMonitor();
    checkResearcherAppVersion();
  }
  if(typeof openSurveyInviteFromUrl==='function')openSurveyInviteFromUrl();
  if(typeof openClientApprovalFromUrl==='function')openClientApprovalFromUrl();
  if(typeof openResearcherLinkFromUrl==='function')openResearcherLinkFromUrl();
}

async function logout(){
  stopResearcherVersionMonitor();
  stopStaffNavPendingMonitor();
  if(typeof acollectCloseNoticeGate==='function')acollectCloseNoticeGate(true);
  await sb.auth.signOut();
  chatStopRealtime();
  CHAT_CHANNELS=[];CHAT_CHANNELS_LOADED=false;CHAT_CHANNELS_LOADING=false;CHAT_SCHEMA_MISSING=false;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_MESSAGES_LOADING=false;CHAT_SUPPORT_CHANNEL_ID=null;CHAT_SUPPORT_READY=false;CHAT_SUPPORT_LOADING=false;CHAT_PENDING_SURVEY_ID=null;
  RESEARCHER_PROFILE_CITIES=[];RESEARCHER_PROFILE_CITIES_DRAFT=[];RESEARCHER_PROFILE_CITIES_LOADED=false;MY_INVITES=[];MY_INVITES_LOADED=false;MY_INVITES_LOADING=false;MY_INVITE_LOAD_PROMISE=null;MY_INVITE_RESPONDING=null;PUSH_STATUS='unknown';PUSH_STATUS_LOADING=false;PUSH_SCHEMA_MISSING=false;PUSH_SW_REGISTRATION=null;RESEARCHER_ALERT_PREFS={email_enabled:false,push_enabled:false};RESEARCHER_ALERT_PREFS_LOADED=false;RESEARCHER_ALERT_PREFS_LOADING=false;RESEARCHER_ALERT_PREFS_SAVING=false;RESEARCHER_ALERT_PREFS_SCHEMA_MISSING=false;RESEARCHER_ALERT_PREFS_ERROR=false;MY_COMMUNICATIONS=[];MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS_LOADING=false;MY_SURVEY_RESEARCHER_MESSAGES=[];MY_SURVEY_RESEARCHER_MESSAGES_LOADED=false;MY_SURVEY_RESEARCHER_MESSAGES_LOADING=false;MY_SURVEY_RESEARCHER_MESSAGES_SCHEMA_MISSING=false;MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0;MY_SURVEY_RESEARCHER_MESSAGES_LOAD_ERROR=false;CLIENT_APPROVAL_REQUEST_ID=null;CLIENT_APPROVAL_REQUEST=null;CLIENT_APPROVAL_LOADING=false;CLIENT_APPROVAL_RESPONDING=false;CLIENT_APPROVAL_SCHEMA_MISSING=false;RESEARCHER_LINK_TOKEN=null;RESEARCHER_LINK_CONTEXT=null;RESEARCHER_LINK_LOADING=false;RESEARCHER_LINK_ACCEPTING=false;
  PAYMENTS=[];PAYMENTS_LOADED=false;PAYMENTS_LOADING=false;PAYMENT_RECEIPTS=[];PAYMENT_RECEIPTS_LOADED=false;PAYMENT_RECEIPTS_LOADING=false;PAYMENT_RECEIPTS_SCHEMA_MISSING=false;PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING=false;
  COLLECT_INAPP_ORIENTATION_COUNTS={};COLLECT_INAPP_ORIENTATION_STATUS='idle';COLLECT_INAPP_ORIENTATION_LOADING=false;COLLECT_BATCH_ORIENTATION_SENDING=false;COLLECT_IDX=null;closeSurveyResearcherMessageModal();
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

const STAFF_NAV_BADGE_LABELS={contracts:'contratos aguardando assinatura',communication:'conversas aguardando resposta',users:'usuários aguardando análise'};
function staffNavPendingEnabled(){return ['admin','admpro','coord','gerente'].includes(CURRENT_PROFILE?.role);}
function renderStaffNavPendingCounts(){
  Object.entries(STAFF_NAV_BADGE_LABELS).forEach(([key,description])=>{
    const button=document.querySelector(`.nav-item[data-key="${key}"]`);
    if(!button)return;
    const badge=button.querySelector('.nav-pending-badge');if(!badge)return;
    const count=Math.max(0,Number(STAFF_NAV_PENDING_COUNTS?.[key])||0);
    badge.hidden=!count;
    badge.textContent=count>99?'99+':String(count);
    const label=NAV_META[key].label;
    button.setAttribute('aria-label',count?`${label}: ${count} ${description}`:label);
    button.title=count?`${count} ${description}`:label;
  });
}
async function refreshStaffNavPendingCounts(force=false){
  if(!staffNavPendingEnabled()||STAFF_NAV_PENDING_LOADING)return;
  if(!force&&Date.now()-STAFF_NAV_PENDING_LAST_LOADED<30000)return;
  STAFF_NAV_PENDING_LOADING=true;
  const generation=STAFF_NAV_PENDING_GENERATION,userId=CURRENT_PROFILE.id;
  try{
    const {data,error}=await sb.rpc('staff_navigation_pending_counts');
    if(error)throw error;
    if(generation!==STAFF_NAV_PENDING_GENERATION||CURRENT_PROFILE?.id!==userId)return;
    STAFF_NAV_PENDING_COUNTS=data||null;
    renderStaffNavPendingCounts();
  }catch(ex){
    if(generation===STAFF_NAV_PENDING_GENERATION&&CURRENT_PROFILE?.id===userId){
      STAFF_NAV_PENDING_COUNTS=null;renderStaffNavPendingCounts();
      console.warn('Contadores de pendências indisponíveis; execute a migration contadores-pendencias-menu.sql quando autorizado:',ex);
    }
  }finally{
    if(generation===STAFF_NAV_PENDING_GENERATION){STAFF_NAV_PENDING_LOADING=false;STAFF_NAV_PENDING_LAST_LOADED=Date.now();}
  }
}
function stopStaffNavPendingMonitor(){
  if(STAFF_NAV_PENDING_TIMER)clearInterval(STAFF_NAV_PENDING_TIMER);
  if(STAFF_NAV_PENDING_REFRESH_TIMER)clearTimeout(STAFF_NAV_PENDING_REFRESH_TIMER);
  STAFF_NAV_PENDING_REFRESH_TIMER=null;
  STAFF_NAV_PENDING_TIMER=null;STAFF_NAV_PENDING_GENERATION++;
  STAFF_NAV_PENDING_COUNTS=null;STAFF_NAV_PENDING_LOADING=false;STAFF_NAV_PENDING_LAST_LOADED=0;
}
function invalidateStaffNavPendingCounts(){
  if(!staffNavPendingEnabled()||STAFF_NAV_PENDING_REFRESH_TIMER)return;
  STAFF_NAV_PENDING_REFRESH_TIMER=setTimeout(()=>{
    STAFF_NAV_PENDING_REFRESH_TIMER=null;
    if(!staffNavPendingEnabled())return;
    STAFF_NAV_PENDING_GENERATION++;STAFF_NAV_PENDING_LOADING=false;STAFF_NAV_PENDING_LAST_LOADED=0;
    refreshStaffNavPendingCounts(true);
  },350);
}
function startStaffNavPendingMonitor(){
  if(!staffNavPendingEnabled())return;
  refreshStaffNavPendingCounts(true);
  STAFF_NAV_PENDING_TIMER=setInterval(()=>{
    if(document.visibilityState!=='hidden')refreshStaffNavPendingCounts(true);
  },45000);
}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&staffNavPendingEnabled())refreshStaffNavPendingCounts();
});

function buildSidebar(){
  const allow=ROLE_NAV[selectedRole]||(ROLES[selectedRole]&&ROLES[selectedRole].nav)||[];
  const groups={};
  Object.keys(NAV_META).forEach(k=>{
    const m=NAV_META[k];
    if(!groups[m.group])groups[m.group]=[];
    groups[m.group].push({key:k,...m,allowed:allow.includes(k)});
  });
  let html=`<div class="sidebar-tools"><label for="navSectionSearch">Encontrar uma página</label><input id="navSectionSearch" type="search" autocomplete="off" placeholder="Buscar no menu…" oninput="filterSidebarNavigation(this.value)" aria-label="Buscar página no menu"></div>`;
  if(['admin','admpro','coord','gerente','pesq'].includes(CURRENT_PROFILE?.role))html+='<button type="button" id="sidebarCampaignBtn" class="sidebar-campaign-btn" onclick="closeSidebar();openCampaignSwitcher()">Trocar pesquisa ▾</button>';
  Object.keys(groups).forEach(g=>{
    const items=groups[g].filter(i=>i.allowed||['Pesquisa','Análise','Administração','Pagamentos','Campo','Visão geral'].includes(g));
    const visible=groups[g].filter(i=>i.allowed);
    if(visible.length===0)return;
    html+=`<div class="nav-group" data-nav-group><div class="ng-label">${g}</div>`;
    visible.forEach(i=>{
      html+=`<button class="nav-item" data-key="${i.key}" onclick="go('${i.key}')"><span class="ico ico-3d">${icon3d(i.ico,'#c9dcff')}</span><span class="nav-label">${i.label}</span>${staffNavPendingEnabled()&&STAFF_NAV_BADGE_LABELS[i.key]?'<span class="nav-pending-badge" hidden aria-hidden="true"></span>':''}</button>`;
    });
    html+='</div>';
  });
  // link para sair fica sempre dentro do menu (gaveta) — no celular os
  // botões do topo (inclusive o "Sair" ao lado do avatar) somem por falta de
  // espaço, então sem isso não havia como sair do sistema pelo celular.
  html+=`<div class="nav-group nav-group-exit"><button class="nav-item nav-logout" onclick="logout()"><span class="ico ico-3d">${icon3d('⏻','#c9dcff')}</span>Sair do sistema</button></div>`;
  html+='<p class="sidebar-search-empty" id="sidebarSearchEmpty" hidden>Nenhuma página encontrada.</p>';
  document.getElementById('sidebar').innerHTML=html;
  updateCampaignSwitcherButton();
  renderStaffNavPendingCounts();
}
function filterSidebarNavigation(query){
  const sidebar=document.getElementById('sidebar');if(!sidebar)return;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const term=normalize(query).trim();let found=0;
  sidebar.querySelectorAll('[data-nav-group]').forEach(group=>{
    let groupFound=0;
    group.querySelectorAll('.nav-item').forEach(item=>{
      const match=!term||normalize(item.querySelector('.nav-label')?.textContent||item.textContent).includes(term);
      item.hidden=!match;if(match)groupFound++;
    });
    group.hidden=groupFound===0;found+=groupFound;
  });
  const empty=document.getElementById('sidebarSearchEmpty');if(empty)empty.hidden=found>0;
}

function openResearcherSupport(){
  const phone='5531996683030';
  const name=(CURRENT_PROFILE?.name||'').trim();
  const text='Olá! Sou pesquisador(a) da PesquisaPro'+(name?' ('+name+')':'')+' e preciso de suporte para usar o aplicativo de coleta.';
  const url='https://wa.me/'+phone+'?text='+encodeURIComponent(text);
  window.open(url,'_blank','noopener,noreferrer');
}

function go(key){
  if(staffNavPendingEnabled())refreshStaffNavPendingCounts();
  const previousKey=document.querySelector('.nav-item.on')?.dataset.key;
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
  if(previousKey!==key){
    const main=document.getElementById('main');main.scrollTop=0;
    const search=document.getElementById('navSectionSearch');if(search?.value){search.value='';filterSidebarNavigation('');}
    main.focus({preventScroll:true});
  }
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
  document.getElementById('menuToggle')?.setAttribute('aria-expanded',String(open));
  document.getElementById('menuToggle')?.setAttribute('aria-label',open?'Fechar menu de navegação':'Abrir menu de navegação');
  if(open)sb.querySelector('#navSectionSearch')?.focus({preventScroll:true});
}
function closeSidebar(){
  const sb=document.getElementById('sidebar'),bd=document.getElementById('sidebarBackdrop');
  if(sb)sb.classList.remove('open');
  if(bd)bd.classList.remove('show');
  document.getElementById('menuToggle')?.setAttribute('aria-expanded','false');
  document.getElementById('menuToggle')?.setAttribute('aria-label','Abrir menu de navegação');
}
document.addEventListener('keydown',event=>{
  const sidebar=document.getElementById('sidebar');
  if(event.key==='Escape'&&sidebar?.classList.contains('open')){
    closeSidebar();document.getElementById('menuToggle')?.focus();return;
  }
  if(event.key!=='/'||event.ctrlKey||event.metaKey||event.altKey||!CURRENT_PROFILE)return;
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
  event.preventDefault();
  if(window.matchMedia('(max-width:860px)').matches&&!sidebar?.classList.contains('open'))toggleSidebar();
  document.getElementById('navSectionSearch')?.focus();
});
/* PAGES object is populated in the next script block */
const PAGES={};

/* ============ COMUNICAÇÃO / CHAT SEGMENTADO ============ */
let CHAT_CHANNELS=[],CHAT_CHANNELS_LOADED=false,CHAT_CHANNELS_LOADING=false,CHAT_SCHEMA_MISSING=false;
let CHAT_ACTIVE_CHANNEL_ID=null,CHAT_MESSAGES=[],CHAT_MESSAGES_LOADED=false,CHAT_MESSAGES_LOADING=false;
let CHAT_REALTIME_CHANNEL=null,CHAT_SENDING=false,CHAT_NEW_AUDIENCE_TYPE='all',CHAT_NEW_SURVEY_ID=null,CHAT_PENDING_SURVEY_ID=null;
let CHAT_SUPPORT_CHANNEL_ID=null,CHAT_SUPPORT_READY=false,CHAT_SUPPORT_LOADING=false;
let CHAT_CHANNEL_STATUS_LOADED=false,CHAT_CHANNEL_STATUS_LOADING=false,CHAT_CHANNEL_STATUS_ERROR=false,CHAT_CHANNEL_LAST_MESSAGES={};
let CHAT_RESPONSE_FILTER='needs_response';
const CHAT_STAFF_ROLES=['admin','coord','gerente','admpro'];
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
function chatIsStaffProfile(){return CHAT_STAFF_ROLES.includes(CURRENT_PROFILE?.role);}
function chatRememberLatestMessage(message){
  if(!message?.channel_id)return;
  const current=CHAT_CHANNEL_LAST_MESSAGES[message.channel_id];
  if(!current||new Date(message.created_at)>=new Date(current.created_at))CHAT_CHANNEL_LAST_MESSAGES[message.channel_id]=message;
}
function chatChannelResponseStatus(channel){
  if(!channel)return 'empty';
  if(channel.is_archived)return 'archived';
  if(CHAT_CHANNEL_STATUS_ERROR)return 'unknown';
  const latest=CHAT_CHANNEL_LAST_MESSAGES[channel.id];
  if(!latest)return 'empty';
  return CHAT_STAFF_ROLES.includes(latest.sender_role)||latest.sender_id===CURRENT_PROFILE?.id?'awaiting_return':'needs_response';
}
function chatChannelResponseLabel(status){
  return ({needs_response:'Aguardando sua resposta',awaiting_return:'Aguardando retorno',empty:'Sem mensagens',archived:'Arquivado',unknown:'Classificação indisponível'})[status]||'Status da conversa';
}
function chatVisibleChannels(){
  if(!chatIsStaffProfile()||CHAT_RESPONSE_FILTER==='all'||CHAT_CHANNEL_STATUS_ERROR)return CHAT_CHANNELS;
  return CHAT_CHANNELS.filter(channel=>chatChannelResponseStatus(channel)===CHAT_RESPONSE_FILTER);
}
function chatResponseCounts(){
  return CHAT_CHANNELS.reduce((counts,channel)=>{const status=chatChannelResponseStatus(channel);if(status==='needs_response')counts.needs_response++;if(status==='awaiting_return')counts.awaiting_return++;return counts;},{needs_response:0,awaiting_return:0});
}
function chatResponseTriageMarkup(){
  if(!chatIsStaffProfile())return '';
  if(CHAT_CHANNEL_STATUS_ERROR)return '<div class="chat-response-warning" role="status"><b>Não foi possível classificar as conversas agora.</b><span>A lista completa continua disponível. Tente entrar novamente na aba Comunicação para atualizar a triagem.</span></div>';
  const counts=chatResponseCounts();
  const allCount=CHAT_CHANNELS.length;
  const button=(filter,label,count,description)=>`<button type="button" class="chat-response-tab ${CHAT_RESPONSE_FILTER===filter?'is-active':''}" aria-pressed="${CHAT_RESPONSE_FILTER===filter}" onclick="chatSetResponseFilter('${filter}')"><span class="chat-response-tab-copy"><b>${label}</b><small>${description}</small></span><strong>${count}</strong></button>`;
  return `<section class="chat-response-triage" aria-labelledby="chat-response-triage-title"><div class="chat-response-triage-head"><div><span class="eyebrow">Fila de atendimento</span><h2 id="chat-response-triage-title">O que precisa da gestão?</h2><p>As conversas são classificadas pela última mensagem registrada. Mensagem recebida fica aguardando sua resposta; mensagem enviada pela gestão fica aguardando retorno.</p></div><span class="chat-response-total">${allCount}<small>canais</small></span></div><div class="chat-response-tabs">${button('needs_response','Aguardando sua resposta',counts.needs_response,'Última mensagem veio de pesquisador ou cliente')}${button('awaiting_return','Aguardando retorno',counts.awaiting_return,'A gestão respondeu e aguarda a outra pessoa')}${button('all','Todas',allCount,'Inclui canais sem mensagens e arquivados')}</div></section>`;
}
function chatSetResponseFilter(filter){
  if(!chatIsStaffProfile()||!['needs_response','awaiting_return','all'].includes(filter))return;
  CHAT_RESPONSE_FILTER=filter;
  const visible=chatVisibleChannels(),current=CHAT_ACTIVE_CHANNEL_ID;
  if(!visible.some(channel=>channel.id===current)){
    CHAT_ACTIVE_CHANNEL_ID=visible[0]?.id||null;
    CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=!CHAT_ACTIVE_CHANNEL_ID;
  }
  go('communication');
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
  const channels=chatVisibleChannels();
  if(!channels.length){
    const message=chatIsStaffProfile()&&CHAT_RESPONSE_FILTER==='needs_response'?'Nenhuma conversa aguardando resposta.':chatIsStaffProfile()&&CHAT_RESPONSE_FILTER==='awaiting_return'?'Nenhuma conversa aguardando retorno.':'Nenhum canal disponível para seu perfil.';
    return `<div class="chat-empty-small">${message}</div>`;
  }
  return channels.map(channel=>{const status=chatIsStaffProfile()?chatChannelResponseStatus(channel):null;return `<button type="button" class="chat-channel-item ${CHAT_ACTIVE_CHANNEL_ID===channel.id?'is-active':''}" onclick="chatOpenChannel('${channel.id}')"><span class="chat-channel-icon">${channel.audience_type==='survey'?'⌁':channel.audience_type==='support'?'◉':'✉'}</span><span class="chat-channel-copy"><b>${esc(channel.name)}</b>${status?`<span class="chat-channel-status chat-channel-status-${status.replace(/_/g,'-')}" data-response-status="${status}">${chatChannelResponseLabel(status)}</span>`:''}<small>${esc(chatChannelDescription(channel))}</small>${channel.last_message_at?`<time>${esc(new Date(channel.last_message_at).toLocaleString('pt-BR'))}</time>`:''}</span></button>`;}).join('');
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
    CHAT_SUPPORT_CHANNEL_ID=data?.id||null;CHAT_SUPPORT_READY=true;CHAT_CHANNELS_LOADED=false;CHAT_CHANNEL_STATUS_LOADED=false;CHAT_CHANNEL_STATUS_ERROR=false;CHAT_CHANNEL_LAST_MESSAGES={};CHAT_ACTIVE_CHANNEL_ID=CHAT_SUPPORT_CHANNEL_ID;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;
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
    CHAT_CHANNEL_STATUS_LOADED=false;CHAT_CHANNEL_STATUS_ERROR=false;CHAT_CHANNEL_LAST_MESSAGES={};
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
async function loadChatChannelStatusesIfNeeded(){
  if(!chatIsStaffProfile()||CHAT_CHANNEL_STATUS_LOADED||CHAT_CHANNEL_STATUS_LOADING)return;
  CHAT_CHANNEL_STATUS_LOADING=true;CHAT_CHANNEL_STATUS_ERROR=false;
  try{
    const ids=CHAT_CHANNELS.filter(channel=>!channel.is_archived).map(channel=>channel.id);
    CHAT_CHANNEL_LAST_MESSAGES={};
    if(ids.length){
      const {data,error}=await sb.from('chat_messages').select('id,channel_id,sender_id,sender_role,created_at').in('channel_id',ids).order('created_at',{ascending:false});
      if(error){if(/chat_messages|relation .* does not exist|schema cache/i.test(error.message||''))CHAT_SCHEMA_MISSING=true;throw error;}
      (data||[]).forEach(chatRememberLatestMessage);
    }
    CHAT_CHANNEL_STATUS_LOADED=true;
  }catch(ex){console.error('Erro ao classificar canais de chat:',ex);CHAT_CHANNEL_STATUS_ERROR=true;CHAT_CHANNEL_STATUS_LOADED=true;}
  CHAT_CHANNEL_STATUS_LOADING=false;
  if(chatIsStaffProfile()&&!CHAT_CHANNEL_STATUS_ERROR){
    const visible=chatVisibleChannels();
    if(!visible.some(channel=>channel.id===CHAT_ACTIVE_CHANNEL_ID)){
      CHAT_ACTIVE_CHANNEL_ID=visible[0]?.id||null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=!CHAT_ACTIVE_CHANNEL_ID;
    }
  }
  const key=document.querySelector('.nav-item.on')?.dataset.key;
  if(key==='communication')go('communication');
}
async function loadChatMessagesIfNeeded(){
  if(!CHAT_ACTIVE_CHANNEL_ID||CHAT_MESSAGES_LOADED||CHAT_MESSAGES_LOADING)return;
  CHAT_MESSAGES_LOADING=true;
  try{
    const {data,error}=await sb.from('chat_messages').select('*').eq('channel_id',CHAT_ACTIVE_CHANNEL_ID).order('created_at',{ascending:true}).limit(500);
    if(error){if(/chat_messages|relation .* does not exist|schema cache/i.test(error.message||''))CHAT_SCHEMA_MISSING=true;throw error;}
    CHAT_MESSAGES=data||[];CHAT_MESSAGES.forEach(chatRememberLatestMessage);CHAT_CHANNEL_STATUS_LOADED=chatIsStaffProfile()?true:CHAT_CHANNEL_STATUS_LOADED;CHAT_MESSAGES_LOADED=true;
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
      chatRememberLatestMessage(message);
      if(message.channel_id===CHAT_ACTIVE_CHANNEL_ID)chatAppendMessage(message);
      else chatRefreshChannelList();
      if(chatIsStaffProfile()&&CHAT_CHANNEL_STATUS_LOADED&&CHAT_RESPONSE_FILTER!=='all'&&CHAT_ACTIVE_CHANNEL_ID===message.channel_id&&chatChannelResponseStatus(channel)!==CHAT_RESPONSE_FILTER){
        CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=true;go('communication');
      }else if(chatIsStaffProfile())chatRefreshChannelList();
      if(channel?.audience_type==='support')invalidateStaffNavPendingCounts();
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
    CHAT_CHANNELS_LOADED=false;CHAT_CHANNEL_STATUS_LOADED=false;CHAT_CHANNEL_STATUS_ERROR=false;CHAT_ACTIVE_CHANNEL_ID=data?.id||null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_NEW_AUDIENCE_TYPE='all';CHAT_NEW_SURVEY_ID=null;await loadChatChannelsIfNeeded();
  }catch(ex){alert('Não foi possível criar o canal. Execute a migration deploy/chat-comunicacao-segmentada.sql no Supabase e tente novamente.');console.error(ex);}
}
function chatOpenChannel(channelId){
  if(!CHAT_CHANNELS.some(channel=>channel.id===channelId))return;
  CHAT_ACTIVE_CHANNEL_ID=channelId;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;go('communication');
}
async function openResearcherSurveyChat(surveyId){
  CHAT_PENDING_SURVEY_ID=surveyId;CHAT_ACTIVE_CHANNEL_ID=null;CHAT_MESSAGES=[];CHAT_MESSAGES_LOADED=false;CHAT_CHANNELS_LOADED=false;CHAT_CHANNEL_STATUS_LOADED=false;CHAT_CHANNEL_STATUS_ERROR=false;
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
    chatAppendMessage(data);chatRememberLatestMessage(data);const channel=CHAT_CHANNELS.find(item=>item.id===CHAT_ACTIVE_CHANNEL_ID);if(channel)channel.last_message_at=data.created_at;
    if(chatIsStaffProfile()&&CHAT_RESPONSE_FILTER==='needs_response'){CHAT_RESPONSE_FILTER='awaiting_return';}
    if(chatIsStaffProfile())chatRefreshChannelList();
    if(channel?.audience_type==='support')invalidateStaffNavPendingCounts();
    if(input){input.value='';input.disabled=false;input.focus();}
  }catch(ex){alert('Não foi possível enviar a mensagem: '+ex.message);if(input)input.disabled=false;}
  CHAT_SENDING=false;
  if(chatIsStaffProfile()&&document.querySelector('.nav-item.on')?.dataset.key==='communication')go('communication');
}
function chatHandleKeydown(event){if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chatSendMessage();}}
PAGES.communication=()=>{
  if(!CURRENT_PROFILE)return head('Comunicação','Entre no sistema para acessar o chat')+'<div class="empty">Faça login para acessar suas conversas.</div>';
  if(CHAT_SCHEMA_MISSING){const privateChat=['cliente','pesq'].includes(CURRENT_PROFILE.role);return head('Comunicação',privateChat?'Atendimento direto com a equipe PesquisaPro':'Canais de avisos, suporte e acompanhamento de pesquisas')+`<div class="callout warn chat-migration-callout"><b>Chat ainda não ativado.</b><br>O administrador precisa executar ${privateChat?'<code>deploy/chat-comunicacao-segmentada.sql</code> e <code>deploy/chat-atendimento-privado.sql</code>':'<code>deploy/chat-comunicacao-segmentada.sql</code>'} no SQL Editor do Supabase. As migrations são aditivas e não apagam dados existentes.</div>`;}
  if(['cliente','pesq'].includes(CURRENT_PROFILE.role)&&!CHAT_SUPPORT_READY){ensurePrivateSupportChatIfNeeded();return head('Comunicação','Atendimento direto com a equipe PesquisaPro')+'<div class="empty">Preparando seu chat privado de atendimento…</div>';}
  if(!CHAT_CHANNELS_LOADED){loadChatChannelsIfNeeded();return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando canais de comunicação…</div>';}
  if(chatIsStaffProfile()&&!CHAT_CHANNEL_STATUS_LOADED){loadChatChannelStatusesIfNeeded();return head('Comunicação','Triagem de conversas da gestão')+'<div class="empty">Classificando conversas por última resposta…</div>';}
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(chatIsStaffProfile()&&!SURVEYS_LOADED)return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando pesquisas para criar canais…</div>';
  if(CHAT_ACTIVE_CHANNEL_ID&&!CHAT_MESSAGES_LOADED){loadChatMessagesIfNeeded();return head('Comunicação','Canais de avisos, suporte e acompanhamento de pesquisas')+'<div class="empty">Carregando mensagens…</div>';}
  const active=CHAT_CHANNELS.find(channel=>channel.id===CHAT_ACTIVE_CHANNEL_ID)||null;
  if(active)chatStartRealtime();
  const isPrivateSupport=['cliente','pesq'].includes(CURRENT_PROFILE.role);
  const supportNotice=isPrivateSupport?'<div class="chat-support-banner"><span class="chat-support-banner-icon">◉</span><div><b>Atendimento PesquisaPro</b><p>Este é um chat privado para tirar dúvidas, receber orientações e relatar problemas da pesquisa. Apenas a equipe PesquisaPro administra o atendimento.</p></div></div>':'';
  const visibleChannels=chatVisibleChannels();
  const emptyRoomTitle=chatIsStaffProfile()&&CHAT_RESPONSE_FILTER==='needs_response'?'Nenhuma conversa aguardando resposta':chatIsStaffProfile()&&CHAT_RESPONSE_FILTER==='awaiting_return'?'Nenhuma conversa aguardando retorno':'Selecione um canal';
  const emptyRoomHint=chatIsStaffProfile()&&CHAT_RESPONSE_FILTER!=='all'?'Troque o filtro acima para consultar outras conversas.':'Escolha uma conversa na lista ao lado para visualizar e enviar mensagens.';
  const activeRoom=active?`<header class="chat-room-header"><div><span class="eyebrow">${esc(chatAudienceLabel(active.audience_type))}</span><h2>${esc(active.name)}</h2><p>${esc(chatChannelDescription(active))}</p></div><span class="chat-live-pill"><i></i> Atualização ao vivo</span></header><div id="chat-messages" class="chat-messages" aria-live="polite">${CHAT_MESSAGES.length?CHAT_MESSAGES.map(chatMessageMarkup).join(''):'<div class="chat-empty-room"><span>✉</span><b>Nenhuma mensagem ainda</b><small>Envie a primeira mensagem para iniciar esta conversa.</small></div>'}</div><form class="chat-compose" onsubmit="event.preventDefault();chatSendMessage()"><textarea id="chat-message-input" class="inp" rows="2" maxlength="4000" placeholder="Escreva sua dúvida ou mensagem para a equipe PesquisaPro…" aria-label="Mensagem" onkeydown="chatHandleKeydown(event)"></textarea><button class="btn btn-fill" type="submit" ${CHAT_SENDING?'disabled':''}>Enviar</button></form>`:`<div class="chat-empty-room chat-no-selection"><span>✉</span><b>${emptyRoomTitle}</b><small>${emptyRoomHint}</small></div>`;
  const panelLabel=isPrivateSupport?'Atendimento':'Canais';
  const panelDescription=isPrivateSupport?'Sua conversa privada com a equipe PesquisaPro.':chatIsStaffProfile()?'Use a triagem acima para priorizar as conversas.':'Você vê somente os canais permitidos para seu perfil.';
  return head('Comunicação',isPrivateSupport?'Fale diretamente com a equipe PesquisaPro':'Converse com equipes, pesquisadores e participantes de cada pesquisa')+`<div class="chat-page">${supportNotice}${chatCreatePanel()}${chatResponseTriageMarkup()}<div class="chat-layout"><aside class="card chat-channel-panel"><div class="chat-panel-heading"><div><div class="card-t">${panelLabel}</div><div class="card-d">${panelDescription}</div></div><span class="pill pill-blue">${visibleChannels.length}</span></div><div id="chat-channel-list" class="chat-channel-list">${chatChannelListMarkup()}</div></aside><section class="card chat-room-panel">${activeRoom}</section></div></div>`;
};

/* ============ carregamento sob demanda de bibliotecas locais ============ */
const LOCAL_ASSETS={
  chart:{src:'vendor/chart.umd.js',ready:()=>typeof window.Chart!=='undefined'},
  qrcode:{src:'vendor/qrcode.min.js',ready:()=>typeof window.QRCode!=='undefined'},
  leaflet:{src:'vendor/leaflet.js',ready:()=>typeof window.L!=='undefined'},
  jspdf:{src:'vendor/jspdf.umd.min.js',ready:()=>typeof window.jspdf!=='undefined'},
  xlsx:{src:'vendor/xlsx.full.min.js',ready:()=>typeof window.XLSX!=='undefined'}
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
function stat(label,val,sub,ico,color,id){
  const idAttr=id?' id="'+esc(id)+'"':'';
  return `<div class="stat"${idAttr}><div class="s-top"><span class="s-label">${label}</span>
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
  const emCampo=SURVEYS.filter(s=>!s.archivedAt&&s.status==='campo').length;
  const emEdicao=SURVEYS.filter(s=>!s.archivedAt&&s.status==='rascunho').length;
  const finalizadas=SURVEYS.filter(s=>!s.archivedAt&&s.status==='encerrada').length;
  const pesqAtivosList=USERS.filter(u=>u.role==='pesq'&&u.status==='ativo');
  const entrevistas=SURVEYS.filter(s=>!s.archivedAt).reduce((sum,s)=>sum+surveyCollectedCount(s),0);
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
async function loadResearcherReferrals(){
  if(!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq'||RESEARCHER_REFERRALS_LOADED||RESEARCHER_REFERRALS_LOADING)return;
  RESEARCHER_REFERRALS_LOADING=true;
  try{
    const {data,error}=await sb.from('researcher_referrals').select('*').eq('referrer_id',CURRENT_PROFILE.id).order('created_at',{ascending:false});
    if(error)throw new Error(error.message);
    RESEARCHER_REFERRALS=data||[];
  }catch(ex){
    RESEARCHER_REFERRALS=[];
    if(/researcher_referrals|create_researcher_referral|schema cache|does not exist|relation .* does not exist/i.test(ex.message||''))RESEARCHER_REFERRALS_SCHEMA_MISSING=true;
    console.error('Não foi possível carregar indicações:',ex);
  }finally{
    RESEARCHER_REFERRALS_LOADED=true;RESEARCHER_REFERRALS_LOADING=false;
    const key=document.querySelector('.nav-item.on')?.dataset.key;
    if(key==='researcher-profile')go(key);
  }
}
function researcherReferralLink(referral){
  if(!referral?.referral_token)return '';
  const url=new URL('cadastro.html',window.location.href);url.searchParams.set('indicacao',referral.referral_token);return url.href;
}
function researcherReferralStatus(status){
  return {link_gerado:'<span class="pill pill-blue">Link gerado</span>',enviado:'<span class="pill pill-amber">Link enviado</span>',cadastro_recebido:'<span class="pill pill-blue">Cadastro recebido</span>',aprovado:'<span class="pill pill-green">Aprovado</span>',reprovado:'<span class="pill pill-red">Reprovado</span>',cancelado:'<span class="pill pill-gray">Cancelado</span>'}[status]||'<span class="pill pill-gray">Indicação</span>';
}
function researcherReferralDate(value){return value?new Date(value).toLocaleDateString('pt-BR'):'—';}
function researcherReferralsMarkup(){
  if(RESEARCHER_REFERRALS_SCHEMA_MISSING)return '<section class="card mb researcher-referrals-card"><div class="card-t">Indicar outro pesquisador</div><div class="callout warn" style="margin-top:10px">Esta área ainda não está habilitada. A gestão deve executar a migration <code>deploy/indicacao-pesquisador.sql</code> no Supabase.</div></section>';
  const rows=RESEARCHER_REFERRALS.length?RESEARCHER_REFERRALS.map(referral=>{
    const link=researcherReferralLink(referral);
    return `<article class="researcher-referral-item"><div class="researcher-referral-top"><div><strong>${esc(referral.referred_name||'Pessoa indicada')}</strong><span>${esc(referral.referred_phone||'')}${referral.referred_city?' · '+esc(referral.referred_city):''}</span></div>${researcherReferralStatus(referral.status)}</div><div class="researcher-referral-meta">Criada em ${esc(researcherReferralDate(referral.created_at))}${referral.submitted_at?' · cadastro em '+esc(researcherReferralDate(referral.submitted_at)):''}</div><div class="researcher-referral-actions"><button class="btn-ghost" type="button" onclick="researcherReferralCopy(${jsArg(referral.id)})">Copiar link</button><button class="btn btn-out" type="button" onclick="researcherReferralWhatsapp(${jsArg(referral.id)})">Enviar por WhatsApp</button></div></article>`;
  }).join(''):'<div class="empty">Você ainda não indicou nenhum pesquisador.</div>';
  return `<section class="card mb researcher-referrals-card"><div class="card-t">Indicar outra pessoa para ser pesquisador</div><div class="card-d">Preencha os dados básicos, gere um link individual e envie para a pessoa. O cadastro passará pela mesma análise e aprovação dos demais pesquisadores.</div><div class="researcher-referral-form"><div class="field-row mb"><div><label class="lbl" for="researcher-referral-name">Nome da pessoa *</label><input class="inp" id="researcher-referral-name" placeholder="Nome completo"></div><div><label class="lbl" for="researcher-referral-phone">Celular / WhatsApp *</label><input class="inp" id="researcher-referral-phone" inputmode="tel" placeholder="(00) 00000-0000"></div></div><div class="field-row mb"><div><label class="lbl" for="researcher-referral-email">E-mail</label><input class="inp" id="researcher-referral-email" type="email" placeholder="Opcional"></div><div><label class="lbl" for="researcher-referral-city">Cidade</label><input class="inp" id="researcher-referral-city" placeholder="Cidade/UF"></div></div><div class="mb"><label class="lbl" for="researcher-referral-note">Observação</label><textarea class="inp" id="researcher-referral-note" rows="2" placeholder="Opcional — como você conhece esta pessoa ou em que região ela atua"></textarea></div><div class="researcher-referral-consent"><input type="checkbox" id="researcher-referral-consent"><label for="researcher-referral-consent">Confirmo que tenho autorização para compartilhar o contato desta pessoa com a PesquisaPro.</label></div><button class="btn btn-fill" type="button" onclick="createResearcherReferral()">＋ Gerar link de indicação</button></div><div class="researcher-referral-list">${rows}</div></section>`;
}
async function createResearcherReferral(){
  if(!CURRENT_PROFILE?.id||CURRENT_PROFILE.role!=='pesq')return;
  const get=id=>(document.getElementById(id)?.value||'').trim();
  const name=get('researcher-referral-name'),phone=get('researcher-referral-phone'),email=get('researcher-referral-email'),city=get('researcher-referral-city'),note=get('researcher-referral-note'),consent=document.getElementById('researcher-referral-consent');
  if(!name||!phone){alert('Informe o nome e o celular/WhatsApp da pessoa indicada.');return;}
  if(!consent?.checked){alert('Confirme que você tem autorização para compartilhar o contato desta pessoa.');return;}
  try{
    const {data,error}=await sb.rpc('create_researcher_referral',{p_referred_name:name,p_referred_phone:phone,p_referred_email:email||null,p_referred_city:city||null,p_note:note||null});
    if(error)throw new Error(error.message);
    const row=Array.isArray(data)?data[0]:data;if(row)RESEARCHER_REFERRALS.unshift(row);
    alert('Indicação criada. Agora copie ou envie o link para '+name+'.');
    go('researcher-profile');
  }catch(ex){
    if(/create_researcher_referral|researcher_referrals|schema cache|does not exist|relation .* does not exist/i.test(ex.message||''))RESEARCHER_REFERRALS_SCHEMA_MISSING=true;
    alert('Não foi possível criar a indicação. A gestão precisa executar a migration deploy/indicacao-pesquisador.sql no Supabase.');console.error(ex);go('researcher-profile');
  }
}
async function markResearcherReferralSent(referralId){
  const {data,error}=await sb.rpc('mark_researcher_referral_sent',{p_referral_id:referralId});
  if(error)throw new Error(error.message);
  const updated=Array.isArray(data)?data[0]:data,local=RESEARCHER_REFERRALS.find(item=>item.id===referralId);if(local&&updated)Object.assign(local,updated);
  return updated||local;
}
async function researcherReferralCopy(referralId){
  const referral=RESEARCHER_REFERRALS.find(item=>item.id===referralId),link=researcherReferralLink(referral);if(!link)return;
  try{await navigator.clipboard.writeText(link);await markResearcherReferralSent(referralId);alert('Link copiado. Envie para a pessoa indicada pelo canal de sua preferência.');go('researcher-profile');}
  catch(ex){window.prompt('Copie o link de indicação:',link);console.error(ex);}
}
async function researcherReferralWhatsapp(referralId){
  const referral=RESEARCHER_REFERRALS.find(item=>item.id===referralId),link=researcherReferralLink(referral);if(!referral||!link)return;
  const digits=String(referral.referred_phone||'').replace(/\D/g,'');
  const message='Olá, '+(referral.referred_name||'')+'! Estou te indicando para ser pesquisador(a) na PesquisaPro. Faça seu cadastro pelo link: '+link;
  const target=digits?('https://wa.me/'+(digits.length<=11?'55'+digits:digits)+'?text='+encodeURIComponent(message)):('https://wa.me/?text='+encodeURIComponent(message));
  window.open(target,'_blank','noopener');
  try{await markResearcherReferralSent(referralId);go('researcher-profile');}catch(ex){console.error(ex);}
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
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!MY_INVITES_LOADED)loadMyInvitesIfNeeded();
  if(!RESEARCHER_PROFILE_CITIES_LOADED||!RESEARCHER_REFERRALS_LOADED||!MY_INVITES_LOADED||!SURVEYS_LOADED){if(!RESEARCHER_PROFILE_CITIES_LOADED)loadResearcherProfileCities();if(!RESEARCHER_REFERRALS_LOADED)loadResearcherReferrals();return head('Meus dados','Carregando seus dados cadastrais…')+'<div class="empty">Carregando convites e dados…</div>';}
  const p=CURRENT_PROFILE||{};
  return head('Meus dados','Corrija seus dados cadastrais e mantenha suas cidades de atuação atualizadas')+`<div class="researcher-profile-page">
    <div class="callout mb"><strong>Você pode corrigir seus dados pessoais e de contato.</strong> CPF, e-mail, status, aprovação e documentos oficiais permanecem protegidos e são atualizados somente pela gestão. O PIX é opcional e pode ser informado depois.</div>
    ${researcherProfileInvitesMarkup()}
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
    ${researcherReferralsMarkup()}
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
        <p>Assista ao tutorial e consulte o passo a passo antes de sair a campo. O objetivo é garantir localização correta, respeito às cotas, qualidade da entrevista, integridade e continuidade dos seus convites.</p>
        <div class="guide-hero-actions">
          <button class="btn btn-accent" onclick="document.getElementById('researcher-guide-video')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('researcher-guide-video')?.play().catch(()=>{})">▶ Assistir ao tutorial</button>
          <button class="btn btn-ghost" onclick="go('app-collect')">Abrir app de coleta →</button>
        </div>
      </div>
      <div class="guide-hero-badge"><span class="guide-badge-icon">✓</span><strong>Coleta validada</strong><small>GPS, cota e envio conferidos</small></div>
    </div>
    <div class="card mb guide-video-card">
      <div class="card-t">Vídeo tutorial</div>
      <div class="card-d">Veja como iniciar uma coleta, escolher a cota, respeitar os controles, consultar seu ranking, finalizar a entrevista e enviar os dados.</div>
      <div class="guide-video-frame">
        <video id="researcher-guide-video" controls playsinline preload="metadata" poster="assets/pesquisa-pro-orientacoes-coleta-poster.png" aria-label="Tutorial de uso do aplicativo de coleta">
          <source src="assets/pesquisa-pro-orientacoes-coleta.mp4" type="video/mp4">
          Seu navegador não conseguiu carregar o vídeo. Use o passo a passo abaixo ou atualize a página.
        </video>
        <div class="guide-video-fallback"><strong>Vídeo em carregamento</strong><span>Se a conexão estiver lenta, siga o guia rápido abaixo.</span></div>
      </div>
    </div>
    <div class="guide-section-title"><span class="eyebrow">PASSO A PASSO</span><h3>Faça a coleta na ordem correta</h3><p>Use esta sequência em todas as entrevistas para reduzir erros e evitar retrabalho.</p></div>
    <div class="guide-step-grid">
      ${[['01','Prepare o celular','Ative o GPS, permita a localização no navegador, confira a internet e mantenha a bateria suficiente para o trabalho.'],['02','Escolha a pesquisa','No menu, abra “Coletar (app)” e confirme se a pesquisa exibida é a correta antes de iniciar.'],['03','Selecione a cota','Toque em uma cota disponível. A instrução “1º selecione uma cota” deve desaparecer antes de iniciar.'],['04','Confirme a localização','A coleta exige georreferenciamento. Aguarde o status de localização ativa e permaneça dentro da cidade ou região autorizada pela pesquisa.'],['05','Respeite a distância','A nova entrevista deve começar a pelo menos 15 metros da coleta válida anterior desta mesma pesquisa. Pesquisas diferentes podem ser feitas no mesmo local; se o aplicativo bloquear, mude para um local mais distante.'],['06','Aplique o questionário','Leia as perguntas com neutralidade, registre respostas verdadeiras e não pule campos obrigatórios.'],['07','Respeite o tempo mínimo','Cada formulário tem um tempo mínimo necessário. Coletas abaixo desse limite são rejeitadas e não entram no pagamento.'],['08','Finalize e envie','Revise a entrevista, responda à confirmação final se aparecer, envie e aguarde a confirmação do servidor. Após 21h, a gravação de confirmação é obrigatória.'],['09','Acompanhe seu ranking','Consulte Seu Ranking para ver sua nota e os motivos. Respostas, integridade, duração e distância influenciam a prioridade para novos convites.']].map(([n,t,d])=>`<article class="guide-step"><span class="guide-step-num">${n}</span><div><h4>${t}</h4><p>${d}</p></div></article>`).join('')}
    </div>
    <div class="grid g2 guide-lower-grid">
      <div class="card guide-checklist"><div class="card-t">Antes de enviar, confira</div><div class="card-d">Uma revisão de 20 segundos evita a maioria dos problemas.</div><label><input type="checkbox"> A cota escolhida corresponde ao perfil entrevistado</label><label><input type="checkbox"> A localização está ativa e atualizada</label><label><input type="checkbox"> As respostas foram conferidas com o entrevistado</label><label><input type="checkbox"> A tela confirmou o envio ao servidor</label></div>
      <div class="card guide-support"><div class="card-t">Se algo não funcionar</div><div class="card-d">Não tente repetir várias vezes sem conferir o motivo.</div><div class="guide-support-row"><span>GPS bloqueado</span><strong>Ative a localização e recarregue a página.</strong></div><div class="guide-support-row"><span>Sem cota</span><strong>Verifique se você entrou na pesquisa correta.</strong></div><div class="guide-support-row"><span>Envio pendente</span><strong>Mantenha a página aberta até confirmar o servidor.</strong></div><button class="btn btn-ghost" onclick="go('app-collect')">Voltar para a coleta →</button></div>
    </div>
    <div class="card guide-ranking-callout mb"><div class="guide-ranking-callout-icon">★</div><div><span class="eyebrow">QUALIDADE E CONTINUIDADE</span><h3>Seu Ranking mostra como manter os convites</h3><p>A nota combina <strong>respostas (30%)</strong>, <strong>integridade (30%)</strong>, <strong>duração (20%)</strong> e <strong>distância (20%)</strong>. Notas abaixo de 80 reduzem a prioridade; notas muito baixas podem interromper novos convites. A melhor proteção para seu trabalho é entrevistar pessoas de verdade e registrar fielmente o que foi respondido.</p><button class="btn btn-ghost" type="button" onclick="go('researcher-my-ranking')">Ver Seu Ranking →</button></div></div>
    <div class="guide-note"><strong>Importante:</strong> nunca compartilhe sua senha, não altere respostas para atingir a meta, não registre entrevista sem entrevistar e procure a coordenação quando houver dúvida sobre uma cota, a área autorizada ou uma abordagem. A mensagem de reprovação por tempo mínimo é: “Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real”.</div>
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
  loadResearcherAlertPreferencesIfNeeded();
  loadMySurveyCommunicationsIfNeeded();
  loadMySurveyResearcherMessagesIfNeeded();
  const primeiroNome=(CURRENT_PROFILE&&CURRENT_PROFILE.name)?CURRENT_PROFILE.name.trim().split(' ')[0]:'';
  const subtitulo=primeiroNome?('Olá '+primeiroNome+' — acompanhe suas metas e ganhos'):'Acompanhe suas metas e ganhos';
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED){
    return head('Meu painel',subtitulo)+'<div class="empty">Carregando seus dados…</div>';
  }
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const myPayments=PAYMENTS.filter(p=>p.researcherId===myId&&!SURVEYS.find(x=>x.id===p.surveyId)?.archivedAt);
  const visibleMyInvites=(MY_INVITES||[]).filter(inv=>!SURVEYS.find(x=>x.id===inv.survey_id)?.archivedAt);
  const aReceber=myPayments.filter(p=>p.status==='aprovado').reduce((sum,p)=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);return sum+p.valid*(s?+s.price:0);
  },0);
  const ganhosEmAnalise=myPayments.filter(p=>p.status!=='aprovado').reduce((sum,p)=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);return sum+p.valid*(s?+s.price:0);
  },0);
  const entrevistasAprovadas=myPayments.reduce((sum,p)=>sum+(Number(p.valid)||0),0);
  const surveysMine=acollectMySurveys();
  const earningsHtml=`<section class="researcher-earnings-hero" aria-labelledby="researcher-earnings-title"><div class="researcher-earnings-copy"><span class="eyebrow">SEU DESEMPENHO</span><h2 id="researcher-earnings-title">Ganhos com pesquisas</h2><p>Valor das entrevistas aprovadas pela auditoria.</p><strong class="researcher-earnings-value">${brl(aReceber)}</strong></div><div class="researcher-earnings-side"><div class="researcher-earnings-metric"><span>Entrevistas aprovadas</span><strong>${entrevistasAprovadas}</strong></div><div class="researcher-earnings-metric"><span>Em análise</span><strong>${brl(ganhosEmAnalise)}</strong></div><button class="btn btn-ghost" type="button" onclick="go('my-earnings')">Ver meus ganhos →</button></div></section>`;
  const invitesHtml=(MY_INVITES_LOADED&&visibleMyInvites.length)?`<div class="card mb">
    <div class="card-t">Convite${visibleMyInvites.length>1?'s':''} para pesquisa${visibleMyInvites.length>1?'s':''}</div>
    <div class="card-d">Você foi convidado(a) pelo administrador — aceite para entrar na equipe e liberar a coleta.</div>
    ${visibleMyInvites.map(inv=>{
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
  ${mySurveyResearcherMessagesMarkup()}
  ${mySurveyCommunicationsMarkup()}
  ${researcherAvailableSurveysMarkup(surveysMine)}
  ${invitesHtml}
  ${researcherPushCard()}
  ${researcherAlertPreferencesCard()}
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
    return SURVEYS.filter(s=>!s.archivedAt&&((s.clientIds||[]).includes(CURRENT_PROFILE.id)||(client?.surveys||[]).includes(s.name)));
  }
  if(CURRENT_PROFILE.role==='pesq')return typeof acollectMySurveys==='function'?acollectMySurveys():[];
  return SURVEYS.filter(s=>!s.archivedAt&&s.status!=='encerrada');
}
function activeCampaignSurvey(){
  const available=campaignSurveysForCurrentUser();
  return available.find(s=>s.id===ACTIVE_CAMPAIGN_ID)||available[0]||null;
}
function updateCampaignSwitcherButton(){
  const button=document.getElementById('campaignSwitcherBtn');
  if(!button)return;
  const sidebarButton=document.getElementById('sidebarCampaignBtn');
  if(CURRENT_PROFILE?.role==='cliente'){button.hidden=true;button.setAttribute('aria-hidden','true');return;}
  if(!['admin','admpro','coord','gerente','pesq'].includes(CURRENT_PROFILE?.role)){
    button.hidden=true;button.setAttribute('aria-hidden','true');if(sidebarButton)sidebarButton.hidden=true;return;}
  button.hidden=false;button.removeAttribute('aria-hidden');
  const active=activeCampaignSurvey();
  button.textContent=active?`Trocar pesquisa · ${active.name.length>24?active.name.slice(0,24)+'…':active.name} ▾`:'Trocar pesquisa ▾';
  button.title=active?'Pesquisa atual: '+active.name:'Selecione uma pesquisa ou campanha';
  if(sidebarButton){sidebarButton.hidden=false;sidebarButton.textContent=active?`Trocar pesquisa · ${active.name}`:'Trocar pesquisa';sidebarButton.title=button.title;}
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
const CLIENT_RPC_TIMEOUT_MS=30000;
function clientWithTimeout(request,label,timeoutMs=CLIENT_RPC_TIMEOUT_MS){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Tempo esgotado ao carregar '+label+'.')),timeoutMs);});
  return Promise.race([Promise.resolve(request),timeout]).finally(()=>clearTimeout(timer));
}
let CLIENT_PROGRESS_CACHE={surveyId:null,summary:null,quotas:[],quotaError:null};
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
  if(CLIENT_PROGRESS_CACHE.quotaError)return `<div class="callout warn" style="margin:10px 0"><b>Metas de cota indisponíveis no momento.</b><br><small>${esc(CLIENT_PROGRESS_CACHE.quotaError)}</small></div>`;
  if(!rows.length)return '<div class="empty" style="padding:15px 0">A pesquisa não possui cotas configuradas para exibição.</div>';
  const colors=['#2563eb','#059669','#ea580c','#7c3aed','#0891b2','#d97706'];
  return rows.map((row,i)=>quota(row.quotaLabel,Number(row.validCount)||0,Number(row.targetCount)||0,colors[i%colors.length])).join('');
}
function clientProgressCoverageRows(s){
  const rows=CLIENT_PROGRESS_CACHE.quotas||[];
  if(CLIENT_PROGRESS_CACHE.quotaError)return `<tr><td colspan="4"><div class="callout warn"><b>Não foi possível carregar as cotas.</b><br><small>${esc(CLIENT_PROGRESS_CACHE.quotaError)}</small></div></td></tr>`;
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
    const detail=String(ex?.message||ex||'');
    const migrationHint=/function|schema cache|does not exist|permission/i.test(detail)?' Verifique se a migration <code>deploy/progresso-pesquisadores-cliente.sql</code> foi executada no Supabase.':'';
    const timeoutHint=/Tempo esgotado/i.test(detail)?' A consulta demorou mais que o limite; os índices de monitoramento podem ainda não ter sido executados.':'';
    const tbody=wrap.querySelector('tbody');if(tbody)tbody.innerHTML=`<tr><td colspan="5"><div class="callout warn"><b>Não foi possível carregar os pesquisadores agora.</b><br>${migrationHint}${timeoutHint}<br><small>Detalhe: ${esc(detail)}</small></div></td></tr>`;
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
    const [summaryResult,quotaResult]=await Promise.allSettled([
      clientWithTimeout(sb.rpc('client_collection_progress',{p_survey_id:s.id}),'o andamento da coleta'),
      clientWithTimeout(sb.rpc('client_collection_quota_progress',{p_survey_id:s.id}),'as cotas da coleta')
    ]);
    const summaryResponse=summaryResult.status==='fulfilled'?summaryResult.value:null;
    const quotaResponse=quotaResult.status==='fulfilled'?quotaResult.value:null;
    const summaryError=summaryResult.status==='rejected'?summaryResult.reason:summaryResponse?.error;
    if(summaryError)throw summaryError;
    const quotaError=quotaResult.status==='rejected'?quotaResult.reason:quotaResponse?.error;
    const summary=summaryResponse?.data||[],quotas=quotaResponse?.data||[],row=summary[0]||{};
    CLIENT_PROGRESS_CACHE={surveyId:s.id,summary:{validCount:row.valid_count,totalCount:row.total_count,rejectedCount:row.rejected_count,researcherCount:row.researcher_count,lastOccurredAt:row.last_occurred_at},quotas:quotas.map(r=>({questionId:r.question_id,questionText:r.question_text,quotaLabel:r.quota_label,validCount:r.valid_count,targetCount:r.target_count})),quotaError:quotaError?String(quotaError.message||quotaError):null};
    clientProgressRender(s,c);
  }catch(ex){host.innerHTML='<div class="card"><div class="callout warn"><b>Não foi possível carregar o resumo do andamento.</b><br>Verifique as migrations de monitoramento do cliente e atualize a página. Detalhe: '+esc(ex?.message||ex)+'</div></div>';
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
  return (s.questions||[]).filter(q=>q.dbId);
}
function reportsQuestionsForClient(s){
  return reportsQuestionsForSurvey(s).filter(q=>q.type!=='open');
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
  const c=clientSelf(),s=clientSelfSurvey(),qs=reportsQuestionsForClient(s||{}),crossQs=reportsCrossQuestionsForSurvey(s||{});if(!c||!s||!qs.length)return;
  if(!clientResultsReleasedForSurvey(c,s)){out.innerHTML='<div class="card"><div class="empty">Os resultados ainda não foram liberados.</div></div>';return;}
  CR_CLIENT_REPORT_LOADING=true;out.innerHTML='<div class="empty" style="padding:28px 0">Carregando resultados agregados…</div>';
  try{
    let publishedDocument=null,documentError=null;
    try{
      const {data:docs,error:docError}=await clientWithTimeout(sb.from('report_documents').select('id,title,subtitle,presentation,methodology,executive_summary,sections,status,published_at').eq('survey_id',s.id).eq('client_id',CURRENT_PROFILE?.id||c.id).eq('status','published').order('published_at',{ascending:false}).limit(1),'o relatório publicado');
      if(docError)throw docError;
      publishedDocument=docs?.[0]||null;
    }catch(ex){documentError=ex;}
    const {data:overviewRows,error:overviewError}=await clientWithTimeout(sb.rpc('client_report_all_questions',{p_survey_id:s.id}),'os resultados agregados',45000);
    if(overviewError)throw overviewError;
    const crossings=clientPublishedCrossings(publishedDocument,crossQs),crossRowsById={},crossErrors=[];
    for(const crossing of crossings){const ids=reportsCrossingQuestionIds(crossing);try{const {data,error}=await clientWithTimeout(sb.rpc('client_report_cross_tab',{p_survey_id:s.id,p_question_ids:ids}),'os cruzamentos do relatório',45000);if(error)throw error;crossRowsById[crossing.id]=data||[];}catch(ex){crossErrors.push(ex);}}
    CR_CLIENT_REPORT_CACHE={surveyId:s.id,overviewRows:overviewRows||[],crossRowsById,document:publishedDocument};
    clientRenderReportOverview(out,s,qs,overviewRows||[],publishedDocument,crossings);
  }catch(ex){
    const detail=String(ex?.message||ex||'');
    out.innerHTML='<div class="callout warn"><b>Não foi possível carregar os resultados agregados agora.</b><br>O restante do monitoramento continua disponível. Verifique as migrations de resultados para clientes e os índices de monitoramento. Detalhe: '+esc(detail)+'</div>';
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
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{},clientReleaseById:{},minimumCollectionSeconds:null,orientationMessage:''}};
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
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{},clientReleaseById:{},minimumCollectionSeconds:null,
    orientationMessage:surveyInitialOrientationDefaultTemplate()};
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
    return {id:localId,position:Number.isFinite(Number(q.position))?Number(q.position):qi,dbId:q.id,text:q.text||'',type:q.type||'single',difficulty:Math.min(5,Math.max(1,Number(q.difficulty)||3)),opts:opts.map(o=>o.label||''),endsInterview:opts.map(o=>!!o.ends_interview),fields:fields.length===2?fields:DEFAULT_PAIR_FIELDS(),isRegion:!!q.is_region};
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
    minimumCollectionSeconds:Number.isFinite(Number(row.minimum_collection_seconds))&&Number(row.minimum_collection_seconds)>0?Math.round(Number(row.minimum_collection_seconds)):null,
    collected:row.collected||0,status:row.status||'rascunho',archivedAt:row.archived_at||null,
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
    minimum_collection_seconds:Number.isFinite(Number(d.minimumCollectionSeconds))&&Number(d.minimumCollectionSeconds)>0?Math.round(Number(d.minimumCollectionSeconds)):null,
  };
}
/* atualiza perguntas/opções sem apagar perguntas que já possuem respostas.
   Perguntas removidas do editor ficam inativas quando a migration nova está
   aplicada; assim o histórico continua preservado sem aparecer no formulário. */
async function syncSurveyQuestionsAndOptions(surveyId,d){
  SURVEY_END_CONDITION_SCHEMA_MISSING=false;
  let activeColumnAvailable=true;
  let difficultyColumnAvailable=true;
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
      difficulty:Math.min(5,Math.max(1,Number(q.difficulty)||3)),
    };
    let questionResult;
    if(q.dbId&&existingIds.includes(q.dbId)){
      const updatePayload={...(difficultyColumnAvailable?baseQuestionPayload:(()=>{const {difficulty,...legacy}=baseQuestionPayload;return legacy;})()),...(activeColumnAvailable?{is_active:true}:{})};
      questionResult=await sb.from('survey_questions').update(updatePayload).eq('id',q.dbId).eq('survey_id',surveyId).select().single();
      if(questionResult.error&&difficultyColumnAvailable&&/difficulty|schema cache|column .* does not exist/i.test(questionResult.error.message||'')){
        difficultyColumnAvailable=false;
        const {difficulty,...legacyPayload}=baseQuestionPayload;
        questionResult=await sb.from('survey_questions').update(activeColumnAvailable?{...legacyPayload,is_active:true}:legacyPayload).eq('id',q.dbId).eq('survey_id',surveyId).select().single();
      }
      if(questionResult.error&&activeColumnAvailable&&/is_active|schema cache|column .* does not exist/i.test(questionResult.error.message||'')){
        activeColumnAvailable=false;
        const legacyPayload={...baseQuestionPayload};
        if(!difficultyColumnAvailable)delete legacyPayload.difficulty;
        delete legacyPayload.is_active;
        questionResult=await sb.from('survey_questions').update(legacyPayload).eq('id',q.dbId).eq('survey_id',surveyId).select().single();
      }
    }else{
      questionResult=await sb.from('survey_questions').insert(difficultyColumnAvailable?baseQuestionPayload:(()=>{const {difficulty,...legacy}=baseQuestionPayload;return legacy;})()).select().single();
      if(questionResult.error&&difficultyColumnAvailable&&/difficulty|schema cache|column .* does not exist/i.test(questionResult.error.message||'')){
        difficultyColumnAvailable=false;
        const {difficulty,...legacyPayload}=baseQuestionPayload;
        questionResult=await sb.from('survey_questions').insert(legacyPayload).select().single();
      }
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
  if(k==='surveys'||k==='surveys-done'||k==='surveys-archived'||k==='dashboard'||k==='dashboard-pesq'||k==='researcher-profile'||k==='researcher-my-ranking'||k==='survey-team'||k==='client-surveys'||k==='client-progress'||k==='client-results'||k==='reports'||k==='communication'||k==='researcher-ranking')go(k);
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
  arquivada:'<span class="pill pill-gray">● Arquivada</span>',
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
    if(g('w-orientation-template')!=null)WIZ.data.orientationMessage=g('w-orientation-template');
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
  <div class="wiz-orientation-card"><label class="lbl" for="w-orientation-template">Orientações iniciais por aplicativo</label><p class="card-d">Enviadas automaticamente a cada pesquisador que aceitar esta pesquisa. O modelo atual já está sugerido: revise e personalize antes de salvar. Cada pesquisador confirma a leitura antes de iniciar a coleta.</p><textarea class="inp" id="w-orientation-template" rows="12" maxlength="3500" required>${esc(WIZ.data.orientationMessage||surveyInitialOrientationDefaultTemplate())}</textarea><p class="card-d">Até 3.500 caracteres no modelo; a mensagem final, com nome e links inseridos, deve caber em 4.000. Use <code>{{pesquisador}}</code>, <code>{{pesquisa}}</code>, <code>{{grupo}}</code>, <code>{{site}}</code> e <code>{{video}}</code>. Regras de integridade e gravação final após 21:00 são obrigatórias.</p></div>
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
  <div class="q-duration-hint"><span aria-hidden="true">⏱</span> Defina a dificuldade de cada pergunta. Ela será usada para calcular o tempo mínimo da entrevista e proteger a qualidade da coleta.</div>
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
    const difficultyCtl=`<label class="q-difficulty-control" title="Dificuldade usada no tempo mínimo"><span>Dificuldade</span><select onchange="qDifficulty(${q.id},this.value)">${[['1','Fácil'],['2','Leve'],['3','Média'],['4','Difícil'],['5','Muito difícil']].map(([value,label])=>`<option value="${value}" ${Number(q.difficulty||3)===Number(value)?'selected':''}>${value} · ${label}</option>`).join('')}</select></label>`;
    return `<div class="q-card ${q.isRegion?'is-region':''}" data-qid="${q.id}" ondragover="qDragOver(event,${q.id})" ondrop="qDrop(event,${q.id})">
      <div class="qc-head">
        <span class="q-num">${i+1}</span>
        <input class="q-text-inp" value="${esc(q.text)}" oninput="qText(${q.id},this.value)" placeholder="Digite o enunciado da pergunta">
        ${regionCtl}
        ${quotaCtl}
        ${difficultyCtl}
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
  const q={id:WIZ_QID++,text:'',type,difficulty:3,opts:Q_HAS_OPTS(type)?['',''] :[],endsInterview:Q_HAS_OPTS(type)?[false,false]:[],fields:type==='pair'?DEFAULT_PAIR_FIELDS():[]};
  WIZ.data.questions.push(q);qRender();
  setTimeout(()=>{const inputs=document.querySelectorAll('.q-text-inp');if(inputs.length)inputs[inputs.length-1].focus();},30);
}
function qDel(id){WIZ.data.questions=WIZ.data.questions.filter(q=>q.id!==id);qRender();}
function qText(id,v){const q=qFind(id);if(q)q.text=v;}
function qDifficulty(id,v){const q=qFind(id);if(q)q.difficulty=Math.min(5,Math.max(1,Number(v)||3));}
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
  const existingSurvey=!isNew?SURVEYS[WIZ.editIndex]:null;
  let orientationTemplate;
  try{orientationTemplate=validateSurveyOrientationTemplate(d.orientationMessage,d.name);}catch(ex){alert(ex.message);WIZ.step=1;wizRender();return;}
  const row=snapshotToSurveyRow(d);
  if(existingSurvey?.status)row.status=existingSurvey.status;
  const busyBtn=document.querySelector('#wizBody .btn-fill');
  if(busyBtn)busyBtn.disabled=true;
  try{
    let surveyId;
    let orientationSaveError=null;
    if(isNew){
      let result=await sb.from('surveys').insert(row).select().single();
      if(result.error&&/minimum_collection_seconds|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {minimum_collection_seconds,...legacyRow}=row;
        result=await sb.from('surveys').insert(legacyRow).select().single();
      }
      if(result.error&&/form_approval_required|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {form_approval_required,minimum_collection_seconds,...legacyRow}=row;
        result=await sb.from('surveys').insert(legacyRow).select().single();
      }
      if(result.error)throw new Error(result.error.message);
      surveyId=result.data.id;
    }else{
      surveyId=SURVEYS[WIZ.editIndex].id;
      let result=await sb.from('surveys').update(row).eq('id',surveyId);
      if(result.error&&/minimum_collection_seconds|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {minimum_collection_seconds,...legacyRow}=row;
        result=await sb.from('surveys').update(legacyRow).eq('id',surveyId);
      }
      if(result.error&&/form_approval_required|schema cache|column .* does not exist/i.test(result.error.message||'')){
        const {form_approval_required,minimum_collection_seconds,...legacyRow}=row;
        result=await sb.from('surveys').update(legacyRow).eq('id',surveyId);
      }
      if(result.error)throw new Error(result.error.message);
    }
    const orientationRow={survey_id:surveyId,orientation_message_template:orientationTemplate,updated_by:CURRENT_PROFILE?.id||null,updated_at:new Date().toISOString()};
    const orientationResult=await sb.from('survey_communication_settings').upsert(orientationRow,{onConflict:'survey_id'});
    if(orientationResult.error)orientationSaveError=orientationResult.error.message||'Erro desconhecido';
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
    alert(savedMessage+(orientationSaveError?'\n\nATENÇÃO: não foi possível salvar as orientações personalizadas. A pesquisa foi salva, mas o envio automático usará o modelo padrão até você corrigir a configuração em Atribuir equipe. Detalhe: '+orientationSaveError:'')+(SURVEY_END_CONDITION_SCHEMA_MISSING?'\n\nAtenção: as condicionantes de encerramento ainda não foram gravadas porque falta aplicar deploy/condicionante-encerramento-resposta.sql no Supabase. As demais alterações foram salvas.':''));
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
    c.surveys=SURVEYS.filter(s=>!s.archivedAt&&(s.clientes||[]).includes(c.company)).map(s=>s.name);
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
  const collected=surveyCollectedCount(s);
  const pct=surveyCoveragePct(collected,sample);
  const coll=s.status==='rascunho'&&collected===0?'—':collected.toLocaleString('pt-BR')+' ('+pct+')';
  const tag=s.isNew?' <span class="pill pill-amber" style="font-size:9px;padding:1px 6px">nova</span>':'';
  const teamN=(s.team||[]).length;
  const isArchived=!!s.archivedAt;
  const actions=isArchived
    ?`<button class="btn-ghost" onclick="chatOpenSurveyChannel('${s.id}')">Chat</button>
      <button class="btn-ghost" onclick="go('reports')">Ver relatório</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost survey-pdf-action" onclick="surveyFormPdfDownload(${idx})">📄 PDF formulário</button>
      <button class="btn-ghost" style="color:var(--teal)" onclick="surveyRestore(${idx})">Restaurar</button>`
    :opts&&opts.done
    ?`<button class="btn-ghost" onclick="chatOpenSurveyChannel('${s.id}')">Chat</button>
      <button class="btn-ghost" onclick="go('reports')">Ver relatório</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost survey-pdf-action" onclick="surveyFormPdfDownload(${idx})">📄 PDF formulário</button>
      <button class="btn-ghost" onclick="surveyReopen(${idx})">Reabrir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyArchive(${idx})">Arquivar</button>`
    :`${s.status==='rascunho'?`<button class="btn-ghost" style="color:var(--teal)" onclick="surveyStart(${idx})">▶ Iniciar coleta</button>`:''}
      <button class="btn-ghost" onclick="chatOpenSurveyChannel('${s.id}')">Chat</button>
      <button class="btn-ghost" onclick="surveyTeam(${idx})">Equipe</button>
      <button class="btn-ghost" onclick="surveyEdit(${idx})">Editar</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost survey-pdf-action" onclick="surveyFormPdfDownload(${idx})">📄 PDF formulário</button>
      <button class="btn-ghost" onclick="surveyFinish(${idx})">Concluir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyArchive(${idx})">Arquivar</button>`;
  return `<tr>
    <td><b>${esc(s.name)}</b>${tag}<div style="font-size:11px;color:var(--ink3)">${esc(s.created)}</div></td>
    <td>${s.questions.length} ${s.questions.length===1?'pergunta':'perguntas'}</td>
    <td>${sample.toLocaleString('pt-BR')}</td>
    <td>${coll}</td>
    <td>${teamN?teamN+(teamN===1?' pessoa':' pessoas'):'<span style="color:var(--ink3)">não atribuída</span>'}</td>
    <td>${isArchived?STATUS_PILL.arquivada:(STATUS_PILL[s.status]||STATUS_PILL.rascunho)}</td>
    <td style="white-space:nowrap">${actions}</td></tr>`;
}
PAGES.surveys=()=>{
  if(!SURVEYS_LOADED){
    loadSurveysIfNeeded();
    return head('Minhas pesquisas','Pesquisas em desenvolvimento (rascunho e em campo).')+'<div class="empty">Carregando pesquisas do banco de dados…</div>';
  }
  const inDev=SURVEYS.map((s,idx)=>({s,idx})).filter(x=>!x.s.archivedAt&&x.s.status!=='encerrada');
  const rows=inDev.map(x=>surveyRow(x.s,x.idx)).join('')
    ||'<tr><td colspan="7" class="empty">Nenhuma pesquisa em desenvolvimento. Clique em “+ Nova pesquisa”.</td></tr>';
  return head('Minhas pesquisas','Pesquisas em desenvolvimento (rascunho e em campo).',
  '<button class="btn btn-out" onclick="go(\'surveys-done\')">Ver concluídas</button><button class="btn btn-out" onclick="go(\'surveys-archived\')">Arquivadas</button><button class="btn btn-fill" onclick="newSurvey()">+ Nova pesquisa</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Em desenvolvimento',String(inDev.length),'rascunho + em campo','❒','#2563eb')}
    ${stat('Em campo',String(SURVEYS.filter(s=>!s.archivedAt&&s.status==='campo').length),'coletando agora','◷','#059669')}
    ${stat('Rascunhos',String(SURVEYS.filter(s=>!s.archivedAt&&s.status==='rascunho').length),'aguardando início','✎','#d97706')}
    ${stat('Concluídas',String(SURVEYS.filter(s=>!s.archivedAt&&s.status==='encerrada').length),'em outra aba','✓','#7c3aed')}
  </div>
  <div class="card">
    <div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  </div>
  <div class="callout" style="margin-top:16px"><b>Editar</b> reabre a pesquisa no fluxo com seus dados salvos. <b>Arquivar</b> retira a pesquisa da operação e do financeiro pendente sem apagar histórico. <b>Duplicar</b> cria uma cópia como novo rascunho, sem copiar equipe nem vínculo com clientes.</div>`;
};

PAGES['surveys-done']=()=>{
  if(!SURVEYS_LOADED){
    loadSurveysIfNeeded();
    return head('Pesquisas concluídas','Pesquisas encerradas — acesse os relatórios ou reabra se precisar.')+'<div class="empty">Carregando pesquisas do banco de dados…</div>';
  }
  const done=SURVEYS.map((s,idx)=>({s,idx})).filter(x=>!x.s.archivedAt&&x.s.status==='encerrada');
  const rows=done.map(x=>surveyRow(x.s,x.idx,{done:true})).join('')
    ||'<tr><td colspan="7" class="empty">Nenhuma pesquisa concluída ainda.</td></tr>';
  return head('Pesquisas concluídas','Pesquisas encerradas — acesse os relatórios ou reabra se precisar.',
  '<button class="btn btn-out" onclick="go(\'surveys\')">← Em desenvolvimento</button><button class="btn btn-out" onclick="go(\'surveys-archived\')">Arquivadas</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Concluídas',String(done.length),'encerradas','✓','#7c3aed')}
    ${stat('Coletas totais',done.reduce((a,x)=>a+(x.s.collected||0),0).toLocaleString('pt-BR'),'somadas','◫','#059669')}
    ${stat('Em desenvolvimento',String(SURVEYS.filter(s=>!s.archivedAt&&s.status!=='encerrada').length),'na outra aba','❒','#2563eb')}
    ${stat('Arquivadas',String(SURVEYS.filter(s=>!!s.archivedAt).length),'histórico preservado','▤','#64748b')}
  </div>
  <div class="card">
    <div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
  </div>
  <div class="callout" style="margin-top:16px"><b>Reabrir</b> devolve a pesquisa para "em desenvolvimento". <b>Arquivadas</b> preserva histórico e comprovantes, mas não entra no financeiro pendente. <b>Duplicar</b> cria uma cópia como novo rascunho.</div>`;
};

PAGES['surveys-archived']=()=>{
  if(!SURVEYS_LOADED){loadSurveysIfNeeded();return head('Pesquisas arquivadas','Histórico preservado fora das listas operacionais.')+'<div class="empty">Carregando pesquisas do banco de dados…</div>';}
  const archived=SURVEYS.map((s,idx)=>({s,idx})).filter(x=>!!x.s.archivedAt);
  const rows=archived.map(x=>surveyRow(x.s,x.idx,{archived:true})).join('')
    ||'<tr><td colspan="7" class="empty">Nenhuma pesquisa arquivada.</td></tr>';
  return head('Pesquisas arquivadas','Coletas, respostas, pagamentos e comprovantes continuam preservados.',
    '<button class="btn btn-out" onclick="go(\'surveys\')">← Em desenvolvimento</button><button class="btn btn-out" onclick="go(\'surveys-done\')">Concluídas</button>')+`
  <div class="grid g3" style="margin-bottom:16px">
    ${stat('Arquivadas',String(archived.length),'fora da operação','▤','#64748b')}
    ${stat('Coletas preservadas',archived.reduce((a,x)=>a+surveyCollectedCount(x.s),0).toLocaleString('pt-BR'),'histórico mantido','◫','#0891b2')}
    ${stat('Financeiro pendente',brl(0),'não contabilizado','✓','#059669')}
  </div>
  <div class="card"><div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="callout" style="margin-top:16px"><b>Arquivamento não apaga dados.</b> A pesquisa não aceita novas coletas nem aparece no financeiro operacional. Use <b>Restaurar</b> para recolocá-la na operação.</div>`;
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
async function surveyArchive(idx){
  const s=SURVEYS[idx];
  if(!s?.id)return;
  if(!confirm('Arquivar a pesquisa "'+s.name+'"? Coletas, respostas, pagamentos e comprovantes serão preservados, mas ela sairá da operação e do financeiro pendente.'))return;
  try{
    const {error}=await sb.rpc('archive_survey',{p_survey_id:s.id});
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível arquivar: '+ex.message+'\n\nExecute a migration deploy/arquivar-pesquisa.sql no Supabase.');return;}
  s.archivedAt=new Date().toISOString();
  refreshClientSurveyLinks();
  go('surveys');
}
async function surveyRestore(idx){
  const s=SURVEYS[idx];
  if(!s?.id)return;
  if(!confirm('Restaurar a pesquisa "'+s.name+'" para as listas operacionais?'))return;
  try{
    const {error}=await sb.rpc('restore_survey',{p_survey_id:s.id});
    if(error)throw new Error(error.message);
  }catch(ex){alert('Não foi possível restaurar: '+ex.message+'\n\nExecute a migration deploy/arquivar-pesquisa.sql no Supabase.');return;}
  s.archivedAt=null;
  refreshClientSurveyLinks();
  go('surveys-archived');
}
function surveyDelete(idx){return surveyArchive(idx);}
async function surveyEdit(idx){
  const s=SURVEYS[idx];
  if(!s?.id)return;
  const {data:settings,error:settingsError}=await sb.from('survey_communication_settings').select('orientation_message_template').eq('survey_id',s.id).maybeSingle();
  if(settingsError){alert('Não foi possível carregar as orientações desta pesquisa. A edição foi interrompida para não sobrescrever a mensagem atual. Detalhe: '+settingsError.message);return;}
  WIZ.editIndex=idx;WIZ.editArmed=true;WIZ.step=1;
  const linkedClientes=s.clientes||clienteUsers().filter(c=>(c.surveys||[]).includes(s.name)).map(c=>c.company);
  WIZ.data=JSON.parse(JSON.stringify({
    name:s.name,
    tipo:s.tipo||'Eleitoral / intenção de voto',dataIni:s.dataIni||'',dataFim:s.dataFim||'',
    abrangencia:s.abrangencia||'estadual',estados:s.estados||[],cidades:s.cidades||{},
    pop:s.pop,err:s.err,conf:s.conf,prop:s.prop,price:s.price,priceRemote:s.priceRemote,clientes:linkedClientes,
    formStarted:s.formStarted!==false,formApprovalRequired:!!s.formApprovalRequired,questions:s.questions||[],clientPrice:s.clientPrice!=null?s.clientPrice:12,quotas:s.quotas||{},quotaOff:s.quotaOff||{},remote:s.remote||{},clientReleaseById:s.clientReleaseById||{},minimumCollectionSeconds:s.minimumCollectionSeconds||null,
    orientationMessage:settings?.orientation_message_template||surveyInitialOrientationDefaultTemplate()
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
function surveyTrainingVideoUrl(){return 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663067279939/eRSQOsqQYTCEppwp.mp4';}
function whatsappInviteCountMarkup(invite){
  if(!invite)return '';
  const count=Math.max(0,Number(invite.whatsapp_sent_count)||0);
  return `<span class="pill pill-blue whatsapp-invite-count" title="Aberturas pelo botão; não comprova envio ou entrega no WhatsApp">WhatsApp aberto: ${count} ${count===1?'vez':'vezes'}</span>`;
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
    '• Faça a coleta somente dentro da cidade ou região autorizada pela pesquisa. Fora da área, o aplicativo não permitirá iniciar;\n'+
    '• {{grupo}}\n\n'+
    '*Regras da coleta:*\n'+
    '• Aborde somente pessoas dentro do perfil definido no formulário;\n'+
    '• Leia as perguntas e registre exatamente o que a pessoa responder;\n'+
    '• Não invente, replique, acelere ou preencha entrevistas sem falar com o entrevistado;\n'+
    '• O sistema bloqueia o início se a nova coleta estiver a menos de 15 metros da coleta válida anterior desta mesma pesquisa. Coletas de pesquisas diferentes não entram nessa comparação, mas a cidade ou região, o tempo mínimo e as demais regras continuam valendo;\n'+
    '• Respeite o tempo mínimo calculado para o formulário. Coletas abaixo do mínimo serão rejeitadas e não serão contabilizadas para pagamento;\n'+
    '• Preserve a privacidade e nunca fotografe documentos;\n\n'+
    '*Controle de qualidade e confirmação gravada:*\n'+
    'O georreferenciamento, o horário e os dados da coleta podem ser verificados. Algumas entrevistas solicitarão que, no final, o entrevistado grave com sua voz a confirmação de que a entrevista realmente ocorreu e de que foram feitas todas as perguntas.\n\n'+
    'Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação do entrevistado no final. Explique o pedido com transparência e solicite a autorização antes de gravar.\n\n'+
    'Lembre-se: alguém pagou pela informação correta e você recebe por coletar esta informação. Quando todas as partes realizam a prática correta, todos ganham.\n\n'+
    '*Ranking e continuidade dos convites:*\n'+
    'O aplicativo mantém a aba Seu Ranking, onde você poderá ver sua nota e os motivos do resultado. A nota considera qualidade das respostas (30%), integridade da coleta (30%), duração da entrevista (20%) e distância entre coletas (20%). Notas menores que 80 reduzem a prioridade para novos convites; notas muito baixas podem fazer com que você deixe de ser convidado para novas coletas. O ranking é um indicador de qualidade e não substitui a análise da equipe.\n\n'+
    'A única forma de continuar recebendo convites para trabalhar é realizar entrevistas de verdade: falar com o entrevistado, registrar respostas fiéis e respeitar o formulário e todos os controles. Entrevistas inventadas, duplicadas ou feitas para burlar as regras podem ser rejeitadas, não gerar pagamento e levar ao desligamento da operação.\n\n'+
    '*Assista a este vídeo para entender como fazer as coletas corretamente e as regras para serem consideradas aptas:*\n{{video}}\n\n'+
    'Entrevistas que não respeitem o perfil, a cidade ou região, a distância mínima, o tempo ou as regras poderão ser anuladas e não serão consideradas nos resultados ou no pagamento. A mensagem de reprovação por tempo mínimo é: “Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real.” Pesquisadores que insistirem em descumprir as regras ou tentarem burlar os controles poderão ser desligados da operação.\n\n'+
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
  if(!/cidade ou região autorizada|fora da (?:cidade|área)|fora da região/i.test(message))mandatoryBlocks.push('Faça a coleta somente dentro da cidade ou região autorizada pela pesquisa. Fora da área, o aplicativo não permitirá iniciar.');
  if(!/menos de 15 metros|15 metros|quinze metros/i.test(message))mandatoryBlocks.push('O sistema bloqueia o início se a nova coleta estiver a menos de 15 metros da coleta válida anterior desta mesma pesquisa. Coletas de pesquisas diferentes não entram nessa comparação.');
  if(!/tempo mínimo calculado|abaixo do mínimo|tempo mínimo necessário/i.test(message))mandatoryBlocks.push('Respeite o tempo mínimo calculado para o formulário. Coletas abaixo do mínimo serão rejeitadas e não serão contabilizadas para pagamento.');
  if(!/algumas entrevistas solicitarão/i.test(message))mandatoryBlocks.push('Algumas entrevistas solicitarão que, no final, o entrevistado grave com sua voz a confirmação de que a entrevista realmente ocorreu e de que foram feitas todas as perguntas.');
  if(!/todas as entrevistas realizadas após as 21:00/i.test(message))mandatoryBlocks.push('Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação do entrevistado no final.');
  if(!/alguém pagou pela informação correta/i.test(message))mandatoryBlocks.push('Lembre-se: alguém pagou pela informação correta e você recebe por coletar esta informação. Quando todas as partes realizam a prática correta, todos ganham.');
  if(!/Seu Ranking|ranking/i.test(message))mandatoryBlocks.push('No Seu Ranking, você verá sua nota: respostas 30%, integridade 30%, duração 20% e distância 20%. Notas menores que 80 reduzem a prioridade para novos convites e notas muito baixas podem interromper novos convites.');
  if(!/entrevistas de verdade|continuar recebendo convites|novos convites/i.test(message))mandatoryBlocks.push('A única forma de continuar recebendo convites para trabalhar é realizar entrevistas de verdade, registrar respostas fiéis e respeitar todos os controles.');
  if(!/entrevistas reprovadas.*(?:pagamento|paga)|não serão contabilizadas para pagamento/i.test(message))mandatoryBlocks.push('Entrevistas reprovadas não entram nos resultados e não são contabilizadas para pagamento.');
  if(!/Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real/i.test(message))mandatoryBlocks.push('Quando a duração ficar abaixo do mínimo, o motivo informado será: “Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real.”');
  if(!message.includes(surveyTrainingVideoUrl()))mandatoryBlocks.push('Assista a este vídeo para entender como fazer as coletas corretamente e as regras para serem consideradas aptas: '+surveyTrainingVideoUrl());
  return mandatoryBlocks.length?message+'\n\n*Avisos obrigatórios da PesquisaPro:*\n'+mandatoryBlocks.join('\n\n'):message;
}
function validateSurveyOrientationTemplate(template,surveyName){
  const text=String(template||'').trim();
  if(!text)throw new Error('Defina as orientações iniciais antes de salvar a pesquisa. O modelo atual está disponível como sugestão.');
  if(text.length>3500)throw new Error('O modelo de orientações deve ter até 3.500 caracteres. Resuma-o antes de salvar.');
  const longResearcherName='Pesquisador(a) '+('Nome '.repeat(19));
  const exampleGroupLink='https://chat.whatsapp.com/'+('A'.repeat(55));
  const preview=surveyInitialOrientationWhatsappMessage({name:String(surveyName||'Pesquisa')},{name:longResearcherName},exampleGroupLink,text);
  if(preview.length>4000)throw new Error('Após inserir nome, link e avisos obrigatórios, a mensagem ultrapassaria 4.000 caracteres. Resuma o modelo para garantir o envio pelo aplicativo.');
  return text;
}
async function copySurveyInviteLink(inviteId){
  const link=surveyInviteLink(inviteId);
  try{await navigator.clipboard.writeText(link);alert('Link do convite copiado.');}
  catch(ex){window.prompt('Copie o link do convite:',link);}
}
let TEAM_INVITES=[],TEAM_INVITES_LOADED=false,TEAM_INVITES_LOADING=false,TEAM_INVITES_LOAD_ERROR=false;
let TEAM_COMM_SETTINGS=null,TEAM_COMM_SETTINGS_LOADED=false,TEAM_COMM_SETTINGS_LOADING=false,TEAM_BULK_INVITING=false;
let TEAM_RESEARCHER_LINK=null,TEAM_RESEARCHER_LINK_LOADED=false,TEAM_RESEARCHER_LINK_LOADING=false,TEAM_RESEARCHER_LINK_CREATING=false;
async function loadTeamInvitesIfNeeded(){
  const s=SURVEYS[TEAM_IDX];
  if(!s||TEAM_INVITES_LOADED||TEAM_INVITES_LOADING)return;
  TEAM_INVITES_LOADING=true;
  try{
    const {data,error}=await sb.from('survey_invites').select('*').eq('survey_id',s.id);
    if(error)throw error;
    TEAM_INVITES=data||[];TEAM_INVITES_LOAD_ERROR=false;
    TEAM_INVITES_LOADED=true;
  }catch(ex){ TEAM_INVITES_LOAD_ERROR=true;console.warn('Não foi possível carregar o histórico de convites:',ex); }
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
  return `<div class="card mb team-orientation-message-card"><div class="card-t">Orientações iniciais desta pesquisa</div><div class="card-d">A mensagem é enviada <b>automaticamente pelo aplicativo</b> após o aceite de novos convites. Você também pode reabrir o texto no WhatsApp ou reenviar manualmente a casos pendentes pela aba Coleta.</div><label class="lbl" for="team-orientation-message">Mensagem definida para a pesquisa</label><textarea class="inp team-orientation-message" id="team-orientation-message" rows="14" maxlength="3500">${esc(value)}</textarea><div class="team-communication-help">Placeholders: <code>{{pesquisador}}</code>, <code>{{pesquisa}}</code>, <code>{{grupo}}</code>, <code>{{site}}</code> e <code>{{video}}</code>. Máximo de 3.500 caracteres no modelo, 4.000 após personalização; gravação após 21:00 e integridade são obrigatórias. Se apagar o conteúdo, restaure o modelo padrão antes de salvar.</div><button class="btn btn-fill" style="margin-top:10px" onclick="saveTeamOrientationMessage()">Salvar orientações desta pesquisa</button></div>`;
}
async function saveTeamOrientationMessage(){
  const s=SURVEYS[TEAM_IDX];if(!s?.id)return;
  const input=document.getElementById('team-orientation-message');
  let text;
  try{text=validateSurveyOrientationTemplate(input?.value,s.name);}catch(ex){alert(ex.message);return;}
  try{
    const row={survey_id:s.id,orientation_message_template:text,updated_by:CURRENT_PROFILE?.id||null,updated_at:new Date().toISOString()};
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
  if(TEAM_ONLY_NEW&&(!TEAM_INVITES_LOADED||TEAM_INVITES_LOAD_ERROR))return [];
  const targets=surveyCityTargets(s),hasTarget=!!(targets.cities.size||targets.states.size),team=new Set(s.team||[]),f=TEAM_FILTERS,qq=normalizeUserSearch(f.text);
  return pesqUsers().map(u=>({u,area:pesqAreaMatch(u,targets)})).filter(({u,area})=>{
    if(team.has(u.name)||!researcherIsAvailable(u)||(hasTarget&&!area.match))return false;
    if(TEAM_ONLY_NEW&&TEAM_INVITES.some(invite=>invite.researcher_id===u.id))return false;
    if(!teamFilterMatches(u))return false;
    const locations=researcherLocations(u);
    const text=normalizeUserSearch([u.name,area.label,...locations.map(part=>part.city),...locations.map(part=>part.uf),schoolingLabel(u.escolaridade)].join(' '));
    return !qq||text.includes(qq);
  });
}
async function inviteEligibleResearchersBulk(){
  const s=SURVEYS[TEAM_IDX];if(!s||TEAM_BULK_INVITING)return;
  if(TEAM_ONLY_NEW&&(!TEAM_INVITES_LOADED||TEAM_INVITES_LOAD_ERROR)){alert('Aguarde o carregamento do histórico de convites antes de convidar somente novos pesquisadores.');return;}
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
    alert(returned.length+' convite'+(returned.length===1?'':'s')+' registrado'+(returned.length===1?'':'s')+'. Aparecerão no painel dos pesquisadores. Lembretes externos opcionais dependem da preferência de cada um e da ativação do worker de alertas.');
  }catch(ex){alert('Não foi possível enviar os convites em massa: '+ex.message);}
  TEAM_BULK_INVITING=false;go('survey-team');
}
async function ensureSurveyInvite(surveyId,researcherId){
  const {data:existing,error:selErr}=await sb.from('survey_invites').select('*').eq('survey_id',surveyId).eq('researcher_id',researcherId);
  if(selErr)throw new Error(selErr.message);
  const current=(existing||[])[0];
  if(current?.status==='aceito')return {row:current,alreadyAccepted:true};
  if(current){
    const {data:updated,error}=await sb.from('survey_invites').update({status:'pendente',invited_by:CURRENT_PROFILE.id,invited_at:new Date().toISOString(),responded_at:null}).eq('id',current.id).select().single();
    if(error)throw new Error(error.message);
    return {row:updated||{...current,status:'pendente'},alreadyAccepted:false};
  }
  const {data:inserted,error}=await sb.from('survey_invites').insert({survey_id:surveyId,researcher_id:researcherId,invited_by:CURRENT_PROFILE.id,status:'pendente'}).select().single();
  if(error)throw new Error(error.message);
  return {row:inserted,alreadyAccepted:false};
}
function rememberTeamInvite(row){
  if(!row?.id)return;
  const index=TEAM_INVITES.findIndex(item=>item.id===row.id);
  if(index>=0)TEAM_INVITES[index]=row;else TEAM_INVITES.push(row);
  TEAM_INVITES_LOADED=true;
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
    const result=await ensureSurveyInvite(s.id,researcherId);
    if(result.alreadyAccepted){alert('Esse pesquisador já aceitou o convite desta pesquisa.');return;}
    rememberTeamInvite(result.row);inviteId=result.row.id;
  }catch(ex){alert('Não foi possível criar o convite: '+ex.message);return;}
  const link=surveyInviteLink(inviteId);
  const groupLink=await teamWhatsappGroupUrl();
  const msg=surveyInvitationWhatsappMessage(s,u,link,groupLink);
  const tracking=recordSurveyInviteWhatsappSend(inviteId);
  window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(msg),'_blank','noopener');
  await tracking;
  go('survey-team');
}
async function inviteResearcherInApp(researcherId){
  const s=SURVEYS[TEAM_IDX];if(!s)return;
  const u=USERS.find(x=>x.id===researcherId);if(!u)return;
  try{
    const result=await ensureSurveyInvite(s.id,researcherId);
    if(result.alreadyAccepted){alert('Esse pesquisador já aceitou o convite desta pesquisa.');return;}
    rememberTeamInvite(result.row);
    alert('Convite registrado no aplicativo. O pesquisador verá a solicitação em “Meus dados” e no “Meu painel” ao entrar com a própria conta.');
  }catch(ex){alert('Não foi possível enviar o convite pelo aplicativo: '+ex.message);}
  go('survey-team');
}
let TEAM_IDX=null;
let TEAM_SHOW_OUT_OF_AREA=false; /* liga/desliga por pesquisa — reseta a cada entrada na tela */
let TEAM_ONLY_NEW=false; /* mostra somente aptos que nunca receberam convite */
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
function teamNewInviteCount(pesqs,hasTarget){
  if(!TEAM_INVITES_LOADED||TEAM_INVITES_LOAD_ERROR)return null;
  const team=new Set(SURVEYS[TEAM_IDX]?.team||[]);
  return pesqs.filter(({u,area})=>!team.has(u.name)&&researcherIsAvailable(u)&&(!hasTarget||area.match)&&!TEAM_INVITES.some(invite=>invite.researcher_id===u.id)).length;
}
function teamFiltersMarkup(pesqs,hasTarget){
  const {states,cities}=teamFilterOptions(pesqs),f=TEAM_FILTERS,newCount=teamNewInviteCount(pesqs,hasTarget);
  const newSummary=newCount==null?(TEAM_INVITES_LOAD_ERROR?'Não foi possível carregar o histórico de convites.':'Carregando histórico de convites…'):newCount+' pesquisador'+(newCount===1?'':'es')+' apto'+(newCount===1?'':'s')+' ainda não convidado'+(newCount===1?'':'s');
  return `<div class="team-filter-panel"><div class="team-filter-title"><div><b>Encontrar pesquisadores</b><span>Filtre por localização e escolaridade antes de convidar.</span></div><span class="pill pill-blue" id="team-available-count">— disponíveis</span></div><div class="team-new-invite-callout"><div><strong>Novos aptos sem convite</strong><span id="team-new-invite-summary">${newSummary}</span></div><label class="team-new-invite-toggle"><input type="checkbox" id="team-only-new" ${TEAM_ONLY_NEW?'checked':''} ${TEAM_INVITES_LOADED&&!TEAM_INVITES_LOAD_ERROR?'':'disabled'} onchange="teamToggleOnlyNew(this.checked)"><span>Mostrar somente estes</span></label></div><div class="team-filter-grid"><input class="inp" id="team-search" value="${esc(f.text)}" placeholder="Buscar por nome ou cidade…" oninput="teamSetFilter('text',this.value)"><select class="inp" aria-label="Filtrar equipe por estado" onchange="teamSetFilter('state',this.value)"><option value="">Todos os estados</option>${states.map(state=>`<option value="${esc(state)}" ${f.state===state?'selected':''}>${esc(state)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar equipe por cidade" onchange="teamSetFilter('city',this.value)"><option value="">Todas as cidades</option>${cities.map(([value,label])=>`<option value="${esc(value)}" ${f.city===value?'selected':''}>${esc(label)}</option>`).join('')}</select><select class="inp" aria-label="Filtrar equipe por escolaridade" onchange="teamSetFilter('schooling',this.value)"><option value="">Todas as escolaridades</option>${SCHOOLING_OPTIONS.map(([value,label])=>`<option value="${value}" ${f.schooling===value?'selected':''}>${esc(label)}</option>`).join('')}</select></div><div class="team-filter-note">${hasTarget?'A contagem considera pesquisadores ativos, com documentos completos, cidade cadastrada e compatíveis com a área da pesquisa.':'A contagem considera pesquisadores ativos, com documentos completos e cidade cadastrada.'}</div><button class="btn btn-fill team-bulk-invite-btn" id="team-bulk-invite" type="button" onclick="inviteEligibleResearchersBulk()">⚡ Convidar pelo aplicativo</button><div class="team-filter-help">O botão azul registra convites no aplicativo. Os alertas externos, quando configurados, respeitam as preferências do pesquisador. Com o filtro de novos aptos ativo, ele convida somente quem nunca recebeu convite. Para WhatsApp, use o botão individual <b>Convidar por WhatsApp</b> na linha de cada pesquisador.</div></div>`;
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
    const inv=TEAM_INVITES.find(i=>i.researcher_id===u.id);
    const locations=researcherLocations(u),stateKey=[...researcherStateSet(u)].join('|'),cityKey=[...researcherCitySet(u)].join('|'),searchKey=esc(normalizeUserSearch([u.name,area.label,...locations.map(part=>part.city),...locations.map(part=>part.uf),schoolingLabel(u.escolaridade)].join(' '))),available=researcherIsAvailable(u)&&(!hasTarget||area.match),novoApto=TEAM_INVITES_LOADED&&!TEAM_INVITES_LOAD_ERROR&&available&&!on&&!inv;
    // convite por WhatsApp: só faz sentido oferecer pra quem pode mesmo
    // entrar na equipe (não pend, não fora da área, ainda não está na equipe)
    const podeConvidar=!on&&!pend&&!naoSelecionavel&&researcherIsAvailable(u);
    let inviteHtml='';
    if(podeConvidar){
      if(inv&&inv.status==='pendente'){
        inviteHtml=`<span class="pill pill-amber">✉ convite enviado</span>${whatsappInviteCountMarkup(inv)}<button class="btn-ghost team-inapp-invite-btn" onclick="event.preventDefault();inviteResearcherInApp(${jsArg(u.id)})">↻ Reenviar pelo aplicativo</button><button class="btn-ghost team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">↗ Reenviar WhatsApp</button><button class="btn-ghost" style="font-size:11px;padding:4px 8px" onclick="event.preventDefault();copySurveyInviteLink('${inv.id}')">Copiar link</button>`;
      }else if(inv&&inv.status==='recusado'){
        inviteHtml=`<span class="pill pill-red">recusou o convite</span>${whatsappInviteCountMarkup(inv)}<button class="btn-ghost team-inapp-invite-btn" onclick="event.preventDefault();inviteResearcherInApp(${jsArg(u.id)})">✉ Convidar pelo aplicativo</button><button class="btn-ghost team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">↗ Reenviar WhatsApp</button><button class="btn-ghost" style="font-size:11px;padding:4px 8px" onclick="event.preventDefault();copySurveyInviteLink('${inv.id}')">Copiar link</button>`;
      }else{
        inviteHtml=`<button class="btn btn-fill team-inapp-invite-btn" onclick="event.preventDefault();inviteResearcherInApp(${jsArg(u.id)})">✉ Convidar pelo aplicativo</button><button class="btn btn-out team-whatsapp-invite-btn" onclick="event.preventDefault();inviteResearcherWhatsapp(${jsArg(u.id)})">✉ Convidar por WhatsApp</button>`;
      }
    }
    return `<label class="pick t-pesq-row" data-search="${searchKey}" data-state="${esc(stateKey)}" data-city="${esc([...researcherCitySet(u)].join('|'))}" data-schooling="${esc(u.escolaridade||'')}" data-available="${available?'1':'0'}" data-new-invite="${novoApto?'1':'0'}" data-fora="${naoSelecionavel?'1':'0'}" style="${(pend||foraDaArea||!researcherIsAvailable(u))?'opacity:.7':''}${hidden?';display:none':''}">
      <input type="checkbox" class="t-pesq" value="${esc(u.name)}" ${on?'checked':''} ${(pend||naoSelecionavel||(!researcherIsAvailable(u)&&!on))?'disabled':''}>
      <div class="avatar" style="width:30px;height:30px;font-size:11px">${esc(u.name).split(' ').map(n=>n[0]).join('')}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(u.name)}</div>
        <div style="font-size:11px;color:var(--ink3)">${esc(area.label)} · ${esc(schoolingLabel(u.escolaridade))}</div></div>
      ${area.match?'<span class="pill pill-green">● atua na área</span>':''}
      ${foraDaArea?`<span class="pill pill-gray">fora da área${on?' · já na equipe':''}</span>`:''}
      ${pend?'<span class="pill pill-amber">● aguardando aprovação</span>':''}
      ${!pend&&(!u.docFoto||!u.docComprovante)?'<span class="pill pill-red">● docs pendentes</span>':''}
      ${novoApto?'<span class="pill pill-blue team-new-invite-pill">✦ novo · sem convite</span>':''}
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
        <div class="card-d">Há três formas de convite: use o botão azul <b>Convidar por push</b> para vários pesquisadores, <b>Convidar pelo aplicativo</b> para deixar a solicitação no perfil do pesquisador ou <b>Convidar por WhatsApp</b> para abrir a mensagem completa. O aceite autenticado coloca o pesquisador automaticamente na equipe.</div>
        <div class="callout" style="margin-bottom:12px"><b>Fluxo seguro:</b> o link abre a tela de login. Depois de entrar com a própria conta, o pesquisador precisa tocar em <b>“Aceitar e entrar na equipe”</b>. Apenas o aceite autenticado grava o vínculo.</div>
        <div class="team-invite-summary">${TEAM_INVITES.length?TEAM_INVITES.map(i=>{const u=USERS.find(x=>x.id===i.researcher_id);return `<div class="team-invite-row"><div><b>${esc(u?u.name:'Pesquisador')}</b><small>${i.status==='aceito'?'Já está na equipe':i.status==='recusado'?'Recusou o convite':'Aguardando aceite'}</small></div><div class="team-invite-actions">${whatsappInviteCountMarkup(i)}${i.status!=='aceito'&&u?.id?`<button class="btn btn-fill team-inapp-invite-btn" onclick="inviteResearcherInApp(${jsArg(u.id)})">${i.status==='pendente'?'↻ Reenviar pelo app':'✉ Convidar pelo app'}</button><button class="btn btn-out team-whatsapp-invite-btn" onclick="inviteResearcherWhatsapp(${jsArg(u.id)})">${i.status==='pendente'?'↗ Reenviar WhatsApp':'✉ Enviar WhatsApp'}</button>`:''}${conversationButton(u?.phone,'Olá '+(u?.name||'pesquisador')+'! Podemos conversar sobre o convite da pesquisa?')}<span class="pill ${i.status==='aceito'?'pill-green':i.status==='recusado'?'pill-red':'pill-amber'}">${esc(i.status||'pendente')}</span></div></div>`;}).join(''):'<div class="empty" style="padding:12px 0">Nenhum convite enviado para esta pesquisa.</div>'}</div>
      </div>
      <div class="card">
        <div class="card-t" style="font-size:13px">Ainda não tem cadastro?</div>
        <div class="card-d">Cadastros novos continuam passando pela aprovação administrativa antes de coletar. Depois da aprovação, o pesquisador poderá receber convites específicos por pesquisa.</div>
        <button class="btn btn-out" onclick="alert('O cadastro público deve ser compartilhado pelo administrador responsável.')">Ver orientação de cadastro</button>
      </div>
    </div>
  </div>`;
};
function surveyTeam(idx){TEAM_IDX=idx;TEAM_SHOW_OUT_OF_AREA=false;TEAM_ONLY_NEW=false;TEAM_FILTERS={text:'',state:'',city:'',schooling:''};TEAM_INVITES=[];TEAM_INVITES_LOADED=false;TEAM_INVITES_LOAD_ERROR=false;TEAM_COMM_SETTINGS=null;TEAM_COMM_SETTINGS_LOADED=false;TEAM_COMM_SETTINGS_LOADING=false;TEAM_BULK_INVITING=false;TEAM_RESEARCHER_LINK=null;TEAM_RESEARCHER_LINK_LOADED=false;TEAM_RESEARCHER_LINK_LOADING=false;TEAM_RESEARCHER_LINK_CREATING=false;go('survey-team');setTimeout(teamFilterRows,0);}
/* liga/desliga a visibilidade de quem está fora da área, sem perder o que
   já foi marcado na tela (por isso mexe direto no DOM em vez de re-renderizar
   a página inteira) — quem está fora da área nunca fica marcável por aqui,
   só visível ou escondido. */
function teamToggleShowFora(checked){
  TEAM_SHOW_OUT_OF_AREA=checked;
  teamFilterRows();
}
function teamToggleOnlyNew(checked){
  TEAM_ONLY_NEW=checked;
  teamFilterRows();
}
function teamSetFilter(key,value){TEAM_FILTERS[key]=value||'';teamFilterRows();}
/* filtra a lista de pesquisadores sem re-renderizar (senão perderia o que já
   estava marcado enquanto a pessoa digita) e atualiza a contagem disponível. */
function teamFilterRows(){
  const qq=normalizeUserSearch(TEAM_FILTERS.text);
  const rows=[...document.querySelectorAll('#team-picklist .t-pesq-row')];
  let visible=0,available=0,newAvailable=0;
  rows.forEach(row=>{
    const matchesSearch=!qq||(row.dataset.search||'').includes(qq);
    const states=(row.dataset.state||'').split('|').filter(Boolean),cities=(row.dataset.city||'').split('|').filter(Boolean);
    const matchesFilters=(!TEAM_FILTERS.state||states.includes(TEAM_FILTERS.state))&&(!TEAM_FILTERS.city||cities.includes(TEAM_FILTERS.city))&&(!TEAM_FILTERS.schooling||row.dataset.schooling===TEAM_FILTERS.schooling);
    const isFora=row.dataset.fora==='1';
    const isNew=row.dataset.newInvite==='1';
    const show=matchesSearch&&matchesFilters&&(!isFora||TEAM_SHOW_OUT_OF_AREA)&&(!TEAM_ONLY_NEW||isNew);
    row.style.display=show?'':'none';
    if(show)visible++;
    if(show&&row.dataset.available==='1')available++;
    if(matchesSearch&&matchesFilters&&isNew)newAvailable++;
  });
  const noMatch=document.getElementById('team-no-match');
  if(noMatch)noMatch.style.display=visible?'none':'';
  const count=document.getElementById('team-available-count');
  if(count)count.textContent=TEAM_ONLY_NEW?available+' novo'+(available===1?'':'s')+' apto'+(available===1?'':'s'):available+' disponível'+(available===1?'':'is');
  const newSummary=document.getElementById('team-new-invite-summary');
  if(newSummary&&TEAM_INVITES_LOADED)newSummary.textContent=newAvailable+' pesquisador'+(newAvailable===1?'':'es')+' apto'+(newAvailable===1?'':'s')+' ainda não convidado'+(newAvailable===1?'':'s');
  const bulk=document.getElementById('team-bulk-invite');
  if(bulk){bulk.disabled=TEAM_BULK_INVITING||available===0;bulk.textContent=TEAM_BULK_INVITING?'Enviando convites por push…':TEAM_ONLY_NEW?'⚡ Convidar '+available+' novo'+(available===1?'':'s')+' apto'+(available===1?'':'s')+' por push':'⚡ Convidar '+available+' pesquisador'+(available===1?' elegível':'es elegíveis')+' por push';}
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
PAGES.quotas=()=>{
  if(!SURVEYS_LOADED){loadSurveysIfNeeded();return head('Metas e cotas','Acompanhamento por pesquisa')+'<div class="empty">Carregando pesquisas…</div>';}
  const active=SURVEYS.map((s,i)=>({s,i})).filter(({s})=>!s.archivedAt&&['campo','rascunho'].includes(s.status));
  return head('Metas e cotas','Consulte metas reais na aba Coleta ou edite o plano no formulário da pesquisa')+`
    <div class="callout mb">As metas são definidas e salvas ao criar ou editar o formulário da pesquisa. O acompanhamento utiliza somente as cotas e coletas registradas no banco. Importação automática de IBGE/TSE ainda não está disponível.</div>
    <div class="card"><div class="card-t">Pesquisas em andamento</div><div class="card-d">Escolha uma pesquisa para abrir a aba Metas de cotas da Coleta.</div>
      ${active.length?`<div class="table-scroll"><table><thead><tr><th>Pesquisa</th><th>Cotas configuradas</th><th>Amostra</th><th>Ação</th></tr></thead><tbody>${active.map(({s,i})=>`<tr><td><b>${esc(s.name)}</b></td><td>${surveyQuotas(s).length}</td><td>${surveySample(s).toLocaleString('pt-BR')}</td><td><button type="button" class="btn btn-out" onclick="openSurveyQuotaProgress(${i})">Ver metas reais</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhuma pesquisa em andamento.</div>'}
    </div>`;
};
function openSurveyQuotaProgress(index){
  const s=SURVEYS[index];if(!s||s.archivedAt)return;
  collectOpen(index);
  document.getElementById('collectTabMetasBtn')?.click();
}

/* ============ COLLECT (gestão de campo) ============ */
/* ============ COLLECT (lista de pesquisas → pesquisadores) ============ */
let COLLECT_IDX=null;
let COLLECT_ORIENTATION_COUNTS={},COLLECT_ORIENTATION_COUNTS_STATUS='idle',COLLECT_ORIENTATION_COUNTS_LOADING=false;
let COLLECT_INAPP_ORIENTATION_COUNTS={},COLLECT_INAPP_ORIENTATION_STATUS='idle',COLLECT_INAPP_ORIENTATION_LOADING=false;
let COLLECT_TEAM_INVITES=[],COLLECT_TEAM_INVITES_LOADED=false,COLLECT_TEAM_INVITES_LOADING=false,COLLECT_TEAM_INVITES_LOAD_ERROR=false;
let COLLECT_FUNNEL_TAB='available';
let COLLECT_FUNNEL_SEARCH={available:'',invited:'',accepted:'',team:''};
function surveyCoveragePct(collected,sample){
  const total=Number(sample)||0,done=Number(collected)||0;
  if(total<=0||done<=0)return '0%';
  const rounded=Math.round((done/total*100)*10)/10;
  return rounded.toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(rounded)?0:1,maximumFractionDigits:1})+'%';
}
function collectionOrientationResearcher(name){
  return USERS.find(u=>u.name===name)||null;
}
const COLLECTION_FUNNEL_STAGES={
  available:{label:'Disponível para convite',short:'Disponíveis',icon:'✦'},
  invited:{label:'Convidados',short:'Convidados',icon:'✉'},
  accepted:{label:'Novos aceitos',short:'Aceitos',icon:'✓'},
  team:{label:'Já na equipe',short:'Na equipe',icon:'◎'}
};
function collectionFunnelEntries(idx){
  const s=SURVEYS[idx];if(!s)return {available:[],invited:[],accepted:[],team:[]};
  const targets=surveyCityTargets(s),hasTarget=!!(targets.cities.size||targets.states.size);
  const teamNames=new Set(s.team||[]);
  const invitesById=new Map(COLLECT_TEAM_INVITES.map(invite=>[invite.researcher_id,invite]));
  const entries={available:[],invited:[],accepted:[],team:[]};
  pesqUsers().forEach(user=>{
    const invite=invitesById.get(user.id)||null;
    const area=pesqAreaMatch(user,targets);
    const eligible=researcherIsAvailable(user)&&(!hasTarget||area.match);
    const isTeam=teamNames.has(user.name)||invite?.status==='aceito';
    const orientationCount=invite?.status==='aceito'&&user.id
      ?Math.max(0,Number(COLLECT_ORIENTATION_COUNTS[user.id]?.send_count)||0):0;
    const inappCount=Math.max(0,Number(COLLECT_INAPP_ORIENTATION_COUNTS[user.id])||0);
    const stage=invite?.status==='aceito'&&inappCount===0?'accepted':
      isTeam?'team':invite?'invited':eligible?'available':null;
    if(!stage)return;
    entries[stage].push({user,invite,area,eligible,orientationCount,inappCount});
  });
  Object.values(entries).forEach(list=>list.sort((a,b)=>a.user.name.localeCompare(b.user.name,'pt-BR')));
  return entries;
}
function collectionFunnelWhatsAppButton(entry,s,stage){
  const user=entry.user;
  if(!user.phone)return '<span class="pill pill-gray">Sem WhatsApp cadastrado</span>';
  const context=stage==='available'
    ?'Olá '+user.name+'! Podemos conversar sobre o convite da pesquisa '+s.name+'?'
    :stage==='accepted'
      ?'Olá '+user.name+'! Podemos conversar sobre as orientações iniciais da pesquisa '+s.name+'?'
      :'Olá '+user.name+'! Podemos conversar sobre a pesquisa '+s.name+'?';
  return `<button type="button" class="btn-ghost conversation-btn" title="Abrir conversa no WhatsApp" onclick="event.preventDefault();event.stopPropagation();clientWhatsAppMsg(${jsArg(user.phone)},${jsArg(context)})">${icon3d('☏','#0f766e')}<span>Conversar no WhatsApp</span></button>`;
}
function collectionFunnelStageActions(entry,s,stage){
  const user=entry.user;
  const actions=[];
  if(stage==='available')actions.push(`<button type="button" class="btn btn-fill team-inapp-invite-btn" onclick="inviteCollectionFunnelResearcherInApp(${jsArg(user.id)})">✉ Convidar pelo aplicativo</button>`,`<button type="button" class="btn btn-out team-whatsapp-invite-btn" onclick="inviteCollectionFunnelResearcher(${jsArg(user.id)})">Abrir convite no WhatsApp</button>`);
  if(stage==='invited'&&entry.invite?.id)actions.push(`<button type="button" class="btn btn-fill team-inapp-invite-btn" onclick="inviteCollectionFunnelResearcherInApp(${jsArg(user.id)})">↻ Reenviar pelo aplicativo</button>`,`<button type="button" class="btn btn-out team-whatsapp-invite-btn" onclick="inviteCollectionFunnelResearcher(${jsArg(user.id)})">↗ Abrir no WhatsApp</button>`);
  if(stage==='accepted'||stage==='team')actions.push(`<button type="button" class="btn btn-fill collection-internal-message-btn" onclick="openSurveyInitialOrientationModal(${jsArg(user.id)},${jsArg(user.name)})">✉ Orientações pelo aplicativo</button>`);
  if(stage==='accepted')actions.push(`<button type="button" class="btn btn-out collection-funnel-orientation-btn" ${user.phone?'':'disabled'} onclick="sendCollectionOrientationWhatsapp(${jsArg(user.name)})">Abrir orientações no WhatsApp</button>`);
  if(stage==='team'&&user.id)actions.push(`<button type="button" class="btn btn-out collection-internal-message-btn" onclick="openSurveyResearcherMessageModal(${jsArg(user.id)},${jsArg(user.name)})">✉ Mensagem pelo aplicativo</button>`);
  actions.push(collectionFunnelWhatsAppButton(entry,s,stage));
  return actions.filter(Boolean).join('');
}
function collectionFunnelCard(entry,s,stage){
  const user=entry.user,area=entry.area?.label||'Área não informada';
  const status=stage==='available'?'<span class="pill pill-blue">Apto para convite</span>':stage==='invited'?`<span class="pill pill-amber">${entry.invite?.status==='recusado'?'Recusou · pode reenviar':'Aguardando aceite'}</span>`:stage==='accepted'?'<span class="pill pill-green">Aceitou · falta orientação</span>':'<span class="pill pill-green">Vinculado à pesquisa</span>';
  const extra=(stage==='accepted'||stage==='team')?`<small class="collection-funnel-orientation-count">Pelo aplicativo: ${entry.inappCount} · WhatsApp aberto: ${entry.orientationCount}</small>`:entry.invite?.status==='pendente'?`<small class="collection-funnel-orientation-count">WhatsApp aberto: ${Math.max(0,Number(entry.invite?.whatsapp_sent_count)||0)}</small>`:'';
  return `<article class="collection-funnel-person"><div class="collection-funnel-person-main"><div class="avatar" style="width:34px;height:34px;font-size:12px">${esc(initialsOf(user.name))}</div><div class="collection-funnel-person-copy"><div class="collection-funnel-person-title"><strong>${esc(user.name)}</strong>${status}</div><span>${esc(area)} · ${esc(schoolingLabel(user.escolaridade))}</span>${extra}</div></div><div class="collection-funnel-person-actions">${collectionFunnelStageActions(entry,s,stage)}</div></article>`;
}
function collectionFunnelPanelMarkup(stage,entries,s){
  const search=COLLECT_FUNNEL_SEARCH[stage]||'';
  const query=normalizeUserSearch(search);
  const filtered=entries.filter(entry=>!query||normalizeUserSearch(entry.user.name).includes(query));
  const title=COLLECTION_FUNNEL_STAGES[stage].label;
  const helper=stage==='available'?'Pesquisadores ativos, com cadastro completo e compatíveis com a área da pesquisa. Convide pelo aplicativo ou abra o WhatsApp.':stage==='invited'?'Convites pendentes ou recusados. Reenvie pelo aplicativo ou use o WhatsApp para acompanhar o aceite.':stage==='accepted'?'Novos aceites recebem orientações automaticamente. Para aceites anteriores sem orientação, use o envio pendente após revisar o modelo desta pesquisa.':'Pesquisadores já vinculados à equipe desta pesquisa.';
  const bulk=stage==='accepted'&&COLLECT_INAPP_ORIENTATION_STATUS==='ready'&&entries.length?`<div class="collection-funnel-bulk-orientation"><div><strong>Orientações pendentes: ${entries.length}</strong><span>O envio em lote só ocorre após sua confirmação. Quem já recebeu pelo aplicativo será ignorado.</span></div><button type="button" class="btn btn-fill" ${COLLECT_BATCH_ORIENTATION_SENDING?'disabled':''} onclick="sendPendingCollectionOrientations()">${COLLECT_BATCH_ORIENTATION_SENDING?'Enviando…':`Enviar aos ${entries.length} aceitos pendentes`}</button></div>`:'';
  return `<section class="collection-funnel-panel ${COLLECT_FUNNEL_TAB===stage?'is-active':''}" data-funnel-panel="${stage}" ${COLLECT_FUNNEL_TAB===stage?'':'hidden'}><div class="collection-funnel-panel-head"><div><h3>${title}</h3><p>${helper}</p></div><label class="collection-funnel-search"><span>Buscar por nome</span><input type="search" value="${esc(search)}" placeholder="Digite o nome do pesquisador" oninput="collectFunnelSetSearch('${stage}',this.value)" autocomplete="off"></label></div>${COLLECT_INAPP_ORIENTATION_STATUS==='unavailable'&&stage==='accepted'?'<div class="callout warn collection-funnel-warning">Contagem de orientações internas indisponível. Execute orientacoes-internas-coleta.sql no Supabase. A lista de pendências pode não refletir mensagens enviadas antes de recarregar.</div>':''}${bulk}<div class="collection-funnel-list">${filtered.length?filtered.map(entry=>collectionFunnelCard(entry,s,stage)).join(''):`<div class="collection-funnel-empty">${query?'Nenhum pesquisador corresponde a esta busca.':'Nenhum pesquisador neste estágio do funil.'}</div>`}</div></section>`;
}
let COLLECT_BATCH_ORIENTATION_SENDING=false;
async function sendPendingCollectionOrientations(){
  const idx=COLLECT_IDX,s=SURVEYS[idx];
  if(!s?.id||COLLECT_BATCH_ORIENTATION_SENDING||COLLECT_INAPP_ORIENTATION_STATUS!=='ready')return;
  const count=collectionFunnelEntries(idx).accepted.length;
  if(!count||!confirm(`Enviar orientações pelo aplicativo aos ${count} pesquisadores aceitos que ainda estão pendentes nesta pesquisa? Revise o modelo antes de confirmar. Pesquisadores já orientados não receberão de novo.`))return;
  COLLECT_BATCH_ORIENTATION_SENDING=true;renderCollectionTeamFunnel(idx);
  try{
    const {data,error}=await sb.rpc('send_pending_survey_initial_orientations',{p_survey_id:s.id});
    if(error)throw new Error(error.message);
    if(COLLECT_IDX===idx){COLLECT_INAPP_ORIENTATION_STATUS='idle';await loadCollectionInAppOrientationCounts(idx);}
    alert(`${Number(data?.sent_count)||0} orientação(ões) entregue(s) no aplicativo. ${Number(data?.skipped_count)||0} já haviam sido enviadas. ${Number(data?.failed_count)||0} falha(s).${Number(data?.failed_count)>0?' Confira o modelo de orientação e tente novamente; quem já recebeu não receberá duplicata.':''}`);
  }catch(ex){alert('Não foi possível enviar as orientações pendentes. Execute a migration orientacao-automatica-aceite.sql no Supabase e tente novamente. Detalhe: '+ex.message);}
  finally{COLLECT_BATCH_ORIENTATION_SENDING=false;if(COLLECT_IDX===idx)renderCollectionTeamFunnel(idx);}
}
function renderCollectionTeamFunnel(idx){
  const host=document.getElementById('collectionTeamFunnel');if(!host)return;
  const s=SURVEYS[idx];if(!s)return;
  const entries=collectionFunnelEntries(idx);
  const tabs=Object.entries(COLLECTION_FUNNEL_STAGES).map(([key,meta])=>`<button type="button" class="collection-funnel-tab ${COLLECT_FUNNEL_TAB===key?'is-active':''}" onclick="collectFunnelTab('${key}')"><span>${meta.icon}</span><b>${meta.short}</b><em>${entries[key].length}</em></button>`).join('');
  host.innerHTML=`<div class="collection-funnel-heading"><div><span class="eyebrow">PIPELINE DA EQUIPE</span><h2>Funil de recrutamento e ativação</h2><p>Acompanhe quem pode ser convidado, quem recebeu convite, quem aceitou e quem já está pronto para coletar.</p></div><span class="pill pill-green">${Object.values(entries).reduce((sum,list)=>sum+list.length,0)} pesquisadores no acompanhamento</span></div><div class="collection-funnel-tabs" role="tablist" aria-label="Estágios da equipe">${tabs}</div>${Object.keys(COLLECTION_FUNNEL_STAGES).map(stage=>collectionFunnelPanelMarkup(stage,entries[stage],s)).join('')}</div>`;
}
function collectFunnelTab(stage){
  if(!COLLECTION_FUNNEL_STAGES[stage])return;
  COLLECT_FUNNEL_TAB=stage;renderCollectionTeamFunnel(COLLECT_IDX);
}
function collectFunnelSetSearch(stage,value){
  if(!COLLECTION_FUNNEL_STAGES[stage])return;
  COLLECT_FUNNEL_SEARCH[stage]=value||'';renderCollectionTeamFunnel(COLLECT_IDX);
  const input=document.querySelector(`[data-funnel-panel="${stage}"] .collection-funnel-search input`);
  if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}
}
function rememberCollectionFunnelInvite(row){
  if(!row?.id)return;
  const index=COLLECT_TEAM_INVITES.findIndex(item=>item.id===row.id);
  if(index>=0)COLLECT_TEAM_INVITES[index]=row;else COLLECT_TEAM_INVITES.push(row);
  COLLECT_TEAM_INVITES_LOADED=true;
}
async function inviteCollectionFunnelResearcherInApp(researcherId){
  const s=SURVEYS[COLLECT_IDX],user=USERS.find(item=>item.id===researcherId);
  if(!s||!user)return;
  try{
    const result=await ensureSurveyInvite(s.id,researcherId);
    if(result.alreadyAccepted){alert('Este pesquisador já aceitou o convite desta pesquisa.');return;}
    rememberCollectionFunnelInvite(result.row);
    alert('Convite registrado no aplicativo. O pesquisador verá a solicitação em “Meus dados” e no “Meu painel”.');
  }catch(ex){alert('Não foi possível enviar o convite pelo aplicativo: '+ex.message);}
  renderCollectionTeamFunnel(COLLECT_IDX);
}
async function inviteCollectionFunnelResearcher(researcherId){
  const s=SURVEYS[COLLECT_IDX],user=USERS.find(item=>item.id===researcherId);
  if(!s||!user)return;
  const digits=whatsappDigits(user.phone);
  if(!digits){alert('Este pesquisador não tem celular cadastrado.');return;}
  let inviteId='';
  try{
    const {data:existing,error:selectError}=await sb.from('survey_invites').select('*').eq('survey_id',s.id).eq('researcher_id',researcherId);
    if(selectError)throw new Error(selectError.message);
    const row=(existing||[])[0];
    if(row?.status==='aceito'){alert('Este pesquisador já aceitou o convite desta pesquisa.');return;}
    if(row){
      const {error}=await sb.from('survey_invites').update({status:'pendente',invited_by:CURRENT_PROFILE?.id||null,invited_at:new Date().toISOString(),responded_at:null}).eq('id',row.id);
      if(error)throw new Error(error.message);
      row.status='pendente';row.invited_at=new Date().toISOString();inviteId=row.id;
      const local=COLLECT_TEAM_INVITES.find(item=>item.id===row.id);if(local)Object.assign(local,row);
    }else{
      const {data:inserted,error}=await sb.from('survey_invites').insert({survey_id:s.id,researcher_id:researcherId,invited_by:CURRENT_PROFILE?.id||null,status:'pendente'}).select().single();
      if(error)throw new Error(error.message);
      COLLECT_TEAM_INVITES.push(inserted);inviteId=inserted.id;
    }
  }catch(ex){alert('Não foi possível criar o convite: '+ex.message);return;}
  const link=surveyInviteLink(inviteId),settings=await collectionOrientationSettings(s.id);
  const message=surveyInvitationWhatsappMessage(s,user,link,settings.whatsapp_group_url||'');
  const tracking=sb.rpc('record_survey_invite_whatsapp_send',{p_invite_id:inviteId}).then(({data,error})=>{
    if(!error){const row=Array.isArray(data)?data[0]:data;const local=COLLECT_TEAM_INVITES.find(item=>item.id===inviteId);if(local&&row)Object.assign(local,row);}
  }).catch(ex=>console.warn('Contador do convite por WhatsApp indisponível:',ex));
  window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(message),'_blank','noopener');
  await tracking;
  renderCollectionTeamFunnel(COLLECT_IDX);
}
async function loadCollectionTeamFunnelIfNeeded(idx,force=false){
  const s=SURVEYS[idx];if(!s?.id||COLLECT_TEAM_INVITES_LOADING||(!force&&COLLECT_TEAM_INVITES_LOADED))return;
  if(!USERS_LOADED)await loadUsersIfNeeded();
  COLLECT_TEAM_INVITES_LOADING=true;
  try{
    const {data,error}=await sb.from('survey_invites').select('*').eq('survey_id',s.id);
    if(error)throw error;
    COLLECT_TEAM_INVITES=data||[];COLLECT_TEAM_INVITES_LOADED=true;COLLECT_TEAM_INVITES_LOAD_ERROR=false;
  }catch(ex){COLLECT_TEAM_INVITES_LOAD_ERROR=true;console.warn('Não foi possível carregar o funil da equipe:',ex);}
  COLLECT_TEAM_INVITES_LOADING=false;
  if(COLLECT_IDX===idx)renderCollectionTeamFunnel(idx);
}
async function refreshCollectionTeamFunnelLive(idx){
  if(!document.getElementById('collectionTeamFunnel'))return;
  await loadCollectionTeamFunnelIfNeeded(idx,true);
  if(COLLECT_IDX!==idx||COLLECT_ORIENTATION_COUNTS_LOADING)return;
  COLLECT_ORIENTATION_COUNTS_STATUS='idle';
  await loadCollectionOrientationCounts(idx);
}
function collectionOrientationCountMarkup(name){
  const user=collectionOrientationResearcher(name),id=user?.id;
  if(!id)return '<span class="pill pill-gray collection-orientation-count">Orientações: sem ID</span>';
  const count=COLLECT_ORIENTATION_COUNTS_STATUS==='ready'?Math.max(0,Number(COLLECT_ORIENTATION_COUNTS[id]?.send_count)||0):null;
  const inapp=COLLECT_INAPP_ORIENTATION_STATUS==='ready'?Math.max(0,Number(COLLECT_INAPP_ORIENTATION_COUNTS[id])||0):null;
  return `<span class="pill ${inapp?'pill-green':'pill-amber'} collection-orientation-count" title="Envios pelo app: registrados no banco. WhatsApp: apenas aberturas, sem confirmação de entrega">App: ${inapp===null?'—':inapp} · WhatsApp aberto: ${count===null?'—':count}</span>`;
}
function collectionTeamRows(s,team){
  return team.length?team.map(name=>{
    const user=collectionOrientationResearcher(name),phone=user?.phone||'';
    const validCount=COLLECT_EVENTS_LOADED?eventsForSurveyIdx(COLLECT_IDX).filter(e=>e.name===name&&e.status==='valid').length:null;
    const wa='https://wa.me/'+whatsappDigits(phone);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${esc(initialsOf(name))}</div>${esc(name)}</div></td>
      <td>${esc(user?.cidade||'Não informada')}</td>
      <td>${validCount===null?'Carregando…':validCount.toLocaleString('pt-BR')}</td>
      <td class="collection-team-actions">
        <div class="collection-orientation-action">${user?.id?`<button type="button" class="btn btn-fill collection-internal-message-btn" onclick="openSurveyInitialOrientationModal(${jsArg(user.id)},${jsArg(name)})">✉ Orientações pelo aplicativo</button>`:''}<button class="btn btn-out collection-orientation-btn" ${phone?'':'disabled'} onclick="sendCollectionOrientationWhatsapp(${jsArg(name)})">Abrir no WhatsApp</button>${collectionOrientationCountMarkup(name)}</div>
        ${user?.id?`<button type="button" class="btn btn-fill collection-internal-message-btn" onclick="openSurveyResearcherMessageModal(${jsArg(user.id)},${jsArg(name)})">✉ Mensagem pelo aplicativo</button>`:'<span class="pill pill-gray">Perfil sem ID</span>'}
        ${phone?`<a class="btn-ghost" style="color:var(--teal);display:inline-block" href="${wa}" target="_blank" rel="noopener" title="Abre uma conversa comum; não registra o envio das orientações">Conversar no WhatsApp</a>`:'<span class="pill pill-gray">Sem telefone</span>'}
      </td></tr>`;
  }).join(''):'<tr><td colspan="4" class="empty">Nenhum pesquisador vinculado. Atribua a equipe em Minhas pesquisas.</td></tr>';
}
let COLLECT_SURVEY_MESSAGE_SENDING=false,COLLECT_SURVEY_MESSAGE_TARGET_ID=null,COLLECT_SURVEY_MESSAGE_TARGET_NAME='',COLLECT_SURVEY_MESSAGE_KIND='message',COLLECT_SURVEY_ORIENTATION_GROUP='';
function closeSurveyResearcherMessageModal(){
  const modal=document.getElementById('surveyResearcherMessageModal');
  if(modal)modal.hidden=true;
  document.body.classList.remove('survey-message-modal-open');
  COLLECT_SURVEY_MESSAGE_TARGET_ID=null;COLLECT_SURVEY_MESSAGE_TARGET_NAME='';COLLECT_SURVEY_MESSAGE_KIND='message';COLLECT_SURVEY_ORIENTATION_GROUP='';
}
function openSurveyResearcherMessageModal(researcherId=null,researcherName=''){
  const s=SURVEYS[COLLECT_IDX];
  if(!s?.id||!['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role))return;
  COLLECT_SURVEY_MESSAGE_TARGET_ID=researcherId||null;COLLECT_SURVEY_MESSAGE_TARGET_NAME=researcherName||'';COLLECT_SURVEY_MESSAGE_KIND='message';COLLECT_SURVEY_ORIENTATION_GROUP='';
  let modal=document.getElementById('surveyResearcherMessageModal');
  if(!modal){modal=document.createElement('div');modal.id='surveyResearcherMessageModal';modal.className='survey-message-modal';document.body.appendChild(modal);}
  const isIndividual=!!researcherId;
  modal.innerHTML=`<div class="survey-message-backdrop" onclick="if(event.target===this)closeSurveyResearcherMessageModal()"></div><section class="survey-message-dialog" role="dialog" aria-modal="true" aria-labelledby="surveyMessageModalTitle"><button type="button" class="survey-message-close" aria-label="Fechar" onclick="closeSurveyResearcherMessageModal()">×</button><span class="eyebrow">COMUNICAÇÃO INTERNA</span><h2 id="surveyMessageModalTitle">${isIndividual?'Mensagem para '+esc(researcherName):'Mensagem para toda a equipe'}</h2><p class="survey-message-dialog-description">Pesquisa: <b>${esc(s.name)}</b>. ${isIndividual?'Somente este pesquisador verá a mensagem.':'Cada pesquisador vinculado receberá uma cópia privada no próprio painel.'}</p><form onsubmit="event.preventDefault();sendSurveyResearcherMessage()"><label class="lbl" for="surveyMessageBody">Mensagem</label><textarea id="surveyMessageBody" class="inp" rows="7" maxlength="4000" placeholder="Escreva um aviso, orientação ou atualização para ${isIndividual?'este pesquisador':'a equipe'}…" required></textarea><div class="survey-message-dialog-foot"><span>Até 4.000 caracteres</span><div><button type="button" class="btn btn-out" onclick="closeSurveyResearcherMessageModal()">Cancelar</button><button type="submit" class="btn btn-fill" id="surveyMessageSubmit">Enviar mensagem</button></div></div></form></section>`;
  modal.hidden=false;document.body.classList.add('survey-message-modal-open');setTimeout(()=>document.getElementById('surveyMessageBody')?.focus(),0);
}
async function openSurveyInitialOrientationModal(researcherId,researcherName){
  const idx=COLLECT_IDX,s=SURVEYS[idx],user=USERS.find(u=>u.id===researcherId);
  if(!s?.id||!user){alert('Selecione um pesquisador vinculado para enviar orientações.');return;}
  const settings=await collectionOrientationSettings(s.id);
  if(idx!==COLLECT_IDX)return;
  const text=surveyInitialOrientationWhatsappMessage(s,user,settings.whatsapp_group_url||'',settings.orientation_message_template||'');
  if(text.length>4000){alert('As orientações têm mais de 4.000 caracteres. Resuma o modelo desta pesquisa antes de enviá-las pelo aplicativo. Nenhum envio foi feito.');return;}
  openSurveyResearcherMessageModal(researcherId,researcherName);
  COLLECT_SURVEY_MESSAGE_KIND='orientation';
  COLLECT_SURVEY_ORIENTATION_GROUP=settings.whatsapp_group_url||'';
  document.getElementById('surveyMessageModalTitle').textContent='Orientações iniciais para '+researcherName;
  document.getElementById('surveyMessageBody').value=text;
}
async function sendSurveyResearcherMessage(){
  if(COLLECT_SURVEY_MESSAGE_SENDING)return;
  const s=SURVEYS[COLLECT_IDX],input=document.getElementById('surveyMessageBody'),draft=(input?.value||'').trim(),targetId=COLLECT_SURVEY_MESSAGE_TARGET_ID,kind=COLLECT_SURVEY_MESSAGE_KIND;
  const user=kind==='orientation'?USERS.find(u=>u.id===targetId):null;
  const body=kind==='orientation'&&user?surveyInitialOrientationWhatsappMessage(s,user,COLLECT_SURVEY_ORIENTATION_GROUP,draft):draft;
  if(!s?.id||!draft){alert('Escreva uma mensagem antes de enviar.');return;}
  if(body.length>4000){alert('A mensagem final, incluindo as regras obrigatórias, deve ter no máximo 4.000 caracteres. Reduza o texto personalizado; nenhum envio foi feito.');return;}
  if(kind==='orientation'&&!user){alert('Não foi possível identificar o pesquisador. Nenhum envio foi feito.');return;}
  if(kind==='orientation'&&body!==draft){input.value=body;alert('Os avisos obrigatórios foram recolocados no texto. Revise a mensagem exibida e clique em Enviar novamente. Nenhum envio foi feito.');return;}
  const targetLabel=targetId?COLLECT_SURVEY_MESSAGE_TARGET_NAME:'todos os '+(s.team||[]).length+' pesquisadores vinculados';
  if(!targetId&&!(s.team||[]).length){alert('Esta pesquisa ainda não possui pesquisadores vinculados.');return;}
  if(!confirm('Enviar '+(kind==='orientation'?'as orientações iniciais':'esta mensagem')+' para '+targetLabel+' pelo aplicativo?'))return;
  COLLECT_SURVEY_MESSAGE_SENDING=true;const button=document.getElementById('surveyMessageSubmit');if(button){button.disabled=true;button.textContent='Enviando…';}
  try{
    const {data,error}=kind==='orientation'
      ?await sb.rpc('send_survey_initial_orientation',{p_survey_id:s.id,p_researcher_id:targetId,p_body:body})
      :await sb.rpc('send_survey_researcher_message',{p_survey_id:s.id,p_body:body,p_researcher_id:targetId||null});
    if(error)throw new Error(error.message);
    const count=Number(data?.recipient_count)|| (targetId?1:(s.team||[]).length);
    if(kind==='orientation'&&targetId){COLLECT_INAPP_ORIENTATION_COUNTS[targetId]=(Number(COLLECT_INAPP_ORIENTATION_COUNTS[targetId])||0)+1;COLLECT_INAPP_ORIENTATION_STATUS='ready';refreshCollectionTeamRows(COLLECT_IDX);}
    closeSurveyResearcherMessageModal();
    alert((kind==='orientation'?'Orientações registradas no aplicativo para ':'Mensagem enviada para ')+count+' pesquisador'+(count===1?'':'es')+'. O conteúdo aparecerá no painel do destinatário. Isso não confirma a leitura.');
  }catch(ex){
    const migrationMissing=/send_survey_initial_orientation|send_survey_researcher_message|survey_researcher_message|relation .* does not exist|schema cache/i.test(ex.message||'');
    alert(migrationMissing?'O recurso ainda não está ativado no banco. Execute manualmente deploy/mensagens-pesquisa-pesquisadores.sql e depois deploy/orientacoes-internas-coleta.sql no Supabase; nenhum envio foi registrado.':'Não foi possível enviar a mensagem: '+ex.message);
  }finally{COLLECT_SURVEY_MESSAGE_SENDING=false;if(button){button.disabled=false;button.textContent='Enviar mensagem';}}
}
function refreshCollectionTeamRows(idx){
  const tbody=document.getElementById('collectTeamBody'),s=SURVEYS[idx];
  if(tbody&&s)tbody.innerHTML=collectionTeamRows(s,s.team||[]);
  renderCollectionTeamFunnel(idx);
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
async function loadCollectionInAppOrientationCounts(idx){
  const s=SURVEYS[idx];
  if(!s?.id||COLLECT_INAPP_ORIENTATION_LOADING||COLLECT_INAPP_ORIENTATION_STATUS!=='idle')return;
  COLLECT_INAPP_ORIENTATION_LOADING=true;COLLECT_INAPP_ORIENTATION_STATUS='loading';
  try{
    const {data,error}=await sb.rpc('get_survey_orientation_inapp_counts',{p_survey_id:s.id});
    if(error)throw error;
    if(COLLECT_IDX===idx){
      COLLECT_INAPP_ORIENTATION_COUNTS={};
      (data||[]).forEach(row=>{COLLECT_INAPP_ORIENTATION_COUNTS[row.researcher_id]=Number(row.send_count)||0;});
      COLLECT_INAPP_ORIENTATION_STATUS='ready';
    }
  }catch(ex){
    if(COLLECT_IDX===idx)COLLECT_INAPP_ORIENTATION_STATUS='unavailable';
    console.warn('Contagem de orientações no aplicativo indisponível; execute a migration orientacoes-internas-coleta.sql:',ex);
  }
  COLLECT_INAPP_ORIENTATION_LOADING=false;
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
  /* Apenas tenta abrir o rascunho; o WhatsApp não fornece prova de envio
     ou entrega por wa.me. O contador registra tentativas de abertura. */
  window.open(target,'_blank','noopener,noreferrer');
  try{
    const {data,error}=await sb.rpc('record_survey_orientation_whatsapp_send',{p_survey_id:s.id,p_researcher_id:user.id});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(row)COLLECT_ORIENTATION_COUNTS[user.id]=row;
    COLLECT_ORIENTATION_COUNTS_STATUS='ready';
    refreshCollectionTeamRows(COLLECT_IDX);
  }catch(ex){
    console.warn('Abertura do WhatsApp sem contador; execute contador-orientacoes-whatsapp-coleta.sql:',ex);
    alert('Foi solicitada a abertura do WhatsApp, mas a tentativa não foi registrada no contador: '+(ex.message||String(ex)));
  }
}
PAGES.collect=()=>{
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
  if(COLLECT_IDX==null)return collectList();
  return collectDetail(COLLECT_IDX);
};
function collectList(){
  const active=SURVEYS.map((s,i)=>({s,i})).filter(x=>!x.s.archivedAt&&(x.s.status==='campo'||x.s.status==='rascunho'));
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
function collectOpen(i){COLLECT_IDX=i;COLLECT_ARMED=true;AUDIT_INTERNAL_VIEW='flagged';AUDIT_FLAGGED_COUNT=0;COLLECT_ORIENTATION_COUNTS={};COLLECT_ORIENTATION_COUNTS_STATUS='loading';COLLECT_ORIENTATION_COUNTS_LOADING=false;COLLECT_INAPP_ORIENTATION_COUNTS={};COLLECT_INAPP_ORIENTATION_STATUS='idle';COLLECT_INAPP_ORIENTATION_LOADING=false;COLLECT_TEAM_INVITES=[];COLLECT_TEAM_INVITES_LOADED=false;COLLECT_TEAM_INVITES_LOADING=false;COLLECT_TEAM_INVITES_LOAD_ERROR=false;COLLECT_FUNNEL_TAB='available';COLLECT_FUNNEL_SEARCH={available:'',invited:'',accepted:'',team:''};COLLECT_EVOLUTION_MODE='day';disposeCollectEvolutionChart();_collectMapFilters={researcher:'all',researcherQuery:'',status:'all',latest:false};_collectMapFocusId=null;_collectMapDidFit=false;go('collect');}
function collectBack(){COLLECT_IDX=null;COLLECT_ORIENTATION_COUNTS={};COLLECT_ORIENTATION_COUNTS_STATUS='idle';COLLECT_ORIENTATION_COUNTS_LOADING=false;COLLECT_INAPP_ORIENTATION_COUNTS={};COLLECT_INAPP_ORIENTATION_STATUS='idle';COLLECT_INAPP_ORIENTATION_LOADING=false;COLLECT_TEAM_INVITES=[];COLLECT_TEAM_INVITES_LOADED=false;COLLECT_TEAM_INVITES_LOADING=false;COLLECT_TEAM_INVITES_LOAD_ERROR=false;disposeCollectEvolutionChart();_collectMapFocusId=null;go('collect');}
let COLLECT_ARMED=false;
function collectDetail(idx){
  const s=SURVEYS[idx];if(!s)return collectList();
  const team=s.team||[];
  const rows=collectionTeamRows(s,team);
  if(!COLLECT_TEAM_INVITES_LOADED)loadCollectionTeamFunnelIfNeeded(idx);
  if(COLLECT_ORIENTATION_COUNTS_STATUS==='idle')loadCollectionOrientationCounts(idx);
  if(COLLECT_INAPP_ORIENTATION_STATUS==='idle')loadCollectionInAppOrientationCounts(idx);
  const sample=surveySample(s);
  const statusCounts=collectStatusCounts(idx);
  const collected=statusCounts.valid;
  const mapResearchers=[...new Set(team)].sort((a,b)=>a.localeCompare(b));
  const mapResearcherOptions=mapResearchers.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  const researcherSearchMarkup=`<div class="collect-researcher-search" role="search" aria-label="Buscar coletas por pesquisador"><label><span>Buscar pesquisador</span><input id="collectResearcherSearch" type="search" value="${esc(_collectMapFilters.researcherQuery||'')}" placeholder="Digite o nome do pesquisador" list="collectResearcherOptions" oninput="collectApplyResearcherSearch(this.value)" autocomplete="off"><datalist id="collectResearcherOptions">${mapResearchers.map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist></label><button type="button" class="btn btn-out" onclick="collectClearResearcherSearch()">Limpar</button><span id="collectResearcherSearchSummary" class="collect-researcher-search-summary">Todas as coletas</span></div>`;
  return head('Coleta e campo — '+s.name,'Pesquisadores vinculados a esta pesquisa',
    '<button class="btn btn-out" onclick="collectBack()">← Pesquisas</button><button type="button" class="btn btn-out" disabled title="Exportação bruta indisponível; não gera CSV/SPSS">Exportar dados · indisponível</button>')+`
  <div class="grid g5" style="margin-bottom:16px">
    ${stat('Pesquisadores',String(team.length),'vinculados','☺','#2563eb')}
    ${stat('Coletado',collected.toLocaleString('pt-BR'),'de '+sample.toLocaleString('pt-BR'),'✓','#059669','collectCollectedStat')}
    ${stat('Coletas válidas',statusCounts.valid.toLocaleString('pt-BR'),'status válido','✓','#0f766e','collectValidStat')}
    ${stat('Coletas rejeitadas',statusCounts.rejected.toLocaleString('pt-BR'),'status rejeitado','✕','#dc2626','collectRejectedStat')}
    ${stat('Status',s.status==='campo'?'Em campo':'Rascunho','','◷','#d97706')}
  </div>

  ${researcherSearchMarkup}

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <div class="seg" id="collectTabSeg">
      <button class="on" data-collect-tab="equipe" onclick="collectTab(this,'equipe')">Equipe</button>
      <button id="collectTabMapaBtn" data-collect-tab="mapa" onclick="collectTab(this,'mapa')">📍 Mapa ao vivo</button>
      <button id="collectTabAuditoriaBtn" data-collect-tab="auditoria" onclick="collectTab(this,'auditoria')">🔎 Auditoria</button>
      <button id="collectTabMetasBtn" data-collect-tab="metas" onclick="collectTab(this,'metas')">🎯 Metas de cotas</button>
      <button id="collectTabEvolucaoBtn" data-collect-tab="evolucao" onclick="collectTab(this,'evolucao')">📈 Evolução da coleta</button>
    </div>
    <span class="pill pill-green" style="margin-left:auto"><span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;animation:fade 1.4s ease-in-out infinite alternate"></span> Atualizando ao vivo</span>
  </div>

  <div id="collectTabEquipe">
    <div class="card mb">
      <div class="card-t">Equipe vinculada</div>
      <div class="card-d">Envie orientações iniciais pelo aplicativo. WhatsApp é opcional e seu contador registra somente abertura do link, nunca envio ou leitura comprovados.</div>
      <div class="callout collection-orientation-callout"><b>Orientações iniciais:</b> use o botão “Orientações pelo aplicativo” em cada pesquisador. O texto segue o modelo editável da pesquisa e aparecerá no painel individual, sem exigir WhatsApp. O contador “App” registra o envio; ele não confirma leitura.<div class="collection-internal-message-callout"><div><strong>Mensagem interna da pesquisa</strong><span>Envie um aviso pelo aplicativo para toda a equipe. A mensagem ficará privada no painel de cada pesquisador.</span></div><button type="button" class="btn btn-fill collection-internal-message-broadcast" onclick="openSurveyResearcherMessageModal()" ${team.length?'':'disabled'}>✉ Enviar para toda a equipe${team.length?' ('+team.length+')':''}</button></div></div>
      <div id="collectionTeamFunnel" class="collection-funnel-card"><div class="empty" style="padding:18px 0">Carregando funil da equipe…</div></div>
      <div class="table-scroll"><table><thead><tr><th>Pesquisador</th><th>Cidade cadastrada</th><th>Coletas válidas</th><th>Orientações e contato</th></tr></thead>
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
    ${auditMinimumDurationMarkup(s)}
    ${auditInternalNavigationMarkup(idx)}
    <section id="auditFlaggedWrap" class="card mb audit-focus-panel" data-audit-focus-panel="flagged" ${auditInternalCounts(idx).total?'':'hidden'}>
      <div class="card-t">Reprovações e calibrações desta pesquisa</div>
      <div class="card-d">Coletas marcadas na auditoria abaixo. Desfaça a qualquer momento — a coleta volta a valer normalmente.</div>
      <div id="auditFlagged"></div>
    </section>
    <section class="card audit-focus-panel" data-audit-focus-panel="all" ${AUDIT_INTERNAL_VIEW==='all'||!auditInternalCounts(idx).total?'':'hidden'}>
      <div class="card-t">Auditoria da coleta</div>
      <div class="card-d">Todas as entrevistas desta pesquisa: pesquisador, cota, coordenadas (com a distância até a coleta anterior do mesmo pesquisador), horário, intervalo desde a entrevista anterior, confirmação final e alertas de qualidade. Aproximadamente 20% podem ser selecionadas para uma confirmação curta em áudio, sempre com autorização do entrevistado. Reprove uma coleta com fraude/erro (não entra no pagamento do pesquisador) ou marque como calibração (fica fora do cálculo dos resultados, mas continua contando para o pagamento). As duas ações podem ser desfeitas a qualquer momento, aqui ou no painel acima.</div>
      <div id="auditRecordingSummary" class="recording-summary"></div>
      <div class="audit-table-scroll-hint" role="note"><span aria-hidden="true">✓</span><span><b>Visão completa:</b> todas as informações e ações estão organizadas na tela, sem rolagem horizontal.</span></div>
      <div class="audit-table-scroll" tabindex="0" aria-label="Tabela de auditoria com todas as informações e ações visíveis.">
      <table class="audit-data-table"><thead><tr><th>Pesquisador</th><th>Cota</th><th>Data/hora</th><th title="Tempo desde a entrevista anterior do mesmo pesquisador">Intervalo</th><th>Coordenadas</th><th>Precisão</th><th>Status</th><th>Duração</th><th>Confirmação</th><th>Alertas</th><th class="audit-actions-header">Ações</th></tr></thead>
      <tbody id="auditBody"></tbody></table>
      </div>
    </section>
  </div>

  <div id="collectTabMetas" style="display:none">
    <div class="card collect-quota-progress-card">
      <div class="collect-quota-progress-head">
        <div><div class="map-eyebrow">ACOMPANHAMENTO DE CAMPO</div><div class="card-t">Metas de cotas</div><div class="card-d">Veja o avanço de cada cota desta pesquisa com base nas entrevistas válidas registradas.</div></div>
        <button type="button" class="btn btn-out" onclick="collectQuotaProgressRefresh()">↻ Atualizar metas</button>
      </div>
      <div id="collectQuotaProgressBody"><div class="empty" style="padding:28px 0">Carregando metas reais…</div></div>
    </div>
  </div>

  <div id="collectTabEvolucao" style="display:none">
    <div class="card collect-evolution-card">
      <div class="collect-evolution-head">
        <div><div class="map-eyebrow">RITMO DE CAMPO</div><div class="card-t">Evolução da coleta</div><div class="card-d">Acompanhe quantas entrevistas válidas foram realizadas ao longo do tempo, por dia ou por mês.</div></div>
        <div class="collect-evolution-actions"><div class="seg collect-evolution-mode" id="collectEvolutionMode"><button type="button" class="on" data-evolution-mode="day" onclick="collectEvolutionModeSet(this,'day')">Por dia</button><button type="button" data-evolution-mode="month" onclick="collectEvolutionModeSet(this,'month')">Por mês</button></div><button type="button" class="btn btn-out" onclick="collectEvolutionRefresh()">↻ Atualizar</button></div>
      </div>
      <div id="collectEvolutionSummary" class="collect-evolution-summary"></div>
      <div class="collect-evolution-chart-wrap"><canvas id="collectEvolutionChart" role="img" aria-label="Gráfico da evolução das coletas válidas"></canvas><div id="collectEvolutionEmpty" class="empty" style="display:none">Ainda não há entrevistas válidas suficientes para montar a evolução.</div></div>
      <div id="collectEvolutionNote" class="collect-evolution-note">Considera somente entrevistas válidas, como o indicador Coletado. Reprovações ficam fora; calibrações permanecem no volume coletado, mas não entram nas metas de cotas. As datas usam o horário local da coleta.</div>
    </div>
  </div>`;
}

function collectTab(btn,which){
  document.querySelectorAll('#collectTabSeg button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  const map={equipe:'collectTabEquipe',mapa:'collectTabMapa',auditoria:'collectTabAuditoria',metas:'collectTabMetas',evolucao:'collectTabEvolucao'};
  Object.entries(map).forEach(([k,id])=>{
    const el=document.getElementById(id);
    if(el)el.style.display=(k===which)?'block':'none';
  });
  if(which==='mapa'){
    renderCollectMap(COLLECT_IDX);
    setTimeout(()=>{if(_collectMap)_collectMap.invalidateSize();if(_collectMapFocusId)focusCollectMapEvent(_collectMapFocusId);},120);
  }
  if(which==='auditoria'){renderAudit(COLLECT_IDX);}
  if(which==='metas'){renderCollectQuotaProgress(COLLECT_IDX);}
  if(which==='evolucao'){renderCollectEvolution(COLLECT_IDX);}
}

function collectQuotaProgressRows(idx){
  const s=SURVEYS[idx];
  if(!s)return {quotas:[],done:0,target:0};
  const quotas=surveyQuotas(s);
  const events=eventsForSurveyIdx(idx).filter(e=>e.status==='valid'&&!e.calibration&&e.cota);
  const counts={};
  events.forEach(e=>{counts[e.cota]=(counts[e.cota]||0)+1;});
  const rows=quotas.map(q=>{
    const collected=Math.min(counts[q.label]||0,q.target);
    const remaining=Math.max(0,q.target-collected);
    const pct=q.target?Math.min(100,Math.round(collected/q.target*100)):0;
    return {...q,collected,remaining,pct};
  });
  return {quotas:rows,done:rows.reduce((sum,row)=>sum+row.collected,0),target:rows.reduce((sum,row)=>sum+row.target,0)};
}
function collectQuotaStatus(row){
  if(row.pct>=100)return '<span class="pill pill-green">✓ Meta atingida</span>';
  if(row.pct<50)return '<span class="pill pill-red">● Atenção</span>';
  return '<span class="pill pill-amber">● Em andamento</span>';
}
function renderCollectQuotaProgress(idx){
  const host=document.getElementById('collectQuotaProgressBody');if(!host)return;
  const s=SURVEYS[idx];if(!s){host.innerHTML='<div class="empty" style="padding:20px 0">Selecione uma pesquisa para acompanhar as metas.</div>';return;}
  if(COLLECT_EVENTS_LOADING&&!COLLECT_EVENTS_LOADED){host.innerHTML='<div class="empty" style="padding:28px 0">Carregando entrevistas válidas…</div>';return;}
  const {quotas,done,target}=collectQuotaProgressRows(idx);
  if(!quotas.length){host.innerHTML='<div class="collect-quota-empty"><strong>Esta pesquisa não possui metas de cotas configuradas.</strong><span>As entrevistas podem ser acompanhadas livremente na aba Equipe e na Auditoria.</span></div>';return;}
  const overallPct=target?Math.min(100,Math.round(done/target*100)):0;
  const updated=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const colors=['#2563eb','#059669','#ea580c','#7c3aed','#0891b2','#d97706'];
  host.innerHTML=`<div class="collect-quota-summary"><div class="collect-quota-summary-main"><span>Avanço geral das cotas</span><strong>${done.toLocaleString('pt-BR')} <small>de ${target.toLocaleString('pt-BR')}</small></strong><div class="bar collect-quota-overall-bar"><span style="width:${overallPct}%"></span></div><em>${overallPct}% da meta consolidada · ${Math.max(0,target-done).toLocaleString('pt-BR')} entrevista${target-done===1?'':'s'} restante${target-done===1?'':'s'}</em></div><div class="collect-quota-summary-stats"><div><b>${quotas.length}</b><span>cotas configuradas</span></div><div><b>${quotas.filter(row=>row.pct>=100).length}</b><span>metas atingidas</span></div></div></div><div class="collect-quota-grid">${quotas.map((row,i)=>`<article class="collect-quota-item"><div class="collect-quota-item-head"><div><strong>${esc(row.label)}</strong><small>${esc(row.questionText||'Cota da pesquisa')}</small></div>${collectQuotaStatus(row)}</div><div class="collect-quota-item-numbers"><b>${row.collected.toLocaleString('pt-BR')}</b><span>de ${row.target.toLocaleString('pt-BR')} entrevistas</span><strong>${row.remaining.toLocaleString('pt-BR')} restante${row.remaining===1?'':'s'}</strong></div><div class="bar collect-quota-bar"><span style="width:${row.pct}%;background:${colors[i%colors.length]}"></span></div><div class="collect-quota-item-foot"><span>${row.pct}% preenchida</span><span>Atualizado às ${updated}</span></div></article>`).join('')}</div><div class="collect-quota-note">O acompanhamento considera somente entrevistas <b>válidas</b> e exclui reprovações e calibrações. A atualização acompanha o mesmo ciclo de 20 segundos da tela de coleta.</div>`;
}
function collectQuotaProgressRefresh(){
  if(COLLECT_IDX==null)return;
  renderCollectQuotaProgress(COLLECT_IDX);
  pollCollectEvents(COLLECT_IDX);
}

let COLLECT_EVOLUTION_MODE='day',_collectEvolutionChart=null;
function collectEvolutionKey(ts,mode){
  const date=new Date(ts),year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0');
  return mode==='month'?year+'-'+month:year+'-'+month+'-'+String(date.getDate()).padStart(2,'0');
}
function collectEvolutionLabel(key,mode){
  const parts=key.split('-').map(Number),date=new Date(parts[0],parts[1]-1,mode==='month'?1:parts[2]);
  return mode==='month'?date.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.',''):date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}
function collectEvolutionSeries(idx,mode){
  const valid=eventsForSurveyIdx(idx).filter(event=>event.status==='valid'&&Number.isFinite(Number(event.ts)));
  const counts=new Map();
  valid.forEach(event=>{const key=collectEvolutionKey(event.ts,mode);counts.set(key,(counts.get(key)||0)+1);});
  const keys=[...counts.keys()].sort();
  return {valid,rows:keys.map(key=>({key,label:collectEvolutionLabel(key,mode),count:counts.get(key)||0}))};
}
function collectEvolutionSummaryMarkup(series){
  if(!series.rows.length)return '';
  const total=series.valid.length,peak=series.rows.reduce((best,row)=>row.count>best.count?row:best,series.rows[0]);
  const first=series.rows[0].label,last=series.rows[series.rows.length-1].label,average=(total/series.rows.length).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  return `<div class="collect-evolution-stat"><span>Total válido</span><strong>${total.toLocaleString('pt-BR')}</strong><small>entrevistas</small></div><div class="collect-evolution-stat"><span>Período</span><strong>${esc(first)}${first===last?'':' — '+esc(last)}</strong><small>primeiro e último registro</small></div><div class="collect-evolution-stat"><span>Média no período</span><strong>${average}</strong><small>por ${COLLECT_EVOLUTION_MODE==='month'?'mês':'dia'}</small></div><div class="collect-evolution-stat"><span>Maior volume</span><strong>${peak.count.toLocaleString('pt-BR')}</strong><small>${esc(peak.label)}</small></div>`;
}
function disposeCollectEvolutionChart(){
  if(_collectEvolutionChart){try{_collectEvolutionChart.destroy();}catch(ex){} _collectEvolutionChart=null;}
}
function renderCollectEvolution(idx){
  const host=document.getElementById('collectEvolutionSummary'),canvas=document.getElementById('collectEvolutionChart'),empty=document.getElementById('collectEvolutionEmpty');
  if(!host||!canvas)return;
  if(COLLECT_EVENTS_LOADING&&!COLLECT_EVENTS_LOADED){host.innerHTML='<div class="empty" style="grid-column:1/-1;padding:16px 0">Carregando histórico de coletas…</div>';if(empty)empty.style.display='none';return;}
  const series=collectEvolutionSeries(idx,COLLECT_EVOLUTION_MODE);
  host.innerHTML=collectEvolutionSummaryMarkup(series);
  disposeCollectEvolutionChart();
  if(!series.rows.length){canvas.style.display='none';if(empty)empty.style.display='';return;}
  canvas.style.display='';if(empty)empty.style.display='none';
  if(typeof Chart==='undefined'){
    loadLocalAsset('chart').then(()=>{if(document.getElementById('collectEvolutionChart')===canvas)renderCollectEvolution(idx);}).catch(()=>{});
    return;
  }
  _collectEvolutionChart=new Chart(canvas,{type:'line',data:{labels:series.rows.map(row=>row.label),datasets:[{label:'Entrevistas válidas',data:series.rows.map(row=>row.count),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.13)',fill:true,tension:.3,pointRadius:series.rows.length>30?1.5:3,pointHoverRadius:5,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>' '+context.parsed.y.toLocaleString('pt-BR')+' entrevista'+(context.parsed.y===1?'':'s')}}},scales:{y:{beginAtZero:true,precision:0,ticks:{precision:0},grid:{color:'#e2e8f0'}},x:{grid:{display:false},ticks:{maxTicksLimit:COLLECT_EVOLUTION_MODE==='month'?18:16,maxRotation:0}}}}});
}
function collectEvolutionModeSet(btn,mode){
  COLLECT_EVOLUTION_MODE=mode==='month'?'month':'day';
  document.querySelectorAll('#collectEvolutionMode button').forEach(item=>item.classList.toggle('on',item===btn));
  renderCollectEvolution(COLLECT_IDX);
}
function collectEvolutionRefresh(){
  if(COLLECT_IDX==null)return;
  renderCollectEvolution(COLLECT_IDX);
  pollCollectEvents(COLLECT_IDX);
}

/* ===== Coleta de campo: mapa, feed e auditoria (dados reais, tabela collection_events) ===== */
const COLLECT_COLORS=['#2563eb','#059669','#ea580c','#7c3aed','#dc2626','#d97706'];
const COLLECT_MIN_DURATION_REJECTION_MESSAGE='Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real';
const COLLECT_TOO_CLOSE_MESSAGE='Esta coleta está muito próxima da anterior e isso compromete a qualidade da pesquisa, entreviste em um local mais distante';
const COLLECT_OUTSIDE_AREA_MESSAGE='Esta coleta está fora da cidade ou região determinada pela pesquisa e não pode ser realizada aqui.';
const COLLECT_AREA_CONFIRMATION_MESSAGE='Não foi possível confirmar a cidade ou região da localização atual. Ative o GPS e tente novamente.';
const COLLECT_EVENT_SELECT_BASE='id,survey_id,researcher_id,quota_label,lat,lng,accuracy_m,occurred_at,synced,flags,status,reject_reason,rejected_at,is_calibration';
const COLLECT_EVENT_SELECT_DURATION=COLLECT_EVENT_SELECT_BASE+',duration_seconds';
const COLLECT_EVENT_SELECT=COLLECT_EVENT_SELECT_DURATION+',recording_reservation_id,recording_required,recording_consent,recording_status,recording_error,recording_created_at';
const COLLECT_EVENT_SELECT_RECORDING_NO_DURATION=COLLECT_EVENT_SELECT_BASE+',recording_reservation_id,recording_required,recording_consent,recording_status,recording_error,recording_created_at';
let COLLECT_RECORDING_COLUMNS_AVAILABLE=true;
let COLLECT_DURATION_COLUMN_AVAILABLE=true;
let COLLECT_GEO_COLUMNS_AVAILABLE=true;
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
function collectStatusCounts(idx){
  const s=SURVEYS[idx];if(!s)return{valid:0,rejected:0,loaded:false};
  if(!COLLECT_EVENTS_LOADED)return{valid:surveyCollectedCount(s),rejected:0,loaded:false};
  const events=eventsForSurveyIdx(idx);
  return {valid:events.filter(event=>event.status==='valid').length,rejected:events.filter(event=>event.status==='rejected').length,loaded:true};
}
function refreshCollectCount(idx){
  const s=SURVEYS[idx];if(!s)return;
  const statusCounts=collectStatusCounts(idx),collected=statusCounts.valid,sample=surveySample(s);
  const value=document.querySelector('#collectCollectedStat .s-val');
  const sub=document.querySelector('#collectCollectedStat .s-sub');
  if(value)value.textContent=collected.toLocaleString('pt-BR');
  if(sub)sub.textContent='de '+sample.toLocaleString('pt-BR');
  const validValue=document.querySelector('#collectValidStat .s-val');
  const rejectedValue=document.querySelector('#collectRejectedStat .s-val');
  if(validValue)validValue.textContent=statusCounts.valid.toLocaleString('pt-BR');
  if(rejectedValue)rejectedValue.textContent=statusCounts.rejected.toLocaleString('pt-BR');
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
  refreshCollectCount(idx);
  refreshCollectionTeamRows(idx);
  renderLiveFeed(idx);
  refreshCollectionTeamFunnelLive(idx);
  const mapaTab=document.getElementById('collectTabMapa');
    if(mapaTab&&mapaTab.style.display!=='none')renderCollectMap(idx);
    const audTab=document.getElementById('collectTabAuditoria');
    if(audTab&&audTab.style.display!=='none')renderAudit(idx);
    const metasTab=document.getElementById('collectTabMetas');
    if(metasTab&&metasTab.style.display!=='none')renderCollectQuotaProgress(idx);
    const evolutionTab=document.getElementById('collectTabEvolucao');
    if(evolutionTab&&evolutionTab.style.display!=='none')renderCollectEvolution(idx);
}
function initCollectLive(idx){
  stopCollectLive();
  const s=SURVEYS[idx];if(!s)return;
  (async()=>{
    if(!COLLECT_EVENTS_LOADED)await loadCollectEventsIfNeeded();
    await loadUsersIfNeeded();
    if(COLLECT_IDX!==idx)return;
    refreshCollectCount(idx);
    refreshCollectionTeamRows(idx);
    loadCollectionOrientationCounts(idx);
    renderLiveFeed(idx);
    renderAudit(idx);
    renderCollectQuotaProgress(idx);
    renderCollectEvolution(idx);
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
let _collectMapMarkerLayer=[],_collectMapInfoWindow=null,_collectMapFocusMarker=null;
let _collectMapDidFit=false,_collectMapFocusId=null;
let _collectMapFilters={researcher:'all',researcherQuery:'',status:'all',latest:false};
function collectResearcherFilterEvents(events){
  const query=String(_collectMapFilters.researcherQuery||'').trim().toLocaleLowerCase('pt-BR');
  return !query?events:events.filter(e=>String(e.name||'').toLocaleLowerCase('pt-BR').includes(query));
}
function collectApplyResearcherSearch(value){
  _collectMapFilters.researcherQuery=String(value||'').trim().toLocaleLowerCase('pt-BR');
  _collectMapDidFit=false;
  const total=eventsForSurveyIdx(COLLECT_IDX).length;
  const matched=collectResearcherFilterEvents(eventsForSurveyIdx(COLLECT_IDX)).length;
  const summary=document.getElementById('collectResearcherSearchSummary');
  if(summary)summary.textContent=_collectMapFilters.researcherQuery?`${matched} de ${total} coletas encontradas`:'Todas as coletas';
  const mapTab=document.getElementById('collectTabMapa');
  if(mapTab&&mapTab.style.display!=='none')renderCollectMap(COLLECT_IDX);
  const auditTab=document.getElementById('collectTabAuditoria');
  if(auditTab&&auditTab.style.display!=='none')renderAudit(COLLECT_IDX);
}
function collectClearResearcherSearch(){
  const input=document.getElementById('collectResearcherSearch');
  if(input)input.value='';
  collectApplyResearcherSearch('');
}
function collectMapReadFilters(){
  _collectMapFilters={
    researcher:document.getElementById('collectMapResearcher')?.value||'all',
    researcherQuery:(document.getElementById('collectResearcherSearch')?.value||document.getElementById('collectMapResearcherSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'),
    status:document.getElementById('collectMapStatus')?.value||'all',
    latest:!!document.getElementById('collectMapLatest')?.checked
  };
  return _collectMapFilters;
}
function collectMapFilterEvents(events){
  const f=_collectMapFilters;
  let out=events.filter(e=>
    (f.researcher==='all'||e.name===f.researcher)&&
    (!f.researcherQuery||String(e.name||'').toLocaleLowerCase('pt-BR').includes(f.researcherQuery))
  );
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
  if(_collectMapFocusMarker){_collectMapFocusMarker.setMap(null);_collectMapFocusMarker=null;}
  const mapEl=document.getElementById('collectMap');if(!mapEl)return;const mapLoading=document.getElementById('collectMapLoading');
  if(!window.google?.maps?.Map){if(mapLoading){mapLoading.textContent='Preparando Google Maps…';mapLoading.style.display='flex';}loadGoogleMaps().then(()=>{if(document.getElementById('collectMap')===mapEl)renderCollectMap(idx);}).catch(error=>{if(mapLoading){mapLoading.textContent=googleMapErrorText(error);mapLoading.style.display='flex';}});return;}
  if(mapLoading)mapLoading.style.display='none';
  if(!_collectMap||_collectMap._ppElement!==mapEl){if(_collectMapMarkerLayer){_collectMapMarkerLayer.forEach(marker=>marker.setMap(null));}_collectMapMarkerLayer=[];_collectMapDidFit=false;_collectMap=new google.maps.Map(mapEl,{center:{lat:-18.5,lng:-44.9},zoom:6,mapTypeId:COLLECT_MAP_LAYERS[_collectMapKind],mapTypeControl:true,fullscreenControl:true,streetViewControl:false,gestureHandling:'greedy'});_collectMap._ppElement=mapEl;_collectMapInfoWindow=new google.maps.InfoWindow();}
  _collectMapMarkerLayer.forEach(marker=>marker.setMap(null));_collectMapMarkerLayer=[];const s=SURVEYS[idx];if(!s)return;const team=s.team||[];const colorFor=name=>COLLECT_COLORS[team.indexOf(name)%COLLECT_COLORS.length]||'#2563eb';const allEvents=eventsForSurveyIdx(idx).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng));const filtered=collectMapFilterEvents(allEvents);const events=filtered.slice(0,COLLECT_MAP_MAX_POINTS);const shown=events.length,total=filtered.length,latestTsByName={},latestIdByName={};allEvents.forEach(e=>{if(!(e.name in latestTsByName)||e.ts>latestTsByName[e.name]){latestTsByName[e.name]=e.ts;latestIdByName[e.name]=e.id;}});
  events.forEach(e=>{const color=colorFor(e.name),isLatest=latestIdByName[e.name]===e.id,markerState=e.status==='rejected'?'is-rejected':e.calibration?'is-calibration':isLatest?'is-latest':'is-history',position=mapDisplayPoint(e,events),marker=new google.maps.Marker({map:_collectMap,position:{lat:position[0],lng:position[1]},icon:googleMarkerIcon(color,markerState==='is-latest'?10:8),title:`${e.name} · ${e.cota||'Sem cota'}`});marker.addListener('click',()=>goToAuditFromMap(e.id));marker.addListener('mouseover',()=>{_collectMapInfoWindow.setContent(buildMapPopup(e,isLatest));_collectMapInfoWindow.open({map:_collectMap,anchor:marker});});_collectMapMarkerLayer.push(marker);});
  const researchers=new Set(events.map(e=>e.name));const summary=document.getElementById('collectMapSummary');if(summary)summary.textContent=shown?`${shown} ponto${shown===1?'':'s'} visível${shown===1?'':'is'} · ${researchers.size} pesquisador${researchers.size===1?'':'es'}${shown<total?' · limite de visualização aplicado':''}`:'Nenhum ponto corresponde aos filtros atuais.';const note=document.getElementById('collectMapNote');if(note)note.textContent=shown<total?`Mostrando ${shown} de ${total} coletas após os filtros. Clique em um ponto para abrir a coleta na auditoria.`:'Clique em um ponto para abrir a coleta na auditoria.';const pts=events.map(e=>{const point=mapDisplayPoint(e,events);return {lat:point[0],lng:point[1]};});if(pts.length&&!_collectMapDidFit){try{const bounds=new google.maps.LatLngBounds();pts.forEach(point=>bounds.extend(point));if(pts.length===1){_collectMap.setCenter(pts[0]);_collectMap.setZoom(17);}else _collectMap.fitBounds(bounds,{top:70,right:70,bottom:70,left:70});_collectMapDidFit=true;}catch(e){}}
}
function buildMapTooltip(e,isLatest){
  const state=e.status==='rejected'?'Reprovada':e.status==='pending_recording'?'Áudio pendente · não contabilizada':e.calibration?'Calibração':isLatest?'Última coleta':'Coleta registrada';
  return `<b>${esc(e.name)}</b><br><span>${esc(e.cota||'Sem cota')} · ${state}</span><br><small>${new Date(e.ts).toLocaleString('pt-BR')}</small>`;
}
function buildMapPopup(e,isLatest){
  const statusExtra=e.status==='rejected'
    ?'<span class="pill pill-red">✕ Reprovada</span>'+(e.rejectReason?`<div class="map-popup-reason">Motivo: ${esc(e.rejectReason)}</div>`:'')
    :e.status==='pending_recording'?'<span class="pill pill-amber">Áudio pendente · não contabilizada</span>':e.calibration?'<span class="pill pill-blue">◎ Calibração</span>':'';
  return `<div class="map-popup">
    <div class="map-popup-title">${esc(e.name)}${isLatest?'<span class="map-popup-latest">Última</span>':''}</div>
    <div class="map-popup-meta"><b>${esc(e.cota||'Sem cota')}</b><br>${new Date(e.ts).toLocaleString('pt-BR')}<br>Precisão do GPS: ±${Math.round(e.acc)}m</div>
    <div class="map-popup-status">${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente de sync</span>'}${statusExtra}</div>
    <div class="map-popup-actions">${conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')}<button class="btn-ghost map-popup-action" onclick="goToAuditFromMap('${e.id}')">🔎 Ver na auditoria</button></div>
  </div>`;
}
let AUDIT_HIGHLIGHT_ID=null,AUDIT_INTERNAL_VIEW='flagged',AUDIT_FLAGGED_COUNT=0;
function auditInternalCounts(idx){
  const flagged=collectResearcherFilterEvents(eventsForSurveyIdx(idx)).filter(e=>e.status==='rejected'||e.calibration);
  const rejected=flagged.filter(e=>e.status==='rejected').length;
  const calibration=flagged.filter(e=>e.calibration).length;
  return {total:flagged.length,rejected,calibration};
}
function auditApplyInternalView(){
  const tabs=document.querySelectorAll('[data-audit-focus-tab]');
  tabs.forEach(tab=>{
    const active=tab.dataset.auditFocusTab===AUDIT_INTERNAL_VIEW;
    tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',active?'true':'false');
  });
  document.querySelectorAll('[data-audit-focus-panel]').forEach(panel=>{
    panel.hidden=panel.dataset.auditFocusPanel!==AUDIT_INTERNAL_VIEW;
  });
}
function auditSetInternalView(view){
  if(!['flagged','all'].includes(view))return;
  if(view==='flagged'&&AUDIT_FLAGGED_COUNT===0){AUDIT_INTERNAL_VIEW='all';}
  else AUDIT_INTERNAL_VIEW=view;
  auditApplyInternalView();
}
function auditInternalNavigationMarkup(idx){
  const counts=auditInternalCounts(idx);AUDIT_FLAGGED_COUNT=counts.total;
  const flaggedLabel=counts.total?`Reprovações e calibrações <strong id="auditFlaggedCount">${counts.total}</strong>`:'Reprovações e calibrações <strong id="auditFlaggedCount">0</strong>';
  const flaggedDetail=counts.total?`${counts.rejected} reprovada${counts.rejected===1?'':'s'} · ${counts.calibration} calibraç${counts.calibration===1?'ão':'ões'}`:'Nenhuma pendência nesta pesquisa';
  const allCount=eventsForSurveyIdx(idx).length;
  return `<nav class="audit-focus-nav" aria-label="Atalhos da auditoria" role="tablist"><button type="button" class="audit-focus-tab ${AUDIT_INTERNAL_VIEW==='flagged'&&counts.total?'is-active':''}" data-audit-focus-tab="flagged" role="tab" aria-selected="${AUDIT_INTERNAL_VIEW==='flagged'&&counts.total?'true':'false'}" onclick="auditSetInternalView('flagged')"><span class="audit-focus-tab-icon">!</span><span><b>${flaggedLabel}</b><small>${flaggedDetail}</small></span><span class="audit-focus-tab-arrow">→</span></button><button type="button" class="audit-focus-tab ${AUDIT_INTERNAL_VIEW==='all'||!counts.total?'is-active':''}" data-audit-focus-tab="all" role="tab" aria-selected="${AUDIT_INTERNAL_VIEW==='all'||!counts.total?'true':'false'}" onclick="auditSetInternalView('all')"><span class="audit-focus-tab-icon">✓</span><span><b>Auditoria completa <strong id="auditAllCount">${allCount}</strong></b><small>Todas as coletas, evidências e ações</small></span><span class="audit-focus-tab-arrow">→</span></button></nav>`;
}
function goToAuditFromMap(id){
  const e=COLLECT_EVENTS.find(x=>x.id===id);if(!e)return;
  AUDIT_HIGHLIGHT_ID=id;
  const auditBtn=document.getElementById('collectTabAuditoriaBtn')||document.querySelectorAll('#collectTabSeg button')[2];
  if(auditBtn)collectTab(auditBtn,'auditoria');
}
function goToMapFromAudit(id){
  const e=COLLECT_EVENTS.find(x=>x.id===id);if(!e||COLLECT_IDX==null)return;
  _collectMapFocusId=id;
  _collectMapFilters={researcher:e.name||'all',researcherQuery:String(e.name||'').toLocaleLowerCase('pt-BR'),status:'all',latest:false};
  const search=document.getElementById('collectMapResearcherSearch');if(search)search.value=e.name||'';
  const researcher=document.getElementById('collectMapResearcher');if(researcher)researcher.value=e.name||'all';
  const status=document.getElementById('collectMapStatus');if(status)status.value='all';
  const latest=document.getElementById('collectMapLatest');if(latest)latest.checked=false;
  const mapBtn=document.getElementById('collectTabMapaBtn')||document.querySelectorAll('#collectTabSeg button')[1];
  if(mapBtn)collectTab(mapBtn,'mapa');
}
function focusCollectMapEvent(id){
  const mapTab=document.getElementById('collectTabMapa');
  if(!mapTab||mapTab.style.display==='none')return;
  const e=COLLECT_EVENTS.find(x=>x.id===id);
  if(!e||!Number.isFinite(e.lat)||!Number.isFinite(e.lng))return;
  if(!_collectMap||!window.google?.maps?.Marker){setTimeout(()=>focusCollectMapEvent(id),220);return;}
  const position={lat:e.lat,lng:e.lng};
  _collectMap.setCenter(position);_collectMap.setZoom(17);
  const marker=new google.maps.Marker({map:_collectMap,position,icon:googleBalloonIcon('#f97316'),title:`Coleta selecionada · ${e.name}`,zIndex:999});
  _collectMapFocusMarker=marker;_collectMapFocusId=null;
  marker.addListener('click',()=>{_collectMapInfoWindow.setContent(buildMapPopup(e,true));_collectMapInfoWindow.open({map:_collectMap,anchor:marker});});
  _collectMapInfoWindow.setContent(buildMapPopup(e,true));_collectMapInfoWindow.open({map:_collectMap,anchor:marker});
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
const AUDIT_DIFFICULTY_SECONDS={single:12,multi:18,ranking:22,pair:32,scale:8,scale10:10,nps:10,open:45,number:10,date:8};
function surveyAutomaticMinimumSeconds(s){
  const questions=(s?.questions||[]).filter(q=>q.dbId||q.text);
  const total=questions.reduce((sum,q)=>{
    const type=q.type||'single',optionCount=(q.opts||[]).filter(value=>String(value||'').trim()).length;
    let base=AUDIT_DIFFICULTY_SECONDS[type]||15;
    if(type==='multi')base+=Math.min(8,optionCount)*2;
    if(type==='ranking')base+=Math.min(10,optionCount)*4;
    const difficulty=Math.min(5,Math.max(1,Number(q.difficulty)||3));
    const multiplier=[0,.75,.9,1,1.25,1.5][difficulty]||1;
    return sum+(base*multiplier);
  },0);
  return Math.max(30,Math.min(3600,Math.ceil((30+total)/5)*5));
}
function surveyEffectiveMinimumSeconds(s){
  const override=Number(s?.minimumCollectionSeconds);
  return Number.isFinite(override)&&override>=30?Math.min(3600,Math.round(override)):surveyAutomaticMinimumSeconds(s);
}
function auditMinimumDurationMarkup(s){
  const automatic=surveyAutomaticMinimumSeconds(s),override=Number(s?.minimumCollectionSeconds),effective=surveyEffectiveMinimumSeconds(s);
  const hasOverride=Number.isFinite(override)&&override>=30;
  const questionCount=(s?.questions||[]).length;
  return `<div class="card mb audit-minimum-duration-card" id="auditMinimumRule">
    <div class="audit-minimum-duration-head"><div><div class="map-eyebrow">REGRA DE QUALIDADE</div><div class="card-t">Tempo mínimo para esta coleta</div><div class="card-d">A duração começa ao iniciar a entrevista e termina em “Concluir e enviar”. A regra é aplicada no banco: coletas abaixo do tempo efetivo são mantidas no histórico, mas entram como <b>reprovadas</b> e não geram pagamento.</div></div><span class="audit-minimum-badge">${fmtInterviewDuration(effective)}</span></div>
    <div class="audit-minimum-duration-grid"><div><span class="audit-minimum-label">Cálculo automático do formulário</span><strong>${fmtInterviewDuration(automatic)}</strong><small>${questionCount} pergunta${questionCount===1?'':'s'} · dificuldade 1 a 5</small></div><div><label class="audit-minimum-label" for="auditMinimumDurationInput">Ajuste manual opcional</label><div class="audit-minimum-input-row"><input class="inp" id="auditMinimumDurationInput" type="number" min="30" max="3600" step="5" value="${hasOverride?override:''}" placeholder="${automatic}" aria-describedby="auditMinimumDurationHelp"><span>segundos</span></div><small id="auditMinimumDurationHelp">${hasOverride?'Valor manual ativo. Limpe o campo para voltar ao cálculo automático.':'Deixe vazio para usar o cálculo automático.'}</small></div><div class="audit-minimum-current"><span class="audit-minimum-label">Regra aplicada agora</span><strong>${fmtInterviewDuration(effective)}</strong><small>${hasOverride?'Manual':'Automática'}</small></div></div>
    <div class="audit-minimum-duration-actions"><button type="button" class="btn btn-fill" onclick="saveAuditMinimumDuration(${s?SURVEYS.indexOf(s):'null'})">Salvar tempo mínimo</button><span class="audit-minimum-duration-note">O pesquisador verá o motivo completo no histórico de coletas reprovadas.</span></div>
  </div>`;
}
async function saveAuditMinimumDuration(idx){
  const s=SURVEYS[idx];if(!s)return;
  const input=document.getElementById('auditMinimumDurationInput');
  const raw=String(input?.value||'').trim();
  const seconds=raw===''?null:Number(raw);
  if(seconds!==null&&(!Number.isInteger(seconds)||seconds<30||seconds>3600)){alert('Informe um tempo inteiro entre 30 e 3600 segundos ou deixe vazio para o cálculo automático.');return;}
  try{
    const {data,error}=await sb.rpc('save_survey_minimum_collection_seconds',{p_survey_id:s.id,p_seconds:seconds});
    if(error)throw new Error(error.message);
    s.minimumCollectionSeconds=Number.isFinite(Number(data))&&Number(data)>=30?Number(data):null;
    const wrap=document.getElementById('auditMinimumRule');if(wrap)wrap.outerHTML=auditMinimumDurationMarkup(s);
    alert(s.minimumCollectionSeconds?`Tempo mínimo manual salvo: ${fmtInterviewDuration(s.minimumCollectionSeconds)}.`:'Tempo mínimo automático reativado com base no formulário.');
  }catch(ex){alert('Não foi possível salvar o tempo mínimo. Execute a migration tempo-minimo-coleta-auditoria.sql no Supabase e tente novamente. Detalhe: '+ex.message);}
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
function collectionNightAudioIssue(e){
  if(e.status!=='valid'||e.recordingStatus==='uploaded')return false;
  const date=new Date(e.ts);
  if(!Number.isFinite(date.getTime()))return false;
  const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'America/Sao_Paulo'}).format(date));
  return hour>=21;
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
async function recoverCollectionRecording(eventId){
  if(!collectionCanManageRecording())return;
  if(!confirm('Procurar e vincular o áudio desta entrevista no armazenamento privado? Nenhum pagamento ou status de aprovação anterior será modificado.'))return;
  try{
    const {data,error}=await sb.rpc('recover_collection_recording',{p_collection_event_id:eventId});
    if(error)throw new Error(error.message);
    if(data==='not_found'){alert('Nenhum arquivo de áudio foi localizado para esta entrevista. Mantenha-a em auditoria e avalie a reprovação manual.');return;}
    if(data==='ambiguous'){alert('Mais de um arquivo foi localizado. Não foi vinculado automaticamente; solicite revisão técnica antes de decidir.');return;}
    if(data!=='restored')throw new Error('Resposta inesperada do servidor');
    delete AUDIT_AUDIO_URLS[eventId];
    if(COLLECT_IDX!=null)await pollCollectEvents(COLLECT_IDX);
    alert('Gravação vinculada. Confira o áudio na auditoria antes de aprovar ou manter esta entrevista.');
  }catch(ex){alert('Não foi possível recuperar a gravação. Verifique se a migration corrigir-gravacao-noturna-e-recuperar-audios.sql foi executada. Detalhe: '+ex.message);}
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
  const filteredAll=collectResearcherFilterEvents(all);
  let events=filteredAll.slice(0,80);
  if(AUDIT_HIGHLIGHT_ID!=null&&!events.some(x=>x.id===AUDIT_HIGHLIGHT_ID)){
    const found=filteredAll.find(x=>x.id===AUDIT_HIGHLIGHT_ID);
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
    const pendingAudio=e.status==='pending_recording';
    const statusCell=`${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente</span>'}`+
      (pendingAudio?'<div style="margin-top:5px"><span class="pill pill-amber">Áudio pendente · não contabilizada</span></div>':'')+
      (collectionNightAudioIssue(e)?'<div style="margin-top:5px"><span class="pill pill-red">Válida sem áudio · revisar financeiro</span></div>':'')+
      (rejected?`<div style="margin-top:5px"><span class="pill pill-red" title="${esc(e.rejectReason||'')}">✕ Reprovada</span><div style="font-size:10.5px;color:var(--ink3);margin-top:2px;max-width:170px">${esc(e.rejectReason||'')}</div></div>`:'')+
      (e.calibration?'<div style="margin-top:5px"><span class="pill pill-blue">◎ Calibração</span></div>':'');
    const recordingCell=collectionRecordingCell(e);
    const durationCell=`<span class="audit-duration-value">${e.durationSeconds!=null?fmtInterviewDuration(e.durationSeconds):'<span class="audit-duration-missing">Não registrado</span>'}</span>`;
    const geoCell=Number.isFinite(e.lat)&&Number.isFinite(e.lng)
      ?`<button type="button" class="audit-geo-link" onclick="goToMapFromAudit(${jsArg(e.id)})" title="Centralizar esta coleta no mapa"><span>${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}</span><b>📍 Ver no mapa</b></button>${distNote}`
      :'<span class="audit-geo-empty">Sem coordenadas</span>';
    const actionsEvidence=`<div class="audit-actions-evidence"><div><span class="audit-evidence-label">Duração</span><b>${e.durationSeconds!=null?fmtInterviewDuration(e.durationSeconds):'Não registrado'}</b></div><div><span class="audit-evidence-label">Gravação</span>${collectionRecordingCell(e)}</div></div>`;
    const actionsCell=`<div class="audit-actions-stack">
      ${actionsEvidence}
      ${(e.recordingStatus==='failed'||e.recordingStatus==='pending_upload')&&e.recordingRequired?`<button class="btn-ghost" type="button" onclick="recoverCollectionRecording('${e.id}')">Recuperar áudio do armazenamento</button>`:''}
      ${conversationButton(e.phone,'Olá '+e.name+'! Podemos conversar sobre a coleta '+(e.cota||'')+'?')}
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditReject('${e.id}')">${rejected?'↺ Reaprovar':'✕ Reprovar'}</button>
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditToggleCalibration('${e.id}')">${e.calibration?'↺ Nos resultados':'◎ Calibração'}</button>
    </div>`;
    return `<tr data-eid="${e.id}"${rejected?' style="background:var(--red-l)"':''}>
      <td>${esc(e.name)}</td>
      <td>${esc(e.cota)}</td>
      <td>${Number.isFinite(e.ts)?new Date(e.ts).toLocaleString('pt-BR'):'—'}</td>
      <td>${gapCell}</td>
      <td class="audit-geo-cell">${geoCell}</td>
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
  const flagged=collectResearcherFilterEvents(eventsForSurveyIdx(idx)).filter(e=>e.status==='rejected'||e.calibration)
    .sort((a,b)=>(b.rejectedAt||b.ts)-(a.rejectedAt||a.ts));
  const counts=auditInternalCounts(idx);AUDIT_FLAGGED_COUNT=counts.total;
  const countEl=document.getElementById('auditFlaggedCount');if(countEl)countEl.textContent=String(counts.total);
  const allCountEl=document.getElementById('auditAllCount');if(allCountEl)allCountEl.textContent=String(eventsForSurveyIdx(idx).length);
  if(!flagged.length){wrap.hidden=true;el.innerHTML='';if(AUDIT_INTERNAL_VIEW==='flagged')AUDIT_INTERNAL_VIEW='all';auditApplyInternalView();return;}
  auditApplyInternalView();
  wrap.hidden=AUDIT_INTERNAL_VIEW!=='flagged';
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
      out.push({label,pct,target:Math.max(1,Math.round(sample*pct/100)),questionText:q.text||'',questionDbId:q.dbId,questionType:q.type});
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
let ACOLLECT_LOCATION_CHECK={status:'idle',city:'',state:'',formatted:'',distanceM:null};
function acollectIsAfterRecordingCutoff(date=new Date()){
  try{return Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'America/Sao_Paulo'}).format(date))>=ACOLLECT_RECORDING_CUTOFF_HOUR;}
  catch(ex){return date.getHours()>=ACOLLECT_RECORDING_CUTOFF_HOUR;}
}
function acollectPreviousCollection(surveyId=ACOLLECT_SURVEY_ID){
  const myId=CURRENT_PROFILE?.id;
  if(!myId||!surveyId)return null;
  return COLLECT_EVENTS.filter(event=>event.researcherId===myId&&event.surveyId===surveyId&&event.status!=='rejected'&&Number.isFinite(event.lat)&&Number.isFinite(event.lng))
    .sort((a,b)=>b.ts-a.ts)[0]||null;
}
function acollectGoogleAddressComponent(results,types){
  /* O Google costuma listar o bairro antes do município. Procurar por
     prioridade evita comparar "Lapa", "Moema" etc. com "São Paulo/SP". */
  for(const wantedType of types){
    for(const result of results||[]){
      for(const component of result.address_components||[]){
        if((component.types||[]).includes(wantedType))return component;
      }
    }
  }
  return null;
}
async function acollectReverseGeocodeCurrentLocation(){
  if(!Number.isFinite(GEO.lat)||!Number.isFinite(GEO.lng))throw new Error('GPS indisponível');
  await loadGoogleMaps();
  return new Promise((resolve,reject)=>{
    const geocoder=new google.maps.Geocoder();
    geocoder.geocode({location:{lat:GEO.lat,lng:GEO.lng}},(results,status)=>{
      if(status!=='OK'||!results?.length){reject(new Error('Geocodificação indisponível'));return;}
      const city=acollectGoogleAddressComponent(results,['locality','postal_town','administrative_area_level_2','sublocality_level_1']);
      const state=acollectGoogleAddressComponent(results,['administrative_area_level_1']);
      resolve({city:String(city?.long_name||'').trim(),state:String(state?.short_name||state?.long_name||'').trim().toUpperCase(),formatted:String(results[0]?.formatted_address||'').trim()});
    });
  });
}
function acollectSurveyHasAreaTargets(s){
  const targets=surveyCityTargets(s||{});
  return {targets,hasTargets:!!(targets.cities.size||targets.states.size)};
}
function acollectLocationMatchesSurvey(s,place){
  const {targets,hasTargets}=acollectSurveyHasAreaTargets(s);
  if(!hasTargets)return true;
  const city=normalizeUserSearch(place?.city||''),state=String(place?.state||'').trim().toUpperCase();
  if(!city||!state)return false;
  if(targets.cities.size){
    return [...targets.cities].some(value=>{
      const part=locationParts(value);
      return part&&normalizeUserSearch(part.city)===city&&String(part.uf||'').toUpperCase()===state;
    });
  }
  return targets.states.has(state);
}
function acollectIntegrityMessage(message,detail=''){
  const msg=document.getElementById('acollectMsg');
  if(msg)msg.innerHTML=`<div class="offline-banner collection-integrity-message" role="alert" aria-live="assertive"><b>Coleta bloqueada</b><span>${esc(message)}</span>${detail?`<small>${esc(detail)}</small>`:''}</div>`;
  alert(message);
}
async function acollectServerStartValidation(s){
  if(!s?.id||!CURRENT_PROFILE?.id)return {ok:true};
  try{
    const {data,error}=await sb.rpc('validate_collection_start',{p_survey_id:s.id,p_lat:GEO.lat,p_lng:GEO.lng});
    if(error){
      if(/validate_collection_start|function .* does not exist|schema cache|column .* does not exist/i.test(error.message||''))return {ok:true,schemaMissing:true};
      throw new Error(error.message);
    }
    const row=Array.isArray(data)?data[0]:data;
    if(row?.allowed===false){
      if(row.code==='too_close')return {ok:false,message:COLLECT_TOO_CLOSE_MESSAGE,detail:Number.isFinite(Number(row.distance_m))?'Distância calculada: '+fmtDist(Number(row.distance_m))+' da coleta anterior desta pesquisa.':''};
      if(row.code==='survey_archived')return {ok:false,message:'Esta pesquisa está arquivada e não aceita novas coletas.'};
      if(row.code==='not_authorized')return {ok:false,message:'Esta pesquisa não está disponível para o seu perfil de pesquisador.'};
      return {ok:false,message:'Não foi possível liberar esta coleta. Confira a pesquisa e tente novamente.'};
    }
    return {ok:true};
  }catch(ex){
    console.warn('Validação segura do início indisponível:',ex);
    return {ok:false,message:'Não foi possível validar a segurança desta coleta agora. Tente novamente com internet estável.'};
  }
}
async function acollectValidateLocation(){
  const s=SURVEYS.find(x=>x.id===ACOLLECT_SURVEY_ID);
  if(!s||!Number.isFinite(GEO.lat)||!Number.isFinite(GEO.lng))return {ok:false,message:'A localização atual não está disponível. Aguarde o GPS ficar ativo e tente novamente.'};
  const previous=acollectPreviousCollection(s.id);
  const distance=previous?distMeters(GEO.lat,GEO.lng,previous.lat,previous.lng):null;
  if(distance!=null&&distance<15){
    ACOLLECT_LOCATION_CHECK={status:'blocked',city:'',state:'',formatted:'',distanceM:distance};
    return {ok:false,message:COLLECT_TOO_CLOSE_MESSAGE,detail:'Distância calculada: '+fmtDist(distance)+' da coleta anterior desta pesquisa.'};
  }
  const {hasTargets}=acollectSurveyHasAreaTargets(s);
  let place={city:'',state:'',formatted:''};
  if(hasTargets){
    try{place=await acollectReverseGeocodeCurrentLocation();}
    catch(ex){
      ACOLLECT_LOCATION_CHECK={status:'blocked',city:'',state:'',formatted:'',distanceM:distance};
      return {ok:false,message:COLLECT_AREA_CONFIRMATION_MESSAGE};
    }
    if(!acollectLocationMatchesSurvey(s,place)){
      ACOLLECT_LOCATION_CHECK={status:'blocked',city:place.city,state:place.state,formatted:place.formatted,distanceM:distance};
      return {ok:false,message:COLLECT_OUTSIDE_AREA_MESSAGE,detail:'Localização identificada: '+(place.city||'cidade não identificada')+(place.state?'/'+place.state:'')+'.'};
    }
  }
  const serverCheck=await acollectServerStartValidation(s);
  if(!serverCheck.ok){
    ACOLLECT_LOCATION_CHECK={status:'blocked',city:place.city,state:place.state,formatted:place.formatted,distanceM:distance};
    return serverCheck;
  }
  ACOLLECT_LOCATION_CHECK={status:'ok',city:place.city,state:place.state,formatted:place.formatted,distanceM:distance};
  return {ok:true,place,distanceM:distance};
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
  return SURVEYS.filter(s=>!s.archivedAt&&s.status==='campo'&&(s.team||[]).includes(CURRENT_PROFILE.name));
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
  applyPendingResearcherUpdateIfSafe();
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
    el.innerHTML=`<div class="recording-consent-card recording-active"><div class="recording-consent-title">Gravando confirmação final</div><p>Grave apenas a resposta curta do entrevistado. A gravação será encerrada automaticamente.</p><button type="button" class="btn-danger" onclick="acollectRecordingStop()">■ Parar gravação</button></div>`;
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
  if(selectedRole==='pesq')return;
  if(ACOLLECT_TICK)return;
  ACOLLECT_TICK=setInterval(()=>{
    const banner=document.querySelector('#acollectActions .online-banner');
    if(!banner||!ACOLLECT_IN_PROGRESS){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;return;}
    banner.textContent='▶ Entrevista em andamento — '+acollectElapsedLabel();
  },1000);
}
let ACOLLECT_NOTICE_GATE_CHECKING=false,ACOLLECT_NOTICE_GATE_ACKING=false;
let ACOLLECT_NOTICE_GATE_SURVEY_ID=null,ACOLLECT_NOTICE_GATE_RESEARCHER_ID=null,ACOLLECT_NOTICE_GATE_MESSAGES=[],ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;
function acollectNoticeGateElement(){
  let overlay=document.getElementById('acollectNoticeGate');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.id='acollectNoticeGate';overlay.className='acollect-notice-gate';overlay.hidden=true;
  overlay.innerHTML='<section class="acollect-notice-gate-dialog" role="alertdialog" aria-modal="true" aria-labelledby="acollectNoticeGateTitle" aria-describedby="acollectNoticeGateHelp"><div class="acollect-notice-gate-content" id="acollectNoticeGateContent"></div><div class="acollect-notice-gate-footer"><button type="button" class="btn btn-out" onclick="acollectCloseNoticeGate()">Voltar sem iniciar</button><button type="button" class="btn btn-fill" id="acollectNoticeGateConfirm" onclick="acollectConfirmNoticeRead()" disabled>Confirmar leitura</button></div></section>';
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();acollectCloseNoticeGate();return;}
    if(event.key!=='Tab')return;
    const focusable=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
    if(!focusable.length)return;
    if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
  });
  document.body.appendChild(overlay);
  return overlay;
}
function acollectCloseNoticeGate(force=false){
  if(ACOLLECT_NOTICE_GATE_ACKING&&!force)return;
  const overlay=document.getElementById('acollectNoticeGate');
  if(overlay)overlay.hidden=true;
  document.body.classList.remove('acollect-notice-gate-open');
  ACOLLECT_NOTICE_GATE_SURVEY_ID=null;ACOLLECT_NOTICE_GATE_RESEARCHER_ID=null;ACOLLECT_NOTICE_GATE_MESSAGES=[];ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;
  if(force)ACOLLECT_NOTICE_GATE_CHECKING=false;
  if(!force&&CURRENT_PROFILE?.role==='pesq')document.getElementById('startCollectBtn')?.focus();
}
function acollectNoticeGateConsentChanged(checked){
  const button=document.getElementById('acollectNoticeGateConfirm');
  if(button)button.disabled=!checked||ACOLLECT_NOTICE_GATE_ACKING;
}
function acollectRenderNoticeGate(errorMessage=''){
  const overlay=acollectNoticeGateElement(),content=document.getElementById('acollectNoticeGateContent');
  const message=ACOLLECT_NOTICE_GATE_MESSAGES[0];if(!message)return;
  const survey=SURVEYS.find(s=>s.id===ACOLLECT_NOTICE_GATE_SURVEY_ID);
  const total=ACOLLECT_NOTICE_GATE_MESSAGES.length;
  content.innerHTML=`<span class="eyebrow">ANTES DA COLETA · ${total} ${total===1?'AVISO PENDENTE':'AVISOS PENDENTES'}</span><h2 id="acollectNoticeGateTitle">Leia e confirme este aviso</h2><p id="acollectNoticeGateHelp">Pesquisa: <strong>${esc(survey?.name||'Pesquisa')}</strong>. Você só poderá iniciar uma nova entrevista após confirmar individualmente todos os avisos desta pesquisa. Marcar como lido no painel não substitui esta confirmação.</p><article class="acollect-notice-gate-message"><div><strong>Enviado por ${esc(message.sender_name||'Equipe PesquisaPro')}</strong><time>${esc(new Date(message.created_at).toLocaleString('pt-BR'))}</time></div><p>${esc(message.body||'')}</p></article>${errorMessage?`<div class="callout warn" role="alert">${esc(errorMessage)}</div>`:''}<label class="acollect-notice-gate-consent"><input type="checkbox" onchange="acollectNoticeGateConsentChanged(this.checked)"> Li integralmente este aviso e estou ciente das orientações para a coleta.</label>`;
  const button=document.getElementById('acollectNoticeGateConfirm');
  button.textContent=ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT?'Verificar novamente':'Confirmar leitura';button.disabled=true;
  overlay.hidden=false;document.body.classList.add('acollect-notice-gate-open');
  content.querySelector('input[type="checkbox"]')?.focus();
}
async function acollectFetchPendingNotices(surveyId){
  const {data,error}=await sb.rpc('get_pending_survey_collection_messages',{p_survey_id:surveyId});
  if(error)throw new Error(error.message||'Falha ao consultar os avisos');
  return data||[];
}
async function acollectRequireNoticesBeforeStart(surveyId){
  const researcherId=CURRENT_PROFILE?.id;
  try{
    const pending=await acollectFetchPendingNotices(surveyId);
    if(surveyId!==ACOLLECT_SURVEY_ID||CURRENT_PROFILE?.role!=='pesq'||CURRENT_PROFILE?.id!==researcherId)return false;
    if(!pending.length)return true;
    ACOLLECT_NOTICE_GATE_SURVEY_ID=surveyId;
    ACOLLECT_NOTICE_GATE_RESEARCHER_ID=researcherId;
    ACOLLECT_NOTICE_GATE_MESSAGES=pending;
    ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;
    acollectRenderNoticeGate();
    return false;
  }catch(ex){
    console.warn('Não foi possível verificar os avisos antes da coleta:',ex);
    if(CURRENT_PROFILE?.id===researcherId)alert('Não foi possível verificar as mensagens da pesquisa. Confira a conexão e, se necessário, execute a migration confirmacao-leitura-antes-coleta.sql no Supabase. A coleta não foi iniciada.');
    return false;
  }
}
async function acollectConfirmNoticeRead(){
  const surveyId=ACOLLECT_NOTICE_GATE_SURVEY_ID,researcherId=ACOLLECT_NOTICE_GATE_RESEARCHER_ID,message=ACOLLECT_NOTICE_GATE_MESSAGES[0];
  const consent=document.querySelector('#acollectNoticeGateContent input[type="checkbox"]');
  if(!surveyId||!message||!consent?.checked||ACOLLECT_NOTICE_GATE_ACKING||ACOLLECT_IN_PROGRESS||CURRENT_PROFILE?.id!==researcherId)return;
  ACOLLECT_NOTICE_GATE_ACKING=true;
  const button=document.getElementById('acollectNoticeGateConfirm');button.disabled=true;button.textContent='Registrando confirmação…';
  try{
    if(!ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT){
      const {error}=await sb.rpc('acknowledge_survey_collection_message',{p_survey_id:surveyId,p_message_id:message.message_id});
      if(error)throw new Error(error.message||'Falha ao registrar a confirmação');
      if(CURRENT_PROFILE?.id!==researcherId)return;
      ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=true;
      const inboxRow=MY_SURVEY_RESEARCHER_MESSAGES.find(row=>row.message_id===message.message_id);
      if(inboxRow){inboxRow.read_at=inboxRow.read_at||new Date().toISOString();inboxRow.acknowledged_at=new Date().toISOString();}
    }
    const pending=await acollectFetchPendingNotices(surveyId);
    if(surveyId!==ACOLLECT_SURVEY_ID||CURRENT_PROFILE?.role!=='pesq'||CURRENT_PROFILE?.id!==researcherId){
      ACOLLECT_NOTICE_GATE_ACKING=false;acollectCloseNoticeGate();return;
    }
    ACOLLECT_NOTICE_GATE_MESSAGES=pending;ACOLLECT_NOTICE_GATE_CONFIRMED_CURRENT=false;
    if(pending.length){acollectRenderNoticeGate();return;}
    ACOLLECT_NOTICE_GATE_ACKING=false;acollectCloseNoticeGate();
    if(document.querySelector('.nav-item.on')?.dataset.key==='app-collect')await acollectStart();
  }catch(ex){
    console.warn('Não foi possível concluir a confirmação de leitura:',ex);
    if(CURRENT_PROFILE?.id===researcherId&&ACOLLECT_NOTICE_GATE_SURVEY_ID===surveyId)acollectRenderNoticeGate('Não foi possível confirmar ou verificar este aviso. Tente novamente com internet. A entrevista não começou.');
  }finally{ACOLLECT_NOTICE_GATE_ACKING=false;}
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
    const showInterviewTimer=selectedRole!=='pesq';
    const interviewBanner=showInterviewTimer?`<div class="online-banner" style="margin-bottom:8px">▶ Entrevista em andamento — ${acollectElapsedLabel()}</div>`:'<div class="online-banner" style="margin-bottom:8px">▶ Entrevista em andamento</div>';
    actionsEl.innerHTML=`${interviewBanner}
      ${missing>0?`<div style="font-size:11.5px;color:var(--ink3);margin-bottom:6px">Faltam responder ${missing} pergunta${missing>1?'s':''}</div>`:''}
      ${recordingPending?`<div style="font-size:11.5px;color:var(--ink3);margin-bottom:6px">${ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF?'Após 21h, grave a confirmação final para liberar o envio.':'Conclua a confirmação final ou escolha enviar sem áudio.'}</div>`:''}
      <button class="btn-primary" style="height:40px;font-size:14px;width:100%;${submitBlocked?'opacity:.5':''}" ${submitBlocked?'disabled':''} onclick="acollectSubmit()">${ACOLLECT_SUBMITTING?'Enviando…':'✓ Concluir e enviar'}</button>
      <button class="btn-ghost" style="width:100%;margin-top:6px" ${ACOLLECT_SUBMITTING?'disabled':''} onclick="acollectCancel()">Cancelar</button>`;
    if(hint)hint.textContent='';
    if(showInterviewTimer)acollectStartTicking();
    else if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
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
  if(CURRENT_PROFILE?.role==='pesq'&&CURRENT_PROFILE.status!=='ativo'){
    alert('Seu acesso ao PesquisaPro está encerrado. Não é possível iniciar novas coletas.');
    return;
  }
  // quando a pesquisa não tem cotas configuradas, ACOLLECT_SELECTED_QUOTA é
  // '' de propósito (coleta livre) — só exigir uma cota escolhida quando
  // existe alguma cota pra escolher. Sem essa checagem, o clique em
  // "Iniciar coleta" não fazia nada para pesquisas sem cota, mesmo com o
  // botão habilitado.
  const temCotas=!!ACOLLECT_QUOTA_LIST.length;
  if(temCotas&&(ACOLLECT_SELECTED_QUOTA===null||ACOLLECT_SELECTED_QUOTA===undefined||ACOLLECT_SELECTED_QUOTA===''))return;
  if(CURRENT_PROFILE?.role==='pesq'){
    const overlay=document.getElementById('acollectNoticeGate');
    if(ACOLLECT_NOTICE_GATE_CHECKING||(overlay&&!overlay.hidden))return;
    const surveyId=ACOLLECT_SURVEY_ID,button=document.getElementById('startCollectBtn');
    ACOLLECT_NOTICE_GATE_CHECKING=true;
    if(button){button.disabled=true;button.textContent='Verificando avisos…';}
    const ready=await acollectRequireNoticesBeforeStart(surveyId);
    ACOLLECT_NOTICE_GATE_CHECKING=false;
    if(button)button.textContent='Iniciar coleta';
    if(!ready||surveyId!==ACOLLECT_SURVEY_ID){renderAcollectActionState();return;}
  }
  const startButton=document.getElementById('startCollectBtn');
  if(startButton){startButton.disabled=true;startButton.textContent='Validando localização…';}
  const locationCheck=await acollectValidateLocation();
  if(!locationCheck.ok){
    if(startButton){startButton.disabled=false;startButton.textContent='Iniciar coleta';}
    acollectIntegrityMessage(locationCheck.message,locationCheck.detail||'');
    renderAcollectActionState();
    return;
  }
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
  applyPendingResearcherUpdateIfSafe();
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
  const submitLocationCheck=await acollectValidateLocation();
  if(!submitLocationCheck.ok){
    acollectIntegrityMessage(submitLocationCheck.message,submitLocationCheck.detail||'');
    return;
  }
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
    captured_city:submitLocationCheck.place?.city||null,
    captured_state:submitLocationCheck.place?.state||null,
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
  let eventId=null,serverRejectedReason='',serverPendingAudio=false;
  try{
    const buildEventPayload=()=>{
      const payload={...eventPayload};
      if(!COLLECT_DURATION_COLUMN_AVAILABLE)delete payload.duration_seconds;
      if(!COLLECT_GEO_COLUMNS_AVAILABLE){delete payload.captured_city;delete payload.captured_state;}
      return payload;
    };
    let {data,error}=await sb.from('collection_events').insert(buildEventPayload()).select().single();
    if(error&&COLLECT_DURATION_COLUMN_AVAILABLE&&/duration_seconds|column|schema cache/i.test(error.message||'')){
      COLLECT_DURATION_COLUMN_AVAILABLE=false;
      ({data,error}=await sb.from('collection_events').insert(buildEventPayload()).select().single());
    }
    if(error&&COLLECT_GEO_COLUMNS_AVAILABLE&&/captured_city|captured_state|column|schema cache/i.test(error.message||'')){
      COLLECT_GEO_COLUMNS_AVAILABLE=false;
      ({data,error}=await sb.from('collection_events').insert(buildEventPayload()).select().single());
    }
    if(error)throw new Error(error.message);
    eventId=data.id;
    if(data.status==='rejected')serverRejectedReason=COLLECT_MIN_DURATION_REJECTION_MESSAGE;
    serverPendingAudio=data.status==='pending_recording';
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
    msg.innerHTML=serverRejectedReason
      ?`<div class="offline-banner collection-rejection-message"><b>✕ Coleta rejeitada automaticamente.</b><span>${esc(serverRejectedReason)}</span><small>O registro foi preservado para auditoria. Consulte “Meus ganhos” para ver este motivo novamente.</small></div>`
      :serverPendingAudio&&!recordingResult.ok
        ?'<div class="offline-banner">A coleta foi salva, mas permanece pendente de gravação e NÃO conta como válida nem gera pagamento. Avise a coordenação para verificar o áudio.</div>'
      :recordingResult.ok
        ?'<div class="online-banner">✓ Coleta enviada com sucesso</div>'
        :'<div class="offline-banner">✓ Coleta enviada; a confirmação de áudio não pôde ser anexada.</div>';
    setTimeout(()=>{if(msg)msg.innerHTML='';},4000);
  }
  applyPendingResearcherUpdateIfSafe();
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
    const statusBadge=g.status==='rejected'?' <span class="pill pill-red">✕ Reprovada</span>':g.status==='pending_recording'?' <span class="pill pill-amber">Áudio pendente · não contabilizada</span>':g.calibration?' <span class="pill pill-blue">◎ Calibração</span>':'';
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
      let reportResult=await sb.rpc('survey_report_all_questions_v2',{p_survey_id:survey.id});
      if(reportResult.error&&/does not exist|schema cache|could not find the function/i.test(reportResult.error.message||''))reportResult=await sb.rpc('survey_report_all_questions',{p_survey_id:survey.id});
      const {data,error}=reportResult;
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
function reportsLocalValidBase(surveyId){
  if(!COLLECT_EVENTS_LOADED)return null;
  return COLLECT_EVENTS.filter(event=>event.surveyId===surveyId&&event.status==='valid'&&!event.calibration).length;
}
function renderReportsOverview(out,rows,qs){
  const byQ={},byPosition={},byText={},byOrdinal={};const normalizeReportQuestionText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLocaleLowerCase('pt-BR');(rows||[]).forEach(r=>{(byQ[r.question_id]||(byQ[r.question_id]=[])).push(r);const position=Number(r.question_position);if(Number.isFinite(position))(byPosition[position]||(byPosition[position]=[])).push(r);const textKey=normalizeReportQuestionText(r.question_text);if(textKey)(byText[textKey]||(byText[textKey]=[])).push(r);});const orderedPositions=Object.keys(byPosition).map(Number).sort((a,b)=>a-b);if(orderedPositions.length===qs.length)orderedPositions.forEach((position,index)=>{byOrdinal[index]=byPosition[position];});
  const localBase=reportsLocalValidBase(reportsCurrentSurvey()?.id);
  const cards=qs.map((q,qi)=>{
    const data=byQ[q.dbId]||byPosition[q.position]||byText[normalizeReportQuestionText(q.text)]||byOrdinal[qi]||[];const base=Number(data[0]?.valid_base)||localBase||0;const total=data.reduce((sum,r)=>sum+Number(r.cnt||0),0);const max=Math.max(1,...data.map(r=>Number(r.cnt||0)));
    if(q.type==='open'){
      const answers=data.filter(r=>String(r.value_label||'').trim()&&String(r.value_label).trim()!=='(sem resposta)').slice(0,100);
      const answerRows=answers.length?answers.map(r=>{const cnt=Number(r.cnt||0),pct=reportPercent(cnt,base||total);return `<li class="reports-open-answer"><div><p>${esc(r.value_label)}</p><small>${cnt.toLocaleString('pt-BR')} ocorrência${cnt===1?'':'s'} · ${pct}% da base válida</small></div><span class="pill pill-blue">${pct}%</span></li>`;}).join(''):`<li class="empty" style="padding:16px 0">${base?'Nenhuma resposta foi registrada para esta pergunta na base válida.':'Ainda não há respostas textuais válidas.'}</li>`;
      const omitted=Math.max(0,answers.length<100?0:data.filter(r=>String(r.value_label||'').trim()&&String(r.value_label).trim()!=='(sem resposta)').length-answers.length);
      return `<article class="card reports-question-card reports-open-question-card"><div class="reports-question-head"><div><span class="reports-question-number">${String(qi+1).padStart(2,'0')}</span><h3>${esc(q.text||'(pergunta sem texto)')}</h3></div><span class="pill pill-blue">${base.toLocaleString('pt-BR')} válidas</span></div><div class="reports-question-meta">Resposta aberta · ${answers.length.toLocaleString('pt-BR')} resposta${answers.length===1?'':'s'} textuais agrupadas</div><ul class="reports-open-answer-list">${answerRows}</ul>${omitted?`<div class="reports-open-more">Exibindo as primeiras 100 respostas diferentes.</div>`:''}</article>`;
    }
    const lines=data.length?data.map((r,i)=>{const cnt=Number(r.cnt||0),pct=reportPercent(cnt,base||total);return `<div class="reports-answer-row"><div class="reports-answer-head"><span>${esc(r.value_label||'(sem resposta)')}</span><strong>${cnt.toLocaleString('pt-BR')} · ${pct}%</strong></div><div class="reports-answer-bar"><i style="width:${Math.min(100,Math.round((cnt/max)*100))}%"></i></div></div>`;}).join(''):`<div class="empty" style="padding:16px 0">${base?'Nenhuma resposta foi registrada para esta pergunta na base válida.':'Ainda não há respostas válidas.'}</div>`;
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

/* ============ RANKING DE PESQUISADORES ============ */
let RESEARCHER_RANKING_ROWS=[];
let RESEARCHER_RANKING_LOADED=false,RESEARCHER_RANKING_LOADING=false,RESEARCHER_RANKING_ERROR='';
let RESEARCHER_RANKING_FILTERS={days:'90',surveyId:'',minInterviews:'10',search:''};
const RESEARCHER_RANKING_MIN_SCORE=60;

function researcherRankingRowsForView(){
  const query=normalizeUserSearch(RESEARCHER_RANKING_FILTERS.search);
  if(!query)return RESEARCHER_RANKING_ROWS.slice();
  return RESEARCHER_RANKING_ROWS.filter(row=>normalizeUserSearch(row.researcherName).includes(query));
}
function researcherRankingSetFilter(key,value){
  RESEARCHER_RANKING_FILTERS[key]=value||'';
  if(key==='search'){go('researcher-ranking');const input=document.getElementById('researcher-ranking-search');if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}return;}
  RESEARCHER_RANKING_LOADED=false;RESEARCHER_RANKING_ERROR='';go('researcher-ranking');
}
function researcherRankingRefresh(){RESEARCHER_RANKING_LOADED=false;RESEARCHER_RANKING_ERROR='';go('researcher-ranking');}
function researcherRankingScoreClass(score){return score==null?'pill-gray':score>=80?'pill-green':score>=RESEARCHER_RANKING_MIN_SCORE?'pill-amber':'pill-red';}
function researcherRankingScoreMarkup(score){return score==null?'<span class="pill pill-gray">Amostra insuficiente</span>':`<span class="pill ${researcherRankingScoreClass(score)}" style="font-weight:800">${Number(score).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}</span>`;}
function researcherRankingPct(value){return value==null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';}
function researcherRankingMetric(value,suffix=''){return value==null?'—':Number(value).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+suffix;}
function researcherRankingStatus(status){return status==='ativo'?'<span class="pill pill-green">● Ativo</span>':status==='encerrado'?'<span class="pill pill-gray">● Encerrado</span>':'<span class="pill pill-amber">● Pendente</span>';}
function researcherRankingLoadErrorMarkup(){
  if(!RESEARCHER_RANKING_ERROR)return '';
  const missing=/researcher_performance_ranking|function .* does not exist|schema cache|column .* does not exist/i.test(RESEARCHER_RANKING_ERROR);
  return `<div class="callout warn mb"><b>Ranking indisponível no banco.</b><br>${missing?'Execute manualmente <code>deploy/ranking-desempenho-pesquisadores.sql</code> no Supabase e atualize esta tela.':esc(RESEARCHER_RANKING_ERROR)}</div>`;
}
async function loadResearcherRankingIfNeeded(){
  if(RESEARCHER_RANKING_LOADED||RESEARCHER_RANKING_LOADING)return;
  RESEARCHER_RANKING_LOADING=true;RESEARCHER_RANKING_ERROR='';
  try{
    const {data,error}=await sb.rpc('researcher_performance_ranking',{
      p_days:Number(RESEARCHER_RANKING_FILTERS.days)||90,
      p_survey_id:RESEARCHER_RANKING_FILTERS.surveyId||null,
      p_min_interviews:Number(RESEARCHER_RANKING_FILTERS.minInterviews)||10
    });
    if(error)throw new Error(error.message);
    RESEARCHER_RANKING_ROWS=(data||[]).map(row=>({
      researcherId:row.researcher_id,researcherName:row.researcher_name||'Pesquisador não identificado',researcherStatus:row.researcher_status||'ativo',
      totalCount:Number(row.total_count)||0,validCount:Number(row.valid_count)||0,rejectedCount:Number(row.rejected_count)||0,sampleEligible:!!row.sample_eligible,
      responseQualityScore:Number.isFinite(Number(row.response_quality_score))?Number(row.response_quality_score):null,integrityScore:Number.isFinite(Number(row.integrity_score))?Number(row.integrity_score):null,durationScore:Number.isFinite(Number(row.duration_score))?Number(row.duration_score):null,distanceScore:Number.isFinite(Number(row.distance_score))?Number(row.distance_score):null,overallScore:Number.isFinite(Number(row.overall_score))?Number(row.overall_score):null,
      avgDurationSeconds:Number.isFinite(Number(row.avg_duration_seconds))?Number(row.avg_duration_seconds):null,avgDistanceM:Number.isFinite(Number(row.avg_distance_m))?Number(row.avg_distance_m):null,shortGapCount:Number(row.short_gap_count)||0,closeDistanceCount:Number(row.close_distance_count)||0,flaggedCount:Number(row.flagged_count)||0,responseIssueCount:Number(row.response_issue_count)||0,recordingRequiredCount:Number(row.recording_required_count)||0,recordingCompletedCount:Number(row.recording_completed_count)||0,recordingIssueCount:Number(row.recording_issue_count)||0,lastSurveyId:row.last_survey_id||null,lastCollectionId:row.last_collection_id||null,lastOccurredAt:row.last_occurred_at||null
    }));
    RESEARCHER_RANKING_LOADED=true;
  }catch(ex){RESEARCHER_RANKING_ERROR=ex.message||String(ex);RESEARCHER_RANKING_ROWS=[];RESEARCHER_RANKING_LOADED=true;}
  finally{
    RESEARCHER_RANKING_LOADING=false;
    if(document.querySelector('.nav-item.on')?.dataset.key==='researcher-ranking')go('researcher-ranking');
  }
}
function researcherRankingOpenProfile(researcherId){
  const index=USERS.findIndex(user=>user.id===researcherId);if(index<0){alert('Perfil do pesquisador não encontrado na lista de usuários.');return;}
  USER_TAB='pesq';USER_SEARCH='';USER_GENERAL_FILTERS={status:'',city:''};USER_RESEARCHER_FILTERS={state:'',city:'',schooling:''};USER_VIEW=index;USER_EDIT=null;USER_ARMED=true;go('users');
}
function researcherRankingOpenAudit(eventId){
  const row=RESEARCHER_RANKING_ROWS.find(item=>item.lastCollectionId===eventId);
  const surveyId=RESEARCHER_RANKING_FILTERS.surveyId||row?.lastSurveyId||null;
  let idx=surveyId?SURVEYS.findIndex(s=>s.id===surveyId):-1;
  if(idx<0&&row?.lastCollectionId&&COLLECT_EVENTS_LOADED){const event=COLLECT_EVENTS.find(item=>item.id===row.lastCollectionId);if(event)idx=SURVEYS.findIndex(s=>s.id===event.surveyId);}
  if(idx<0&&SURVEYS.length===1)idx=0;
  if(idx<0){alert('Selecione uma pesquisa no filtro para abrir a auditoria correspondente.');return;}
  AUDIT_HIGHLIGHT_ID=row?.lastCollectionId||eventId||null;
  collectOpen(idx);
  const openAudit=()=>{const button=document.getElementById('collectTabAuditoriaBtn');if(button){collectTab(button,'auditoria');return;}if(document.querySelector('.nav-item.on')?.dataset.key==='collect')setTimeout(openAudit,180);};
  setTimeout(openAudit,180);
}
function researcherRankingTableRows(rows){
  if(!rows.length)return '<tr><td colspan="10" class="empty">Nenhum pesquisador corresponde aos filtros atuais.</td></tr>';
  return rows.map((row,index)=>{
    const low=row.overallScore!=null&&row.overallScore<RESEARCHER_RANKING_MIN_SCORE;
    const evidence=`${row.rejectedCount} reprovada(s) · ${row.shortGapCount} intervalo(s) <3 min · ${row.closeDistanceCount} ponto(s) <30 m`;
    const recording=row.recordingRequiredCount?`${row.recordingCompletedCount}/${row.recordingRequiredCount} gravação(ões)`:'não solicitada';
    const qualityNote=row.responseIssueCount?`${row.responseIssueCount} sinal(is) de resposta`:'sem sinal estrutural';
    const profileIndex=USERS.findIndex(user=>user.id===row.researcherId);
    const profileButton=profileIndex>=0?`<button class="btn-ghost" type="button" onclick="event.stopPropagation();researcherRankingOpenProfile(${jsArg(row.researcherId)})">Perfil</button>`:'';
    const auditButton=row.lastCollectionId?`<button class="btn-ghost" type="button" onclick="event.stopPropagation();researcherRankingOpenAudit(${jsArg(row.lastCollectionId)})">Auditoria</button>`:'';
    const user=profileIndex>=0?USERS[profileIndex]:null;
    return `<tr class="researcher-ranking-row ${low?'is-low-score':''}">
      <td><strong>${row.overallScore==null?'—':index+1+'º'}</strong></td>
      <td><div style="display:flex;align-items:center;gap:8px"><span class="avatar" style="width:30px;height:30px;font-size:11px">${esc(initialsOf(row.researcherName))}</span><div><b>${esc(row.researcherName)}</b><div style="font-size:11px;color:var(--ink3)">${researcherRankingStatus(row.researcherStatus)}</div></div></div></td>
      <td>${researcherRankingScoreMarkup(row.overallScore)}</td>
      <td><b>${row.validCount.toLocaleString('pt-BR')}</b> válidas<div style="font-size:11px;color:var(--ink3)">${row.totalCount.toLocaleString('pt-BR')} total · ${row.rejectedCount.toLocaleString('pt-BR')} reprovadas</div></td>
      <td><b>${researcherRankingPct(row.responseQualityScore)}</b><div style="font-size:11px;color:var(--ink3)">${esc(qualityNote)}</div></td>
      <td><b>${researcherRankingPct(row.integrityScore)}</b><div style="font-size:11px;color:var(--ink3)">${esc(evidence)}</div></td>
      <td><b>${researcherRankingPct(row.durationScore)}</b><div style="font-size:11px;color:var(--ink3)">${row.avgDurationSeconds==null?'sem duração registrada':fmtInterviewDuration(row.avgDurationSeconds)}</div></td>
      <td><b>${researcherRankingPct(row.distanceScore)}</b><div style="font-size:11px;color:var(--ink3)">${row.avgDistanceM==null?'sem GPS consecutivo':'média '+fmtDist(row.avgDistanceM)}</div></td>
      <td><div style="font-size:11px;color:var(--ink3)">${esc(recording)}</div>${low?'<span class="pill pill-red" style="margin-top:4px">Revisar</span>':''}</td>
      <td class="researcher-ranking-actions">${conversationButton(user?.phone,'Olá '+row.researcherName+'! Podemos conversar sobre seu desempenho nas coletas?')}${auditButton}${profileButton}</td>
    </tr>`;
  }).join('');
}
PAGES['researcher-ranking']=()=>{
  if(!['admin','coord','gerente','admpro'].includes(selectedRole))return head('Ranking de pesquisadores','Análise disponível somente para a gestão')+'<div class="callout warn">Apenas usuários de gestão podem consultar indicadores agregados de desempenho e qualidade.</div>';
  if(!USERS_LOADED){loadUsersIfNeeded();return head('Ranking de pesquisadores','Qualidade e integridade das coletas')+'<div class="empty">Carregando pesquisadores…</div>';}
  if(!SURVEYS_LOADED){loadSurveysIfNeeded();return head('Ranking de pesquisadores','Qualidade e integridade das coletas')+'<div class="empty">Carregando pesquisas…</div>';}
  if(!RESEARCHER_RANKING_LOADED){loadResearcherRankingIfNeeded();return head('Ranking de pesquisadores','Qualidade e integridade das coletas')+'<div class="empty">Calculando ranking com os dados reais de coletas e respostas…</div>';}
  const rows=researcherRankingRowsForView(),eligible=rows.filter(row=>row.overallScore!=null),low=eligible.filter(row=>row.overallScore<RESEARCHER_RANKING_MIN_SCORE),avg=eligible.length?eligible.reduce((sum,row)=>sum+row.overallScore,0)/eligible.length:null,totalValid=rows.reduce((sum,row)=>sum+row.validCount,0);
  const surveyOptions=SURVEYS.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(s=>`<option value="${esc(s.id)}" ${RESEARCHER_RANKING_FILTERS.surveyId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
  return head('Ranking de pesquisadores','Qualidade e integridade das coletas',`<button class="btn btn-out" type="button" onclick="researcherRankingRefresh()">↻ Atualizar</button>`)+researcherRankingLoadErrorMarkup()+`
  <div class="callout mb"><b>Nota de desempenho, não sentença.</b> A análise avalia a aplicação da entrevista com os pesos aprovados: respostas 30%, integridade 30%, duração 20% e distância 20%. A distância é comparada entre coletas consecutivas da mesma pesquisa; pesquisas diferentes não são misturadas. Use a auditoria antes de qualquer decisão.</div>
  <div class="grid g4" style="margin-bottom:16px">${stat('Pesquisadores avaliados',String(rows.length),'após os filtros','☺','#2563eb')}${stat('Entrevistas válidas',totalValid.toLocaleString('pt-BR'),'na janela selecionada','✓','#059669')}${stat('Nota média',avg==null?'—':avg.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}),'somente amostras suficientes','★','#7c3aed')}${stat('Priorizar revisão',String(low.length),'nota abaixo de 60','⚠','#dc2626')}</div>
  <div class="card mb researcher-ranking-filter-card"><div class="card-t">Filtrar e comparar</div><div class="card-d">A janela e a amostra mínima são aplicadas no cálculo feito pelo banco.</div><div class="field-row" style="margin-top:10px"><label style="flex:1"><span class="lbl">Buscar pesquisador</span><input id="researcher-ranking-search" class="inp" type="search" value="${esc(RESEARCHER_RANKING_FILTERS.search)}" placeholder="Nome do pesquisador" oninput="researcherRankingSetFilter('search',this.value)"></label><label style="flex:1"><span class="lbl">Pesquisa</span><select class="inp" onchange="researcherRankingSetFilter('surveyId',this.value)"><option value="">Todas as pesquisas</option>${surveyOptions}</select></label><label><span class="lbl">Período</span><select class="inp" onchange="researcherRankingSetFilter('days',this.value)"><option value="30" ${RESEARCHER_RANKING_FILTERS.days==='30'?'selected':''}>Últimos 30 dias</option><option value="90" ${RESEARCHER_RANKING_FILTERS.days==='90'?'selected':''}>Últimos 90 dias</option><option value="180" ${RESEARCHER_RANKING_FILTERS.days==='180'?'selected':''}>Últimos 180 dias</option><option value="365" ${RESEARCHER_RANKING_FILTERS.days==='365'?'selected':''}>Último ano</option></select></label><label><span class="lbl">Amostra mínima</span><select class="inp" onchange="researcherRankingSetFilter('minInterviews',this.value)"><option value="5" ${RESEARCHER_RANKING_FILTERS.minInterviews==='5'?'selected':''}>5 entrevistas</option><option value="10" ${RESEARCHER_RANKING_FILTERS.minInterviews==='10'?'selected':''}>10 entrevistas</option><option value="20" ${RESEARCHER_RANKING_FILTERS.minInterviews==='20'?'selected':''}>20 entrevistas</option><option value="30" ${RESEARCHER_RANKING_FILTERS.minInterviews==='30'?'selected':''}>30 entrevistas</option></select></label></div></div>
  <div class="card researcher-ranking-table-card"><div class="user-table-heading"><div><div class="card-t">Desempenho comparado</div><div class="card-d">${rows.length?`Mostrando ${rows.length} pesquisador${rows.length===1?'':'es'}; gravações obrigatórias pendentes aparecem como sinal de revisão.`:'Nenhum resultado para os filtros atuais.'}</div></div><span class="users-table-count">${rows.length}</span></div><div class="table-scroll"><table class="researcher-ranking-table"><thead><tr><th>#</th><th>Pesquisador</th><th>Nota</th><th>Coletas</th><th>Respostas 30%</th><th>Integridade 30%</th><th>Duração 20%</th><th>Distância 20%</th><th>Evidências</th><th>Ações</th></tr></thead><tbody>${researcherRankingTableRows(rows)}</tbody></table></div><div class="card-d" style="margin-top:12px">Ações de WhatsApp, perfil e auditoria não alteram a nota. Uma nota baixa apenas prioriza revisão; este painel não exclui pesquisadores nem apaga histórico automaticamente.</div></div>`;
};

/* ============ SEU RANKING (pesquisador) ============ */
let RESEARCHER_MY_RANKING_ROW=null;
let RESEARCHER_MY_RANKING_LOADED=false,RESEARCHER_MY_RANKING_LOADING=false,RESEARCHER_MY_RANKING_ERROR='';
const RESEARCHER_MY_RANKING_DAYS=90;
const RESEARCHER_MY_RANKING_MIN_INTERVIEWS=10;

function researcherMyRankingErrorMarkup(){
  if(!RESEARCHER_MY_RANKING_ERROR)return '';
  const missing=/researcher_my_performance|function .* does not exist|schema cache|column .* does not exist/i.test(RESEARCHER_MY_RANKING_ERROR);
  return `<div class="callout warn mb"><b>Seu ranking ainda não está disponível.</b><br>${missing?'A gestão precisa executar manualmente <code>deploy/ranking-desempenho-pesquisador.sql</code> no Supabase. Depois, atualize esta tela.':esc(RESEARCHER_MY_RANKING_ERROR)}</div>`;
}
function researcherMyRankingDecision(row){
  if(!row||row.overallScore==null||!row.sampleEligible){
    return {kind:'insufficient',title:'Amostra insuficiente para uma nota final',text:`A nota é calculada após pelo menos ${RESEARCHER_MY_RANKING_MIN_INTERVIEWS} coletas no período de ${RESEARCHER_MY_RANKING_DAYS} dias. Enquanto isso, os fatores disponíveis aparecem abaixo apenas para acompanhamento.`};
  }
  if(row.overallScore<RESEARCHER_RANKING_MIN_SCORE){
    return {kind:'low',title:'Nota muito baixa: convites podem ser suspensos',text:'Notas abaixo de 60 são consideradas muito baixas para novos convites. A gestão fará a avaliação do histórico e poderá deixar de convidar você para novas coletas. Esta é uma orientação de gestão, não uma exclusão automática.'};
  }
  if(row.overallScore<80){
    return {kind:'attention',title:'Nota abaixo de 80: menos convites',text:'Notas menores que 80 podem reduzir a frequência de convites para novas coletas. Use os fatores abaixo para identificar onde melhorar e converse com a equipe se precisar esclarecer algum registro.'};
  }
  return {kind:'good',title:'Nota dentro da faixa esperada',text:'Sua nota está em 80 ou mais. Mantenha respostas completas, intervalos adequados, localização coerente e atenção às gravações solicitadas para continuar elegível a novos convites.'};
}
function researcherMyRankingFactorMarkup(label,score,detail,icon,color){
  return `<article class="researcher-own-ranking-factor"><div class="researcher-own-ranking-factor-head"><span class="researcher-own-ranking-factor-icon" style="background:${color}18;color:${color}">${icon}</span><div><strong>${label}</strong><small>${esc(detail)}</small></div><b>${score==null?'—':Number(score).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}</b></div><div class="researcher-own-ranking-bar"><span style="width:${score==null?0:Math.max(0,Math.min(100,Number(score)))}%;background:${color}"></span></div></article>`;
}
function researcherMyRankingFactorsMarkup(row){
  if(!row)return '';
  const responseDetail=row.responseIssueCount?`${row.responseIssueCount} sinal(is) para revisar`:'sem sinal estrutural';
  const integrityDetail=[`${row.rejectedCount} reprovada(s)`,`${row.shortGapCount} intervalo(s) curto(s)`,`${row.closeDistanceCount} ponto(s) próximo(s)`,`${row.flaggedCount} flag(s)`].join(' · ');
  const durationDetail=row.avgDurationSeconds==null?'sem duração registrada':'média '+fmtInterviewDuration(row.avgDurationSeconds);
  const distanceDetail=row.avgDistanceM==null?'sem distância consecutiva':'média '+fmtDist(row.avgDistanceM);
  return `<div class="researcher-own-ranking-factors">${researcherMyRankingFactorMarkup('Respostas',row.responseQualityScore,responseDetail,'✓','#2563eb')}${researcherMyRankingFactorMarkup('Integridade',row.integrityScore,integrityDetail,'盾','#0f766e')}${researcherMyRankingFactorMarkup('Duração',row.durationScore,durationDetail,'◷','#d97706')}${researcherMyRankingFactorMarkup('Distância',row.distanceScore,distanceDetail,'⌖','#7c3aed')}</div>`;
}
async function loadResearcherMyRankingIfNeeded(){
  if(RESEARCHER_MY_RANKING_LOADED||RESEARCHER_MY_RANKING_LOADING)return;
  RESEARCHER_MY_RANKING_LOADING=true;RESEARCHER_MY_RANKING_ERROR='';RESEARCHER_MY_RANKING_ROW=null;
  try{
    const {data,error}=await sb.rpc('researcher_my_performance',{p_days:RESEARCHER_MY_RANKING_DAYS,p_min_interviews:RESEARCHER_MY_RANKING_MIN_INTERVIEWS});
    if(error)throw new Error(error.message);
    const row=Array.isArray(data)?data[0]:data;
    RESEARCHER_MY_RANKING_ROW=row?{
      researcherName:row.researcher_name||CURRENT_PROFILE?.name||'Pesquisador',
      totalCount:Number(row.total_count)||0,validCount:Number(row.valid_count)||0,rejectedCount:Number(row.rejected_count)||0,sampleEligible:row.sample_eligible===true||row.sample_eligible==='true',
      responseQualityScore:Number.isFinite(Number(row.response_quality_score))?Number(row.response_quality_score):null,integrityScore:Number.isFinite(Number(row.integrity_score))?Number(row.integrity_score):null,durationScore:Number.isFinite(Number(row.duration_score))?Number(row.duration_score):null,distanceScore:Number.isFinite(Number(row.distance_score))?Number(row.distance_score):null,overallScore:Number.isFinite(Number(row.overall_score))?Number(row.overall_score):null,
      avgDurationSeconds:Number.isFinite(Number(row.avg_duration_seconds))?Number(row.avg_duration_seconds):null,avgDistanceM:Number.isFinite(Number(row.avg_distance_m))?Number(row.avg_distance_m):null,shortGapCount:Number(row.short_gap_count)||0,closeDistanceCount:Number(row.close_distance_count)||0,flaggedCount:Number(row.flagged_count)||0,responseIssueCount:Number(row.response_issue_count)||0,recordingRequiredCount:Number(row.recording_required_count)||0,recordingCompletedCount:Number(row.recording_completed_count)||0,recordingIssueCount:Number(row.recording_issue_count)||0
    }:null;
    RESEARCHER_MY_RANKING_LOADED=true;
  }catch(ex){RESEARCHER_MY_RANKING_ERROR=ex.message||String(ex);RESEARCHER_MY_RANKING_LOADED=true;}
  finally{
    RESEARCHER_MY_RANKING_LOADING=false;
    if(document.querySelector('.nav-item.on')?.dataset.key==='researcher-my-ranking')go('researcher-my-ranking');
  }
}
PAGES['researcher-my-ranking']=()=>{
  if(CURRENT_PROFILE?.role!=='pesq')return head('Seu Ranking','Área disponível apenas para pesquisadores')+'<div class="empty">Este recurso está disponível no perfil de pesquisador.</div>';
  if(!RESEARCHER_MY_RANKING_LOADED){loadResearcherMyRankingIfNeeded();return head('Seu Ranking','Acompanhe sua nota de desempenho nas coletas')+'<div class="empty">Calculando seu ranking com os dados reais…</div>';}
  const row=RESEARCHER_MY_RANKING_ROW,decision=researcherMyRankingDecision(row),score=row?.overallScore;
  const scoreText=score==null?'—':Number(score).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const scoreClass=score==null?'pill-gray':researcherRankingScoreClass(score);
  const dataNote=row?`${row.validCount.toLocaleString('pt-BR')} válidas · ${row.rejectedCount.toLocaleString('pt-BR')} reprovadas · ${row.totalCount.toLocaleString('pt-BR')} registros no total`:'Nenhum registro de coleta encontrado no período';
  return head('Seu Ranking','Acompanhe sua nota de desempenho nas coletas',`<button class="btn btn-out" type="button" onclick="RESEARCHER_MY_RANKING_LOADED=false;go('researcher-my-ranking')">↻ Atualizar</button>`)+researcherMyRankingErrorMarkup()+`
  <div class="researcher-own-ranking-page">
    <section class="researcher-own-ranking-hero ${decision.kind}"><div><span class="eyebrow">DESEMPENHO NAS COLETAS</span><h2>${esc(decision.title)}</h2><p>${esc(decision.text)}</p></div><div class="researcher-own-ranking-score"><span>Sua nota</span><strong class="${scoreClass}">${scoreText}</strong><small>${esc(dataNote)}</small></div></section>
    <div class="callout mb"><b>Como a nota é formada:</b> respostas e coerência <b>30%</b>, integridade <b>30%</b>, duração compatível <b>20%</b> e distância entre coletas da mesma pesquisa <b>20%</b>. A análise usa os últimos ${RESEARCHER_MY_RANKING_DAYS} dias e não mistura a trava de distância entre pesquisas diferentes.</div>
    ${row?researcherMyRankingFactorsMarkup(row):'<section class="card mb"><div class="empty">Ainda não há dados suficientes para mostrar os fatores do seu ranking.</div></section>'}
    ${row?`<section class="card mb"><div class="card-t">O que pode melhorar sua nota</div><div class="card-d">${row.responseIssueCount?`Revise a completude e a coerência das respostas; foram identificados ${row.responseIssueCount} sinal(is) estrutural(is).`:'Mantenha as respostas completas e coerentes com o que foi informado pelo entrevistado.'} ${row.rejectedCount?`Há ${row.rejectedCount} coleta(s) reprovada(s) no período; confira sempre as regras antes de concluir.`:'Evite reprovações seguindo a área, o tempo mínimo e as regras de integridade.'} ${row.recordingIssueCount?`Também há ${row.recordingIssueCount} gravação(ões) obrigatória(s) pendente(s) ou com falha.`:'Quando a gravação for solicitada, conclua o procedimento até o envio.'}</div></section>`:''}
    <section class="card researcher-own-ranking-rules"><div class="card-t">Convites para novas pesquisas</div><div class="researcher-own-ranking-rule-grid"><div><b>Nota 80 ou mais</b><span>Faixa esperada para manter a prioridade normal de convites.</span></div><div><b>Nota menor que 80</b><span>Você poderá ser convidado com menor frequência, conforme a necessidade e o histórico.</span></div><div><b>Nota muito baixa, abaixo de 60</b><span>A gestão poderá deixar de convidar para novas coletas após avaliar o contexto.</span></div></div><p class="researcher-own-ranking-disclaimer">A nota é um indicador de apoio à gestão, não prova automática de fraude e não exclui ninguém sozinha. Caso identifique um erro, fale com a equipe PesquisaPro pelo chat.</p></section>
  </div>`;
};

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
  {key:'pesq_inativos',label:'Usuários inativos'},
  {key:'cliente',label:'Clientes'},
  {key:'admpro',label:'ADM PesquisaPro'},
  {key:'vendedor',label:'Vendedores'},
  {key:'indicador',label:'Indicadores de Clientes'},
  {key:'recrutador',label:'Recrutadores'},
  {key:'staff',label:'Administração'},
];
const USER_TAB_ROLES={pesq:['pesq'],pesq_inativos:['pesq'],cliente:['cliente'],admpro:['admpro'],vendedor:['vendedor'],indicador:['indicador'],recrutador:['recrutador'],staff:['admin','coord','gerente']};
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
function userBelongsToTabStatus(user,tab){
  if(tab==='pesq_inativos')return user?.status==='encerrado';
  if(tab==='pesq')return user?.status!=='encerrado';
  return true;
}
function usersInTab(tab){const roles=USER_TAB_ROLES[tab]||[];return USERS.map((u,i)=>({u,i})).filter(x=>roles.includes(x.u.role)&&userBelongsToTabStatus(x.u,tab)&&userMatchesSearch(x.u)&&userMatchesGeneralFilters(x.u,tab)&&userMatchesResearcherFilters(x.u,tab));}
function researcherWorkflowCount(){
  const profiles=usersInTab('pesq').map(x=>x.u),profileIds=new Set(profiles.map(u=>u.id).filter(Boolean)),profileEmails=new Set(profiles.map(u=>normalizeUserSearch(u.email)).filter(Boolean));
  const signups=[...signupPendingRows(),...signupOrphanRows()].filter(signupMatchesUsersView);
  const additional=signups.filter(s=>{
    const id=s.approvedProfileId||s.authUserId,email=normalizeUserSearch(s.email);
    return !(id&&profileIds.has(id))&&!(email&&profileEmails.has(email));
  });
  return profiles.length+additional.length;
}
function userGeneralFilterOptions(tab){
  const roles=USER_TAB_ROLES[tab]||[],base=USERS.filter(user=>roles.includes(user.role)&&userBelongsToTabStatus(user,tab)),cities=new Map();
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
    if(k==='users'||k==='dashboard'||k==='survey-team'||k==='contracts'||k==='recruitment'||k==='communication'||k==='researcher-ranking'){go(k);if(k==='survey-team')setTimeout(teamFilterRows,0);}
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
  invalidateStaffNavPendingCounts();
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
const USER_TAB_NEW_LABEL={pesq:'pesquisador',pesq_inativos:'pesquisador inativo',cliente:'cliente',admpro:'ADM PesquisaPro',vendedor:'vendedor',indicador:'indicador de clientes',recrutador:'recrutador',staff:'usuário administrativo'};
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
  const total=USER_TAB==='pesq'?researcherWorkflowCount():usersInTab(USER_TAB).length;
  const activeLabel=(USER_TABS.find(t=>t.key===USER_TAB)||{}).label||'Usuários';
  return `<nav class="user-tabs" aria-label="Tipos de usuário">
    <div class="user-tabs-head"><div><span class="eyebrow">CATEGORIA</span><strong>Escolha um perfil para administrar</strong></div><div class="user-tab-context"><span class="user-tab-context-icon">${icon3d('☺','#2563eb')}</span><div><span class="eyebrow">${activeLabel.toUpperCase()}</span><strong>${total} ${total===1?'registro':'registros'}</strong></div></div></div>
    <div class="user-tabs-track">${USER_TABS.map(t=>{const count=t.key==='pesq'?researcherWorkflowCount():usersInTab(t.key).length;return `<button class="user-tab ${USER_TAB===t.key?'is-active':''}" aria-current="${USER_TAB===t.key?'page':'false'}" onclick="userSetTab('${t.key}')"><span>${t.label}</span><b>${count}</b></button>`;}).join('')}</div>
  </nav>`;
}
function userTabStats(tab){
  const list=usersInTab(tab).map(x=>x.u);
  if(tab==='pesq'){
    const pendingSignups=signupPendingRows().filter(signupMatchesUsersView);
    const orphanSignups=signupOrphanRows().filter(signupMatchesUsersView);
    const pendingProfiles=list.filter(u=>u.status==='pendente');
    const missingDocs=list.filter(u=>!u.docFoto||!u.docComprovante).length+pendingSignups.filter(s=>!s.docFoto||!s.docComprovante).length;
    return `<div class="grid g4" style="margin-bottom:16px">
      ${stat('Pesquisadores e cadastros',String(researcherWorkflowCount()),'perfis e cadastros recebidos','☺','#2563eb')}
      ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'liberados para coleta','✓','#059669')}
      ${stat('Aguardando análise',String(pendingProfiles.length+pendingSignups.length+orphanSignups.length),'perfis e cadastros pendentes','◷','#d97706')}
      ${stat('Docs faltando',String(missingDocs),'com algum documento pendente','◷','#dc2626')}
    </div>`;
  }
  if(tab==='pesq_inativos'){
    return `<div class="grid g3 user-stat-grid" style="margin-bottom:16px">
      ${stat('Usuários inativos',String(list.length),'arquivados sem acesso à coleta','▣','#64748b')}
      ${stat('Com contrato',String(list.filter(u=>u.status==='encerrado').length),'histórico contratual preservado','✓','#2563eb')}
      ${stat('Reativação',String(list.length),'disponível somente para a gestão','↻','#d97706')}
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
  if(tab==='pesq'||tab==='pesq_inativos')return '<tr><th>Nome</th><th>CPF</th><th>Cidade / estado</th><th>Escolaridade</th><th>Documentos</th><th>PIX</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  if(tab==='cliente')return '<tr><th>Cliente</th><th>CPF/CNPJ</th><th>Celular</th><th>Pesquisas</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  if(tab==='recrutador')return '<tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Celular</th><th>Valor por captação</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
  return '<tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Celular</th><th>Comissão</th><th>Status</th><th class="user-actions-header">Ações</th></tr>';
}
function userTableRows(tab){
  const items=usersInTab(tab);
  if(items.length===0){
    const colspan=(tab==='pesq'||tab==='pesq_inativos')?8:tab==='cliente'?6:7;
    return `<tr><td colspan="${colspan}" class="empty">Nenhum cadastro nesta aba ainda.</td></tr>`;
  }
  if(tab==='pesq'||tab==='pesq_inativos'){
    return items.map(({u,i})=>{
      const st=u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':u.status==='encerrado'?'<span class="pill pill-gray">● Encerrado</span>':'<span class="pill pill-amber">● Pendente</span>';
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
          ${u.status==='encerrado'?`<button class="btn-ghost" style="color:var(--teal)" onclick="userReactivateResearcher(${i})">Reativar</button>`:u.status!=='ativo'?`<button class="btn-ghost" style="color:var(--teal)" onclick="userPesqApproveList(${i})">Aprovar</button>`:''}
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
  const tabInfo={pesq:['REDE DE CAMPO','Pesquisadores cadastrados e documentos para liberação de coleta.'],pesq_inativos:['ARQUIVO DE USUÁRIOS','Pesquisadores que solicitaram encerramento; histórico e pagamentos permanecem preservados.'],cliente:['BASE DE CLIENTES','Organizações e contatos que acompanham suas pesquisas.'],admpro:['EQUIPE INTERNA','Perfis ADM PesquisaPro autorizados no sistema.'],vendedor:['TIME COMERCIAL','Vendedores, percentuais de comissão e acesso ao funil.'],indicador:['PARCEIROS COMERCIAIS','Indicadores de clientes e percentuais de comissão.'],recrutador:['REDE DE CAPTAÇÃO','Parceiros que trazem novos pesquisadores para a rede.'],staff:['ADMINISTRAÇÃO','Usuários com acesso operacional e permissões de gestão.']}[tab]||['CADASTROS','Gestão dos perfis de acesso.'];
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
      <input class="inp" id="signup-real-link" value="${esc(signupPageUrl())}" readonly aria-label="Endereço de autocadastro do pesquisador">
      <button type="button" class="btn btn-out" onclick="copySignupLink()">Copiar link</button>
    </div>
    <div style="display:flex;gap:14px;align-items:center">
      <div id="signup-qr" class="qr-box"></div>
      <div style="flex:1">
        <button type="button" class="btn btn-out" style="width:100%;margin-bottom:8px" onclick="composeSignupEmail()">Redigir e-mail no meu aplicativo</button>
        <button type="button" class="btn btn-out" style="width:100%;margin-bottom:8px" onclick="downloadSignupQr()">Baixar QR Code</button>
        <button type="button" class="btn btn-out" style="width:100%" onclick="sendSignupWhatsApp()">Abrir mensagem no WhatsApp (opcional)</button>
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
  const newButton=tab==='pesq_inativos'?'':`<button class="btn btn-fill" onclick="userOpen('new')">＋ Novo ${USER_TAB_NEW_LABEL[tab]||'usuário'}</button>`;
  return `<div class="users-page"><div class="users-context"><div><span class="eyebrow">${tabInfo[0]}</span><p>${tabInfo[1]}</p></div><span class="users-count-chip">${currentCount} ${currentCount===1?'perfil':'perfis'}</span></div>`+
  head('Usuários','Cadastre e gerencie os diferentes perfis de usuário do sistema',
    newButton)+
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
  const url=signupPageUrl();
  const draw=()=>{
    box.innerHTML='';
    try{new QRCode(box,{text:url,width:108,height:108,colorDark:'#0f172a',colorLight:'#ffffff'});return true;}catch(e){return false;}
  };
  if(typeof window.QRCode!=='undefined'&&draw())return;
  box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code indisponível no momento">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">carregando…</div></div>';
  loadLocalAsset('qrcode').then(()=>{if(document.getElementById('signup-qr')===box&&!draw())throw new Error('QR Code inválido');})
    .catch(()=>{if(document.getElementById('signup-qr')===box)box.innerHTML='<div class="qr-fallback" role="img" aria-label="QR Code indisponível no momento">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">indisponível offline</div></div>';});
}
function signupPageUrl(){return new URL('cadastro.html',window.location.href).href;}
async function copySignupLink(){
  const url=signupPageUrl();
  try{await navigator.clipboard.writeText(url);alert('Link real do autocadastro copiado.');}
  catch(ex){window.prompt('Copie o link do autocadastro:',url);}
}
function composeSignupEmail(){
  const body='Olá! Para se cadastrar como pesquisador(a) no PesquisaPro, acesse: '+signupPageUrl()+'\nO cadastro passará por aprovação antes de liberar acesso.';
  window.location.href='mailto:?subject='+encodeURIComponent('Cadastro de pesquisador(a) — PesquisaPro')+'&body='+encodeURIComponent(body);
}
function downloadSignupQr(){
  const box=document.getElementById('signup-qr'),canvas=box?.querySelector('canvas'),img=box?.querySelector('img');
  const url=canvas?.toDataURL('image/png')||img?.src;
  if(!url||!url.startsWith('data:image/png')){alert('O QR Code ainda não está pronto. Aguarde e tente novamente.');return;}
  const link=document.createElement('a');link.href=url;link.download='pesquisapro-autocadastro.png';document.body.appendChild(link);link.click();link.remove();
}
function sendSignupWhatsApp(){
  const url=signupPageUrl();
  const phone=prompt('Use somente com autorização de contato. Telefone com DDD, ou deixe em branco para escolher no WhatsApp:','');
  if(phone===null)return;
  const msg=encodeURIComponent('Olá! Você foi convidado(a) para ser pesquisador(a) na PesquisaPro. Faça seu cadastro por este link (também disponível em QR Code): '+url);
  const digits=(phone||'').replace(/\D/g,'');
  const base=digits?('https://wa.me/'+(digits.length<=11?'55'+digits:digits)):'https://wa.me/';
  window.open(base+'?text='+msg,'_blank','noopener'); // abre rascunho; envio e entrega dependem da pessoa e do WhatsApp
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
  invalidateStaffNavPendingCounts();
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
    ?`<div class="doc-attached" style="margin:0"><span>📎 ${esc(u.doc)}</span><small>Abertura do arquivo indisponível nesta tela.</small></div>`
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
async function requestResearcherContractTermination(){
  if(!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return;
  const message='Tem certeza de que deseja encerrar seu contrato e cancelar sua inscrição no PesquisaPro?\n\nSeu acesso será inativado, você não poderá iniciar novas coletas e seu histórico de contratos, coletas e pagamentos será preservado para consulta administrativa.';
  if(!confirm(message))return;
  const button=document.getElementById('contractTerminateBtn');
  if(button){button.disabled=true;button.textContent='Encerrando…';}
  try{
    const {data,error}=await sb.rpc('request_researcher_contract_termination',{p_reason:'Encerramento solicitado pelo pesquisador'});
    if(error)throw new Error(error.message);
    if(!data||data.status!=='encerrado')throw new Error('O banco não confirmou o encerramento.');
    CURRENT_PROFILE.status='encerrado';
    alert('Sua solicitação foi registrada. O acesso foi inativado e o histórico foi arquivado para a gestão.');
    await logout();
  }catch(ex){
    alert('Não foi possível encerrar o contrato agora. Nenhum dado foi arquivado: '+ex.message);
    if(button){button.disabled=false;button.textContent='Solicitar encerramento e cancelar inscrição';}
  }
}
async function userReactivateResearcher(index){
  if(!['admin','admpro'].includes(selectedRole))return;
  const user=USERS[index];
  if(!user||user.role!=='pesq'||user.status!=='encerrado')return;
  if(!confirm('Reativar '+user.name+'? O acesso será liberado novamente, mas o histórico de encerramento continuará registrado.'))return;
  try{
    const {data,error}=await sb.rpc('restore_researcher_from_archive',{p_researcher_id:user.id});
    if(error)throw new Error(error.message);
    if(!data||data.status!=='ativo')throw new Error('O banco não confirmou a reativação.');
    user.status='ativo';
    USERS[index]=user;
    invalidateStaffNavPendingCounts();
    USER_TAB='pesq';USER_VIEW=null;USER_EDIT=null;USER_ARMED=true;
    alert('Pesquisador reativado. O histórico de encerramento foi preservado.');
    go('users');
  }catch(ex){alert('Não foi possível reativar este pesquisador: '+ex.message);}
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
     ${u.status==='encerrado'?`<button class="btn btn-fill" style="background:var(--teal)" onclick="userReactivateResearcher(${idx})">Reativar usuário</button>`:u.status!=='ativo'?`<button class="btn btn-fill" style="background:var(--teal)" onclick="userPesqApprove(${idx})">Aprovar</button>`:''}
     <button class="btn btn-fill" onclick="userEditFromView()">Editar</button>`)+`
  <div class="profile-identity">
    <div class="avatar profile-identity-avatar">${initials}</div>
    <div>
      <div style="font-weight:700;font-size:18px">${esc(u.name)}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
        ${ROLE_PILL.pesq}
        ${u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':u.status==='encerrado'?'<span class="pill pill-gray">● Encerrado</span>':'<span class="pill pill-amber">● Pendente</span>'}
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
        <button type="button" class="btn btn-out" style="width:100%;margin-top:8px" disabled>Relatório por e-mail · indisponível</button>
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
  invalidateStaffNavPendingCounts();
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
  invalidateStaffNavPendingCounts();
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
  invalidateStaffNavPendingCounts();
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
  invalidateStaffNavPendingCounts();
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
  invalidateStaffNavPendingCounts();
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
let PAYMENT_RECEIPTS=[]; // {id,paymentId,researcherId,amount,paidAt,note,createdBy,createdAt,receiptPath,receiptName,receiptMimeType,receiptSize}
let PAYMENT_RECEIPTS_LOADED=false,PAYMENT_RECEIPTS_LOADING=false,PAYMENT_RECEIPTS_SCHEMA_MISSING=false,PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING=false,PAYMENT_RECEIPTS_EDIT_SCHEMA_MISSING=false,PAYMENT_INCREMENT_SCHEMA_MISSING=false;
let PAYMENT_NOTICES=[]; // avisos privados de programação de pagamento
let PAYMENT_NOTICES_LOADED=false,PAYMENT_NOTICES_LOADING=false,PAYMENT_NOTICES_SCHEMA_MISSING=false;
const FIN_STATUS={
  aprovado:{pill:'<span class="pill pill-green">● Aprovado</span>'},
  pendente:{pill:'<span class="pill pill-amber">● Dados bancários pendentes</span>'},
  auditoria:{pill:'<span class="pill pill-blue">● Em auditoria</span>'},
  arquivado:{pill:'<span class="pill pill-gray">● Arquivada · fora do pendente</span>'},
};
let FIN_IDX=null,FIN_ARMED=false;
const brl=v=>'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
function maskPix(v){
  if(!v)return null;
  return v.length<=4?'•••'+v:'•••'+v.slice(-4);
}
function paymentRowToEntry(row){
  const u=USERS.find(x=>x.id===row.researcher_id);
  const valid=Number(row.valid_count)||0;
  const approvedRaw=row.approved_valid_count==null?(row.status==='aprovado'?valid:0):Number(row.approved_valid_count)||0;
  return {id:row.id,surveyId:row.survey_id,researcherId:row.researcher_id,
    name:u?u.name:'(pesquisador removido)',phone:u?u.phone:'',pixKey:u?u.pixKey:'',
    valid,rejected:Number(row.rejected_count)||0,status:row.status||'pendente',
    approvedValidCount:Math.max(0,Math.min(valid,approvedRaw))};
}
function paymentReceiptRowToEntry(row){
  return {id:row.id,paymentId:row.payment_id,researcherId:row.researcher_id,
    amount:Number(row.amount)||0,paidAt:row.paid_at||'',note:row.note||'',
    createdBy:row.created_by||'',createdAt:row.created_at||'',
    receiptPath:row.receipt_path||'',receiptName:row.receipt_name||'',
    receiptMimeType:row.receipt_mime_type||'',receiptSize:Number(row.receipt_size)||0};
}
function paymentNoticeRowToEntry(row){
  return {id:row.id,surveyId:row.survey_id,researcherId:row.researcher_id,paymentId:row.payment_id||'',
    amountDue:Number(row.amount_due)||0,amountPaid:Number(row.amount_paid)||0,amountRemaining:Number(row.amount_remaining)||0,
    scheduledFor:row.scheduled_for||'',scheduledUntil:row.scheduled_until||'',message:row.message||'',
    createdAt:row.created_at||'',readAt:row.read_at||''};
}
function paymentNoticeDateLabel(value){
  const text=String(value||'').slice(0,10),match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?match[3]+'/'+match[2]+'/'+match[1]:(value||'—');
}
function paymentNoticeTimeLabel(value){return String(value||'').slice(0,5)||'—';}
function paymentReceiptsFor(paymentId){return PAYMENT_RECEIPTS.filter(r=>r.paymentId===paymentId);}
function paymentReceivedValue(paymentId){return paymentId?paymentReceiptsFor(paymentId).reduce((sum,r)=>sum+r.amount,0):0;}
function paymentDueValue(row,price){return Math.max(0,(Number(row?.valid)||0)*(Number(price)||0));}
function paymentBalanceValue(row,price){return Math.max(0,paymentDueValue(row,price)-paymentReceivedValue(row?.id));}
function paymentApprovedValidValue(row){if(row?.status!=='aprovado')return 0;return Math.max(0,Math.min(Number(row?.valid)||0,Number(row?.approvedValidCount)||0));}
function paymentPendingValidValue(row){return Math.max(0,(Number(row?.valid)||0)-paymentApprovedValidValue(row));}
function paymentApprovedDueValue(row,price){return Math.max(0,paymentApprovedValidValue(row)*(Number(price)||0));}
function paymentApprovedBalanceValue(row,price){return Math.max(0,paymentApprovedDueValue(row,price)-paymentReceivedValue(row?.id));}
function paymentPendingDueValue(row,price){return Math.max(0,paymentDueValue(row,price)-paymentApprovedDueValue(row,price));}
function paymentNoticeMigrationNotice(){
  return PAYMENT_NOTICES_SCHEMA_MISSING
    ? '<div class="callout warn payment-ledger-warning"><b>Avisos de pagamento ainda não habilitados.</b> Execute <code>deploy/avisos-programacao-pagamento.sql</code> no Supabase para registrar os avisos privados aos pesquisadores.</div>'
    : '';
}
async function loadPaymentNoticesIfNeeded(){
  if(PAYMENT_NOTICES_LOADED||PAYMENT_NOTICES_LOADING||!CURRENT_PROFILE?.id)return Promise.resolve();
  PAYMENT_NOTICES_LOADING=true;
  try{
    const {data,error}=await sb.from('payment_notices').select('*').order('created_at',{ascending:false});
    if(error){PAYMENT_NOTICES_SCHEMA_MISSING=/payment_notices|relation|schema cache|does not exist/i.test(error.message||'');console.error('Erro ao carregar avisos de pagamento:',error);}
    else PAYMENT_NOTICES=(data||[]).map(paymentNoticeRowToEntry);
  }catch(ex){PAYMENT_NOTICES_SCHEMA_MISSING=/payment_notices|relation|schema cache|does not exist/i.test(ex.message||'');console.error('Erro de conexão com avisos de pagamento:',ex);}
  PAYMENT_NOTICES_LOADED=true;PAYMENT_NOTICES_LOADING=false;
  const key=document.querySelector('.nav-item.on')?.dataset.key;if(key==='finance'||key==='my-earnings')go(key);
}
function paymentNoticeGroups(scopeId){
  const rows=PAYMENT_NOTICES.filter(n=>!scopeId||n.surveyId===scopeId),grouped=new Map();
  rows.forEach(n=>{const key=[n.surveyId,n.createdAt,n.scheduledFor,n.scheduledUntil].join('|');const group=grouped.get(key)||{...n,count:0,amountDue:0,amountPaid:0,amountRemaining:0};group.count+=1;group.amountDue+=n.amountDue;group.amountPaid+=n.amountPaid;group.amountRemaining+=n.amountRemaining;grouped.set(key,group);});
  return [...grouped.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
function financePaymentScheduleMarkup(scopeId){
  const groups=paymentNoticeGroups(scopeId).slice(0,6);if(!groups.length)return '';
  return `<section class="card mb payment-schedule-card"><div class="payment-schedule-heading"><div><div class="card-t">Programações de pagamento enviadas</div><div class="card-d">Avisos privados registrados para os pesquisadores desta pesquisa.</div></div><span class="pill pill-blue">${groups.length} aviso${groups.length===1?'':'s'}</span></div><div class="payment-schedule-list">${groups.map(n=>{const survey=SURVEYS.find(x=>x.id===n.surveyId);return `<article class="payment-schedule-item"><div><b>${esc(survey?.name||'Pesquisa')}</b><span>${paymentNoticeDateLabel(n.scheduledFor)} até ${paymentNoticeTimeLabel(n.scheduledUntil)} · ${n.count} pesquisador${n.count===1?'':'es'}</span></div><p>${esc(n.message)}</p><div class="payment-schedule-values"><span>Valor devido: <b>${brl(n.amountDue)}</b></span><span>Já quitado: <b>${brl(n.amountPaid)}</b></span><span>Saldo informado: <b>${brl(n.amountRemaining)}</b></span></div></article>`;}).join('')}</div></section>`;
}
function researcherPaymentNoticesMarkup(){
  const notices=PAYMENT_NOTICES.filter(n=>n.researcherId===CURRENT_PROFILE?.id).slice(0,8);
  if(!notices.length)return `<div class="card mb payment-schedule-card payment-schedule-empty"><div class="card-t">Avisos de pagamento</div><div class="empty">Quando a PesquisaPro programar um repasse, o aviso aparecerá aqui.</div></div>`;
  return `<div class="card mb payment-schedule-card"><div class="payment-schedule-heading"><div><div class="card-t">Avisos de pagamento</div><div class="card-d">Acompanhe a data e o horário informados pela PesquisaPro.</div></div><span class="pill pill-blue">${notices.length}</span></div><div class="payment-schedule-list">${notices.map(n=>{const survey=SURVEYS.find(x=>x.id===n.surveyId);return `<article class="payment-schedule-item"><div><b>${esc(survey?.name||'Pesquisa')}</b><span>Pagamento até ${paymentNoticeDateLabel(n.scheduledFor)} às ${paymentNoticeTimeLabel(n.scheduledUntil)}</span></div><p>${esc(n.message)}</p><div class="payment-schedule-values"><span>Valor aprovado: <b>${brl(n.amountDue)}</b></span><span>Já quitado: <b>${brl(n.amountPaid)}</b></span><span>Saldo restante: <b>${brl(n.amountRemaining)}</b></span></div></article>`;}).join('')}</div></div>`;
}
function financeStaffCanManageReceipts(){return ['admin','coord','gerente','admpro'].includes(CURRENT_PROFILE?.role||selectedRole);}
function paymentReceiptFileLabel(receipt){
  const name=String(receipt?.receiptName||'comprovante de pagamento');
  return name.length>42?name.slice(0,39)+'…':name;
}
function paymentReceiptActionMarkup(receipt,context){
  if(receipt?.receiptPath)return `<div class="payment-receipt-actions"><button type="button" class="btn-ghost payment-receipt-view" onclick="paymentReceiptOpen(${jsArg(receipt.id)})">Abrir comprovante</button><button type="button" class="btn-ghost payment-receipt-download" onclick="paymentReceiptDownload(${jsArg(receipt.id)})">Baixar</button>${context==='staff'?`<button type="button" class="btn-ghost payment-receipt-edit" onclick="financeEditReceiptAmount(${jsArg(receipt.id)})">Alterar valor pago</button><button type="button" class="btn-ghost payment-receipt-delete" onclick="financeDeleteReceiptById(${jsArg(receipt.id)})">Excluir comprovante</button>`:''}<small title="${esc(receipt.receiptName||'')}" class="payment-receipt-name">${esc(paymentReceiptFileLabel(receipt))}</small></div>`;
  return context==='staff'
    ? `<div class="payment-receipt-actions"><button type="button" class="btn-ghost payment-receipt-attach" onclick="finAttachReceiptById(${jsArg(receipt.id)})">＋ Anexar comprovante de pagamento</button><button type="button" class="btn-ghost payment-receipt-edit" onclick="financeEditReceiptAmount(${jsArg(receipt.id)})">Alterar valor do pagamento</button></div>`
    : '<span class="payment-receipt-missing">Comprovante ainda não anexado</span>';
}
function financeReceiptRowAction(paymentId){
  const receipts=paymentReceiptsFor(paymentId);if(!receipts.length)return '';
  const pending=receipts.find(receipt=>!receipt.receiptPath),actions=[`<button type="button" class="btn-ghost finance-action-receipt-history" onclick="financeFocusReceiptHistory(${jsArg(paymentId)})">Ver/alterar pagamentos</button>`];
  if(pending)actions.push(`<button type="button" class="btn-ghost finance-action-receipt-attach" onclick="finAttachReceiptById(${jsArg(pending.id)})">＋ Anexar comprovante de pagamento</button><button type="button" class="btn-ghost finance-action-receipt-edit" onclick="financeEditReceiptAmount(${jsArg(pending.id)})">Alterar valor do pagamento</button>`);
  else if(receipts.length===1)actions.push(`<button type="button" class="btn-ghost finance-action-receipt-edit" onclick="financeEditReceiptAmount(${jsArg(receipts[0].id)})">Alterar valor do pagamento</button><button type="button" class="btn-ghost finance-action-receipt-delete" onclick="financeDeleteReceiptById(${jsArg(receipts[0].id)})">Excluir comprovante de pagamento</button>`);
  return `<div class="finance-receipt-row-actions">${actions.join('')}</div>`;
}
function paymentReceiptFileName(path){
  const raw=String(path||'').split('?')[0].split('/').pop()||'comprovante-pagamento';
  try{return decodeURIComponent(raw)||'comprovante-pagamento';}catch(ex){return raw;}
}
async function paymentReceiptSignedUrl(receipt){
  if(!receipt?.receiptPath)throw new Error('Comprovante ainda não anexado.');
  const {data,error}=await sb.storage.from('payment-receipts').createSignedUrl(receipt.receiptPath,600);
  if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária do comprovante indisponível.');
  return data.signedUrl;
}
async function paymentReceiptOpen(receiptId){
  const receipt=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);if(!receipt)return;
  const popup=window.open('about:blank','_blank','noopener');
  try{
    const url=await paymentReceiptSignedUrl(receipt);
    if(popup)popup.location.href=url;else window.open(url,'_blank','noopener');
  }catch(ex){if(popup)popup.close();alert('Não foi possível abrir o comprovante. Verifique se o arquivo existe e se a migration de comprovantes foi executada.');console.error(ex);}
}
async function paymentReceiptDownload(receiptId){
  const receipt=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);if(!receipt)return;
  try{
    const response=await fetch(await paymentReceiptSignedUrl(receipt));
    if(!response.ok)throw new Error('download HTTP '+response.status);
    const blob=await response.blob(),objectUrl=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=objectUrl;link.download=paymentReceiptFileName(receipt.receiptName||receipt.receiptPath);link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }catch(ex){alert('Não foi possível baixar o comprovante. Verifique se o arquivo existe e se o bucket privado está configurado.');console.error(ex);}
}
function paymentReceiptExtension(file){
  const byType={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  return byType[file?.type]||(String(file?.name||'').match(/\.([a-z0-9]+)$/i)?.[1]||'bin').toLowerCase();
}
async function paymentReceiptUpload(receiptId,file){
  if(!receiptId||!file)return false;
  if(PAYMENT_RECEIPTS_SCHEMA_MISSING){alert('Execute primeiro a migration deploy/comprovantes-pagamentos.sql no Supabase.');return false;}
  const accepted=/^(application\/pdf|image\/(jpeg|png|webp))$/i.test(file.type)||/\.(pdf|jpe?g|png|webp)$/i.test(file.name||'');
  if(!accepted){alert('Selecione um comprovante em PDF, JPG, PNG ou WebP.');return false;}
  if(file.size>10*1024*1024){alert('O comprovante deve ter no máximo 10 MB.');return false;}
  const ext=paymentReceiptExtension(file),randomPart=window.crypto?.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2),path='receipts/'+receiptId+'/'+randomPart+'.'+ext;
  const {error:uploadError}=await sb.storage.from('payment-receipts').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
  if(uploadError)throw new Error(uploadError.message);
  try{
    const {data,error}=await sb.rpc('attach_payment_receipt',{p_receipt_id:receiptId,p_storage_path:path,p_file_name:file.name||('comprovante.'+ext),p_mime_type:file.type||null,p_file_size:file.size||null});
    if(error)throw new Error(error.message);
    const updated=Array.isArray(data)?data[0]:data,local=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);
    if(local)Object.assign(local,paymentReceiptRowToEntry(updated||{...local,receipt_path:path,receipt_name:file.name||('comprovante.'+ext),receipt_mime_type:file.type||'',receipt_size:file.size||0}));
    return true;
  }catch(ex){
    await sb.storage.from('payment-receipts').remove([path]).catch(()=>{});
    if(/attach_payment_receipt|receipt_path|payment-receipts|schema cache|does not exist|function .* does not exist/i.test(ex.message||''))PAYMENT_RECEIPTS_SCHEMA_MISSING=true;
    throw ex;
  }
}
function finAttachReceiptById(receiptId){
  if(!financeStaffCanManageReceipts())return;
  const receipt=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);if(!receipt)return;
  const input=document.createElement('input');input.type='file';input.accept='application/pdf,image/jpeg,image/png,image/webp';input.style.display='none';document.body.appendChild(input);
  input.onchange=async()=>{
    const file=input.files?.[0];input.remove();if(!file)return;
    try{await paymentReceiptUpload(receiptId,file);alert('Comprovante anexado com segurança.');if(FIN_IDX!=null)financeReturnToDetail(FIN_IDX);else go('finance');}
    catch(ex){alert('Não foi possível anexar o comprovante. Verifique se o bucket privado e a migration deploy/comprovantes-pagamentos.sql foram executados no Supabase e tente novamente.');console.error(ex);}
  };
  input.click();
}
async function financeDeleteReceiptById(receiptId){
  if(!financeStaffCanManageReceipts())return;
  const receipt=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);if(!receipt?.receiptPath)return;
  if(!confirm('Excluir este comprovante? O pagamento, o valor, a data e o histórico serão preservados. Depois você poderá anexar o arquivo correto.'))return;
  try{
    const {data,error}=await sb.rpc('detach_payment_receipt',{p_receipt_id:receipt.id,p_storage_path:receipt.receiptPath});
    if(error)throw new Error(error.message);
    const updated=Array.isArray(data)?data[0]:data,local=PAYMENT_RECEIPTS.find(item=>item.id===receipt.id);
    if(local)Object.assign(local,paymentReceiptRowToEntry(updated||{...receipt,receipt_path:'',receipt_name:'',receipt_mime_type:'',receipt_size:0}));
    const {error:storageError}=await sb.storage.from('payment-receipts').remove([receipt.receiptPath]);
    alert(storageError
      ? 'Comprovante retirado do histórico. O arquivo antigo não foi removido fisicamente; anexe o arquivo correto e informe o administrador se necessário.'
      : 'Comprovante excluído. O pagamento e o histórico foram preservados; agora você pode anexar outro arquivo.');
    if(FIN_IDX!=null)financeReturnToDetail(FIN_IDX);else go('finance');
  }catch(ex){
    if(/detach_payment_receipt|receipt_path|payment-receipts|schema cache|does not exist|function .* does not exist/i.test(ex.message||''))PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING=true;
    alert('Não foi possível excluir o comprovante. Execute a migration deploy/excluir-comprovante-pagamento.sql no Supabase e tente novamente.');
    console.error(ex);
  }
}
async function financeEditReceiptAmount(receiptId){
  if(!financeStaffCanManageReceipts())return;
  const receipt=PAYMENT_RECEIPTS.find(item=>item.id===receiptId);if(!receipt)return;
  const currentAmount=Number(receipt.amount)||0;
  const raw=prompt('Novo valor pago deste lançamento (valor atual: '+brl(currentAmount)+'):',String(currentAmount.toFixed(2)).replace('.',','));
  if(raw==null)return;
  const amount=parsePaymentAmount(raw);
  if(amount==null){alert('Informe um valor pago válido e maior que zero.');return;}
  if(amount===Math.round(currentAmount*100)/100){alert('O novo valor é igual ao valor atual. Nenhuma alteração foi feita.');return;}
  const payment=PAYMENTS.find(item=>item.id===receipt.paymentId),survey=payment&&SURVEYS.find(item=>item.id===payment.surveyId);
  const due=payment&&survey?paymentDueValue(payment,+survey.price):null,otherReceived=payment?paymentReceivedValue(payment.id)-currentAmount:null;
  if(due!=null&&otherReceived!=null&&Math.round((otherReceived+amount)*100)/100>Math.round(due*100)/100){
    alert('O novo valor ultrapassa o saldo devido deste pagamento. O máximo permitido é '+brl(Math.max(0,due-otherReceived))+'.');return;
  }
  if(!confirm('Alterar o valor pago de '+brl(currentAmount)+' para '+brl(amount)+'?\n\nO mesmo lançamento, a data, o pesquisador, o comprovante e o histórico serão preservados. O total recebido e o saldo devido serão recalculados.'))return;
  try{
    const {data,error}=await sb.rpc('update_payment_receipt_amount',{p_receipt_id:receipt.id,p_amount:amount});
    if(error)throw new Error(error.message);
    const updated=Array.isArray(data)?data[0]:data,local=PAYMENT_RECEIPTS.find(item=>item.id===receipt.id);
    if(local)Object.assign(local,paymentReceiptRowToEntry(updated||{...receipt,amount}));
    alert('Valor pago alterado para '+brl(amount)+'. O saldo devido foi atualizado.');
    if(FIN_IDX!=null)financeReturnToDetail(FIN_IDX);else go('finance');
  }catch(ex){
    if(/update_payment_receipt_amount|payment_receipts|schema cache|does not exist|function .* does not exist/i.test(ex.message||''))PAYMENT_RECEIPTS_EDIT_SCHEMA_MISSING=true;
    alert('Não foi possível alterar o valor pago. Execute a migration deploy/alterar-valor-pagamento.sql no Supabase e tente novamente.');
    console.error(ex);
  }
}
function financeWhatsAppMessage(s,r){
  return 'Olá, '+(r?.name||'pesquisador')+'! Aqui é da PesquisaPro. Podemos conversar sobre suas coletas e pagamentos da pesquisa '+(s?.name||'')+'.';
}
function financePixMarkup(r){
  const key=String(r?.pixKey||'').trim();
  if(!key)return '<span class="pill pill-amber">Não informada</span>';
  return '<div class="finance-pix-cell"><code class="finance-pix-value" title="'+esc(key)+'">'+esc(key)+'</code><button type="button" class="btn-ghost finance-pix-copy" title="Copiar chave PIX" onclick="event.preventDefault();event.stopPropagation();copyTextValue('+jsArg(key)+',\'Chave PIX copiada.\')">Copiar PIX</button></div>';
}
function paymentReceiptMigrationNotice(){
  return PAYMENT_RECEIPTS_SCHEMA_MISSING||PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING||PAYMENT_RECEIPTS_EDIT_SCHEMA_MISSING||PAYMENT_INCREMENT_SCHEMA_MISSING
    ? '<div class="callout warn payment-ledger-warning"><b>Livro de recebimentos ainda não habilitado.</b> Execute <code>deploy/pagamentos-recebimentos-extrato.sql</code>, <code>deploy/comprovantes-pagamentos.sql</code>, <code>deploy/excluir-comprovante-pagamento.sql</code>, <code>deploy/alterar-valor-pagamento.sql</code> e <code>deploy/aprovacao-incremental-pagamentos.sql</code> no Supabase.</div>'
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
    .map(u=>({surveyId:s.id,researcherId:u.id,name:u.name,phone:u.phone||'',pixKey:u.pixKey||'',valid:0,rejected:0,status:'pendente',virtual:true}));
  return [...real,...virtual];
}
function finTotals(idx){
  const s=SURVEYS[idx];const rows=finRows(idx);const price=s?+s.price:5;
  const valid=rows.reduce((a,r)=>a+r.valid,0);
  const rejected=rows.reduce((a,r)=>a+r.rejected,0);
  const valor=rows.reduce((a,r)=>a+r.valid*price,0);
  const pendingValor=rows.reduce((a,r)=>a+paymentPendingDueValue(r,price),0);
  const recebido=rows.reduce((a,r)=>a+paymentReceivedValue(r.id),0);
  const aReceber=rows.reduce((a,r)=>a+paymentApprovedBalanceValue(r,price),0);
  const saldoDevido=rows.reduce((a,r)=>a+paymentBalanceValue(r,price),0);
  const aprovado=rows.reduce((a,r)=>a+paymentApprovedDueValue(r,price),0);
  const rejeitadoValor=rejected*price;
  return{valid,rejected,valor,aprovado,pendingValor,recebido,aReceber,saldoDevido,rejeitadoValor,count:rows.length};
}
function financeExportSafePart(value,fallback){
  return String(value||fallback||'escopo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||fallback||'escopo';
}
function financeReceivablesExportRows(idx){
  const scopes=idx==null
    ? SURVEYS.map((s,i)=>({s,i})).filter(({s})=>s&&!s.archivedAt)
    : [{s:SURVEYS[idx],i:idx}];
  const grouped=new Map();
  scopes.forEach(({s,i})=>{
    if(!s||s.archivedAt)return;
    const price=+s.price||0;
    finRows(i).forEach(r=>{
      const amount=paymentApprovedBalanceValue(r,price);
      if(amount<=0)return;
      const key=r.researcherId||('name:'+String(r.name||'').trim().toLowerCase());
      const current=grouped.get(key)||{name:r.name||'(pesquisador removido)',pixKey:'',amount:0,surveys:[]};
      current.amount=Math.round((current.amount+amount)*100)/100;
      if(!current.pixKey&&r.pixKey)current.pixKey=String(r.pixKey).trim();
      if(s.name&&!current.surveys.includes(s.name))current.surveys.push(s.name);
      grouped.set(key,current);
    });
  });
  return [...grouped.values()]
    .map(row=>({...row,amount:Math.round(row.amount*100)/100}))
    .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
async function financeExportReceivables(idx=null){
  if(!financeStaffCanManageReceipts())return;
  const rows=financeReceivablesExportRows(idx);
  if(!rows.length){alert('Não há pesquisadores com saldo aprovado a receber neste escopo.');return;}
  try{
    await loadLocalAsset('xlsx');
    const XLSXLib=window.XLSX;
    if(!XLSXLib?.utils?.json_to_sheet||!XLSXLib.writeFile)throw new Error('Biblioteca Excel indisponível.');
    const scopeLabel=idx==null?'Todas as pesquisas':(SURVEYS[idx]?.name||'Pesquisa');
    const data=rows.map(row=>({
      'Nome do pesquisador':row.name,
      'Chave PIX':row.pixKey||'Não informada',
      'Valor a receber (R$)':row.amount,
      'Pesquisas':row.surveys.join(' | ')
    }));
    const worksheet=XLSXLib.utils.json_to_sheet(data,{header:['Nome do pesquisador','Chave PIX','Valor a receber (R$)','Pesquisas']});
    worksheet['!cols']=[{wch:34},{wch:34},{wch:22},{wch:48}];
    for(let i=2;i<=data.length+1;i++){const cell=worksheet['C'+i];if(cell)cell.z='"R$" #,##0.00';}
    const total=rows.reduce((sum,row)=>sum+row.amount,0);
    const summary=XLSXLib.utils.aoa_to_sheet([
      ['Exportação de saldos a receber — PesquisaPro'],
      ['Escopo',scopeLabel],
      ['Pesquisadores com saldo',rows.length],
      ['Valor total a receber (R$)',Math.round(total*100)/100],
      ['Critério','Somente valor aprovado e ainda não recebido; pagamentos pendentes de aprovação não entram.'],
      ['Gerado em',new Date().toLocaleString('pt-BR')]
    ]);
    summary['!cols']=[{wch:34},{wch:100}];
    if(summary.B4)summary.B4.z='"R$" #,##0.00';
    const workbook=XLSXLib.utils.book_new();
    XLSXLib.utils.book_append_sheet(workbook,worksheet,'Saldos a receber');
    XLSXLib.utils.book_append_sheet(workbook,summary,'Resumo');
    const filename='saldos-a-receber-pesquisapro-'+financeExportSafePart(scopeLabel,'todas-pesquisas')+'-'+new Date().toISOString().slice(0,10)+'.xlsx';
    XLSXLib.writeFile(workbook,filename,{bookType:'xlsx',compression:true});
  }catch(ex){
    alert('Não foi possível gerar o Excel de saldos a receber. Tente novamente.');
    console.error(ex);
  }
}
let FINANCE_STATEMENT_EVENTS=[];
let FINANCE_STATEMENT_CONTEXT=null;
function financeStatementDate(value){
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('pt-BR');
}
function financeStatementClose(){
  const modal=document.getElementById('financeStatementModal');
  if(modal)modal.remove();
  FINANCE_STATEMENT_EVENTS=[];
  FINANCE_STATEMENT_CONTEXT=null;
}
function financeStatementPrint(){
  const modal=document.getElementById('financeStatementModal');
  if(!modal)return;
  modal.classList.add('is-printing');
  window.print();
  setTimeout(()=>modal.classList.remove('is-printing'),300);
}
function financeStatementCsv(){
  const context=FINANCE_STATEMENT_CONTEXT;
  if(!context)return;
  const rows=context.rows||[];
  const header=['Data','Coleta','Status financeiro','Valor considerado (R$)','Motivo da reprovação'];
  const lines=[header,...rows.map(row=>[
    financeStatementDate(row.event.ts),
    row.event.cota||'Sem cota',
    row.status,
    row.amount.toFixed(2).replace('.',','),
    row.event.status==='rejected'?(row.event.rejectReason||'Motivo não informado'):'—'
  ])].map(cols=>cols.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';'));
  const safe=financeExportSafePart(context.researcher.name,'pesquisador');
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='extrato-pesquisador-'+safe+'-'+new Date().toISOString().slice(0,10)+'.csv';
  link.style.display='none';document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function financeStatementSection(title,subtitle,rows,kind){
  const body=rows.length?rows.map(row=>`<div class="finance-statement-row ${kind}">
    <div><b>${esc(financeStatementDate(row.event.ts))}</b><span>${esc(row.event.cota||'Sem cota')}</span></div>
    <div><span class="finance-statement-status">${esc(row.status)}</span>${row.event.status==='rejected'?`<small>Motivo: ${esc(row.event.rejectReason||'Motivo não informado')}</small>`:''}</div>
    <strong>${brl(row.amount)}</strong>
  </div>`).join(''):'<div class="finance-statement-empty">Nenhuma coleta nesta categoria.</div>';
  return `<section class="finance-statement-section ${kind}"><div class="finance-statement-section-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle)}</p></div><span class="pill ${kind==='rejected'?'pill-red':kind==='paid'?'pill-green':kind==='audit'?'pill-amber':'pill-blue'}">${rows.length}</span></div><div class="finance-statement-list">${body}</div></section>`;
}
function financeStatementPaymentsSection(payment,survey,options={}){
  const receipts=payment?.id?paymentReceiptsFor(payment.id).slice().sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt))||String(b.createdAt).localeCompare(String(a.createdAt))):[];
  const received=receipts.reduce((sum,receipt)=>sum+(Number(receipt.amount)||0),0);
  const balance=paymentApprovedBalanceValue(payment,Number(survey?.price)||0);
  const canRegister=options.staff&&options.financeIdx!=null&&payment?.status==='aprovado'&&balance>0;
  const body=receipts.length?receipts.map(receipt=>`<article class="finance-statement-payment-row">
    <div class="finance-statement-payment-main"><div><b>${esc(paymentReceiptDateBR(receipt.paidAt))}</b><span>${receipt.createdAt?'Lançado em '+esc(paymentReceiptCreatedBR(receipt.createdAt)):'Repasse registrado'}</span></div><strong>${brl(receipt.amount)}</strong></div>
    <div class="finance-statement-payment-note"><span>Referência</span><b>${esc(receipt.note||'Pagamento registrado pela PesquisaPro')}</b></div>
    <div class="finance-statement-payment-file">${paymentReceiptActionMarkup(receipt,options.staff?'staff':'researcher')}</div>
  </article>`).join(''):'<div class="finance-statement-empty">Nenhum pagamento foi lançado para este pesquisador nesta pesquisa.</div>';
  const registerButton=canRegister?`<button type="button" class="btn btn-out" onclick="financeStatementClose();finRegisterPayment(${options.financeIdx},${jsArg(payment.researcherId)})">＋ Registrar novo pagamento</button>`:'';
  return `<section class="finance-statement-payments finance-statement-section"><div class="finance-statement-section-head"><div><h3>Pagamentos realizados e comprovantes</h3><p>Confira cada repasse, valor, data, referência e arquivo anexado. Ações de edição ficam disponíveis somente para a gestão.</p></div><span class="pill pill-green">${receipts.length}</span></div><div class="finance-statement-payment-summary"><span>Total lançado <b>${brl(received)}</b></span><span>Saldo aprovado a pagar <b>${brl(balance)}</b></span></div><div class="finance-statement-payment-list">${body}</div>${registerButton?`<div class="finance-statement-payment-footer">${registerButton}</div>`:''}</section>`;
}
function financeStatementRender(researcher, survey, payment, events, options={}){
  const isAuditCollectionStatus=event=>['audit','auditoria','em_auditoria','pending_audit','pending_recording','under_review'].includes(String(event?.status||'').toLocaleLowerCase('pt-BR').replace(/[ -]/g,'_'))||event?.audit===true||event?.underAudit===true;
  const validEvents=events.filter(event=>event.status==='valid'&&!isAuditCollectionStatus(event)).sort((a,b)=>a.ts-b.ts);
  const auditEvents=events.filter(isAuditCollectionStatus).sort((a,b)=>a.ts-b.ts);
  const rejectedEvents=events.filter(event=>event.status==='rejected').sort((a,b)=>(b.rejectedAt||b.ts)-(a.rejectedAt||a.ts));
  const price=Number(survey?.price)||0;
  const approvedCount=paymentApprovedValidValue(payment);
  const received=paymentReceivedValue(payment?.id);
  const paidEquivalent=price>0?Math.min(approvedCount,Math.floor((received+0.000001)/price)):0;
  const paidAmount=Math.min(received,approvedCount*price);
  const approvedToPayCount=Math.max(0,approvedCount-paidEquivalent);
  const approvedToPayAmount=Math.max(0,paymentApprovedBalanceValue(payment,price));
  const paymentIsUnderAudit=String(payment?.status||'').toLocaleLowerCase('pt-BR')==='auditoria';
  const paidRows=validEvents.slice(0,paidEquivalent).map(event=>({event,status:'Aprovada e já paga',amount:price}));
  const toPayRows=validEvents.slice(paidEquivalent,approvedCount).map(event=>({event,status:'Aprovada e a pagar',amount:price}));
  const pendingRows=validEvents.slice(approvedCount).map(event=>({event,status:'Válida — aguardando aprovação financeira',amount:price}));
  const auditRowsFromEvents=auditEvents.map(event=>({event,status:event.status==='pending_recording'?'Áudio pendente — não aprovada; valor potencial':'Em auditoria — pode ser aprovada',amount:price}));
  const auditEventIds=new Set(auditRowsFromEvents.map(row=>row.event.id).filter(Boolean));
  const auditRowsFromPayment=paymentIsUnderAudit?pendingRows.filter(row=>!auditEventIds.has(row.event.id)) : [];
  const auditRows=[...auditRowsFromEvents,...auditRowsFromPayment];
  const pendingFinanceRows=paymentIsUnderAudit?[]:pendingRows.filter(row=>!auditEventIds.has(row.event.id));
  const auditAmount=auditRows.reduce((sum,row)=>sum+row.amount,0);
  const pendingFinanceAmount=pendingFinanceRows.reduce((sum,row)=>sum+row.amount,0);
  const rejectedRows=rejectedEvents.map(event=>({event,status:'Rejeitada — não gera pagamento',amount:0}));
  const allRows=[...paidRows,...toPayRows,...auditRows,...pendingFinanceRows,...rejectedRows];
  const statementStaff=options.staff===true;
  FINANCE_STATEMENT_CONTEXT={researcher,survey,payment,rows:allRows,staff:statementStaff,financeIdx:options.financeIdx??null};
  const partial=Number((received-paidEquivalent*price).toFixed(2));
  const partialNote=partial>0?` Existe também ${brl(partial)} de pagamento parcial sem equivalência de formulário completo.`:'';
  const modal=document.createElement('div');
  modal.id='financeStatementModal';
  modal.className='finance-statement-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.innerHTML=`<div class="finance-statement-backdrop" onclick="financeStatementClose()"></div><div class="finance-statement-dialog" role="document">
    <div class="finance-statement-head"><div><span class="eyebrow">EXTRATO INDIVIDUAL</span><h2>${esc(researcher.name||'Pesquisador')}</h2><p>${esc(survey.name||'Pesquisa')} · valor por formulário ${brl(price)}</p></div><button type="button" class="finance-statement-close" onclick="financeStatementClose()" aria-label="Fechar extrato">×</button></div>
    <div class="finance-statement-actions"><button type="button" class="btn btn-out" onclick="financeStatementPrint()">🖨️ Imprimir / salvar PDF</button><button type="button" class="btn btn-out" onclick="financeStatementCsv()">⇩ Baixar CSV</button><button type="button" class="btn btn-fill" onclick="financeStatementClose()">Fechar</button></div>
    <div class="finance-statement-summary"><div><span>Coletas válidas</span><b>${validEvents.length}</b></div><div class="paid"><span>Aprovadas e já pagas</span><b>${paidEquivalent} · ${brl(paidAmount)}</b></div><div class="to-pay"><span>Aprovadas e a pagar</span><b>${approvedToPayCount} · ${brl(approvedToPayAmount)}</b></div><div class="audit"><span>Em auditoria</span><b>${auditRows.length} · ${brl(auditAmount)}</b></div><div class="pending"><span>Aguardando aprovação</span><b>${pendingFinanceRows.length} · ${brl(pendingFinanceAmount)}</b></div><div class="rejected"><span>Rejeitadas</span><b>${rejectedEvents.length}</b></div></div>
    <div class="finance-statement-balance"><b>Motivo do saldo para pagamento</b><span>O saldo a pagar é formado pelas coletas válidas já aprovadas para pagamento, menos os repasses lançados. Coletas rejeitadas não entram no saldo. Coletas em auditoria aparecem separadas com seu valor potencial e somente entram no saldo se forem aprovadas.${partialNote}</span><strong>Saldo aprovado a pagar: ${brl(approvedToPayAmount)}</strong></div>
    ${financeStatementSection('Aprovadas e já pagas','Coletas válidas classificadas até o valor já quitado.',paidRows,'paid')}
    ${financeStatementSection('Aprovadas e a pagar','Coletas válidas já aprovadas financeiramente, mas ainda sem quitação integral.',toPayRows,'to-pay')}
    ${financeStatementSection('Em auditoria','Valor potencial destas coletas. Se aprovadas, poderão entrar no saldo a receber em um próximo pagamento.',auditRows,'audit')}
    ${financeStatementSection('Rejeitadas e motivo','Não geram valor a pagar; o motivo registrado na auditoria é mantido abaixo.',rejectedRows,'rejected')}
    ${pendingFinanceRows.length?financeStatementSection('Válidas aguardando aprovação financeira','Ainda não compõem o saldo aprovado a pagar.',pendingFinanceRows,'pending'):''}
    ${financeStatementPaymentsSection(payment,survey,{staff:statementStaff,financeIdx:options.financeIdx})}
    <div class="finance-statement-note">A separação entre coletas pagas e a pagar é uma classificação financeira por quantidade equivalente ao valor já recebido. O banco registra pagamentos agregados por pesquisador e pesquisa, não um vínculo individual entre cada recibo e cada entrevista. Coletas em auditoria são potenciais e não representam pagamento garantido.</div>
  </div>`;
  document.body.appendChild(modal);
  if(options.focusPayments){
    const dialog=modal.querySelector('.finance-statement-dialog'),payments=modal.querySelector('.finance-statement-payments');
    if(dialog&&payments)dialog.scrollTop=Math.max(0,payments.offsetTop-12);
  }
  modal.querySelector('.finance-statement-close')?.focus();
}
async function financeOpenResearcherStatement(idx,researcherId,options={}){
  if(!financeStaffCanManageReceipts())return;
  const survey=SURVEYS[idx],payment=finRows(idx).find(row=>row.researcherId===researcherId);
  if(!survey||!payment||payment.virtual){alert('Ainda não há coletas registradas para emitir este extrato.');return;}
  try{
    let events=[];
    if(COLLECT_EVENTS_LOADED)events=eventsForSurveyIdx(idx).filter(event=>event.researcherId===researcherId);
    else{
      const {data,error}=await fetchCollectionEvents({surveyId:survey.id});
      if(error)throw new Error(error.message);
      events=(data||[]).map(collectionEventRowToEntry).filter(event=>event.researcherId===researcherId);
    }
    if(!events.length){alert('Nenhuma coleta foi encontrada para este pesquisador nesta pesquisa.');return;}
    financeStatementRender(payment,survey,payment,events,{...options,staff:true,financeIdx:idx});
  }catch(ex){alert('Não foi possível carregar o extrato deste pesquisador. Tente novamente.');console.error(ex);}
}

async function researcherOpenOwnStatement(surveyId){
  if(CURRENT_PROFILE?.role!=='pesq')return;
  const survey=SURVEYS.find(item=>item.id===surveyId);
  if(!survey){alert('A pesquisa deste extrato não está disponível.');return;}
  const payment=PAYMENTS.find(item=>item.surveyId===surveyId&&item.researcherId===CURRENT_PROFILE.id)||{
    id:null,surveyId,researcherId:CURRENT_PROFILE.id,name:CURRENT_PROFILE.name||'',valid:0,rejected:0,status:'pendente',approvedValidCount:0
  };
  try{
    const {data,error}=await fetchCollectionEvents({surveyId,ownOnly:true});
    if(error)throw new Error(error.message);
    const events=(data||[]).map(collectionEventRowToEntry).filter(event=>event.researcherId===CURRENT_PROFILE.id);
    if(!events.length){alert('Nenhuma coleta foi encontrada nesta pesquisa.');return;}
    financeStatementRender({id:CURRENT_PROFILE.id,name:CURRENT_PROFILE.name||payment.name||'Pesquisador'},survey,payment,events,{staff:false});
  }catch(ex){alert('Não foi possível carregar seu extrato. Tente novamente.');console.error(ex);}
}

PAGES.finance=()=>{
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED||!PAYMENT_RECEIPTS_LOADED||!PAYMENT_NOTICES_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    if(!PAYMENT_RECEIPTS_LOADED)loadPaymentReceiptsIfNeeded();
    if(!PAYMENT_NOTICES_LOADED)loadPaymentNoticesIfNeeded();
    return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada')+'<div class="empty">Carregando dados financeiros…</div>';
  }
  if(FIN_IDX!=null&&SURVEYS[FIN_IDX]?.archivedAt)FIN_IDX=null;
  if(FIN_IDX!=null)return financeDetail(FIN_IDX);
  return financeList();
};
function financeList(){
  const entries=SURVEYS.map((s,i)=>({s,i,t:finTotals(i)})).filter(entry=>!entry.s.archivedAt);
  const totalValor=entries.reduce((a,e)=>a+e.t.valor,0);
  const totalPend=entries.reduce((a,e)=>a+e.t.pendingValor,0);
  const totalRecebido=entries.reduce((a,e)=>a+e.t.recebido,0);
  const totalAReceber=entries.reduce((a,e)=>a+e.t.aReceber,0);
  const totalSaldoDevido=entries.reduce((a,e)=>a+e.t.saldoDevido,0);
  const totalValid=entries.reduce((a,e)=>a+e.t.valid,0);
  const totalPesq=new Set(entries.flatMap(({i})=>finRows(i).map(r=>r.researcherId).filter(Boolean))).size;
  const body=entries.map(({s,i,t})=>`<tr style="cursor:pointer" onclick="financeOpen(${i})">
      <td><b>${esc(s.name)}</b><div style="margin-top:2px">${STATUS_PILL[s.status]||s.status}</div></td>
      <td>${t.count?t.count+' pesquisador'+(t.count===1?'':'es'):'<span style="color:var(--ink3)">sem coleta</span>'}</td>
      <td>${t.valid.toLocaleString('pt-BR')}</td>
      <td><b>${brl(t.valor)}</b><div class="finance-balance-inline">Saldo devido: ${brl(t.saldoDevido)}</div></td>
      <td>${t.aReceber?'<span class="pill pill-blue">'+brl(t.aReceber)+' a receber</span>':t.pendingValor?'<span class="pill pill-amber">'+brl(t.pendingValor)+' pendente</span>':(t.count?'<span class="pill pill-green">Tudo em dia</span>':'<span style="color:var(--ink3)">—</span>')}</td>
      <td><span class="pill pill-blue">Abrir →</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma pesquisa cadastrada.</td></tr>';
  return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada',
    '<button class="btn btn-out" onclick="announcePaymentSchedule()">◷ Anunciar programação de pagamento</button><button class="btn btn-out" onclick="financeExportReceivables()">⇩ Exportar Excel — saldos a receber</button>')+`
  ${paymentReceiptMigrationNotice()}
  ${paymentNoticeMigrationNotice()}
  ${financePaymentScheduleMarkup(null)}
  <div class="grid finance-overview-summary" style="margin-bottom:16px">
    ${stat('TOTAL A PAGAR EM TODAS AS PESQUISAS',brl(totalValor),totalValid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('QUANTIDADE DE PESQUISADORES',String(totalPesq),'pesquisadores únicos com registros','☺','#059669')}
    ${stat('PAGAMENTOS PARCIAIS REALIZADOS',brl(totalRecebido),'repasses já lançados','◐','#059669')}
    ${stat('PAGAMENTOS A APROVAR',brl(totalPend),'novas coletas aguardando aprovação','◷','#d97706')}
    ${stat('FALTA PAGAR',brl(totalSaldoDevido),'total devido menos pagamentos lançados','◉','#0f766e')}
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
    const aprovado=paymentApprovedDueValue(r,price);
    const pendingValid=paymentPendingValidValue(r),pendingValue=paymentPendingDueValue(r,price);
    const valorAprovar=pendingValue;
    const recebido=paymentReceivedValue(r.id);
    const aReceber=paymentApprovedBalanceValue(r,price);
    const saldoDevido=Math.max(0,valor-recebido);
    const whatsappButton=r.phone?conversationButton(r.phone,financeWhatsAppMessage(s,r)):'<span class="finance-contact-missing">Sem telefone</span>';
    const pixShown=financePixMarkup(r);
    const approveButton=r.virtual||!pendingValid
      ?'<button type="button" class="btn-ghost finance-action-approve" disabled title="'+(r.virtual?'O pagamento será criado quando houver uma coleta válida':'Não há novas entrevistas aguardando aprovação')+'">'+(r.status==='aprovado'?'✓ Tudo aprovado':'Aprovar pagamento')+'</button>'
      :'<button type="button" class="btn-ghost finance-action-approve" onclick="finApprovePayment('+idx+','+jsArg(r.researcherId)+')">'+(r.status==='aprovado'?'Aprovar novas coletas':'Aprovar pagamento')+'</button>';
    const receiptButton=r.virtual||!r.valid||r.status!=='aprovado'||aReceber<=0?'':'<button class="btn-ghost finance-action-receipt" onclick="finRegisterPayment('+idx+','+jsArg(r.researcherId)+')">＋ Registrar pagamento semanal</button>';
    const statementButton=r.virtual?'':'<button type="button" class="btn-ghost finance-action-statement" title="Ver coletas, pagamentos e comprovantes" onclick="financeOpenResearcherStatement('+idx+','+jsArg(r.researcherId)+')">▤ Extrato de pagamento</button>';
    const receiptRowAction=financeReceiptRowAction(r.id);
    const statusButton=r.virtual?'':'<button class="btn-ghost" onclick="finEditPayment('+idx+','+jsArg(r.researcherId)+')">Alterar status</button>';
    const approvalNote=pendingValid?'<div class="finance-status-sub finance-status-pending">'+pendingValid+' nova'+(pendingValid===1?'':'s')+' · '+brl(pendingValue)+' aguardando aprovação</div>':(r.approvedValidCount?'<div class="finance-status-sub finance-status-approved">'+r.approvedValidCount+' entrevista'+(r.approvedValidCount===1?'':'s')+' aprovada'+(r.approvedValidCount===1?'':'s')+'</div>':'');
    return `<tr class="${pendingValid?'finance-row-has-pending':''}"><td><b>${esc(r.name)}</b>${r.virtual?'<div class="finance-row-note">Sem pagamento criado ainda</div>':''}</td><td>${r.valid}</td><td>${r.rejected}</td><td><b>Total: ${brl(valor)}</b><div class="finance-value-breakdown">Coletas válidas</div></td><td><b>Quitado: ${brl(recebido)}</b><div class="finance-balance-note">Repasses já lançados</div></td><td>${valorAprovar?'<b class="finance-value-pending">'+brl(valorAprovar)+'</b>':'<span class="pill pill-gray">R$ 0,00</span>'}<div class="finance-balance-note">Novas coletas aguardando aprovação</div></td><td>${aReceber?'<b class="finance-to-receive">'+brl(aReceber)+'</b>':'<span class="pill pill-gray">R$ 0,00</span>'}<div class="finance-balance-note">Saldo aprovado a receber</div></td><td>${pixShown||'<span style="color:var(--ink3)">—</span>'}</td><td>${st.pill}${approvalNote}</td>
      <td class="finance-actions-cell"><div class="finance-row-actions">${statementButton}${whatsappButton}${approveButton}${receiptButton}${receiptRowAction}${statusButton}</div></td></tr>`;
  }).join(''):'<tr><td colspan="10" class="empty">Nenhum pesquisador atribuído a esta pesquisa ainda — atribua a equipe em Minhas pesquisas.</td></tr>';
  return head('Financeiro — '+s.name,'Pagamento por entrevista válida coletada nesta pesquisa',
    '<button class="btn btn-out" onclick="financeBack()">← Financeiro</button>'+ 
    (rows.length?'<button class="btn btn-out" onclick="finApproveAll('+idx+')">✓ Aprovar todos os pagamentos</button><button class="btn btn-out" onclick="announcePaymentSchedule('+idx+')">◷ Anunciar pagamento deste saldo</button><button class="btn btn-out" onclick="financeExportReceivables('+idx+')">⇩ Exportar Excel — saldos a receber</button>':''))+`
  ${paymentReceiptMigrationNotice()}
  ${paymentNoticeMigrationNotice()}
  ${financePaymentScheduleMarkup(s.id)}
  <div class="grid g4 finance-summary-grid" style="margin-bottom:16px">
    ${stat('TOTAL A PAGAR NESTA PESQUISA',brl(t.valor),t.valid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('QUANTIDADE DE PESQUISADORES',String(t.count),'com coleta nesta pesquisa','☺','#059669')}
    ${stat('VALOR POR FORMULÁRIO',brl(price),'região remota: '+brl(priceRemote),'◷','#7c3aed')}
    ${stat('PAGAMENTOS PARCIAIS',brl(t.recebido),'repasses já lançados','◐','#059669')}
    ${stat('PAGAMENTOS A APROVAR',brl(t.pendingValor),'novas coletas para aprovar','◷','#d97706')}
    ${stat('FALTA PAGAR',brl(t.saldoDevido),'total devido menos repasses','◉','#0f766e')}
  </div>
  <div class="finance-approval-banner"><div class="finance-approval-banner-icon">✓</div><div><b>Aprovação por etapas</b><span>Os recebimentos parciais continuam registrados. Quando surgirem novas entrevistas válidas, o botão <b>Aprovar novas coletas</b> aparece somente para o valor ainda não aprovado.</span></div><div class="finance-approval-banner-total"><small>Ganho total do pesquisador</small><strong>${brl(t.valor)}</strong></div><div class="finance-approval-summary"><span>Valor aprovado <b>${brl(t.aprovado)}</b></span><span>Já quitado <b>${brl(t.recebido)}</b></span><span>Saldo após quitação <b>${brl(t.aReceber)}</b></span></div></div>
  <div class="card mb finance-payments-card">
    <div class="card-t">Pagamentos por pesquisador</div>
    <div class="finance-weekly-callout"><b>Pagamentos semanais durante a coleta:</b> aprove o valor válido disponível e use <b>Registrar pagamento semanal</b> para informar quanto foi pago, a data e a referência da semana. Cada lançamento reduz imediatamente o <b>Saldo devido</b>; novas entrevistas válidas aumentam o valor devido sem apagar o histórico. Se houver erro no valor, use <b>Alterar valor pago</b> no lançamento correspondente; o mesmo comprovante e histórico serão preservados. Depois de pagar, use <b>Anexar comprovante</b> na própria linha ou no histórico abaixo.</div>
    <div class="card-d">Válidos e rejeitados vêm das coletas de campo. Rejeitadas são apenas informativas e não entram em pendente, a receber ou recebido. <b>Aprovar pagamento</b> move o valor válido para “A receber”; <b>Registrar pagamento semanal</b> lança um repasse total ou parcial com data. Use <b>Conversar</b> para abrir o WhatsApp do pesquisador e consulte ou copie a chave PIX nesta mesma linha.</div>
    <div class="finance-table-hint" role="note">Cada pesquisador aparece em um cartão completo: valores, saldo, PIX, status e ações ficam no mesmo bloco, sem esconder informações atrás de outra coluna.</div>
    <div class="finance-payment-legend"><span><i class="finance-legend-dot finance-legend-green"></i> Aprovado</span><span><i class="finance-legend-dot finance-legend-amber"></i> Novas coletas</span><span><i class="finance-legend-dot finance-legend-blue"></i> A receber</span><span><i class="finance-legend-dot finance-legend-gray"></i> Já recebido</span></div>
    <div class="finance-table-scroll"><table class="finance-data-table"><thead><tr><th>Pesquisador</th><th>Coletas válidas</th><th>Coletas rejeitadas</th><th>Valor total coleta válida</th><th>Valor quitado</th><th>Valor coleta a aprovar</th><th>Saldo de coleta a receber</th><th>Chave PIX</th><th>Status</th><th class="finance-actions-header">Ações / contato</th></tr></thead>
    <tbody>${body}</tbody></table>
    </div>
  </div>
  ${financeReceiptHistoryHtml(idx)}
  <div class="grid g2">
    <div class="card"><div class="card-t" style="font-size:13px">Tabela de valores desta pesquisa</div>
      <table style="margin-top:6px"><tbody>
        <tr><td>Formulário padrão</td><td style="text-align:right"><b>${brl(price)}</b></td></tr>
        <tr><td>Formulário em região remota</td><td style="text-align:right"><b>${brl(priceRemote)}</b></td></tr>
        <tr><td>Bônus meta diária</td><td style="text-align:right"><b>Não configurado</b></td></tr>
      </tbody></table>
      <div class="card-d" style="margin-top:10px">A alteração de valores de uma pesquisa em andamento pode afetar contratos e pagamentos. Esta tela é apenas de consulta; edição direta indisponível.</div>
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
  const body=receipts.length?receipts.map(r=>`<tr data-payment-id="${esc(r.paymentId)}"><td>${esc(byId.get(r.paymentId)?.name||'(pesquisador removido)')}</td><td>${esc(paymentReceiptDateBR(r.paidAt))}</td><td><b>${brl(r.amount)}</b></td><td>${esc(r.note||'—')}</td><td>${paymentReceiptActionMarkup(r,'staff')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nenhum repasse lançado nesta pesquisa.</td></tr>';
  return `<div id="financeReceiptHistory" class="card mb"><div class="card-t">Histórico de recebimentos</div><div class="card-d">Lançamentos registrados para ${esc(s.name)}. O histórico é cumulativo e não apaga as entrevistas nem as reprovações. Para corrigir um pagamento, use <b>Alterar valor pago</b> na linha do repasse correspondente. Quando houver vários repasses, confira a soma e ajuste os lançamentos necessários para chegar ao total correto.</div><div class="finance-table-scroll"><table class="finance-data-table finance-receipts-table"><thead><tr><th>Pesquisador</th><th>Data do pagamento</th><th>Valor recebido</th><th>Observação</th><th>Comprovante e ações</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function financeFocusReceiptHistory(paymentId){
  const idx=Number.isInteger(FIN_IDX)?FIN_IDX:-1,paymentRow=idx>=0?finRows(idx).find(item=>String(item.id)===String(paymentId)):null;
  if(paymentRow?.researcherId){financeOpenResearcherStatement(idx,paymentRow.researcherId,{focusPayments:true});return;}
  const history=document.getElementById('financeReceiptHistory');if(!history)return;
  history.scrollIntoView({behavior:'smooth',block:'center'});
  const row=Array.from(history.querySelectorAll('tr[data-payment-id]')).find(item=>item.dataset.paymentId===String(paymentId));
  if(row){row.classList.add('finance-receipt-highlight');setTimeout(()=>row.classList.remove('finance-receipt-highlight'),2200);}
}
function financeReturnToDetail(idx){if(document.getElementById('financeStatementModal'))financeStatementClose();FIN_IDX=idx;FIN_ARMED=true;go('finance');}
async function finApprovePayment(idx,researcherId){
  const s=SURVEYS[idx],current=finRows(idx).find(r=>r.researcherId===researcherId);if(!s||!current||current.virtual||!current.valid)return;
  const pendingValid=paymentPendingValidValue(current);if(!pendingValid){alert('Não há novas entrevistas aguardando aprovação para este pesquisador.');return;}
  const pendingDue=paymentPendingDueValue(current,+s.price);
  if(!confirm('Aprovar '+brl(pendingDue)+' de '+pendingValid+' nova'+(pendingValid===1?'':'s')+' entrevista'+(pendingValid===1?'':'s')+' para '+current.name+'? O valor ficará em “A receber” até um repasse ser registrado.'))return;
  try{
    const {data,error}=await sb.rpc('approve_payment_increment',{p_payment_id:current.id});
    if(error)throw new Error(error.message);
    const updated=Array.isArray(data)?data[0]:data;
    if(updated)Object.assign(current,paymentRowToEntry(updated));else{current.approvedValidCount=current.valid;current.status='aprovado';}
  }catch(ex){
    if(/approve_payment_increment|approved_valid_count|schema cache|does not exist|function .* does not exist/i.test(ex.message||''))PAYMENT_INCREMENT_SCHEMA_MISSING=true;
    alert('Não foi possível aprovar as novas coletas. Execute a migration deploy/aprovacao-incremental-pagamentos.sql no Supabase e tente novamente.');console.error(ex);return;
  }
  financeReturnToDetail(idx);
}
async function finApproveAll(idx){
  const s=SURVEYS[idx];if(!s)return;
  const eligible=finRows(idx).filter(r=>!r.virtual&&paymentPendingValidValue(r)>0);
  if(!eligible.length){alert('Não há pagamentos pendentes de aprovação nesta pesquisa.');return;}
  const total=eligible.reduce((sum,r)=>sum+paymentPendingDueValue(r,+s.price),0);
  if(!confirm('Aprovar '+eligible.length+' pagamento(s), no total de '+brl(total)+'? Os valores ficarão em “A receber”.'))return;
  try{
    const {data,error}=await sb.rpc('approve_payment_batch',{p_survey_id:s.id});
    if(error)throw new Error(error.message);
    const approvedCount=Number(data)||eligible.length;
    PAYMENTS.filter(p=>p.surveyId===s.id&&paymentPendingValidValue(p)>0).forEach(p=>{p.status='aprovado';p.approvedValidCount=p.valid;});
    alert(approvedCount+' pagamento(s) aprovado(s).');
  }catch(ex){alert('Não foi possível aprovar em lote. Execute a migration pagamentos-recebimentos-extrato.sql no Supabase e tente novamente.');console.error(ex);return;}
  financeReturnToDetail(idx);
}
function localIsoDate(){const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}
function validPaymentTime(value){const text=String(value||'').trim(),match=text.match(/^(\d{2}):(\d{2})$/);if(!match)return false;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<=23&&m>=0&&m<=59;}
async function announcePaymentSchedule(idx=null){
  if(!financeStaffCanManageReceipts())return;const survey=idx==null?null:SURVEYS[idx];if(idx!=null&&!survey)return;
  const date=prompt('Dia previsto para o pagamento (AAAA-MM-DD):',localIsoDate());if(date==null)return;if(!validPaymentDate(date)){alert('Informe uma data válida no formato AAAA-MM-DD.');return;}
  const until=prompt('Até que horas o pagamento será realizado? (HH:MM):','18:00');if(until==null)return;if(!validPaymentTime(until)){alert('Informe um horário válido no formato HH:MM.');return;}
  const preview='Pagamento programado para '+paymentNoticeDateLabel(date)+' até '+until+'. Serão pagos os valores aprovados e contabilizados até este momento; outros saldos e novas coletas serão pagos posteriormente.';
  if(!confirm('Enviar este aviso aos pesquisadores'+(survey?' da pesquisa '+survey.name:'')+'?\n\n'+preview))return;
  try{const {data,error}=await sb.rpc('announce_payment_schedule',{p_survey_id:survey?.id||null,p_scheduled_for:date,p_scheduled_until:until,p_message:null});if(error)throw new Error(error.message);const count=Number(data)||0;PAYMENT_NOTICES_LOADED=false;await loadPaymentNoticesIfNeeded();alert(count?('Aviso enviado para '+count+' pesquisador'+(count===1?'':'es')+'.'):'Nenhum pesquisador possui saldo aprovado a receber neste escopo.');if(idx!=null)financeReturnToDetail(idx);else go('finance');}
  catch(ex){PAYMENT_NOTICES_SCHEMA_MISSING=/announce_payment_schedule|payment_notices|schema cache|does not exist|function .* does not exist/i.test(ex.message||'');alert('Não foi possível enviar o aviso. Execute a migration deploy/avisos-programacao-pagamento.sql no Supabase e tente novamente.');console.error(ex);}
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
  const due=paymentApprovedDueValue(current,+s.price),received=paymentReceivedValue(current.id),balance=Math.max(0,due-received);if(balance<=0){alert(paymentPendingValidValue(current)>0?'Há novas entrevistas aguardando aprovação antes de registrar outro repasse.':'Este pagamento já foi recebido integralmente.');return;}
  const amount=parsePaymentAmount(prompt('Valor pago para '+current.name+' (máximo '+brl(balance)+'). Pagamentos parciais são permitidos:',String(balance.toFixed(2)).replace('.',',')));
  if(amount==null){alert('Informe um valor pago válido.');return;}
  if(amount>balance){alert('O valor informado ultrapassa o saldo a receber de '+brl(balance)+'.');return;}
  const today=new Date().toISOString().slice(0,10);
  const paidAt=prompt('Data do pagamento (AAAA-MM-DD):',today);if(paidAt==null)return;
  if(!validPaymentDate(paidAt)){alert('Informe uma data válida no formato AAAA-MM-DD.');return;}
  const weekLabel=paidAt.split('-').reverse().join('/');
  const note=prompt('Observação ou referência do pagamento semanal (opcional):','Pagamento semanal — '+weekLabel);if(note==null)return;
  try{
    const {data,error}=await sb.rpc('record_payment_receipt',{p_payment_id:current.id,p_amount:amount,p_paid_at:paidAt,p_note:note.trim()||null});
    if(error)throw new Error(error.message);
    const row=Array.isArray(data)?data[0]:data;if(row)PAYMENT_RECEIPTS.unshift(paymentReceiptRowToEntry(row));
  }catch(ex){alert('Não foi possível registrar o pagamento. Verifique se a migration pagamentos-recebimentos-extrato.sql foi executada e se o valor ainda está disponível.');console.error(ex);return;}
  alert('Pagamento semanal registrado em '+paidAt+'. Saldo devido atualizado. No histórico abaixo, use “Anexar comprovante” para guardar o comprovante deste repasse.');
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
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED||!COLLECT_EVENTS_LOADED||!PAYMENT_RECEIPTS_LOADED||!PAYMENT_NOTICES_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
    if(!PAYMENT_RECEIPTS_LOADED)loadPaymentReceiptsIfNeeded();
    if(!PAYMENT_NOTICES_LOADED)loadPaymentNoticesIfNeeded();
    return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+'<div class="empty">Carregando seus dados financeiros…</div>';
  }
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const mine=PAYMENTS.filter(p=>p.researcherId===myId);
  const paymentBySurvey=new Map(mine.map(payment=>[payment.surveyId,payment]));
  const participatedSurveyIds=[...new Set(mine.map(payment=>payment.surveyId).concat(COLLECT_EVENTS.filter(event=>event.researcherId===myId).map(event=>event.surveyId)))];
  const rowsData=participatedSurveyIds.map(surveyId=>{
    const p=paymentBySurvey.get(surveyId)||(()=>{
      const events=COLLECT_EVENTS.filter(event=>event.researcherId===myId&&event.surveyId===surveyId);
      return {id:null,surveyId,researcherId:myId,name:CURRENT_PROFILE?.name||'',valid:events.filter(event=>event.status==='valid').length,rejected:events.filter(event=>event.status==='rejected').length,status:'pendente'};
    })();
    const s=SURVEYS.find(x=>x.id===p.surveyId);
    const archived=!!s?.archivedAt||!s;
    const price=s?+s.price:0;
    const valor=archived?0:paymentDueValue(p,price),recebido=paymentReceivedValue(p.id),aprovado=archived?0:paymentApprovedDueValue(p,price),pendente=Math.max(0,valor-aprovado),aReceber=archived?0:Math.max(0,aprovado-recebido),saldoDevido=archived?0:Math.max(0,valor-recebido);
    return {payment:p,survey:s?(archived?s.name+' (arquivada)':s.name):'(pesquisa removida)',valid:p.valid,rejected:p.rejected,valor,aprovado,pendente,recebido,aReceber,saldoDevido,rejectedValor:archived?0:p.rejected*price,status:archived?'arquivado':p.status};
  });
  const aReceber=rowsData.reduce((a,r)=>a+r.aReceber,0),recebido=rowsData.reduce((a,r)=>a+r.recebido,0);
  const pendente=rowsData.filter(r=>r.status==='pendente').reduce((a,r)=>a+r.valor,0),auditoria=rowsData.filter(r=>r.status==='auditoria').reduce((a,r)=>a+r.valor,0);
  const rejeitadas=rowsData.reduce((a,r)=>a+r.rejected,0),rejeitadasValor=rowsData.reduce((a,r)=>a+r.rejectedValor,0);
  const histRows=rowsData.length?rowsData.map(r=>`<tr><td><b>${esc(r.survey)}</b></td><td>${r.valid}</td><td>${r.rejected}${r.rejectedValor?'<div class="earnings-rejected-value">'+brl(r.rejectedValor)+' não contabilizado</div>':''}</td><td><b>${brl(r.aprovado)}</b>${r.pendente?'<div class="finance-value-pending">Pendente: '+brl(r.pendente)+'</div>':''}</td><td><b>${brl(r.recebido)}</b></td><td>${r.aReceber?'<b class="finance-to-receive">'+brl(r.aReceber)+'</b>':'<span class="pill pill-gray">R$ 0,00</span>'}</td><td><b class="finance-balance-note-value">${brl(r.saldoDevido)}</b></td><td>${(FIN_STATUS[r.status]||FIN_STATUS.pendente).pill}</td><td><button type="button" class="btn-ghost finance-action-statement" onclick="researcherOpenOwnStatement(${jsArg(r.payment.surveyId)})">▤ Gerar extrato</button></td></tr>`).join('')
    :'<tr><td colspan="9" class="empty">Nenhuma coleta ainda — assim que você enviar sua primeira entrevista em "Coletar (app)", aparece aqui.</td></tr>';
  return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+`
  ${paymentReceiptMigrationNotice()}
  ${paymentNoticeMigrationNotice()}
  ${researcherPaymentNoticesMarkup()}
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Recebido',brl(recebido),'repasses registrados','✓','#059669')}
    ${stat('A receber',brl(aReceber),'pagamentos aprovados','$','#2563eb')}
    ${stat('Saldo devido',brl(rowsData.reduce((a,r)=>a+r.saldoDevido,0)),'valor após pagamentos','◷','#0f766e')}
    ${stat('Pendente / revisão',brl(pendente+auditoria),'entrevistas válidas ainda não aprovadas','◷','#d97706')}
    ${stat('Rejeitadas',String(rejeitadas),brl(rejeitadasValor)+' apenas informativo','✕','#dc2626')}
  </div>
  <div class="card mb">
    <div class="card-t">Extrato por pesquisa</div>
    <div class="card-d">Entrevistas rejeitadas aparecem somente para informação e nunca entram em pendente, a receber ou recebido. Os pagamentos semanais aparecem no histórico e reduzem o <b>Saldo devido</b>; novas entrevistas válidas continuam sendo somadas automaticamente.</div>
    <div class="finance-table-scroll"><table class="finance-data-table earnings-table" style="margin-top:6px"><thead><tr><th>Pesquisa</th><th>Válidas</th><th>Rejeitadas</th><th>Valor aprovado</th><th>Recebido</th><th>A receber</th><th>Saldo devido</th><th>Situação</th><th>Extrato</th></tr></thead>
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
function paymentReceiptDateBR(value){
  const text=String(value||'').slice(0,10),match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?match[3]+'/'+match[2]+'/'+match[1]:(value||'—');
}
function paymentReceiptCreatedBR(value){
  if(!value)return '';
  const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('pt-BR');
}
function myReceiptHistoryHtml(rowsData){
  const groups=rowsData.map(row=>{
    const receipts=PAYMENT_RECEIPTS.filter(receipt=>receipt.paymentId===row.payment.id).sort((a,b)=>String(b.paidAt).localeCompare(String(a.paidAt))||String(b.createdAt).localeCompare(String(a.createdAt)));
    return {...row,receipts};
  }).sort((a,b)=>String(b.receipts[0]?.paidAt||'').localeCompare(String(a.receipts[0]?.paidAt||''))||String(a.survey).localeCompare(String(b.survey)));
  const body=groups.length?groups.map(group=>{
    const receiptBody=group.receipts.length?group.receipts.map((receipt,index)=>`<div class="researcher-receipt-item">
      <div class="researcher-receipt-main"><div><strong>Comprovante de pagamento${group.receipts.length>1?' #'+(group.receipts.length-index):''}</strong><span>Pago em ${esc(paymentReceiptDateBR(receipt.paidAt))}${paymentReceiptCreatedBR(receipt.createdAt)?' · lançado em '+esc(paymentReceiptCreatedBR(receipt.createdAt)):''}</span></div><b>${brl(receipt.amount)}</b></div>
      <div class="researcher-receipt-note"><span>Referência</span><strong>${esc(receipt.note||'Pagamento registrado pela PesquisaPro')}</strong></div><div class="researcher-receipt-file">${paymentReceiptActionMarkup(receipt,'researcher')}</div>
    </div>`).join(''):'<div class="researcher-receipt-empty">Nenhum pagamento registrado nesta pesquisa até o momento.</div>';
    return `<section class="researcher-receipt-survey"><div class="researcher-receipt-survey-head"><div><span class="eyebrow">Pesquisa participante</span><h3>${esc(group.survey)}</h3></div><div class="researcher-receipt-survey-total"><span>Total recebido</span><b>${brl(group.recebido)}</b></div></div><div class="researcher-receipt-list">${receiptBody}</div></section>`;
  }).join(''):'<div class="empty">Nenhuma pesquisa com pagamento disponível ainda.</div>';
  return `<div class="card mb"><div class="card-t">Comprovantes de pagamento por pesquisa</div><div class="card-d">Consulte, separadamente por pesquisa, cada pagamento inserido pela PesquisaPro, com data, valor e referência do repasse.</div><div class="researcher-receipts-by-survey">${body}</div></div>`;
}
async function saveMyPixData(){
  if(!CURRENT_PROFILE)return;
  const pixKey=(document.getElementById('me-pix-key').value||'').trim();
  const pixBank=(document.getElementById('me-pix-bank').value||'').trim();
  try{
    const {error}=await sb.rpc('update_my_researcher_payment_data',{p_pix_key:pixKey||null,p_pix_bank:pixBank||null});
    if(error)throw new Error(error.message);
    CURRENT_PROFILE.pix_key=pixKey;CURRENT_PROFILE.pix_bank=pixBank;
  }catch(ex){
    const message=String(ex?.message||ex||'');
    const migrationHint=/update_my_researcher_payment_data|schema cache|does not exist|function .* does not exist/i.test(message)
      ?' A gestão precisa executar a migration deploy/corrigir-atualizacao-pix-pesquisador.sql no Supabase.'
      :'';
    alert('Não foi possível salvar a chave PIX: '+message+'.'+migrationHint);return;
  }
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
      ${String(e.rejectReason||'').toLocaleLowerCase('pt-BR').includes('tempo mínimo')||String(e.rejectReason||'').toLocaleLowerCase('pt-BR').includes('tempo minimo')?'<div class="collection-rejection-tag">Regra automática de qualidade do formulário</div>':''}
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
let ALL_CONTRACTS=[],ALL_CONTRACTS_LOADED=false,ALL_CONTRACTS_LOADING=false,CONTRACT_BULK_SIGNING=false;
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
  <div class="card mb contracts-researchers-card" style="margin-top:16px">
    <div class="contracts-researchers-head"><div><div class="card-t">Pesquisadores</div><div class="card-d">Status de assinatura do contrato-quadro (versão ${esc(CONTRACT_VERSION)}) por pesquisador ativo.</div></div>${isAdmin?(pendentes?`<button type="button" class="btn btn-accent contracts-bulk-sign-btn" data-admin-sign-all onclick="adminSignAllPendingContracts(${pendentes})">✎ Assinar todos os ${pendentes} pendentes</button>`:'<span class="pill pill-green contracts-bulk-complete">✓ Todos assinados</span>'):''}</div>
    <table style="margin-top:6px"><thead><tr><th>Pesquisador</th><th>Cidade</th><th>Status</th><th>Assinado em</th><th>Ação</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>
  <div class="sec-title">Pré-visualização do contrato</div>
  <div class="contract-doc">${contractHtml('[nome do pesquisador]','[CPF]','')}</div>`;
};
async function adminSignAllPendingContracts(expectedCount){
  if(CONTRACT_BULK_SIGNING)return;
  if(!CURRENT_PROFILE||!['admin','admpro'].includes(selectedRole)){alert('Apenas um administrador pode assinar pelo pesquisador.');return;}
  const count=Math.max(0,Number(expectedCount)||0);
  if(!count){alert('Não há contratos pendentes para assinar nesta versão.');return;}
  if(!confirm('Confirma assinar administrativamente os '+count+' contratos pendentes da versão '+CONTRACT_VERSION+'?\n\nA ação será registrada em nome do administrador, com data, hora, IP quando disponível e hash do contrato. Ela não altera contratos já assinados.'))return;
  CONTRACT_BULK_SIGNING=true;
  const btn=document.querySelector('[data-admin-sign-all]');if(btn){btn.disabled=true;btn.textContent='Assinando contratos…';}
  const signedMap={};ALL_CONTRACTS.forEach(c=>{signedMap[c.researcher_id]=c;});
  const pending=USERS.filter(user=>user.role==='pesq'&&user.status==='ativo'&&!signedMap[user.id]).slice(0,count);
  let signedCount=0;const failures=[];let ip=null;try{ip=await fetchClientIp();}catch(ex){ip=null;}
  try{
    for(let i=0;i<pending.length;i++){
      const user=pending[i];
      if(btn)btn.textContent='Assinando '+(i+1)+'/'+pending.length+'…';
      let hash='';try{hash=await sha256Hex(contractPlainText(user.name,user.cpf||'',''));}catch(ex){hash='';}
      const {data,error}=await sb.rpc('admin_sign_researcher_contract',{
        p_researcher_id:user.id,
        p_contract_version:CONTRACT_VERSION,
        p_content_hash:hash||'indisponível neste navegador',
        p_ip_address:ip,
        p_user_agent:(navigator&&navigator.userAgent)||null,
      });
      if(error||!data){failures.push(user.name+': '+(error?.message||'a assinatura não retornou registro'));continue;}
      signedCount++;
    }
    ALL_CONTRACTS_LOADED=false;await loadAllContractsIfNeeded();
    invalidateStaffNavPendingCounts();
    const failureText=failures.length?'\n\nNão concluídos ('+failures.length+'): '+failures.slice(0,4).join('; ')+(failures.length>4?'…':''):'';
    alert(signedCount+' contrato'+(signedCount===1?'':'s')+' pendente'+(signedCount===1?'':'s')+' assinado'+(signedCount===1?'':'s')+' com sucesso. Contratos já assinados foram preservados.'+failureText);
    go('contracts');
  }catch(ex){
    const message=String(ex?.message||ex||'');
    const migrationHint=/admin_sign_researcher_contract|function .* does not exist|schema cache|does not exist/i.test(message)?' Verifique se a migration deploy/assinatura-admin-pesquisador.sql foi aplicada no Supabase.':'';
    alert('Não foi possível assinar os contratos pendentes: '+message+'.'+migrationHint);
  }finally{CONTRACT_BULK_SIGNING=false;const current=document.querySelector('[data-admin-sign-all]');if(current){current.disabled=false;current.textContent='✎ Assinar todos os '+count+' pendentes';}}
}

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
    invalidateStaffNavPendingCounts();
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
    invalidateStaffNavPendingCounts();
  }catch(ex){
    alert('Não foi possível registrar a assinatura da CONTRATANTE: '+ex.message+'\n\nSe a migration de contratos ainda não foi aplicada, execute-a no Supabase e tente novamente.');
    if(btn){btn.disabled=false;btn.textContent='✎ Assinar todos os contratos pela CONTRATANTE';}
    return;
  }
  go('contracts');
}

/* ============ CONTRACT TEMPLATE EDITOR ============ */
PAGES['contract-template']=()=>head('Modelos de contrato','Use seu próprio modelo. Os campos entre {chaves} são preenchidos automaticamente para cada pessoa.',
  '<button type="button" class="btn btn-out" disabled>Importar arquivo · indisponível</button><button type="button" class="btn btn-out" disabled>Salvar modelo · indisponível</button>')+`
  <div class="callout warn mb">Este editor é apenas uma prévia local: alterações aqui <b>não são salvas nem usadas nos contratos</b>. Os contratos ativos continuam usando o texto vigente no sistema.</div>
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
  ['{contratada_razao}','Razão social da contratante'],
  ['{contratante_programa}','Programa/plataforma'],
  ['{contratada_cnpj}','CNPJ da contratante'],
  ['{contratada_endereco}','Endereço da contratante'],
  ['{nome}','Nome do contratado'],
  ['{cpf}','CPF do contratado'],
  ['{funcao}','Função'],
  ['{regional}','Regional / polo'],
  ['{valor_form}','Valor por formulário válido'],
  ['{valor_remoto}','Valor de coleta remota'],
  ['{pesquisa}','Nome da pesquisa'],
  ['{aceite_pesquisa}','Declaração de aceite do valor da pesquisa'],
  ['{versao_contrato}','Versão do contrato'],
  ['{data}','Data'],
  ['{cidade}','Cidade'],
];
const TPL_SAMPLE={
  '{contratada_razao}':'Versus Soluções em Gestão',
  '{contratante_programa}':'PesquisaPro',
  '{contratada_cnpj}':'26.643.308/0001-49',
  '{contratada_endereco}':'Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG',
  '{nome}':'João Pereira','{cpf}':'123.456.789-00','{funcao}':'Pesquisador de campo',
  '{regional}':'Região definida na pesquisa','{valor_form}':'R$ 5,00','{valor_remoto}':'R$ 8,00',
  '{pesquisa}':'Pesquisa Eleitoral MG 2026',
  '{aceite_pesquisa}':'Aceite eletrônico registrado com concordância do valor exibido para esta pesquisa',
  '{versao_contrato}':'v2-2026-pesquisador','{data}':'06/10/2026','{cidade}':'São João del Rei/MG'
};
const TPL_TEXTS={
  pesq:`CONTRATO-QUADRO DE PRESTAÇÃO DE SERVIÇOS DE PESQUISA DE CAMPO

CONTRATANTE: {contratada_razao}, por meio do programa {contratante_programa}, CNPJ {contratada_cnpj}, com endereço em {contratada_endereco}.

CONTRATADO: {nome}, CPF {cpf}, na função de {funcao}, atuando na regional {regional}.

OBJETO: aplicação de questionários da {pesquisa}.

REMUNERAÇÃO: o CONTRATADO será remunerado em {valor_form} por formulário válido. Se houver modalidade remota, será aplicado {valor_remoto}. O aceite da pesquisa registra a concordância com o valor exibido.

REGRAS: GPS, área da pesquisa, distância mínima de 15 metros apenas para a mesma pesquisa, tempo mínimo, auditoria e gravações de confirmação quando solicitadas, inclusive obrigatoriamente após as 21h.

ACEITE ESPECÍFICO: {aceite_pesquisa}

VERSÃO: {versao_contrato}

{cidade}, {data}.`,
  coord:`CONTRATO DE COORDENAÇÃO DE PESQUISA

CONTRATANTE: {contratada_razao}, por meio do programa {contratante_programa}, CNPJ {contratada_cnpj}.

CONTRATADO: {nome}, CPF {cpf}, na função de {funcao}, responsável pela regional {regional}.

OBJETO: coordenação de equipe de campo de {pesquisa}, incluindo supervisão de pesquisadores, cotas, integridade e regras de auditoria.

{cidade}, {data}.`,
  blank:`[Cole ou escreva seu contrato aqui]

Use os campos como {nome}, {cpf}, {pesquisa}, {valor_form}, {aceite_pesquisa} e {versao_contrato} onde quiser que o sistema preencha automaticamente.`
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
let CONTRACT_VERSION='v2-2026-pesquisador';
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
    invalidateStaffNavPendingCounts();
    alert('Nova versão '+CONTRACT_VERSION+' criada. O formulário de assinatura está disponível nesta tela.');
    go('contracts');
  }catch(ex){alert('Não foi possível criar a nova versão: '+ex.message+'\\n\\nExecute a migration contratos-versoes.sql no Supabase e tente novamente.');}
}
const EMPRESA_CONTRATO={
  razao:'Versus Soluções em Gestão',
  programa:'PesquisaPro',
  cnpj:'26.643.308/0001-49',
  endereco:'Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG',
  representante:'seu representante legal devidamente identificado no ato da assinatura',
};
function contractClauses(nome,cpf,cidade){
  const c=EMPRESA_CONTRATO;
  return [
    {t:'Das partes',p:`De um lado, ${c.razao}, por meio do programa ${c.programa}, inscrita no CNPJ sob o nº ${c.cnpj}, com endereço na ${c.endereco}, doravante denominada CONTRATANTE, neste ato representada por ${c.representante}; e de outro lado ${nome||'[nome do pesquisador]'}, portador(a) do CPF nº ${cpf||'[CPF não informado]'}, pessoa física, autônomo(a), doravante denominado(a) CONTRATADO(A), têm entre si justo e contratado o presente Contrato-Quadro de Prestação de Serviços Autônomos de Coleta de Dados de Pesquisa, que se regerá pelas cláusulas seguintes.`},
    {t:'1ª. Do objeto',p:'O presente Contrato tem por objeto a prestação autônoma, eventual e não exclusiva de serviços de aplicação de questionários e coleta de dados em campo, por meio da plataforma PesquisaPro, incluindo entrevistas presenciais georreferenciadas e, quando expressamente disponibilizadas, coletas remotas, para pesquisas de opinião, mercado, satisfação ou similares realizadas pela CONTRATANTE ou por seus clientes.'},
    {t:'2ª. Do contrato-quadro e da adesão a cada pesquisa',p:'Este instrumento é um contrato-quadro e é assinado uma única vez para estabelecer as condições gerais aplicáveis às pesquisas disponibilizadas ao(à) CONTRATADO(A). Cada pesquisa constitui uma oportunidade independente de prestação de serviço e será apresentada no aplicativo com, no mínimo, seu nome, período, área geográfica, regras de cota, modalidade de coleta e remuneração. O(A) CONTRATADO(A) poderá aceitar ou recusar cada convite livremente. O aceite eletrônico de uma pesquisa no aplicativo constitui a ordem de serviço específica e registra a concordância com as condições exibidas para aquela pesquisa.'},
    {t:'3ª. Da remuneração variável e da concordância com o valor',p:'O valor da remuneração é definido pela CONTRATANTE para cada pesquisa e pode ser diferente entre pesquisas, modalidades ou regiões. Antes do aceite, o aplicativo exibirá o valor por formulário/entrevista válida — inclusive eventual valor específico para coleta remota — e o aceite do convite registrará que o(a) CONTRATADO(A) leu e concordou com esse valor. O valor aceito não será alterado retroativamente para as coletas realizadas sob aquela ordem de serviço. A remuneração é devida exclusivamente por entrevista/formulário aprovado na auditoria, não sendo devidos valores por coleta rejeitada, cancelada ou ainda pendente de validação.'},
    {t:'4ª. Da natureza autônoma e da ausência de vínculo empregatício',p:'As partes reconhecem que a relação é exclusivamente civil e autônoma, sem vínculo empregatício, subordinação jurídica, hierárquica ou disciplinar, nos termos da legislação aplicável, inclusive do art. 442-B da CLT quando cabível. O(A) CONTRATADO(A) organiza sua rotina, escolhe os convites que deseja aceitar, utiliza seus próprios equipamentos e meios de locomoção e pode prestar serviços a terceiros, inexistindo exclusividade. A remuneração é por produção aprovada, e não por jornada. Tributos, contribuições e obrigações fiscais incidentes sobre os valores recebidos serão tratados conforme a legislação aplicável e a situação do(a) CONTRATADO(A).'},
    {t:'5ª. Do pagamento e da chave PIX',p:'Os pagamentos serão processados semanalmente, conforme o fluxo financeiro da CONTRATANTE, após a aprovação das entrevistas válidas e a apuração do saldo disponível de cada pesquisa. O pagamento será realizado pela chave PIX informada pelo(a) CONTRATADO(A) no cadastro. É obrigação do(a) CONTRATADO(A) manter nome, CPF e chave PIX corretos e atualizados. Pagamentos parciais, datas, comprovantes, valores recebidos, saldo a receber e entrevistas rejeitadas serão demonstrados no extrato do aplicativo. Entrevistas rejeitadas não compõem o valor pendente, o valor a receber ou o valor recebido.'},
    {t:'6ª. Das regras de localização e integridade da coleta',p:'A localização do dispositivo é obrigatória durante a coleta. A entrevista somente poderá ser iniciada dentro da cidade, estado, região ou área definida para a pesquisa e para a respectiva cota. Para a mesma pesquisa, o sistema bloqueará o início de uma nova coleta quando ela estiver a menos de 15 (quinze) metros da coleta anterior não reprovada do mesmo pesquisador, como medida de integridade e prevenção a registros artificiais. Essa comparação é feita por pesquisador e por pesquisa: coletas de pesquisas diferentes podem ocorrer no mesmo local, sem que a trava de 15 metros de uma pesquisa impeça a outra. O(A) CONTRATADO(A) não poderá tentar contornar GPS, permissões de localização ou regras de área.'},
    {t:'7ª. Do tempo mínimo, auditoria e rejeição',p:'Cada pesquisa poderá estabelecer tempo mínimo de coleta conforme a quantidade, o tipo e a dificuldade das perguntas. Entrevistas concluídas abaixo do tempo mínimo serão submetidas à auditoria e poderão ser rejeitadas com o registro do motivo no aplicativo, inclusive com a mensagem: “Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real”. Também poderão ser rejeitadas entrevistas com duplicidade, inconsistências, respostas incompatíveis, uso indevido do aplicativo ou qualquer indício de fraude. A rejeição justificada não gera pagamento daquela coleta; indícios comprovados de fraude poderão ensejar o desligamento do(a) CONTRATADO(A) e a adoção das medidas cabíveis.'},
    {t:'8ª. Das gravações de confirmação',p:'Para verificar a autenticidade das entrevistas, a plataforma poderá solicitar aleatoriamente uma gravação de voz do entrevistado ao final da coleta, confirmando que a entrevista ocorreu e que as perguntas foram realizadas. Em toda entrevista iniciada após as 21h00, a gravação de confirmação do entrevistado ao final será obrigatória, conforme a regra da pesquisa. O(A) CONTRATADO(A) deverá explicar a solicitação ao entrevistado, respeitar sua manifestação e registrar no aplicativo eventual recusa. A ausência injustificada de gravação obrigatória, a gravação incompatível ou a falsificação de qualquer evidência poderá levar à auditoria e à rejeição da entrevista.'},
    {t:'9ª. Das obrigações do(a) CONTRATADO(A)',p:'Sem que isso implique subordinação, o(a) CONTRATADO(A) obriga-se a: (i) entrevistar pessoas reais e registrar fielmente suas respostas; (ii) seguir o questionário, as cotas, as orientações e os limites geográficos da pesquisa; (iii) manter GPS e internet disponíveis quando exigidos pelo aplicativo; (iv) não compartilhar sua conta, dispositivo ou credenciais; (v) não criar entrevistas, respostas, localizações ou gravações fictícias; (vi) manter seus dados cadastrais e PIX atualizados; (vii) preservar a confidencialidade; e (viii) tratar entrevistados com respeito, transparência e observância da legislação aplicável.'},
    {t:'10ª. Das obrigações da CONTRATANTE',p:'A CONTRATANTE disponibilizará no aplicativo as informações essenciais de cada pesquisa antes do aceite, incluindo valor por formulário, área de atuação, período, cotas e regras específicas; manterá o registro do aceite e da auditoria; informará, sempre que possível, o motivo de eventual rejeição; e efetuará o pagamento das entrevistas aprovadas conforme as condições deste instrumento e do extrato da pesquisa.'},
    {t:'11ª. Da proteção de dados pessoais',p:'As partes tratarão os dados pessoais dos entrevistados, do(a) CONTRATADO(A) e de terceiros em conformidade com a Lei nº 13.709/2018 (LGPD) e demais normas aplicáveis, limitando o uso ao necessário para execução, segurança, auditoria, pagamento e prestação de contas das pesquisas. É vedado copiar, comercializar, divulgar, publicar ou compartilhar dados, respostas, gravações, coordenadas ou documentos fora das finalidades autorizadas.'},
    {t:'12ª. Da confidencialidade e da propriedade dos dados',p:'Questionários, respostas, gravações, coordenadas, cotas, metodologias, relatórios e demais informações obtidas na execução das pesquisas são confidenciais e pertencem à CONTRATANTE e/ou a seus clientes, conforme o caso. O(A) CONTRATADO(A) não poderá utilizá-los para finalidade própria ou de terceiros, inclusive após o encerramento deste contrato.'},
    {t:'13ª. Da vigência, suspensão e rescisão',p:'Este Contrato vigora por prazo indeterminado a partir do aceite eletrônico e não obriga o(a) CONTRATADO(A) a aceitar pesquisas futuras. Qualquer parte poderá encerrá-lo mediante comunicação pela plataforma ou outro meio idôneo. A CONTRATANTE poderá suspender o acesso a novas coletas ou rescindir imediatamente o contrato em caso de fraude, falsificação, compartilhamento de conta, violação de confidencialidade, manipulação de GPS, reincidência de coletas incompatíveis ou descumprimento grave das regras. O encerramento não prejudica o pagamento das entrevistas já aprovadas nem extingue as obrigações de confidencialidade e proteção de dados.'},
    {t:'14ª. Da assinatura eletrônica e dos registros',p:'A aceitação eletrônica deste contrato pelo(a) CONTRATADO(A), realizada mediante sua conta autenticada, nome e CPF cadastrados, declaração expressa de concordância e registro de data, hora, versão do contrato, endereço IP quando disponível e resumo criptográfico (hash) do texto apresentado, constitui manifestação de vontade válida para os fins deste instrumento. O aceite de cada convite de pesquisa também registrará a remuneração específica exibida e aceita para aquela pesquisa.'},
    {t:'15ª. Do foro',p:`Fica eleito o foro da comarca de São João del Rei/MG, ressalvadas as regras legais de competência aplicáveis, para dirimir dúvidas ou controvérsias oriundas deste Contrato.`},
  ];
}
const CONTRACT_TITLE='CONTRATO-QUADRO DE PRESTAÇÃO DE SERVIÇOS AUTÔNOMOS DE COLETA DE DADOS — PESQUISAPRO';
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
/* ---- convites de equipe recebidos no aplicativo (aceitar/recusar em "Meu
   painel" ou "Meus dados") — o administrador também pode enviar o convite
   diretamente pelo aplicativo ou abrir a mensagem completa no WhatsApp. ---- */
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
      if(onKey&&['dashboard-pesq','researcher-profile'].includes(onKey.dataset.key))go(onKey.dataset.key);
    }
  })();
  return MY_INVITES_LOAD_PROMISE;
}
function researcherProfileInvitesMarkup(){
  const invites=(MY_INVITES||[]).filter(inv=>!SURVEYS.find(item=>item.id===inv.survey_id)?.archivedAt);
  return `<section class="card mb researcher-profile-invites" aria-labelledby="researcher-profile-invites-title"><div class="researcher-profile-invites-head"><div><div class="card-t" id="researcher-profile-invites-title">Convites para participar de pesquisas</div><div class="card-d">Quando a gestão enviar um convite pelo aplicativo, ele aparecerá aqui. Confira o valor e as regras antes de responder.</div></div><span class="pill ${invites.length?'pill-amber':'pill-gray'}">${invites.length} pendente${invites.length===1?'':'s'}</span></div>${invites.length?`<div class="researcher-profile-invite-list">${invites.map(inv=>{const survey=SURVEYS.find(item=>item.id===inv.survey_id),busy=MY_INVITE_RESPONDING===inv.id,price=survey?Number(survey.price)||0:0,remotePrice=survey?Number(survey.priceRemote)||0:0,priceText=survey?(price>0?brl(price):'valor informado no convite'):'valor da pesquisa';return `<article class="researcher-profile-invite-row"><div class="researcher-profile-invite-copy"><div class="researcher-profile-invite-title"><strong>${esc(survey?.name||'Pesquisa convidada')}</strong><span class="pill pill-amber">Aguardando sua resposta</span></div><p>${survey?esc(survey.tipo||'Convite para participar da equipe de coleta.'):'Convite para participar da equipe de coleta.'}</p><div class="callout" style="margin:8px 0 6px;padding:9px 11px"><b>Valor por formulário válido: ${esc(priceText)}</b>${remotePrice>0?' · Coleta remota: '+esc(brl(remotePrice)):''}</div><small>Ao aceitar, você declara que leu as regras da pesquisa e concorda com o valor exibido para esta pesquisa. O aceite fica registrado no aplicativo; pesquisas diferentes podem ter valores diferentes.</small></div><div class="researcher-profile-invite-actions"><button type="button" class="btn btn-fill" ${busy?'disabled':''} onclick="respondMyInvite(${jsArg(inv.id)},true)">${busy?'Processando…':'✓ Aceitar e concordar com o valor'}</button><button type="button" class="btn btn-ghost" ${busy?'disabled':''} onclick="respondMyInvite(${jsArg(inv.id)},false)">Recusar</button></div></article>`;}).join('')}</div>`:'<div class="researcher-profile-invites-empty"><strong>Nenhum convite pendente</strong><span>Quando a gestão convidar você pelo aplicativo, o convite aparecerá nesta área e também no Meu painel.</span></div>'}</section>`;
}
let MY_INVITE_RESPONDING=null; /* id do convite sendo respondido agora — trava os botões pra não clicar 2x */
async function respondMyInvite(inviteId,accept){
  if(MY_INVITE_RESPONDING)return;
  const currentKey=document.querySelector('.nav-item.on')?.dataset.key||'dashboard-pesq';
  MY_INVITE_RESPONDING=inviteId;
  go(currentKey);
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
      MY_SURVEY_RESEARCHER_MESSAGES_LOADED=false;MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0;
      await loadMySurveyResearcherMessagesIfNeeded();
      if(detail?.whatsapp_group_url)alert('Convite aceito. Confira as orientações iniciais em Avisos das pesquisas no seu painel; confirme a leitura antes de iniciar a coleta. O link do grupo oficial também está disponível.');
      else alert('Convite aceito. Confira as orientações iniciais em Avisos das pesquisas no seu painel; confirme a leitura antes de iniciar a coleta. A gestão ainda não configurou o grupo de WhatsApp.');
    }
    INVITE_FOCUS_ID=null;
    const cleanUrl=new URL(window.location.href);cleanUrl.searchParams.delete('convite');
    window.history.replaceState({},'',cleanUrl.href);
  }catch(ex){alert('Não foi possível responder ao convite: '+ex.message);}
  MY_INVITE_RESPONDING=null;
  go(currentKey);
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
    <div class="card contract-termination-card">
      <div class="card-t">Encerrar participação</div>
      <div class="card-d">Se você não deseja mais participar do PesquisaPro, pode solicitar o encerramento do contrato e o cancelamento da sua inscrição. Seu histórico de coletas, contratos e pagamentos será preservado para a gestão.</div>
      <button class="btn btn-out" id="contractTerminateBtn" style="color:var(--red);border-color:var(--red);margin-top:10px" onclick="requestResearcherContractTermination()">Solicitar encerramento e cancelar inscrição</button>
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
      <span>Li e concordo integralmente com os termos acima, em especial quanto à <b>ausência de vínculo empregatício</b>, às <b>regras de integridade, auditoria e gravação</b> e às <b>condições de pagamento</b>. Sei que cada pesquisa terá valor próprio, exibido antes do aceite do convite, e reconheço a validade desta assinatura eletrônica.</span>
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
PAGES.company=()=>head('Dados da empresa','Referência informativa; edição ainda indisponível')+`
  <div class="callout warn mb">Esta página mostra dados de referência, não um cadastro editável. <b>Nenhuma alteração aqui seria salva ou propagada aos contratos.</b> Para corrigir dados oficiais, é necessário implementar atualização com versionamento e revisão dos documentos existentes.</div>
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Identificação</div>
      <div class="mb"><label class="lbl">Razão social <span class="pill pill-gray">🔒 fixo</span></label><input class="inp" value="Versus Soluções em Gestão — programa PesquisaPro" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      <div class="field-row mb">
        <div><label class="lbl">CNPJ</label><input class="inp" value="26.643.308/0001-49" readonly></div>
        <div><label class="lbl">Inscrição estadual <span class="pill pill-gray">🔒 fixo</span></label><input class="inp" value="Isento" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      </div>
      <div class="mb"><label class="lbl">Endereço</label><input class="inp" value="Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG" readonly></div>
      <div class="field-row"><div><label class="lbl">Telefone</label><input class="inp" value="(31) 99668-3030" readonly></div><div><label class="lbl">E-mail</label><input class="inp" value="contato@pesquisapro.com.br" readonly></div></div>
    </div>
    <div class="card">
      <div class="card-t">Marca e responsável técnico <span class="pill pill-gray">🔒 fixo</span></div>
      <div class="mb"><label class="lbl">Logotipo (usado em relatórios e contratos)</label>
        <div style="border:1px solid var(--line);border-radius:var(--r-s);height:90px;display:flex;align-items:center;justify-content:center;background:var(--bg)">
          <img src="assets/logo-wide.png" alt="PesquisaPro" style="height:34px;width:auto;border-radius:6px">
        </div></div>
      <div class="mb"><label class="lbl">Responsável técnico (estatístico)</label><input class="inp" value="Não informado nesta página" disabled style="background:var(--bg);color:var(--ink3);cursor:not-allowed"></div>
      <div class="callout">O logotipo é exibido pelo aplicativo; esta tela não comprova dados de responsável técnico nem atualiza contratos.</div>
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
  if(key!=='collect'){stopCollectLive();disposeCollectEvolutionChart();}if(key!=='client-results'&&key!=='client-progress'){clientGeoStopLive();}if(key!=='client-progress'){clientProgressStopLive();}
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
  const price=Number(context.price)||0,remotePrice=Number(context.price_remote)||0;
  return head('Convite de pesquisa',context.survey_name||'Pesquisa')+`<section class="card researcher-link-invite-card"><div class="researcher-link-icon">✉</div><div class="card-t">Você foi convidado(a) para participar desta pesquisa</div><p class="researcher-link-survey-name">${esc(context.survey_name||'Pesquisa')}</p><div class="callout ${canAccept?'':'warn'}">${esc(context.reason||'')}</div>${price||remotePrice?`<div class="callout" style="margin-top:10px"><b>Valor por formulário válido: ${brl(price)}</b>${remotePrice?' · Coleta remota: '+brl(remotePrice):''}</div>`:''}${context.expires_at?`<div class="card-d">Este link expira em ${esc(new Date(context.expires_at).toLocaleString('pt-BR'))}.</div>`:''}<div class="researcher-link-actions">${context.already_member?'<button class="btn btn-fill" onclick="go(\'dashboard-pesq\')">Abrir meu painel</button>':canAccept?'<button class="btn btn-fill" onclick="acceptResearcherLinkInvite()">✓ Aceitar e concordar com o valor</button>':'<button class="btn btn-out" onclick="go(\'researcher-profile\')">Atualizar meu perfil</button>'}</div><p class="card-d" style="margin-top:14px">Ao aceitar, você entra automaticamente na equipe da pesquisa e declara que leu as regras e concorda com o valor exibido. O aceite ficará registrado no aplicativo. O grupo de WhatsApp, quando configurado, será disponibilizado no seu painel.</p></section>`;
};
async function acceptResearcherLinkInvite(){
  if(RESEARCHER_LINK_ACCEPTING||!RESEARCHER_LINK_TOKEN)return;
  RESEARCHER_LINK_ACCEPTING=true;
  try{
    const {data,error}=await sb.rpc('accept_survey_researcher_link',{p_token:RESEARCHER_LINK_TOKEN});
    if(error)throw new Error(error.message);
    SURVEYS_LOADED=false;await loadSurveysIfNeeded();MY_COMMUNICATIONS_LOADED=false;MY_COMMUNICATIONS=[];await loadMySurveyCommunicationsIfNeeded();
    MY_SURVEY_RESEARCHER_MESSAGES_LOADED=false;MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED=0;await loadMySurveyResearcherMessagesIfNeeded();
    alert('Convite aceito. Você entrou na equipe da pesquisa. Confira as orientações iniciais em Avisos das pesquisas e confirme a leitura antes de iniciar a coleta.');
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
