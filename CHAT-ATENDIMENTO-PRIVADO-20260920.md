# Chat privado de atendimento — 20/09/2026

## Comportamento

Clientes e pesquisadores agora usam a área **Comunicação** como um atendimento direto com a equipe PesquisaPro. Eles não recebem controles para criar canais, grupos ou públicos. Ao abrir a tela pela primeira vez, o sistema cria automaticamente um canal privado vinculado ao perfil autenticado, com o nome **Atendimento PesquisaPro**.

O cliente ou pesquisador só consegue visualizar e enviar mensagens no próprio canal privado. A equipe interna continua podendo visualizar e responder aos atendimentos autorizados por meio do módulo de comunicação. O realtime permanece ativo para que novas mensagens apareçam sem recarregar a página.

O chat por pesquisa e os canais segmentados existentes continuam preservados para os perfis que já possuem acesso. A criação administrativa de canais amplos, por estado, cidade, região ou pesquisa permanece disponível somente para a equipe interna.

## Segurança e preservação

A nova coluna `private_user_id` identifica o dono do atendimento. A função `chat_user_can_access_channel` permite ao cliente ou pesquisador acessar apenas o próprio canal privado; administradores, coordenadores, gerentes e usuários `admpro` continuam com acesso de gestão. O histórico de mensagens não é apagado. A referência ao perfil usa `on delete restrict` para evitar exclusão em cascata do atendimento.

## Migration manual

Depois de publicar o código, execute no SQL Editor do Supabase, nesta ordem caso ainda não estejam aplicadas:

1. `deploy/chat-comunicacao-segmentada.sql` — estrutura base do chat;
2. `deploy/chat-atendimento-privado.sql` — canal privado automático para clientes e pesquisadores.

A segunda migration depende da primeira. Ela não cria grupos de WhatsApp e não adiciona automaticamente ninguém a grupos externos. O WhatsApp continua sendo um recurso separado, quando houver um link oficial configurado pela gestão.

Após a execução, confirme **Success. No rows returned**, atualize o app com **Ctrl + Shift + R** e entre com uma conta de cliente ou pesquisador. Ao abrir **Comunicação**, deve aparecer o canal **Atendimento PesquisaPro** já selecionado, com campo para escrever e enviar mensagens.

## Validação local

A implementação foi validada com `node --check app.js` e todos os smoke tests do projeto. O teste específico é `chat-private-support-smoke-test.js`.
