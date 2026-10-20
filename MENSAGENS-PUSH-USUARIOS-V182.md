# Mensagens Push para usuários — v182

A v182 acrescenta, na aba **Usuários**, o botão **Enviar Push** para o Administrador master e o ADM PesquisaPro. O envio pode ser direcionado a todos os perfis ativos, aos perfis ativos visíveis na aba/filtro atual ou a um usuário ativo individual. Cada linha de usuário ativo também recebe o botão individual **Enviar Push**.

## Como usar

1. Abra **Usuários**.
2. Clique em **Enviar Push** no cabeçalho para uma seleção em massa, ou em **Enviar Push** na linha do usuário.
3. Escolha o destinatário, informe título e mensagem e confirme.
4. Confira o resultado: dispositivos notificados, usuários sem Push cadastrado, falhas e quantidade de destinatários considerados.

A mensagem só é enviada depois da confirmação. O fluxo não altera cadastro, status, permissões ou dados da pesquisa. Um usuário só recebe a notificação se estiver ativo e tiver uma inscrição Web Push válida; ter cadastro ativo, por si só, não garante entrega. O navegador ou sistema operacional também pode bloquear notificações.

## Ativação da função

Não há migration SQL nova nesta versão. Para o botão funcionar no ambiente publicado, a função abaixo precisa ser publicada/atualizada no Supabase Edge Functions:

- `send-admin-user-push` — arquivo `supabase/functions/send-admin-user-push/index.ts`.

Ela valida a sessão e o perfil do solicitante, permitindo apenas `admin` e `admpro` ativos; consulta somente perfis ativos; valida endpoints Push conhecidos; remove apenas inscrições que o provedor comprovar como expiradas (HTTP 404/410); e nunca expõe a chave privada VAPID no frontend.

A função utiliza os segredos já adotados pelo Web Push do projeto, configurados exclusivamente no ambiente da Edge Function:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (opcional, com padrão `mailto:admin@pesquisa-pro.com`)
- `APP_URL` (opcional; deve apontar para `https://www.pesquisa-pro.com`)

Não cole chaves no código, no GitHub ou no chat. A v182 não executa SQL automaticamente e não altera inscrições Push existentes.
