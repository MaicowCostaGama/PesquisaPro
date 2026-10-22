# Orientação inicial com vídeo obrigatório — v210

## O que mudou

Antes de iniciar uma nova entrevista, o pesquisador verá a orientação pendente em um balão bloqueante. Quando a mensagem for a orientação inicial da pesquisa, o balão também exibirá o vídeo de treinamento incorporado, com controles compatíveis com celular.

A sequência obrigatória é:

1. Ler integralmente a mensagem de orientação;
2. Assistir ao vídeo até o final;
3. Marcar a confirmação de leitura;
4. Clicar em **Confirmar leitura**;
5. Somente depois de confirmar todos os avisos pendentes o aplicativo retoma a validação de localização e libera a coleta.

Se o vídeo não carregar, a conexão cair, o pesquisador fechar o balão ou tentar confirmar antes do fim, a entrevista não começa. A confirmação continua sendo registrada pela RPC já existente `acknowledge_survey_collection_message`; marcar a mensagem como lida na caixa de entrada não substitui essa confirmação.

## Compatibilidade

Esta revisão usa a migration já aplicada de confirmação antes da coleta (`deploy/confirmacao-leitura-antes-coleta.sql`). Não é necessário executar SQL adicional para ativar o bloqueio do vídeo.

Mensagens de orientação inicial já enviadas também ficam protegidas: o aplicativo reconhece a orientação pelo conteúdo e apresenta o vídeo atual antes de liberar a primeira coleta. Mensagens operacionais comuns continuam exigindo somente a leitura e a confirmação correspondentes.

O vídeo atual é carregado pela função versionada `surveyTrainingVideoUrl()` e é usado tanto no modelo de orientação quanto no balão obrigatório. A mensagem continua editável na gestão, com os placeholders já existentes.

Para sincronizar também a URL e o texto do **próximo envio automático gerado pelo banco**, há o arquivo opcional `deploy/orientacao-video-obrigatorio-v210.sql`. Execute-o manualmente depois de `deploy/orientacao-automatica-aceite.sql` se quiser atualizar a função SQL. Ele não é necessário para o bloqueio do frontend e não altera mensagens já armazenadas.

## Validação local

Foram validados `node --check app.js`, o portão de confirmação existente, a orientação automática, os contadores de orientação e a nova cobertura estrutural `collection-training-gate-smoke-test.js`. Nenhum SQL remoto ou Edge Function é executado por esta alteração.
