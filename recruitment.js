/* ============================================================
   RECRUTAMENTO — links, QR Codes, ranking, captações, indicações
   e financeiro dos recrutadores
   ------------------------------------------------------------
   O cadastro público usa RPCs seguras. Sem API do WhatsApp, a
   notificação abre uma mensagem pronta para envio manual.
   ============================================================ */
(function(){
  const PUBLIC_ORIGIN=()=>{
    const origin=window.location.origin;
    return origin&&origin!=='null'&&!origin.startsWith('file:')?origin:'https://pesquisa-pro.vercel.app';
  };
  const BUSINESS_WHATSAPP='5531996683030';
  let RECRUITMENT_LOADED=false;
  let RECRUITMENT_LOADING=false;
  let RECRUITMENT_DATA={recruiters:[],signups:[],captures:[],referrals:[],paymentReceipts:[],referralSchemaMissing:false,paymentSchemaMissing:false};
  let RECRUITMENT_PROMISE=null;
  let RECRUITMENT_FINANCE_RECRUITER_ID=null;

  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const date=v=>{if(!v)return '—';const raw=String(v);const parsed=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(raw+'T12:00:00'):new Date(raw);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString('pt-BR');};
  const management=()=>['admin','admpro'].includes(selectedRole);
  const roleAllowed=()=>['admin','admpro','recrutador'].includes(selectedRole);
  const recruiterLink=r=>PUBLIC_ORIGIN()+'/cadastro.html?recrutador='+encodeURIComponent(r.recruiter_code||r.id||'');
  const recruiterById=id=>RECRUITMENT_DATA.recruiters.find(r=>r.id===id);
  const captureById=id=>RECRUITMENT_DATA.captures.find(c=>c.id===id);
  const receiptsForCapture=id=>RECRUITMENT_DATA.paymentReceipts.filter(r=>r.recruiter_capture_id===id);
  const receivedForCapture=id=>receiptsForCapture(id).reduce((sum,r)=>sum+Number(r.amount||0),0);
  const captureValue=c=>Math.max(0,Number(c?.capture_value)||0);
  const captureBalance=c=>Math.max(0,Math.round((captureValue(c)-receivedForCapture(c?.id))*100)/100);
  const captureApproved=c=>['a_receber','paga'].includes(c?.status);
  const capturePayable=c=>captureApproved(c)&&captureBalance(c)>0;
  const captureTotals=caps=>{
    const active=(caps||[]).filter(c=>c.status!=='cancelada');
    const approved=active.filter(captureApproved);
    const pending=active.filter(c=>c.status==='pendente');
    const approvedValue=approved.reduce((n,c)=>n+captureValue(c),0);
    const pendingValue=pending.reduce((n,c)=>n+captureValue(c),0);
    const received=approved.reduce((n,c)=>n+receivedForCapture(c.id),0);
    return {active,approved,pending,approvedValue,pendingValue,received,balance:Math.max(0,approvedValue-received)};
  };
  const countsFor=id=>{
    const signups=RECRUITMENT_DATA.signups.filter(s=>s.recruiter_id===id);
    const caps=RECRUITMENT_DATA.captures.filter(c=>c.recruiter_id===id);
    const approved=signups.filter(s=>s.status==='aprovado').length;
    const pending=signups.filter(s=>['novo','diligencia'].includes(s.status)).length;
    const rejected=signups.filter(s=>s.status==='reprovado').length;
    const totals=captureTotals(caps);
    return {total:signups.length,approved,pending,rejected,due:totals.balance,approvedValue:totals.approvedValue,pendingValue:totals.pendingValue,paid:totals.received,captures:caps,...totals};
  };
  const signupStatus=s=>({novo:'<span class="pill pill-blue">● Novo</span>',diligencia:'<span class="pill pill-amber">● Em diligência</span>',aprovado:'<span class="pill pill-green">● Aprovado</span>',reprovado:'<span class="pill pill-red">● Reprovado</span>'}[s]||s||'—');
  const referralStatus=s=>({link_gerado:'<span class="pill pill-blue">Link gerado</span>',enviado:'<span class="pill pill-amber">Link enviado</span>',cadastro_recebido:'<span class="pill pill-blue">Cadastro recebido</span>',aprovado:'<span class="pill pill-green">Aprovado</span>',reprovado:'<span class="pill pill-red">Reprovado</span>',cancelado:'<span class="pill pill-gray">Cancelado</span>'}[s]||'<span class="pill pill-gray">Indicação</span>');
  const captureStatus=s=>({pendente:'<span class="pill pill-amber">Aguardando aprovação</span>',a_receber:'<span class="pill pill-blue">A receber</span>',paga:'<span class="pill pill-green">Paga</span>',cancelada:'<span class="pill pill-red">Cancelada</span>'}[s]||s||'—');
  const paymentReceiptStatus=r=>r?.receipt_path?'<span class="pill pill-green">Comprovante anexado</span>':'<span class="pill pill-gray">Sem comprovante</span>';

  async function loadRecruitment(){
    if(RECRUITMENT_LOADED)return;
    if(RECRUITMENT_PROMISE)return RECRUITMENT_PROMISE;
    RECRUITMENT_LOADING=true;
    RECRUITMENT_PROMISE=(async()=>{
      try{
        const recruiterQuery=management()
          ? sb.from('profiles').select('id,name,email,phone,status,recruiter_code,recruiter_capture_value').eq('role','recrutador').order('name')
          : sb.from('profiles').select('id,name,email,phone,status,recruiter_code,recruiter_capture_value').eq('id',CURRENT_PROFILE?.id).limit(1);
        const signupQuery=management()
          ? sb.from('signups').select('id,name,email,phone,cidade,status,recruiter_id,recruiter_code,recruiter_capture_value,approved_profile_id,approved_at,sent_at').not('recruiter_id','is',null).order('sent_at',{ascending:false})
          : Promise.resolve({data:[],error:null});
        const captureQuery=management()
          ? sb.from('recruiter_captures').select('id,signup_id,recruiter_id,recruiter_code,candidate_name,candidate_phone,candidate_city,capture_value,status,created_at,approved_at,paid_at').order('created_at',{ascending:false})
          : sb.from('recruiter_captures').select('id,signup_id,recruiter_id,recruiter_code,candidate_name,candidate_phone,candidate_city,capture_value,status,created_at,approved_at,paid_at').eq('recruiter_id',CURRENT_PROFILE?.id||'00000000-0000-0000-0000-000000000000').order('created_at',{ascending:false});
        const referralQuery=management()
          ? sb.from('researcher_referrals').select('id,referral_token,referrer_id,referrer_name,referred_name,referred_phone,referred_email,referred_city,note,status,signup_id,referred_profile_id,created_at,sent_at,submitted_at').order('created_at',{ascending:false})
          : Promise.resolve({data:[],error:null});
        const receiptQuery=management()
          ? sb.from('recruiter_payment_receipts').select('*').order('paid_at',{ascending:false}).order('created_at',{ascending:false})
          : sb.from('recruiter_payment_receipts').select('*').eq('recruiter_id',CURRENT_PROFILE?.id||'00000000-0000-0000-0000-000000000000').order('paid_at',{ascending:false}).order('created_at',{ascending:false});
        const [r,s,c,ref,receipts]=await Promise.all([recruiterQuery,signupQuery,captureQuery,referralQuery,receiptQuery]);
        const err=[r,s,c].find(x=>x&&x.error);
        if(err)throw new Error(err.error.message);
        const referralSchemaMissing=!!(ref?.error&&/researcher_referrals|schema cache|does not exist|relation .* does not exist/i.test(ref.error.message||''));
        if(ref?.error&&!referralSchemaMissing)console.warn('Indicações não carregadas:',ref.error.message);
        const paymentSchemaMissing=!!(receipts?.error&&/recruiter_payment_receipts|recruiter-payment-receipts|schema cache|does not exist|relation .* does not exist/i.test(receipts.error.message||''));
        if(receipts?.error&&!paymentSchemaMissing)console.warn('Pagamentos de recrutadores não carregados:',receipts.error.message);
        RECRUITMENT_DATA={recruiters:r.data||[],signups:s.data||[],captures:c.data||[],referrals:referralSchemaMissing?[]:(ref?.data||[]),paymentReceipts:paymentSchemaMissing?[]:(receipts?.data||[]),referralSchemaMissing,paymentSchemaMissing};
        RECRUITMENT_LOADED=true;
      }catch(ex){
        console.error('Erro ao carregar recrutamento:',ex);
        RECRUITMENT_DATA={recruiters:[],signups:[],captures:[],referrals:[],paymentReceipts:[],referralSchemaMissing:false,paymentSchemaMissing:false,error:ex.message};
      }finally{
        RECRUITMENT_LOADING=false;
        RECRUITMENT_PROMISE=null;
        const key=document.querySelector('.nav-item.on')?.dataset.key;
        if(key==='recruitment')go('recruitment');
      }
    })();
    return RECRUITMENT_PROMISE;
  }

  function paymentReceiptFileName(path){
    const raw=String(path||'').split('?')[0].split('/').pop()||'comprovante-pagamento-recrutador';
    try{return decodeURIComponent(raw)||'comprovante-pagamento-recrutador';}catch(ex){return raw;}
  }
  function paymentReceiptFileLabel(receipt){
    const name=String(receipt?.receipt_name||'comprovante de pagamento');
    return name.length>42?name.slice(0,39)+'…':name;
  }
  function recruiterPaymentReceiptActions(receipt,canManage){
    if(!receipt)return '';
    const view=receipt.receipt_path?`<button type="button" class="btn-ghost recruiter-receipt-view" onclick="recruiterPaymentReceiptOpen(${jsArg(receipt.id)})">Abrir comprovante</button><button type="button" class="btn-ghost recruiter-receipt-download" onclick="recruiterPaymentReceiptDownload(${jsArg(receipt.id)})">Baixar</button>`:'';
    const manage=canManage?`${receipt.receipt_path?`<button type="button" class="btn-ghost recruiter-receipt-delete" onclick="recruiterDeletePaymentReceipt(${jsArg(receipt.id)})">Excluir comprovante</button>`:''}<button type="button" class="btn-ghost recruiter-receipt-edit" onclick="recruiterEditPaymentReceipt(${jsArg(receipt.id)})">Alterar valor</button>`:'';
    return `<div class="recruiter-payment-receipt-actions">${view}${manage}${receipt.receipt_path?`<small class="recruiter-receipt-name" title="${esc(receipt.receipt_name||'')}">${esc(paymentReceiptFileLabel(receipt))}</small>`:canManage?`<button type="button" class="btn-ghost recruiter-receipt-attach" onclick="recruiterAttachPaymentReceipt(${jsArg(receipt.id)})">＋ Anexar comprovante</button>`:'<small class="recruiter-receipt-missing">Comprovante ainda não anexado</small>'}</div>`;
  }
  function receiptHistoryMarkup(capture,canManage){
    const receipts=receiptsForCapture(capture.id);
    if(!receipts.length)return canManage?'<span class="recruiter-receipt-missing">Nenhum repasse lançado</span>':'<span class="recruiter-receipt-missing">Nenhum comprovante</span>';
    return `<div class="recruiter-receipt-history">${receipts.map(r=>`<div class="recruiter-receipt-line"><span>${money(r.amount)} · ${date(r.paid_at)}</span>${paymentReceiptStatus(r)}${r.note?`<small>${esc(r.note)}</small>`:''}${recruiterPaymentReceiptActions(r,canManage)}</div>`).join('')}</div>`;
  }

  function recruiterFinancePanel(recruiterId){
    if(!management()||!recruiterId)return '';
    const recruiter=recruiterById(recruiterId);if(!recruiter)return '';
    const caps=RECRUITMENT_DATA.captures.filter(c=>c.recruiter_id===recruiterId&&c.status!=='cancelada');
    const totals=captureTotals(caps);
    const rows=caps.length?caps.map(c=>{
      const received=receivedForCapture(c.id),balance=captureBalance(c),payButton=capturePayable(c)?`<button type="button" class="btn-ghost recruiter-finance-pay" onclick="recruitmentRegisterPayment(${jsArg(c.id)})">＋ Registrar repasse</button>`:'';
      return `<article class="recruiter-finance-capture ${balance>0?'is-open':''}"><div class="recruiter-finance-capture-main"><div><strong>${esc(c.candidate_name||'Pesquisador cadastrado')}</strong><small>${esc(c.candidate_city||'Cidade não informada')} · captação em ${date(c.created_at)}</small></div><div>${captureStatus(c.status)}</div></div><div class="recruiter-finance-capture-values"><div><span>Valor aprovado</span><b>${money(captureValue(c))}</b></div><div><span>Recebido</span><b class="is-paid">${money(received)}</b></div><div><span>Falta pagar</span><b class="is-balance">${money(balance)}</b></div><div><span>Ações</span><div class="recruiter-finance-actions">${payButton}${balance<=0?'<span class="pill pill-green">Quitada</span>':''}</div></div></div>${receiptHistoryMarkup(c,true)}</article>`;
    }).join(''):'<div class="empty">Nenhuma captação aprovada para este recrutador.</div>';
    return `<section class="card recruiter-finance-panel" id="recruiter-finance-panel"><div class="section-heading"><div><span class="eyebrow">LIVRO FINANCEIRO</span><div class="card-t">Pagamentos de ${esc(recruiter.name||'Recrutador')}</div><div class="card-d">Cada captação aprovada permanece registrada; repasses parciais reduzem o saldo sem apagar o histórico.</div></div><button type="button" class="btn btn-out" onclick="recruitmentCloseFinance()">Fechar financeiro</button></div>${RECRUITMENT_DATA.paymentSchemaMissing?'<div class="callout warn recruiter-finance-warning">O livro financeiro ainda não está ativo no banco. Execute <code>deploy/financeiro-recrutadores.sql</code> no Supabase para registrar repasses e comprovantes.</div>':''}<div class="grid g4 recruiter-finance-summary">${stat('Total aprovado',money(totals.approvedValue),totals.approved.length+' captações aprovadas','R$','#2563eb')}${stat('Pagamentos parciais',money(totals.received),'repasses lançados','◐','#059669')}${stat('Pagamentos a aprovar',money(totals.pendingValue),totals.pending.length+' cadastros ainda pendentes','◷','#d97706')}${stat('Falta pagar',money(totals.balance),'saldo após repasses','◷','#0f766e')}</div><div class="recruiter-finance-capture-list">${rows}</div></section>`;
  }

  function managementPage(){
    if(!RECRUITMENT_LOADED){loadRecruitment();return head('Recrutamento','Links, QR Codes, captações e pagamentos')+'<div class="card"><div class="empty">Carregando recrutadores, captações e financeiro…</div></div>';}
    if(RECRUITMENT_DATA.error)return head('Recrutamento','Links, QR Codes e desempenho de captação')+'<div class="callout warn">Não foi possível carregar o módulo. Execute as migrations de recrutamento e tente novamente.<br><small>'+esc(RECRUITMENT_DATA.error)+'</small></div>';
    const recruiters=RECRUITMENT_DATA.recruiters;
    const total=RECRUITMENT_DATA.signups.length;
    const approved=RECRUITMENT_DATA.signups.filter(s=>s.status==='aprovado').length;
    const pending=RECRUITMENT_DATA.signups.filter(s=>['novo','diligencia'].includes(s.status)).length;
    const allTotals=captureTotals(RECRUITMENT_DATA.captures);
    const sorted=recruiters.slice().sort((a,b)=>{
      const ca=countsFor(a.id),cb=countsFor(b.id);
      return (cb.approved-ca.approved)||(cb.total-ca.total)||(cb.due-ca.due);
    });
    const cards=sorted.length?sorted.map((r,rank)=>{
      const c=countsFor(r.id);
      const initials=initialsOf(r.name);
      return `<article class="recruiter-card"><div class="recruiter-card-top"><div class="avatar recruiter-avatar">${esc(initials)}</div><div class="recruiter-card-name"><strong>${esc(r.name)}</strong><span>${r.status==='ativo'?'<span class="pill pill-green">Ativo</span>':'<span class="pill pill-amber">Pendente</span>'} <span class="recruiter-rank">#${rank+1}</span></span></div><button class="btn-ghost" title="Conversar com recrutador" onclick="clientWhatsAppMsg(${jsArg(r.phone||'')},${jsArg('Olá '+r.name+'! Temos uma atualização sobre suas captações no PesquisaPro.')})">${icon3d('☏','#0f766e')}</button></div><div class="recruiter-link-row"><code>${esc(r.recruiter_code||'sem código')}</code><button class="btn-ghost" onclick="recruitmentCopyLink(${jsArg(r.id)})">Copiar link</button></div><div class="recruiter-qr-layout"><div class="recruiter-qr" id="recruiter-qr-${esc(r.id)}" data-recruiter-id="${esc(r.id)}"></div><div class="recruiter-card-actions"><button class="btn btn-fill" onclick="recruitmentShare(${jsArg(r.id)})">Compartilhar link</button><button class="btn btn-out" onclick="recruitmentCopyLink(${jsArg(r.id)})">Copiar convite</button><button class="btn btn-finance" onclick="recruitmentOpenFinance(${jsArg(r.id)})">Abrir financeiro</button><small>Valor por aprovado: <b>${money(r.recruiter_capture_value)}</b></small></div></div><div class="recruiter-metrics"><div><b>${c.total}</b><span>cadastros</span></div><div><b>${c.approved}</b><span>aprovados</span></div><div><b>${money(c.received)}</b><span>recebido</span></div><div><b>${money(c.balance)}</b><span>falta pagar</span></div></div></article>`;
    }).join(''):'<div class="empty">Nenhum perfil com papel Recrutador. Cadastre em Usuários → Recrutadores.</div>';
    const signupRows=RECRUITMENT_DATA.signups.slice(0,12).map(s=>{
      const r=recruiterById(s.recruiter_id);
      return `<tr><td><b>${esc(s.name)}</b><div class="table-sub">${esc(s.email||'')} · ${esc(s.cidade||'')}</div></td><td>${esc(r?.name||s.recruiter_code||'—')}</td><td>${signupStatus(s.status)}</td><td>${date(s.sent_at)}</td><td><button class="btn-ghost" onclick="recruitmentNotifySignup(${jsArg(s.id)})">WhatsApp</button></td></tr>`;
    }).join('');
    const referralRows=RECRUITMENT_DATA.referrals.slice(0,30).map(referral=>`<tr><td><b>${esc(referral.referrer_name||'Pesquisador removido')}</b><div class="table-sub">${referral.referrer_id?'ID preservado':'perfil não disponível'}</div></td><td><b>${esc(referral.referred_name||'—')}</b><div class="table-sub">${esc(referral.referred_email||'')} · ${esc(referral.referred_city||'')}</div></td><td>${esc(referral.referred_phone||'—')}</td><td>${referralStatus(referral.status)}</td><td>${date(referral.created_at)}</td><td>${referral.submitted_at?date(referral.submitted_at):'—'}</td><td><button class="btn-ghost" onclick="recruitmentNotifyReferral(${jsArg(referral.id)})">WhatsApp</button></td></tr>`).join('');
    const referralSection=RECRUITMENT_DATA.referralSchemaMissing
      ? `<section class="card recruitment-section recruitment-referrals-section"><div class="card-t">Indicações feitas por pesquisadores</div><div class="callout warn" style="margin-top:10px">Execute a migration <code>deploy/indicacao-pesquisador.sql</code> para visualizar quem indicou quem e acompanhar os cadastros vindos desses links.</div></section>`
      : `<section class="card recruitment-section recruitment-referrals-section"><div class="section-heading"><div><div class="card-t">Indicações feitas por pesquisadores</div><div class="card-d">Origem rastreável dos novos pesquisadores: quem indicou, quem foi indicado e se o cadastro já foi recebido.</div></div><span class="pill pill-blue">${RECRUITMENT_DATA.referrals.length} indicaç${RECRUITMENT_DATA.referrals.length===1?'ão':'ões'}</span></div><div class="user-table-scroll"><table><thead><tr><th>Quem indicou</th><th>Pesquisador indicado</th><th>WhatsApp</th><th>Status</th><th>Indicado em</th><th>Cadastro</th><th></th></tr></thead><tbody>${referralRows||'<tr><td colspan="7" class="empty">Nenhuma indicação registrada ainda.</td></tr>'}</tbody></table></div></section>`;
    const financeNotice=RECRUITMENT_DATA.paymentSchemaMissing?'<div class="callout warn recruiter-finance-warning"><b>Financeiro de recrutadores:</b> execute manualmente <code>deploy/financeiro-recrutadores.sql</code> no Supabase para habilitar repasses parciais, saldo e comprovantes. Os cadastros e captações continuam preservados.</div>':'';
    return `<div class="recruitment-page">${head('Recrutamento','Capte pesquisadores por link, acompanhe aprovações e faça repasses com histórico',`<button class="btn btn-out" onclick="go('users');setTimeout(()=>userSetTab('recrutador'),0)">Gerenciar perfis</button><button class="btn btn-fill" onclick="go('users');setTimeout(()=>{userSetTab('recrutador');userOpen('new')},0)">＋ Novo recrutador</button>`)}<div class="recruitment-hero"><div><span class="eyebrow">CENTRAL DE CAPTAÇÃO E PAGAMENTOS</span><h2>Transforme cada recrutador em um canal rastreável</h2><p>Crie um link individual, acompanhe os cadastros e pague somente captações aprovadas, com repasses parciais e comprovantes.</p></div><div class="recruitment-hero-icon">${icon3d('♙','#0f766e')}</div></div>${financeNotice}<div class="grid g4 recruitment-stat-grid">${stat('Recrutadores',String(recruiters.length),'perfis ativos e cadastrados','♙','#0f766e')}${stat('Cadastros captados',String(total),'atribuídos a um link','↗','#2563eb')}${stat('Aprovados',String(approved),'liberados para reconhecimento','✓','#059669')}${stat('Total aprovado',money(allTotals.approvedValue),'valor das captações aprovadas','R$','#2563eb')}${stat('Pagamentos parciais',money(allTotals.received),'repasses já lançados','◐','#059669')}${stat('Pagamentos a aprovar',money(allTotals.pendingValue),'captações aguardando aprovação','◷','#d97706')}${stat('Falta pagar',money(allTotals.balance),'saldo após repasses','◷','#0f766e')}</div>${recruiterFinancePanel(RECRUITMENT_FINANCE_RECRUITER_ID)}<section class="card recruitment-section"><div class="section-heading"><div><div class="card-t">Ranking de captação</div><div class="card-d">Ordenado por pesquisadores aprovados, depois por volume total de cadastros. Abra o financeiro de um recrutador para registrar repasses.</div></div><button class="btn btn-out" onclick="recruitmentReload()">Atualizar dados</button></div><div class="recruiter-grid">${cards}</div></section><section class="card recruitment-section"><div class="section-heading"><div><div class="card-t">Últimos cadastros por recrutador</div><div class="card-d">A notificação abaixo abre o WhatsApp com a mensagem pronta para o número Business configurado.</div></div><span class="pill pill-blue">${pending} pendentes</span></div><div class="user-table-scroll"><table><thead><tr><th>Pesquisador</th><th>Recrutador</th><th>Status</th><th>Entrada</th><th></th></tr></thead><tbody>${signupRows||'<tr><td colspan="5" class="empty">Nenhum cadastro atribuído a recrutador ainda.</td></tr>'}</tbody></table></div></section>${referralSection}<div class="callout recruitment-notice">Sem API do WhatsApp, o sistema registra a captação automaticamente e abre o WhatsApp com a mensagem preenchida. O envio final depende do clique em <b>Enviar</b> no aplicativo.</div></div>`;
  }

  function personalPage(){
    if(!RECRUITMENT_LOADED){loadRecruitment();return head('Minhas captações','Acompanhe seus pesquisadores indicados e seus repasses')+'<div class="card"><div class="empty">Carregando seus resultados…</div></div>';}
    const id=CURRENT_PROFILE?.id;
    const r=CURRENT_PROFILE||{};
    const caps=RECRUITMENT_DATA.captures.filter(c=>c.recruiter_id===id&&c.status!=='cancelada');
    const totals=captureTotals(caps);
    const rows=caps.map(c=>{
      const received=receivedForCapture(c.id),balance=captureBalance(c);
      return `<tr><td><b>${esc(c.candidate_name||'Pesquisador cadastrado')}</b><div class="table-sub">${esc(c.candidate_city||'')} · ${date(c.created_at)}</div></td><td>${captureStatus(c.status)}</td><td>${money(captureValue(c))}</td><td>${money(received)}</td><td>${money(balance)}</td><td>${c.paid_at?date(c.paid_at):'—'}</td><td>${receiptHistoryMarkup(c,false)}</td></tr>`;
    }).join('');
    return `<div class="recruitment-page recruiter-personal-page">${head('Minhas captações','Acompanhe os pesquisadores que entraram pelo seu link e seus pagamentos') }<div class="recruitment-hero"><div><span class="eyebrow">MEU CANAL</span><h2>${esc(r.name||'Recrutador')}</h2><p>Compartilhe seu link exclusivo e acompanhe o reconhecimento de cada captação aprovada.</p><div class="recruiter-personal-link"><code>${esc(recruiterLink({recruiter_code:r.recruiter_code||r.recruiterCode}))}</code><button class="btn btn-fill" onclick="recruitmentCopyPersonalLink()">Copiar link</button></div></div><div class="recruitment-hero-icon">${icon3d('♙','#0f766e')}</div></div>${RECRUITMENT_DATA.paymentSchemaMissing?'<div class="callout warn recruiter-finance-warning">O acompanhamento financeiro ainda não está ativo. A gestão precisa executar <code>deploy/financeiro-recrutadores.sql</code> no Supabase.</div>':''}<div class="grid g4 recruitment-stat-grid">${stat('Cadastros',String(caps.length),'captações ativas','↗','#2563eb')}${stat('Total aprovado',money(totals.approvedValue),'valor reconhecido','✓','#059669')}${stat('Pagamentos parciais',money(totals.received),'repasses recebidos','◐','#0f766e')}${stat('Falta pagar',money(totals.balance),'saldo reservado','R$','#d97706')}</div><section class="card recruitment-section"><div class="card-t">Histórico financeiro das suas captações</div><div class="card-d">O pagamento é liberado depois da aprovação administrativa. Você poderá abrir os comprovantes anexados pela gestão.</div><div class="user-table-scroll"><table><thead><tr><th>Pesquisador</th><th>Status</th><th>Valor aprovado</th><th>Recebido</th><th>Falta pagar</th><th>Pagamento</th><th>Comprovantes</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Ainda não há captações aprovadas registradas.</td></tr>'}</tbody></table></div></section></div>`;
  }

  function parseAmount(value){
    const raw=String(value??'').trim().replace(/[^\d,.-]/g,'');if(!raw)return null;
    const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
    const amount=Number(normalized);return Number.isFinite(amount)&&amount>0?Math.round(amount*100)/100:null;
  }
  function validDate(value){
    const dateValue=String(value||'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(dateValue))return false;
    const parsed=new Date(dateValue+'T00:00:00Z');return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===dateValue;
  }
  function updateLocalCaptureStatus(capture){
    if(!capture)return;
    const balance=captureBalance(capture);
    if(capture.status!=='cancelada')capture.status=balance<=0?'paga':'a_receber';
    if(capture.status==='paga'&&!capture.paid_at)capture.paid_at=new Date().toISOString().slice(0,10);
  }
  async function recruiterRegisterPayment(captureId){
    if(!management())return;
    const capture=captureById(captureId);if(!capture)return;
    if(RECRUITMENT_DATA.paymentSchemaMissing){alert('Execute primeiro a migration deploy/financeiro-recrutadores.sql no Supabase.');return;}
    if(!captureApproved(capture)){alert('Esta captação ainda aguarda a aprovação do cadastro do pesquisador.');return;}
    const balance=captureBalance(capture);if(balance<=0){alert('Esta captação já foi paga integralmente.');return;}
    const amount=parseAmount(prompt('Valor do repasse para '+(capture.candidate_name||'o pesquisador')+' (máximo '+money(balance)+'):',String(balance.toFixed(2)).replace('.',',')));
    if(amount==null){alert('Informe um valor de repasse válido.');return;}
    if(amount>balance){alert('O valor informado ultrapassa o saldo de '+money(balance)+'.');return;}
    const today=new Date().toISOString().slice(0,10);
    const paidAt=prompt('Data do pagamento (AAAA-MM-DD):',today);if(paidAt==null)return;
    if(!validDate(paidAt)){alert('Informe uma data válida no formato AAAA-MM-DD.');return;}
    const note=prompt('Observação ou referência do repasse (opcional):','Repasse de captação — '+paidAt.split('-').reverse().join('/'));if(note==null)return;
    try{
      const {data,error}=await sb.rpc('record_recruiter_payment_receipt',{p_recruiter_capture_id:capture.id,p_amount:amount,p_paid_at:paidAt,p_note:note.trim()||null});
      if(error)throw new Error(error.message);
      const row=Array.isArray(data)?data[0]:data;if(row)RECRUITMENT_DATA.paymentReceipts.unshift(row);
      updateLocalCaptureStatus(capture);
      alert('Repasse registrado. O saldo financeiro foi atualizado.');
      go('recruitment');
    }catch(ex){alert('Não foi possível registrar o repasse. Execute a migration deploy/financeiro-recrutadores.sql no Supabase e tente novamente.');console.error(ex);}
  }
  async function recruiterEditPaymentReceipt(receiptId){
    if(!management())return;
    const receipt=RECRUITMENT_DATA.paymentReceipts.find(r=>r.id===receiptId);if(!receipt)return;
    const current=Number(receipt.amount)||0;
    const amount=parseAmount(prompt('Novo valor deste repasse (valor atual: '+money(current)+'):',String(current.toFixed(2)).replace('.',',')));
    if(amount==null)return;
    if(amount===Math.round(current*100)/100){alert('O novo valor é igual ao valor atual. Nenhuma alteração foi feita.');return;}
    const capture=captureById(receipt.recruiter_capture_id);if(!capture)return;
    if(!captureApproved(capture)){alert('Só é possível corrigir repasses de uma captação aprovada.');return;}
    const other=receivedForCapture(capture.id)-current;
    if(other+amount>captureValue(capture)){alert('O novo valor ultrapassa o total aprovado desta captação.');return;}
    try{
      const {data,error}=await sb.rpc('update_recruiter_payment_receipt_amount',{p_receipt_id:receipt.id,p_amount:amount});
      if(error)throw new Error(error.message);
      const updated=Array.isArray(data)?data[0]:data;if(updated)Object.assign(receipt,updated);else receipt.amount=amount;
      updateLocalCaptureStatus(capture);
      alert('Valor do repasse corrigido. A data, o comprovante e o histórico foram preservados.');
      go('recruitment');
    }catch(ex){alert('Não foi possível alterar o valor do repasse. Execute a migration deploy/financeiro-recrutadores.sql no Supabase e tente novamente.');console.error(ex);}
  }
  function paymentReceiptExtension(file){
    const byType={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    return byType[file?.type]||(String(file?.name||'').match(/\.([a-z0-9]+)$/i)?.[1]||'bin').toLowerCase();
  }
  async function recruiterAttachPaymentReceipt(receiptId){
    if(!management())return;
    const receipt=RECRUITMENT_DATA.paymentReceipts.find(r=>r.id===receiptId);if(!receipt)return;
    const input=document.createElement('input');input.type='file';input.accept='application/pdf,image/jpeg,image/png,image/webp';input.style.display='none';document.body.appendChild(input);
    input.onchange=async()=>{
      const file=input.files?.[0];input.remove();if(!file)return;
      const accepted=/^(application\/pdf|image\/(jpeg|png|webp))$/i.test(file.type)||/\.(pdf|jpe?g|png|webp)$/i.test(file.name||'');
      if(!accepted){alert('Selecione um comprovante em PDF, JPG, PNG ou WebP.');return;}
      if(file.size>10*1024*1024){alert('O comprovante deve ter no máximo 10 MB.');return;}
      const ext=paymentReceiptExtension(file),randomPart=window.crypto?.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2),path='recruiter-receipts/'+receipt.id+'/'+randomPart+'.'+ext;
      try{
        const {error:uploadError}=await sb.storage.from('recruiter-payment-receipts').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
        if(uploadError)throw new Error(uploadError.message);
        const {data,error}=await sb.rpc('attach_recruiter_payment_receipt',{p_receipt_id:receipt.id,p_storage_path:path,p_file_name:file.name||('comprovante.'+ext),p_mime_type:file.type||null,p_file_size:file.size||null});
        if(error)throw new Error(error.message);
        const updated=Array.isArray(data)?data[0]:data;if(updated)Object.assign(receipt,updated);
        alert('Comprovante anexado com segurança.');go('recruitment');
      }catch(ex){await sb.storage.from('recruiter-payment-receipts').remove([path]).catch(()=>{});alert('Não foi possível anexar o comprovante. Execute a migration deploy/financeiro-recrutadores.sql e tente novamente.');console.error(ex);}
    };
    input.click();
  }
  async function recruiterDeletePaymentReceipt(receiptId){
    if(!management())return;
    const receipt=RECRUITMENT_DATA.paymentReceipts.find(r=>r.id===receiptId);if(!receipt?.receipt_path)return;
    if(!confirm('Excluir somente este comprovante? O repasse, o valor, a data e o histórico serão preservados.'))return;
    const storagePath=receipt.receipt_path;
    try{
      const {data,error}=await sb.rpc('detach_recruiter_payment_receipt',{p_receipt_id:receipt.id,p_storage_path:storagePath});
      if(error)throw new Error(error.message);
      const updated=Array.isArray(data)?data[0]:data;if(updated)Object.assign(receipt,updated);else{receipt.receipt_path=null;receipt.receipt_name=null;receipt.receipt_mime_type=null;receipt.receipt_size=null;}
      const {error:storageError}=await sb.storage.from('recruiter-payment-receipts').remove([storagePath]);
      alert(storageError?'Comprovante desvinculado; o arquivo antigo permaneceu no armazenamento.':'Comprovante excluído. O repasse foi preservado.');go('recruitment');
    }catch(ex){alert('Não foi possível excluir o comprovante. Execute a migration deploy/financeiro-recrutadores.sql e tente novamente.');console.error(ex);}
  }
  async function recruiterPaymentReceiptSignedUrl(receipt){
    if(!receipt?.receipt_path)throw new Error('Comprovante ainda não anexado.');
    const {data,error}=await sb.storage.from('recruiter-payment-receipts').createSignedUrl(receipt.receipt_path,600);
    if(error||!data?.signedUrl)throw new Error(error?.message||'URL temporária indisponível.');
    return data.signedUrl;
  }
  async function recruiterPaymentReceiptOpen(receiptId){
    const receipt=RECRUITMENT_DATA.paymentReceipts.find(r=>r.id===receiptId);if(!receipt)return;
    const popup=window.open('about:blank','_blank','noopener');
    try{const url=await recruiterPaymentReceiptSignedUrl(receipt);if(popup)popup.location.href=url;else window.open(url,'_blank','noopener');}
    catch(ex){if(popup)popup.close();alert('Não foi possível abrir o comprovante. Verifique a migration e o bucket privado.');console.error(ex);}
  }
  async function recruiterPaymentReceiptDownload(receiptId){
    const receipt=RECRUITMENT_DATA.paymentReceipts.find(r=>r.id===receiptId);if(!receipt)return;
    try{const response=await fetch(await recruiterPaymentReceiptSignedUrl(receipt));if(!response.ok)throw new Error('download HTTP '+response.status);const blob=await response.blob(),objectUrl=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectUrl;link.download=paymentReceiptFileName(receipt.receipt_name||receipt.receipt_path);link.style.display='none';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);}
    catch(ex){alert('Não foi possível baixar o comprovante. Verifique o bucket privado.');console.error(ex);}
  }

  PAGES.recruitment=()=>{if(!roleAllowed())return head('Recrutamento','Área restrita')+'<div class="callout warn">Seu perfil não possui acesso a esta área.</div>';return management()?managementPage():personalPage();};
  window.recruitmentOpenFinance=function(id){if(!management())return;RECRUITMENT_FINANCE_RECRUITER_ID=id;go('recruitment');setTimeout(()=>document.getElementById('recruiter-finance-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),40);};
  window.recruitmentCloseFinance=function(){RECRUITMENT_FINANCE_RECRUITER_ID=null;go('recruitment');};
  window.recruitmentReload=function(){RECRUITMENT_LOADED=false;RECRUITMENT_DATA={recruiters:[],signups:[],captures:[],referrals:[],paymentReceipts:[],referralSchemaMissing:false,paymentSchemaMissing:false};loadRecruitment();go('recruitment');};
  window.recruitmentRefreshQrs=renderRecruitmentQrs;
  window.recruitmentCopyLink=function(id){const r=recruiterById(id);if(!r)return;const link=recruiterLink(r);navigator.clipboard?.writeText(link).then(()=>alert('Link copiado.')).catch(()=>window.prompt('Copie o link do recrutador:',link));};
  window.recruitmentCopyPersonalLink=function(){const link=recruiterLink({recruiter_code:CURRENT_PROFILE?.recruiter_code||CURRENT_PROFILE?.recruiterCode});navigator.clipboard?.writeText(link).then(()=>alert('Link copiado.')).catch(()=>window.prompt('Copie o link:',link));};
  window.recruitmentShare=function(id){const r=recruiterById(id);if(!r)return;const link=recruiterLink(r);const msg='Olá! Este é o link de cadastro do recrutador '+r.name+' na PesquisaPro: '+link;window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');};
  window.recruitmentNotifySignup=function(id){const s=RECRUITMENT_DATA.signups.find(x=>x.id===id);if(!s)return;const r=recruiterById(s.recruiter_id);const msg='Novo cadastro de pesquisador via recrutador.\n\nNome: '+s.name+'\nCidade: '+(s.cidade||'não informada')+'\nRecrutador: '+(r?.name||s.recruiter_code||'não identificado')+'\nStatus: '+(s.status||'novo')+'\n\nAcesse o painel PesquisaPro para revisar.';window.open('https://wa.me/'+BUSINESS_WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener');};
  window.recruitmentNotifyReferral=function(id){const referral=RECRUITMENT_DATA.referrals.find(x=>x.id===id);if(!referral)return;const msg='Indicação de pesquisador na PesquisaPro.\n\nQuem indicou: '+(referral.referrer_name||'não identificado')+'\nPessoa indicada: '+(referral.referred_name||'')+'\nWhatsApp: '+(referral.referred_phone||'não informado')+'\nCidade: '+(referral.referred_city||'não informada')+'\nStatus: '+(referral.status||'link_gerado')+'\n\nAcesse o painel PesquisaPro para acompanhar.';window.open('https://wa.me/'+BUSINESS_WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener');};
  window.recruitmentRegisterPayment=recruiterRegisterPayment;
  window.recruiterEditPaymentReceipt=recruiterEditPaymentReceipt;
  window.recruiterAttachPaymentReceipt=recruiterAttachPaymentReceipt;
  window.recruiterDeletePaymentReceipt=recruiterDeletePaymentReceipt;
  window.recruiterPaymentReceiptOpen=recruiterPaymentReceiptOpen;
  window.recruiterPaymentReceiptDownload=recruiterPaymentReceiptDownload;
  function renderRecruitmentQrs(){
    if(!management()||!RECRUITMENT_LOADED)return;
    const boxes=document.querySelectorAll('.recruiter-qr[data-recruiter-id]');if(!boxes.length)return;
    const draw=()=>{if(typeof QRCode==='undefined')return false;boxes.forEach(box=>{const r=recruiterById(box.dataset.recruiterId);if(!r)return;box.innerHTML='';try{new QRCode(box,{text:recruiterLink(r),width:124,height:124,colorDark:'#0f172a',colorLight:'#ffffff'});}catch(e){box.innerHTML='<span>QR indisponível</span>';}});return true;};
    if(draw())return;
    boxes.forEach(b=>b.innerHTML='<span>Carregando QR…</span>');
    loadLocalAsset('qrcode').then(draw).catch(()=>boxes.forEach(b=>b.innerHTML='<span>QR indisponível offline</span>'));
  }
  const previousAfterRender=window._afterRender;
  window._afterRender=function(key){if(typeof previousAfterRender==='function')previousAfterRender(key);if(key==='recruitment')setTimeout(renderRecruitmentQrs,0);};
  if(typeof CURRENT_PROFILE!=='undefined'&&CURRENT_PROFILE&&['admin','admpro','recrutador'].includes(CURRENT_PROFILE.role))setTimeout(()=>{if(PAGES.recruitment&&document.getElementById('main')&&!document.getElementById('main').innerHTML.includes('recruiter-grid'))go('recruitment');},0);
})();
