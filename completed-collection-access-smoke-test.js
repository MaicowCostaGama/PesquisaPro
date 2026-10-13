const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
function section(start,end){const a=app.indexOf(start);assert(a>=0,start);const b=app.indexOf(end,a+start.length);assert(b>a,end);return app.slice(a,b);}
function harness(documentOverride){
  const panels=['collectTabEquipe','collectTabMapa','collectTabAuditoria','collectTabMetas','collectTabEvolucao'].map(id=>({id,style:{display:id==='collectTabEquipe'?'block':'none'}}));
  const buttons=['equipe','mapa','auditoria','metas','evolucao'].map(tab=>({tab,classList:{add(){},remove(){}}}));
  const calls=[];
  const c={assert,console,CURRENT_PROFILE:{id:'staff',role:'admin'},SURVEYS:[
    {id:'active',name:'Ativa',status:'campo',questions:[],team:[]},
    {id:'done',name:'Pesquisa concluída',status:'encerrada',questions:[],team:['Ana'],collected:0},
    {id:'archive',name:'Arquivada',status:'encerrada',archivedAt:'2026-10-12',questions:[],team:[]}
  ],SURVEYS_LOADED:true,COLLECT_EVENTS_LOADED:true,COLLECT_IDX:null,COLLECT_RETURN_PAGE:'collect',COLLECT_ARMED:false,
  COLLECT_TEAM_INVITES_LOADED:true,COLLECT_ORIENTATION_COUNTS_STATUS:'ready',COLLECT_INAPP_ORIENTATION_STATUS:'ready',COLLECT_EVOLUTION_MODE:'month',
  STATUS_LABEL:{campo:'Em campo',rascunho:'Rascunho',encerrada:'Concluída'},STATUS_PILL:{campo:'Em campo',rascunho:'Rascunho',encerrada:'Encerrada',arquivada:'Arquivada'},
  COLLECT_FUNNEL_SEARCH:{},_collectMapFilters:{researcherQuery:''},_collectMap:null,_collectMapFocusId:null,
  esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
  surveySample:()=>1173,surveyCollectedCount:s=>s.id==='done'?1177:0,surveyCoveragePct:()=> '100,3%',
  collectStatusCounts:()=>({valid:1177,rejected:3}),collectionTeamRows:()=>'<tr><td>Ana</td></tr>',
  stat:(label,value,sub)=>`<div class="stat"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`,
  head:(title,sub,actions='')=>`<header><h1>${title}</h1><p>${sub}</p>${actions}</header>`,
  auditMinimumDurationMarkup:()=>'',auditInternalNavigationMarkup:()=>'',auditInternalCounts:()=>({total:0}),AUDIT_INTERNAL_VIEW:'all',
  document:documentOverride||{querySelectorAll:()=>buttons,getElementById:id=>panels.find(p=>p.id===id)},
  alert:msg=>calls.push(['alert',msg]),setTimeout:fn=>fn(),
  disposeCollectEvolutionChart:()=>calls.push(['dispose']),loadSurveysIfNeeded:()=>{},
  loadCollectionTeamFunnelIfNeeded:()=>{},loadCollectionOrientationCounts:()=>{},loadCollectionInAppOrientationCounts:()=>{},
  reportsOpenClose:()=>{},
  renderCollectMap:i=>calls.push(['mapa',i]),renderAudit:i=>calls.push(['auditoria',i]),renderCollectQuotaProgress:i=>calls.push(['metas',i]),renderCollectEvolution:i=>calls.push(['evolucao',i]),
  window:{},PAGES:{},calls,panels,buttons};
  vm.createContext(c);
  vm.runInContext(section('const ROLES={','const CLIENT_SELF_IDX='),c);
  vm.runInContext(section('const ROLE_NAV={','function initialsOf'),c);
  vm.runInContext(section('function collectOpenCompletedSurvey(','let COLLECT_ORIENTATION_COUNTS='),c);
  vm.runInContext(section('function collectList(){','function collectQuotaProgressRows('),c);
  vm.runInContext(section('function surveyRow(','PAGES.surveys='),c);
  vm.runInContext(section("PAGES['surveys-done']=", "PAGES['surveys-archived']="),c);
  vm.runInContext(section('window._beforeRender=function(key){','window._afterRender='),c);
  c.go=key=>{calls.push(['go',key]);c.window._beforeRender(key);};
  return c;
}
function run(){
 const c=harness();
 const row=c.surveyRow(c.SURVEYS[1],1,{done:true});
 assert(row.includes('completed-collection-access')&&row.includes("collectOpenCompletedSurvey('done')"),'Botão precisa usar ID persistido da pesquisa');
 assert(!c.surveyRow(c.SURVEYS[0],0,{}).includes('completed-collection-access'),'Atalho novo restrito às concluídas');
 assert(!c.surveyRow(c.SURVEYS[2],2,{done:true}).includes('completed-collection-access'),'Não expor ação operacional em arquivadas');
 const before=JSON.stringify(c.SURVEYS);
 c.collectOpenCompletedSurvey('done');
 assert(c.COLLECT_IDX===1&&c.COLLECT_RETURN_PAGE==='surveys-done','Abrir pesquisa correta e guardar origem');
 assert(JSON.stringify(c.SURVEYS)===before,'Consulta não pode modificar status nem dados');
 const detail=c.collectDetail(c.COLLECT_IDX);
 for(const tab of ['Equipe','Mapa ao vivo','Auditoria','Metas de cotas','Evolução da coleta'])assert(detail.includes(tab),'Aba ausente: '+tab);
 assert(detail.includes('← Concluídas')&&detail.includes('Pesquisa concluída.')&&detail.includes('Concluída'),'Status e retorno coerentes');
 assert(!detail.includes('surveyReopen(')&&!detail.includes('surveyStart(')&&!detail.includes('acollectStart('),'Acesso não deve iniciar ou reabrir pesquisa');
 for(const button of c.buttons){c.collectTab(button,button.tab);const visible=c.panels.filter(p=>p.style.display==='block');assert(visible.length===1,'Uma única aba visível');assert(visible[0].id.toLowerCase().endsWith(button.tab),'Aba correta');}
 for(const tab of ['mapa','auditoria','metas','evolucao'])assert(c.calls.some(call=>call[0]===tab&&call[1]===1),'Carregar painel com ID correto: '+tab);
 c.collectBack();assert(c.COLLECT_IDX===null&&c.COLLECT_RETURN_PAGE==='collect'&&c.calls.at(-1)[1]==='surveys-done','Voltar às Concluídas e limpar estado');
 c.collectOpen(0);assert(c.COLLECT_RETURN_PAGE==='collect','Navegação ativa preservada');c.collectBack();assert(c.calls.at(-1)[1]==='collect','Voltar para lista em andamento');
 c.collectOpenCompletedSurvey('done');c.go('collect');assert(c.COLLECT_IDX===null&&c.COLLECT_RETURN_PAGE==='collect','Menu lateral deve abrir lista e resetar origem');
 for(const role of ['admin','admpro','coord']){c.CURRENT_PROFILE={role};c.collectOpenCompletedSurvey('done');assert(c.COLLECT_IDX===1,'Acesso de gestão mantido: '+role);c.collectBack();}
 for(const role of ['pesq','cliente','gerente','recrutador','desconhecido']){c.CURRENT_PROFILE={role};c.collectOpenCompletedSurvey('done');assert(c.COLLECT_IDX===null,'Não ampliar permissão de '+role);}
 c.CURRENT_PROFILE=null;c.collectOpenCompletedSurvey('done');assert(c.COLLECT_IDX===null,'Exigir sessão');c.CURRENT_PROFILE={role:'admin'};
 for(const id of ['active','archive','missing']){c.collectOpenCompletedSurvey(id);assert(c.COLLECT_IDX===null,'Verificar situação ao clicar: '+id);}
 c.SURVEYS.reverse();c.collectOpenCompletedSurvey('done');assert(c.SURVEYS[c.COLLECT_IDX].id==='done','ID não depende da ordem na lista');
 const page=c.PAGES['surveys-done']();assert(page.includes('1.177'),'Resumo usa mesma fonte de contagem da linha, não collected desatualizado');
 assert(section('function acollectMySurveys(){','function renderAcollectSurveyPicker').includes("s.status==='campo'"),'Pesquisador só coleta em pesquisa em campo');
 assert(app.includes("COLLECT_IDX=null;COLLECT_RETURN_PAGE='collect';closeSurveyResearcherMessageModal()"),'Reset da origem no logout');
 assert(section('function initCollectLive(','function stopCollectLive').includes('setInterval(()=>pollCollectEvents(idx),20000)'),'Mapa/histórico mantém atualização existente');
 assert(css.includes('.completed-survey-actions{display:flex;flex-wrap:wrap'),'Ações devem permitir quebra');
 assert(css.includes('.completed-collection-access:focus-visible'),'Foco de teclado visível');
 assert(css.includes('.finance-table-scroll'),'Preservar CSS financeiro');
 console.log('Completed collection access smoke test: PASS — cinco abas, retorno, status, permissões e histórico preservados.');
}
if(require.main===module)run();
module.exports={harness,run};
