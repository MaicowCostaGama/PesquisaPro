# Relatórios finais em PDF — PesquisaPro

A central de Relatórios agora possui um editor de estrutura para a gestão montar, revisar e publicar relatórios finais para o cliente vinculado à pesquisa.

## Estrutura editorial

O editor permite informar cliente destinatário, título, subtítulo, período, apresentação, metodologia e síntese executiva. Também permite escolher os blocos que entrarão no documento: ficha técnica, resultados de todas as perguntas, cruzamentos selecionados e síntese executiva.

A capa usa a identidade visual PesquisaPro, com azul institucional, hierarquia editorial, identificação do cliente e da pesquisa. As páginas internas apresentam resultados por pergunta com contagens, percentuais e barras comparativas; o bloco de cruzamentos apresenta tabela com uma, duas ou três variáveis e percentual da base válida.

## Fluxo da gestão

A gestão escolhe a pesquisa e o cliente vinculado, monta a estrutura e usa **Salvar estrutura** para manter um rascunho. **Gerar PDF** baixa uma prévia local para revisão. Quando o documento estiver aprovado, **Finalizar e disponibilizar ao cliente** gera o arquivo, envia-o para o bucket privado e publica o relatório.

## Acesso do cliente

O perfil do cliente consulta apenas documentos com status `published` e vinculados ao seu próprio `profile.id`. O painel cria uma URL assinada temporária para abrir o PDF. O caminho interno do Storage não é exposto como documento público e clientes de outras pesquisas não têm acesso.

## Migration necessária

Execute `deploy/relatorios-pdf-clientes.sql` uma vez no SQL Editor do Supabase. A migration cria `report_documents`, o bucket privado `client-reports`, as políticas de Storage e as RPCs de salvar rascunho, buscar último rascunho, publicar e listar documentos publicados do cliente.

Antes da migration, o editor visual continua carregando, mas salvar, carregar rascunhos, publicar e listar PDFs retornará uma orientação para executar o SQL.
