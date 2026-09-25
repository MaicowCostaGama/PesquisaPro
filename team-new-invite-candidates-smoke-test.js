const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const html=fs.readFileSync(__dirname+'/app.html','utf8');
const required=[
  'TEAM_ONLY_NEW=false',
  'TEAM_INVITES_LOAD_ERROR=false',
  'function teamNewInviteCount(pesqs,hasTarget)',
  'function teamToggleOnlyNew(checked)',
  'data-new-invite="${novoApto?\'1\':\'0\'}"',
  'id="team-only-new"',
  'Mostrar somente estes',
  'team-new-invite-summary',
  'team-new-invite-pill',
  'if(TEAM_ONLY_NEW&&TEAM_INVITES.some(invite=>invite.researcher_id===u.id))return false',
  'if(TEAM_ONLY_NEW&&(!TEAM_INVITES_LOADED||TEAM_INVITES_LOAD_ERROR))return []'
];
for(const token of required)assert(app.includes(token),`app.js sem ${token}`);
assert(app.includes('TEAM_ONLY_NEW||isNew'),'filtro de novos não aplicado na lista');
assert(app.includes('TEAM_ONLY_NEW?available+\' novo\''),'contador do filtro de novos ausente');
assert(css.includes('.team-new-invite-callout')&&css.includes('.team-new-invite-toggle')&&css.includes('.team-new-invite-pill'),'estilos do filtro de novos ausentes');
assert(html.includes('app.js?v=20260925092000'),'cache não atualizado');
console.log('team-new-invite-candidates-smoke-test: PASS');
