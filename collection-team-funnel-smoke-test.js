const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

for(const token of [
  'COLLECT_TEAM_INVITES=[]',
  "COLLECT_FUNNEL_TAB='available'",
  'COLLECT_FUNNEL_SEARCH={available:\'\',invited:\'\',accepted:\'\',team:\'\'}',
  'const COLLECTION_FUNNEL_STAGES=',
  'function collectionFunnelEntries(idx)',
  "stage=invite?.status==='aceito'&&inappCount===0?'accepted'",
  "isTeam?'team':invite?'invited':eligible?'available':null",
  'function collectionFunnelStageActions(entry,s,stage)',
  'function collectionFunnelCard(entry,s,stage)',
  'function renderCollectionTeamFunnel(idx)',
  'function collectFunnelTab(stage)',
  'function collectFunnelSetSearch(stage,value)',
  'function rememberCollectionFunnelInvite(row)',
  'function inviteCollectionFunnelResearcherInApp(researcherId)',
  'function inviteCollectionFunnelResearcher(researcherId)',
  'function loadCollectionTeamFunnelIfNeeded(idx,force=false)',
  'function refreshCollectionTeamFunnelLive(idx)',
  'Disponível para convite',
  'Novos aceitos',
  'Já na equipe',
  'Buscar por nome',
  'Conversar no WhatsApp',
  'Convidar pelo aplicativo',
  'Reenviar pelo aplicativo',
  'Orientações pelo aplicativo',
  'openSurveyInitialOrientationModal',
  'WhatsApp aberto:',
  'collectionFunnelWhatsAppButton',
  'collectionTeamFunnel',
  'loadCollectionTeamFunnelIfNeeded(idx)',
  "sb.from('survey_invites').select('*').eq('survey_id',s.id)",
  "window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(message),'_blank','noopener')"
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.collection-funnel-card',
  '.collection-funnel-tabs',
  '.collection-funnel-tab.is-active',
  '.collection-funnel-panel-head',
  '.collection-funnel-search',
  '.collection-funnel-person',
  '.collection-funnel-orientation-btn',
  '@media(max-width:720px)',
  '@media(max-width:420px)'
])assert(css.includes(token),`CSS sem ${token}`);
assert(css.includes('.collection-funnel-person{display:grid;grid-template-columns:minmax(0,1fr)'), 'cartão do funil não reserva linha para o nome');
assert(css.includes('.collection-funnel-person-actions{display:flex;align-items:stretch;justify-content:flex-start'), 'ações do funil não fluem abaixo dos dados');
assert(css.includes('.collection-funnel-person-title strong{display:block;flex:1 1 100%'), 'nome pode voltar a ser comprimido pelos botões');
assert(html.includes('app.js?v=20261007203035'),'cache do app não atualizado');
assert(html.includes('style.css?v=20261007203035'),'cache do CSS não atualizado');
assert(!/create table|alter table|drop table|delete from/i.test(app),'funil não deve alterar o banco pelo frontend');
console.log('collection-team-funnel-smoke-test: OK');
