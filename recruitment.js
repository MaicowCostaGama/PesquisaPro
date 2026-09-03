/* ============================================================
   RECRUTAMENTO — links, QR Codes, ranking e captações
   ------------------------------------------------------------
   O cadastro público usa a RPC submit_recruiter_signup. Sem API do
   WhatsApp, a notificação abre uma mensagem pronta para envio manual.
   ============================================================ */
(function(){
  const PUBLIC_ORIGIN=()=>{
    const origin=window.location.origin;
    return origin&&origin!=='null'&&!origin.startsWith('file:')?origin:'https://pesquisa-pro.vercel.app';
  };
  const BUSINESS_WHATSAPP='553996683030';
  let RECRUITMENT_LOADED=false;
  let RECRUITMENT_LOADING=false;
  let RECRUITMENT_DATA={recruiters:[],signups:[],captures:[]};
  let RECRUITMENT_PROMISE=null;

  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const date=v=>v?new Date(v).toLocaleDateString('pt-BR'):'—';
  const roleAllowed=()=>['admin','admpro','recrutador'].includes(selectedRole);
  const management=()=>['admin','admpro'].includes(selectedRole);
  const recruiterLink=r=>PUBLIC_ORIGIN()+'/cadastro.html?recrutador='+encodeURIComponent(r.recruiter_code||r.id||'');
  const recruiterById=id=>RECRUITMENT_DATA.recruiters.find(r=>r.id===id);
  const countsFor=id=>{
    const signups=RECRUITMENT_DATA.signups.filter(s=>s.recruiter_id===id);
    const caps=RECRUITMENT_DATA.captures.filter(c=>c.recruiter_id===id);
    const approved=signups.filter(s=>s.status==='aprovado').length;
    const pending=signups.filter(s=>['novo','diligencia'].includes(s.status)).length;
    const rejected=signups.filter(s=>s.status==='reprovado').length;
    const due=caps.filter(c=>['a_receber','pendente'].includes(c.status)).reduce((n,c)=>n+Number(c.capture_value||0),0);
    const paid=caps.filter(c=>c.status==='paga').reduce((n,c)=>n+Number(c.capture_value||0),0);
    return {total:signups.length,approved,pending,rejected,due,paid,captures:caps};
  };
  const signupStatus=s=>({novo:'<span class="pill pill-blue">● Novo</span>',diligencia:'<span class="pill pill-amber">● Em diligência</span>',aprovado:'<span class="pill pill-green">● Aprovado</span>',reprovado:'<span class="pill pill-red">● Reprovado</span>'}[s]||s||'—');
  const captureStatus=s=>({pendente:'<span class="pill pill-amber">Pendente</span>',a_receber:'<span class="pill pill-blue">A receber</span>',paga:'<span class="pill pill-green">Paga</span>',cancelada:'<span class="pill pill-red">Cancelada</span>'}[s]||s||'—');

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
        const [r,s,c]=await Promise.all([recruiterQuery,signupQuery,captureQuery]);
        const err=[r,s,c].find(x=>x&&x.error);
        if(err)throw new Error(err.error.message);
        RECRUITMENT_DATA={recruiters:r.data||[],signups:s.data||[],captures:c.data||[]};
        RECRUITMENT_LOADED=true;
      }catch(ex){
        console.error('Erro ao carregar recrutamento:',ex);
        RECRUITMENT_DATA={recruiters:[],signups:[],captures:[],error:ex.message};
      }finally{
        RECRUITMENT_LOADING=false;
        RECRUITMENT_PROMISE=null;
        const key=document.querySelector('.nav-item.on')?.dataset.key;
        if(key==='recruitment')go('recruitment');
      }
    })();
    return RECRUITMENT_PROMISE;
  }

  function managementPage(){
    if(!RECRUITMENT_LOADED){loadRecruitment();return head('Recrutamento','Links, QR Codes e desempenho de captação')+'<div class="card"><div class="empty">Carregando recrutadores e captações…</div></div>';}
    if(RECRUITMENT_DATA.error)return head('Recrutamento','Links, QR Codes e desempenho de captação')+'<div class="callout warn">Não foi possível carregar o módulo. Execute a migration <b>deploy/recrutamento.sql</b> no Supabase e tente novamente.<br><small>'+esc(RECRUITMENT_DATA.error)+'</small></div>';
    const recruiters=RECRUITMENT_DATA.recruiters;
    const total=RECRUITMENT_DATA.signups.length;
    const approved=RECRUITMENT_DATA.signups.filter(s=>s.status==='aprovado').length;
    const pending=RECRUITMENT_DATA.signups.filter(s=>['novo','diligencia'].includes(s.status)).length;
    const due=RECRUITMENT_DATA.captures.filter(c=>['pendente','a_receber'].includes(c.status)).reduce((n,c)=>n+Number(c.capture_value||0),0);
    const sorted=recruiters.slice().sort((a,b)=>{
      const ca=countsFor(a.id),cb=countsFor(b.id);
      return (cb.approved-ca.approved)||(cb.total-ca.total)||(cb.due-ca.due);
    });
    const cards=sorted.length?sorted.map((r,rank)=>{
      const c=countsFor(r.id);
      const initials=initialsOf(r.name);
      return `<article class="recruiter-card">
        <div class="recruiter-card-top"><div class="avatar recruiter-avatar">${esc(initials)}</div><div class="recruiter-card-name"><strong>${esc(r.name)}</strong><span>${r.status==='ativo'?'<span class="pill pill-green">Ativo</span>':'<span class="pill pill-amber">Pendente</span>'} <span class="recruiter-rank">#${rank+1}</span></span></div><button class="btn-ghost" title="Conversar com recrutador" onclick="clientWhatsAppMsg(${jsArg(r.phone||'')},${jsArg('Olá '+r.name+'! Temos uma atualização sobre suas captações no PesquisaPro.')})">${icon3d('☏','#0f766e')}</button></div>
        <div class="recruiter-link-row"><code>${esc(r.recruiter_code||'sem código')}</code><button class="btn-ghost" onclick="recruitmentCopyLink(${jsArg(r.id)})">Copiar link</button></div>
        <div class="recruiter-qr-layout"><div class="recruiter-qr" id="recruiter-qr-${esc(r.id)}" data-recruiter-id="${esc(r.id)}"></div><div class="recruiter-card-actions"><button class="btn btn-fill" onclick="recruitmentShare(${jsArg(r.id)})">Compartilhar link</button><button class="btn btn-out" onclick="recruitmentCopyLink(${jsArg(r.id)})">Copiar convite</button><small>Valor por aprovado: <b>${money(r.recruiter_capture_value)}</b></small></div></div>
        <div class="recruiter-metrics"><div><b>${c.total}</b><span>cadastros</span></div><div><b>${c.approved}</b><span>aprovados</span></div><div><b>${c.pending}</b><span>pendentes</span></div><div><b>${money(c.due)}</b><span>a pagar</span></div></div>
      </article>`;
    }).join(''):'<div class="empty">Nenhum perfil com papel Recrutador. Cadastre em Usuários → Recrutadores.</div>';
    const signupRows=RECRUITMENT_DATA.signups.slice(0,12).map(s=>{
      const r=recruiterById(s.recruiter_id);
      return `<tr><td><b>${esc(s.name)}</b><div class="table-sub">${esc(s.email||'')} · ${esc(s.cidade||'')}</div></td><td>${esc(r?.name||s.recruiter_code||'—')}</td><td>${signupStatus(s.status)}</td><td>${date(s.sent_at)}</td><td><button class="btn-ghost" onclick="recruitmentNotifySignup(${jsArg(s.id)})">WhatsApp</button></td></tr>`;
    }).join('');
    return `<div class="recruitment-page">${head('Recrutamento','Capte pesquisadores por link, QR Code e acompanhe quem mais trouxe cadastros',`<button class="btn btn-out" onclick="go('users');setTimeout(()=>userSetTab('recrutador'),0)">Gerenciar perfis</button><button class="btn btn-fill" onclick="go('users');setTimeout(()=>{userSetTab('recrutador');userOpen('new')},0)">＋ Novo recrutador</button>`)}
      <div class="recruitment-hero"><div><span class="eyebrow">CENTRAL DE CAPTAÇÃO</span><h2>Transforme cada recrutador em um canal rastreável</h2><p>Crie um link individual, compartilhe por WhatsApp e saiba quantos pesquisadores cada parceiro trouxe.</p></div><div class="recruitment-hero-icon">${icon3d('♙','#0f766e')}</div></div>
      <div class="grid g4 recruitment-stat-grid">${stat('Recrutadores',String(recruiters.length),'perfis ativos e cadastrados','♙','#0f766e')}${stat('Cadastros captados',String(total),'atribuídos a um link','↗','#2563eb')}${stat('Aprovados',String(approved),'liberados para atuar','✓','#059669')}${stat('A pagar',money(due),'captações aprovadas','R$','#d97706')}</div>
      <section class="card recruitment-section"><div class="section-heading"><div><div class="card-t">Ranking de captação</div><div class="card-d">Ordenado por pesquisadores aprovados, depois por volume total de cadastros.</div></div><button class="btn btn-out" onclick="recruitmentReload()">Atualizar dados</button></div><div class="recruiter-grid">${cards}</div></section>
      <section class="card recruitment-section"><div class="section-heading"><div><div class="card-t">Últimos cadastros por recrutador</div><div class="card-d">A notificação abaixo abre o WhatsApp com a mensagem pronta para o número Business configurado.</div></div><span class="pill pill-blue">${pending} pendentes</span></div><div class="user-table-scroll"><table><thead><tr><th>Pesquisador</th><th>Recrutador</th><th>Status</th><th>Entrada</th><th></th></tr></thead><tbody>${signupRows||'<tr><td colspan="5" class="empty">Nenhum cadastro atribuído a recrutador ainda.</td></tr>'}</tbody></table></div></section>
      <div class="callout recruitment-notice">Sem API do WhatsApp, o sistema registra a captação automaticamente e abre o WhatsApp com a mensagem preenchida. O envio final depende do clique em <b>Enviar</b> no aplicativo.</div>
    </div>`;
  }

  function personalPage(){
    if(!RECRUITMENT_LOADED){loadRecruitment();return head('Minhas captações','Acompanhe seus pesquisadores indicados')+'<div class="card"><div class="empty">Carregando seus resultados…</div></div>';}
    const id=CURRENT_PROFILE?.id;
    const r=CURRENT_PROFILE||{};
    const caps=RECRUITMENT_DATA.captures.filter(c=>c.recruiter_id===id);
    const total=caps.length, approved=caps.filter(c=>['a_receber','paga'].includes(c.status)).length, due=caps.filter(c=>['pendente','a_receber'].includes(c.status)).reduce((n,c)=>n+Number(c.capture_value||0),0), paid=caps.filter(c=>c.status==='paga').reduce((n,c)=>n+Number(c.capture_value||0),0);
    const rows=caps.map(c=>`<tr><td><b>${esc(c.candidate_name||'Pesquisador cadastrado')}</b><div class="table-sub">${esc(c.candidate_city||'')} · ${date(c.created_at)}</div></td><td>${captureStatus(c.status)}</td><td>${money(c.capture_value)}</td><td>${c.paid_at?date(c.paid_at):'—'}</td></tr>`).join('');
    return `<div class="recruitment-page recruiter-personal-page">${head('Minhas captações','Acompanhe os pesquisadores que entraram pelo seu link')}
      <div class="recruitment-hero"><div><span class="eyebrow">MEU CANAL</span><h2>${esc(r.name||'Recrutador')}</h2><p>Compartilhe seu link exclusivo e acompanhe o reconhecimento de cada captação aprovada.</p><div class="recruiter-personal-link"><code>${esc(recruiterLink({recruiter_code:r.recruiterCode}))}</code><button class="btn btn-fill" onclick="recruitmentCopyPersonalLink()">Copiar link</button></div></div><div class="recruitment-hero-icon">${icon3d('♙','#0f766e')}</div></div>
      <div class="grid g4 recruitment-stat-grid">${stat('Cadastros',String(total),'pesquisadores que entraram pelo link','↗','#2563eb')}${stat('Aprovados',String(approved),'captações reconhecidas','✓','#059669')}${stat('A receber',money(due),'valor reservado','R$','#d97706')}${stat('Já pagas',money(paid),'valor quitado','✓','#0f766e')}</div>
      <section class="card recruitment-section"><div class="card-t">Histórico das suas captações</div><div class="card-d">O valor é reconhecido após a aprovação administrativa do pesquisador.</div><div class="user-table-scroll"><table><thead><tr><th>Pesquisador</th><th>Status</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">Ainda não há captações registradas.</td></tr>'}</tbody></table></div></section>
    </div>`;
  }

  PAGES.recruitment=()=>{if(!roleAllowed())return head('Recrutamento','Área restrita')+'<div class="callout warn">Seu perfil não possui acesso a esta área.</div>';return management()?managementPage():personalPage();};
  window.recruitmentLink=recruiterLink;
  window.recruitmentReload=function(){RECRUITMENT_LOADED=false;RECRUITMENT_DATA={recruiters:[],signups:[],captures:[]};loadRecruitment();go('recruitment');};
  window.recruitmentRefreshQrs=renderRecruitmentQrs;
  window.recruitmentCopyLink=function(id){const r=recruiterById(id);if(!r)return;const link=recruiterLink(r);navigator.clipboard?.writeText(link).then(()=>alert('Link copiado.')).catch(()=>window.prompt('Copie o link do recrutador:',link));};
  window.recruitmentCopyPersonalLink=function(){const link=recruiterLink({recruiter_code:CURRENT_PROFILE?.recruiterCode});navigator.clipboard?.writeText(link).then(()=>alert('Link copiado.')).catch(()=>window.prompt('Copie o link:',link));};
  window.recruitmentShare=function(id){const r=recruiterById(id);if(!r)return;const link=recruiterLink(r);const msg='Olá! Este é o link de cadastro do recrutador '+r.name+' na PesquisaPro: '+link;window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');};
  window.recruitmentNotifySignup=function(id){const s=RECRUITMENT_DATA.signups.find(x=>x.id===id);if(!s)return;const r=recruiterById(s.recruiter_id);const msg='Novo cadastro de pesquisador via recrutador.\n\nNome: '+s.name+'\nCidade: '+(s.cidade||'não informada')+'\nRecrutador: '+(r?.name||s.recruiter_code||'não identificado')+'\nStatus: '+(s.status||'novo')+'\n\nAcesse o painel PesquisaPro para revisar.';window.open('https://wa.me/'+BUSINESS_WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener');};
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
