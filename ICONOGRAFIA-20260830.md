# Iconografia 3D — atualização 2026-08-30

O PesquisaPro passou a usar um catálogo central de ícones SVG para o menu lateral e para os cards estatísticos. Os ícones são vetoriais, independentes de imagens externas e preservam nitidez em telas de alta resolução.

## Tratamento visual

Cada ícone recebe uma cápsula com gradiente, brilho superior, sombra interna e sombra externa, criando profundidade sem perder contraste. O menu possui tratamento próprio para estado normal, hover e item ativo. Na revisão visual, as cápsulas do menu foram ampliadas para 34px, receberam traços SVG mais espessos, contraste reforçado e alinhamento fixo, evitando a aparência de símbolos pequenos e finos observada na versão anterior. Os cards usam cápsulas maiores com elevação sutil ao passar o cursor. A animação respeita `prefers-reduced-motion`.

## Cobertura

O catálogo cobre painel, nova pesquisa, pesquisas, concluídas, cálculo de amostra, coleta, coleta no aplicativo, relatórios, usuários, permissões, financeiro, contratos, empresa, comercial, andamento, resultados e saída do sistema. O mesmo sistema é usado por todos os cards estatísticos existentes.

## Validação

Foram executados os testes de sintaxe do aplicativo, os testes existentes de cálculo, Comercial, convites, mapa, filtros e sobreposição, além do `icon-smoke-test.js`. A prévia textual confirmou que os SVGs são renderizados no menu e nos cards; a prévia visual temporária foi removida após a inspeção. O cache-busting foi atualizado para `20260830190000`.
