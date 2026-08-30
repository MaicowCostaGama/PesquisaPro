/* ============ ÁREA COMERCIAL ============
   O módulo usa Supabase para oportunidades e propostas. A camada visual é
   separada do app.js para manter o núcleo existente estável e facilitar a
   evolução do CRM. */
const COMM_STAGES=[
  {key:'novo',label:'Novo lead',color:'#64748b'},
  {key:'qualificacao',label:'Qualificação',color:'#2563eb'},
  {key:'briefing',label:'Briefing',color:'#7c3aed'},
  {key:'proposta',label:'Proposta enviada',color:'#d97706'},
  {key:'negociacao',label:'Negociação',color:'#ea580c'},
  {key:'ganha',label:'Fechada ganha',color:'#059669'},
  {key:'perdida',label:'Fechada perdida',color:'#dc2626'}
];
const COMM_STAGE_LABEL=Object.fromEntries(COMM_STAGES.map(s=>[s.key,s.label]));
const COMM_STATUS_LABEL={rascunho:'Rascunho',enviada:'Enviada',aceita:'Aceita',recusada:'Recusada',expirada:'Expirada'};
let COMM_OPPORTUNITIES=[];
let COMM_PROPOSALS=[];
let COMM_LOADED=false,COMM_LOADING=false,COMM_ERROR='';
let COMM_VIEW='board',COMM_EDIT_ID=null,COMM_SELECTED_ID=null;
let COMM_FILTER_STAGE='todos',COMM_FILTER_SELLER='todos';
let COMM_PROPOSAL_FORM=null;
let COMM_COMMISSIONS=[];
function commIsPartner(){return ['vendedor','indicador'].includes(selectedRole);}
function commCommissionStatusLabel(status){return {a_receber:'A receber',aprovada:'Aprovada',paga:'Paga',cancelada:'Cancelada'}[status]||status||'A receber';}
function commCommissionStatusClass(status){return status==='paga'?'pill-green':status==='aprovada'?'pill-blue':status==='cancelada'?'pill-red':'pill-amber';}
function commCommissionMoneyTotal(rows,status){return (rows||[]).filter(c=>!status||c.status===status).reduce((sum,c)=>sum+(Number(c.amount)||0),0);}
function commOpportunityCommissions(opportunityId){return COMM_COMMISSIONS.filter(c=>c.opportunity_id===opportunityId);}
function commIndicatorName(id){
  if(!id)return 'Sem indicador';
  if(CURRENT_PROFILE&&CURRENT_PROFILE.id===id)return CURRENT_PROFILE.name||'Indicador atual';
  const u=(USERS||[]).find(x=>x.id===id);
  return u?u.name:'Indicador não localizado';
}

function commStaff(){return ['admin','admpro','coord','gerente'].includes(selectedRole);}
function commSellerName(id){
  if(!id)return 'Sem vendedor atribuído';
  if(CURRENT_PROFILE&&CURRENT_PROFILE.id===id)return CURRENT_PROFILE.name||'Vendedor atual';
  const u=(USERS||[]).find(x=>x.id===id);
  return u?u.name:'Vendedor não localizado';
}
function commMoney(value){return brl(Number(value)||0);}
function commDate(value){
  if(!value)return '—';
  const d=new Date(value+'T00:00:00');
  return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR');
}
function commDateTime(value){
  if(!value)return '—';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR');
}
function commPhoneDigits(value){return String(value||'').replace(/\D/g,'');}
function commProposalItems(p){return p&&Array.isArray(p.commercial_proposal_items)?p.commercial_proposal_items:(p&&Array.isArray(p.items)?p.items:[]);}
function commFilteredOpps(){
  return COMM_OPPORTUNITIES.filter(o=>(COMM_FILTER_STAGE==='todos'||o.stage===COMM_FILTER_STAGE)&&(COMM_FILTER_SELLER==='todos'||o.seller_id===COMM_FILTER_SELLER));
}
function commCurrentPage(){return document.querySelector('.nav-item.on')?.dataset.key==='commercial';}
function commSetError(error){COMM_ERROR=error?String(error.message||error):'';}

async function commercialLoad(force){
  if(COMM_LOADING)return;
  if(COMM_LOADED&&!force)return;
  if(!CURRENT_PROFILE)return;
  COMM_LOADING=true;commSetError('');
  try{
    if(commStaff()&&!USERS_LOADED)await loadUsersIfNeeded();
    let oq=sb.from('commercial_opportunities').select('*').order('created_at',{ascending:false});
    if(selectedRole==='vendedor')oq=oq.eq('seller_id',CURRENT_PROFILE.id);
    if(selectedRole==='indicador')oq=oq.eq('indicator_id',CURRENT_PROFILE.id);
    const {data:opps,error:oppError}=await oq;
    if(oppError)throw new Error(oppError.message);
    COMM_OPPORTUNITIES=opps||[];
    let cq=sb.from('commercial_commissions').select('*').order('created_at',{ascending:false});
    if(!commStaff())cq=cq.eq('partner_id',CURRENT_PROFILE.id);
    const {data:commissions,error:commissionError}=await cq;
    if(commissionError&&commissionError.code!=='42P01')throw new Error(commissionError.message);
    COMM_COMMISSIONS=commissions||[];
    const ids=COMM_OPPORTUNITIES.map(o=>o.id).filter(Boolean);
    if(!ids.length){COMM_PROPOSALS=[];}
    else{
      const {data:props,error:propError}=await sb.from('commercial_proposals')
        .select('*,commercial_proposal_items(*)').in('opportunity_id',ids).order('created_at',{ascending:false});
      if(propError)throw new Error(propError.message);
      COMM_PROPOSALS=(props||[]).map(p=>({...p,items:p.commercial_proposal_items||[]}));
    }
    COMM_LOADED=true;
    if(COMM_SELECTED_ID&&!COMM_OPPORTUNITIES.some(o=>o.id===COMM_SELECTED_ID))COMM_SELECTED_ID=null;
  }catch(ex){commSetError(ex);}
  finally{
    COMM_LOADING=false;
    if(commCurrentPage())commercialPaint();
  }
}
function commercialRefresh(){return commercialLoad(true);}

PAGES.commercial=()=>{
  if(!['admin','admpro','vendedor','indicador','coord','gerente'].includes(selectedRole)){
    return head('Comercial','Funil de vendas e propostas comerciais')+'<div class="callout warn">Seu perfil não possui acesso à área Comercial.</div>';
  }
  if(!COMM_LOADED&&!COMM_ERROR)return head('Comercial','Funil de vendas e propostas comerciais')+'<div id="commercialRoot"><div class="empty">Carregando oportunidades comerciais…</div></div>';
  return head('Comercial','Funil de vendas e propostas comerciais')+'<div id="commercialRoot"></div>';
};

function commercialOnPage(){
  if(!commCurrentPage())return;
  if(!COMM_LOADED&&!COMM_LOADING)commercialLoad();
  commercialPaint();
}
const COMM_BASE_AFTER_RENDER=window._afterRender;
window._afterRender=function(key){
  if(typeof COMM_BASE_AFTER_RENDER==='function')COMM_BASE_AFTER_RENDER(key);
  if(key==='commercial')commercialOnPage();
};

function commercialPaint(){
  const root=document.getElementById('commercialRoot');
  if(!root)return;
  if(COMM_LOADING&&!COMM_LOADED){root.innerHTML='<div class="empty">Carregando oportunidades comerciais…</div>';return;}
  if(COMM_ERROR){
    root.innerHTML=`<div class="callout warn">Não foi possível carregar o Comercial agora: ${esc(COMM_ERROR)} <button class="btn-ghost" style="margin-left:8px" onclick="commercialRefresh()">Tentar novamente</button></div>`;
    return;
  }
  root.innerHTML=COMM_VIEW==='form'?commercialOpportunityForm():COMM_VIEW==='detail'?commercialDetail():commIsPartner()?commercialPartnerDashboard():commercialBoard();
}
function commercialPartnerDashboard(){
  const opps=COMM_OPPORTUNITIES;
  const comms=COMM_COMMISSIONS;
  const open=opps.filter(o=>!['ganha','perdida'].includes(o.stage));
  const won=opps.filter(o=>o.stage==='ganha');
  const pending=commCommissionMoneyTotal(comms,'a_receber');
  const paid=commCommissionMoneyTotal(comms,'paga');
  const approved=commCommissionMoneyTotal(comms,'aprovada');
  const title=selectedRole==='indicador'?'Minhas indicações':'Minhas vendas';
  const subtitle=selectedRole==='indicador'?'Acompanhe os clientes indicados e as comissões geradas.':'Acompanhe suas oportunidades, vendas e comissões.';
  const rate=Number(CURRENT_PROFILE?.commissionRate)||0;
  const partnerAction=selectedRole==='indicador'?'＋ Nova indicação':'＋ Nova oportunidade';
  return `<div class="comm-partner-hero"><div><div class="eyebrow">ÁREA COMERCIAL</div><h2>${title}</h2><p>${subtitle}</p></div><div class="comm-partner-rate"><span>Seu percentual</span><strong>${rate.toLocaleString('pt-BR',{maximumFractionDigits:2})}%</strong>${selectedRole==='vendedor'&&Number(CURRENT_PROFILE?.commissionRateWithIndicator)>0?`<small>${Number(CURRENT_PROFILE.commissionRateWithIndicator).toLocaleString('pt-BR',{maximumFractionDigits:2})}% quando houver indicador</small>`:''}</div></div>
  <div class="comm-toolbar"><div class="comm-toolbar-filters"><span class="pill pill-blue">${selectedRole==='indicador'?'Indicador de clientes':'Vendedor'}</span><span class="comm-board-note">Comissões são geradas quando a proposta é aceita.</span></div><div class="comm-toolbar-actions"><button class="btn btn-out" onclick="commercialRefresh()">↻ Atualizar</button><button class="btn btn-fill" onclick="commercialNewOpportunity()">${partnerAction}</button></div></div>
  <div class="grid g4 comm-stats">${stat(selectedRole==='indicador'?'Indicações':'Oportunidades',String(opps.length),'registradas por você','↗','#2563eb')}${stat('Em andamento',String(open.length),'no funil comercial','◷','#d97706')}${stat('Fechadas ganhas',String(won.length),'convertidas','✓','#059669')}${stat('A receber',commMoney(pending),'comissão pendente','◫','#7c3aed')}</div>
  <div class="grid g2 comm-partner-grid"><div class="card"><div class="card-t">${selectedRole==='indicador'?'Minhas indicações':'Minhas oportunidades'}</div><div class="card-d">Clique em um registro para ver detalhes.</div>${opps.length?`<div class="comm-partner-list">${opps.map(o=>`<button class="comm-partner-row" onclick="commercialOpenOpportunity('${o.id}')"><span><b>${esc(o.company||o.client_name||'Sem empresa')}</b><small>${esc(o.city||'')} ${o.indicator_id&&selectedRole==='vendedor'?'· '+esc(commIndicatorName(o.indicator_id)):''}</small></span><span><strong>${o.expected_value?commMoney(o.expected_value):'—'}</strong><small class="comm-stage-mini">${esc(COMM_STAGE_LABEL[o.stage]||o.stage)}</small></span></button>`).join('')}</div>`:'<div class="empty">Nenhum registro comercial ainda.</div>'}</div><div class="card"><div class="card-t">Minhas comissões</div><div class="card-d">Valores calculados sobre o total da proposta aceita.</div><div class="comm-commission-totals"><div><span>A receber</span><b>${commMoney(pending)}</b></div><div><span>Aprovadas</span><b>${commMoney(approved)}</b></div><div><span>Recebidas</span><b>${commMoney(paid)}</b></div></div>${comms.length?`<div class="comm-commission-list">${comms.map(c=>`<div class="comm-commission-row"><span><b>${commMoney(c.amount)}</b><small>${commDateTime(c.created_at)} · ${Number(c.rate||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}%</small></span><span class="pill ${commCommissionStatusClass(c.status)}">${commCommissionStatusLabel(c.status)}</span></div>`).join('')}</div>`:'<div class="empty" style="padding:18px 0">Nenhuma comissão gerada ainda.</div>'}</div></div>
  <div class="comm-partner-foot"><span>Total já recebido: <b>${commMoney(paid)}</b></span><span>Comissão aprovada aguardando pagamento: <b>${commMoney(approved)}</b></span></div>`;
}
function commercialBoard(){
  const visible=commFilteredOpps();
  const open=COMM_OPPORTUNITIES.filter(o=>!['ganha','perdida'].includes(o.stage));
  const won=COMM_OPPORTUNITIES.filter(o=>o.stage==='ganha');
  const proposals=COMM_PROPOSALS.filter(p=>['enviada','aceita'].includes(p.status));
  const wonValue=won.reduce((sum,o)=>sum+(Number(o.expected_value)||0),0);
  const sellers=(USERS||[]).filter(u=>u.role==='vendedor'&&u.status!=='encerrado');
  const indicators=(USERS||[]).filter(u=>u.role==='indicador'&&u.status!=='encerrado');
  const sellerOptions=commStaff()?[`<option value="todos" ${COMM_FILTER_SELLER==='todos'?'selected':''}>Todos os vendedores</option>`,...sellers.map(u=>`<option value="${u.id}" ${COMM_FILTER_SELLER===u.id?'selected':''}>${esc(u.name)}</option>`)].join(''):'';
  const noSellers=commStaff()&&sellers.length===0;
  return `${noSellers?'<div class="callout warn" style="margin-bottom:14px">Nenhum vendedor ativo foi cadastrado. Crie o primeiro perfil vendedor em <button class="btn-ghost" style="margin-left:6px" onclick="go(\'users\')">Usuários → Vendedores</button>.</div>':''}<div class="comm-toolbar">
    <div class="comm-toolbar-filters">
      <select class="inp comm-filter" onchange="commercialSetFilter('stage',this.value)"><option value="todos">Todos os estágios</option>${COMM_STAGES.map(s=>`<option value="${s.key}" ${COMM_FILTER_STAGE===s.key?'selected':''}>${s.label}</option>`).join('')}</select>
      ${commStaff()?`<select class="inp comm-filter" onchange="commercialSetFilter('seller',this.value)">${sellerOptions}</select>`:''}
    </div>
    <div class="comm-toolbar-actions"><button class="btn btn-out" onclick="commercialRefresh()">↻ Atualizar</button><button class="btn btn-fill" onclick="commercialNewOpportunity()">＋ Nova oportunidade</button></div>
  </div>
  <div class="grid g4 comm-stats">
    ${stat('Oportunidades abertas',String(open.length),'em andamento no funil','↗','#2563eb')}
    ${stat('Propostas ativas',String(proposals.length),'enviadas ou aceitas','✎','#d97706')}
    ${stat('Fechadas ganhas',String(won.length),'vendas convertidas','✓','#059669')}
    ${stat('Valor ganho',commMoney(wonValue),'soma das oportunidades ganhas','$','#7c3aed')}
  </div>
  <div class="comm-funnel" aria-label="Funil de oportunidades comerciais">
    ${COMM_STAGES.map(stage=>{
      const rows=visible.filter(o=>o.stage===stage.key);
      return `<section class="comm-column" data-stage="${stage.key}"><div class="comm-column-head"><span><i style="background:${stage.color}"></i>${stage.label}</span><b>${rows.length}</b></div><div class="comm-column-body">${rows.length?rows.map(commercialOpportunityCard).join(''):'<div class="comm-column-empty">Nenhuma oportunidade</div>'}</div></section>`;
    }).join('')}
  </div>
  <div class="card comm-admin-commissions"><div class="card-t">Comissões comerciais</div><div class="card-d">Acompanhe e atualize o status das comissões geradas nas vendas ganhas.</div>${COMM_COMMISSIONS.length?`<div class="comm-commission-admin-list">${COMM_COMMISSIONS.slice(0,12).map(c=>`<div class="comm-commission-row"><span><b>${esc(c.partner_role==='indicador'?commIndicatorName(c.partner_id):commSellerName(c.partner_id))}</b><small>${c.partner_role==='indicador'?'Indicador':'Vendedor'} · ${commMoney(c.amount)} · ${Number(c.rate||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}% · ${commDateTime(c.created_at)}</small></span><select class="inp comm-status-select" onchange="commercialSetCommissionStatus('${c.id}',this.value)">${['a_receber','aprovada','paga','cancelada'].map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${commCommissionStatusLabel(s)}</option>`).join('')}</select></div>`).join('')}</div>`:'<div class="empty">Nenhuma comissão gerada.</div>'}</div><div class="comm-board-note">Vendedores visualizam suas oportunidades. Indicadores visualizam suas indicações. Administradores e perfis de gestão acompanham o funil inteiro e as comissões.</div>`;
}
function commercialOpportunityCard(o){
  const propCount=COMM_PROPOSALS.filter(p=>p.opportunity_id===o.id).length;
  const overdue=o.next_action_at&&new Date(o.next_action_at+'T23:59:59')<new Date()&&!['ganha','perdida'].includes(o.stage);
  return `<article class="comm-card ${overdue?'is-overdue':''}" onclick="commercialOpenOpportunity('${o.id}')" tabindex="0" onkeydown="if(event.key==='Enter')commercialOpenOpportunity('${o.id}')">
    <div class="comm-card-top"><span class="comm-source">${esc(o.source||'Indicação')}</span>${overdue?'<span class="pill pill-red">Atrasada</span>':''}</div>
    <h3>${esc(o.company||o.client_name||'Oportunidade sem nome')}</h3>
    <div class="comm-contact">${esc(o.client_name||'Contato não informado')}${o.city?' · '+esc(o.city):''}</div>
    <div class="comm-card-meta"><span>${o.expected_value?commMoney(o.expected_value):'Valor em definição'}</span><span>${propCount?`✎ ${propCount} proposta${propCount>1?'s':''}`:'Sem proposta'}</span></div>
    <div class="comm-card-bottom"><span>${esc(commSellerName(o.seller_id))}${o.indicator_id?` · ${esc(commIndicatorName(o.indicator_id))}`:''}</span><select aria-label="Mover oportunidade de estágio" onclick="event.stopPropagation()" onchange="commercialMoveStage('${o.id}',this.value)">${COMM_STAGES.map(s=>`<option value="${s.key}" ${o.stage===s.key?'selected':''}>${s.label}</option>`).join('')}</select></div>
  </article>`;
}
function commercialDetail(){
  const o=COMM_OPPORTUNITIES.find(x=>x.id===COMM_SELECTED_ID);
  if(!o){COMM_VIEW='board';return commercialBoard();}
  const proposals=COMM_PROPOSALS.filter(p=>p.opportunity_id===o.id);
  const proposalForm=COMM_PROPOSAL_FORM&&COMM_PROPOSAL_FORM.opportunityId===o.id?commercialProposalForm(o):'';
  const canProposal=commStaff()||selectedRole==='vendedor';
  const commissionPanel=commOpportunityCommissions(o.id).length?`<div class="comm-detail-text comm-detail-commission"><span>Comissões desta oportunidade</span><div class="comm-detail-commission-list">${commOpportunityCommissions(o.id).map(c=>`<div><b>${esc(c.partner_role==='indicador'?'Indicador':'Vendedor')}: ${commMoney(c.amount)}</b><small>${Number(c.rate||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}% · ${commCommissionStatusLabel(c.status)}</small></div>`).join('')}</div></div>`:'';
  const stageControl=selectedRole==='indicador'?`<div class="comm-stage-readonly"><span class="lbl">Estágio atual</span><b>${esc(COMM_STAGE_LABEL[o.stage]||o.stage)}</b><small>O vendedor ou a gestão atualiza esta etapa.</small></div>`:`<div class="comm-stage-edit"><label class="lbl">Atualizar estágio</label><select class="inp" onchange="commercialMoveStage('${o.id}',this.value)">${COMM_STAGES.map(s=>`<option value="${s.key}" ${o.stage===s.key?'selected':''}>${s.label}</option>`).join('')}</select></div>`;
  return `<div class="comm-detail-actions"><button class="btn btn-out" onclick="commercialBackToBoard()">← Voltar ao funil</button><div><button class="btn btn-out" onclick="commercialEditOpportunity('${o.id}')">Editar</button>${canProposal?` <button class="btn btn-fill" onclick="commercialStartProposal('${o.id}')">＋ Criar proposta</button>`:''}</div></div>
    <div class="comm-detail-grid"><div class="card comm-detail-main">
      <div class="comm-detail-title"><div><div class="eyebrow">OPORTUNIDADE COMERCIAL</div><h2>${esc(o.company||o.client_name||'Sem empresa')}</h2><p>${esc(o.client_name||'Contato não informado')} ${o.city?'· '+esc(o.city):''}</p></div><span class="comm-stage-badge" style="--stage-color:${COMM_STAGES.find(s=>s.key===o.stage)?.color||'#64748b'}">${esc(COMM_STAGE_LABEL[o.stage]||o.stage)}</span></div>
      <div class="comm-detail-fields"><div><span>Contato</span><b>${esc(o.email||'—')}</b></div><div><span>Telefone</span><b>${esc(o.phone||'—')}</b></div><div><span>Responsável</span><b>${esc(commSellerName(o.seller_id))}</b></div><div><span>Indicador</span><b>${esc(commIndicatorName(o.indicator_id))}</b></div><div><span>Próxima ação</span><b>${commDate(o.next_action_at)}</b></div><div><span>Pesquisa</span><b>${esc(o.survey_type||'A definir')}</b></div><div><span>Amostra estimada</span><b>${o.estimated_interviews?Number(o.estimated_interviews).toLocaleString('pt-BR'):'—'}</b></div><div><span>Região</span><b>${esc(o.region||'—')}</b></div><div><span>Valor estimado</span><b>${o.expected_value?commMoney(o.expected_value):'—'}</b></div></div>
      ${o.description?`<div class="comm-detail-text"><span>Necessidade / briefing</span><p>${esc(o.description)}</p></div>`:''}${o.notes?`<div class="comm-detail-text"><span>Notas internas</span><p>${esc(o.notes)}</p></div>`:''}
      ${stageControl}
      ${commissionPanel}
    </div><div class="card comm-proposals"><div class="card-t">Propostas comerciais <span class="pill pill-gray">${proposals.length}</span></div><div class="card-d">Crie, revise e envie uma proposta para este cliente.</div>${proposals.length?proposals.map(commercialProposalCard).join(''):'<div class="empty" style="padding:20px 0">Nenhuma proposta criada ainda.</div>'}</div></div>${proposalForm}`;
}
function commercialProposalCard(p){
  const items=commProposalItems(p);const total=Number(p.total)||items.reduce((s,i)=>s+(Number(i.total)||0),0);
  const decision=p.status==='enviada'?`<button class="btn-ghost" style="color:var(--teal)" onclick="commercialSetProposalStatus('${p.id}','aceita')">Aceita</button><button class="btn-ghost" style="color:var(--red)" onclick="commercialSetProposalStatus('${p.id}','recusada')">Recusada</button>`:'';
  return `<div class="comm-proposal-card"><div><b>${esc(p.proposal_number||'Proposta')}</b><span class="comm-proposal-date">${commDateTime(p.created_at)}</span></div><span class="pill ${p.status==='aceita'?'pill-green':p.status==='recusada'?'pill-red':p.status==='enviada'?'pill-blue':'pill-gray'}">${esc(COMM_STATUS_LABEL[p.status]||p.status)}</span><strong>${commMoney(total)}</strong><div class="comm-proposal-actions"><button class="btn-ghost" onclick="commercialStartProposal('${p.opportunity_id}','${p.id}')">Abrir</button>${p.status!=='aceita'&&p.status!=='recusada'?`<button class="btn-ghost" onclick="commercialSendProposal('${p.id}','email')">E-mail</button><button class="btn-ghost" onclick="commercialSendProposal('${p.id}','whatsapp')">WhatsApp</button>`:''}${decision}</div></div>`;
}
function commercialOpportunityForm(){
  const isNew=!COMM_EDIT_ID;const o=isNew?{client_name:'',company:'',email:'',phone:'',city:'',source:'Indicação',survey_type:'',estimated_interviews:'',region:'',expected_value:'',next_action_at:'',description:'',notes:'',seller_id:selectedRole==='vendedor'?CURRENT_PROFILE.id:'',indicator_id:selectedRole==='indicador'?CURRENT_PROFILE.id:''}:COMM_OPPORTUNITIES.find(x=>x.id===COMM_EDIT_ID)||{};
  const sellerSelect=commStaff()?`<div><label class="lbl">Vendedor responsável</label><select class="inp" id="comm-seller"><option value="">Sem atribuição</option>${(USERS||[]).filter(u=>u.role==='vendedor'&&u.status!=='encerrado').map(u=>`<option value="${u.id}" ${o.seller_id===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`:'';
  const indicatorSelect=commStaff()?`<div><label class="lbl">Indicador de cliente</label><select class="inp" id="comm-indicator"><option value="">Sem indicador</option>${(USERS||[]).filter(u=>u.role==='indicador'&&u.status!=='encerrado').map(u=>`<option value="${u.id}" ${o.indicator_id===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>`:'';
  return `<div class="comm-form-wrap"><div class="comm-detail-actions"><button class="btn btn-out" onclick="commercialCancelForm()">← Voltar</button></div><div class="card comm-form-card"><div class="card-t">${isNew?'Nova oportunidade comercial':'Editar oportunidade comercial'}</div><div class="card-d">Registre o contato, a necessidade de pesquisa e o próximo passo de venda.</div><div class="grid g2"><div><label class="lbl">Empresa / organização *</label><input class="inp" id="comm-company" value="${esc(o.company||'')}"></div><div><label class="lbl">Nome do contato *</label><input class="inp" id="comm-client" value="${esc(o.client_name||'')}"></div><div><label class="lbl">E-mail</label><input class="inp" type="email" id="comm-email" value="${esc(o.email||'')}"></div><div><label class="lbl">Telefone / WhatsApp</label><input class="inp" id="comm-phone" value="${esc(o.phone||'')}"></div><div><label class="lbl">Cidade</label><input class="inp" id="comm-city" value="${esc(o.city||'')}"></div><div><label class="lbl">Origem</label><select class="inp" id="comm-source">${['Indicação','Site','WhatsApp','Evento','Prospecção ativa','Outro'].map(v=>`<option ${o.source===v?'selected':''}>${v}</option>`).join('')}</select></div><div><label class="lbl">Tipo de pesquisa</label><input class="inp" id="comm-survey-type" placeholder="Ex.: opinião pública, satisfação…" value="${esc(o.survey_type||'')}"></div><div><label class="lbl">Amostra estimada</label><input class="inp" type="number" min="1" step="1" id="comm-interviews" value="${esc(o.estimated_interviews||'')}"></div><div><label class="lbl">Região / abrangência</label><input class="inp" id="comm-region" value="${esc(o.region||'')}"></div><div><label class="lbl">Valor estimado (R$)</label><input class="inp" type="number" min="0" step="0.01" id="comm-value" value="${esc(o.expected_value||'')}"></div><div><label class="lbl">Próxima ação</label><input class="inp" type="date" id="comm-next-action" value="${esc(o.next_action_at||'')}"></div>${sellerSelect}${indicatorSelect}</div><div class="mb"><label class="lbl">Necessidade / briefing</label><textarea class="inp" id="comm-description" rows="4" placeholder="O que o cliente precisa descobrir?">${esc(o.description||'')}</textarea></div><div class="mb"><label class="lbl">Notas internas</label><textarea class="inp" id="comm-notes" rows="3">${esc(o.notes||'')}</textarea></div><div class="comm-form-footer"><button class="btn btn-out" onclick="commercialCancelForm()">Cancelar</button><button class="btn btn-fill" onclick="commercialSaveOpportunity()">${isNew?'Cadastrar oportunidade':'Salvar alterações'}</button></div></div></div>`;
}
function commercialProposalForm(o){
  const p=COMM_PROPOSAL_FORM.proposalId?COMM_PROPOSALS.find(x=>x.id===COMM_PROPOSAL_FORM.proposalId):null;
  const items=commProposalItems(p);const lines=items.map(i=>`${i.description||''} | ${i.quantity||1} | ${i.unit_price||0}`).join('\n');
  return `<div class="card comm-proposal-editor"><div class="card-t">${p?'Editar proposta':'Criar proposta comercial'}</div><div class="card-d">Uma linha por item no formato <b>Descrição | quantidade | valor unitário</b>.</div><div class="grid g2"><div><label class="lbl">Validade da proposta</label><input class="inp" type="date" id="comm-prop-valid" value="${esc(p&&p.valid_until||'')}"></div><div><label class="lbl">Total / valor fechado (R$)</label><input class="inp" type="number" min="0" step="0.01" id="comm-prop-total" value="${esc(p&&p.total||'')}" placeholder="Calculado pelos itens se vazio"></div></div><div class="mb"><label class="lbl">Itens e serviços</label><textarea class="inp" id="comm-prop-items" rows="5" placeholder="Planejamento amostral | 1 | 2500\nColeta de campo | 300 | 25">${esc(lines)}</textarea></div><div class="mb"><label class="lbl">Escopo e condições</label><textarea class="inp" id="comm-prop-scope" rows="4">${esc(p&&p.scope_text||'Inclui planejamento, coleta de campo, acompanhamento e relatório final conforme briefing aprovado.')}</textarea></div><div class="mb"><label class="lbl">Condições de pagamento</label><textarea class="inp" id="comm-prop-terms" rows="3">${esc(p&&p.payment_terms||'A definir em contrato comercial.')}</textarea></div><div class="comm-form-footer"><button class="btn btn-out" onclick="commercialCancelProposal()">Cancelar</button><button class="btn btn-fill" onclick="commercialSaveProposal()">Salvar proposta</button></div></div>`;
}
function commercialNewOpportunity(){COMM_VIEW='form';COMM_EDIT_ID=null;commercialPaint();}
function commercialEditOpportunity(id){COMM_VIEW='form';COMM_EDIT_ID=id;commercialPaint();}
function commercialCancelForm(){COMM_VIEW='board';COMM_EDIT_ID=null;commercialPaint();}
function commercialOpenOpportunity(id){COMM_SELECTED_ID=id;COMM_VIEW='detail';COMM_PROPOSAL_FORM=null;commercialPaint();}
function commercialBackToBoard(){COMM_VIEW='board';COMM_PROPOSAL_FORM=null;commercialPaint();}
function commercialSetFilter(kind,value){if(kind==='stage')COMM_FILTER_STAGE=value;else COMM_FILTER_SELLER=value;COMM_VIEW='board';commercialPaint();}

async function commercialSaveOpportunity(){
  const value=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const company=value('comm-company'),client=value('comm-client');
  if(!company||!client){alert('Informe a empresa e o nome do contato.');return;}
  const current=COMM_OPPORTUNITIES.find(x=>x.id===COMM_EDIT_ID);
  const seller=commStaff()?(value('comm-seller')||null):(selectedRole==='vendedor'?CURRENT_PROFILE.id:(current?.seller_id||null));
  const indicator=commStaff()?(value('comm-indicator')||null):(selectedRole==='indicador'?CURRENT_PROFILE.id:(current?.indicator_id||null));
  const row={company,client_name:client,email:value('comm-email')||null,phone:value('comm-phone')||null,city:value('comm-city')||null,source:value('comm-source')||'Outro',survey_type:value('comm-survey-type')||null,estimated_interviews:value('comm-interviews')?Number(value('comm-interviews')):null,region:value('comm-region')||null,expected_value:value('comm-value')?Number(value('comm-value')):null,next_action_at:value('comm-next-action')||null,description:value('comm-description')||null,notes:value('comm-notes')||null,seller_id:seller,indicator_id:indicator,updated_at:new Date().toISOString()};
  const btn=[...document.querySelectorAll('#commercialRoot .btn-fill')].find(x=>x.textContent.includes('Cadastrar')||x.textContent.includes('Salvar'));
  if(btn)btn.disabled=true;
  try{
    let error;
    if(COMM_EDIT_ID){({error}=await sb.from('commercial_opportunities').update(row).eq('id',COMM_EDIT_ID));}
    else{row.stage='novo';row.created_by=CURRENT_PROFILE.id;({error}=await sb.from('commercial_opportunities').insert(row));}
    if(error)throw new Error(error.message);
    const selected=COMM_EDIT_ID;COMM_VIEW=selected?'detail':'board';COMM_SELECTED_ID=selected||null;COMM_EDIT_ID=null;COMM_LOADED=false;await commercialLoad(true);
  }catch(ex){alert('Não foi possível salvar a oportunidade: '+ex.message);if(btn)btn.disabled=false;}
}
async function commercialMoveStage(id,stage){
  const valid=COMM_STAGES.some(s=>s.key===stage);if(!valid)return;
  const {error}=await sb.from('commercial_opportunities').update({stage,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('Não foi possível atualizar o estágio: '+error.message);return;}
  const o=COMM_OPPORTUNITIES.find(x=>x.id===id);if(o)o.stage=stage;
  if(stage==='ganha')COMM_VIEW='detail';
  commercialPaint();
}
function commercialStartProposal(opportunityId,proposalId){COMM_SELECTED_ID=opportunityId;COMM_VIEW='detail';COMM_PROPOSAL_FORM={opportunityId,proposalId:proposalId||null};commercialPaint();}
function commercialCancelProposal(){COMM_PROPOSAL_FORM=null;commercialPaint();}
function commercialProposalNumber(){return 'PP-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6);}
function commercialParseItems(text){
  return String(text||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{
    const parts=line.split('|').map(x=>x.trim());const quantity=Number(parts[1])||1;const unit=Number(parts[2])||0;
    return {description:parts[0]||'Serviço de pesquisa',quantity,unit_price:unit,total:quantity*unit};
  });
}
async function commercialSaveProposal(){
  const o=COMM_OPPORTUNITIES.find(x=>x.id===COMM_PROPOSAL_FORM?.opportunityId);if(!o)return;
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const items=commercialParseItems(g('comm-prop-items'));const typedTotal=Number(g('comm-prop-total'))||0;const total=typedTotal||items.reduce((s,i)=>s+i.total,0);
  if(!items.length&&!total){alert('Informe ao menos um item ou um valor total.');return;}
  const proposalId=COMM_PROPOSAL_FORM.proposalId;const existing=proposalId?COMM_PROPOSALS.find(x=>x.id===proposalId):null;
  const row={opportunity_id:o.id,proposal_number:existing?.proposal_number||commercialProposalNumber(),status:existing?.status||'rascunho',valid_until:g('comm-prop-valid')||null,scope_text:g('comm-prop-scope')||null,payment_terms:g('comm-prop-terms')||null,subtotal:items.reduce((s,i)=>s+i.total,0),discount:0,total,created_by:CURRENT_PROFILE.id,updated_at:new Date().toISOString()};
  try{
    let saved,error;
    if(proposalId){const r=await sb.from('commercial_proposals').update(row).eq('id',proposalId).select().single();saved=r.data;error=r.error;}
    else{const r=await sb.from('commercial_proposals').insert(row).select().single();saved=r.data;error=r.error;}
    if(error)throw new Error(error.message);
    if(!saved?.id)throw new Error('A proposta não retornou um identificador.');
    const del=await sb.from('commercial_proposal_items').delete().eq('proposal_id',saved.id);if(del.error)throw new Error(del.error.message);
    if(items.length){const ins=await sb.from('commercial_proposal_items').insert(items.map(i=>({...i,proposal_id:saved.id})));if(ins.error)throw new Error(ins.error.message);}
    COMM_PROPOSAL_FORM=null;COMM_LOADED=false;await commercialLoad(true);
  }catch(ex){alert('Não foi possível salvar a proposta: '+ex.message);}
}
function commercialProposalText(p,o){
  const items=commProposalItems(p);const itemText=items.length?items.map(i=>`- ${i.description}: ${i.quantity} x ${commMoney(i.unit_price)} = ${commMoney(i.total)}`).join('\n'):'- Serviço de pesquisa conforme escopo';
  return `Olá, ${o.client_name||'tudo bem'}!\n\nSegue a proposta comercial ${p.proposal_number||''} da PesquisaPro para ${o.company||'sua organização'}.\n\nEscopo:\n${p.scope_text||'Conforme briefing aprovado.'}\n\nItens:\n${itemText}\n\nValor total: ${commMoney(p.total)}\nValidade: ${commDate(p.valid_until)}\nCondições: ${p.payment_terms||'A definir em contrato.'}\n\nFicamos à disposição para ajustar o escopo.\nPesquisaPro`;
}
async function commercialSendProposal(id,via){
  const p=COMM_PROPOSALS.find(x=>x.id===id);const o=p&&COMM_OPPORTUNITIES.find(x=>x.id===p.opportunity_id);if(!p||!o)return;
  const text=commercialProposalText(p,o);const subject=encodeURIComponent(`Proposta PesquisaPro ${p.proposal_number||''}`);let href;
  if(via==='whatsapp'){const digits=commPhoneDigits(o.phone);if(!digits){alert('Cadastre um telefone/WhatsApp para este cliente antes de enviar.');return;}href='https://wa.me/'+(digits.length<=11?'55'+digits:digits)+'?text='+encodeURIComponent(text);}
  else{if(!o.email){alert('Cadastre um e-mail para este cliente antes de enviar.');return;}href='mailto:'+encodeURIComponent(o.email)+'?subject='+subject+'&body='+encodeURIComponent(text);}
  window.open(href,'_blank','noopener');
  const {error}=await sb.from('commercial_proposals').update({status:'enviada',sent_at:new Date().toISOString(),sent_via:via,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('A proposta foi aberta para envio, mas não foi possível registrar o status: '+error.message);return;}
  const opp=COMM_OPPORTUNITIES.find(x=>x.id===o.id);if(opp&&opp.stage==='novo')await sb.from('commercial_opportunities').update({stage:'proposta',updated_at:new Date().toISOString()}).eq('id',o.id);
  COMM_LOADED=false;await commercialLoad(true);
}
async function commercialSetCommissionStatus(id,status){
  if(!commStaff()||!['a_receber','aprovada','paga','cancelada'].includes(status))return;
  const {error}=await sb.from('commercial_commissions').update({status,paid_at:status==='paga'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('Não foi possível atualizar a comissão: '+error.message);return;}
  COMM_LOADED=false;await commercialLoad(true);
}
async function commercialSetProposalStatus(id,status){
  if(!['aceita','recusada'].includes(status))return;
  const p=COMM_PROPOSALS.find(x=>x.id===id);if(!p)return;
  const {error}=await sb.from('commercial_proposals').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){alert('Não foi possível atualizar a proposta: '+error.message);return;}
  if(status==='aceita'){
    const o=COMM_OPPORTUNITIES.find(x=>x.id===p.opportunity_id);
    if(o)await sb.from('commercial_opportunities').update({stage:'ganha',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',o.id);
  }
  COMM_LOADED=false;await commercialLoad(true);
}
function commercialPrintProposal(id){window.print();}
