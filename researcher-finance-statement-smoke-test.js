const fs = require('fs');
const path = require('path');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(/financeOpenResearcherStatement\(idx,researcherId\)/.test(app), 'falta o handler do extrato na gestão');
expect(/researcherOpenOwnStatement\(surveyId\)/.test(app), 'falta o handler do extrato próprio do pesquisador');
expect(/CURRENT_PROFILE\?\.role!=='pesq'/.test(app), 'o extrato próprio precisa exigir perfil de pesquisador');
expect(/fetchCollectionEvents\(\{surveyId,ownOnly:true\}\)/.test(app), 'o extrato próprio não limita a consulta às coletas do pesquisador autenticado');
expect(/researcherId===CURRENT_PROFILE\.id/.test(app), 'o extrato próprio não confirma o pesquisador autenticado');
expect(/finance-action-statement/.test(app) && /Gerar extrato/.test(app), 'falta o botão Gerar extrato em Meus ganhos');
expect(/<th>Extrato<\/th>/.test(app), 'falta a coluna Extrato na tabela do pesquisador');
expect(/financeStatementSection\('Aprovadas e já pagas'/.test(app), 'falta o bloco de coletas aprovadas e já pagas');
expect(/financeStatementSection\('Aprovadas e a pagar'/.test(app), 'falta o bloco de coletas aprovadas e a pagar');
expect(/financeStatementSection\('Rejeitadas e motivo'/.test(app), 'falta o bloco de coletas rejeitadas com motivo');
expect(/rejectReason\|\|'Motivo não informado'/.test(app), 'motivo da reprovação não é exibido no extrato');
expect(/paymentApprovedBalanceValue\(payment,price\)/.test(app), 'saldo aprovado a pagar não usa o cálculo financeiro existente');
expect(/paymentReceivedValue\(payment\?\.id\)/.test(app), 'valor já pago não usa os recebimentos existentes');
expect(/financeStatementPrint/.test(app) && /window\.print\(\)/.test(app), 'extrato não pode ser impresso/salvo em PDF');
expect(/financeStatementCsv/.test(app) && /text\/csv/.test(app), 'extrato não possui exportação CSV');
expect(/event\.status==='rejected'/.test(app), 'coletas rejeitadas não são separadas pelo status real');
expect(/event\.status==='valid'/.test(app), 'coletas válidas não são separadas pelo status real');
expect(/finance-statement-modal/.test(css) && /finance-statement-section/.test(css), 'faltam estilos do extrato');
expect(/@media print/.test(css) && /financeStatementModal/.test(css), 'faltam estilos de impressão do extrato');
console.log('researcher-finance-statement-smoke-test: OK');
