# Relatórios finais em PDF — PesquisaPro

A central de **Relatórios** possui um editor de estrutura para a gestão montar, revisar, salvar e publicar relatórios finais para o cliente vinculado à pesquisa. O fluxo mantém a separação entre o rascunho editorial da gestão e o PDF publicado, que continua protegido por Storage privado e acesso autorizado.

## Estrutura editorial

O editor permite informar o cliente destinatário, título, subtítulo, período, apresentação, metodologia e síntese executiva. Também permite escolher os blocos que entrarão no documento: ficha técnica, resultados de todas as perguntas, cruzamentos selecionados e síntese executiva.

A capa usa a identidade visual PesquisaPro, com azul institucional e a logo oficial `assets/logo-wide.png`, a mesma disponibilizada na página pública da plataforma. O selo visual, o título, o subtítulo e os metadados ficam em áreas independentes, com espaçamento dinâmico para evitar sobreposição mesmo quando o título ou a descrição são longos. As páginas internas apresentam resultados por pergunta com contagens, percentuais e barras comparativas. Cada cruzamento incluído apresenta sua própria seção, título analítico e tabela matricial.

## Padrão das tabelas de cruzamento

As tabelas seguem o padrão de matriz apresentado para o relatório. A primeira variável fica nas linhas, a segunda variável fica nas colunas e cada célula mostra o percentual daquela combinação sobre a **base total de entrevistas válidas**. A última coluna apresenta o total percentual de cada linha e a última linha apresenta os totais percentuais de cada coluna, com o total geral no canto inferior direito.

As categorias são ordenadas conforme as opções cadastradas na pesquisa. Categorias que não estejam mais cadastradas, mas ainda apareçam nos dados, são adicionadas ao final para não ocultar respostas existentes. Valores ausentes aparecem como `sem resposta`. Quando o cruzamento possui uma terceira variável, a tabela é separada em uma matriz para cada categoria da terceira variável, mantendo o mesmo padrão de totais.

No PDF, as matrizes são geradas em páginas horizontais para acomodar cabeçalhos extensos, como faixas de renda, sem perder legibilidade. Cada célula da linha superior recebe o fundo azul e o texto branco, garantindo que todas as categorias das colunas e o `TOTAL` permaneçam visíveis. A prévia do painel utiliza rolagem horizontal responsiva em telas menores.

| Elemento | Padrão aplicado |
| --- | --- |
| Linhas | Categorias da primeira variável selecionada. |
| Colunas | Categorias da segunda variável selecionada. |
| Células | Percentual da combinação sobre a base total válida. |
| Última coluna | Total percentual da linha. |
| Última linha | Total percentual da coluna. |
| Canto inferior direito | Total geral observado sobre a base válida. |
| Terceira variável | Uma matriz independente para cada categoria da terceira variável. |

## Vários cruzamentos independentes

No modo **Montar relatório**, a gestão pode criar vários cartões de cruzamento. Cada cartão representa uma análise independente e possui título próprio, até três variáveis, ordem dos seletores, botão de visualização, opção de inclusão no PDF e ação de remoção. O botão **Adicionar outro cruzamento** cria um novo cartão sem substituir os anteriores.

A prévia de resultados acompanha o cartão marcado como **Visualizando**. A ação **Salvar cruzamentos na estrutura** grava todos os cartões configurados no rascunho de uma só vez. Um cartão sem variáveis pode permanecer em edição, mas não é enviado para o PDF até que receba pelo menos uma variável.

A configuração é armazenada dentro do JSON `sections` do registro `report_documents`, usando os seguintes atributos:

| Atributo | Finalidade |
| --- | --- |
| `includeCross` | Define se os cruzamentos incluídos serão renderizados no PDF. |
| `crossings` | Lista todos os cruzamentos independentes salvos na estrutura. |
| `crossings[].id` | Identificador estável do cartão durante a edição e a reabertura. |
| `crossings[].title` | Título analítico exibido na seção correspondente do PDF. |
| `crossings[].questionIds` | IDs das perguntas do cruzamento, na ordem escolhida, limitado a três itens. |
| `crossings[].include` | Define se aquele cartão específico entrará no PDF. |
| `crossTitle` e `crossQuestionIds` | Campos de compatibilidade com rascunhos da versão anterior, mantidos com base no cruzamento ativo. |

Ao reabrir o rascunho, o sistema restaura todos os cartões, seus títulos, variáveis, ordem e opções de inclusão. Rascunhos antigos que possuíam apenas `crossTitle` e `crossQuestionIds` são convertidos automaticamente em um primeiro cartão de cruzamento. Se o rascunho salvo não tiver cruzamentos, o sistema não insere uma análise automaticamente contra essa configuração.

> O limite de três variáveis é aplicado individualmente em cada cruzamento no navegador e continua protegido pela RPC de cruzamentos no Supabase. As respostas múltiplas permanecem tratadas pela camada de análise da pesquisa.

## Fluxo da gestão

A gestão escolhe a pesquisa e o cliente vinculado, entra em **Montar relatório**, adiciona os cartões necessários, seleciona as variáveis, define cada título e decide quais análises entrarão no PDF. **Salvar cruzamentos na estrutura** ou **Salvar estrutura** mantém todos os cartões no rascunho. **Gerar PDF** salva a configuração, consulta os dados de cada cruzamento e baixa uma prévia local para revisão.

Quando o documento estiver aprovado, **Finalizar e disponibilizar ao cliente** gera o arquivo completo, com uma seção independente para cada cruzamento marcado para inclusão, envia-o para o bucket privado e publica o relatório.

Se **Incluir este cruzamento no PDF** estiver desmarcado ou se o cartão não possuir IDs de perguntas, a respectiva análise não é incluída no documento final. Os demais cruzamentos incluídos permanecem no PDF.

## Acesso do cliente

O perfil do cliente consulta apenas documentos com status `published` e vinculados ao seu próprio `profile.id`. O painel cria uma URL assinada temporária para abrir o PDF. O caminho interno do Storage não é exposto como documento público e clientes de outras pesquisas não têm acesso.

## Migration necessária

A migration `deploy/relatorios-pdf-clientes.sql` já foi aplicada no Supabase e continua sendo a base do recurso. **Não há migration SQL adicional para o padrão matricial**, porque os dados brutos do cruzamento já são retornados pela RPC existente e a transformação para percentuais, matriz e totais é feita no front-end e no gerador de PDF.

Antes da migration, o editor visual continua carregando, mas salvar, carregar rascunhos, publicar e listar PDFs retornará uma orientação para executar o SQL. Depois da aplicação, o rascunho passa a incluir `crossings` junto com os demais blocos editoriais.

## Visão completa de resultados no cliente

Quando a gestão libera os resultados para o cliente vinculado à pesquisa, a aba **Resultados** deixa de mostrar apenas uma pergunta por vez e passa a apresentar a estrutura analítica completa: título e subtítulo do relatório publicado, apresentação, todas as perguntas com distribuição, contagens, percentuais e barras comparativas, síntese executiva e as matrizes de cruzamento incluídas no relatório publicado. Os cruzamentos respeitam o limite de até três variáveis, os totais por linha e coluna e a base total de entrevistas válidas.

A leitura utiliza as RPCs agregadas de `deploy/relatorios-resultados-clientes.sql`. Elas não retornam respostas individuais e verificam, no banco, se o usuário autenticado é o cliente vinculado e se o resultado está liberado no vínculo `survey_clients` ou no campo legado `profiles.results_released`. A migration deve ser executada no Supabase antes de usar a nova visão completa do cliente.
