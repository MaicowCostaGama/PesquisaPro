# Melhoria da tela de pesquisadores — 21/09/2026

A tela administrativa de usuários recebeu uma reorganização visual para tornar o trabalho de análise de pesquisadores mais rápido e claro. A experiência escolhida foi a de um painel operacional: primeiro aparecem as pendências que exigem decisão, depois a busca, os filtros e a tabela completa da rede.

## Fila prioritária

Na aba **Pesquisadores**, a área **Pesquisadores para analisar** aparece logo após os indicadores. Ela reúne duas filas compactas: **Novos cadastros**, originados do autocadastro, e **Perfis pendentes**, cadastrados diretamente pela administração. Cada item apresenta nome, localização, situação documental e ações de **Ver dados** e **Aprovar**. Os três primeiros itens de cada fila ficam visíveis imediatamente; quando houver mais registros, a interface informa que os demais continuam disponíveis na lista completa.

A fila também exibe o total de pendências e um atalho **Ver lista completa**, que leva diretamente à tabela sem exigir navegação manual prolongada. Quando não há pendências, o painel mostra um estado positivo informando que a fila está em dia.

## Indicadores e preservação

O indicador **Aguardando análise** passa a somar perfis pendentes e autocadastros pendentes. O indicador de documentos considera também os cadastros da fila. Nenhum perfil, cadastro, documento, aprovação ou registro histórico é removido por esta alteração. A mudança é exclusivamente de interface e cálculo de indicadores locais.

A busca, os filtros por estado, cidade e escolaridade, a tabela horizontal e a coluna fixa de ações continuam disponíveis. O layout é responsivo para desktop e celular, com ações acessíveis por teclado e estados visuais de fila vazia.

## Publicação

Esta versão altera apenas `app.js`, `style.css`, `app.html` e o smoke test de layout. Não há migration SQL associada a esta melhoria.
