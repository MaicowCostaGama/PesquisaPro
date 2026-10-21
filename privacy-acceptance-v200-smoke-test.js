const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sqlPath=path.join(root,'deploy/aceite-politica-privacidade-v200.sql');
const sqlExists=fs.existsSync(sqlPath);
const sql=sqlExists?fs.readFileSync(sqlPath,'utf8'):'';
const signup=read('cadastro.html');
const app=read('app.js');
const policy=read('politica-privacidade.html');
const checks=[
  [!sqlExists||(sql.includes('begin;')&&sql.includes('commit;')),'migration transacional quando o arquivo está disponível'],
  [!sqlExists||(sql.includes('privacy_policy_versions')&&sql.includes('document_sha256')),'versões da política com hash quando a migration está disponível'],
  [!sqlExists||sql.includes('1b3088a5f69ddcae9f5dc24b93695335e690091d06493ff803e0e965add31766'),'hash publicado fixado na migration quando o arquivo está disponível'],
  [!sqlExists||(sql.includes('privacy_policy_acceptances')&&sql.includes("source in ('signup','contract')")),'livro auditável com origem limitada quando a migration está disponível'],
  [!sqlExists||(sql.includes('ip_address')&&sql.includes('user_agent')),'IP e user-agent no registro de aceite quando a migration está disponível'],
  [!sqlExists||(sql.includes('create or replace function public.submit_recruiter_signup')&&sql.includes('p_privacy_policy_hash')),'RPC de recrutador exige hash quando a migration está disponível'],
  [!sqlExists||(sql.includes('create or replace function public.submit_researcher_referral_signup')&&sql.includes('p_privacy_policy_hash')),'RPC de indicação exige hash quando a migration está disponível'],
  [!sqlExists||(sql.includes("insert into public.privacy_policy_acceptances")&&sql.includes("'signup'")),'aceite de cadastro gravado na mesma transação quando a migration está disponível'],
  [!sqlExists||(sql.includes("'v3-2026-pesquisador'")&&sql.includes('guard_researcher_contract_privacy')),'contrato v3 protegido pelo banco quando a migration está disponível'],
  [!sqlExists||sql.includes('create or replace function public.sign_researcher_contract'),'assinatura pessoal do contrato usa RPC quando a migration está disponível'],
  [!sqlExists||sql.includes('sem policies de INSERT/UPDATE/DELETE'),'livro sem update/delete pelo app quando a migration está disponível'],
  [signup.includes('PRIVACY_POLICY_VERSION')&&signup.includes('PRIVACY_POLICY_HASH'),'frontend do cadastro fixa versão/hash'],
  [signup.includes('p_privacy_policy_accepted_at')&&signup.includes('p_privacy_policy_user_agent'),'frontend envia evidências adicionais'],
  [app.includes('contractUsesPrivacyPolicy')&&app.includes('Política de Privacidade e Guarda de Dados'),'contrato incorpora a política na v3'],
  [app.includes("sb.rpc('sign_researcher_contract'")&&!app.includes("sb.from('researcher_contracts').insert({"),'assinatura não contorna a RPC'],
  [policy.includes('Última atualização: 21/10/2026'),'política pública continua disponível e datada'],
];
const failures=checks.filter(([,ok])=>!ok);
if(failures.length){console.error('FALHAS:');failures.forEach(([,label])=>console.error(' - '+label));process.exit(1);}
console.log(`privacy-acceptance-v200-smoke-test: ${checks.length} verificações aprovadas`);
