const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const xlsx = fs.readFileSync('vendor/xlsx.full.min.js', 'utf8');

for (const token of [
  "xlsx:{src:'vendor/xlsx.full.min.js'",
  "ready:()=>typeof window.XLSX!=='undefined'",
  'function financeExportSafePart',
  'function financeReceivablesExportRows',
  'async function financeExportReceivables',
  'paymentApprovedBalanceValue(r,price)',
  "'Nome do pesquisador'",
  "'Chave PIX'",
  "'Valor a receber (R$)'",
  "'Pesquisas'",
  'XLSXLib.utils.json_to_sheet',
  'XLSXLib.utils.aoa_to_sheet',
  "XLSXLib.writeFile(workbook,filename,{bookType:'xlsx',compression:true})",
  'saldos-a-receber-pesquisapro-',
  'financeExportReceivables()',
  "financeExportReceivables('+idx+')",
  'Somente valor aprovado e ainda não recebido; pagamentos pendentes de aprovação não entram.'
]) {
  assert(app.includes(token), `exportação financeira ausente: ${token}`);
}

assert(xlsx.length > 500000, 'biblioteca XLSX local não foi empacotada corretamente');
assert(html.includes('app.js?v=20261009095920'), 'cache do app não foi atualizado para a exportação Excel');
const exportFunction = app.match(/async function financeExportReceivables[\s\S]*?\nPAGES\.finance=/)?.[0] || '';
assert(exportFunction, 'função de exportação não foi delimitada corretamente');
assert(!/\bsb\.(from|rpc|storage)\b/.test(exportFunction), 'exportação não deve enviar dados financeiros ao Supabase');

console.log('Finance receivables export smoke test OK: XLSX local, nome, chave PIX, saldo aprovado e botão geral/por pesquisa verificados.');
