# Relatório — identificação de pesquisas homônimas (v147)

## Problema observado

As perguntas a partir da 13ª apareciam com a base válida preenchida, mas sem distribuição de respostas. A investigação mostrou que havia diferença entre a pesquisa visualizada no app e a pesquisa usada em um diagnóstico anterior: os nomes eram semelhantes/homônimos, porém a base válida observada era diferente (por exemplo, 687 na tela e 677 em uma consulta anterior).

O relatório não deve misturar respostas entre pesquisas diferentes, porque isso poderia duplicar entrevistas ou atribuir resultados à campanha errada. Portanto, o comportamento correto é permitir a escolha explícita da versão correta.

## Alterações

- O snapshot mantém `created_at` da pesquisa.
- Quando existem pesquisas com o mesmo nome, o seletor passa a mostrar:
  - nome;
  - data da pesquisa;
  - oito primeiros caracteres do ID;
  - base válida, quando já carregada.
- A tela consulta as versões homônimas usando somente as RPCs agregadas existentes (`survey_report_all_questions_v2` ou a RPC anterior como fallback).
- Se a pesquisa selecionada não possui dados nas perguntas finais, mas outra versão homônima possui respostas agregadas, aparece um aviso destacado com botão para abrir a outra versão.
- Não há mistura automática entre campanhas e nenhuma resposta bruta é carregada para fazer o diagnóstico.
- A ação de trocar de versão mantém o fluxo normal do Relatório e refaz a consulta pelo ID selecionado.

## Migration

**Nenhuma migration nova é necessária para a v147.** A melhoria usa os dados e RPCs já existentes. A migration v143/v2 continua sendo necessária apenas se o projeto ainda não tiver a RPC `survey_report_all_questions_v2`; nesse caso, o app usa a RPC antiga, quando disponível, e o usuário deve seguir as instruções SQL já entregues anteriormente.

## Validação local

- `node --check app.js`: aprovado.
- Todos os arquivos JavaScript: sintaxe aprovada.
- Todos os smoke tests: aprovados.
- Novo teste: `reports-duplicate-survey-smoke-test.js` aprovado.
- CSS balanceado e `.finance-table-scroll` preservado.
- Cache local atualizado para `20261008162850`.

A v147 foi preparada para publicação após autorização específica desta correção.
