# PesquisaPro v133 — confirmação dos avisos antes da coleta

**Estado:** o usuário informou que executou a migration com sucesso no Supabase e autorizou a publicação da v133 em 07/10/2026. Nenhuma execução SQL foi feita por nós.

## Fluxo do pesquisador

1. Ao clicar em **Iniciar coleta**, o aplicativo consulta no Supabase as mensagens da **pesquisa selecionada** que ainda não possuem confirmação específica para o pesquisador autenticado. Isso inclui orientações iniciais pelo aplicativo e mensagens gerais ou individuais enviadas pela gestão na aba **Coleta**.
2. Se houver pendências, um **balão de leitura** mostra o texto integral, remetente, data, pesquisa e quantidade de avisos pendentes. O pesquisador lê o aviso, seleciona **“Li integralmente este aviso”** e clica em **Confirmar leitura**. O mesmo processo ocorre individualmente para cada aviso, em ordem cronológica. **Voltar sem iniciar** não registra confirmação e não inicia a entrevista.
3. A confirmação é salva com data/hora em `acknowledged_at` somente para o destinatário autenticado e para o aviso daquela pesquisa; também preenche `read_at` se ainda estiver vazio. O aplicativo consulta novamente o servidor após cada confirmação. Somente depois de não haver mais pendências, retoma as verificações preexistentes de **localização, cotas e gravação** e inicia a nova entrevista.
4. Avisos de outra pesquisa não bloqueiam a selecionada. Avisos enviados **após** o início de uma entrevista não interrompem a entrevista em andamento; são apresentados antes da próxima.
5. Se o servidor estiver indisponível ou a migration faltar, o novo início de coleta **não prossegue**; aparece uma mensagem explicativa. O painel **Avisos das pesquisas** continua legível durante a transição entre publicação do código e SQL (fallback sem `acknowledged_at`). Marcar um aviso como **lido** no painel não equivale a **confirmar a leitura** para iniciar a coleta; o painel passa a mostrar o selo **Leitura confirmada** quando apropriado.

As regras existentes de confirmação gravada do entrevistado **após 21h** permanecem ativas. O texto das orientações iniciais continua mencionando essa exigência e as regras de integridade da pesquisa.

## Supabase — executar manualmente antes de publicar o novo JavaScript

No **SQL Editor do projeto correto**, após confirmar que `mensagens-pesquisa-pesquisadores.sql` já está aplicada, execute integralmente [`deploy/confirmacao-leitura-antes-coleta.sql`](deploy/confirmacao-leitura-antes-coleta.sql). A migration acrescenta `acknowledged_at`, índice parcial e duas RPCs (`get_pending_survey_collection_messages` e `acknowledge_survey_collection_message`). Ela **não modifica retroativamente `read_at`**: avisos previamente lidos, porém sem confirmação expressa, aparecerão para confirmação na próxima coleta da respectiva pesquisa. Não apaga nem altera respostas, coletas, pagamentos, contratos ou avisos históricos.

**Ordem recomendada para evitar pausa operacional:** (1) instalar a migration manualmente; (2) publicar o código v133 com autorização separada; (3) testar com **uma pesquisa e conta de pesquisador de teste**, enviando um aviso geral ou individual de teste apenas para essa conta; (4) conferir que o balão aparece, que o botão sem checkbox não prossegue, e que após confirmar ele inicia a coleta normalmente. Não enviar mensagem de teste para pesquisadores reais em massa.

Se o código for publicado primeiro, pesquisadores com a versão nova **ficarão impedidos de iniciar novas coletas até a migration estar pronta**. Entrevistas já iniciadas não são interrompidas por este balão. A migration não será executada automaticamente por nós.

## Validação e escopo

Validação local: parser PostgreSQL, sintaxe JavaScript, CSS, **89 smoke tests** (incluindo simulação de dois avisos sucessivos, falha de rede e isolamento da pesquisa), e inspeção visual com conteúdo fictício em quatro larguras. Não houve teste de contas reais ou de escrita no banco de produção.

**Limite de segurança:** esta é uma trava do **fluxo de início da interface atual**, respaldada por confirmação persistida no banco. Clientes antigos ou chamadas diretas à API de inserção de coletas não são bloqueados pela nova migration; exigir isso no banco para qualquer cliente requer uma etapa adicional de desenho de reserva/validação, sem prejudicar entrevistas que já estavam em andamento quando um novo aviso chegou. A confirmação registra um ato declaratório de leitura, não comprova compreensão do conteúdo.
