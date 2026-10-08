# Correção de respostas zeradas nos Relatórios — v142

## Problema observado

Na aba **Relatórios**, algumas perguntas apareciam com `0 válidas` mesmo existindo entrevistas coletadas. A tela usava a primeira linha devolvida pela RPC para descobrir a base válida. Quando nenhuma resposta era retornada para uma pergunta, a base ficava implicitamente em zero.

## Correções aplicadas

1. As RPCs de relatório passaram a usar:

   ```sql
   coalesce(ce.is_calibration, false) = false
   ```

   Assim, somente registros explicitamente marcados como calibração ficam fora dos resultados. Entrevistas históricas com `is_calibration = NULL` deixam de ser descartadas.

2. A mesma regra foi aplicada aos relatórios da gestão, resultados liberados para clientes e distribuição individual de respostas.

3. A interface usa a base local de coletas válidas como fallback visual durante a sincronização do RPC.

4. Quando há entrevistas válidas, mas nenhuma linha de resposta registrada para determinada pergunta, a tela informa claramente:

   > Nenhuma resposta foi registrada para esta pergunta na base válida.

   Isso evita confundir “sem respostas salvas” com “zero entrevistas válidas”.

## Ação manual necessária

Execute uma vez no SQL Editor do Supabase:

```text
deploy/corrigir-relatorios-respostas-validas.sql
```

A migration é **aditiva** e redefine apenas funções RPC. Não apaga, reclassifica nem atualiza coletas, respostas, pesquisadores ou pagamentos.

## Limitação importante

Se uma pergunta foi criada ou substituída depois que as entrevistas foram realizadas, ou se o formulário não chegou a gravar respostas para ela, nenhuma migration consegue reconstruir respostas que nunca foram persistidas. Nesse caso, a tela exibirá a base válida e a mensagem de ausência de respostas registrada para aquela pergunta.

## Validação local

- Cache atualizado para `20261008161120`.
- `app.js` e todos os arquivos JavaScript verificados com `node --check`.
- Migration validada por parser SQL quando disponível.
- Smoke tests de relatórios, resultados, heatmap e suíte geral executados antes do empacotamento.
