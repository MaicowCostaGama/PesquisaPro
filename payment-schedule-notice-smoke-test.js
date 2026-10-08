const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const migrationPath = 'deploy/avisos-programacao-pagamento.sql';
const migrationAvailable = fs.existsSync(migrationPath);
const migration = migrationAvailable ? fs.readFileSync(migrationPath, 'utf8') : '';

for (const token of [
  'PAYMENT_NOTICES',
  'loadPaymentNoticesIfNeeded',
  'paymentNoticeRowToEntry',
  'financePaymentScheduleMarkup',
  'researcherPaymentNoticesMarkup',
  'announcePaymentSchedule',
  'announce_payment_schedule',
  'Avisos de pagamento',
  'Programações de pagamento enviadas',
  'Valor aprovado',
  'Já quitado',
  'Saldo após quitação',
  'Saldo restante',
  'Até que horas o pagamento será realizado',
  'Serão pagos os valores aprovados e contabilizados até este momento',
  'outros saldos e novas coletas serão pagos posteriormente'
]) {
  assert(app.includes(token), `recurso de aviso financeiro ausente: ${token}`);
}

if (migrationAvailable) {
  for (const token of [
    'payment_notices',
    'amount_due',
    'amount_paid',
    'amount_remaining',
    'scheduled_for',
    'scheduled_until',
    'payment_receipts',
    'p.approved_valid_count',
    "p.status = 'aprovado'",
    'public.is_staff()',
    'grant execute on function public.announce_payment_schedule(uuid, date, time, text) to authenticated',
    'mark_payment_notice_read',
    'pesquisador lê seus avisos de pagamento'
  ]) {
    assert(migration.includes(token), `regra SQL de aviso ausente: ${token}`);
  }

  assert(!/delete\s+from\s+public\.(payment_notices|payment_receipts|payments)/i.test(migration), 'migration de aviso não pode apagar pagamentos, recibos ou avisos');
  assert(!/drop\s+table\s+public\.payment_notices/i.test(migration), 'migration de aviso não pode remover a tabela');
}

for (const token of [
  '.payment-schedule-card',
  '.payment-schedule-heading',
  '.payment-schedule-list',
  '.payment-schedule-item',
  '.payment-schedule-values',
  '.finance-approval-summary'
]) {
  assert(css.includes(token), `estilo de aviso financeiro ausente: ${token}`);
}

assert(html.includes('app.js?v=20261008171600'), 'cache do app não foi atualizado para o aviso financeiro');
assert(html.includes('style.css?v=20261008171600'), 'cache do CSS não foi atualizado para o aviso financeiro');
assert(app.includes("sb.rpc('announce_payment_schedule'"), 'botão não chama a RPC de programação');
assert(app.includes("sb.from('payment_notices').select('*')"), 'pesquisador/gestão não carregam avisos');
assert(app.includes("stat('A receber',brl(aReceber)"), 'resumo financeiro do pesquisador não foi preservado');
assert(app.includes('<b>Quitado: ${brl(recebido)}</b>'), 'linha financeira não exibe o valor quitado');

console.log(`Payment schedule notice smoke test OK: frontend financeiro verificado${migrationAvailable ? ' e migration aditiva verificada' : ' (migration não incluída no clone publicado)'}.`);
