/* ============================================================
   BRINDES POR INDICAÇÃO — campanhas auditáveis por cidade
   ------------------------------------------------------------
   A regra de elegibilidade e o sorteio ficam no Supabase, por RPC.
   O frontend não escolhe ganhadores nem recebe a lista completa para
   pesquisadores; apenas a gestão vê candidatos e resultados.
   ============================================================ */
(function(){
  const state={loaded:false,loading:false,campaigns:[],candidates:{},candidateLoading:{},schemaMissing:false,error:null};
  const management=()=>['admin','admpro'].includes(selectedRole);
  const schemaError=error=>/referral_reward_campaigns|referral_reward_entries|list_referral_reward_campaigns|schema cache|does not exist|relation .* does not exist|PGRST202|42883/i.test(String(error?.message||error||''));
  const dateTime=value=>{
    if(!value)return '—';
    const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  };
  const dateOnly=value=>{
    if(!value)return '—';
    const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString('pt-BR');
  };
  const campaignStatus=status=>({aberta:'<span class="pill pill-green">Aberta</span>',encerrada:'<span class="pill pill-amber">Encerrada</span>',sorteada:'<span class="pill pill-blue">Sorteada</span>',cancelada:'<span class="pill pill-gray">Cancelada</span>'}[status]||'<span class="pill pill-gray">—</span>');
  const campaignPeriod=c=>`${dateTime(c.starts_at)} até ${dateTime(c.ends_at)}`;
  const refreshCurrent=()=>{
    const key=document.querySelector('.nav-item.on')?.dataset.key;
    if(key==='referral-rewards'||key==='researcher-profile')go(key);
  };
  const rpcError=(error,fallback)=>{
    if(error&&schemaError(error))state.schemaMissing=true;
    return error?.message||fallback;
  };

  async function load(force=false){
    if(state.loading)return state.promise;
    if(state.loaded&&!force)return state.campaigns;
    state.loading=true;state.error=null;
    state.promise=(async()=>{
      try{
        const {data,error}=await sb.rpc('list_referral_reward_campaigns');
        if(error)throw error;
        state.campaigns=data||[];state.loaded=true;state.schemaMissing=false;
      }catch(error){
        state.campaigns=[];state.error=rpcError(error,'Não foi possível carregar as campanhas de brindes.');
      }finally{
        state.loading=false;state.promise=null;refreshCurrent();
      }
      return state.campaigns;
    })();
    return state.promise;
  }

  async function createCampaign(){
    if(!management())return;
    const value=id=>(document.getElementById(id)?.value||'').trim();
    const name=value('referral-reward-name');
    const prize=value('referral-reward-prize');
    const cities=value('referral-reward-cities').split(',').map(city=>city.trim()).filter(Boolean);
    const starts=value('referral-reward-start');
    const ends=value('referral-reward-end');
    const winners=Number(document.getElementById('referral-reward-winners')?.value||1);
    if(!name||!prize||!cities.length||!starts||!ends){alert('Preencha nome, brinde, cidades, início e término da campanha.');return;}
    const startDate=new Date(starts),endDate=new Date(ends);
    if(Number.isNaN(startDate.getTime())||Number.isNaN(endDate.getTime())||endDate<=startDate){alert('Confira o período: o término precisa ser posterior ao início.');return;}
    if(!Number.isInteger(winners)||winners<1||winners>100){alert('Informe de 1 a 100 ganhadores.');return;}
    if(!confirm('Criar esta campanha de brindes? As cidades e o período ficarão registrados para auditoria.'))return;
    try{
      const {data,error}=await sb.rpc('create_referral_reward_campaign',{
        p_name:name,p_prize_description:prize,p_target_cities:cities,
        p_starts_at:startDate.toISOString(),p_ends_at:endDate.toISOString(),p_winner_count:winners
      });
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;if(row)state.campaigns.unshift(row);
      state.loaded=true;alert('Campanha criada. O sistema contabilizará apenas indicações aprovadas nas cidades configuradas.');refreshCurrent();
    }catch(error){alert(rpcError(error,'Não foi possível criar a campanha.'));console.error(error);refreshCurrent();}
  }

  async function loadCandidates(campaignId){
    if(state.candidateLoading[campaignId])return;
    state.candidateLoading[campaignId]=true;refreshCurrent();
    try{
      const {data,error}=await sb.rpc('get_referral_reward_candidates',{p_campaign_id:campaignId});
      if(error)throw error;
      state.candidates[campaignId]=data||[];
    }catch(error){
      alert(rpcError(error,'Não foi possível carregar os elegíveis.'));console.error(error);
    }finally{state.candidateLoading[campaignId]=false;refreshCurrent();}
  }

  async function drawCampaign(campaignId){
    if(!management())return;
    const campaign=state.campaigns.find(item=>item.id===campaignId);if(!campaign)return;
    if(campaign.status!=='aberta'){alert('Esta campanha não está aberta para sorteio.');return;}
    if(new Date(campaign.ends_at)>new Date()){alert('O período da campanha ainda não terminou. O sorteio será liberado após '+dateTime(campaign.ends_at)+'.');return;}
    const expected=Number(campaign.eligible_count||0);
    const message='O sorteio é definitivo e será registrado com lista de elegíveis, compromisso criptográfico e semente auditável.\n\nBrinde: '+campaign.prize_description+'\nGanhadores: '+campaign.winner_count+(expected?'\nElegíveis registrados anteriormente: '+expected:'')+'\n\nDeseja sortear agora?';
    if(!confirm(message))return;
    try{
      const {data,error}=await sb.rpc('draw_referral_reward_campaign',{p_campaign_id:campaignId});
      if(error)throw error;
      const winners=data||[];
      const local=state.campaigns.find(item=>item.id===campaignId);
      if(local){local.status='sorteada';local.drawn_at=new Date().toISOString();local.eligible_count=Number(local.eligible_count||0)||undefined;}
      await load(true);
      await loadCandidates(campaignId);
      alert(winners.length?'Sorteio concluído. Ganhadores: '+winners.map(row=>row.referrer_name+' (indicou '+row.referred_name+')').join('; '):'Sorteio concluído, mas não houve ganhadores.');
    }catch(error){alert(rpcError(error,'Não foi possível realizar o sorteio.'));console.error(error);refreshCurrent();}
  }

  function candidatePanel(campaign){
    const rows=state.candidates[campaign.id];
    if(!rows)return '';
    const winners=rows.filter(row=>row.is_winner);
    const body=rows.length?rows.map(row=>`<tr class="${row.is_winner?'referral-reward-winner-row':''}"><td>${row.is_winner?`<strong>#${esc(row.winner_rank)}</strong>`:'—'}</td><td><b>${esc(row.referrer_name||'—')}</b><div class="table-sub">${esc(row.referrer_id||'')}</div></td><td>${esc(row.referred_name||'—')}</td><td>${esc(row.referred_city||'—')}</td><td>${row.is_winner?'<span class="pill pill-green">Ganhador</span>':'<span class="pill pill-gray">Elegível</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nenhuma indicação aprovada atende às regras desta campanha.</td></tr>';
    const commitment=campaign.draw_commitment?`<div class="callout referral-reward-audit"><b>Auditoria do sorteio</b><br>Compromisso: <code>${esc(campaign.draw_commitment)}</code><br>Semente: <code>${esc(campaign.draw_seed||'oculta')}</code></div>`:'';
    return `<section class="referral-reward-candidates"><div class="section-heading"><div><div class="card-t">${campaign.status==='sorteada'?'Resultado e auditoria':'Elegíveis atuais'} · ${esc(campaign.name)}</div><div class="card-d">${rows.length} entrada(s) encontrada(s)${winners.length?' · '+winners.length+' ganhador(es)':''}.</div></div><button type="button" class="btn btn-out" onclick="referralRewardsCloseCandidates('${esc(campaign.id)}')">Fechar</button></div>${commitment}<div class="user-table-scroll"><table><thead><tr><th>Posição</th><th>Pesquisador que indicou</th><th>Novo pesquisador</th><th>Cidade</th><th>Situação</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
  }

  function campaignCard(campaign){
    const ended=new Date(campaign.ends_at)<=new Date();
    const loaded=Object.prototype.hasOwnProperty.call(state.candidates,campaign.id);
    const loading=!!state.candidateLoading[campaign.id];
    const myCount=Number(campaign.my_eligible_count||0);
    const mine=campaign.my_winner_rank?`<span class="pill pill-green">Você ganhou em #${esc(campaign.my_winner_rank)}</span>`:myCount?`<span class="pill pill-blue">${myCount} entrada(s) sua(s)</span>`:'<span class="pill pill-gray">Sem entrada elegível ainda</span>';
    const adminActions=management()?`<div class="referral-reward-card-actions"><button type="button" class="btn btn-out" onclick="referralRewardsLoadCandidates('${esc(campaign.id)}')">${loading?'Carregando…':campaign.status==='sorteada'?'Ver resultado':'Ver elegíveis'}</button>${campaign.status==='aberta'&&ended?`<button type="button" class="btn btn-fill" onclick="referralRewardsDraw('${esc(campaign.id)}')">Sortear ganhadores</button>`:''}</div>`:'';
    return `<article class="referral-reward-card"><div class="referral-reward-card-top"><div><span class="eyebrow">CAMPANHA DE INDICAÇÃO</span><h3>${esc(campaign.name)}</h3></div><div>${campaignStatus(campaign.status)}</div></div><div class="referral-reward-prize"><span>Brinde</span><strong>${esc(campaign.prize_description)}</strong></div><div class="referral-reward-meta"><span><b>Cidades</b>${esc((campaign.target_cities||[]).join(' · '))}</span><span><b>Período</b>${esc(campaignPeriod(campaign))}</span><span><b>Ganhadores</b>${esc(campaign.winner_count)}</span>${management()?`<span><b>Elegíveis</b>${campaign.eligible_count==null?'A conferir':esc(campaign.eligible_count)}</span>`:`<span><b>Suas chances</b>${mine}</span>`}</div>${management()?adminActions:`<div class="referral-reward-researcher-status">${mine}<small>Conta uma entrada quando a pessoa indicada é aprovada, vinculada ao seu perfil e está em uma cidade desta campanha.</small></div>`}${loaded?candidatePanel(campaign):''}</article>`;
  }

  function formMarkup(){
    return `<section class="card referral-reward-create"><div class="section-heading"><div><div class="card-t">Criar campanha</div><div class="card-d">Defina onde você precisa de novos pesquisadores. A cidade deve ser informada no mesmo formato usado na indicação, por exemplo: Belo Horizonte/MG.</div></div><span class="pill pill-blue">Sorteio auditável</span></div><div class="field-row mb"><div><label class="lbl" for="referral-reward-name">Nome da campanha *</label><input class="inp" id="referral-reward-name" maxlength="140" placeholder="Ex.: Campanha de expansão regional"></div><div><label class="lbl" for="referral-reward-prize">Brinde *</label><input class="inp" id="referral-reward-prize" maxlength="600" placeholder="Ex.: Vale-presente de R$ 100"></div></div><div class="mb"><label class="lbl" for="referral-reward-cities">Cidades-alvo *</label><input class="inp" id="referral-reward-cities" placeholder="Belo Horizonte/MG, São João del Rei/MG"><small class="field-hint">Separe várias cidades por vírgula.</small></div><div class="field-row mb"><div><label class="lbl" for="referral-reward-start">Começa em *</label><input class="inp" id="referral-reward-start" type="datetime-local"></div><div><label class="lbl" for="referral-reward-end">Termina em *</label><input class="inp" id="referral-reward-end" type="datetime-local"></div></div><div class="field-row mb"><div><label class="lbl" for="referral-reward-winners">Quantidade de ganhadores *</label><input class="inp" id="referral-reward-winners" type="number" min="1" max="100" value="1"></div><div class="referral-reward-rule"><b>Regra padrão</b><span>1 entrada por novo pesquisador aprovado indicado na cidade-alvo.</span></div></div><button type="button" class="btn btn-fill" onclick="createReferralRewardCampaign()">＋ Criar campanha de brindes</button></section>`;
  }

  function managementPage(){
    if(!management())return head('Brindes por indicação','Área disponível apenas para a gestão')+'<div class="empty">Este recurso está disponível para administradores.</div>';
    if(state.schemaMissing)return head('Brindes por indicação','Campanhas para ampliar a equipe em cidades prioritárias')+'<div class="callout warn">Esta área ainda não está habilitada no banco. Execute a migration <code>deploy/premios-indicacoes-pesquisadores.sql</code> depois de <code>deploy/indicacao-pesquisador.sql</code>.</div>';
    if(state.error)return head('Brindes por indicação','Campanhas para ampliar a equipe em cidades prioritárias',`<button type="button" class="btn btn-out" onclick="referralRewardsReload()">Tentar novamente</button>`)+`<div class="callout warn">Não foi possível carregar as campanhas agora. <small>${esc(state.error)}</small></div>`;
    if(!state.loaded){load();return head('Brindes por indicação','Campanhas para ampliar a equipe em cidades prioritárias')+'<div class="card"><div class="empty">Carregando campanhas e regras de elegibilidade…</div></div>';}
    const cards=state.campaigns.length?state.campaigns.map(campaignCard).join(''):'<div class="empty">Nenhuma campanha criada. Configure a primeira campanha abaixo.</div>';
    return `<div class="referral-rewards-page">${head('Brindes por indicação','Incentive pesquisadores a indicar novos pesquisadores nas cidades em que você precisa de cobertura',`<button type="button" class="btn btn-out" onclick="referralRewardsReload()">↻ Atualizar</button>`)}${formMarkup()}<section class="card referral-reward-list-section"><div class="section-heading"><div><div class="card-t">Campanhas cadastradas</div><div class="card-d">O sistema não sorteia por ordem de cadastro. Ao final do período, a RPC registra os elegíveis, gera uma seleção criptográfica e grava o resultado.</div></div><span class="pill pill-blue">${state.campaigns.length} campanha(s)</span></div><div class="referral-reward-list">${cards}</div></section></div>`;
  }

  function researcherMarkup(){
    if(!CURRENT_PROFILE||CURRENT_PROFILE.role!=='pesq')return '';
    if(state.schemaMissing)return '<section class="card mb referral-reward-researcher-card"><div class="card-t">Campanhas de brindes por indicação</div><div class="callout warn" style="margin-top:10px">As campanhas ainda não estão habilitadas no banco.</div></section>';
    if(state.error)return `<section class="card mb referral-reward-researcher-card"><div class="card-t">Campanhas de brindes por indicação</div><div class="callout warn" style="margin-top:10px">Não foi possível carregar suas chances agora. Tente atualizar a página.</div></section>`;
    if(!state.loaded)return '<section class="card mb referral-reward-researcher-card"><div class="card-t">Campanhas de brindes por indicação</div><div class="empty" style="margin-top:12px">Carregando suas chances…</div></section>';
    const campaigns=state.campaigns.filter(c=>c.status!=='cancelada');
    const cards=campaigns.length?campaigns.map(campaignCard).join(''):'<div class="empty">No momento não há campanha de brindes ativa.</div>';
    return `<section class="card mb referral-reward-researcher-card"><div class="section-heading"><div><div class="card-t">Campanhas de brindes por indicação</div><div class="card-d">Indique pessoas nas cidades prioritárias e acompanhe aqui suas entradas e eventuais resultados.</div></div><span class="pill pill-blue">${campaigns.length} campanha(s)</span></div><div class="referral-reward-list">${cards}</div></section>`;
  }

  function reset(){state.loaded=false;state.loading=false;state.campaigns=[];state.candidates={};state.candidateLoading={};state.schemaMissing=false;state.error=null;state.promise=null;}
  window.PP_REFERRAL_REWARDS={load,reset,state:()=>({...state,candidates:{...state.candidates}}),researcherMarkup};
  window.createReferralRewardCampaign=createCampaign;
  window.referralRewardsReload=()=>{load(true);};
  window.referralRewardsLoadCandidates=id=>loadCandidates(id);
  window.referralRewardsCloseCandidates=id=>{delete state.candidates[id];refreshCurrent();};
  window.referralRewardsDraw=id=>drawCampaign(id);
  if(typeof PAGES!=='undefined')PAGES['referral-rewards']=managementPage;
})();
