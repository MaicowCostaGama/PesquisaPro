# Configuração pública do Push — v183

A v183 configura no frontend a chave pública VAPID fornecida para o projeto. Essa chave permite que o navegador registre uma inscrição Web Push; ela não é um segredo.

A chave privada VAPID não está no aplicativo, no ZIP ou no GitHub. Ela deve permanecer exclusivamente no secret `VAPID_PRIVATE_KEY` da Edge Function `send-admin-user-push`. O secret `VAPID_PUBLIC_KEY` do Supabase deve corresponder exatamente à chave pública distribuída no `push-config.js`. O `VAPID_SUBJECT` recomendado é `mailto:admin@pesquisa-pro.com`.

## Procedimento

1. No Supabase, mantenha os secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` cadastrados.
2. Publique a Edge Function `send-admin-user-push` se ela ainda não estiver implantada.
3. Publique o frontend v183.
4. Cada usuário deve abrir seu perfil no aplicativo, permitir notificações no navegador e ativar o Push neste dispositivo.
5. Na aba **Usuários**, o administrador poderá enviar uma mensagem para todos os usuários ativos ou para uma pessoa específica.

A v183 não altera pesquisas, coletas, respostas, usuários, permissões, SQL ou Edge Functions. A publicação desta versão é somente frontend; a alteração só deve ser publicada após conferência do ZIP e autorização específica.
