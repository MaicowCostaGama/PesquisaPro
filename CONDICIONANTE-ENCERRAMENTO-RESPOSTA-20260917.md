# Condicionante de encerramento por resposta — 17/09/2026

O editor de pesquisas agora permite marcar respostas específicas como condicionantes de encerramento. A configuração aparece somente em perguntas de escolha única ou múltipla, ao lado de cada opção, com o rótulo **encerrar**.

Quando o entrevistado seleciona uma opção marcada durante a coleta, o aplicativo interrompe imediatamente a entrevista em andamento e exibe a mensagem para leitura ao entrevistado: **“Não continue esta entrevista, esta resposta é uma condicionante necessária para o perfil de entrevistado”**. O aviso também informa ao pesquisador que a abordagem foi encerrada e não foi enviada como coleta válida. A resposta condicionante também não é gravada como resultado da pesquisa.

A regra vale para escolha única e múltipla. Em perguntas de escolha múltipla, a seleção de qualquer opção marcada encerra a entrevista. Perguntas de escala, número, data e texto livre não recebem essa configuração nesta versão.

## Salvamento e compatibilidade

A configuração é armazenada na coluna `survey_question_options.ends_interview`. A migration é aditiva, define `false` para todas as opções existentes e não remove pesquisas, perguntas, opções, respostas, pesquisadores ou contratos. O código mantém o salvamento normal das demais informações mesmo enquanto a migration ainda não foi aplicada e avisa o administrador para executá-la antes de usar a nova regra.

No Supabase SQL Editor, executar manualmente o arquivo `deploy/condicionante-encerramento-resposta.sql`. A aplicação dessa migration não foi feita automaticamente.

## Comportamento operacional

A entrevista encerrada não cria linha em `collection_events`, não entra nas cotas, nos relatórios, no mapa, no pagamento ou na auditoria como coleta válida. O pesquisador pode selecionar outra pesquisa/cota e iniciar uma nova abordagem depois do aviso.

A regra é uma implementação técnica de qualificação/encerramento de entrevista. A organização deve revisar a redação das condicionantes e sua aplicação operacional conforme a metodologia da pesquisa e suas orientações jurídicas ou éticas.

## Validação realizada

Foram executados `node --check app.js`, o novo `conditional-termination-smoke-test.js` e os smoke tests existentes do projeto. A sintaxe e os testes foram aprovados localmente.
