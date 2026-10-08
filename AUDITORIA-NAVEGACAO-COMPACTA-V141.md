# Auditoria — navegação compacta v141

## Problema resolvido

A tela **Coleta e campo > Auditoria** tinha duas áreas extensas empilhadas: a lista de reprovações/calibrações e a tabela completa de auditoria. Isso obrigava a gestão a rolar por muito tempo para alternar entre os dois conteúdos.

## Solução

Foi adicionada uma navegação interna fixa no topo da Auditoria, com dois atalhos:

- **Reprovações e calibrações** — mostra a quantidade total e o detalhamento de reprovadas e calibrações.
- **Auditoria completa** — mostra a quantidade de coletas e a tabela com todas as evidências, filtros e ações.

Somente um painel fica aberto por vez. O conteúdo continua completo, sem remover histórico ou ações; a mudança é apenas de organização visual e navegação.

Quando não existem reprovações ou calibrações, a tela abre automaticamente em **Auditoria completa**. Se uma coleta for reprovada, reaprovada ou marcada/desmarcada como calibração, os contadores e a visibilidade dos painéis são atualizados sem recarregar a página inteira.

A navegação permanece acessível por teclado, possui estado selecionado explícito e se adapta a telas menores, passando para uma coluna no celular. O cabeçalho fica visível durante a rolagem da auditoria para permitir a troca imediata de painel.

## Segurança e banco

Nenhuma migration nova é necessária. A solução usa somente os dados que já estavam carregados no frontend e não altera tabelas, pagamentos, coletas, auditorias ou registros históricos.

## Validação local

- `node --check app.js` e sintaxe dos demais JavaScript: aprovadas.
- `audit-section-navigation-smoke-test.js`: aprovado.
- `audit-actions-layout-smoke-test.js`: aprovado.
- `audit-recording-duration-smoke-test.js`: aprovado.
- `geo-collection-navigation-smoke-test.js`: aprovado.
- Suíte completa de smoke tests: aprovada.
- Cache atualizado para `20261008153000`.

A publicação no GitHub/Vercel permanece pendente de autorização explícita para a v141.
