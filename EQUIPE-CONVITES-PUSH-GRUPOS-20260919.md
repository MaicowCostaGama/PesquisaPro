# Convites em massa, push e grupos por pesquisa — 19/09/2026

A aba **Equipe** agora pode convidar vários pesquisadores elegíveis de uma só vez. A pessoa convidada continua tendo liberdade para aceitar ou recusar o convite no próprio painel; nenhum convite em massa adiciona alguém diretamente à equipe.

## Critério de elegibilidade

O botão considera os filtros atuais da tela e envia somente pesquisadores que estejam ativos, tenham documento com foto e comprovante de residência anexados, possuam cidade de residência ou cidade de atuação e sejam compatíveis com a área da pesquisa quando ela tiver estados ou cidades definidos. O filtro de escolaridade também é respeitado.

A validação é repetida na RPC `create_survey_invites_bulk`, no banco, para não depender somente da interface. Pesquisadores fora da área, com cadastro pendente ou com documentos faltantes não entram no lote.

## Fluxo do convite

Ao clicar em **Convidar pesquisadores elegíveis**, o sistema cria ou reabre os convites pendentes para a pesquisa. Cada pesquisador recebe uma notificação push caso tenha ativado as notificações no próprio navegador. Mesmo sem push, o convite aparece no painel ao entrar no aplicativo.

No **Meu painel**, o pesquisador pode tocar em **Aceitar** ou **Recusar**. O aceite autenticado grava o vínculo em `survey_team` e cria automaticamente o canal de chat da pesquisa, se ele ainda não existir. A recusa não cria vínculo.

Depois do aceite, o pesquisador vê em seu painel a área **Pesquisas aceitas e canais de apoio**, com o botão **Chat da pesquisa** e, quando configurado pela gestão, o botão **Entrar no grupo do WhatsApp**.

## Grupo do WhatsApp

Na tela **Equipe**, a gestão deve criar o grupo específico da pesquisa no WhatsApp, copiar o link oficial de convite e colar em **Grupos desta pesquisa**. O WhatsApp não permite adicionar automaticamente pessoas a um grupo somente pelo número Business; por isso, após aceitar, o pesquisador abre o link e solicita a entrada no grupo.

O link é armazenado em `survey_communication_settings` e só é retornado pelo RPC `get_my_survey_communications` para pesquisadores autenticados que tenham aceitado aquela pesquisa. Ele não é mostrado a pesquisadores que apenas receberam ou recusaram o convite.

## Push real

O aplicativo registra uma assinatura Web Push em `push_subscriptions` somente depois de o pesquisador tocar em **Ativar notificações** e autorizar o navegador. O service worker exibe a notificação e abre o aplicativo ao tocar nela.

O envio é feito pela função Edge `send-survey-invite-push`, que usa a chave privada VAPID somente como secret no Supabase. A chave privada nunca deve entrar no GitHub, em `push-config.js` ou no frontend.

Antes de publicar o push real, é necessário:

1. Gerar um par de chaves VAPID próprio. A chave pública pode ser colocada em `push-config.js` no campo `PP_PUSH_PUBLIC_KEY`; a chave privada deve ficar somente no secret `VAPID_PRIVATE_KEY` da função.
2. Configurar na função os secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `APP_URL`.
3. Publicar a função `supabase/functions/send-survey-invite-push/index.ts` no projeto Supabase.
4. Executar `deploy/equipe-convites-push-grupos.sql` depois de confirmar que as migrations de convites individuais e chat já estão aplicadas.

Uma forma usual de gerar o par é executar `npx web-push generate-vapid-keys` em um computador confiável. A saída deve ser guardada com cuidado. Depois, a chave pública deve substituir o valor vazio em `push-config.js`. A chave privada deve ser cadastrada somente como secret, sem colocá-la no arquivo público:

```bash
supabase secrets set VAPID_PUBLIC_KEY="<chave-publica>" VAPID_PRIVATE_KEY="<chave-privada>" VAPID_SUBJECT="mailto:admin@pesquisa-pro.com" APP_URL="https://www.pesquisa-pro.com/app.html"
supabase functions deploy send-survey-invite-push
```

Os comandos acima devem ser executados com a CLI autenticada no projeto correto. O texto `<chave-privada>` é um marcador: não o substitua em arquivos do site, no GitHub ou em mensagens públicas.

Enquanto a função Edge ou as chaves ainda não estiverem configuradas, o convite interno continua válido e aparece no painel do pesquisador; o aplicativo informa que o push real ainda depende da configuração.

## Preservação e segurança

A alteração é aditiva. Não apaga pesquisadores, equipes, convites anteriores, pesquisas, coletas, respostas, contratos ou mensagens. As políticas RLS protegem as assinaturas de push, o link do grupo e as funções de aceite e criação de convites. O aceite nunca é feito em nome do pesquisador.
