# PesquisaPro v172 — relatórios completos para clientes, somente leitura

## O que foi implementado

Clientes ativos vinculados à pesquisa, com **acesso total aos resultados liberado**, recebem uma central de Relatórios que permite:

- Consultar todas as perguntas abertas e fechadas, suas respostas originais, contagens e percentuais.
- Baixar **todas as perguntas em um arquivo Excel** ou baixar uma pergunta individualmente. Cada pergunta possui sua aba; alternativas configuradas sem ocorrência também são incluídas.
- Criar **cruzamentos temporários de uma a seis variáveis**, ver a matriz e baixar o cruzamento em Excel.
- Consultar os cruzamentos definidos pela gestão na estrutura destinada à sua conta.
- Ler apresentação, metodologia, síntese executiva e configuração dos blocos do seu relatório. A estrutura em elaboração é identificada como **rascunho**, nunca como PDF final.
- Consultar o mapa de calor, inclusive de respostas abertas, e o georreferenciamento, com os filtros disponibilizados na gestão.
- Consultar as **bases de tabulação isoladas** criadas pela gestão para a pesquisa: distribuição, textos originais paginados, versões de trabalho, notas registradas, comparação com a origem e cruzamentos experimentais. Também é possível baixar a distribuição da base congelada em Excel.
- Continuar acessando os PDFs finais já publicados e os relatórios de pesquisas concluídas.

As respostas abertas são apresentadas sem agrupamento por significado. A função retirada na v170 **não foi reativada**.

## O que o cliente não pode fazer

- Alterar perguntas, respostas, coletas ou dados da pesquisa.
- Editar apresentação, metodologia, síntese ou estrutura do relatório.
- Salvar cruzamentos temporários na estrutura oficial.
- Criar bases isoladas, criar versões, editar notas ou arquivar versões.
- Salvar ou publicar documentos/PDFs.
- Acessar estruturas destinadas a outros clientes ou pesquisas sem vínculo e liberação.

Não há botão de salvar ou publicar nessa central. **Filtros, paginação e seleções de variáveis são apenas estado temporário da consulta.** A atualização, o fechamento da aba ou a troca de pesquisa podem recalcular/remover essas escolhas; não alteram o relatório oficial.

## Regras de acesso

1. O perfil deve ter papel `cliente` e status `ativo`.
2. Deve existir vínculo real em `survey_clients` entre a conta autenticada e a pesquisa. Nome de pesquisa não autoriza acesso.
3. Os resultados devem estar liberados no vínculo da pesquisa **ou** pela liberação global já existente no perfil do cliente.
4. A pesquisa não pode estar arquivada. **Pesquisa concluída permanece consultável** quando o acesso estiver liberado.
5. Cada consulta no banco verifica novamente esses requisitos. O frontend também rejeita respostas tardias de outra conta ou pesquisa.

A liberação global mantém o significado atual do sistema: acesso às pesquisas efetivamente vinculadas à conta, nunca às pesquisas de outros clientes.

Clientes com acesso total podem ver o **rascunho destinado à própria conta**. Isso atende à consulta integral solicitada, mas não significa que o rascunho tenha sido publicado ou concluído. Não são exibidos os rascunhos de outros clientes nem configurações antigas privadas de agrupamento.

## Bases, contagens e Excel

- Resultados atuais: somente entrevistas válidas, sem reprovadas nem calibração.
- Perguntas abertas usam a mesma base percentual do exportador administrativo: respostas preenchidas da pergunta, com a base válida da pesquisa indicada separadamente.
- Respostas múltiplas, ranking e campos de uma pergunta podem ter percentuais que não somam 100%; a base utilizada é indicada no arquivo.
- Cruzamentos: uma combinação por entrevista; seleções múltiplas formam um conjunto. As duas primeiras variáveis definem linhas e colunas; as demais definem recortes. Os percentuais do cruzamento usam a base total da pesquisa.
- Ranking e “Duas respostas” continuam disponíveis no resultado geral e no Excel por pergunta, mas não como uma única variável de cruzamento, seguindo o comportamento atual da gestão.
- Base congelada: utiliza as entrevistas e respostas do snapshot, não a coleta atual. O Excel identifica a cópia e usa a base total congelada. A distribuição pode somar mais de 100% em perguntas de múltiplas respostas.
- Listas longas são paginadas na tela; o Excel da pergunta contém a distribuição completa, **sem o limite visual de 100 itens**.
- O Excel é um arquivo `.xlsx` real, com contagens e percentuais numéricos. Textos começando com `=` permanecem textos, não fórmulas.
- Arquivos por pergunta contêm respostas/distribuições, não dados operacionais de pagamento, contratos ou contatos. Textos livres, entretanto, **podem conter dados pessoais digitados na entrevista**: revisar antes de compartilhar. Pseudônimos não equivalem a anonimização completa.

Para comparar períodos sem mudanças da coleta, utilizar uma base congelada. Os resultados atuais continuam sendo consultas à origem em atualização.

## Mapas e privacidade

O georreferenciamento usa coordenadas arredondadas a três casas e identificadores pseudonimizados. Exibe o nome do pesquisador, como já ocorre nas consultas geográficas autorizadas, mas não fornece CPF, Pix, contato, áudio ou coordenada exata nessa consulta. O mapa geral permite examinar estados válidos, reprovados, calibração e pendentes; os resultados estatísticos e o mapa de calor de respostas continuam excluindo rejeitadas e calibração.

## Ativação manual no Supabase

Arquivo novo: **`deploy/relatorios-clientes-leitura-completa-v172.sql`**.

Pré-requisitos: estrutura de relatórios já existente e migration da base isolada **v171**, previamente fornecida. A v172 não substitui nem modifica os SQLs anteriores.

1. Abrir o SQL Editor do projeto Supabase do PesquisaPro.
2. Criar uma nova consulta.
3. Colar **todo o conteúdo** do arquivo da v172, do `begin;` ao `commit;`.
4. Executar e conferir `Success. No rows returned`.
5. Após a publicação do frontend v172, atualizar o aplicativo e acessar com uma conta cliente vinculada e liberada.

A migration é aditiva e reexecutável. Cria somente funções de leitura específicas para os clientes, com autorização privada e `search_path` definido. Concede execução dessas funções ao papel autenticado; **não concede escrita nem leitura direta das tabelas ao cliente**, não redefine as funções de gestão e não altera coletas, respostas, documentos ou snapshots existentes.

**Nenhuma Edge Function ou chave de IA nova é necessária.** O SQL remoto permanece sob execução manual do administrador. Até a ativação do SQL novo, o frontend informa que a consulta completa ainda não foi ativada, sem apresentar um arquivo parcial como completo.

## Validação local

- 115 smoke tests JavaScript: sem falhas, incluindo o teste dedicado de leitura integral.
- 67 verificações SQL com PostgreSQL local, dados fictícios e autorização por cliente: sem falhas.
- 15 verificações adicionais sobre as funções reais da v171 e de escrita de documentos: sem falhas; cliente não cria, salva, arquiva ou publica.
- Chromium em desktop, tablet, celular, paisagem e janela reduzida: sem overflow horizontal nem requisições externas no harness fictício.
- Testes com 1.252 textos, paginação, XLSX real, seis variáveis, rascunho, snapshot e versões somente leitura, XSS, falha parcial, revogação e troca de conta/pesquisa durante exportação.
- Folha CSS preservada integralmente, com apenas acréscimo de estilos.
- SQLs/functions anteriores e o clone de publicação preservados, inclusive sua alteração local protegida em `deploy/cadastro-pesquisador-senha.sql`.

## Estado da entrega

**v172 preparada e validada localmente, ainda não publicada.** Nenhuma migration foi executada no Supabase remoto e nenhum dado real foi acessado ou alterado nesta implementação.
