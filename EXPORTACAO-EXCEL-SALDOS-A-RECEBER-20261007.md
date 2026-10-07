# Exportação Excel — saldos a receber

## O que foi implementado

A aba **Financeiro** passa a oferecer dois botões:

- **Exportar Excel — saldos a receber**, no resumo geral, reunindo todas as pesquisas ativas;
- **Exportar Excel — saldos a receber**, dentro de uma pesquisa específica.

O arquivo `.xlsx` contém:

| Coluna | Conteúdo |
|---|---|
| Nome do pesquisador | Nome cadastrado no perfil |
| Chave PIX | Chave PIX atual do perfil; quando ausente, aparece `Não informada` |
| Valor a receber (R$) | Saldo aprovado, descontados os pagamentos já registrados |
| Pesquisas | Pesquisa ou pesquisas que compõem o saldo da linha |

O arquivo também possui uma aba **Resumo** com o escopo, a quantidade de pesquisadores, o valor total a receber, o critério utilizado e a data de geração.

## Critério financeiro

Entram na exportação somente pesquisadores cujo valor esteja:

1. **aprovado para pagamento**; e
2. ainda **não recebido integralmente**.

Coletas aguardando aprovação não entram no arquivo. Coletas rejeitadas também não entram, conforme as regras do Financeiro. Pesquisas arquivadas são excluídas do escopo.

Quando a exportação geral reúne mais de uma pesquisa, os valores são agrupados por pesquisador. A chave PIX vem do perfil atual do pesquisador e não é copiada para outra tabela do banco.

## Privacidade e segurança

A planilha é gerada no navegador, usando a biblioteca local do aplicativo. Os dados financeiros não são enviados para um serviço externo nem gravados novamente no Supabase. O arquivo baixado deve ser tratado como documento financeiro privado.

A exportação fica disponível somente para os perfis de gestão que já podem administrar recebimentos: administrador, coordenação, gerência e ADM PesquisaPro.
