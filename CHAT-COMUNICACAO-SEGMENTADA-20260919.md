# Chat e comunicação segmentada — 19/09/2026

O PesquisaPro passou a contar com uma estrutura preparada para comunicação interna por canais. O administrador ou outro perfil de gestão pode criar canais para todos os usuários, para uma região, um estado, uma cidade ou os participantes de uma pesquisa específica.

## Canais e visibilidade

| Público | Quem pode visualizar e responder |
| --- | --- |
| Todos os usuários | Usuários autenticados do aplicativo; a gestão também tem acesso |
| Região | Usuários cuja cidade de residência ou cidade de atuação pertence à região selecionada |
| Estado | Usuários cuja cidade de residência ou cidade de atuação pertence ao estado selecionado |
| Cidade | Usuários cuja cidade de residência ou cidade de atuação corresponde à cidade selecionada |
| Pesquisa | Pesquisadores vinculados em `survey_team`, clientes vinculados em `survey_clients` e equipe de gestão |

A região é derivada automaticamente do estado brasileiro cadastrado: Norte, Nordeste, Centro-Oeste, Sudeste ou Sul. Pesquisadores são avaliados tanto pela cidade onde moram quanto pelas cidades em que informaram disponibilidade para atuar.

## Uso no aplicativo

A nova entrada **Comunicação** aparece no menu dos administradores, coordenadores, gerentes, pesquisadores e clientes. A gestão vê o formulário **Criar canal de comunicação**, com seleção do público e, quando necessário, da localização ou pesquisa. Cada usuário vê apenas os canais autorizados pelo banco de dados.

O pesquisador também encontra um cartão **Comunicação com a equipe** dentro de **Meus dados**, além da entrada própria no menu. A tela permite tirar dúvidas de execução, comunicar problemas e acompanhar orientações gerais ou específicas da pesquisa.

Nas telas administrativas de pesquisas existe um atalho **Chat**. Na tela de atribuição de equipe existe também o botão **Chat da pesquisa**. Se o canal ainda não existir, a tela de comunicação já abre o formulário com a pesquisa pré-selecionada para que a gestão informe o nome e crie o canal.

As mensagens são limitadas a 4.000 caracteres, registram remetente, papel, data e hora, e recebem atualização em tempo real por meio do Supabase Realtime. A interface também funciona com atualização normal ao abrir o canal quando o navegador ou a conexão não receber o evento em tempo real.

## Segurança e preservação

A migration cria as tabelas `chat_channels`, `chat_messages` e `chat_message_reads`. As políticas RLS impedem que um usuário leia ou envie mensagens em canais que não sejam compatíveis com seu papel, localização ou vínculo com a pesquisa. A gestão pode criar e atualizar canais, mas as mensagens não são apagadas pelo fluxo da interface.

A alteração é **aditiva**. Ela não remove usuários, cidades, pesquisas, equipes, convites, contratos, coletas ou respostas. A migration precisa ser executada manualmente no SQL Editor do Supabase antes do uso; se ela ainda não estiver aplicada, a tela mostra uma orientação e o restante do aplicativo continua funcionando.

Arquivo para execução: `deploy/chat-comunicacao-segmentada.sql`.
