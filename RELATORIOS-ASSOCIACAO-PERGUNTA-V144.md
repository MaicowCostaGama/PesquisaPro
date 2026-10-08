# Correção da associação das respostas no Relatório — v144

## Diagnóstico confirmado

A consulta executada no Supabase para a pesquisa com 677 entrevistas válidas mostrou que as perguntas 13–22:

- estão ativas;
- possuem respostas na RPC `survey_report_all_questions_v2`;
- têm UUID coincidente;
- retornam categorias e contagens, com diagnóstico `OK: UUID coincide`.

Logo, banco, respostas e RPC estão corretos. O problema restante é a associação no frontend durante a montagem dos cartões.

## Correção v144

O frontend passa a associar os dados nesta ordem:

1. UUID persistido (`question_id`);
2. posição persistida (`question_position`);
3. texto da pergunta normalizado, ignorando diferenças de espaços e capitalização.

O terceiro nível cobre snapshots locais que estejam com posição ou UUID divergentes, mas cujo texto continue sendo o mesmo.

## Atualização

1. Atualize o PesquisaPro com `Ctrl + Shift + R`.
2. Abra **Relatórios**.
3. Selecione a pesquisa de proteção veicular.
4. Verifique novamente as perguntas 13 em diante.

A migration v143 já executada continua válida; a v144 não exige nova migration.
