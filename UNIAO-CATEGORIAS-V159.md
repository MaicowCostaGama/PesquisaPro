# PesquisaPro v159 — juntar categorias já criadas

**Estado:** implementada e testada localmente, ainda não publicada. A v158 permanece em produção. Cache preparado: `20261013213000`.

## Finalidade

Permitir que a gestão una **duas ou mais categorias completas** de uma mesma pergunta aberta, inclusive categorias criadas manualmente ou por sugestões de IA revisadas em lotes diferentes. Nenhuma união é feita automaticamente.

## Como usar

1. Em **Relatórios**, abra **Agrupar respostas** na pergunta aberta.
2. Clique no atalho **Juntar categorias já criadas**, no começo da janela.
3. Na seção **Categorias revisadas**, marque **Selecionar para juntar** em cada categoria desejada.
4. Confira a prévia: categorias selecionadas, quantidade de textos vinculados, soma das ocorrências e percentual sobre a base atual.
5. Defina o **Nome final da categoria**. O sistema sugere o nome da primeira categoria na ordem da lista; você pode manter esse nome ou escrever outro.
6. Clique em **Juntar categorias selecionadas**.
7. Clique em **Salvar agrupamentos na estrutura** e aguarde a confirmação para persistir a união no rascunho.

A união inclui todos os textos vinculados às categorias escolhidas, mesmo os que não aparecem no filtro de busca ou na página atual. O nome da categoria final não pode coincidir com uma categoria não selecionada: inclua essa categoria também ou escolha outro nome.

> Una apenas respostas equivalentes. Semelhança de tema, por si só, não significa que as respostas possam ser contabilizadas como uma única categoria.

## Desfazer

**Desfazer última união** restaura as categorias anteriores, com seus nomes e textos. Esse histórico é temporário, válido enquanto o agrupador estiver aberto. Se houver qualquer edição posterior dos agrupamentos, a reversão é bloqueada para não sobrescrever essa edição. É necessário salvar novamente para persistir a reversão.

**Desfazer agrupamento**, em uma categoria individual, continua sendo outra ação: remove a classificação daquela categoria e devolve seus textos à lista de não categorizadas. Não recupera as categorias que existiam antes de uma união.

## Preservação

- Nenhuma resposta original é reescrita ou excluída.
- Os textos vinculados são unidos sem duplicação; frequências continuam provenientes das respostas originais.
- A soma das ocorrências, a quantidade de respostas preenchidas e a base percentual permanecem iguais.
- Categorias não selecionadas não são alteradas.
- As abas **Não categorizadas**, **Categorizadas** e **Todas** continuam funcionando.
- A união é usada pela prévia da gestão, pelo CSV de categorias e pelo PDF por meio do mecanismo existente de agrupamentos.
- Para atualizar um PDF já publicado é necessário gerar e disponibilizar uma nova versão revisada.
- Não foi alterada nesta versão a tela de resultados do perfil do cliente.

A seleção de categorias para união é separada da seleção de textos para categorização manual. Ao aplicar a união, ambas as seleções são limpas. Sugestões de IA anteriores à edição continuam submetidas à proteção de revisão e não podem sobrescrever a união.

## Implantação e validação

**Não há SQL novo nem atualização da função no Supabase.** O `index.ts`, auxiliar, JWT, segredos e arquivos de deploy foram preservados. O CSS anterior foi mantido integralmente; apenas estilos específicos foram acrescentados. A rolagem e o rodapé de salvar continuam acessíveis.

Passaram **114 smoke tests** em cópia isolada, a verificação de sintaxe dos JavaScript e o teste DOM de revisão da IA. Os testes novos cobriram união completa com 1.250 membros, duplicação, nomes conflitantes, soma, percentual, PDF, reversão e isolamento de sessão.

Em Chromium, com dados fictícios e sem chamadas externas, foram verificados união de categorias com textos fora da página visível, nome final, conflito de nome, prévia percentual, PDF, desfazer, proteção contra edições posteriores, teclado, rolagem e botão de salvar em desktop, tela compacta, celular, paisagem e viewport reduzido. O fluxo anterior de categorização e aplicação/reversão da IA também foi revalidado nessas cinco telas.

A publicação no GitHub/Vercel depende de autorização específica para a v159.
