# PesquisaPro v169 — recomeçar o tratamento das respostas abertas

## O que foi preparado

Uma opção na **Estrutura do relatório final**, na página **Relatórios**:

> **Limpar todos os agrupamentos da pesquisa**

Ela remove o tratamento de **todas as perguntas abertas do rascunho da pesquisa e do cliente atualmente selecionados**, em vez de exigir um desagrupamento por pergunta.

**Esta versão foi preparada e testada localmente. Nenhuma limpeza de dados reais foi executada e nenhuma publicação da v169 foi realizada.**

## O que a limpeza remove

- Agrupamentos manuais, por significado e contextuais.
- Vínculos de respostas a categorias.
- Nomes, códigos de categorias, definições e regras de exclusão.
- Critérios de classificação contextual e configuração de múltiplos temas.
- Bases percentuais personalizadas das perguntas abertas: voltam ao padrão de **respostas preenchidas da pergunta**.
- Sugestões em revisão da janela aberta: a janela é fechada, solicitações em andamento são canceladas e respostas tardias não reaplicam o tratamento removido.

As matrizes e a visão oficial anteriormente calculadas com aquele tratamento são invalidadas. As próximas consultas de prévia, Excel e PDF usam a configuração sem agrupamentos. As respostas abertas passam a aparecer por seus textos originais, com suas contagens, conforme as consultas de resultados mistos já existentes.

## O que não é modificado

- Respostas originais, abertas e fechadas, e a base de coleta.
- Entrevistas, status de validação ou rejeição, áudios e localização.
- Pesquisadores, equipes, contratos e dados financeiros.
- Título, subtítulo, apresentação, metodologia, síntese e blocos do relatório.
- Seleção, títulos e inclusão dos cruzamentos; somente os dados tratados das matrizes são recalculados sem categorias.
- Agrupamentos de outras pesquisas ou de rascunhos de outros clientes.
- PDFs e relatórios já publicados ao cliente.
- Histórico de solicitações de IA e funções existentes no Supabase.

**O tratamento sempre foi separado da coleta original. Limpar esse tratamento não exige recuperar ou recriar entrevistas.**

## Como usar após publicar a v169

1. Entre com uma conta de gestão autorizada e abra **Relatórios**.
2. Escolha a pesquisa correta, mesmo que esteja concluída.
3. Na **Estrutura do relatório final**, confira o cliente destinatário. Se houver rascunhos de vários clientes, cada um tem sua própria configuração.
4. No bloco **Recomeçar a organização das perguntas abertas**, clique em **Limpar todos os agrupamentos da pesquisa**.
5. Leia a confirmação: ela informa a pesquisa, o cliente, a quantidade de configurações, categorias e vínculos removidos e as informações preservadas. Cancelar não altera nada.
6. Confira a prévia. A mudança ainda está apenas na sessão atual.
7. Clique em **Salvar estrutura** para gravar a limpeza no rascunho selecionado. Se o salvamento falhar, não considere a limpeza persistida: o aviso será exibido e a versão local continuará disponível para desfazer.
8. Para limpar outro rascunho de cliente, selecione-o e repita o procedimento após salvar ou descartar as mudanças atuais.

Não gere nem disponibilize um PDF se você ainda quer decidir a nova organização. PDFs anteriores não são substituídos ao clicar em limpar ou salvar a estrutura. Uma nova entrega ao cliente continua exigindo a ação existente de finalizar/publicar o relatório.

## Desfazer

**Desfazer limpeza** restaura na prévia o tratamento completo anterior, inclusive critérios e bases percentuais.

- Pode ser usado na mesma sessão, inclusive depois de salvar a limpeza.
- Depois de desfazer, clique novamente em **Salvar estrutura** para persistir a restauração.
- Fica indisponível se houver edições posteriores nos agrupamentos: não sobrescreve o trabalho novo.
- O backup temporário de desfazer é perdido ao recarregar, sair, trocar de pesquisa ou mudar o cliente. Não é um backup persistente.

Limpar e desfazer são bloqueados enquanto um salvamento, geração, publicação de PDF ou exportação Excel está em andamento.

## Ativação

- **Não há SQL novo para executar.**
- **Não é necessário alterar ou reimplantar a Edge Function.**
- É necessária a publicação do código frontend v169 no GitHub/Vercel, após autorização.
- Cache da versão preparada: `20261015182500`.
- Os SQLs e funções anteriores e a alteração protegida no clone de publicação permanecem intactos.

## Validação local

- 126 testes de regressão executados sem falhas e verificação de sintaxe dos JavaScripts.
- Teste dedicado com duas perguntas tratadas, 1.252 vínculos, categorias vazias e critérios contextuais.
- Confirmação/cancelamento, leitura segura do rascunho, desfazer protegido, falha de salvamento, troca de sessão/pesquisa/cliente e resultado tardio de IA.
- Salvamento e restauração simulados preservam os demais campos e os cruzamentos do relatório.
- Testes reais no Chromium em desktop, tablet, celular, paisagem e janela reduzida: limpar, desfazer, salvar e reabrir o rascunho.
- Nenhuma chamada externa nos testes de navegador; somente dados fictícios e salvamento simulado.
- Verificação byte a byte da preservação dos SQLs, funções e clone de publicação; CSS anterior preservado integralmente, com estilos apenas anexados.

Os testes locais não equivalem a uma limpeza real no Supabase. O usuário executará a ação no aplicativo depois da publicação e da revisão da confirmação.
