/* ============ STATE ============ */
let selectedRole='admin';
const ROLES={
  admin:{name:'Admin Master',role:'Administrador',initials:'AM',
    nav:['dashboard','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company']},
  coord:{name:'Carla Menezes',role:'Coordenadora',initials:'CM',
    nav:['dashboard','surveys','surveys-done','collect','reports','finance']},
  gerente:{name:'Rafael Dias',role:'Gerente',initials:'RD',
    nav:['dashboard','sample','reports','finance']},
  pesq:{name:'João Pereira',role:'Pesquisador',initials:'JP',
    nav:['dashboard-pesq','app-collect','my-earnings','my-contract']},
  cliente:{name:'Prefeitura de Uberlândia',role:'Cliente',initials:'PU',
    nav:['client-progress','client-results']},
};
const CLIENT_SELF_IDX=0; /* cliente de demonstração ao entrar com o perfil "Cliente" */
const NAV_META={
  dashboard:{ico:'▤',label:'Painel geral',group:'Visão geral'},
  'dashboard-pesq':{ico:'▤',label:'Meu painel',group:'Visão geral'},
  'new-survey':{ico:'✦',label:'Nova pesquisa',group:'Pesquisa'},
  surveys:{ico:'❒',label:'Minhas pesquisas',group:'Pesquisa'},
  'surveys-done':{ico:'✓',label:'Concluídas',group:'Pesquisa'},
  sample:{ico:'∑',label:'Cálculo de amostra',group:'Pesquisa'},
  collect:{ico:'⬇',label:'Coleta e campo',group:'Pesquisa'},
  'app-collect':{ico:'▶',label:'Coletar (app)',group:'Campo'},
  reports:{ico:'◫',label:'Relatórios',group:'Análise'},
  users:{ico:'☺',label:'Usuários',group:'Administração'},
  permissions:{ico:'⚿',label:'Perfis e permissões',group:'Administração'},
  finance:{ico:'$',label:'Financeiro',group:'Pagamentos'},
  'my-earnings':{ico:'$',label:'Meus ganhos',group:'Pagamentos'},
  contracts:{ico:'✎',label:'Contratos',group:'Pagamentos'},
  'contract-template':{ico:'❒',label:'Modelos de contrato',group:'Pagamentos'},
  'my-contract':{ico:'✎',label:'Meu contrato',group:'Pagamentos'},
  company:{ico:'⌂',label:'Dados da empresa',group:'Administração'},
  'client-progress':{ico:'◷',label:'Andamento',group:'Minha pesquisa'},
  'client-results':{ico:'◫',label:'Resultados',group:'Minha pesquisa'},
};

/* ============ AUTENTICAÇÃO (Supabase) ============
   selectedRole continua existindo (várias partes do app já usam essa
   variável), só que agora ela é preenchida com o "role" de verdade
   vindo da tabela "profiles" do banco, depois de um login real. */
let CURRENT_PROFILE=null; // linha da tabela "profiles" do usuário logado

const ROLE_NAV={
  admin:['dashboard','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company'],
  coord:['dashboard','surveys','surveys-done','collect','reports','finance'],
  gerente:['dashboard','sample','reports','finance'],
  pesq:['dashboard-pesq','app-collect','my-earnings','my-contract'],
  cliente:['client-progress','client-results'],
  admpro:['dashboard','new-survey','surveys','surveys-done','sample','collect','reports','users','permissions','finance','contracts','contract-template','company'],
  vendedor:['dashboard'],
  indicador:['dashboard'],
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

async function afterLogin(user){
  const {data:profile,error}=await sb.from('profiles').select('*').eq('id',user.id).single();
  if(error||!profile){
    const errEl=document.getElementById('li-error');
    errEl.textContent='Login feito, mas não encontramos seu perfil no sistema. Fale com o administrador.';
    errEl.style.display='block';
    await sb.auth.signOut();
    return;
  }
  CURRENT_PROFILE=profile;
  selectedRole=profile.role;
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('show');
  document.getElementById('tbAvatar').textContent=initialsOf(profile.name);
  document.getElementById('tbName').textContent=profile.name;
  document.getElementById('tbRole').textContent=ROLE_LABEL[profile.role]||profile.role;
  buildSidebar();
  const nav=ROLE_NAV[profile.role]||['dashboard'];
  go(nav[0]);
}

async function logout(){
  await sb.auth.signOut();
  CURRENT_PROFILE=null;
  document.getElementById('app').classList.remove('show');
  document.getElementById('login').style.display='flex';
  document.getElementById('li-pass').value='';
}

/* se já existir uma sessão válida (usuário não fechou o navegador), entra direto */
(async function checkExistingSession(){
  try{
    const {data}=await sb.auth.getSession();
    if(data&&data.session&&data.session.user){
      await afterLogin(data.session.user);
    }
  }catch(ex){ /* sem sessão anterior ou sem conexão — fica na tela de login normalmente */ }
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
      html+=`<button class="nav-item" data-key="${i.key}" onclick="go('${i.key}')"><span class="ico">${i.ico}</span>${i.label}</button>`;
    });
    html+='</div>';
  });
  document.getElementById('sidebar').innerHTML=html;
}

function go(key){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('on',n.dataset.key===key));
  if(window._beforeRender)window._beforeRender(key);
  document.getElementById('main').innerHTML=PAGES[key]?PAGES[key]():'<div class="empty">Em construção</div>';
  if(window._afterRender)window._afterRender(key);
}

/* PAGES object is populated in the next script block */
const PAGES={};

/* ============ helpers ============ */
function head(title,desc,actions){
  return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div>${actions?`<div class="ph-actions">${actions}</div>`:''}</div>`;
}
function stat(label,val,sub,ico,color){
  return `<div class="stat"><div class="s-top"><span class="s-label">${label}</span>
    <span class="s-ico" style="background:${color}22;color:${color}">${ico}</span></div>
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
  if(!USERS_LOADED)loadUsersIfNeeded();
  if(!SURVEYS_LOADED)loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
  const emCampo=SURVEYS.filter(s=>s.status==='campo').length;
  const emEdicao=SURVEYS.filter(s=>s.status==='rascunho').length;
  const finalizadas=SURVEYS.filter(s=>s.status==='encerrada').length;
  const pesqAtivos=USERS.filter(u=>u.role==='pesq'&&u.status==='ativo').length;
  const entrevistas=SURVEYS.reduce((sum,s)=>sum+surveyCollectedCount(s),0);
  const clientesAtendidos=USERS.filter(u=>u.role==='cliente'&&u.status==='ativo').length;
  const cadastrosAprovar=SIGNUPS.length;
  const contratosPendentes=CONTRACTS.filter(c=>!c.signed).length;
  return head('Painel geral','Visão consolidada da pesquisa eleitoral · Minas Gerais 2026')+`
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Pesquisas em campo',String(emCampo),'coletando dados agora','▤','#2563eb')}
    ${stat('Pesquisas em edição',String(emEdicao),'ainda não publicadas','✎','#d97706')}
    ${stat('Pesquisas finalizadas',String(finalizadas),'coleta encerrada','✓','#059669')}
    ${stat('Pesquisadores ativos',String(pesqAtivos),'cadastrados no sistema','☺','#7c3aed')}
  </div>
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Entrevistas realizadas',entrevistas.toLocaleString('pt-BR'),'coletadas através do aplicativo','◫','#0891b2')}
    ${stat('Clientes atendidos',String(clientesAtendidos),'com pesquisa em andamento','◆','#059669')}
    ${stat('Cadastros a aprovar',String(cadastrosAprovar),'pesquisadores aguardando aprovação','◷','#d97706')}
    ${stat('Contratos pendentes',String(contratosPendentes),'aguardando assinatura','✒','#dc2626')}
  </div>
  <div class="card">
    <div class="card-t">Coletas por dia</div>
    <div class="card-d">Últimos 14 dias · todas as regionais</div>
    <div style="position:relative;height:230px"><canvas id="dashChart" role="img" aria-label="Gráfico de coletas diárias"></canvas></div>
  </div>`;
};

/* ============ DASHBOARD pesquisador ============ */
PAGES['dashboard-pesq']=()=>head('Meu painel','Olá João — acompanhe suas metas e ganhos')+`
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Coletas hoje','14','meta diária: 20','✓','#2563eb')}
    ${stat('Coletas no mês','312','+18 ontem','◷','#059669')}
    ${stat('A receber','R$ 1.560','312 form. × R$ 5,00','$','#ea580c')}
    ${stat('Aprovação','96%','12 rejeitadas de 324','✓','#7c3aed')}
  </div>
  <div class="card mb">
    <div class="card-t">Suas cotas pendentes hoje</div>
    <div class="card-d">Foque nos perfis que ainda faltam para bater a meta</div>
    ${quota('Mulheres 45+',2,6,'#dc2626')}
    ${quota('Homens 45+',3,6,'#d97706')}
    ${quota('Mulheres 25–44',5,8,'#059669')}
  </div>
  <button class="btn btn-accent" style="font-size:15px;padding:14px 22px" onclick="go('app-collect')">▶ Abrir app de coleta</button>`;

/* ============ ÁREA DO CLIENTE ============ */
function clientSelf(){return clienteUsers()[CLIENT_SELF_IDX];}
function clientSelfSurvey(){
  const c=clientSelf();if(!c)return null;
  return SURVEYS.find(s=>s.name===(c.surveys||[])[0])||null;
}
PAGES['client-progress']=()=>{
  const c=clientSelf(),s=clientSelfSurvey();
  if(!c||!s){
    return head('Minha pesquisa','Acompanhe o andamento da coleta')+`<div class="card"><div class="empty">Nenhuma pesquisa vinculada à sua conta no momento.</div></div>`;
  }
  const sample=surveySample(s);
  const pct=sample?Math.min(100,Math.round(s.collected/sample*100)):0;
  if(!c.resultsReleased){
    return head(s.name,'Andamento da coleta · '+c.company)+`
    <div class="card mb">
      <div class="card-t">Progresso geral da coleta</div>
      <div class="card-d">Percentual coletado até o momento</div>
      <div class="bar" style="height:14px"><span style="width:${pct}%"></span></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--ink3);font-weight:600">
        <span>${pct}% da meta</span><span>Status: ${STATUS_LABEL[s.status]||s.status}</span>
      </div>
    </div>
    <div class="callout" style="margin-top:6px">🔒 Acesso completo ainda não liberado. Assim que confirmarmos o pagamento, você passa a acompanhar aqui o andamento detalhado em tempo real (equipe em campo, progresso por cota, cobertura por região) e também os resultados da pesquisa.</div>`;
  }
  return head(s.name,'Andamento da coleta em tempo real · '+c.company,
    '<button class="btn btn-fill" onclick="go(\'client-results\')">Ver resultados →</button>')+`
  <div class="grid g4" style="margin-bottom:18px">
    ${stat('Coletado',s.collected.toLocaleString('pt-BR'),'de '+sample.toLocaleString('pt-BR')+' · '+pct+'%','✓','#2563eb')}
    ${stat('Pesquisadores em campo',String((s.team||[]).length),'atuando nesta pesquisa','☺','#059669')}
    ${stat('Status',STATUS_LABEL[s.status]||s.status,s.created,'◷','#d97706')}
    ${stat('Margem de erro prevista',s.err?('± '+Math.round(+s.err*100)+'%'):'—','nível de confiança '+(s.conf==='1.96'?'95%':s.conf),'∑','#7c3aed')}
  </div>
  <div class="card mb">
    <div class="card-t">Progresso geral da coleta</div>
    <div class="card-d">Atualizado conforme os pesquisadores enviam novas entrevistas</div>
    <div class="bar" style="height:14px"><span style="width:${pct}%"></span></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--ink3);font-weight:600">
      <span>${s.collected.toLocaleString('pt-BR')} coletadas</span><span>${pct}% da meta</span><span>${sample.toLocaleString('pt-BR')} entrevistas</span>
    </div>
  </div>
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Progresso por cota</div>
      <div class="card-d">Proporções definidas no plano amostral</div>
      ${quota('Homens 16–24',180,260,'#2563eb')}
      ${quota('Mulheres 16–24',210,275,'#2563eb')}
      ${quota('Homens 25–44',390,520,'#059669')}
      ${quota('Mulheres 25–44',440,545,'#059669')}
      ${quota('Homens 45+',300,410,'#ea580c')}
      ${quota('Mulheres 45+',280,430,'#ea580c')}
    </div>
    <div class="card">
      <div class="card-t">Cobertura por região</div>
      <div class="card-d">Regiões com coleta em andamento</div>
      <table><thead><tr><th>Regional</th><th>Coletado</th><th>Meta</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td><b>Vale do Mucuri</b></td><td>62</td><td>140</td><td><span class="pill pill-red">● Crítico</span></td></tr>
        <tr><td><b>Jequitinhonha</b></td><td>71</td><td>150</td><td><span class="pill pill-red">● Crítico</span></td></tr>
        <tr><td><b>Noroeste</b></td><td>88</td><td>160</td><td><span class="pill pill-amber">● Atenção</span></td></tr>
        <tr><td><b>Norte</b></td><td>210</td><td>320</td><td><span class="pill pill-amber">● Atenção</span></td></tr>
        <tr><td><b>Triângulo</b></td><td>340</td><td>410</td><td><span class="pill pill-green">● No prazo</span></td></tr>
      </tbody></table>
    </div>
  </div>
  <div class="callout mb" style="margin-top:16px">🔒 Os resultados (intenção de voto, avaliação e demais respostas) ficam disponíveis na aba <b>Resultados</b> assim que a coleta for concluída e o administrador liberar a visualização.</div>`;
};

const STATUS_LABEL={campo:'Em campo',rascunho:'Rascunho',encerrada:'Concluída'};

PAGES['client-results']=()=>{
  const c=clientSelf(),s=clientSelfSurvey();
  if(!c||!s){
    return head('Resultados','Resultados da sua pesquisa')+`<div class="card"><div class="empty">Nenhuma pesquisa vinculada à sua conta no momento.</div></div>`;
  }
  if(!c.resultsReleased){
    const sample=surveySample(s);
    const pct=sample?Math.min(100,Math.round(s.collected/sample*100)):0;
    return head('Resultados',s.name)+`
    <div class="card" style="text-align:center;padding:52px 24px">
      <div style="width:56px;height:56px;border-radius:16px;background:var(--amber-l);color:var(--amber);font-size:26px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">🔒</div>
      <div style="font-weight:800;font-size:18px">Resultados ainda não liberados</div>
      <p style="color:var(--ink3);font-size:13.5px;margin-top:8px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.6">
        A coleta está em <b>${pct}%</b> da meta. Assim que os dados forem validados, a equipe do PesquisaPro libera os resultados aqui — você recebe um aviso por e-mail e WhatsApp.
      </p>
      <button class="btn btn-out" style="margin-top:20px" onclick="go('client-progress')">← Ver andamento da coleta</button>
    </div>`;
  }
  return head('Resultados',s.name,'<button class="btn btn-out" onclick="alert(\'Protótipo: exportar PDF do relatório\')">Exportar PDF</button>')+`
  <div class="grid g3" style="margin-bottom:16px">
    ${stat('Base amostral',s.collected.toLocaleString('pt-BR'),'entrevistas válidas','✓','#2563eb')}
    ${stat('Margem de erro',s.err?('± '+Math.round(+s.err*100)+'%'):'± 2%','95% de confiança','∑','#7c3aed')}
    ${stat('Líder na intenção de voto','Candidato C','35% dos votos válidos','◫','#059669')}
  </div>
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Intenção de voto — resultado geral</div>
      <div class="card-d">Base: ${s.collected.toLocaleString('pt-BR')} entrevistas válidas</div>
      <div style="position:relative;height:260px"><canvas id="clientResultsChart" role="img" aria-label="Gráfico de intenção de voto"></canvas></div>
    </div>
    <div class="card">
      <div class="card-t">Tabela de resultados</div>
      <div class="card-d">Percentual sobre o total de entrevistados</div>
      <table><thead><tr><th></th><th>% dos votos</th></tr></thead>
        <tbody>
          <tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#2563eb;margin-right:6px"></span>Candidato A</td><td><b>29%</b></td></tr>
          <tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#ea580c;margin-right:6px"></span>Candidato B</td><td><b>24%</b></td></tr>
          <tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#059669;margin-right:6px"></span>Candidato C</td><td><b>35%</b></td></tr>
          <tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#64748b;margin-right:6px"></span>Branco/Nulo/NS</td><td><b>12%</b></td></tr>
        </tbody></table>
      <div class="callout mb" style="margin-top:14px">Relatório completo, com cruzamento por região, idade e demais variáveis, disponível para exportação em PDF.</div>
    </div>
  </div>`;
};
function drawClientResults(){
  const c=document.getElementById('clientResultsChart');if(!c)return;
  new Chart(c,{type:'doughnut',data:{
    labels:['Candidato A','Candidato B','Candidato C','Branco/Nulo/NS'],
    datasets:[{data:[29,24,35,12],backgroundColor:['#2563eb','#ea580c','#059669','#64748b'],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}});
}

/* ============ SURVEYS / construtor ============ */
/* ============ NEW SURVEY WIZARD ============ */
const WIZ={step:1,total:7,editIndex:null,
  data:{name:'',tipo:'Eleitoral / intenção de voto',dataIni:'',dataFim:'',abrangencia:'estadual',estados:[],cidades:{},
    pop:1000000,err:'0.03',conf:'1.96',prop:50,price:5,priceRemote:8,clientPrice:12,clientes:[],
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{}}};
let WIZ_QID=1;
const Q_TYPES={single:'Escolha única',multi:'Múltipla escolha',scale:'Escala 1–5',scale10:'Escala 1–10',nps:'NPS 0–10',open:'Resposta aberta',number:'Número',date:'Data'};
const Q_HAS_OPTS=t=>t==='single'||t==='multi';
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
    formStarted:false,questions:[],quotas:{},quotaOff:{},remote:{}};
}

/* store de pesquisas — carregado do Supabase (ver bloco "PESQUISAS — carregamento
   e gravação no Supabase" logo abaixo). Cada item ganha um campo extra `id` (o
   UUID da linha em surveys), usado para localizar a linha certa ao salvar. */
let SURVEYS=[];
let SURVEYS_LOADED=false;
let SURVEYS_LOADING=false;

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
  const questions=(questionRows||[]).map((q,qi)=>{
    const localId=qi+1;
    const opts=(q.survey_question_options||[]).slice().sort((a,b)=>a.position-b.position);
    if(opts.length){
      if(opts.every(o=>o.quota_enabled===false))quotaOff[localId]=true;
      opts.forEach((o,oi)=>{
        if(o.quota_pct!=null){quotas[localId]=quotas[localId]||{};quotas[localId][oi]=o.quota_pct;}
        if(o.is_remote)remote[oi]=true;
      });
    }
    return {id:localId,text:q.text||'',type:q.type||'single',opts:opts.map(o=>o.label||''),isRegion:!!q.is_region};
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
    formStarted:!!row.form_started,questions,quotas,quotaOff,remote,
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
    form_started:!!d.formStarted,status:d.status||'rascunho',
  };
}
/* apaga e recria as perguntas/opções da pesquisa a partir do que está em `d`
   (mesma lógica de "substituir tudo" usada em syncPesqCidades, para não ter
   que calcular um diff pergunta a pergunta) */
async function syncSurveyQuestionsAndOptions(surveyId,d){
  await sb.from('survey_questions').delete().eq('survey_id',surveyId);
  const questions=d.questions||[];
  for(let i=0;i<questions.length;i++){
    const q=questions[i];
    const {data:qRow,error:qErr}=await sb.from('survey_questions').insert({
      survey_id:surveyId,position:i,text:q.text||'',type:q.type||'single',is_region:!!q.isRegion,
    }).select().single();
    if(qErr)throw new Error('Não foi possível salvar as perguntas: '+qErr.message);
    if(Q_HAS_OPTS(q.type)&&q.opts&&q.opts.length){
      const off=!!(d.quotaOff&&d.quotaOff[q.id]);
      const localQuotas=(d.quotas&&d.quotas[q.id])||{};
      const optRows=q.opts.map((label,oi)=>({
        question_id:qRow.id,position:oi,label:label||'',
        is_remote:q.isRegion?!!(d.remote&&d.remote[oi]):false,
        quota_pct:off?null:(localQuotas[oi]!=null?localQuotas[oi]:null),
        quota_enabled:!off,
      }));
      const {error:oErr}=await sb.from('survey_question_options').insert(optRows);
      if(oErr)throw new Error('Não foi possível salvar as opções: '+oErr.message);
    }
  }
}
/* apaga e recria os vínculos com clientes (a lista `d.clientes` guarda nomes
   de empresa — resolvidos aqui para o id real do perfil do cliente) */
async function syncSurveyClients(surveyId,companyNames){
  await sb.from('survey_clients').delete().eq('survey_id',surveyId);
  const ids=(companyNames||[]).map(name=>{
    const c=clienteUsers().find(x=>x.company===name);
    return c&&c.id;
  }).filter(Boolean);
  if(ids.length){
    const {error}=await sb.from('survey_clients').insert(ids.map(id=>({survey_id:surveyId,client_id:id})));
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
const SURVEY_JOIN_SELECT='*, survey_questions(*, survey_question_options(*)), survey_clients(client_id), survey_team(researcher_id)';
function idsToClientCompanies(ids){return ids.map(id=>{const c=USERS.find(u=>u.id===id);return c?(c.company||c.name):null;}).filter(Boolean);}
function idsToResearcherNames(ids){return ids.map(id=>{const u=USERS.find(x=>x.id===id);return u?u.name:null;}).filter(Boolean);}
async function reloadSurveySnapshot(surveyId){
  const {data,error}=await sb.from('surveys').select(SURVEY_JOIN_SELECT).eq('id',surveyId).single();
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
    const {data,error}=await sb.from('surveys').select(SURVEY_JOIN_SELECT).order('created_at',{ascending:false});
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
  if(k==='surveys'||k==='surveys-done'||k==='dashboard'||k==='survey-team')go(k);
}
function surveySample(s){
  const N=+s.pop||0,e=+s.err,Z=+s.conf,p=(+s.prop||50)/100;
  return Math.ceil(Math.ceil((N*Z*Z*p*(1-p))/(e*e*(N-1)+Z*Z*p*(1-p)))*1.1);
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

PAGES['new-survey']=()=>head(WIZ.editIndex!=null?'Editar pesquisa':'Nova pesquisa','Defina formulário, amostra com cotas e preço. A equipe é atribuída depois.')+`
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
          const safeC=esc(c).replace(/'/g,'&#39;');
          return `<label class="geo-city-row" data-name="${esc((c+' '+uf).toLowerCase())}">
            <input type="checkbox" ${checked?'checked':''} onchange="wizToggleCidade('${uf}','${safeC}')">
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
function qRender(){
  const wrap=document.getElementById('q-list');if(!wrap)return;
  const qs=WIZ.data.questions;
  document.getElementById('q-count').textContent=qs.length+(qs.length===1?' pergunta':' perguntas');
  if(qs.length===0){wrap.innerHTML='<div class="empty">Nenhuma pergunta ainda. Adicione abaixo.</div>';return;}
  wrap.innerHTML=qs.map((q,i)=>{
    let body='';
    if(Q_HAS_OPTS(q.type)){
      body=`<div class="q-opts">`+q.opts.map((o,oi)=>
        `<div class="opt-edit"><span class="${q.type==='single'?'opt-dot':'opt-sq'}"></span>
          <input class="opt-inp" value="${esc(o)}" oninput="qOpt(${q.id},${oi},this.value)" placeholder="Opção ${oi+1}">
          <button class="opt-del" title="Remover opção" onclick="qOptDel(${q.id},${oi})">✕</button></div>`).join('')
        +`<button class="opt-add" onclick="qOptAdd(${q.id})">+ adicionar opção</button></div>`;
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
    const canQuota=Q_HAS_OPTS(q.type)&&q.opts.some(o=>o&&o.trim());
    const quotaOn=canQuota&&!(WIZ.data.quotaOff&&WIZ.data.quotaOff[q.id]);
    const quotaCtl=canQuota
      ?`<button class="q-quota-btn ${quotaOn?'on':''}" title="Definir se esta pergunta terá cota controlada na amostra (ajustável em detalhe no passo Cotas)" onclick="qToggleQuota(${q.id})">${quotaOn?'✓ cota':'sem cota'}</button>`
      :'';
    return `<div class="q-card ${q.isRegion?'is-region':''}">
      <div class="qc-head">
        <span class="q-num">${i+1}</span>
        <input class="q-text-inp" value="${esc(q.text)}" oninput="qText(${q.id},this.value)" placeholder="Digite o enunciado da pergunta">
        ${regionCtl}
        ${quotaCtl}
        ${typeCtl}
        ${delBtn}
      </div>
      ${body}
    </div>`;
  }).join('');
}
function esc(s){return (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function fmtDataBR(iso){
  if(!iso)return '';
  const p=iso.split('-');if(p.length!==3)return iso;
  return p[2]+'/'+p[1]+'/'+p[0];
}
function qFind(id){return WIZ.data.questions.find(q=>q.id===id);}
function qAdd(type){
  const q={id:WIZ_QID++,text:'',type,opts:Q_HAS_OPTS(type)?['',''] :[]};
  WIZ.data.questions.push(q);qRender();
  setTimeout(()=>{const inputs=document.querySelectorAll('.q-text-inp');if(inputs.length)inputs[inputs.length-1].focus();},30);
}
function qDel(id){WIZ.data.questions=WIZ.data.questions.filter(q=>q.id!==id);qRender();}
function qText(id,v){const q=qFind(id);if(q)q.text=v;}
function qType(id,v){const q=qFind(id);if(!q)return;q.type=v;if(Q_HAS_OPTS(v)&&q.opts.length===0)q.opts=['',''];if(!Q_HAS_OPTS(v)||v!=='single')q.isRegion=false;qRender();}
function qOpt(id,oi,v){const q=qFind(id);if(q)q.opts[oi]=v;}
function qOptAdd(id){const q=qFind(id);if(q){q.opts.push('');qRender();}}
function qOptDel(id,oi){const q=qFind(id);if(q&&q.opts.length>1){q.opts.splice(oi,1);qRender();}}
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
    <div class="mb"><label class="lbl">População (eleitores)</label><input class="inp" id="w-pop" type="number" value="${WIZ.data.pop}" oninput="wizCalc()"></div>
    <div class="field-row mb">
      <div><label class="lbl">Margem de erro</label><select class="inp" id="w-err" onchange="wizCalc()">
        <option value="0.05" ${WIZ.data.err==='0.05'?'selected':''}>± 5%</option>
        <option value="0.04" ${WIZ.data.err==='0.04'?'selected':''}>± 4%</option>
        <option value="0.03" ${WIZ.data.err==='0.03'?'selected':''}>± 3%</option>
        <option value="0.02" ${WIZ.data.err==='0.02'?'selected':''}>± 2%</option></select></div>
      <div><label class="lbl">Confiança</label><select class="inp" id="w-conf" onchange="wizCalc()">
        <option value="1.645" ${WIZ.data.conf==='1.645'?'selected':''}>90%</option>
        <option value="1.96" ${WIZ.data.conf==='1.96'?'selected':''}>95%</option>
        <option value="2.576" ${WIZ.data.conf==='2.576'?'selected':''}>99%</option></select></div>
    </div>
    <div class="mb"><label class="lbl">Proporção esperada (p)</label><input class="inp" id="w-prop" type="number" value="${WIZ.data.prop}" oninput="wizCalc()"> <span style="font-size:11px;color:var(--ink3)">% — 50% se desconhecida</span></div>
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
    const safeCompany=esc(c.company).replace(/'/g,'&#39;');
    const statusPill=c.status==='ativo'?'pill-green':c.status==='prospecto'?'pill-amber':'pill-gray';
    const accessBtn=on
      ?`<button type="button" class="client-access-btn ${c.resultsReleased?'on':''}" title="Liberar ou não acesso total (andamento em tempo real + resultados) para este cliente" onclick="wizToggleClientAccess('${safeCompany}')">${c.resultsReleased?'✓ acesso liberado':'🔒 liberar acesso'}</button>`
      :'';
    const searchKey=esc((c.company+' '+(c.contact||'')+' '+(c.email||'')).toLowerCase());
    return `<div class="client-link-row ${on?'on':''}" data-name="${searchKey}">
      <label class="clr-check-label">
        <input type="checkbox" ${on?'checked':''} onchange="wizToggleCliente('${safeCompany}')">
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
  const next=!c.resultsReleased;
  try{
    if(c.id){
      const {error}=await sb.from('profiles').update({results_released:next}).eq('id',c.id);
      if(error)throw new Error(error.message);
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
  return WIZ.data.questions.filter(q=>Q_HAS_OPTS(q.type)&&q.opts.some(o=>o&&o.trim()));
}
function renderQuotas(){
  const area=document.getElementById('quotas-area');if(!area)return;
  const qs=quotaQuestions();
  const nadj=wizSampleAdj();
  if(qs.length===0){area.innerHTML='<div class="empty">Adicione perguntas de escolha única ou múltipla (com opções) no passo Formulário para poder definir cotas nelas.</div>';return;}
  WIZ.data.quotas=WIZ.data.quotas||{};
  WIZ.data.quotaOff=WIZ.data.quotaOff||{};
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
  const N=+gv('w-pop',WIZ.data.pop)||0;
  const e=+gv('w-err',WIZ.data.err);
  const Z=+gv('w-conf',WIZ.data.conf);
  const p=(+gv('w-prop',WIZ.data.prop)||50)/100;
  return Math.ceil((N*Z*Z*p*(1-p))/(e*e*(N-1)+Z*Z*p*(1-p)));
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
  const N=WIZ.data.pop,Z=+WIZ.data.conf,p=WIZ.data.prop/100;
  const errs=[0.05,0.04,0.03,0.02];
  const data=errs.map(e=>Math.ceil((N*Z*Z*p*(1-p))/(e*e*(N-1)+Z*Z*p*(1-p))));
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
      const {data:inserted,error}=await sb.from('surveys').insert(row).select().single();
      if(error)throw new Error(error.message);
      surveyId=inserted.id;
    }else{
      surveyId=SURVEYS[WIZ.editIndex].id;
      const {error}=await sb.from('surveys').update(row).eq('id',surveyId);
      if(error)throw new Error(error.message);
    }
    await syncSurveyQuestionsAndOptions(surveyId,d);
    await syncSurveyClients(surveyId,d.clientes||[]);
    const snapshot=await reloadSurveySnapshot(surveyId);
    if(isNew){
      snapshot.isNew=true;
      SURVEYS.unshift(snapshot);
    }else{
      snapshot.team=SURVEYS[WIZ.editIndex].team;snapshot.coord=SURVEYS[WIZ.editIndex].coord;
      SURVEYS[WIZ.editIndex]=snapshot;
    }
    refreshClientSurveyLinks();
    alert(isNew?'Pesquisa criada! Agora atribua a equipe em Minhas pesquisas.':'Alterações salvas.');
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
    ?`<button class="btn-ghost" onclick="go('reports')">Ver relatório</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost" onclick="surveyReopen(${idx})">Reabrir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyDelete(${idx})">Excluir</button>`
    :`<button class="btn-ghost" onclick="surveyTeam(${idx})">Equipe</button>
      <button class="btn-ghost" onclick="surveyEdit(${idx})">Editar</button>
      <button class="btn-ghost" onclick="surveyDuplicate(${idx})">Duplicar</button>
      <button class="btn-ghost" onclick="surveyFinish(${idx})">Concluir</button>
      <button class="btn-ghost" style="color:var(--red)" onclick="surveyDelete(${idx})">Excluir</button>`;
  return `<tr>
    <td><b>${s.name}</b>${tag}<div style="font-size:11px;color:var(--ink3)">${s.created}</div></td>
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
    <table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
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
    <table><thead><tr><th>Pesquisa</th><th>Formulário</th><th>Amostra</th><th>Coletado</th><th>Equipe</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>
  <div class="callout" style="margin-top:16px"><b>Reabrir</b> devolve a pesquisa para "em desenvolvimento". <b>Duplicar</b> cria uma cópia como novo rascunho, sem copiar equipe nem vínculo com clientes.</div>`;
};

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
    formStarted:s.formStarted!==false,questions:s.questions||[],clientPrice:s.clientPrice!=null?s.clientPrice:12,quotas:s.quotas||{},quotaOff:s.quotaOff||{},remote:s.remote||{}
  }));
  WIZ_QID=(WIZ.data.questions.reduce((m,q)=>Math.max(m,q.id),0)||0)+1;
  go('new-survey');
}

/* ---- equipe / atribuição ---- */
let TEAM_IDX=null;
PAGES['survey-team']=()=>{
  const s=SURVEYS[TEAM_IDX];if(!s)return '<div class="empty">Pesquisa não encontrada.</div>';
  if(!USERS_LOADED){
    loadUsersIfNeeded();
    return head('Atribuir equipe — '+s.name,'Carregando pesquisadores cadastrados…')+'<div class="empty">Carregando pesquisadores do banco de dados…</div>';
  }
  const team=s.team||[];
  const pesqs=pesqUsers();
  const rows=pesqs.length?pesqs.map(u=>{
    const on=team.includes(u.name);
    const pend=u.status!=='ativo';
    const regional=(u.cidadesAtuacao&&u.cidadesAtuacao.length)?u.cidadesAtuacao.join(', '):(u.cidade||'—');
    return `<label class="pick" style="${pend?'opacity:.7':''}">
      <input type="checkbox" class="t-pesq" value="${esc(u.name)}" ${on?'checked':''} ${pend?'disabled':''}>
      <div class="avatar" style="width:30px;height:30px;font-size:11px">${esc(u.name).split(' ').map(n=>n[0]).join('')}</div>
      <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(u.name)}</div>
        <div style="font-size:11px;color:var(--ink3)">${esc(regional)}</div></div>
      ${pend?'<span class="pill pill-amber">● aguardando aprovação</span>':''}</label>`;
  }).join(''):'<div class="empty">Nenhum pesquisador cadastrado ainda. Cadastre em Usuários → Pesquisadores.</div>';
  return head('Atribuir equipe — '+s.name,'Escolha pesquisadores cadastrados ou envie link de cadastro para novos',
    '<button class="btn btn-out" onclick="go(\'surveys\')">← Voltar</button><button class="btn btn-fill" onclick="teamSave()">Salvar equipe</button>')+`
  <div class="grid g2" style="align-items:start">
    <div class="card">
      <div class="card-t">Pesquisadores cadastrados</div>
      <div class="card-d">Marque quem vai trabalhar nesta pesquisa</div>
      <div class="picklist" style="grid-template-columns:1fr">${rows}</div>
    </div>
    <div>
      <div class="card mb">
        <div class="card-t">Convidar novos pesquisadores</div>
        <div class="card-d">Envie um link público. Quem abrir se cadastra e entra na fila para aprovação.</div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
          <input class="inp" value="pesquisapro.com.br/cadastro/mg2026-x8f3" readonly>
          <button class="btn btn-out" onclick="alert('Protótipo: link copiado')">Copiar</button>
        </div>
        <button class="btn btn-fill" onclick="alert('Protótipo: link enviado por WhatsApp/e-mail')">Enviar link de cadastro</button>
      </div>
      <div class="card">
        <div class="card-t" style="font-size:13px">Cadastros aguardando aprovação</div>
        <div class="card-d">Novos pesquisadores só coletam após aprovação de um perfil administrativo</div>
        <div class="approve-row">
          <div class="avatar" style="width:30px;height:30px;font-size:11px;background:#d97706">AB</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">Ana Botelho</div>
            <div style="font-size:11px;color:var(--ink3)">cadastrou-se há 2h · via link</div></div>
          <button class="btn-ghost" style="color:var(--teal)" onclick="alert('Protótipo: cadastro aprovado. Pesquisadora liberada para coletar.')">Aprovar</button>
          <button class="btn-ghost" style="color:var(--red)" onclick="alert('Protótipo: cadastro recusado')">Recusar</button>
        </div>
      </div>
    </div>
  </div>`;
};
function surveyTeam(idx){TEAM_IDX=idx;go('survey-team');}
async function teamSave(){
  const s=SURVEYS[TEAM_IDX];if(!s)return;
  const names=[...document.querySelectorAll('.t-pesq:checked')].map(c=>c.value);
  try{
    if(s.id)await syncSurveyTeam(s.id,names);
  }catch(ex){alert('Não foi possível salvar a equipe: '+ex.message);return;}
  s.team=names;
  alert('Equipe salva: '+(names.length?names.join(', '):'nenhum pesquisador'));
  go('surveys');
}

/* ============ SAMPLE / amostra ============ */
PAGES.sample=()=>head('Cálculo de amostra','Defina o tamanho da amostra a partir da população, margem de erro e confiança')+`
  <div class="grid g2">
    <div class="card">
      <div class="card-t">Parâmetros</div>
      <div class="card-d">Fórmula para população finita</div>
      <div class="mb"><label class="lbl">População (N) — eleitores</label>
        <input class="inp" id="sp-pop" type="number" value="16200000" oninput="calcSample()"></div>
      <div class="field-row mb">
        <div><label class="lbl">Margem de erro</label>
          <select class="inp" id="sp-err" onchange="calcSample()">
            <option value="0.05">± 5%</option><option value="0.04">± 4%</option>
            <option value="0.03">± 3%</option><option value="0.02" selected>± 2%</option></select></div>
        <div><label class="lbl">Nível de confiança</label>
          <select class="inp" id="sp-conf" onchange="calcSample()">
            <option value="1.645">90%</option><option value="1.96" selected>95%</option><option value="2.576">99%</option></select></div>
      </div>
      <div class="mb"><label class="lbl">Proporção esperada (p)</label>
        <input class="inp" id="sp-prop" type="number" value="50" step="1" oninput="calcSample()"> <span style="font-size:11px;color:var(--ink3)">% — use 50% se desconhecida (mais conservador)</span></div>
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
  '<button class="btn btn-out" onclick="alert(\'Protótipo: importar perfil populacional (IBGE/TSE)\')">Importar perfil</button><button class="btn btn-fill" onclick="alert(\'Protótipo: salvar plano de cotas\')">Salvar plano</button>')+`
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
const RESEARCHER_INFO={
  'João Pereira':{regional:'Triângulo',link:'…/c/jp-3f9a',meta:180,done:312,sync:'online',phone:'5534999990001'},
  'Fernanda Couto':{regional:'Triângulo',link:'…/c/fc-9a4b',meta:200,done:188,sync:'online',phone:'5534999990002'},
  'Maria Souza':{regional:'Jequitinhonha',link:'…/c/ms-7b2c',meta:150,done:71,sync:'offline',phone:'5533999990003'},
  'Lucas Andrade':{regional:'Vale do Mucuri',link:'…/c/la-1d8e',meta:140,done:62,sync:'online',phone:'5533999990004'},
  'Renata Lima':{regional:'Noroeste',link:'…/c/rl-2k7p',meta:160,done:88,sync:'online',phone:'5538999990005'},
  'Paulo Cruz':{regional:'Norte',link:'…/c/pc-5m1q',meta:320,done:210,sync:'offline',phone:'5538999990006'},
};
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
    const pct=sample?Math.round(collected/sample*100):0;
    const team=(s.team||[]).length;
    return `<tr style="cursor:pointer" onclick="collectOpen(${i})">
      <td><b>${s.name}</b><div style="font-size:11px;color:var(--ink3)">${s.created}</div></td>
      <td>${STATUS_PILL[s.status]}</td>
      <td>${team?team+(team===1?' pesquisador':' pesquisadores'):'<span style="color:var(--ink3)">sem equipe</span>'}</td>
      <td>${collected.toLocaleString('pt-BR')} / ${sample.toLocaleString('pt-BR')} (${pct}%)</td>
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
function collectOpen(i){COLLECT_IDX=i;COLLECT_ARMED=true;go('collect');}
function collectBack(){COLLECT_IDX=null;go('collect');}
let COLLECT_ARMED=false;
function collectDetail(idx){
  const s=SURVEYS[idx];if(!s)return collectList();
  const team=s.team||[];
  const rows=team.length?team.map(name=>{
    const info=RESEARCHER_INFO[name]||{regional:'—',link:'…/c/xxxx',meta:0,done:0,sync:'online',phone:'5500000000000'};
    const syncPill=info.sync==='online'?'<span class="pill pill-green">● Online</span>':'<span class="pill pill-amber">● Offline</span>';
    const wa='https://wa.me/'+info.phone;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${name.split(' ').map(n=>n[0]).join('')}</div>${name}</div></td>
      <td>${info.regional}</td>
      <td><span class="pill pill-blue">${info.link}</span></td>
      <td>${info.done} / ${info.meta}</td>
      <td>${syncPill}</td>
      <td style="white-space:nowrap">
        <button class="btn-ghost" onclick="alert('Protótipo: link reenviado para ${name}')">Reenviar link</button>
        <a class="btn-ghost" style="color:var(--teal);display:inline-block" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
      </td></tr>`;
  }).join(''):'<tr><td colspan="6" class="empty">Nenhum pesquisador vinculado. Atribua a equipe em Minhas pesquisas.</td></tr>';
  const sample=surveySample(s);
  const collected=surveyCollectedCount(s);
  return head('Coleta e campo — '+s.name,'Pesquisadores vinculados a esta pesquisa',
    '<button class="btn btn-out" onclick="collectBack()">← Pesquisas</button><button class="btn btn-fill" onclick="alert(\'Protótipo: exportar dados brutos (CSV/SPSS)\')">Exportar dados</button>')+`
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
      <div class="card-d">Reenvie o link de coleta ou fale diretamente pelo WhatsApp</div>
      <table><thead><tr><th>Pesquisador</th><th>Regional</th><th>Link</th><th>Coletado</th><th>Sync</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
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
    <div class="card mb" style="padding:0;overflow:hidden">
      <div id="collectMap" style="height:440px;background:var(--bg)"></div>
    </div>
    <div class="card-d" id="collectMapNote" style="margin:-8px 0 14px">Cada ponto no mapa é uma coleta registrada — clique para ver detalhes.</div>
    <div class="card">
      <div class="card-t">Últimas coletas</div>
      <div class="card-d">Chega uma nova entrevista georreferenciada a cada poucos segundos, de qualquer pesquisador da equipe</div>
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
      <div class="card-d">Todas as entrevistas desta pesquisa: pesquisador, cota, coordenadas (com a distância até a coleta anterior do mesmo pesquisador), horário, intervalo desde a entrevista anterior e alertas de qualidade. Reprove uma coleta com fraude/erro (não entra no pagamento do pesquisador) ou marque como calibração (fica fora do cálculo dos resultados, mas continua contando para o pagamento). As duas ações podem ser desfeitas a qualquer momento, aqui ou no painel acima.</div>
      <div style="overflow-x:auto">
      <table><thead><tr><th>Pesquisador</th><th>Cota</th><th>Data/hora</th><th title="Tempo desde a entrevista anterior do mesmo pesquisador">Intervalo</th><th>Coordenadas</th><th>Precisão</th><th>Status</th><th>Alertas</th><th>Ações</th></tr></thead>
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
    cota:row.quota_label||'',
    lat:row.lat,lng:row.lng,acc:row.accuracy_m,
    ts:row.occurred_at?new Date(row.occurred_at).getTime():Date.now(),
    synced:row.synced!==false,
    flags:row.flags||[],
    status:row.status||'valid',
    rejectReason:row.reject_reason||null,
    rejectedAt:row.rejected_at?new Date(row.rejected_at).getTime():null,
    calibration:!!row.is_calibration,
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
    const {data,error}=await sb.from('collection_events').select('*').order('occurred_at',{ascending:false});
    if(!error){COLLECT_EVENTS=(data||[]).map(collectionEventRowToEntry);COLLECT_EVENTS_LOADED=true;}
    else console.error('Erro ao carregar coletas:',error);
  }catch(ex){console.error('Erro de conexão ao carregar coletas:',ex);}
  COLLECT_EVENTS_LOADING=false;
  const onKey=document.querySelector('.nav-item.on');
  const k=onKey&&onKey.dataset.key;
  if(k==='collect'||k==='app-collect'||k==='my-earnings'||k==='dashboard')go(k);
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
  try{
    const {data,error}=await sb.from('collection_events').select('*').order('occurred_at',{ascending:false});
    if(error)return;
    COLLECT_EVENTS=(data||[]).map(collectionEventRowToEntry);
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
    if(COLLECT_IDX!==idx)return;
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
function renderCollectMap(idx){
  const mapEl=document.getElementById('collectMap');
  if(!mapEl)return;
  if(typeof L==='undefined'){
    mapEl.innerHTML='<div class="empty" style="padding:60px 0">Mapa indisponível — sem internet para carregar a biblioteca de mapas.</div>';
    return;
  }
  if(!_collectMap||_collectMap._container!==mapEl){
    if(_collectMap){try{_collectMap.remove();}catch(e){}}
    _collectMap=L.map(mapEl,{scrollWheelZoom:false}).setView([-18.5,-44.9],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(_collectMap);
    _collectMarkerLayer=L.layerGroup().addTo(_collectMap);
  }
  _collectMarkerLayer.clearLayers();
  const s=SURVEYS[idx];if(!s)return;
  const team=s.team||[];
  const colorFor=name=>COLLECT_COLORS[team.indexOf(name)%COLLECT_COLORS.length]||'#2563eb';
  const allEvents=eventsForSurveyIdx(idx);
  const events=allEvents.slice(0,COLLECT_MAP_MAX_POINTS);
  const shown=events.length;
  const total=allEvents.length;
  const latestTsByName={},latestIdByName={};
  events.forEach(e=>{
    if(!(e.name in latestTsByName)||e.ts>latestTsByName[e.name]){latestTsByName[e.name]=e.ts;latestIdByName[e.name]=e.id;}
  });
  events.forEach(e=>{
    const color=colorFor(e.name);
    const isLatest=latestIdByName[e.name]===e.id;
    const ring=e.status==='rejected'?'#dc2626':e.calibration?'#2563eb':'#fff';
    const size=isLatest?16:10;
    const opacity=isLatest?1:0.6;
    const icon=L.divIcon({
      html:`<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,.45);opacity:${opacity}"></span>`,
      className:'',iconSize:[size,size]});
    L.marker([e.lat,e.lng],{icon}).addTo(_collectMarkerLayer).bindPopup(buildMapPopup(e,isLatest));
  });
  const note=document.getElementById('collectMapNote');
  if(note)note.textContent=shown<total?`Mostrando as ${shown} coletas mais recentes de ${total}. Cada ponto é uma coleta — clique para ver detalhes.`:'Cada ponto no mapa é uma coleta registrada — clique para ver detalhes.';
  const pts=events.map(e=>[e.lat,e.lng]);
  if(pts.length){try{_collectMap.fitBounds(pts,{padding:[50,50],maxZoom:9});}catch(e){}}
}
function buildMapPopup(e,isLatest){
  const statusExtra=e.status==='rejected'
    ?'<div style="margin-top:4px"><span class="pill pill-red">✕ Reprovada</span></div>'+(e.rejectReason?`<div style="font-size:11px;color:var(--ink3);margin-top:2px;max-width:180px">Motivo: ${esc(e.rejectReason)}</div>`:'')
    :e.calibration?'<div style="margin-top:4px"><span class="pill pill-blue">◎ Calibração</span></div>'
    :'';
  return `<div style="min-width:175px">
    <b>${esc(e.name)}</b>${isLatest?' <span style="font-size:10px;color:var(--teal)">· última coleta</span>':''}<br>
    ${esc(e.cota)}<br>
    ${new Date(e.ts).toLocaleString('pt-BR')} · ±${Math.round(e.acc)}m<br>
    ${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente</span>'}
    ${statusExtra}
    <div style="margin-top:8px"><button class="btn-ghost" style="font-size:11px;padding:4px 8px;width:100%" onclick="goToAuditFromMap('${e.id}')">🔎 Ver na auditoria</button></div>
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
      <div class="avatar" style="width:26px;height:26px;font-size:10.5px;flex-shrink:0">${e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
      <div style="flex:1"><b>${e.name}</b> coletou <span style="color:var(--ink3)">${e.cota}</span></div>
      <span style="color:var(--ink3);white-space:nowrap">${geoAgo(e.ts)}</span>
      <span class="pill ${e.synced?'pill-green':'pill-amber'}" style="flex-shrink:0">${e.synced?'Sincronizado':'Pendente'}</span>
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
  const R=6371000,toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m){
  return m<1000?Math.round(m)+'m':(m/1000).toFixed(1)+'km';
}
function renderAudit(idx){
  const el=document.getElementById('auditBody');if(!el)return;
  const all=eventsForSurveyIdx(idx);
  const byName={};
  all.forEach(e=>{(byName[e.name]=byName[e.name]||[]).push(e);});
  Object.values(byName).forEach(arr=>arr.sort((a,b)=>a.ts-b.ts));
  const gapOf=e=>{
    const arr=byName[e.name];
    const i=arr.findIndex(x=>x.id===e.id);
    return i>0?e.ts-arr[i-1].ts:null;
  };
  const distOf=e=>{
    const arr=byName[e.name];
    const i=arr.findIndex(x=>x.id===e.id);
    return i>0?distMeters(e.lat,e.lng,arr[i-1].lat,arr[i-1].lng):null;
  };
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
    const flags=(e.flags||[]).slice();
    if(suspect)flags.push('Intervalo muito curto p/ outra entrevista');
    if(distSuspect)flags.push('Georreferenciamento muito próximo da coleta anterior');
    const rejected=e.status==='rejected';
    const statusCell=`${e.synced?'<span class="pill pill-green">Sincronizado</span>':'<span class="pill pill-amber">Pendente</span>'}`+
      (rejected?`<div style="margin-top:5px"><span class="pill pill-red" title="${esc(e.rejectReason||'')}">✕ Reprovada</span><div style="font-size:10.5px;color:var(--ink3);margin-top:2px;max-width:170px">${esc(e.rejectReason||'')}</div></div>`:'')+
      (e.calibration?'<div style="margin-top:5px"><span class="pill pill-blue">◎ Calibração</span></div>':'');
    const actionsCell=`<div style="display:flex;flex-direction:column;gap:4px;white-space:nowrap">
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditReject('${e.id}')">${rejected?'↺ Reaprovar':'✕ Reprovar'}</button>
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" onclick="auditToggleCalibration('${e.id}')">${e.calibration?'↺ Nos resultados':'◎ Calibração'}</button>
    </div>`;
    return `<tr data-eid="${e.id}"${rejected?' style="background:var(--red-l)"':''}>
      <td>${e.name}</td>
      <td>${e.cota}</td>
      <td>${new Date(e.ts).toLocaleString('pt-BR')}</td>
      <td>${gapCell}</td>
      <td>${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}${distNote}</td>
      <td>±${Math.round(e.acc)}m</td>
      <td>${statusCell}</td>
      <td>${flags.length?flags.map(f=>'<span class="pill pill-red" style="margin-right:4px;white-space:nowrap">'+f+'</span>').join(''):'<span style="color:var(--ink3)">—</span>'}</td>
      <td>${actionsCell}</td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" class="empty">Nenhuma coleta registrada ainda.</td></tr>';
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
    const btns=(e.status==='rejected'?`<button class="btn-ghost" style="font-size:11.5px;padding:4px 9px" onclick="auditReject('${e.id}')">↺ Desfazer reprovação</button>`:'')+
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

/* ============ APP COLLECT (mobile) ============ */
PAGES['app-collect']=()=>head('Coletar (app)','Versão de campo · georreferenciamento obrigatório · envio direto ao servidor')+`
  <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start">
    <div class="phone">
      <div class="phone-screen">
        <div class="phone-status"><span>9:41</span><span id="acollectSurveyLabel">Pesquisa ▾</span><span>◖ 87%</span></div>
        <div class="phone-body">
          <div id="geoStatus" class="offline-banner">🛰️ Verificando localização…</div>
          <div id="acollectSurveyPicker"></div>
          <div id="acollectQuotas"><div class="empty" style="padding:10px 0">Carregando cotas…</div></div>
          <div id="acollectMsg"></div>
          <button id="startCollectBtn" class="btn-primary" style="height:40px;margin-top:12px;font-size:14px" disabled onclick="acollectStart()">▶ Iniciar coleta</button>
          <div id="geoHint" style="font-size:10.5px;color:var(--ink3);text-align:center;margin-top:6px">Ative a localização para liberar a coleta</div>
        </div>
        <div class="phone-tabbar">
          <div class="phone-tab on"><span class="pt-ico">▶</span>Coletar</div>
          <div class="phone-tab"><span class="pt-ico">↻</span>Sincronizar</div>
          <div class="phone-tab"><span class="pt-ico">$</span>Ganhos</div>
          <div class="phone-tab"><span class="pt-ico">☺</span>Perfil</div>
        </div>
      </div>
    </div>
    <div style="flex:1;min-width:280px">
      <div class="card mb">
        <div class="card-t">📍 Georreferenciamento obrigatório</div>
        <div class="card-d">O app pede permissão de localização assim que abre. Sem o GPS ativo, o botão "Iniciar coleta" fica bloqueado.</div>
        <ul class="checklist" style="margin-top:2px">
          <li><span class="ck">✓</span>Localização é exigida antes de iniciar qualquer entrevista, para qualquer cota</li>
          <li><span class="ck">✓</span>Coordenadas, horário e cota ficam gravados de verdade no banco assim que a coleta é enviada</li>
          <li><span class="ck">✓</span>O pesquisador só enxerga e escolhe as cotas desta pesquisa que ainda faltam</li>
          <li><span class="ck">✓</span>Entrevista muito rápida (menos de 1 min entre iniciar e enviar) é sinalizada para a auditoria</li>
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
    if(s.quotaOff&&s.quotaOff[q.id])return;
    const qQuotas=(s.quotas&&s.quotas[q.id])||{};
    Object.keys(qQuotas).forEach(oiStr=>{
      const pct=qQuotas[oiStr];
      if(pct==null)return;
      const oi=+oiStr;
      const label=(q.opts&&q.opts[oi])||('Opção '+(oi+1));
      out.push({label,pct,target:Math.max(1,Math.round(sample*pct/100))});
    });
  });
  return out;
}

let ACOLLECT_SURVEY_ID=null,ACOLLECT_QUOTA_COUNTS={},ACOLLECT_QUOTA_LIST=[];
let ACOLLECT_SELECTED_QUOTA=null,ACOLLECT_IN_PROGRESS=false,ACOLLECT_SUBMITTING=false,ACOLLECT_STARTED_AT=null;
let ACOLLECT_TICK=null;
const ACOLLECT_MIN_SECONDS=60; /* entrevista concluída mais rápido que isso é sinalizada na auditoria */

async function initGeoCollect(){
  requestGeo();
  if(!SURVEYS_LOADED)await loadSurveysIfNeeded();
  if(!COLLECT_EVENTS_LOADED)await loadCollectEventsIfNeeded();
  renderAcollectSurveyPicker();
  await acollectLoadQuotasForCurrent();
  renderGeoLog();
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
    el.innerHTML='<div class="card-d" style="margin:6px 0 10px">Esta pesquisa não tem cotas configuradas — pode coletar livremente.</div>';
    if(!ACOLLECT_IN_PROGRESS)ACOLLECT_SELECTED_QUOTA='';
    renderAcollectActionState();
    return;
  }
  el.innerHTML='<div style="font-weight:700;font-size:13px;margin-bottom:4px">Cotas de hoje</div>'+
    '<div style="font-size:11px;color:var(--ink3);margin-bottom:10px">Toque numa cota disponível para escolher</div>'+
    ACOLLECT_QUOTA_LIST.map((q,qi)=>{
      const done=ACOLLECT_QUOTA_COUNTS[q.label]||0;
      const full=done>=q.target;
      const selected=ACOLLECT_SELECTED_QUOTA===q.label;
      const pct=Math.min(100,Math.round(done/q.target*100));
      const color=full?'var(--teal)':'var(--accent)';
      const clickable=!full&&!ACOLLECT_IN_PROGRESS;
      return `<div class="q-card" style="padding:10px;margin-bottom:8px;cursor:${clickable?'pointer':'default'};${selected?'border-color:var(--accent)':''}${full?';opacity:.65':''}" ${clickable?`onclick="acollectSelectQuotaIdx(${qi})"`:''}>
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600"><span>${esc(q.label)}</span><span style="color:${color}">${done}/${q.target}${full?' ✓':''}</span></div>
        <div class="bar" style="margin-top:6px"><span style="width:${pct}%;background:${color}"></span></div>
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
    actionsEl.innerHTML=`<div class="online-banner" style="margin-bottom:8px">▶ Entrevista em andamento — ${acollectElapsedLabel()}</div>
      <button class="btn-primary" style="height:40px;font-size:14px;width:100%" ${ACOLLECT_SUBMITTING?'disabled':''} onclick="acollectSubmit()">${ACOLLECT_SUBMITTING?'Enviando…':'✓ Concluir e enviar'}</button>
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
  if(hint)hint.textContent=!geoOk?geoStatusUi().hint:!hasSurvey?'Nenhuma pesquisa em campo atribuída a você':!hasQuota?'Escolha uma cota para liberar a coleta':'Localização ativa — pode coletar';
}
function acollectStart(){
  if(GEO.status!=='granted'||!ACOLLECT_SURVEY_ID)return;
  if(ACOLLECT_SELECTED_QUOTA===null||ACOLLECT_SELECTED_QUOTA===undefined)return;
  ACOLLECT_IN_PROGRESS=true;
  ACOLLECT_STARTED_AT=Date.now();
  renderAcollectActionState();
}
function acollectCancel(){
  ACOLLECT_IN_PROGRESS=false;
  ACOLLECT_STARTED_AT=null;
  ACOLLECT_SUBMITTING=false;
  if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
  renderAcollectQuotas();
}
async function loadCollectEventsForced(){
  try{
    const {data,error}=await sb.from('collection_events').select('*').order('occurred_at',{ascending:false});
    if(!error){COLLECT_EVENTS=(data||[]).map(collectionEventRowToEntry);COLLECT_EVENTS_LOADED=true;}
  }catch(ex){ /* mantém os dados já carregados se a nova busca falhar */ }
}
/* envia a entrevista de verdade: geolocalização + horário + cota escolhida
   viram uma linha real em collection_events. Sinaliza automaticamente se a
   entrevista foi concluída rápido demais para ter sido aplicada de verdade
   (menos de ACOLLECT_MIN_SECONDS entre "Iniciar" e "Concluir e enviar") —
   fica visível para o staff na aba Auditoria. */
async function acollectSubmit(){
  if(!ACOLLECT_IN_PROGRESS||ACOLLECT_SUBMITTING)return;
  if(GEO.status!=='granted'){alert('A localização foi perdida — aguarde reconectar antes de enviar.');return;}
  ACOLLECT_SUBMITTING=true;
  renderAcollectActionState();
  const elapsedMs=Date.now()-ACOLLECT_STARTED_AT;
  const flags=[];
  if(elapsedMs<ACOLLECT_MIN_SECONDS*1000)flags.push('Tempo de aplicação muito curto');
  const quotaLabel=ACOLLECT_SELECTED_QUOTA||null;
  try{
    const {error}=await sb.from('collection_events').insert({
      survey_id:ACOLLECT_SURVEY_ID,
      researcher_id:CURRENT_PROFILE.id,
      quota_label:quotaLabel,
      lat:GEO.lat,lng:GEO.lng,accuracy_m:GEO.acc,
      occurred_at:new Date().toISOString(),
      synced:true,
      flags,
      status:'valid',
      is_calibration:false,
    });
    if(error)throw new Error(error.message);
  }catch(ex){
    ACOLLECT_SUBMITTING=false;
    renderAcollectActionState();
    alert('Não foi possível enviar a coleta agora ('+ex.message+'). A entrevista continua em andamento — tente enviar de novo quando tiver internet.');
    return;
  }
  ACOLLECT_IN_PROGRESS=false;ACOLLECT_SUBMITTING=false;ACOLLECT_STARTED_AT=null;ACOLLECT_SELECTED_QUOTA=null;
  if(ACOLLECT_TICK){clearInterval(ACOLLECT_TICK);ACOLLECT_TICK=null;}
  PAYMENTS_LOADED=false; // financeiro recalculado no banco (gatilho) — recarrega na próxima visita
  await loadCollectEventsForced();
  ACOLLECT_QUOTA_COUNTS=await loadQuotaCounts(ACOLLECT_SURVEY_ID);
  renderAcollectQuotas();
  renderGeoLog();
  const msg=document.getElementById('acollectMsg');
  if(msg){
    msg.innerHTML='<div class="online-banner">✓ Coleta enviada com sucesso</div>';
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
PAGES.reports=()=>head('Relatórios','Tabulação, cruzamento de variáveis e gráficos personalizados',
  '<button class="btn btn-out" onclick="alert(\'Protótipo: exportar PDF / PPTX / Excel\')">Exportar</button><button class="btn btn-fill" onclick="alert(\'Protótipo: salvar relatório\')">+ Novo cruzamento</button>')+`
  <div class="card mb">
    <div class="card-t">Montar cruzamento</div>
    <div class="card-d">Escolha até três variáveis para gerar a tabulação e o gráfico</div>
    <div class="field-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div><label class="lbl">Variável (linha)</label>
        <select class="inp" id="rp-x" onchange="renderReport()">
          <option>Intenção de voto</option><option>Avaliação da gestão</option><option>Rejeição</option></select></div>
      <div><label class="lbl">Cruzar com (coluna)</label>
        <select class="inp" id="rp-y" onchange="renderReport()">
          <option>Faixa etária</option><option>Sexo</option><option>Macrorregião</option><option>Escolaridade</option></select></div>
      <div><label class="lbl">3ª variável (segmentar) <span style="color:var(--ink3);font-weight:400">opcional</span></label>
        <select class="inp" id="rp-z" onchange="renderReport()">
          <option value="">— nenhuma —</option><option>Sexo</option><option>Macrorregião</option><option>Escolaridade</option></select></div>
      <div><label class="lbl">Tipo de gráfico</label>
        <select class="inp" id="rp-type" onchange="renderReport()">
          <option value="bar">Barras agrupadas</option><option value="bar-stack">Barras empilhadas</option><option value="line">Linhas</option><option value="pie">Pizza</option></select></div>
    </div>
  </div>
  <div id="rp-output"></div>
  <div class="callout" style="margin-top:16px"><b>Cruzamento de até 3 variáveis:</b> as duas primeiras formam a tabela (linha × coluna) e a 3ª segmenta o resultado, gerando um gráfico e uma tabela para cada categoria dela (ex.: Voto × Idade, separado por Sexo).</div>`;

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
const ROLE_LABEL={admin:'Administrador',coord:'Coordenador',gerente:'Gerente',pesq:'Pesquisador',cliente:'Cliente',admpro:'ADM PesquisaPro',vendedor:'Vendedor',indicador:'Indicador de Clientes'};
const ROLE_PILL={
  admin:'<span class="pill" style="background:var(--purple-l);color:var(--purple)">Administrador</span>',
  coord:'<span class="pill pill-blue">Coordenador</span>',
  gerente:'<span class="pill pill-amber">Gerente</span>',
  pesq:'<span class="pill pill-gray">Pesquisador</span>',
  cliente:'<span class="pill" style="background:#eef2ff;color:#4338ca">Cliente</span>',
  admpro:'<span class="pill" style="background:var(--purple-l);color:var(--purple)">ADM PesquisaPro</span>',
  vendedor:'<span class="pill pill-blue">Vendedor</span>',
  indicador:'<span class="pill pill-amber">Indicador de Clientes</span>',
};
/* abas de gestão da tela Usuários — cada perfil é gerenciado separadamente */
const USER_TABS=[
  {key:'pesq',label:'Pesquisadores'},
  {key:'cliente',label:'Clientes'},
  {key:'admpro',label:'ADM PesquisaPro'},
  {key:'vendedor',label:'Vendedores'},
  {key:'indicador',label:'Indicadores de Clientes'},
  {key:'staff',label:'Administração'},
];
const USER_TAB_ROLES={pesq:['pesq'],cliente:['cliente'],admpro:['admpro'],vendedor:['vendedor'],indicador:['indicador'],staff:['admin','coord','gerente']};
let USER_TAB='pesq';
function usersInTab(tab){const roles=USER_TAB_ROLES[tab]||[];return USERS.map((u,i)=>({u,i})).filter(x=>roles.includes(x.u.role));}
function clienteUsers(){return USERS.filter(u=>u.role==='cliente');}
function pesqUsers(){return USERS.filter(u=>u.role==='pesq');}
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

function staffRoleOf(role){return ['admin','coord','gerente'].includes(role);}
function lightRoleOf(role){return ['admpro','vendedor','indicador'].includes(role);}

function profileRowToUser(row){
  const base={id:row.id,name:row.name,email:row.email||'',phone:row.phone||'',role:row.role,status:row.status};
  if(staffRoleOf(row.role))return {...base,cpf:row.cpf||'',birth:row.birth||'',addr:row.cidade||'',doc:row.doc_url||''};
  if(row.role==='cliente')return {...base,company:row.name,cpfCnpj:row.cpf_cnpz||row.cpf_cnpj||'',pfpj:row.pf_pj||'pj',birth:row.birth||'',
    contact:row.contact_person||'',cidade:row.cidade||'',rua:row.rua||'',numero:row.numero||'',cep:row.cep||'',
    surveys:[],resultsReleased:!!row.results_released};
  if(row.role==='pesq')return {...base,cpf:row.cpf||'',birth:row.birth||'',cidade:row.cidade||'',rua:row.rua||'',numero:row.numero||'',cep:row.cep||'',
    docFoto:row.doc_foto_url||'',docComprovante:row.doc_comprovante_url||'',
    cidadesAtuacao:(row.profile_cidades_atuacao||[]).map(c=>c.cidade),
    pixKey:row.pix_key||'',pixDoc:row.pix_doc||'',pixBank:row.pix_bank||'',pixAg:row.pix_ag||'',pixAcc:row.pix_acc||''};
  return {...base,cpf:row.cpf||'',cidade:row.cidade||''}; // admpro, vendedor, indicador
}
function userToProfileRow(rec,role){
  const row={role,status:rec.status||'ativo',name:rec.name,email:rec.email||null,phone:rec.phone||null};
  if(staffRoleOf(role)){row.cpf=rec.cpf||null;row.birth=rec.birth||null;row.cidade=rec.addr||null;row.doc_url=rec.doc||null;}
  else if(role==='cliente'){row.cpf_cnpj=rec.cpfCnpj||null;row.pf_pj=rec.pfpj||'pj';row.birth=rec.birth||null;row.contact_person=rec.contact||null;
    row.cidade=rec.cidade||null;row.rua=rec.rua||null;row.numero=rec.numero||null;row.cep=rec.cep||null;row.results_released=!!rec.resultsReleased;}
  else if(role==='pesq'){row.cpf=rec.cpf||null;row.birth=rec.birth||null;row.cidade=rec.cidade||null;row.rua=rec.rua||null;row.numero=rec.numero||null;row.cep=rec.cep||null;
    row.doc_foto_url=rec.docFoto||null;row.doc_comprovante_url=rec.docComprovante||null;
    row.pix_key=rec.pixKey||null;row.pix_doc=rec.pixDoc||null;row.pix_bank=rec.pixBank||null;row.pix_ag=rec.pixAg||null;row.pix_acc=rec.pixAcc||null;}
  else{row.cpf=rec.cpf||null;row.cidade=rec.cidade||null;} // admpro, vendedor, indicador
  return row;
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
      const {data,error}=await sb.from('profiles').select('*, profile_cidades_atuacao(cidade)').order('created_at',{ascending:false});
      if(!error){USERS=(data||[]).map(profileRowToUser);USERS_LOADED=true;}
      else console.error('Erro ao carregar usuários:',error);
    }catch(ex){console.error('Erro de conexão ao carregar usuários:',ex);}
    USERS_LOADING=false;
    _usersLoadPromise=null;
    refreshClientSurveyLinks();
    const onKey=document.querySelector('.nav-item.on');
    const k=onKey&&onKey.dataset.key;
    if(k==='users'||k==='dashboard'||k==='survey-team')go(k);
  })();
  return _usersLoadPromise;
}
async function syncPesqCidades(profileId,cidades){
  await sb.from('profile_cidades_atuacao').delete().eq('profile_id',profileId);
  if(cidades&&cidades.length){
    await sb.from('profile_cidades_atuacao').insert(cidades.map(c=>({profile_id:profileId,cidade:c})));
  }
}
async function createLoginAndProfile(email,password,role,rec){
  const tmp=tempAuthClient();
  const {data,error}=await tmp.auth.signUp({email,password});
  if(error)throw new Error('Não foi possível criar o login: '+error.message);
  if(!data||!data.user)throw new Error('Não foi possível criar o login.');
  const row=userToProfileRow(rec,role);
  row.id=data.user.id;
  const {data:inserted,error:insErr}=await sb.from('profiles').insert(row).select().single();
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
};

const CLIENT_STATUS={ativo:'<span class="pill pill-green">● Ativo</span>',prospecto:'<span class="pill pill-amber">● Prospecto</span>',encerrado:'<span class="pill pill-gray">● Encerrado</span>'};
const USER_TAB_NEW_LABEL={pesq:'pesquisador',cliente:'cliente',admpro:'ADM PesquisaPro',vendedor:'vendedor',indicador:'indicador de clientes',staff:'usuário administrativo'};
PAGES.users=()=>{
  if(selectedRole!=='admin'){
    return head('Usuários','Gestão de usuários')+`
      <div class="callout warn">Apenas usuários com perfil <b>Administrador</b> podem cadastrar e gerenciar usuários. Você está conectado como <b>${ROLE_LABEL[selectedRole]}</b>.</div>`;
  }
  if(!USERS_LOADED){
    loadUsersIfNeeded();
    return head('Usuários','Gestão de usuários')+'<div class="empty">Carregando usuários do banco de dados…</div>';
  }
  if(USER_VIEW!=null)return userView();
  if(USER_EDIT!=null)return userForm();
  return userList();
};
function userSetTab(tab){USER_TAB=tab;USER_VIEW=null;USER_EDIT=null;USER_ARMED=true;go('users');}
function userTabBar(){
  return `<div class="seg" style="flex-wrap:wrap;margin-bottom:16px">
    ${USER_TABS.map(t=>`<button class="${USER_TAB===t.key?'on':''}" onclick="userSetTab('${t.key}')">${t.label}</button>`).join('')}
  </div>`;
}
function userTabStats(tab){
  const list=usersInTab(tab).map(x=>x.u);
  if(tab==='pesq'){
    return `<div class="grid g4" style="margin-bottom:16px">
      ${stat('Pesquisadores',String(list.length),'cadastrados','☺','#2563eb')}
      ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'liberados para coleta','✓','#059669')}
      ${stat('Pendentes',String(list.filter(u=>u.status==='pendente').length),'aguardando aprovação','◷','#d97706')}
      ${stat('Docs faltando',String(list.filter(u=>!u.docFoto||!u.docComprovante).length),'com algum documento pendente','◷','#dc2626')}
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
  return `<div class="grid g2" style="margin-bottom:16px">
    ${stat(tabLabel,String(list.length),'cadastrados','☺','#2563eb')}
    ${stat('Ativos',String(list.filter(u=>u.status==='ativo').length),'liberados no sistema','✓','#059669')}
  </div>`;
}
function userTableHead(tab){
  if(tab==='pesq')return '<tr><th>Nome</th><th>CPF</th><th>Cidades de atuação</th><th>Documentos</th><th>PIX</th><th>Status</th><th></th></tr>';
  if(tab==='cliente')return '<tr><th>Cliente</th><th>CPF/CNPJ</th><th>Celular</th><th>Pesquisas</th><th>Status</th><th></th></tr>';
  return '<tr><th>Nome</th><th>CPF</th><th>Perfil</th><th>Celular</th><th>Status</th><th></th></tr>';
}
function userTableRows(tab){
  const items=usersInTab(tab);
  if(items.length===0){
    const colspan=tab==='pesq'?7:6;
    return `<tr><td colspan="${colspan}" class="empty">Nenhum cadastro nesta aba ainda.</td></tr>`;
  }
  if(tab==='pesq'){
    return items.map(({u,i})=>{
      const st=u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>';
      const docsOk=u.docFoto&&u.docComprovante;
      const docCount=(u.docFoto?1:0)+(u.docComprovante?1:0);
      const docPillTop=docsOk?'<span class="pill pill-green">● 2/2 anexados</span>':`<span class="pill pill-red">● ${docCount}/2 anexados</span>`;
      const docLine=(val)=>val?`<div style="font-size:11px;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="${esc(val)}"><a href="#" onclick="event.stopPropagation();event.preventDefault();alert('Protótipo: abrir/baixar documento')" style="color:var(--teal);text-decoration:none">📎 ${esc(val)}</a></div>`:'';
      const docPill=`<div>${docPillTop}</div>${docLine(u.docFoto)}${docLine(u.docComprovante)}`;
      const pixPill=u.pixKey?`<span class="pill pill-green" title="${esc(u.pixBank||'')} ${esc(u.pixAg||'')}/${esc(u.pixAcc||'')}">● ${esc((u.pixKey||'').length>16?u.pixKey.slice(0,15)+'…':u.pixKey)}</span>`:'<span class="pill pill-gray">— não informado</span>';
      const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
      const nCidades=(u.cidadesAtuacao||[]).length;
      return `<tr style="cursor:pointer" onclick="userShow(${i})">
        <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${initials}</div>
          <div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--ink3)">${esc(u.email)}</div></div></div></td>
        <td>${esc(u.cpf)}</td>
        <td>${nCidades?nCidades+' cidade'+(nCidades===1?'':'s'):'<span style="color:var(--ink3)">—</span>'}</td>
        <td>${docPill}</td>
        <td>${pixPill}</td>
        <td>${st}</td>
        <td style="white-space:nowrap" onclick="event.stopPropagation()">
          ${u.status!=='ativo'?`<button class="btn-ghost" style="color:var(--teal)" onclick="userPesqApproveList(${i})">Aprovar</button>`:''}
          <button class="btn-ghost" onclick="userShow(${i})">Ver dados</button>
          <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
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
      <td style="white-space:nowrap" onclick="event.stopPropagation()">
        <button class="btn-ghost" onclick="userShow(${i})">Abrir</button>
        <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
        <button class="btn-ghost" style="color:var(--red)" onclick="userDelete(${i})">Excluir</button>
      </td></tr>`).join('');
  }
  return items.map(({u,i})=>{
    const st=u.status==='ativo'?'<span class="pill pill-green">● Ativo</span>':'<span class="pill pill-amber">● Pendente</span>';
    const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
    return `<tr style="cursor:pointer" onclick="userShow(${i})">
      <td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">${initials}</div>
        <div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--ink3)">${esc(u.email||'')}</div></div></div></td>
      <td>${esc(u.cpf||'')}</td>
      <td>${ROLE_PILL[u.role]||u.role}</td>
      <td>${esc(u.phone||'')}</td>
      <td>${st}</td>
      <td style="white-space:nowrap" onclick="event.stopPropagation()">
        <button class="btn-ghost" onclick="userShow(${i})">Ver dados</button>
        <button class="btn-ghost" onclick="userOpen(${i})">Editar</button>
        <button class="btn-ghost" style="color:var(--red)" onclick="userDelete(${i})">Excluir</button>
      </td></tr>`;
  }).join('');
}
let USER_SIGNUP_OPEN=false;
function userSignupToggle(){USER_SIGNUP_OPEN=!USER_SIGNUP_OPEN;go('users');}
function userList(){
  const tab=USER_TAB;
  const extras = tab==='pesq' ? `
  <div class="card mb" style="margin-top:16px">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="card-t" style="margin:0">Novos cadastros aguardando aprovação</div>
      <span class="pill pill-amber" style="margin-left:auto">${SIGNUPS.length}</span>
    </div>
    <div class="card-d">Cadastros feitos pelo próprio pesquisador via link/QR Code de autocadastro. Aprove, diligencie (devolve para correção) ou reprove.</div>
    <div id="signup-list">${signupRows()}</div>
  </div>
  <div class="card" style="margin-top:16px">
    <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="userSignupToggle()">
      <div class="card-t" style="margin:0">🔗 Autocadastro — link e QR Code</div>
      <span style="margin-left:auto;color:var(--ink3);font-size:13px">${USER_SIGNUP_OPEN?'Ocultar ▴':'Mostrar ▾'}</span>
    </div>
    ${USER_SIGNUP_OPEN?`
    <div class="card-d">Envie para que a pessoa preencha o próprio cadastro com todos os campos obrigatórios. O cadastro entra na fila acima para sua aprovação.</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <input class="inp" value="pesquisapro.com.br/cadastro/mg2026-x8f3" readonly>
      <button class="btn btn-out" onclick="alert('Protótipo: link copiado')">Copiar</button>
    </div>
    <div style="display:flex;gap:14px;align-items:center">
      <div id="signup-qr" class="qr-box"></div>
      <div style="flex:1">
        <button class="btn btn-fill" style="width:100%;margin-bottom:8px;background:var(--teal)" onclick="sendSignupWhatsApp()">Enviar link + QR por WhatsApp</button>
        <button class="btn btn-out" style="width:100%;margin-bottom:8px" onclick="alert('Protótipo: link enviado por e-mail')">Enviar por e-mail</button>
        <button class="btn btn-out" style="width:100%" onclick="alert('Protótipo: QR Code baixado/impresso')">Baixar QR Code</button>
      </div>
    </div>`:''}
  </div>
  <div class="callout" style="margin-top:16px">Todo pesquisador é cadastrado por um administrador, ou via autocadastro por link/QR com aprovação. Campos obrigatórios: nome completo, CPF, data de nascimento, celular, cidade, rua, número, CEP, e-mail, chave PIX, até 5 cidades de atuação e os 2 documentos (com foto e comprovante de residência).</div>`
  : tab==='cliente' ? `
  <div class="callout" style="margin-top:16px">Clientes são cadastrados manualmente por um administrador — não há autocadastro para este perfil.</div>`
  : `
  <div class="callout" style="margin-top:16px">Este perfil só pode ser incluído manualmente pelo Administrador master ou por um ADM PesquisaPro autorizado — não há autocadastro.</div>`;
  return head('Usuários','Cadastre e gerencie os diferentes perfis de usuário do sistema',
    `<button class="btn btn-fill" onclick="userOpen('new')">+ Novo ${USER_TAB_NEW_LABEL[tab]||'usuário'}</button>`)+
  userTabBar()+
  userTabStats(tab)+
  `<div class="card">
    <table><thead>${userTableHead(tab)}</thead>
    <tbody>${userTableRows(tab)}</tbody></table>
  </div>${extras}`;
}
function signupRows(){
  if(SIGNUPS.length===0)return '<div class="empty">Nenhum cadastro pendente.</div>';
  return SIGNUPS.map((s,i)=>{
    const initials=s.name.split(' ').map(n=>n[0]).slice(0,2).join('');
    const docsOk=s.docFoto&&s.docComprovante;
    const docCount=(s.docFoto?1:0)+(s.docComprovante?1:0);
    const docPill=docsOk?'<span class="pill pill-green">● docs ok</span>':`<span class="pill pill-red">● ${docCount}/2 docs</span>`;
    const note=s.status==='diligencia'&&s.note?`<div class="signup-note">⚠ Em diligência: ${esc(s.note)}</div>`:'';
    return `<div class="signup-row">
      <div class="signup-top">
        <div class="avatar" style="width:30px;height:30px;font-size:11px;background:#d97706">${initials}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${esc(s.name)} ${SIGNUP_PILL[s.status]||''}</div>
          <div style="font-size:11px;color:var(--ink3)">${esc(s.cpf)} · ${esc(s.email)} · ${s.sent}</div>
        </div>
        <button class="btn-ghost" onclick="signupView(${i})">Ver dados</button>
      </div>
      <div class="signup-actions">
        ${docPill}
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
function refreshSignups(){
  const el=document.getElementById('signup-list');if(el)el.innerHTML=signupRows();
}
function renderSignupQR(){
  const box=document.getElementById('signup-qr');if(!box)return;
  box.innerHTML='';
  const url='https://pesquisapro.com.br/cadastro/mg2026-x8f3';
  if(window.QRCode){
    try{ new QRCode(box,{text:url,width:108,height:108,colorDark:'#0f172a',colorLight:'#ffffff'}); return; }catch(e){}
  }
  // fallback visual se a lib não carregou (offline)
  box.innerHTML='<div class="qr-fallback">QR<br>Code<div style="font-size:9px;margin-top:4px;font-weight:400">(requer internet<br>para gerar)</div></div>';
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
function signupView(i){
  const s=SIGNUPS[i];
  const pix=s.pixKey?('\n\nPIX: '+s.pixKey+'\nTitular: '+(s.pixDoc||'—')+'\nBanco: '+(s.pixBank||'—')+' · Ag '+(s.pixAg||'—')+' · Conta '+(s.pixAcc||'—')):'\n\nPIX: não informado';
  const cidades=(s.cidadesAtuacao||[]).join(', ')||'nenhuma informada';
  alert('Cadastro de '+s.name+':\n\nCPF: '+s.cpf+'\nNascimento: '+s.birth+'\nE-mail: '+s.email+'\nCelular: '+s.phone+'\nCidade: '+s.cidade+'\nCidades de atuação: '+cidades+'\nDocumento com foto: '+(s.docFoto||'NÃO ANEXADO')+'\nComprovante de residência: '+(s.docComprovante||'NÃO ANEXADO')+pix);
}
function signupApprove(i){
  const s=SIGNUPS[i];
  if(!s.docFoto||!s.docComprovante){alert('Não é possível aprovar: faltam documentos (documento com foto e/ou comprovante de residência). Use "Diligenciar" para solicitar o envio.');return;}
  if(!confirm('Aprovar o cadastro de '+s.name+'? A pessoa será criada como pesquisador ativo e poderá ser vinculada a pesquisas.'))return;
  USERS.unshift({name:s.name,cpf:s.cpf,birth:s.birth,email:s.email,phone:s.phone,cidade:s.cidade,rua:s.rua||'',numero:s.numero||'',cep:s.cep||'',
    role:'pesq',docFoto:s.docFoto,docComprovante:s.docComprovante,cidadesAtuacao:s.cidadesAtuacao||[],status:'ativo',
    pixKey:s.pixKey||'',pixDoc:s.pixDoc||'',pixBank:s.pixBank||'',pixAg:s.pixAg||'',pixAcc:s.pixAcc||''});
  SIGNUPS.splice(i,1);
  alert('Cadastro aprovado. Pesquisador ativo.');
  go('users');
}
function signupDiligence(i){
  const motivo=prompt('O que precisa ser corrigido/complementado? (a pessoa recebe esta mensagem)','Reenvie a foto do documento legível');
  if(motivo==null)return;
  SIGNUPS[i].status='diligencia';SIGNUPS[i].note=motivo;
  alert('Cadastro devolvido para diligência. A pessoa foi notificada.');
  refreshSignups();
}
function signupReject(i){
  if(!confirm('Reprovar e descartar o cadastro de '+SIGNUPS[i].name+'?'))return;
  SIGNUPS.splice(i,1);
  alert('Cadastro reprovado.');
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
function userWhatsApp(phone){
  const digits=(phone||'').replace(/\D/g,'');
  if(!digits){alert('Este usuário não tem telefone cadastrado.');return;}
  const num=digits.length<=11?'55'+digits:digits;
  window.open('https://wa.me/'+num,'_blank','noopener');
}
function clientWhatsAppMsg(phone,msg){
  const digits=(phone||'').replace(/\D/g,'');
  if(!digits){alert('Cliente sem telefone cadastrado.');return;}
  const num=digits.length<=11?'55'+digits:digits;
  window.open('https://wa.me/'+num+(msg?'?text='+encodeURIComponent(msg):''),'_blank','noopener');
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
    ?`<div class="doc-attached" style="margin:0"><span>📎 ${esc(u.doc)}</span><button class="btn-ghost" onclick="alert('Protótipo: abrir/baixar documento')">abrir</button></div>`
    :'<span class="pill pill-red">● documento não anexado</span>';
  return head(u.name,'Dados do usuário',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp('${esc(u.phone)}')">WhatsApp</button>
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
  </div>`;
}
function userViewPesq(u,idx){
  const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('');
  const dash='<span style="color:var(--ink3);font-weight:400">—</span>';
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:38%">${l}</td><td style="font-weight:600">${v||dash}</td></tr>`;
  const docRow=(label,val)=>val
    ?`<div class="doc-attached" style="margin:0 0 8px"><span>📎 ${esc(label)}: ${esc(val)}</span><button class="btn-ghost" onclick="alert('Protótipo: abrir/baixar documento')">abrir</button></div>`
    :`<div style="margin-bottom:8px"><span class="pill pill-red">● ${esc(label)}: não anexado</span></div>`;
  const cidades=(u.cidadesAtuacao||[]).length
    ?u.cidadesAtuacao.map(c=>`<span class="chip" style="margin:2px">${esc(c)}</span>`).join('')
    :dash;
  return head(u.name,'Dados do pesquisador',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp('${esc(u.phone)}')">WhatsApp</button>
     ${u.status!=='ativo'?`<button class="btn btn-fill" style="background:var(--teal)" onclick="userPesqApprove(${idx})">Aprovar</button>`:''}
     <button class="btn btn-fill" onclick="userEditFromView()">Editar</button>`)+`
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
    <div class="avatar" style="width:54px;height:54px;font-size:20px">${initials}</div>
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
      <div class="card mb">
        <div class="card-t">Documentos obrigatórios</div>
        ${docRow('Documento com foto',u.docFoto)}
        ${docRow('Comprovante de residência',u.docComprovante)}
      </div>
      <div class="card">
        <div class="card-t">Dados para pagamento (PIX)</div>
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
  </div>`;
}
function userViewCliente(u,idx){
  const initials=u.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const dash='<span style="color:var(--ink3);font-weight:400">—</span>';
  const row=(l,v)=>`<tr><td style="color:var(--ink3);width:38%">${l}</td><td style="font-weight:600">${v||dash}</td></tr>`;
  const surveys=(u.surveys||[]).length?u.surveys.map(s=>`<div class="chip" style="margin:2px">${esc(s)}</div>`).join(''):dash;
  const enderecoParts=[[u.rua,u.numero].filter(Boolean).join(', '),u.cidade,u.cep?('CEP '+u.cep):''].filter(Boolean);
  const endereco=enderecoParts.join(' · ');
  return head(u.name,'Dados do cliente',
    `<button class="btn btn-out" onclick="userViewBack()">← Voltar</button>
     <button class="btn btn-out" style="color:var(--teal);border-color:var(--teal)" onclick="userWhatsApp('${esc(u.phone)}')">WhatsApp</button>
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
        <div class="card-d">Envie o formulário da pesquisa para o cliente revisar e aprovar</div>
        <button class="btn btn-fill" style="width:100%;background:var(--teal)" onclick="userClienteSendForm(${idx})">Enviar formulário via WhatsApp</button>
        <button class="btn btn-out" style="width:100%;margin-top:8px" onclick="alert('Protótipo: formulário enviado por e-mail para aprovação')">Enviar por e-mail</button>
      </div>
      <div class="card">
        <div class="card-t">Acesso do cliente (andamento + resultados)</div>
        <div class="card-d">Sem liberar, o cliente só vê o percentual da coleta no perfil dele. Liberando (normalmente após confirmar o pagamento), ele passa a ver o andamento detalhado em tempo real e os resultados da pesquisa.</div>
        <button class="btn ${u.resultsReleased?'btn-out':'btn-fill'}" style="width:100%;${u.resultsReleased?'color:var(--teal);border-color:var(--teal)':''}" onclick="userClienteToggleAccess(${idx})">
          ${u.resultsReleased?'✓ Acesso total liberado — clique para bloquear':'🔓 Liberar acesso total (andamento + resultados)'}
        </button>
        <div class="divider"></div>
        <button class="btn btn-fill" style="width:100%;background:var(--teal)" onclick="userClienteSendReport(${idx})">Enviar relatório via WhatsApp</button>
        <button class="btn btn-out" style="width:100%;margin-top:8px" onclick="alert('Protótipo: relatório (PDF) enviado por e-mail')">Enviar relatório por e-mail</button>
        <button class="btn btn-out" style="width:100%;margin-top:8px" onclick="go('reports')">Abrir relatório (visão interna)</button>
      </div>
    </div>
  </div>`;
}
function approvePesqCommon(i){
  const u=USERS[i];
  if(!u.docFoto||!u.docComprovante){alert('Não é possível aprovar: faltam documentos (documento com foto e/ou comprovante de residência). Edite o cadastro para anexá-los.');return false;}
  if(!confirm('Aprovar o cadastro de '+u.name+'? O pesquisador passará a ficar ativo e poderá ser vinculado a pesquisas.'))return false;
  u.status='ativo';
  alert('Cadastro aprovado. Pesquisador ativo.');
  return true;
}
function userPesqApprove(i){
  if(!approvePesqCommon(i))return;
  USER_VIEW=i;USER_ARMED=true;go('users');
}
function userPesqApproveList(i){
  if(!approvePesqCommon(i))return;
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
function userClienteSendForm(i){
  const c=USERS[i];
  clientWhatsAppMsg(c.phone,'Olá '+(c.contact||c.name)+'! Segue o formulário da pesquisa para sua aprovação: https://pesquisapro.com.br/aprovar/'+(i+1)+'x. Por favor, revise as perguntas e responda com seu aceite.');
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
    if(error){alert('Não foi possível excluir: '+error.message);return;}
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
  const u=isNew?{name:'',cpf:'',phone:'',email:'',cidade:'',role,status:'ativo'}:USERS[USER_EDIT];
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
  const u=isNew?{name:'',cpf:'',birth:'',email:'',phone:'',cidade:'',rua:'',numero:'',cep:'',role:'pesq',status:'ativo',docFoto:'',docComprovante:'',cidadesAtuacao:[],pixKey:'',pixDoc:'',pixBank:'',pixAg:'',pixAcc:''}:USERS[USER_EDIT];
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
      <div class="mb"><label class="lbl">Chave PIX *</label><input class="inp" id="u-pix-key" value="${esc(u.pixKey||'')}" placeholder="CPF, e-mail, telefone ou aleatória"></div>
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
  const rec={name,cpf,phone,email,cidade:g('u-cidade'),role,status:g('u-status')||'ativo'};
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
  const name=g('u-name'),cpf=g('u-cpf'),birth=g('u-birth'),email=g('u-email'),phone=g('u-phone');
  const cidade=g('u-cidade'),cep=g('u-cep'),rua=g('u-rua'),numero=g('u-numero'),pixKey=g('u-pix-key');
  const password=isNew?g('u-password'):'';
  const missing=[];
  if(!name)missing.push('Nome completo');if(!cpf)missing.push('CPF');if(!birth)missing.push('Data de nascimento');
  if(!email)missing.push('E-mail');if(!phone)missing.push('Celular');
  if(!cidade)missing.push('Cidade');if(!cep)missing.push('CEP');if(!rua)missing.push('Rua');if(!numero)missing.push('Número');
  if(!pixKey)missing.push('Chave PIX');
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
  const rec={name,cpf,birth,email,phone,cidade,rua,numero,cep,role:'pesq',status:g('u-status')||'ativo',
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
      const {error}=await sb.from('profiles').update(userToProfileRow(rec,'pesq')).eq('id',USERS[USER_EDIT].id);
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
  if(k==='finance'||k==='my-earnings')go(k);
}
/* define só o status do pagamento (pendente/aprovado/auditoria) — válidos e
   rejeitados não são mais editáveis aqui: vêm de verdade da Coleta de campo
   e são recalculados sozinhos por um gatilho no banco (schema.sql) */
async function saveFinStatus(surveyId,researcherId,status){
  const existing=PAYMENTS.find(p=>p.surveyId===surveyId&&p.researcherId===researcherId);
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
  return{valid,rejected,valor,pendingValor,count:rows.length};
}
PAGES.finance=()=>{
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada')+'<div class="empty">Carregando dados financeiros…</div>';
  }
  if(FIN_IDX!=null)return financeDetail(FIN_IDX);
  return financeList();
};
function financeList(){
  const entries=SURVEYS.map((s,i)=>({s,i,t:finTotals(i)}));
  const totalValor=entries.reduce((a,e)=>a+e.t.valor,0);
  const totalPend=entries.reduce((a,e)=>a+e.t.pendingValor,0);
  const totalValid=entries.reduce((a,e)=>a+e.t.valid,0);
  const totalPesq=entries.reduce((a,e)=>a+e.t.count,0);
  const body=entries.map(({s,i,t})=>`<tr style="cursor:pointer" onclick="financeOpen(${i})">
      <td><b>${esc(s.name)}</b><div style="margin-top:2px">${STATUS_PILL[s.status]||s.status}</div></td>
      <td>${t.count?t.count+' pesquisador'+(t.count===1?'':'es'):'<span style="color:var(--ink3)">sem coleta</span>'}</td>
      <td>${t.valid.toLocaleString('pt-BR')}</td>
      <td><b>${brl(t.valor)}</b></td>
      <td>${t.pendingValor?'<span class="pill pill-amber">'+brl(t.pendingValor)+' pendente</span>':(t.count?'<span class="pill pill-green">Tudo em dia</span>':'<span style="color:var(--ink3)">—</span>')}</td>
      <td><span class="pill pill-blue">Abrir →</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nenhuma pesquisa cadastrada.</td></tr>';
  return head('Financeiro','Pagamentos separados por pesquisa · calculado por entrevista válida coletada')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('A pagar (todas as pesquisas)',brl(totalValor),totalValid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('Pendente de pagamento',brl(totalPend),'dados bancários / auditoria','◷','#d97706')}
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
    const valor=r.valid*price;
    const pixShown=maskPix(r.pixKey);
    return `<tr><td>${esc(r.name)}</td><td>${r.valid}</td><td>${r.rejected}</td><td><b>${brl(valor)}</b></td><td>${pixShown||'<span style="color:var(--ink3)">—</span>'}</td><td>${st.pill}</td>
      <td><button class="btn-ghost" onclick="finEditPayment(${idx},'${r.researcherId}')">Definir status</button></td></tr>`;
  }).join(''):'<tr><td colspan="7" class="empty">Nenhum pesquisador atribuído a esta pesquisa ainda — atribua a equipe em Minhas pesquisas.</td></tr>';
  return head('Financeiro — '+s.name,'Pagamento por entrevista válida coletada nesta pesquisa',
    '<button class="btn btn-out" onclick="financeBack()">← Financeiro</button>'+
    (rows.length?'<button class="btn btn-out" onclick="alert(\'Protótipo: exportar remessa bancária / PIX em lote desta pesquisa\')">Exportar remessa</button><button class="btn btn-fill" onclick="alert(\'Protótipo: processar pagamentos aprovados desta pesquisa\')">Processar pagamentos</button>':''))+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('A pagar nesta pesquisa',brl(t.valor),t.valid.toLocaleString('pt-BR')+' entrevistas válidas','$','#2563eb')}
    ${stat('Pesquisadores',String(t.count),'com coleta nesta pesquisa','☺','#059669')}
    ${stat('Valor por formulário',brl(price),'região remota: '+brl(priceRemote),'◷','#7c3aed')}
    ${stat('Pendente',brl(t.pendingValor),'dados bancários / auditoria','◷','#d97706')}
  </div>
  <div class="card mb">
    <div class="card-t">Pagamentos por pesquisador</div>
    <div class="card-d">Válidos e rejeitados vêm de verdade das coletas de campo (contados automaticamente). Dados bancários armazenados de forma segura (LGPD).</div>
    <table><thead><tr><th>Pesquisador</th><th>Válidos</th><th>Rejeitados</th><th>Valor</th><th>Chave PIX</th><th>Status</th><th></th></tr></thead>
    <tbody>${body}</tbody></table>
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-t" style="font-size:13px">Tabela de valores desta pesquisa</div>
      <table style="margin-top:6px"><tbody>
        <tr><td>Formulário padrão</td><td style="text-align:right"><b>${brl(price)}</b></td></tr>
        <tr><td>Formulário em região remota</td><td style="text-align:right"><b>${brl(priceRemote)}</b></td></tr>
        <tr><td>Bônus meta diária batida</td><td style="text-align:right"><b>+ R$ 20,00</b></td></tr>
      </tbody></table>
      <button class="btn btn-out" style="margin-top:10px" onclick="alert('Protótipo: editar tabela de valores desta pesquisa')">Editar valores</button>
    </div>
    <div class="card"><div class="card-t" style="font-size:13px">Repasse acumulado nesta pesquisa</div>
      <div style="position:relative;height:180px;margin-top:6px"><canvas id="finChart" role="img" aria-label="Repasse acumulado"></canvas></div>
    </div>
  </div>`;
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
  if(!SURVEYS_LOADED||!PAYMENTS_LOADED||!COLLECT_EVENTS_LOADED){
    if(!SURVEYS_LOADED)loadSurveysIfNeeded();
    if(!PAYMENTS_LOADED)loadPaymentsIfNeeded();
    if(!COLLECT_EVENTS_LOADED)loadCollectEventsIfNeeded();
    return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+'<div class="empty">Carregando seus dados financeiros…</div>';
  }
  const myId=CURRENT_PROFILE&&CURRENT_PROFILE.id;
  const mine=PAYMENTS.filter(p=>p.researcherId===myId);
  const rowsData=mine.map(p=>{
    const s=SURVEYS.find(x=>x.id===p.surveyId);
    const price=s?+s.price:0;
    return {survey:s?s.name:'(pesquisa removida)',valid:p.valid,valor:p.valid*price,status:p.status};
  });
  const aReceber=rowsData.filter(r=>r.status==='aprovado').reduce((a,r)=>a+r.valor,0);
  const pendente=rowsData.filter(r=>r.status==='pendente').reduce((a,r)=>a+r.valor,0);
  const auditoria=rowsData.filter(r=>r.status==='auditoria').reduce((a,r)=>a+r.valor,0);
  const histRows=rowsData.length?rowsData.map(r=>`<tr><td>${esc(r.survey)}</td><td>${r.valid}</td><td>${brl(r.valor)}</td><td>${(FIN_STATUS[r.status]||FIN_STATUS.pendente).pill}</td></tr>`).join('')
    :'<tr><td colspan="4" class="empty">Nenhuma coleta ainda — assim que você enviar sua primeira entrevista em "Coletar (app)", aparece aqui.</td></tr>';
  return head('Meus ganhos','Acompanhe seus pagamentos por formulário coletado')+`
  <div class="grid g3" style="margin-bottom:16px">
    ${stat('A receber',brl(aReceber),'aprovado, aguardando repasse','$','#2563eb')}
    ${stat('Pendente',brl(pendente),'dados bancários / lançamento','◷','#d97706')}
    ${stat('Em auditoria',brl(auditoria),'em revisão','◷','#7c3aed')}
  </div>
  <div class="card mb">
    <div class="card-t">Histórico de pagamentos</div>
    <table style="margin-top:6px"><thead><tr><th>Pesquisa</th><th>Válidos</th><th>Valor</th><th>Status</th></tr></thead>
    <tbody>${histRows}</tbody></table>
  </div>
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

/* ============ CONTRACTS ============ */
const CONTRACTS=[
  {name:'João Pereira',model:'Pesquisador PF',value:'R$ 5,00',sent:'02/06',signed:true,signedAt:'03/06/2026 14:22'},
  {name:'Fernanda Couto',model:'Pesquisador PF',value:'R$ 5,00',sent:'02/06',signed:true,signedAt:'04/06/2026 09:10'},
  {name:'Maria Souza',model:'Pesquisador PF',value:'R$ 5,00',sent:'20/06',signed:false},
  {name:'Lucas Andrade',model:'Pesquisador PF',value:'R$ 5,00',sent:'21/06',signed:false},
  {name:'Renata Lima',model:'Pesquisador PF',value:'R$ 5,00',sent:'21/06',signed:false},
  {name:'Paulo Cruz',model:'Pesquisador PF',value:'R$ 5,00',sent:'22/06',signed:false},
];
PAGES.contracts=()=>{
  const assinados=CONTRACTS.filter(c=>c.signed).length;
  const pendentes=CONTRACTS.filter(c=>!c.signed).length;
  const rows=CONTRACTS.map(c=>`
      <tr><td>${esc(c.name)}</td><td>${esc(c.model)}</td><td>${esc(c.value)}</td><td>${esc(c.sent)}</td>
        <td>${c.signed?'<span class="pill pill-green">● Assinado</span>':'<span class="pill pill-amber">● Aguardando assinatura</span>'}</td>
        <td>${c.signed?'<button class="btn-ghost" onclick="alert(\'Protótipo: visualizar PDF assinado\')">Ver</button>':'<button class="btn-ghost" onclick="alert(\'Protótipo: reenviar link de assinatura\')">Reenviar</button>'}</td></tr>`).join('');
  return head('Contratos','Geração e assinatura eletrônica dos contratos de prestação de serviço',
  '<button class="btn btn-out" onclick="go(\'contract-template\')">Modelos</button><button class="btn btn-fill" onclick="alert(\'Protótipo: gerar contratos em lote\')">Gerar em lote</button>')+`
  <div class="grid g4" style="margin-bottom:16px">
    ${stat('Contratos ativos',String(assinados),'assinados eletronicamente','✎','#2563eb')}
    ${stat('Aguardando assinatura',String(pendentes),'enviados aos pesquisadores','◷','#d97706')}
    ${stat('Modelos','3','pesquisador / coord / gerente','❒','#7c3aed')}
    ${stat('Vencendo em 30d','5','renovação necessária','◷','#dc2626')}
  </div>
  <div class="card">
    <div class="card-t">Contratos</div>
    <table style="margin-top:6px"><thead><tr><th>Pesquisador</th><th>Modelo</th><th>Valor/form.</th><th>Enviado</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}
    </tbody></table>
  </div>
  <div class="sec-title">Pré-visualização do contrato</div>
  <div class="contract-doc">
    <div style="text-align:center;font-weight:700;font-size:14px;color:var(--ink)">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PESQUISA DE CAMPO</div>
    <h3>Contratante</h3>
    Instituto de Pesquisa [Sua Empresa] Ltda · CNPJ 00.000.000/0001-00 · Belo Horizonte/MG.
    <h3>Contratado</h3>
    João Pereira · CPF 123.456.789-00 · função: Pesquisador de campo.
    <h3>Objeto e remuneração</h3>
    Aplicação de questionários da Pesquisa Eleitoral MG 2026, remunerada em <b>R$ 5,00 por formulário válido</b>, mediante critérios de auditoria de qualidade definidos pela Contratante.
    <div class="sign-pad signed">✓ Assinado eletronicamente · João Pereira · 03/06/2026 14:22 · IP/hash registrados</div>
  </div>`;
};

/* ============ CONTRACT TEMPLATE EDITOR ============ */
PAGES['contract-template']=()=>head('Modelos de contrato','Use seu próprio modelo. Os campos entre {chaves} são preenchidos automaticamente para cada pessoa.',
  '<button class="btn btn-out" onclick="alert(\'Protótipo: importar .docx / .pdf como modelo\')">⬆ Importar arquivo</button><button class="btn btn-fill" onclick="alert(\'Protótipo: modelo salvo. Passa a ficar disponível ao gerar contratos.\')">Salvar modelo</button>')+`
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


PAGES['my-contract']=()=>head('Meu contrato','Seu contrato de prestação de serviços')+`
  <div class="contract-doc" style="margin-bottom:16px">
    <div style="text-align:center;font-weight:700;font-size:14px;color:var(--ink)">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PESQUISA DE CAMPO</div>
    <h3>Contratante</h3>Instituto de Pesquisa [Sua Empresa] Ltda · CNPJ 00.000.000/0001-00.
    <h3>Contratado</h3>João Pereira · CPF 123.456.789-00.
    <h3>Remuneração</h3>R$ 5,00 por formulário válido, conforme auditoria de qualidade.
    <div class="sign-pad signed">✓ Assinado eletronicamente · 03/06/2026 14:22</div>
  </div>
  <button class="btn btn-out" onclick="alert('Protótipo: baixar PDF do contrato')">⬇ Baixar PDF</button>`;

/* ============ COMPANY ============ */
PAGES.company=()=>head('Dados da empresa','Informações usadas em contratos e relatórios oficiais',
  '<button class="btn btn-fill" onclick="alert(\'Protótipo: CNPJ, endereço e contato salvos\')">Salvar</button>')+`
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
      <div class="field-row"><div><label class="lbl">Telefone</label><input class="inp" value="(31) 99999-0000"></div><div><label class="lbl">E-mail</label><input class="inp" value="contato@pesquisapro.com.br"></div></div>
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
  if(key!=='collect'){stopCollectLive();}
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
  if(key==='app-collect')initGeoCollect();
  if(key==='client-results')drawClientResults();
  if(key==='my-earnings')renderMyRejected();
  if(key==='sample'){calcSample();}
  if(key==='quotas'){quotaSeg(document.querySelector('#quotaSeg button'),'sexo');}
  if(key==='reports'){renderReport();}
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

function drawDash(){
  const c=document.getElementById('dashChart');if(!c)return;
  new Chart(c,{type:'line',data:{labels:['1','2','3','4','5','6','7','8','9','10','11','12','13','14'],
    datasets:[{label:'Coletas',data:[120,180,210,160,240,290,180,220,310,280,330,300,360,340],
      borderColor:'#2563eb',backgroundColor:'rgba(31,95,168,.12)',fill:true,tension:.35,pointRadius:0,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}
function drawFin(){
  const c=document.getElementById('finChart');if(!c)return;
  new Chart(c,{type:'bar',data:{labels:['Sem 1','Sem 2','Sem 3','Sem 4'],
    datasets:[{label:'Repasse',data:[4200,6800,9100,14235],backgroundColor:'#059669',borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>'R$ '+(v/1000)+'k'},grid:{color:'#e2e8f0'}},x:{grid:{display:false}}}}});
}

/* sample calculator */
function calcSample(){
  const N=+document.getElementById('sp-pop').value||0;
  const e=+document.getElementById('sp-err').value;
  const Z=+document.getElementById('sp-conf').value;
  const p=(+document.getElementById('sp-prop').value||50)/100;
  const num=N*Z*Z*p*(1-p);
  const den=e*e*(N-1)+Z*Z*p*(1-p);
  const n=Math.ceil(num/den);
  const nadj=Math.ceil(n*1.1);
  document.getElementById('sp-n').textContent=n.toLocaleString('pt-BR');
  document.getElementById('sp-nadj').textContent=nadj.toLocaleString('pt-BR');
  document.getElementById('sp-cost').textContent='R$ '+(nadj*12.5).toLocaleString('pt-BR',{maximumFractionDigits:0});
  drawSampleChart(N,Z,p);
}
let _sampleChart;
function drawSampleChart(N,Z,p){
  const c=document.getElementById('sampleChart');if(!c)return;
  const errs=[0.05,0.04,0.03,0.025,0.02,0.015];
  const data=errs.map(e=>{const num=N*Z*Z*p*(1-p);const den=e*e*(N-1)+Z*Z*p*(1-p);return Math.ceil(num/den);});
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

/* reports */
let _reportChart;
let _reportCharts=[];
const RP_SEGMENTS={
  'Sexo':['Masculino','Feminino'],
  'Macrorregião':['Central','Triângulo','Norte'],
  'Escolaridade':['Fundamental','Médio','Superior'],
};
function rpColCats(y){
  return ({'Faixa etária':['16–24','25–44','45–59','60+'],'Sexo':['Masculino','Feminino'],
    'Macrorregião':['Central','Triângulo','Norte','Sul'],'Escolaridade':['Fundamental','Médio','Superior']})[y]||['A','B','C','D'];
}
function rpSeries(x){
  return ({
    'Intenção de voto':[
      {label:'Candidato A',color:'#2563eb'},{label:'Candidato B',color:'#ea580c'},
      {label:'Candidato C',color:'#059669'},{label:'Branco/Nulo/NS',color:'#64748b'}],
    'Avaliação da gestão':[
      {label:'Ótima',color:'#059669'},{label:'Boa',color:'#2563eb'},
      {label:'Regular',color:'#d97706'},{label:'Ruim/Péssima',color:'#dc2626'}],
    'Rejeição':[{label:'Rejeita',color:'#dc2626'},{label:'Não rejeita',color:'#059669'},{label:'Indiferente',color:'#64748b'}],
  })[x]||[{label:'A',color:'#2563eb'},{label:'B',color:'#ea580c'}];
}
// gera dados pseudo-aleatórios estáveis a partir de uma semente textual
function rpData(seed,nSeries,nCats){
  let h=0;for(let i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))&0xffffffff;
  const rnd=()=>{h=(h*1103515245+12345)&0x7fffffff;return h/0x7fffffff;};
  const cols=[];
  for(let c=0;c<nCats;c++){
    const raw=[];let tot=0;
    for(let s=0;s<nSeries;s++){const v=10+Math.floor(rnd()*40);raw.push(v);tot+=v;}
    cols.push(raw.map(v=>Math.round(v/tot*100)));
  }
  // transpor para [serie][cat]
  const out=[];for(let s=0;s<nSeries;s++){out.push(cols.map(col=>col[s]));}
  return out;
}
function renderReport(){
  const x=document.getElementById('rp-x').value;
  const y=document.getElementById('rp-y').value;
  const z=document.getElementById('rp-z').value;
  const type=document.getElementById('rp-type').value;
  _reportCharts.forEach(ch=>{try{ch.destroy();}catch(e){}});_reportCharts=[];
  const cats=rpColCats(y);
  const baseSeries=rpSeries(x);
  const segments=z?(RP_SEGMENTS[z]||['(todos)']):[null];
  const out=document.getElementById('rp-output');
  const title=z?`${x} × ${y}, segmentado por ${z}`:`${x} × ${y}`;
  let html=`<div class="card mb"><div class="card-t">${title}</div>
    <div class="card-d">Base: 2.847 entrevistas válidas · margem ± 2,3%${z?' · '+segments.length+' segmentos':''}</div></div>`;
  segments.forEach((seg,si)=>{
    const series=baseSeries.map(s=>({...s,data:[]}));
    const d=rpData(x+'|'+y+'|'+(seg||'')+'|'+si,baseSeries.length,cats.length);
    series.forEach((s,i)=>s.data=d[i]);
    const cid='rep-canvas-'+si;
    const segTitle=seg?`<span class="pill pill-blue" style="margin-left:8px">${z}: ${seg}</span>`:'';
    let tbl='<table><thead><tr><th></th>'+cats.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
    series.forEach(s=>{tbl+=`<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.color};margin-right:6px"></span>${s.label}</td>`+s.data.map(v=>`<td>${v}%</td>`).join('')+'</tr>';});
    tbl+='</tbody></table>';
    html+=`<div class="grid g2" style="margin-bottom:16px"><div class="card"><div class="card-t" style="font-size:13px">Gráfico ${segTitle}</div>
      <div style="position:relative;height:280px"><canvas id="${cid}" role="img" aria-label="Gráfico de cruzamento"></canvas></div></div>
      <div class="card"><div class="card-t" style="font-size:13px">Tabela ${segTitle}</div>
      <div style="margin-top:6px">${tbl}</div></div></div>`;
    // guardar para desenhar após inserir no DOM
    series._cid=cid;series._type=type;series._cats=cats;
    segments[si]={series,cid,type,cats};
  });
  out.innerHTML=html;
  // desenhar os gráficos
  segments.forEach(seg=>{
    if(!seg||!seg.cid)return;
    const cv=document.getElementById(seg.cid);if(!cv)return;
    const t=seg.type,series=seg.series,cats=seg.cats;
    const cfg=(t==='pie')?{
      type:'pie',data:{labels:series.map(s=>s.label),datasets:[{data:series.map(s=>s.data[1]||s.data[0]),backgroundColor:series.map(s=>s.color)}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right'}}}
    }:{
      type:t==='line'?'line':'bar',
      data:{labels:cats,datasets:series.map(s=>({label:s.label,data:s.data,backgroundColor:s.color,borderColor:s.color,borderRadius:5,fill:false,tension:.3,borderWidth:2,stack:t==='bar-stack'?'s':undefined}))},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}},
        scales:{x:{stacked:t==='bar-stack',grid:{display:false}},y:{stacked:t==='bar-stack',beginAtZero:true,grid:{color:'#e2e8f0'},ticks:{callback:v=>v+'%'}}}}
    };
    _reportCharts.push(new Chart(cv,cfg));
  });
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