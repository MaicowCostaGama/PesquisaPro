# PesquisaPro v158 — respostas ainda não categorizadas

**Situação:** implementada e testada localmente em 13/10/2026, ainda não publicada. A v157 permanece em produção. Cache preparado: `20261013151500`.

## Organização da revisão

Na janela **Agrupar respostas**, a lista de textos originais agora abre na aba **Não categorizadas**. O atalho **Ir para não categorizadas**, no começo da janela, leva diretamente à revisão manual e limpa a busca para mostrar as pendências disponíveis.

| Aba | Conteúdo |
| --- | --- |
| Não categorizadas | Textos que ainda não pertencem a nenhuma categoria aplicada. |
| Categorizadas | Textos já associados a uma categoria, com o nome dela na lista. |
| Todas | Todos os textos originais disponíveis, para consulta e eventual reorganização manual. |

O número da aba conta **textos diferentes**, não entrevistas. A linha abaixo das abas também informa a soma das **ocorrências** desses textos. A busca filtra apenas a aba atual, sem mudar categorias ou números do relatório. A paginação continua com 50 textos por página e cobre toda a distribuição carregada.

## Como categorizar manualmente

Abra **Relatórios → pergunta aberta → Agrupar respostas → Ir para não categorizadas**. Selecione um ou mais textos equivalentes. Em **Criar ou completar categoria**, escolha uma categoria existente ou informe um nome novo e clique em **Aplicar aos textos selecionados**. Os textos aplicados deixam imediatamente a lista de pendências. Depois, clique em **Salvar agrupamentos na estrutura** e aguarde a confirmação para persistir no rascunho do relatório.

É permitido categorizar um único texto manualmente. Se uma categoria for desfeita, seus textos voltam à aba de pendências. Novos textos que não pertençam a categorias existentes aparecem como pendentes quando a distribuição for recarregada e o agrupador reaberto.

Ao trocar de aba, a seleção é limpa para evitar aplicar acidentalmente textos que ficaram escondidos em outra aba. A seleção continua preservada durante busca e troca de página na mesma aba, como no comportamento anterior.

## Compatibilidade e preservação

Uma sugestão de IA não aplicada continua sendo uma pendência: apenas aprovar e aplicar uma categoria altera sua classificação. Aplicar ou desfazer sugestões revisadas também atualiza os contadores. Os índices continuam referindo-se à distribuição original completa, inclusive quando a busca ou a paginação mostram uma parte dela.

A nova interface não altera respostas originais, contagens, percentuais, bases, pesquisas, coletas, usuários, pagamentos ou contratos. Os filtros não são enviados ao banco. A classificação continua no mecanismo existente de rascunho, CSV e PDF; não há mudança na tela de resultados do cliente nesta versão.

**Não há SQL novo e não é necessário alterar o `index.ts`, `file2.ts`, JWT ou segredos no Supabase.** O CSS anterior foi preservado integralmente; estilos novos foram apenas acrescentados. A rolagem e o rodapé acessível da v157 foram mantidos.

## Validação

Passaram **113 smoke tests** em cópia isolada, verificação de sintaxe de todos os JavaScript e o teste DOM do fluxo de revisão da IA. O teste novo verificou filtros com 1.250 textos, contadores, índices, busca, seleção, paginação, teclado e preservação dos originais.

O fluxo interativo foi testado em Chromium com respostas fictícias em desktop, tela compacta, celular, paisagem e viewport reduzido. Foram verificados criar categoria, completar uma existente, desfazer, aplicação e reversão de sugestão fictícia de IA, acesso por teclado, rolagem, botão de salvar acessível e ausência de transbordamento horizontal. Não houve chamada real à IA nem alterações de produção.

A publicação no GitHub/Vercel depende de autorização específica para a v158.
