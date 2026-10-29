# Desistência do entrevistado durante a coleta

## Comportamento

Durante uma entrevista em andamento, o pesquisador poderá usar **Entrevistado desistiu** no início do formulário ou **Registrar desistência do entrevistado** junto aos controles de conclusão. O motivo é escolhido entre: preferiu não continuar, não tinha mais tempo, não se sentiu à vontade e outro/não informado. Não é solicitado texto livre nem identificação do entrevistado.

Uma confirmação explica que as respostas parciais e o áudio ainda local serão descartados. Ao confirmar, o formulário deixa de poder ser concluído. O sistema registra somente a ocorrência neutra em `collection_withdrawals`, com pesquisa, pesquisador autenticado, horário, cota, motivo padronizado e classificação de teste definida pelo servidor.

A desistência **não cria `collection_events`, respostas, gravações, rejeição, nota ou pagamento**. Não entra em metas, cotas, resultados, mapas, ranking, aproveitamento, remuneração ou indicadores de entrevistas oficiais. Também não altera a última entrevista oficial usada na validação de localização. Uma entrevista já enviada não pode ser convertida em desistência por esse fluxo.

O histórico separado pode ser consultado em **Coletar (app) → Desistências do entrevistado — registros neutros**. A gestão consulta as ocorrências da pesquisa na aba **Auditoria**, em um painel próprio. Esses históricos são consultados explicitamente, com paginação, sem acrescentar uma carga automática à abertura do aplicativo. O pesquisador só lê seus registros; clientes não recebem acesso. Staff ativo lê somente o escopo de pesquisas permitido pelas políticas existentes.

## Instalação

1. Execute manualmente, no SQL Editor do Supabase, o arquivo `desistencia-entrevistado-20261029.sql`, localizado na pasta de migrations da fonte local. Não é executado pelo aplicativo nem pela publicação.
2. A conferência final deve exibir `collection_withdrawals` e a assinatura de `register_collection_withdrawal`.
3. Após confirmação do usuário, publique seletivamente os arquivos frontend e testes deste worktree; atualize o identificador de cache do HTML. Não inclua SQL, Edge Functions, segredos, upload v204 adiado ou o arquivo protegido `deploy/cadastro-pesquisador-senha.sql`.
4. Reabra o aplicativo, inicie uma entrevista de teste e registre uma desistência. Confira o histórico separado e confirme que os indicadores oficiais continuam iguais.

Pré-requisito SQL: flag `profiles.is_collection_test_user`, já utilizada pelo modo de teste v211. A migration é aditiva e idempotente; não apaga entrevistas existentes nem modifica regras ou triggers de coleta, pagamentos, gravação e auditoria.

## Falha de rede e sessão

O registro usa UUID idempotente. Se a conexão falhar ou o prazo de 15 segundos esgotar, a ocorrência fica pendente **na memória da aba**, com o botão **Tentar registrar novamente**. A nova tentativa usa o mesmo UUID e payload. O servidor só retorna o registro anterior para o mesmo pesquisador e os mesmos parâmetros.

Enquanto não houver confirmação do servidor, a entrevista não pode ser enviada como concluída nem outra entrevista iniciada. A navegação interna é bloqueada e há um aviso nativo antes de fechar/recarregar a página, quando suportado pelo navegador. Não há fila offline durável: fechar o aplicativo, perder a aba ou sair da sessão pode perder uma tentativa ainda não confirmada. Se a primeira tentativa tiver sido aceita pelo servidor, ela permanece preservada no histórico. O texto não promete envio offline.

Troca de perfil, reset de sessão e respostas tardias não podem limpar ou enviar outra entrevista. Permissões tardias de microfone têm suas trilhas encerradas; callbacks de gravação cancelada são removidos.

## Gravação e avaliação

A desistência não é entrevista concluída e não exige áudio final de confirmação. **As entrevistas concluídas após 21h continuam exigindo a confirmação gravada**, assim como GPS, contrato, orientações, vídeo, cotas e demais validações já existentes. O novo fluxo não enfraquece essas regras nem oferece reversão de uma entrevista enviada.

A reserva de seleção de áudio existente não é alterada. Não se cria uma exclusão de áudio para coletas oficiais. O recurso é prospectivo: não reclassifica entrevistas anteriores ou reprovadas como desistência.

## Validação local

- `node collection-withdrawals-smoke-test.js`: confirmação, cancelamento, RPC isolada, UUID/retry, falha de rede, timeout, reset e respostas tardias; histórico paginado e escape HTML; corridas com GPS e microfone.
- `python3 /home/ubuntu/PesquisaPro-remoto/collection-withdrawals-postgres-test.py`: PostgreSQL temporário com dados fictícios, migração idempotente, JWT/perfil, RLS, escopo, idempotência concorrente e preservação das tabelas/métricas oficiais.
- `python3 /home/ubuntu/avaliacao-pesquisapro-20261029/testar-desistencia-local.py`: navegador local em 390px e 1366px, com RPC fictícia; cancelamento preserva a entrevista, falha permite retry com o mesmo UUID, sem envio oficial, sem overflow ou erro JavaScript.
- Regressões existentes de coleta, questionário grande, isolamento de testes e navegação administrativa leve.

Na etapa de desenvolvimento, nenhuma migration ou consulta de escrita foi executada no Supabase pelo agente, nem foi feito commit/push/deploy. Em 29/10/2026, o usuário confirmou a execução manual bem-sucedida do SQL e autorizou a publicação seletiva do frontend. A publicação não executa SQL.
