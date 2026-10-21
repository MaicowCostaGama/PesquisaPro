const fs=require('fs');
const path=require('path');

const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const policy=read('politica-privacidade.html');
const index=read('index.html');
const signup=read('cadastro.html');
const app=read('app.html');
const appJs=read('app.js');
const migrationPath=path.join(root,'deploy/aceite-politica-privacidade-v200.sql');
const migration=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';

const checks=[
  [fs.existsSync(path.join(root,'politica-privacidade.html')),'a página pública de política existe'],
  [policy.includes('Política de Privacidade e Guarda de Dados'),'a página declara o título da política'],
  [policy.includes('Versus Soluções em Gestão'),'a política identifica a controladora'],
  [policy.includes('26.643.308/0001-49'),'o CNPJ informado está publicado'],
  [policy.includes('Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG'),'o endereço informado está publicado'],
  [policy.includes('adm@pesquisa-pro.com'),'há canal de privacidade por e-mail'],
  [policy.includes('Documento oficial com foto')&&policy.includes('Comprovante de endereço'),'documentos do cadastro estão descritos'],
  [policy.includes('Chave PIX')&&policy.includes('comprovantes'),'dados financeiros e comprovantes estão descritos'],
  [policy.includes('respostas')&&policy.includes('auditoria'),'dados de pesquisa e auditoria estão descritos'],
  [policy.includes('Gravação não é automática em todas as pesquisas'),'a regra de gravação condicionada à configuração e autorização está explícita'],
  [policy.includes('localização')&&policy.includes('GPS'),'o uso operacional de localização está descrito'],
  [policy.includes('7. Como protegemos e guardamos os dados'),'há seção de segurança e guarda'],
  [policy.includes('8. Por quanto tempo guardamos'),'há seção de retenção'],
  [policy.includes('9. Direitos do titular'),'os direitos LGPD estão descritos'],
  [policy.includes('LGPD')&&policy.includes('Lei nº 13.709/2018'),'a política referencia a LGPD'],
  [policy.includes('https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm'),'há referência oficial ao texto da LGPD'],
  [index.includes('href="politica-privacidade.html"'),'a landing page oferece o link de privacidade'],
  [signup.includes('href="politica-privacidade.html"')&&signup.includes('privacy-ack'),'o cadastro oferece link e confirmação de leitura'],
  [signup.includes("PRIVACY_POLICY_VERSION='v2-2026-10-21'")&&signup.includes("PRIVACY_POLICY_HASH='1b3088a5f69ddcae9f5dc24b93695335e690091d06493ff803e0e965add31766'"),'o cadastro fixa a versão e o hash publicados da política'],
  [signup.includes('p_privacy_policy_accepted_at')&&signup.includes('p_privacy_policy_ip')&&signup.includes('p_privacy_policy_user_agent'),'o cadastro envia timestampo, IP best-effort e user-agent do aceite'],
  [signup.includes("if(!$('privacy-ack').checked)"),'o cadastro bloqueia envio sem a confirmação de leitura'],
  [app.includes('href="politica-privacidade.html"'),'o login oferece o link de privacidade'],
  [appJs.includes("const PRIVACY_CONTRACT_VERSION='v3-2026-pesquisador'")&&appJs.includes('sign_researcher_contract'),'o contrato possui versão própria e RPC auditável de assinatura'],
  [appJs.includes('PRIVACY_POLICY_URL')&&appJs.includes('PRIVACY_POLICY_HASH')&&appJs.includes('contractUsesPrivacyPolicy'),'o contrato referencia URL, versão e hash da política'],
  [!migration || (migration.includes('create table if not exists public.privacy_policy_acceptances')&&migration.includes("source in ('signup','contract')")),'a migration cria o livro append-only quando está disponível localmente'],
  [!migration || (migration.includes('submit_recruiter_signup')&&migration.includes('submit_researcher_referral_signup')&&migration.includes('p_privacy_policy_accepted_at')),'as duas RPCs de cadastro exigem e gravam o aceite quando a migration está disponível'],
  [!migration || (migration.includes('privacy_policy_acceptances_source_ref_ck')&&migration.includes('before insert on public.researcher_contracts')),'o banco mantém referências consistentes e protege a v3 quando a migration está disponível'],
  [!/SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|OPENAI_API_KEY/.test(policy+index+signup+app),'nenhum nome de segredo é exposto nos arquivos publicados'],
];

const failures=checks.filter(([,ok])=>!ok);
if(failures.length){
  console.error('FALHAS:');
  failures.forEach(([,label])=>console.error(' - '+label));
  process.exit(1);
}
console.log(`privacy-policy-smoke-test: ${checks.length} verificações aprovadas`);
