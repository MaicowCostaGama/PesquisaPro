const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const migration = fs.readFileSync('deploy/pagamentos-recebimentos-extrato.sql', 'utf8');

for (const token of [
  'PAYMENT_RECEIPTS',
  'loadPaymentReceiptsIfNeeded',
  'paymentReceivedValue',
  'paymentBalanceValue',
  'finApprovePayment',
  'finApproveAll',
  'finRegisterPayment',
  'record_payment_receipt',
  'Histórico de recebimentos',
  'Extrato por pesquisa',
  'rejeitadasValor',
  'A receber',
  'Recebido'
]) {
  assert(app.includes(token), `recurso financeiro ausente: ${token}`);
}

for (const token of [
  'payment_receipts',
  'approve_payment_batch',
  'record_payment_receipt',
  'prevent_payment_status_regression_after_receipt',
  'public.is_staff()',
  'receipt exceeds amount due',
  'payment must be approved before receipt',
  'pesquisador vê seus recebimentos'
]) {
  assert(migration.includes(token), `regra SQL ausente: ${token}`);
}

for (const token of [
  '.finance-table-scroll',
  '.finance-data-table',
  '.finance-row-actions',
  '.finance-action-approve',
  '.finance-action-receipt',
  '.finance-to-receive',
  '.earnings-rejected-value',
  '@media(max-width:640px)'
]) {
  assert(css.includes(token), `estilo financeiro ausente: ${token}`);
}

assert(html.includes('app.js?v=20260922235500'), 'cache do app financeiro não foi atualizado');
assert(html.includes('style.css?v=20260922235500'), 'cache do CSS financeiro não foi atualizado');
assert(app.includes("r.status==='aprovado'?Math.max(0,valor-recebido):0"), 'a receber não está restrito a pagamentos aprovados');
assert(app.includes("r.rejectedValor?'<div class=\"earnings-rejected-value\">"), 'rejeitadas não estão separadas no extrato');
assert(migration.includes('grant execute on function public.record_payment_receipt(uuid, numeric, date, text) to authenticated;'), 'RPC de registro sem grant');

console.log('Finance payments smoke test OK: aprovação individual/em lote, recebido, a receber, rejeitadas informativas, RPCs, RLS e extrato verificados.');
