/* PesquisaPro v181 — ativação individual; nenhuma alteração otimista ou em lote. */
(function(){
'use strict';
const roles=['admin','admpro','coord','gerente','pesq','cliente','vendedor','indicador','recrutador'];
const statuses=['ativo','pendente','prospecto','encerrado'];
const statusLabels={ativo:'Ativo',pendente:'Pendente',prospecto:'Prospecto',encerrado:'Encerrado'};
let generation=0,pending=null;
function authorized(){
  return typeof CURRENT_PROFILE!=='undefined'&&CURRENT_PROFILE&&CURRENT_PROFILE.status==='ativo'&&['admin','admpro'].includes(CURRENT_PROFILE.role)&&typeof selectedRole!=='undefined'&&['admin','admpro'].includes(selectedRole);
}
function userById(id){return typeof USERS!=='undefined'?USERS.find(u=>u.id===id):null;}
function sameSession(ctx){return generation===ctx.generation&&authorized()&&CURRENT_PROFILE.id===ctx.actorId&&CURRENT_PROFILE.role===ctx.actorRole;}
function buttons(){return typeof document!=='undefined'?[...document.querySelectorAll('[data-user-activate]')]:[];}
function renderBusy(){buttons().forEach(b=>{b.disabled=!!pending||b.dataset.invalid==='true';b.setAttribute('aria-busy',String(!!pending&&b.dataset.userActivate===pending.id));b.textContent=pending&&b.dataset.userActivate===pending.id?'Ativando…':'Ativar usuário';});}
function button(user){
  if(!authorized()||!user||user.status==='ativo'||!roles.includes(user.role)||!statuses.includes(user.status))return '';
  const valid=typeof isValidUuid==='function'&&isValidUuid(user.id);
  return '<button type="button" class="btn-ghost user-activation-btn" data-user-activate="'+esc(user.id||'')+'" data-invalid="'+String(!valid)+'" '+(pending||!valid?'disabled ':'')+'aria-label="Ativar usuário '+esc(user.name||'')+'" title="'+(valid?'Alterar somente o status para Ativo; preservar perfil e vínculos':'Cadastro sem identificador válido; recarregue a lista')+'" onclick="event.preventDefault();event.stopPropagation();window.PP_USER_ACTIVATION.activate(this.dataset.userActivate)">'+(pending&&pending.id===user.id?'Ativando…':'Ativar usuário')+'</button>';
}
function reset(){generation++;if(pending)pending.controller.abort();pending=null;}
function busy(){return !!pending;}
async function activate(id){
  if(!authorized()){alert('Apenas o Administrador master e o ADM PesquisaPro ativos podem ativar usuários.');return false;}
  if(pending)return false;
  if(typeof isValidUuid!=='function'||!isValidUuid(id)){alert('Cadastro sem identificador válido. Recarregue a lista antes de ativar.');return false;}
  const target=userById(id);
  if(!target||!roles.includes(target.role)||!statuses.includes(target.status)){alert('Usuário não encontrado ou status desconhecido. Recarregue a lista.');return false;}
  if(target.status==='ativo'){alert('Este usuário já está ativo.');return false;}
  if(target.role==='pesq'&&target.status!=='encerrado'&&(!target.docFoto||!target.docComprovante)){alert('Não é possível ativar: faltam os documentos obrigatórios do pesquisador. Edite o cadastro para anexá-los.');return false;}
  const actorId=CURRENT_PROFILE.id,actorRole=CURRENT_PROFILE.role,role=target.role,oldStatus=target.status;
  const roleLabel=typeof ROLE_LABEL!=='undefined'?ROLE_LABEL[role]||role:role;
  const message='Ativar o usuário '+target.name+'?\n\nPerfil: '+roleLabel+'\nSituação: '+statusLabels[oldStatus]+' → Ativo\n'+(target.email?'E-mail: '+target.email+'\n':'')+'\nApenas o status de acesso será alterado. Perfil, senha, documentos, PIX, vínculos, liberações existentes, contratos, coletas e pagamentos serão preservados.'+(role==='pesq'&&oldStatus==='encerrado'?'\n\nO histórico do encerramento ficará registrado. A ativação não assina contratos nem aceita convites de pesquisa.':'');
  if(!confirm(message))return false;
  if(!authorized()||CURRENT_PROFILE.id!==actorId||CURRENT_PROFILE.role!==actorRole||userById(id)?.status!==oldStatus||userById(id)?.role!==role){alert('A sessão ou o cadastro mudou. Recarregue a lista antes de confirmar novamente.');return false;}
  const ctx={id,actorId,actorRole,generation,controller:new AbortController()};pending=ctx;renderBusy();
  let timer;
  try{
    let request=sb.rpc('admin_activate_user_v181',{p_user_id:id,p_expected_status:oldStatus});
    if(typeof request.abortSignal==='function')request=request.abortSignal(ctx.controller.signal);
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{ctx.controller.abort();reject(new Error('Tempo limite: o banco pode ter concluído a operação. Recarregue a lista para conferir o status antes de tentar novamente.'));},15000);});
    const result=await Promise.race([request,timeout]);
    if(!sameSession(ctx))return false;
    if(result.error)throw result.error;
    const data=result.data;
    if(!data||data.id!==id||data.role!==role||data.status!=='ativo'||data.previous_status!==oldStatus)throw new Error('O banco não confirmou o cadastro esperado. Recarregue a lista para verificar o status.');
    const current=userById(id);
    if(!current||current.role!==role||(current.status!==oldStatus&&current.status!=='ativo'))throw new Error('A lista mudou durante a ativação. Recarregue para verificar o cadastro.');
    current.status='ativo';
    if(typeof invalidateStaffNavPendingCounts==='function')invalidateStaffNavPendingCounts();
    if(typeof window.PP_REPORT_WHATSAPP!=='undefined')window.PP_REPORT_WHATSAPP.reset();
    if(typeof USER_GENERAL_FILTERS!=='undefined'&&USER_GENERAL_FILTERS.status===oldStatus)USER_GENERAL_FILTERS.status='';
    if(typeof USER_TAB!=='undefined'&&USER_TAB==='pesq_inativos'&&role==='pesq')USER_TAB='pesq';
    pending=null;renderBusy();
    if(typeof USER_ARMED!=='undefined')USER_ARMED=true;
    if(typeof go==='function'&&(typeof USER_EDIT==='undefined'||USER_EDIT===null))go('users');
    const focus=typeof document!=='undefined'?document.getElementById('user-search'):null;
    if(focus)focus.focus();
    alert('Usuário ativado e confirmado pelo banco. Os demais dados e o histórico foram preservados.');
    return true;
  }catch(ex){
    if(!sameSession(ctx))return false;
    const missing=ex.code==='PGRST202'||ex.code==='42883'||/admin_activate_user_v181.*(schema cache|does not exist)/i.test(ex.message||'');
    alert(missing?'A ativação individual ainda não está configurada no banco. Execute manualmente a migration ativacao-individual-usuarios-v181.sql no Supabase.':('Não foi possível confirmar a ativação: '+(ex.message||String(ex))));
    return false;
  }finally{clearTimeout(timer);if(pending===ctx){pending=null;renderBusy();}}
}
window.PP_USER_ACTIVATION={authorized,button,activate,busy,reset};
})();
