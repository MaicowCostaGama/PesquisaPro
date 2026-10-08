# Correção da associação das respostas no Relatório — v143

## Causa confirmada

A consulta de diagnóstico executada com uma sessão de gestão mostrou que:

- a RPC real retorna dados para as 22 perguntas;
- as perguntas que apareciam vazias possuem respostas diretas;
- a base válida e as categorias são retornadas corretamente pelo banco.

Assim, o defeito estava na associação do retorno ao cartão visual da pergunta, não na ausência de dados.

## Correção

A nova RPC `survey_report_all_questions_v2(uuid)` retorna:

- `question_id` — UUID persistido;
- `question_position` — posição persistida no formulário;
- `question_text` — texto persistido;
- `value_label`, `cnt` e `valid_base`.

O frontend associa os dados nesta ordem:

1. UUID da pergunta;
2. posição persistida como fallback.

Isso cobre formulários que passaram por recriação, edição ou atualização de IDs sem alterar as respostas já gravadas.

A RPC anterior continua como fallback temporário caso a v2 ainda não tenha sido executada.

## Migration manual

Execute no Supabase:

```text
deploy/corrigir-associacao-relatorio-por-posicao.sql
```

A migration é aditiva, protegida por `public.is_staff()` e não altera nem apaga coletas ou respostas.

## Depois da migration

1. Atualize o PesquisaPro com `Ctrl + Shift + R`.
2. Abra Relatórios.
3. Selecione novamente **PESQUISA PROTEÇÃO VEICULAR SP**.
4. Confirme que as perguntas 1, 3, 5–8, 10, 13–16 e 20–21 passam a exibir suas distribuições.
