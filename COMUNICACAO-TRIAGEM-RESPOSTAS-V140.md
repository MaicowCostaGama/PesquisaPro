# Comunicação — triagem de respostas v140

## O que mudou

A aba **Comunicação** da gestão agora abre com uma fila de triagem visível no topo:

1. **Aguardando sua resposta** — a última mensagem veio de pesquisador, cliente ou outro usuário não pertencente à gestão.
2. **Aguardando retorno** — a última mensagem foi enviada por alguém da gestão e a conversa aguarda a outra pessoa.
3. **Todas** — mostra todos os canais autorizados, inclusive canais sem mensagens e arquivados.

Cada opção mostra a quantidade de canais e cada conversa recebe uma etiqueta correspondente na lista.

## Atualização em tempo real

- Ao enviar uma resposta, a conversa passa imediatamente de **Aguardando sua resposta** para **Aguardando retorno**.
- Quando chega uma mensagem externa, a conversa é reclassificada pela última mensagem.
- Se a conversa deixar de pertencer ao filtro atual, ela sai da lista sem apagar o histórico.
- O contador numérico do menu **Comunicação** continua sendo atualizado pela RPC existente da v136.

## Regra técnica

A classificação usa somente:

- `channel_id`;
- `sender_id`;
- `sender_role`;
- `created_at`.

O frontend consulta apenas as mensagens dos canais que já foram autorizados pelo RLS do Supabase. O conteúdo das mensagens não é carregado para classificar canais que não estejam autorizados. Canais arquivados não entram nas duas filas ativas, mas continuam disponíveis em **Todas**.

## Banco de dados

**Nenhuma migration nova é necessária.** A alteração utiliza as tabelas e políticas já existentes:

- `chat_channels`;
- `chat_messages`;
- `chat_message_reads`;
- RLS e `chat_user_can_access_channel`.

Não foi executado SQL no Supabase.

## Validação local

- `node --check app.js` — aprovado.
- Sintaxe de todos os arquivos `.js` — aprovada.
- `communication-response-status-smoke-test.js` — aprovado.
- `chat-communication-smoke-test.js` — aprovado.
- `staff-navigation-pending-smoke-test.js` — aprovado.
- Suíte completa de smoke tests — aprovada.
- Cache local atualizado para `20261008092042`.

A publicação no GitHub/Vercel permanece pendente de autorização explícita para esta alteração v140.
