const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const recruitmentSql=fs.readFileSync(path.join(root,'deploy','recrutamento.sql'),'utf8');
const checks=[
  ['validador de UUID',app.includes('function isValidUuid(value)')&&app.includes('userIdForEdit(index)')],
  ['salvamento bloqueia índice sem UUID',app.includes("if(!isNew&&!userIdForEdit(USER_EDIT))return;")],
  ['edição usa ID persistido',app.includes("profiles').update(userToProfileRow")&&app.includes('USERS[USER_EDIT].id')],
  ['aprovação manual grava status no perfil',app.includes("profiles').update({status:'ativo'})")],
  ['aprovação cria ou reconcilia perfil',app.includes('signupEnsureApprovedProfile')&&app.includes('createLoginAndProfile')],
  ['cadastro aprovado guarda perfil vinculado',app.includes('approved_profile_id:profile.id')],
  ['cadastros aprovados sem perfil são identificados',app.includes('signupOrphanRows')&&app.includes('signupReconcileApproved')],
  ['lista carrega aprovados para reconciliação',app.includes(".in('status',['novo','diligencia','aprovado'])")],
  ['redefinição de senha após criação',app.includes('resetPasswordForEmail(s.email')],
  ['migration prevê approved_profile_id',recruitmentSql.includes('add column if not exists approved_profile_id')],
  ['cache atualizado',html.includes('20260920180000')]
];
let failed=0;
for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('researcher-approval-uuid-smoke-test: PASS');
