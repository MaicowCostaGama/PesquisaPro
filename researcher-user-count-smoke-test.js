const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const referralSql = fs.readFileSync('deploy/indicacao-pesquisador.sql', 'utf8');
const recruitmentSql = fs.readFileSync('deploy/recrutamento.sql', 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(app.includes('function researcherWorkflowCount()'), 'helper de contagem unificada ausente');
ok(app.includes("const signups=[...signupPendingRows(),...signupOrphanRows()].filter(signupMatchesUsersView)"), 'cadastros pendentes/órfãos não entram na contagem');
ok(app.includes("USER_TAB==='pesq'?researcherWorkflowCount():usersInTab(USER_TAB).length"), 'cabeçalho da aba Usuários não usa a contagem unificada');
ok(app.includes("t.key==='pesq'?researcherWorkflowCount():usersInTab(t.key).length"), 'badge da aba Pesquisadores não usa a contagem unificada');
ok(app.includes("stat('Pesquisadores e cadastros',String(researcherWorkflowCount())"), 'cartão principal não informa perfis e cadastros recebidos');
ok(app.includes('pendingProfiles.length+pendingSignups.length+orphanSignups.length'), 'pendências sem perfil não entram no cartão de análise');

// Exemplo do caso relatado: 202 perfis existentes + 3 cadastros recebidos = 205 pessoas no fluxo.
const profileIds = new Set(['p1', 'p2']);
const profileEmails = new Set(['existente@example.com']);
const signups = [
  { id: 's1', authUserId: null, approvedProfileId: null, email: 'novo1@example.com' },
  { id: 's2', authUserId: null, approvedProfileId: null, email: 'novo2@example.com' },
  { id: 's3', authUserId: null, approvedProfileId: null, email: 'novo3@example.com' },
  { id: 's4', authUserId: 'p1', approvedProfileId: null, email: 'existente@example.com' },
];
const additional = signups.filter(s => {
  const id = s.approvedProfileId || s.authUserId;
  const email = String(s.email || '').trim().toLowerCase();
  return !(id && profileIds.has(id)) && !(email && profileEmails.has(email));
});
ok(additional.length === 3, 'deduplicação não preserva a expectativa 202 perfis + 3 cadastros = 205');

// Indicação de pesquisador grava researcher_referral_id, não recruiter_id.
const referralBlock = referralSql.slice(referralSql.indexOf('create or replace function public.submit_researcher_referral_signup'), referralSql.indexOf('create or replace function public.sync_researcher_referral_signup'));
ok(referralBlock.includes('researcher_referral_id'), 'cadastro por indicação não vincula a indicação');
ok(!/insert\s+into\s+public\.signups\s*\([^)]*recruiter_id/i.test(referralBlock), 'cadastro por indicação passou a atribuir recrutador indevidamente');

const captureSync = recruitmentSql.slice(recruitmentSql.indexOf('create or replace function public.recruiter_capture_sync'));
ok(captureSync.includes('if new.recruiter_id is null'), 'sincronização de captação não protege recruiter_id nulo');

console.log('Researcher user count smoke test: PASS — perfis, cadastros indicados e captações separados.');
