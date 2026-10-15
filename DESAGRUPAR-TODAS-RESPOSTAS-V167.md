# PesquisaPro v167 — Desagrupar todas as respostas

## O que foi acrescentado

Na janela **Agrupar respostas abertas**, o painel **Recomeçar o tratamento desta pergunta** contém:

- **Desagrupar todas as respostas**: retira todos os vínculos de textos com categorias da pergunta aberta que está em edição. Inclui textos fora da busca, da página atual e da seleção manual.
- **Desfazer desagrupamento**: restaura os vínculos anteriores, enquanto a mesma janela estiver aberta e não houver edições posteriores na estrutura de agrupamentos.

A operação exige confirmação e só altera o rascunho em memória. Nenhuma resposta original é apagada, reescrita ou excluída da base válida.

## Como usar

1. Abra **Relatórios** e escolha a pesquisa.
2. Na pergunta aberta desejada, clique em **Agrupar respostas**.
3. Clique em **Desagrupar todas as respostas** e confira a confirmação.
4. Confirme para devolver todos os textos vinculados à aba **Não categorizadas**.
5. Se necessário, clique em **Desfazer desagrupamento** antes de fazer novas edições ou fechar a janela.
6. Clique em **Salvar agrupamentos na estrutura** para persistir a operação escolhida.

O botão atua **somente na pergunta aberta atual**. Não altera as categorias das demais perguntas nem as outras pesquisas.

## Dicionário e categorias

- Na classificação **contextual**, os códigos estáveis, nomes, definições, exclusões, critério e escolha de múltiplos temas são preservados. Somente os membros das categorias são retirados. Assim é possível refazer a classificação sem recriar o dicionário revisado.
- Nos agrupamentos manuais antigos, as categorias sem membros são removidas pelo normalizador existente. A reversão restaura as categorias e seus membros integralmente.
- Os critérios e definições ainda editados no painel contextual, mas não aplicados, não são descartados por esta ação. Seu salvamento continua pelo controle de metadados existente.

## Segurança da revisão

As seleções manuais são limpas, a busca e a paginação são reiniciadas, e a aba Não categorizadas é selecionada. Sugestões antigas e históricos de aplicação da IA ou de união de categorias são invalidados. Uma análise em andamento é cancelada; um resultado que chegar atrasado não pode reaplicar vínculos retirados. O cursor contextual volta ao início, permitindo uma nova análise dos textos.

Nada é enviado à IA pelo botão de desagrupamento. Nada é gravado diretamente no banco pelo botão: é necessário salvar a estrutura do relatório pelo fluxo existente.

## Relatórios, cruzamentos e cliente

O snapshot de agrupamentos passa a ter os membros removidos, mantendo os mesmos dados e bases originais. A prévia e as novas consultas do relatório usam essa estrutura atualizada. Textos desagrupados voltam a aparecer separados pelo seu conteúdo original, conforme a regra mista vigente.

**PDFs já gerados e relatórios já disponibilizados ao cliente não são reescritos automaticamente.** Para alterar a entrega final, salve a estrutura, gere um novo PDF, revise-o e disponibilize novamente pelo fluxo existente. Salvar ou desagrupar não equivale a publicar uma nova entrega.

## Ativação

Esta versão requer apenas a publicação dos arquivos web da v167, com cache `20261014211800`.

- **Não há migration nova.**
- **Não é necessário repetir os SQLs já executados.**
- **Não é necessário atualizar a Edge Function nem os Secrets.**

A v166 e suas dependências permanecem iguais. Durante a preparação da v167, não foram feitos commit, push, publicação na Vercel ou alterações no Supabase. A publicação depende de autorização específica do usuário.

## Validação local

- 124 scripts de regressão passaram, além da verificação de sintaxe dos arquivos JavaScript.
- O teste novo cobre confirmação/cancelamento, 1.250 textos vinculados, remoção além da paginação, preservação das respostas, bases e PDF, dicionário contextual, reversão integral, proteção de edições posteriores, isolamento de pergunta/pesquisa/sessão e chegada tardia de uma resposta simulada da IA.
- O Chromium validou os cliques reais em desktop, tablet, celular, paisagem e tela reduzida, incluindo salvamento simulado, desfazer, rolagem e acesso ao rodapé.
- Os testes usaram somente dados fictícios. Não houve desagrupamento de respostas reais, envio de dados reais à OpenAI nem teste remoto no banco do usuário.
- O CSS anterior foi preservado integralmente por append. SQLs e funções existentes permanecem byte a byte iguais; o clone de publicação e sua alteração protegida em `deploy/cadastro-pesquisador-senha.sql` foram preservados.
