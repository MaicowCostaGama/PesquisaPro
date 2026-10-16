# PesquisaPro v174 — tabelas para cruzamentos de duas variáveis

## O que mudou

O cruzamento de duas perguntas é apresentado como **tabela cruzada**, em vez de uma lista de combinações:

- **Variável 1:** respostas nas linhas.
- **Variável 2:** respostas nas colunas.
- **Células:** quantidade de entrevistas e percentual da base válida.
- **Margens:** totais por linha, por coluna e total geral.

A apresentação foi padronizada na gestão, na consulta do cliente com acesso total liberado e nas bases de tabulação isoladas. O PDF gerado pela gestão também mostra quantidade e percentual em suas tabelas. PDFs já publicados não são reescritos: a nova apresentação vale para os arquivos gerados depois da atualização.

O limite continua sendo **no máximo três variáveis**. A terceira variável separa as tabelas em recortes. Definições antigas com mais de três continuam preservadas e bloqueadas até ajuste explícito pela gestão, conforme a v173.

## Como usar

### Gestão

1. Abra **Relatórios** e escolha a pesquisa.
2. Na montagem do cruzamento, selecione a primeira e a segunda pergunta.
3. Deixe a terceira variável sem seleção se deseja uma única tabela.
4. Consulte as quantidades, percentuais e totais na matriz.
5. Ao gerar um novo PDF com esse cruzamento incluído, a tabela contém quantidades e percentuais.

O CSV completo já existente continua disponível. A v174 não muda seu contrato ou corta combinações na exportação.

### Cliente com acesso total liberado

1. Abra os resultados da pesquisa e escolha **Cruzar variáveis**.
2. Selecione duas perguntas diferentes e clique em **Calcular cruzamento**.
3. Consulte a tabela ou clique em **Baixar cruzamento em Excel**.

O Excel mantém a aba **Cruzamento**, com todas as combinações, e acrescenta tabelas matriciais:

- **N_01_01:** quantidades numéricas.
- **Pct_01_01:** percentuais numéricos com formatação de percentual.

Se houver muitos rótulos nas colunas, as matrizes do Excel são divididas em blocos de até 100 colunas, sem descartar rótulos. Com três variáveis, cada recorte ganha suas próprias matrizes. Os totais continuam abrangendo todas as colunas do recorte, mesmo quando divididas em blocos.

As consultas e downloads continuam **somente leitura**. Não salvam a estrutura da gestão, não publicam documentos e não alteram respostas ou versões.

### Base isolada

1. Abra **Base de tabulação isolada**.
2. Selecione uma cópia congelada.
3. Entre em **Cruzamento experimental** e escolha duas perguntas.
4. Clique em **Calcular cruzamento da base**.

A matriz usa somente as respostas dessa cópia. Não mistura os resultados atuais da pesquisa com o snapshot. O teste permanece fora do relatório oficial.

## Percentuais e interpretação

O percentual continua sendo calculado sobre a **base válida total** da pesquisa — ou sobre a base válida da cópia congelada quando o cálculo é realizado no laboratório. Não é automaticamente um percentual por linha ou por coluna. Essa base é informada na tela e no Excel.

Cada entrevista é contada uma vez na combinação original. Respostas múltiplas seguem o tratamento já existente: a combinação considera o conjunto de respostas da entrevista, sem expandi-lo em várias entrevistas. Entre os rótulos presentes na matriz, as combinações sem ocorrência mostram zero.

A v174 muda a **apresentação**, não a elegibilidade das entrevistas, a resolução de perguntas históricas ou as fórmulas de contagem.

## Tabelas grandes

Na tela, tabelas grandes têm paginação de **100 linhas e 12 colunas**, além de rolagem horizontal dentro da tabela no celular. Trocar essas páginas não consulta novamente o servidor, não altera a coleta e não muda a base ou os totais.

Os totais abrangem todas as linhas e colunas do recorte, inclusive as que estão em outras páginas. A paginação não limita as combinações do CSV, das matrizes Excel ou das tabelas do PDF.

## Preservação e ativação

- Respostas, entrevistas e questionários originais são preservados.
- A função de agrupamento por significado **continua retirada**.
- As cópias congeladas continuam imutáveis.
- Pagamentos, contratos, senhas, equipes e regras de coleta não foram alterados.
- Não há migration, SQL novo ou atualização de Edge Function na v174.
- Nenhum SQL foi executado no Supabase real durante o desenvolvimento.
- O limite de três no servidor continua dependendo da migration v173, cuja execução manual já foi informada pelo usuário.
- A v174 ainda precisa de publicação do frontend no GitHub/Vercel para aparecer no aplicativo. Não é necessário repetir o SQL por causa desta versão.

## Validação local

- **117 testes de regressão**, sem falhas; sintaxe dos módulos JavaScript verificada.
- Tabelas de duas variáveis testadas em desktop, tablet, celular, paisagem e janela reduzida.
- Validação das tabelas na gestão, no cliente e na base isolada; contagens, percentuais, totais e combinações zero.
- Testes com **1.252 respostas fictícias**, paginação em ambas as direções e conferência de exportação integral em 26 abas matriciais de um Excel largo.
- Arquivos XLSX reais gerados e reabertos; células numéricas e formatos percentuais conferidos; textos não viram fórmulas.
- PDF real gerado localmente e conferido quanto às quantidades e percentuais usados nas tabelas.
- Bloqueio de conteúdo HTML malicioso, de consultas sem autorização e de downloads parciais ou após revogação de acesso.
- Preservação do teto de três variáveis e do bloqueio de definições antigas excedentes.
- Navegador sem requisições externas nos testes e sem overflow horizontal da página.
- CSS somente aditivo; todos os SQLs e arquivos de funções anteriores preservados; clone de publicação e sua alteração local protegida permaneceram intactos.

Build/cache: `20261016141000`.
