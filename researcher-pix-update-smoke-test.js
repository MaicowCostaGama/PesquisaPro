const fs=require('fs');
const path=require('path');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const migrationPath=path.join(__dirname,'deploy/corrigir-atualizacao-pix-pesquisador.sql');
const migration=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
const html=fs.readFileSync(path.join(__dirname,'app.html'),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}

const start=app.indexOf('async function saveMyPixData()');
const end=app.indexOf('\nfunction renderMyRejected()',start);
assert(start>=0&&end>start,'handler de atualização do PIX não foi encontrado');
const handler=app.slice(start,end);
assert(handler.includes("sb.rpc('update_my_researcher_payment_data'"),'Meus ganhos não usa a RPC protegida de PIX');
assert(handler.includes('p_pix_key:pixKey||null'),'a chave PIX não é enviada como parâmetro da RPC');
assert(handler.includes('p_pix_bank:pixBank||null'),'o banco não é enviado como parâmetro da RPC');
assert(!handler.includes("sb.from('profiles').update"),'o handler ainda usa update direto em profiles');
assert(handler.includes('CURRENT_PROFILE.pix_key=pixKey;CURRENT_PROFILE.pix_bank=pixBank'),'estado local só é atualizado após a RPC');
assert(handler.includes('corrigir-atualizacao-pix-pesquisador.sql'),'erro de migration ausente não orienta o usuário');

if(migration){
  assert(migration.includes('create or replace function public.update_my_researcher_payment_data'),'RPC de PIX ausente na migration');
  assert(migration.includes('security definer'),'RPC de PIX precisa ser protegida');
  assert(migration.includes('auth.uid()')&&migration.includes('v_uid uuid'),'RPC não limita a sessão autenticada');
  assert(migration.includes("role = 'pesq'"),'RPC não restringe a pesquisadores');
  assert(migration.includes('pix_key = nullif(trim(coalesce(p_pix_key, \'\')), \'\')'),'RPC não normaliza a chave PIX');
  assert(migration.includes('pix_bank = nullif(trim(coalesce(p_pix_bank, \'\')), \'\')'),'RPC não normaliza o banco');
  assert(migration.includes('grant execute on function public.update_my_researcher_payment_data(text, text) to authenticated'),'RPC não foi liberada para authenticated');
  assert(!/\b(drop|delete|truncate)\b/i.test(migration),'migration contém operação destrutiva');
  assert(!migration.includes('payments')&&!migration.includes('payment_receipts'),'migration não deve alterar financeiro ou recibos');
}

assert(html.includes('app.js?v=20261007190935'),'cache do app não foi atualizado para a correção do PIX');
console.log('researcher-pix-update-smoke-test: PASS — Meus ganhos usa RPC protegida e o SQL manual é aditivo.');
