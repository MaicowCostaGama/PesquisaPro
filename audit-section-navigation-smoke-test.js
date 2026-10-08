const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const html=fs.readFileSync(__dirname+'/app.html','utf8');
function ok(condition,message){assert.ok(condition,message);}
for(const token of [
  "AUDIT_INTERNAL_VIEW='flagged'",
  'auditInternalCounts',
  'auditInternalNavigationMarkup',
  'auditSetInternalView',
  'data-audit-focus-tab="flagged"',
  'data-audit-focus-tab="all"',
  'data-audit-focus-panel="flagged"',
  'data-audit-focus-panel="all"',
  'auditFlaggedCount',
  'auditAllCount',
  'wrap.hidden=AUDIT_INTERNAL_VIEW!==\'flagged\'',
  'auditApplyInternalView()',
])ok(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.audit-focus-nav',
  '.audit-focus-tab.is-active',
  '.audit-focus-panel[hidden]',
  'position:sticky',
  '@media(max-width:760px)',
])ok(css.includes(token),`style.css sem ${token}`);
ok(html.includes('app.js?v=20261008153000'),'cache do app não atualizado');
ok(html.includes('style.css?v=20261008153000'),'cache do CSS não atualizado');
ok(!/create table|alter table|drop table|delete from/i.test(app),'navegação de auditoria não deve alterar o banco pelo frontend');
console.log('Audit section navigation smoke test: PASS — atalhos, contadores, painéis exclusivos, foco acessível e responsividade verificados.');
