const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const migration = fs.readFileSync('deploy/pagamentos-recebimentos-extrato.sql', 'utf8');
const receiptsMigration = fs.readFileSync('deploy/comprovantes-pagamentos.sql', 'utf8');
const deleteReceiptMigration = fs.readFileSync('deploy/excluir-comprovante-pagamento.sql', 'utf8');
const editReceiptMigration = fs.readFileSync('deploy/alterar-valor-pagamento.sql', 'utf8');
const incrementalApprovalMigration = fs.readFileSync('deploy/aprovacao-incremental-pagamentos.sql', 'utf8');

for (const token of [
  'PAYMENT_RECEIPTS',
  'loadPaymentReceiptsIfNeeded',
  'paymentReceivedValue',
  'paymentBalanceValue',
  'paymentApprovedValidValue',
  'paymentPendingValidValue',
  'paymentApprovedDueValue',
  'paymentApprovedBalanceValue',
  'paymentPendingDueValue',
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
  'Ver/alterar pagamentos',
  'financeDeleteReceiptById',
  'financeEditReceiptAmount',
  'finance-action-receipt-delete',
  'finance-action-receipt-edit',
  'finance-action-approve',
  'Aprovar novas coletas',
  'finance-approval-banner',
  'finance-payment-legend',
  'finance-summary-grid',
  'Não há novas entrevistas aguardando aprovação',
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
  'approved_valid_count',
  'approve_payment_increment',
  'no new interviews to approve',
  'receipt exceeds approved amount',
  'least(coalesce(v_payment.approved_valid_count',
  'grant execute on function public.approve_payment_increment(uuid) to authenticated',
  'create or replace function public.approve_payment_batch(p_survey_id uuid)'
]) {
  assert(incrementalApprovalMigration.includes(token), `regra de aprovação incremental ausente: ${token}`);
}
assert(!incrementalApprovalMigration.match(/delete\s+from\s+public\.(payment_receipts|payments)/i), 'migration incremental não pode apagar pagamentos ou recibos');

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
  '.finance-statement-payments',
  '.finance-statement-payment-row',
  '.finance-statement-payment-summary',
  '.finance-statement-payment-file',
  '.finance-statement-payment-footer',
  '.payment-receipt-actions',
  '.payment-receipt-view',
  '.payment-receipt-download',
  '.payment-receipt-attach',
  '.finance-action-receipt-attach',
  '.finance-action-receipt-history',
  '.finance-action-receipt-delete',
  '.finance-action-receipt-edit',
  '.finance-action-approve:disabled',
  '.finance-approval-banner',
  '.finance-payment-legend',
  '.finance-summary-grid',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  '.finance-overview-summary',
  '.finance-status-pending',
  '.finance-value-pending',
  'finance-data-table th.finance-actions-header,.finance-data-table td.finance-actions-cell{position:static!important',
  'overflow-x:auto;overflow-y:visible',
  '.finance-payments-card .finance-data-table tbody tr',
  'grid-template-columns:repeat(6,minmax(0,1fr))',
  '.finance-payments-card .finance-actions-cell .finance-row-actions',
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

assert(html.includes('app.js?v=20261007203035'), 'cache do app financeiro não foi atualizado');
assert(html.includes('style.css?v=20261007203035'), 'cache do CSS financeiro não foi atualizado');
assert(app.includes('paymentApprovedBalanceValue(r,price)'), 'a receber não está restrito ao valor aprovado');
assert(app.includes('const saldoDevido=Math.max(0,valor-recebido)'), 'saldo devido não é abatido pelos recebimentos');
assert(app.includes('paymentBalanceValue(r,price)'), 'saldo devido não usa o valor real das entrevistas e recibos');
assert(app.includes('paymentPendingDueValue(r,price)'), 'novas coletas não estão separadas do valor já aprovado');
assert(app.includes("r.rejectedValor?'<div class=\"earnings-rejected-value\">"), 'rejeitadas não estão separadas no extrato');
assert(migration.includes('grant execute on function public.record_payment_receipt(uuid, numeric, date, text) to authenticated;'), 'RPC de registro sem grant');
assert(app.includes('O pagamento, o valor, a data e o histórico serão preservados'), 'exclusão não confirma preservação do lançamento');
assert(app.includes("sb.rpc('detach_payment_receipt'"), 'exclusão não chama a RPC segura');
assert(app.includes("sb.storage.from('payment-receipts').remove"), 'exclusão não remove o arquivo privado');
assert(app.includes("sb.rpc('update_payment_receipt_amount'"), 'alteração não chama a RPC segura');
assert(app.includes("sb.rpc('approve_payment_increment'"), 'aprovação incremental não chama a RPC segura');
assert(app.includes('p_receipt_id:receipt.id'), 'alteração não identifica o recibo correto');
assert(app.includes('O mesmo lançamento, a data, o pesquisador, o comprovante e o histórico serão preservados'), 'alteração não confirma preservação do lançamento e comprovante');
assert(app.includes('Comprovante e ações'), 'histórico não identifica a coluna com a ação de alteração');
assert(app.includes('financeStatementPaymentsSection'), 'extrato não possui seção individual de pagamentos');
assert(app.includes('Pagamentos realizados e comprovantes'), 'extrato não mostra pagamentos e comprovantes individuais');
assert(app.includes('finance-statement-payment-row'), 'extrato não renderiza cada repasse individualmente');
assert(app.includes('async function financeOpenResearcherStatement(idx,researcherId,options={})'), 'extrato não aceita foco contextual');
assert(app.includes('financeStatementRender(payment,survey,payment,events,{...options,staff:true,financeIdx:idx})'), 'foco de pagamentos não é transmitido ao extrato');
assert(app.includes('financeOpenResearcherStatement(idx,paymentRow.researcherId,{focusPayments:true})'), 'botão de pagamentos não abre o pesquisador selecionado');
assert(app.includes('if(options.focusPayments)'), 'extrato não trata abertura focada nos pagamentos');
assert(app.includes('dialog.scrollTop=Math.max(0,payments.offsetTop-12)'), 'extrato focado ainda não posiciona o livro de pagamentos');
assert(app.includes("const receipts=paymentReceiptsFor(paymentId);if(!receipts.length)return ''"), 'ações do pagamento não reconhecem o conjunto completo de lançamentos');
assert(app.includes('actions=[`<button type="button" class="btn-ghost finance-action-receipt-history"'), 'histórico não é priorizado quando existem pagamentos');
assert(app.includes("if(pending)actions.push(`"), 'comprovante pendente não mantém as ações de anexar e alterar');
assert(!app.includes('if(pending)return `<div class="finance-receipt-row-actions">'), 'comprovante pendente não pode ocultar o histórico de múltiplos pagamentos');
assert(app.includes('paymentReceiptActionMarkup(receipt,options.staff?\'staff\':\'researcher\')'), 'extrato não aplica ações de comprovante por perfil');
assert(app.includes('financeStatementClose();finRegisterPayment'), 'extrato não permite registrar outro pagamento pela gestão');
assert(app.includes('function financeReturnToDetail(idx){if(document.getElementById(\'financeStatementModal\'))financeStatementClose()'), 'ações do extrato não fecham a janela antes de atualizar a tela financeira');
assert(app.includes('title="Ver coletas, pagamentos e comprovantes"'), 'ação do cartão não identifica a conferência financeira completa');
assert(app.includes('Cada pesquisador aparece em um cartão completo'), 'orientação do novo layout financeiro ausente');
assert(!app.includes('const pixAction='), 'chave PIX duplicada dentro das ações financeiras');
for (const label of [
  'TOTAL A PAGAR NESTA PESQUISA',
  'QUANTIDADE DE PESQUISADORES',
  'VALOR POR FORMULÁRIO',
  'PAGAMENTOS PARCIAIS',
  'PAGAMENTOS A APROVAR',
  'FALTA PAGAR'
]) assert(app.includes(label), `balão financeiro ausente: ${label}`);
for (const label of [
  'Coletas válidas',
  'Coletas rejeitadas',
  'Valor total coleta válida',
  'Valor quitado',
  'Valor coleta a aprovar',
  'Saldo de coleta a receber',
  'Chave PIX',
  'Status',
  'Extrato de pagamento',
  'Conversar',
  'Aprovar novas coletas',
  'Ver/alterar pagamentos',
  'Alterar valor do pagamento',
  'Excluir comprovante de pagamento',
  'Registrar pagamento semanal',
  'Anexar comprovante de pagamento',
  'Copiar PIX'
]) assert(app.includes(label), `campo ou ação financeira ausente: ${label}`);
assert(app.includes('const valorAprovar=pendingValue'), 'valor de coleta a aprovar não está separado do saldo aprovado');
assert(app.includes('<td colspan="10"'), 'estado vazio não contempla os dez campos do cartão');
assert(app.includes("stat('PAGAMENTOS PARCIAIS',brl(t.recebido)"), 'pagamentos parciais não usam o total recebido');
assert(app.includes("stat('PAGAMENTOS A APROVAR',brl(t.pendingValor)"), 'pagamentos a aprovar não usam o pendente');
assert(app.includes("stat('FALTA PAGAR',brl(t.saldoDevido)"), 'falta pagar não usa o saldo devido');
for (const label of [
  'TOTAL A PAGAR EM TODAS AS PESQUISAS',
  'QUANTIDADE DE PESQUISADORES',
  'PAGAMENTOS PARCIAIS REALIZADOS',
  'PAGAMENTOS A APROVAR',
  'FALTA PAGAR'
]) assert(app.includes(label), `balão geral financeiro ausente: ${label}`);
assert(app.includes('const totalPesq=new Set(entries.flatMap(({i})=>finRows(i).map(r=>r.researcherId).filter(Boolean))).size'), 'quantidade geral não usa pesquisadores únicos');
assert(app.includes("stat('PAGAMENTOS PARCIAIS REALIZADOS',brl(totalRecebido)"), 'pagamentos parciais gerais não usam repasses realizados');
assert(app.includes("stat('PAGAMENTOS A APROVAR',brl(totalPend)"), 'aprovações gerais não usam o pendente agregado');
assert(app.includes("stat('FALTA PAGAR',brl(totalSaldoDevido)"), 'falta pagar geral não usa o saldo agregado');
assert(app.includes('Ganho total do pesquisador'), 'novo rótulo de ganho total não foi aplicado');
assert(!app.includes('<small>Total devido</small>'), 'rótulo antigo Total devido ainda aparece no banner financeiro');
assert(!app.includes('<th>Total devido</th>'), 'rótulo antigo Total devido ainda aparece na tabela financeira');

console.log('Finance payments smoke test OK: aprovação, saldo abatido, correção de valores, comprovantes privados, RPCs, RLS e extratos por pesquisa verificados.');
