# PesquisaPro v173 — cruzamentos com no máximo três variáveis

## Regra implementada

Cada cruzamento permite **de uma a três variáveis diferentes**. Para comparar duas perguntas, usar duas variáveis; a terceira é opcional e define um recorte.

- **Variável 1:** linhas da matriz.
- **Variável 2:** colunas da matriz, quando selecionada.
- **Variável 3:** recorte da matriz, quando selecionada.

Exemplo: avaliação do serviço × faixa etária, com recorte por região.

O limite vale para:

1. Montagem e consulta de relatórios pela gestão.
2. Consulta temporária dos clientes com acesso total liberado.
3. Cruzamentos experimentais nas bases de tabulação isoladas, tanto da gestão quanto dos clientes.
4. Novas matrizes destinadas a PDF, CSV e Excel de cruzamentos.

A interface oferece somente três seletores. A validação também rejeita tentativas de enviar quatro, cinco ou seis variáveis, sem reduzir automaticamente a seleção.

**O limite é por cruzamento, não por pesquisa ou relatório.** Continua sendo possível criar vários cruzamentos independentes, cada um com até três variáveis. A quantidade de perguntas da pesquisa e a exportação de todas as perguntas em Excel não foram reduzidas.

## Definições antigas

Cruzamentos previamente salvos com mais de três variáveis **não são apagados ou silenciosamente truncados** ao abrir ou salvar a estrutura.

Na gestão, o cartão informa que a definição excede o novo limite. A prévia, o CSV e a inclusão em um novo PDF ficam bloqueados até um ajuste explícito.

Para ajustar:

1. Abrir **Relatórios > Montar relatório**.
2. No cartão antigo, clicar em **Usar as três primeiras variáveis e revisar**.
3. Revisar as três escolhas e substituir as perguntas, se necessário.
4. Clicar em **Salvar estrutura** ou **Salvar cruzamentos na estrutura** para persistir a alteração.

O botão altera apenas a definição em edição. Não grava automaticamente nem altera respostas coletadas. Também é possível desmarcar **Incluir este cruzamento no PDF** para gerar um novo documento sem esse cruzamento, mantendo a definição antiga.

Clientes recebem um aviso de que os cruzamentos excedentes aguardam ajuste pela gestão. Não recebem uma matriz parcialmente reduzida apresentada como se fosse a antiga. Podem criar suas próprias consultas temporárias com até três variáveis, sem alterar a estrutura oficial.

**PDFs já publicados permanecem como estavam.** Esta versão não apaga nem regenera documentos antigos.

## Dados e permissões preservados

- Entrevistas e textos originais não são alterados.
- Snapshots e versões das bases isoladas não são modificados pelo novo limite.
- Pagamentos, usuários, contratos, senhas, GPS e demais áreas não recebem mudanças funcionais.
- Clientes continuam exclusivamente em modo de consulta e exportação. Não podem salvar, editar ou publicar relatórios, criar bases ou alterar versões.
- A função de agrupamento/IA retirada na v170 continua desativada.
- As contagens e os percentuais continuam usando a base indicada em cada análise. A terceira variável não transforma a base geral da pesquisa na base do recorte.
- Exportações por pergunta continuam completas, inclusive para listas com mais de mil textos. O limite visual de paginação não corta o arquivo Excel.

## Ativação manual no Supabase

Arquivo novo: **`deploy/cruzamentos-maximo-tres-variaveis-v173.sql`**.

A restrição no frontend acompanha a publicação da v173. Para que consultas diretas ao banco ou páginas antigas também respeitem o teto, executar a migration nova **manualmente**.

1. Abrir o **SQL Editor** do projeto Supabase do PesquisaPro.
2. Criar uma nova consulta.
3. Colar o arquivo completo da v173.
4. Executar e conferir a confirmação de sucesso.
5. Após a publicação do frontend, atualizar o aplicativo e conferir que cada cruzamento oferece três campos.

**Pré-requisitos:** migrations v171 e v172 já aplicadas. Se uma das três consultas modernas necessárias estiver ausente, o SQL aborta a transação e informa o pré-requisito faltante. Funções v160 e legadas são opcionais: quando ausentes, há aviso de que foram ignoradas; elas não são criadas nem é necessário instalar a v160 apenas para limitar os cruzamentos.

Os SQLs anteriores não foram editados. O SQL novo restringe as funções instaladas de cruzamento sem alterar registros de entrevistas, respostas, documentos ou snapshots. As permissões existentes e os contratos de retorno das funções são preservados. As colunas de retorno históricas adicionais não habilitam uma quarta variável.

**Não é necessário criar ou atualizar Edge Function, instalar motor de texto ou configurar chave de IA.** Nenhuma migration foi executada no Supabase remoto durante esta preparação.

## Validação

- **116 smoke tests JavaScript sem falhas**, incluindo limite, PDF/CSV, consultas somente leitura e XLSX real.
- Tentativas com quatro, cinco e seis variáveis rejeitadas, sem consulta de cruzamento nem download inválido.
- Definições antigas preservadas; ajuste explícito não salva automaticamente.
- Testes de montagem, cliente e laboratório em desktop, tablet, celular, paisagem e janela reduzida.
- **91 testes SQL e 12 testes de compatibilidade sem falhas**, exclusivamente locais com dados fictícios. Incluem ausência de v160, falha de pré-requisito, idempotência, autorização e preservação de assinaturas, permissões, dados e snapshots. Evidências incluídas no pacote.
- Verificação de integridade dos SQLs/functions anteriores e do clone de publicação.

## Estado da entrega

**Versão preparada localmente, ainda não publicada.** A autorização anterior de publicação da v172 não foi reutilizada para publicar a v173. O ZIP versionado reúne o código, a migration nova e as evidências de validação.
