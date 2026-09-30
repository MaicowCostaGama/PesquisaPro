const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const migration = fs.readFileSync('deploy/pagamentos-recebimentos-extrato.sql', 'utf8');
const receiptsMigration = fs.readFileSync('deploy/comprovantes-pagamentos.sql', 'utf8');
const deleteReceiptMigration = fs.readFileSync('deploy/excluir-comprovante-pagamento.sql', 'utf8');
const editReceiptMigration = fs.readFileSync('deploy/alterar-valor-pagamento.sql', 'utf8');

for (const token of [
  'PAYMENT_RECEIPTS',
  'loadPaymentReceiptsIfNeeded',
  'paymentReceivedValue',
  'paymentBalanceValue',
  'saldoDevido',
  'finApprovePayment',
  'finApproveAll',
  'finRegisterPayment',
  'record_payment_receipt',
  'Histórico de recebimentos',
  'Registrar pagamento semanal',
  'Pagamento semanal — ',
  'Pagamentos semanais durante a coleta',
  'Saldo devido',
  'financeWhatsAppMessage',
  'financePixMarkup',
  'finance-pix-action',
  'finance-pix-action-value',
  'finance-pix-action-copy',
  'Copiar PIX',
  'conversationButton(r.phone',
  'copyTextValue',
  'participatedSurveyIds',
  'myReceiptHistoryHtml',
  'paymentReceiptDateBR',
  'researcher-receipt-survey',
  'finance-table-hint',
  'finance-actions-header',
  'finance-actions-cell',
  'paymentReceiptUpload',
  'paymentReceiptOpen',
  'paymentReceiptDownload',
  'paymentReceiptActionMarkup',
  'finAttachReceiptById',
  'financeReceiptRowAction',
  'financeFocusReceiptHistory',
  'financeReceiptHistory',
  'finance-action-receipt-attach',
  'finance-action-receipt-history',
  'financeDeleteReceiptById',
  'financeEditReceiptAmount',
  'finance-action-receipt-delete',
  'finance-action-receipt-edit',
  'payment-receipt-delete',
  'payment-receipt-edit',
  'detach_payment_receipt',
  'update_payment_receipt_amount',
  'PAYMENT_RECEIPTS_DELETE_SCHEMA_MISSING',
  'PAYMENT_RECEIPTS_EDIT_SCHEMA_MISSING',
  'payment-receipt-attach',
  'receiptPath',
  'receiptName',
  'Anexar comprovante',
  'Abrir comprovante',
  'Baixar',
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
  'payment-receipts',
  'receipt_path',
  'receipt_name',
  'receipt_mime_type',
  'receipt_size',
  'attach_payment_receipt',
  'gestao gerencia comprovantes de pagamento',
  'pesquisador vê seu comprovante de pagamento',
  '10485760',
  'public.is_staff()'
]) {
  assert(receiptsMigration.includes(token), `regra de comprovante ausente: ${token}`);
}

for (const token of [
  'detach_payment_receipt',
  'receipt_path = null',
  'receipt_name = null',
  'receipt_mime_type = null',
  'receipt_size = null',
  'p_storage_path',
  'payment receipt not found or storage path does not match',
  'public.is_staff()',
  'grant execute on function public.detach_payment_receipt(uuid,text) to authenticated'
]) {
  assert(deleteReceiptMigration.includes(token), `regra de exclusão segura ausente: ${token}`);
}
assert(!deleteReceiptMigration.match(/delete\s+from\s+public\.payment_receipts/i), 'migration não pode apagar lançamentos financeiros');

for (const token of [
  'update_payment_receipt_amount',
  'p_receipt_id uuid',
  'p_amount numeric',
  'public.is_staff()',
  'v_receipt public.payment_receipts%rowtype',
  'v_payment public.payments%rowtype',
  'for update',
  'v_other_received',
  'pr.id <> v_receipt.id',
  'updated receipt exceeds amount due',
  'set amount = v_amount',
  'grant execute on function public.update_payment_receipt_amount(uuid, numeric) to authenticated'
]) {
  assert(editReceiptMigration.includes(token), `regra de alteração de valor ausente: ${token}`);
}
assert(!editReceiptMigration.match(/delete\s+from\s+public\.(payment_receipts|payments)/i), 'migration de correção não pode apagar pagamentos ou lançamentos');

for (const token of [
  '.finance-table-scroll',
  '.finance-data-table',
  '.finance-row-actions',
  '.finance-action-approve',
  '.finance-action-receipt',
  '.finance-to-receive',
  '.finance-weekly-callout',
  '.finance-balance-note',
  '.finance-pix-cell',
  '.finance-pix-value',
  '.finance-pix-copy',
  '.finance-pix-action',
  '.finance-pix-action-value',
  '.finance-pix-action-copy',
  '.finance-contact-missing',
  '.researcher-receipts-by-survey',
  '.researcher-receipt-survey-head',
  '.researcher-receipt-item',
  '.researcher-receipt-note',
  '.finance-table-hint',
  '.finance-actions-header',
  '.finance-actions-cell',
  '.finance-receipts-table',
  '.payment-receipt-actions',
  '.payment-receipt-view',
  '.payment-receipt-download',
  '.payment-receipt-attach',
  '.finance-action-receipt-attach',
  '.finance-action-receipt-history',
  '.finance-action-receipt-delete',
  '.finance-action-receipt-edit',
  '.payment-receipt-delete',
  '.payment-receipt-edit',
  '.finance-receipt-row-actions',
  '.finance-receipt-highlight',
  '.payment-receipt-name',
  '.researcher-receipt-file',
  'position:sticky;right:0',
  '.earnings-rejected-value',
  '@media(max-width:640px)'
]) {
  assert(css.includes(token), `estilo financeiro ausente: ${token}`);
}

assert(html.includes('app.js?v=20260930132200'), 'cache do app financeiro não foi atualizado');
assert(html.includes('style.css?v=20260930132200'), 'cache do CSS financeiro não foi atualizado');
assert(app.includes("r.status==='aprovado'?Math.max(0,valor-recebido):0"), 'a receber não está restrito a pagamentos aprovados');
assert(app.includes('const saldoDevido=Math.max(0,valor-recebido)'), 'saldo devido não é abatido pelos recebimentos');
assert(app.includes('paymentBalanceValue(r,price)'), 'saldo devido não usa o valor real das entrevistas e recibos');
assert(app.includes("r.rejectedValor?'<div class=\"earnings-rejected-value\">"), 'rejeitadas não estão separadas no extrato');
assert(migration.includes('grant execute on function public.record_payment_receipt(uuid, numeric, date, text) to authenticated;'), 'RPC de registro sem grant');
assert(app.includes('O pagamento, o valor, a data e o histórico serão preservados'), 'exclusão não confirma preservação do lançamento');
assert(app.includes("sb.rpc('detach_payment_receipt'"), 'exclusão não chama a RPC segura');
assert(app.includes("sb.storage.from('payment-receipts').remove"), 'exclusão não remove o arquivo privado');
assert(app.includes("sb.rpc('update_payment_receipt_amount'"), 'alteração não chama a RPC segura');
assert(app.includes('p_receipt_id:receipt.id'), 'alteração não identifica o recibo correto');
assert(app.includes('O mesmo lançamento, a data, o pesquisador, o comprovante e o histórico serão preservados'), 'alteração não confirma preservação do lançamento e comprovante');

console.log('Finance payments smoke test OK: aprovação, saldo abatido, correção de valores, comprovantes privados, RPCs, RLS e extratos por pesquisa verificados.');
