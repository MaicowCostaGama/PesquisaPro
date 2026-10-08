# Encerramento voluntário do pesquisador — v138

## O que foi implementado

- Em **Meu contrato**, o pesquisador assinado encontra o botão **Solicitar encerramento e cancelar inscrição**.
- O aplicativo pede confirmação explícita antes de prosseguir.
- Após a confirmação, uma RPC segura registra a solicitação, altera o perfil para `encerrado` e encerra a sessão.
- O pesquisador encerrado não consegue entrar novamente nem iniciar novas coletas.
- A gestão passa a ter a aba **Usuários inativos**, separada dos pesquisadores ativos e pendentes.
- O histórico de contratos, assinaturas, coletas, auditorias, pagamentos e comprovantes não é apagado.
- A gestão pode usar **Reativar usuário** para liberar novamente o acesso. A trilha de encerramento permanece registrada.

## Migration manual obrigatória

Arquivo:

`deploy/encerramento-voluntario-pesquisador.sql`

Execute o conteúdo completo no SQL Editor do projeto Supabase, uma única vez, e aguarde a mensagem de sucesso. A migration é aditiva: cria apenas a trilha de encerramento, as RPCs e o trigger de bloqueio de novas coletas; não remove coletas, pagamentos ou contratos.

A migration continua sendo executada manualmente no Supabase. O código v138 pode ser publicado separadamente; a funcionalidade só ficará operacional depois que esta migration estiver instalada no banco.

Até a migration ser executada, o botão não deve ser usado em produção: o aplicativo exibirá erro seguro caso a RPC ainda não exista.

## Segurança e comportamento

- O encerramento só pode ser solicitado pelo próprio pesquisador autenticado.
- A reativação exige a função administrativa prevista no banco.
- A proteção no banco bloqueia inserções de novas entrevistas feitas pelo próprio perfil encerrado, mesmo que uma sessão antiga do aplicativo permaneça aberta.
- A tabela de encerramentos registra pesquisador, contrato vigente quando existente, versão, motivo, data e eventual reativação.
- Nenhum status financeiro é apagado ou recalculado pela solicitação.

## Validação local

- Sintaxe JavaScript: aprovada em 106 arquivos.
- Parser PostgreSQL da migration: aprovado.
- Smoke tests: 95/95 aprovados.
- CSS: parser aprovado e `.finance-table-scroll` preservado.
- A migration não foi executada pelo agente. O código v138 foi autorizado pelo usuário para publicação; a migration permanece fora do commit e deve ser aplicada manualmente.
