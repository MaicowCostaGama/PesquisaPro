# PesquisaPro v152 — Coleta completa nas pesquisas concluídas

## Alteração

Na aba **Concluídas**, cada pesquisa encerrada e não arquivada passa a ter o botão **Coleta completa**, antes de **Chat**, na área de ações da própria pesquisa.

O botão abre a mesma tela de gestão da coleta utilizada durante o trabalho, mantendo acesso a:

- **Equipe**: pesquisadores vinculados e controles existentes.
- **Mapa ao vivo**: consulta das coletas registradas, filtros e atualização já existentes. Não inicia novas entrevistas nem cria rastreamento adicional após o encerramento.
- **Auditoria**: histórico, respostas, gravações disponíveis e ações já autorizadas pela gestão.
- **Metas de cotas**: acompanhamento com as regras atuais de entrevistas válidas.
- **Evolução da coleta**: gráficos por dia e mês.

O botão **← Concluídas** retorna diretamente à lista de pesquisas concluídas. Os acessos já existentes em pesquisas em andamento continuam retornando à lista de Coleta.

## Status e contagem

- Abrir o painel **não reabre a pesquisa** e **não libera novas entrevistas** ao pesquisador.
- A tela mostra o status de pesquisa concluída corretamente, em vez de identificá-la como rascunho.
- O cartão **Coletas totais** da lista de concluídas usa a mesma fonte de contagem da linha de cada pesquisa, evitando a divergência visual entre o resumo e a tabela. As regras de validade não foram alteradas.
- As ações das pesquisas concluídas permitem quebra de linha, sem sobrepor os botões.

## Permissões e preservação

- O acesso novo respeita as permissões atuais de Coleta: Administrador, Administrador PRO e Coordenador.
- A pesquisa é localizada pelo ID persistido, não pela posição da linha.
- Pesquisas arquivadas não recebem esse novo botão.
- O botão não altera status, equipe, respostas, pagamentos, contratos ou dados cadastrais. A tela reutilizada mantém suas ações e permissões anteriores; alterações de auditoria continuam dependendo de uma ação explícita da gestão.
- Nenhuma migration foi criada ou executada. **Não é necessário executar novo SQL para a v152.**

## Validação local

- Sintaxe verificada em **116 arquivos JavaScript**.
- **105 smoke tests aprovados**, incluindo teste novo de acesso completo, retorno, status, permissões e isolamento da origem ao sair da sessão.
- Teste DOM executou cliques reais no botão e nas cinco abas com dados sintéticos.
- Renderização local em Chromium conferida em desktop e celular.
- CSS anterior preservado integralmente como prefixo; regras novas somente acrescentadas; parser CSS aprovado.
- O clone de publicação permanece na v151, com a alteração preexistente em `deploy/cadastro-pesquisador-senha.sql` intocada.

Os testes de navegação usam dados sintéticos e não substituem a validação autenticada da pesquisa real após a publicação.

## Entrega e publicação

- Versão local: **v152**.
- Cache de execução: **20261012130930**.
- Pacote: `PesquisaPro-v20261012-coleta-completa-concluidas-v152.zip`.
- Código pronto localmente. Publicação no GitHub/Vercel somente após autorização específica do usuário para esta versão.
