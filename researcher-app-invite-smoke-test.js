const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

for(const token of [
  "PAGES['researcher-profile']",
  'researcherProfileInvitesMarkup',
  'Convites para participar de pesquisas',
  'loadMyInvitesIfNeeded()',
  'respondMyInvite(${jsArg(inv.id)},true)',
  'respondMyInvite(${jsArg(inv.id)},false)',
  'function ensureSurveyInvite(surveyId,researcherId)',
  'function inviteResearcherInApp(researcherId)',
  'Convidar pelo aplicativo',
  'Reenviar pelo aplicativo',
  'Aguardando sua resposta',
  "survey_invites').select('*')",
  'respond_survey_invite_details',
  'respond_survey_invite'
])assert(app.includes(token),`app.js sem ${token}`);
for(const token of [
  '.researcher-profile-invites',
  '.researcher-profile-invite-row',
  '.researcher-profile-invite-actions',
  '.team-inapp-invite-btn',
  '@media(max-width:720px)',
  '@media(max-width:420px)'
])assert(css.includes(token),`CSS sem ${token}`);
assert(html.includes('app.js?v=20261006144500'),'cache do app não atualizado');
assert(html.includes('style.css?v=20261006144500'),'cache do CSS não atualizado');
assert(!/create table|alter table|drop table|delete from/i.test(app),'o convite interno não deve alterar ou apagar tabelas pelo frontend');
console.log('researcher-app-invite-smoke-test: PASS');
