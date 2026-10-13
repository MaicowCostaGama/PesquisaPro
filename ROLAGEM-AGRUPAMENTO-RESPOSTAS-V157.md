# PesquisaPro v157 — rolagem completa do agrupador

**Situação:** correção preparada e testada localmente em 13/10/2026; ainda não publicada. A v156 permanece em produção. A captura enviada pelo usuário mostra que a IA gerou sugestões, mas a janela cortou o restante da revisão.

## Causa confirmada

O painel de sugestões da IA era irmão do conteúdo manual, fora da única área com `overflow-y:auto`. Com muitas sugestões, ele excedia a altura máxima da janela. O contêiner da janela usava `overflow:hidden`, e o conteúdo excedente, inclusive os controles posteriores, ficava inacessível.

O defeito foi reproduzido em Chromium com 60 sugestões fictícias: a última sugestão e o rodapé ficavam abaixo da tela, sem um contêiner rolável comum.

## Correção

- Orientações, sugestões da IA e agrupamento manual passam a compartilhar uma área rolável interna.
- Barra vertical com trilho e indicador contrastantes, sem ocultação por CSS.
- Fechar e o cabeçalho permanecem no topo; salvar permanece no rodapé fora da área rolável.
- Acesso à última sugestão, ao botão de aplicar e ao agrupamento manual por rolagem.
- Rolagem por roda do mouse, teclado e toque nativo do navegador.
- Foco inicial no botão de fechar, sem salto automático para a busca no fim da janela.
- Estilos limitados ao agrupador. CSS anterior preservado integralmente; novas regras somente acrescentadas ao final.

## Preservação e publicação

A correção não altera lógica de agrupamento, lotes da IA, textos originais, frequências, percentuais, respostas, coletas, pagamentos, contratos ou senhas. Não envia dados ao provedor de IA.

**Não há SQL novo e não é necessário atualizar o `index.ts`, o `file2.ts` ou os segredos no Supabase.** Os arquivos da função e os SQLs permanecem byte a byte iguais à versão anterior.

Cache preparado: `20261013133000`. Publicar no GitHub/Vercel somente após autorização específica para a v157. Depois da confirmação da publicação, atualizar a página e reabrir o agrupador. Não force recarga se houver um rascunho não salvo.

## Validação

- **112 smoke tests passaram** em cópia isolada, incluindo um teste novo da área rolável comum e dos botões fora dela.
- Todos os JavaScript passaram na verificação de sintaxe.
- Teste DOM do consentimento, lote, revisão, aplicação, desfazer e cancelamento passou.
- Testes de rolagem real em Chromium com 60 sugestões fictícias passaram em desktop (1440 × 900), tela compacta (1024 × 600), celular (390 × 844), paisagem (844 × 390) e viewport reduzido (720 × 450, representando menor área disponível em zoom alto).
- Em todas as telas foram verificados: roda do mouse, PageDown, acesso à última sugestão, checkbox da última categoria, botão de aplicar, cabeçalho e salvar visíveis, e ausência de transbordamento horizontal.
- Capturas de desktop e celular foram inspecionadas com a barra de rolagem habilitada.
- Não houve chamadas reais à IA nem alteração de dados de produção nesta correção.
