/* Resumos de navegação são somente leitura. As ações legadas continuam usando
   exclusivamente o store completo validado, nunca um objeto de resumo. */
(function(){
  'use strict';
  const ROUTES=['dashboard','surveys','surveys-done','surveys-archived'];
  const STAFF=['admin','admpro','coord','gerente'];
  const pendingViews=new Map();
  let actionOwner=null;
  let chart=null;
  const data=()=>window.PP_ADMIN_NAV_DATA;
  function enabled(){return !!data()&&STAFF.includes(CURRENT_PROFILE?.role);}
  function route(){return document.querySelector('.nav-item.on')?.dataset.key;}
  function ensure(name){
    const operation=data().ensure(name);
    if(data().state(name).status!=='loading'||pendingViews.get(name)?.operation===operation)return;
    const request={operation,profile:CURRENT_PROFILE,epoch:APP_DATA_SESSION_EPOCH};
    pendingViews.set(name,request);
    Promise.resolve(operation).then(()=>{
      if(pendingViews.get(name)!==request)return;
      pendingViews.delete(name);
      if(CURRENT_PROFILE!==request.profile||APP_DATA_SESSION_EPOCH!==request.epoch)return;
      const key=route();
      if((name==='overview'?key==='dashboard':ROUTES.includes(key))&&data().state(name).status!=='loading')go(key);
    }).catch(()=>{if(pendingViews.get(name)===request)pendingViews.delete(name);});
  }
  function retry(name){data().retry(name);if(ROUTES.includes(route()))go(route());}
  function notice(name){
    const state=data().state(name);
    if(state.status==='error')return '<div class="card"><div class="callout warn" role="alert">'+esc(state.error)+'</div><button type="button" class="btn btn-out" onclick="window.PP_ADMIN_NAV_UI.retry(\''+name+'\')">Tentar novamente</button></div>';
    return '<div class="card" role="status" aria-busy="true">Carregando '+(name==='surveys'?'resumos das pesquisas':'indicadores do painel')+'…</div>';
  }
  function refresh(){data().invalidate();go(route()||'dashboard');}
  function reset(){pendingViews.clear();actionOwner=null;if(chart){try{chart.destroy();}catch(ex){}chart=null;}}
  function onNavigate(key,previousKey){
    if(!enabled())return;
    // Uma edição/cadastro/alteração em outra área revalida os resumos ao voltar.
    if(ROUTES.includes(key)&&previousKey&&!ROUTES.includes(previousKey))data().invalidate();
    if(key!=='dashboard'&&chart){try{chart.destroy();}catch(ex){}chart=null;}
  }
  function list(key){
    ensure('surveys');
    const done=key==='surveys-done',archived=key==='surveys-archived';
    const title=archived?'Pesquisas arquivadas':done?'Pesquisas concluídas':'Minhas pesquisas';
    const subtitle=archived?'Coletas, respostas, pagamentos e comprovantes continuam preservados.':done?'Pesquisas encerradas — acesse a coleta completa e os relatórios sem reabrir.':'Pesquisas em desenvolvimento (rascunho e em campo).';
    const actions='<button type="button" class="btn btn-out" onclick="window.PP_ADMIN_NAV_UI.refresh()">Atualizar</button>'+
      (key!=='surveys'?'<button class="btn btn-out" onclick="go(\'surveys\')">← Em desenvolvimento</button>':'')+
      (!done?'<button class="btn btn-out" onclick="go(\'surveys-done\')">Concluídas</button>':'')+
      (!archived?'<button class="btn btn-out" onclick="go(\'surveys-archived\')">Arquivadas</button>':'')+
      (!done&&!archived?'<button class="btn btn-fill" onclick="newSurvey()">+ Nova pesquisa</button>':'');
    const header=head(title,subtitle,actions);
    if(!data().ready('surveys'))return header+notice('surveys');
    const all=data().rows();
    const active=all.filter(s=>!s.archivedAt),development=active.filter(s=>s.status!=='encerrada');
    const selected=all.filter(s=>archived?!!s.archivedAt:!s.archivedAt&&(done?s.status==='encerrada':s.status!=='encerrada'));
    const stats=archived?
      stat('Arquivadas',String(selected.length),'fora da operação','▤','#64748b')+stat('Coletas preservadas',selected.reduce((n,s)=>n+s.collected,0).toLocaleString('pt-BR'),'válidas e oficiais','◫','#0891b2'):
      done?stat('Concluídas',String(selected.length),'encerradas','✓','#7c3aed')+stat('Coletas totais',selected.reduce((n,s)=>n+s.collected,0).toLocaleString('pt-BR'),'válidas e oficiais','◫','#059669')+stat('Em desenvolvimento',String(development.length),'na outra aba','❒','#2563eb')+stat('Arquivadas',String(all.filter(s=>s.archivedAt).length),'histórico preservado','▤','#64748b'):
      stat('Em desenvolvimento',String(development.length),'rascunho + em campo','❒','#2563eb')+stat('Em campo',String(active.filter(s=>s.status==='campo').length),'coletando agora','◷','#059669')+stat('Rascunhos',String(active.filter(s=>s.status==='rascunho').length),'aguardando início','✎','#d97706')+stat('Concluídas',String(active.filter(s=>s.status==='encerrada').length),'em outra aba','✓','#7c3aed');
    const rows=selected.map(s=>row(s)).join('')||'<tr><td colspan="7" class="empty">Nenhuma pesquisa nesta lista.</td></tr>';
    return header+'<div class="grid '+(archived?'g2':'g4')+'" style="margin-bottom:16px">'+stats+'</div>'+busyNotice()+'<div class="card"><div class="survey-table-scroll"><table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody></table></div></div><div class="callout" style="margin-top:16px">Os resumos não alteram o formulário. Editar, duplicar e baixar PDF carregam os dados completos antes de continuar. Arquivar preserva o histórico; excluir definitivamente continua exigindo confirmação.</div>';
  }
  function busyNotice(){return actionOwner?'<div class="callout mb" role="status" aria-busy="true">Carregando os dados completos para a ação selecionada. Aguarde…</div>':'';}
  function row(s){
    const archived=!!s.archivedAt,done=s.status==='encerrada';
    const button=(label,action,css='')=>'<button type="button" class="btn-ghost '+css+'" '+(actionOwner?'disabled ':'')+'onclick="window.PP_ADMIN_NAV_UI.action('+jsArg(s.id)+','+jsArg(action)+')">'+label+'</button>';
    let actions='';
    if(!archived&&!done&&s.status==='rascunho')actions+=button('▶ Iniciar coleta','start');
    if(!archived&&done)actions+=button('Coleta completa','collect','completed-collection-access')+button('Clientes e acesso','clients','completed-client-access');
    actions+=button('Chat','chat');
    if(archived||done)actions+=button('Ver relatório','reports');
    if(!archived&&!done)actions+=button('Equipe','team')+button('Editar','edit');
    actions+=button('Duplicar','duplicate')+button('📄 PDF formulário','pdf','survey-pdf-action');
    if(archived)actions+=button('Restaurar','restore');
    else if(done)actions+=button('Reabrir','reopen')+button('Arquivar','archive');
    else actions+=button('Concluir','finish')+button('Arquivar','archive');
    if(['admin','admpro'].includes(CURRENT_PROFILE.role))actions+=button('Excluir definitivamente','delete','survey-delete-action');
    const sample=surveySample(s),collected=s.collected;
    const date=s.createdAt?new Date(s.createdAt).toLocaleDateString('pt-BR'):'';
    const coll=s.status==='rascunho'&&collected===0?'—':collected.toLocaleString('pt-BR')+' ('+surveyCoveragePct(collected,sample)+')';
    return '<tr><td data-label="Pesquisa"><b>'+esc(s.name)+'</b><div style="font-size:11px;color:var(--ink3)">'+esc(date)+'</div></td><td data-label="Formulário">'+s.questionCount+' '+(s.questionCount===1?'pergunta':'perguntas')+'</td><td data-label="Amostra">'+sample.toLocaleString('pt-BR')+'</td><td data-label="Coletado">'+coll+'</td><td data-label="Equipe">'+(s.teamCount?s.teamCount+' '+(s.teamCount===1?'pessoa':'pessoas'):'não atribuída')+'</td><td data-label="Status">'+(STATUS_PILL[archived?'arquivada':s.status]||STATUS_PILL.rascunho)+'</td><td data-label="Ações" class="survey-actions-cell '+(!archived&&done?'completed-survey-actions-cell':'')+'"><div class="survey-row-actions '+(!archived&&done?'completed-survey-actions':'')+'">'+actions+'</div></td></tr>';
  }
  async function action(id,name){
    const allowed=['start','finish','reopen','archive','restore','delete','duplicate','edit','team','pdf','collect','clients','reports','chat'];
    if(!enabled()||!allowed.includes(name)||actionOwner||!data().rows().some(s=>s.id===id))return;
    const token={profile:CURRENT_PROFILE,epoch:APP_DATA_SESSION_EPOCH,key:route()};actionOwner=token;
    const owns=()=>actionOwner===token&&CURRENT_PROFILE===token.profile&&APP_DATA_SESSION_EPOCH===token.epoch;
    try{
      if(name==='chat'){chatOpenSurveyChannel(id);return;}
      // Nunca publicar resumos em SURVEYS ou no assistente. O store legado é
      // carregado integralmente apenas após uma ação explícita da gestão.
      if(ROUTES.includes(route()))go(route());
      await loadSurveysIfNeeded();
      if(!owns()||route()!==token.key)return;
      if(!SURVEYS_LOADED)throw new Error(SURVEYS_LOAD_ERROR||'Os dados completos não estão disponíveis. Tente novamente.');
      const index=SURVEYS.findIndex(s=>s.id===id);
      if(index<0||SURVEYS[index].summaryOnly===true||!Array.isArray(SURVEYS[index].questions))throw new Error('Formulário completo não encontrado. Nenhuma alteração foi feita.');
      const run={start:surveyStart,finish:surveyFinish,reopen:surveyReopen,archive:surveyArchive,restore:surveyRestore,delete:surveyDelete,duplicate:surveyDuplicate,edit:surveyEdit,team:surveyTeam,pdf:surveyFormPdfDownload,
        collect:()=>collectOpenCompletedSurvey(id),clients:()=>completedClientsOpen(id),reports:()=>{ACTIVE_CAMPAIGN_ID=id;go('reports');}};
      await run[name](index);
    }catch(ex){if(owns())alert('Não foi possível abrir esta ação: '+(ex?.message||'Tente novamente.'));}
    finally{
      if(owns()){
        actionOwner=null;data().invalidate();
        if(ROUTES.includes(route()))go(route());
      }
    }
  }
  function dashboard(){
    ensure('surveys');ensure('overview');
    const header=head('Painel geral','Visão geral das operações do sistema','<button type="button" class="btn btn-out" onclick="window.PP_ADMIN_NAV_UI.refresh()">Atualizar</button>');
    const ready=data().ready('surveys'),overviewReady=data().ready('overview'),all=ready?data().rows():[],active=all.filter(s=>!s.archivedAt),o=overviewReady?data().overview():null;
    const count=status=>ready?String(active.filter(s=>s.status===status).length):'…';
    const value=key=>overviewReady&&o[key]!=null?Number(o[key]).toLocaleString('pt-BR'):'…';
    const isAdmin=['admin','admpro'].includes(CURRENT_PROFILE.role);
    return header+(isAdmin&&o&&o.company_signed===false?'<div class="callout mb">O contrato-quadro ainda não foi assinado pelo PesquisaPro. <button class="btn-ghost" onclick="go(\'contracts\')">Abrir contratos →</button></div>':'')+
      '<div class="grid g4" style="margin-bottom:18px">'+stat('Pesquisas em campo',count('campo'),'coletando dados agora','▤','#2563eb')+stat('Pesquisas em edição',count('rascunho'),'ainda não publicadas','✎','#d97706')+stat('Pesquisas finalizadas',count('encerrada'),'coleta encerrada','✓','#059669')+stat('Pesquisadores ativos',value('active_researchers'),'cadastrados no sistema','☺','#7c3aed')+'</div>'+
      '<div class="grid g4" style="margin-bottom:18px">'+stat('Entrevistas realizadas',value('valid_interviews'),'válidas, oficiais e não arquivadas','◫','#0891b2')+stat('Clientes atendidos',value('active_clients'),'clientes ativos no sistema','◆','#059669')+(isAdmin?stat('Cadastros a aprovar',value('pending_signups'),'aguardando aprovação','◷','#d97706'):'')+stat('Contratos pendentes',value('pending_contracts'),'versão vigente, sem assinar','✒','#dc2626')+'</div>'+
      (!ready?notice('surveys'):'')+(!overviewReady?notice('overview'):'<div class="card"><div class="card-t">Coletas por dia</div><div class="card-d">Últimos 14 dias · válidas e oficiais · horário de Brasília</div><div style="position:relative;height:230px"><canvas id="adminSummaryChart" role="img" aria-label="Coletas diárias oficiais"></canvas></div><details><summary>Ver valores do gráfico</summary><ul>'+o.daily_counts.map(x=>'<li>'+esc(x.day.split('-').reverse().join('/'))+': '+Number(x.count).toLocaleString('pt-BR')+'</li>').join('')+'</ul></details></div>');
  }
  function drawDashboard(){
    if(!enabled()||!data().ready('overview'))return;
    const c=document.getElementById('adminSummaryChart');if(!c)return;
    if(typeof Chart==='undefined'){
      loadLocalAsset('chart').then(()=>{if(document.getElementById('adminSummaryChart')===c)drawDashboard();}).catch(()=>{});return;
    }
    if(chart){try{chart.destroy();}catch(ex){}}
    const rows=data().overview().daily_counts;
    chart=new Chart(c,{type:'line',data:{labels:rows.map(x=>x.day.slice(8)+'/'+x.day.slice(5,7)),datasets:[{label:'Coletas válidas',data:rows.map(x=>x.count),borderColor:'#2563eb',backgroundColor:'rgba(31,95,168,.12)',fill:true,tension:.35,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
  }
  window.PP_ADMIN_NAV_UI={enabled,list,dashboard,drawDashboard,action,refresh,retry,onNavigate,reset};
})();
