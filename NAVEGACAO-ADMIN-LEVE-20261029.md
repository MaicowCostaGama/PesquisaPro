# PesquisaPro — primeira etapa de melhoria da navegação administrativa

Preparada em 29/10/2026 a partir do commit de produção `6702432b8798cdfff1a94e3569f4e927885093dd`. Esta preparação não constitui publicação nem execução no Supabase.

## O que muda

O painel administrativo e as listas **Minhas pesquisas**, **Concluídas** e **Arquivadas** passam a usar resumos dedicados. Abrir essas telas não exige baixar perguntas, milhares de opções Excel, respostas individuais, documentos, assinaturas completas, histórico detalhado de coletas ou vínculos de áudio.

O banco devolve somente os metadados e as contagens necessárias à tela. O painel recebe contadores agregados e uma série de 14 dias de coletas válidas e oficiais, no horário de Brasília, em vez de baixar os registros individuais para contá-los no navegador. O gráfico antigo usava uma série fixa; a nova série provém da consulta resumida.

O cache de resumos dura 30 segundos e é exclusivo da sessão. Há compartilhamento de requisições concorrentes, paginação de 100 pesquisas, timeout, nova tentativa explícita e proteção contra respostas atrasadas após logout ou troca de página. Uma resposta ainda indisponível aparece como desconhecida, não como zero. O botão **Atualizar** revalida os resumos.

## Integridade e limites desta etapa

Os resumos permanecem em um store próprio. Não são inseridos em `SURVEYS`, no assistente de edição ou no objeto do formulário. Ao clicar em editar, duplicar, equipe, PDF ou acessar uma coleta concluída, a aplicação aguarda o carregador completo legado e localiza a pesquisa por UUID antes de executar a ação. Falha de carga impede a ação.

**O carregador completo legado ainda pode baixar os detalhes de todas as pesquisas quando uma dessas ações explícitas for aberta.** Otimizar também esse caminho por pesquisa é uma etapa posterior; não se declara resolvida nesta entrega. Relatórios, auditoria detalhada e páginas de documentos continuam com seus fluxos próprios.

As coletas de teste/calibração continuam excluídas das contagens oficiais. Login, RLS, regras de GPS, áudio obrigatório, condições após as 21h, dados originais e histórico de auditoria não são afrouxados. Não há exclusão de dados, alteração de pagamentos, implantação de Edge Functions ou ativação do upload seguro v204 adiado.

O índice adicional ocupa uma pequena quantidade de espaço para acelerar a leitura ordenada das opções. Esta melhoria **não libera armazenamento nem aumenta as cotas do plano**. Reduz os dados transferidos e processados pela navegação. Não há percentual de ganho real anunciado: a medição autenticada antes/depois deve ser feita após a ativação.

## Instalação segura

### 1. SQL manual, antes da publicação do frontend

Arquivo local entregue separadamente: `deploy/navegacao-admin-leve-20261029.sql` em `PesquisaPro-remoto`. Não é enviado automaticamente ao GitHub nem executado pelo agente.

No SQL Editor do projeto correto do Supabase, abra uma nova consulta, copie o arquivo inteiro e execute preferencialmente fora do pico. A primeira transação cria um índice **não único** em `survey_question_options(question_id, position, id)`. O bloqueio é limitado a 3 segundos e a operação a 60 segundos. Se houver erro de lock/timeout, não ignore o erro: tente novamente fora do pico e envie a mensagem exata.

A segunda transação cria as RPCs `admin_navigation_surveys_v1(integer,integer)` e `admin_navigation_overview_v1()`. Elas são `SECURITY INVOKER`: conservam as políticas RLS e as permissões existentes. Exigem usuário autenticado, perfil ativo e papel de gestão. Não criam políticas nem concedem acesso a tabelas. Acesso anônimo e de pesquisador/cliente não é liberado.

O arquivo termina com uma consulta de conferência. Os três campos `resumo_pesquisas_pronto`, `resumo_painel_pronto` e `indice_opcoes_pronto` devem retornar **true**. Essa conferência não chama as RPCs com uma sessão fictícia. Chamar diretamente as RPCs sem JWT no SQL Editor deve ser recusado; isso é uma proteção prevista.

As duas transações são intencionais: se a instalação das funções falhar depois de o índice ser criado, o índice pode permanecer. É seguro executar novamente após corrigir a causa, sem apagar dados.

### 2. Publicação do código, somente após autorização

Arquivos de frontend preparados: `app.html`, `app.js`, `admin-navigation-data.js`, `admin-navigation-ui.js`. Testes novos: `admin-navigation-data-smoke-test.js` e `admin-navigation-integration-smoke-test.js`.

Na publicação, renovar o cache de **todas** as referências locais no HTML, revalidar o HEAD remoto, stage seletivo, testes e segurança. Não publicar SQL, migrations, Edge Functions, documentos privados ou o arquivo protegido `deploy/cadastro-pesquisador-senha.sql`. Se as RPCs não estiverem instaladas, as novas telas mostrarão erro explícito orientando executar a migration, em vez de carregar silenciosamente todo o histórico como fallback.

### 3. Verificação no site

Após o SQL e a publicação, sair/entrar ou recarregar completamente. Abrir o painel e as três listas. Conferir quantidades, nomes, status, contagens oficiais e ausência de erros. Na rede do navegador, essas telas devem chamar somente as RPCs de resumo, além dos serviços normais de sessão/avisos/menu; não devem iniciar leitura completa de opções, coletas ou documentos por causa da listagem/painel.

Testar edição e PDF de uma pesquisa com upload Excel, confirmando que todas as opções continuam disponíveis no formulário e que o PDF mantém o resumo de quantidade de escolhas. Testar acesso à coleta concluída e aos clientes. Conferir novamente a exclusão dos ensaios do perfil de teste. Medir o tempo autenticado da primeira abertura e das navegações seguintes em uma conexão real.

## Validações locais executadas

- Sintaxe de JavaScript e integridade do diff.
- Store leve: paginação acima de 100 pesquisas, deduplicação, limites, timeout, retry, troca de sessão, TTL e ausência de escrita nos stores completos.
- Integração: renderização real das rotas administrativas, atualização automática quando a RPC conclui, números desconhecidos, erro de SQL, escape HTML, carregamento completo antes de ações, resolução por UUID, bloqueio de ação tardia e integridade do rascunho.
- Navegador Chromium local em 390 px e 1.366 px, com RPCs fictícias: listas e painel prontos, erro de migration ausente, nova tentativa, zero requisições de detalhe e zero erros de JavaScript nesses cenários.
- PostgreSQL efêmero local com dados fictícios: parser, ACL, `SECURITY INVOKER`, RLS, papéis, paginação estável, pesquisas com metadados vazios, contrato vigente, contagens oficiais, série diária e índice. Nenhuma conexão ao banco remoto.
- Regressões relevantes de PDF, opções Excel, autocomplete remoto, abrangência, painel do pesquisador, questionário grande, isolamento de testes, mapa, paginação de eventos, georreferenciamento e extrato financeiro.

Alguns testes legados abrangentes possuem asserções presas a versões antigas ou dependem de migrations não publicadas; não são apresentados como aprovados por esta preparação nem foram alterados para ocultar falhas preexistentes. As regressões novas e as relevantes listadas foram executadas sobre a cópia preparada.

## Retorno seguro

Se a navegação apresentar problema após a publicação, reverter **somente o commit desta melhoria** para voltar ao frontend anterior, preservando as alterações de outras versões. As RPCs e o índice são aditivos; podem permanecer sem uso até nova avaliação. Não é necessário apagar dados ou restaurar backup para desativar essa camada de resumo.
