const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const html=fs.readFileSync(__dirname+'/app.html','utf8');
function ok(condition,message){assert.ok(condition,message);}
for(const token of [
  "AUDIT_INTERNAL_VIEW='all'",
  'auditInternalCounts',
  'auditInternalNavigationMarkup',
  'auditSetInternalView',
  'data-audit-focus-tab="${key}"',
  "['systemRejected','Reprovadas pelo sistema'",
  "['exceptSystemRejected','Completa — exceto reprovadas pelo sistema'",
  "['adminRejected','Reprovadas pelo administrador'",
  "['approved','Aprovadas'",
  'function auditIsSystemRejected(event)',
  'function auditEventsForView(events,view=AUDIT_INTERNAL_VIEW)',
  'const viewEvents=auditEventsForView(filteredAll)',
  'function auditPageItems(items,page=AUDIT_PAGE,pageSize=AUDIT_PAGE_SIZE)',
  'auditRenderPagination(viewEvents.length)',
  "id=\"auditCount-${key}\"",
  'auditApplyInternalView()',
])ok(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.audit-focus-nav',
  '.audit-focus-tab.is-active',
  '.audit-focus-count',
  'flex:0 0 auto;width:max-content;min-width:32px',
  'white-space:nowrap;line-height:1',
  '.audit-focus-tab.is-active .audit-focus-count{background:#174ea6;color:#fff',
  'grid-template-columns:repeat(5,minmax(0,1fr))',
  '@media(max-width:760px)',
  'position:sticky',
])ok(css.includes(token),`style.css sem ${token}`);
const version=html.match(/name="pesquisapro-app-version" content="([^"]+)"/)?.[1];
ok(version&&html.includes(`app.js?v=${version}`),'cache do app não acompanha a versão declarada');
ok(version&&html.includes(`style.css?v=${version}`),'cache do CSS não acompanha a versão declarada');
ok(!/create table|alter table|drop table|delete from/i.test(app),'navegação de auditoria não deve alterar o banco pelo frontend');
console.log('Audit section navigation smoke test: PASS — cinco etapas do funil, contadores, foco acessível e responsividade verificados.');
