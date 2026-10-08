# Relatórios — seleção segura da pesquisa (v148)

## Problema observado

Os cartões do Relatório exibiam uma base válida alta (por exemplo, 684–696 entrevistas), mas mostravam **“Nenhuma resposta foi registrada”** a partir da pergunta 13. A investigação indicou que havia versões homônimas ou muito semelhantes da pesquisa: a base de entrevistas exibida pertencia a uma versão, enquanto as respostas das perguntas finais estavam agregadas em outra.

Misturar as duas versões seria incorreto porque poderia duplicar ou atribuir respostas à pesquisa errada.

## Correção aplicada

- O Relatório passa a iniciar pela **campanha ativa do cabeçalho**, quando ela estiver disponível, em vez de escolher sempre a primeira pesquisa carregada.
- Uma seleção feita manualmente dentro do Relatório é preservada e não é sobrescrita durante a renderização.
- O seletor identifica versões com nomes iguais ou muito semelhantes, usando também as primeiras perguntas e vínculos de cliente como sinais auxiliares.
- O diagnóstico de cobertura procura essas versões semelhantes e oferece a abertura explícita da alternativa que possui respostas agregadas.
- O sistema continua usando somente uma pesquisa por vez; não há mistura de respostas entre versões.
- A troca da campanha pelo seletor global limpa a escolha manual anterior do Relatório para manter as telas coerentes.

## Segurança e dados

Esta alteração é somente de frontend e diagnóstico de leitura. **Nenhuma migration ou alteração no Supabase é necessária.** Nenhuma resposta, entrevista ou pesquisa é apagada ou modificada.

## Validação

- `node --check app.js`
- `node --check reports-duplicate-survey-smoke-test.js`
- Suíte completa de sintaxe e smoke tests: **PASS**
- Cache local: `20261008164650`

## Observação operacional

Ao entrar em Relatórios, confirme no cabeçalho e no seletor da própria tela a data/versão da pesquisa. Se existirem duas versões, abra a versão que contém a coleta correspondente; o sistema não deve consolidar respostas de campanhas diferentes automaticamente.
