# Extrato financeiro por pesquisador

## O que foi implementado

Na aba **Financeiro**, cada linha de pesquisador passa a ter o botão **Extrato**. O extrato é carregado para a pesquisa selecionada e usa as coletas reais de `collection_events`, o pagamento agregado da pesquisa/pesquisador e os recebimentos registrados.

No painel **Meus ganhos**, o pesquisador também vê a coluna **Extrato** e pode clicar em **Gerar extrato** para consultar o próprio detalhamento por pesquisa.

O extrato apresenta separadamente:

1. **Aprovadas e já pagas** — coletas válidas cobertas pelo valor já quitado;
2. **Aprovadas e a pagar** — coletas válidas aprovadas financeiramente, mas ainda com saldo a pagar;
3. **Em auditoria** — coletas sob análise, com o valor por formulário exibido como **valor potencial**. Se aprovadas, poderão entrar no saldo a receber em um pagamento futuro; enquanto estiverem em auditoria, não são consideradas aprovadas nem pagas;
4. **Rejeitadas e motivo** — coletas com status rejeitado e o motivo registrado na auditoria. Elas não geram saldo;
5. **Válidas aguardando aprovação financeira** — quando existirem novas coletas válidas ainda não aprovadas.

O cabeçalho também mostra quantidades, valores, valor por formulário, saldo aprovado a pagar e o motivo do saldo.

## Ações do extrato

- **Imprimir / salvar PDF**: abre a impressão do navegador com somente o extrato;
- **Baixar CSV**: salva uma planilha simples com data, coleta/cota, situação financeira, valor e motivo de reprovação.

## Regra financeira

O saldo aprovado a pagar é calculado com a mesma regra da aba Financeiro:

> valor das entrevistas válidas aprovadas menos os recebimentos lançados.

Entrevistas rejeitadas ficam apenas para informação e não entram em aprovado, a pagar, recebido ou saldo.

Coletas em auditoria também ficam fora do saldo aprovado a pagar. O extrato mostra a quantidade e o valor potencial delas separadamente, para que o pesquisador saiba o que poderá receber depois da análise e aprovação.

Como os pagamentos são lançados de forma agregada por pesquisador e pesquisa, a separação visual entre cada entrevista já paga e cada entrevista a pagar é uma classificação equivalente ao valor recebido. O extrato informa isso ao final para preservar a transparência do cálculo.

## Privacidade e escopo de acesso

- A gestão pode abrir o extrato de qualquer pesquisador dentro da pesquisa selecionada.
- O pesquisador pode abrir somente o próprio extrato, a partir de **Meus ganhos**.
- A consulta do pesquisador usa `ownOnly: true` e confirma o `researcher_id` autenticado antes de renderizar os dados.
- Nenhum dado de GPS, resposta individual ou comprovante privado é incluído no CSV; são exibidos apenas os dados necessários ao controle das próprias coletas e pagamentos.
