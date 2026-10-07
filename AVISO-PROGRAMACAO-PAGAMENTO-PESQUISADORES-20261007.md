# Aprovação, quitação e aviso de programação de pagamento — 07/10/2026

## O que foi implementado

Na aba **Financeiro**, a gestão passa a visualizar de forma explícita:

- **Valor devido** pelas entrevistas válidas;
- **Valor aprovado** para pagamento;
- **Valor já quitado** por repasses registrados;
- **Saldo após a quitação**;
- Entrevistas e valores ainda aguardando aprovação.

A mesma separação aparece em **Meus ganhos** para o pesquisador.

## Aviso de programação

A gestão pode usar:

- **Anunciar programação de pagamento**, no resumo geral do Financeiro; ou
- **Anunciar pagamento deste saldo**, dentro de uma pesquisa.

O sistema solicita o dia e o horário-limite. O aviso informa que os valores aprovados e contabilizados até o momento serão pagos naquele dia até o horário informado, enquanto outros saldos e novas coletas serão pagos posteriormente.

O registro é privado: cada pesquisador recebe o aviso no seu painel **Meus ganhos**, junto com o valor devido, o valor já quitado e o saldo restante registrados no momento do aviso. A gestão visualiza o histórico das programações dentro do Financeiro.

## Banco de dados

A migration aditiva `deploy/avisos-programacao-pagamento.sql` cria a tabela privada `payment_notices` e as RPCs de envio e leitura. Ela não altera nem apaga pagamentos, recibos, coletas ou históricos.

A migration deve ser executada manualmente no Supabase depois das migrations financeiras já existentes. O código não aplica migrations automaticamente.
