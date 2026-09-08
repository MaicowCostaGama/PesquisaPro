# Relatórios finais em PDF — PesquisaPro

A central de **Relatórios** possui um editor de estrutura para a gestão montar, revisar, salvar e publicar relatórios finais para o cliente vinculado à pesquisa. O fluxo mantém a separação entre o rascunho editorial da gestão e o PDF publicado, que continua protegido por Storage privado e acesso autorizado.

## Estrutura editorial

O editor permite informar o cliente destinatário, título, subtítulo, período, apresentação, metodologia e síntese executiva. Também permite escolher os blocos que entrarão no documento: ficha técnica, resultados de todas as perguntas, cruzamentos selecionados e síntese executiva.

A capa usa a identidade visual PesquisaPro, com azul institucional, hierarquia editorial, identificação do cliente e da pesquisa. As páginas internas apresentam resultados por pergunta com contagens, percentuais e barras comparativas; o bloco de cruzamentos apresenta uma tabela com uma, duas ou três variáveis e o percentual da base válida.

## Montagem e salvamento dos cruzamentos

No modo **Montar relatório**, a gestão pode selecionar até três perguntas como variáveis do cruzamento. A ordem dos seletores corresponde à ordem das variáveis na tabela e no PDF. O editor mostra uma confirmação visual com as perguntas atualmente selecionadas e oferece a ação **Salvar cruzamento na estrutura**, além do botão geral **Salvar estrutura**.

A configuração é armazenada dentro do JSON `sections` do registro `report_documents`, usando os seguintes atributos:

| Atributo | Finalidade |
| --- | --- |
| `includeCross` | Define se o bloco de cruzamento será incluído no PDF. |
| `crossQuestionIds` | Guarda os IDs das perguntas selecionadas, na ordem escolhida, limitado a três itens. |
| `crossTitle` | Guarda o título analítico exibido na seção de cruzamentos do PDF. |

Ao reabrir o rascunho, o sistema restaura o título analítico, as variáveis e a ordem dos seletores. Se o rascunho salvo não tiver variáveis, o sistema não insere uma pergunta automaticamente contra essa configuração. O cruzamento também é recalculado com os IDs persistidos quando a prévia ou o PDF é gerado.

> O limite de três variáveis é mantido no navegador e também na RPC de cruzamentos já existente. As respostas múltiplas continuam sendo tratadas pela camada de análise da pesquisa.

## Fluxo da gestão

A gestão escolhe a pesquisa e o cliente vinculado, entra em **Montar relatório**, seleciona as variáveis, informa o título do cruzamento e usa **Salvar cruzamento na estrutura** ou **Salvar estrutura** para manter o rascunho. **Gerar PDF** salva a configuração e baixa uma prévia local para revisão. Quando o documento estiver aprovado, **Finalizar e disponibilizar ao cliente** gera o arquivo, envia-o para o bucket privado e publica o relatório.

O PDF utiliza o título e os IDs persistidos no rascunho. Se **Incluir cruzamentos** estiver desmarcado ou não houver IDs salvos, o bloco de cruzamento não é incluído no documento final.

## Acesso do cliente

O perfil do cliente consulta apenas documentos com status `published` e vinculados ao seu próprio `profile.id`. O painel cria uma URL assinada temporária para abrir o PDF. O caminho interno do Storage não é exposto como documento público e clientes de outras pesquisas não têm acesso.

## Migration necessária

A migration `deploy/relatorios-pdf-clientes.sql` já foi aplicada no Supabase e continua sendo a base do recurso. **Não há migration SQL adicional para a persistência dos cruzamentos**, porque `report_documents.sections` já é um campo `jsonb` destinado à estrutura do documento; os novos atributos são gravados dentro desse JSON pelas RPCs existentes.

Antes da migration, o editor visual continua carregando, mas salvar, carregar rascunhos, publicar e listar PDFs retornará uma orientação para executar o SQL. Depois da aplicação, o rascunho passa a incluir `crossQuestionIds` e `crossTitle` junto com os demais blocos editoriais.
