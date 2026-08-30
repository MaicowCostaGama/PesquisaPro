# Auditoria e otimização do PesquisaPro

## Diagnóstico inicial

O pacote é uma aplicação web estática em HTML, CSS e JavaScript, com Supabase para autenticação e persistência. O arquivo `app.js` possui cerca de 4.934 linhas e concentra navegação, formulários, cálculos, relatórios, coleta, auditoria e administração. A base de localidades (`br-localidades.js`) tem aproximadamente 86 KB e os ativos vendorizados incluem Chart.js, Leaflet e QRCode.js.

A sintaxe dos arquivos JavaScript foi validada antes e depois das alterações. A página inicial também foi aberta em servidor local e renderizou corretamente.

## Melhorias aplicadas

| Área | Alteração | Benefício |
| --- | --- | --- |
| Carregamento | Gráficos, QR Code, Leaflet e CSS do mapa passaram a ser carregados sob demanda a partir dos arquivos locais já incluídos no pacote. | O login e as telas que não usam esses recursos ficam mais leves e o painel deixa de depender de CDN para esses ativos. |
| Cálculo amostral | Foi criado um cálculo centralizado e defensivo, com validação de população, margem, confiança e proporção. | Evita `NaN`, `Infinity` e gráficos quebrados durante a digitação de entradas incompletas. |
| Interação | Os cálculos de amostra passaram a ser agendados por frame, reduzindo recriações do Chart.js a cada tecla. | Menor custo de CPU e resposta mais suave nos campos numéricos. |
| Gráficos | Instâncias do dashboard, financeiro, amostra, wizard e distribuições agora são destruídas/reutilizadas corretamente. | Reduz risco de vazamento de memória durante navegação repetida. |
| Coleta | Consultas de eventos usam uma projeção de campos e, no polling de uma pesquisa aberta, filtram pelo `survey_id`. | Menor payload e menos processamento no navegador e no Supabase. |
| Auditoria | O intervalo e a distância entre entrevistas usam um índice por pesquisador, em vez de localizar repetidamente cada evento. | Melhor desempenho com históricos maiores. |
| Dados externos | Valores de nomes, cidades, clientes, respostas, flags e títulos dinâmicos passaram a ser escapados; argumentos de handlers receberam serialização segura. | Menor risco de quebra de HTML e de injeção via conteúdo cadastrado. |
| Mobile/acessibilidade | Foram adicionados `label for`, tipo de e-mail, autocomplete, `aria-live`, foco visível, estados desabilitados, `prefers-reduced-motion` e ajustes de tabela/cartões em telas pequenas. | Melhor uso em celulares, teclado e tecnologias assistivas. |
| Banco | Foi adicionada `deploy/otimizacao-performance-seguranca.sql` com índices para eventos, respostas, equipe, convites e vínculos, além de restrição das RPCs a usuários autenticados e validação de pertencimento de pergunta/pesquisa. | Consultas mais rápidas e superfície de acesso mais restrita. |

## Observação de implantação

A migração `deploy/otimizacao-performance-seguranca.sql` deve ser executada no Supabase depois do `schema.sql` e dos scripts de RLS existentes. A chave pública do Supabase continua necessária no navegador; chaves secretas não devem ser adicionadas ao projeto.

## Validação no navegador

A página inicial e a tela de login renderizaram corretamente em servidor local. O console não apresentou mensagens de erro na inicialização. Na tela de login, a inspeção confirmou que `Chart.js`, `Leaflet` e `QRCode.js` permanecem descarregados; somente os scripts essenciais de localidades, Supabase, cliente Supabase e o código principal foram carregados. Isso confirma o comportamento de carregamento sob demanda.

O carregador sob demanda também foi exercitado no navegador: Chart.js, QRCode.js e Leaflet foram carregados com sucesso a partir da pasta `vendor/`, e o CSS do Leaflet foi injetado apenas no momento da solicitação. Não foram observados erros no retorno das promessas.

## Resultado final dos testes

A suíte final passou: `node --check` para os três arquivos JavaScript, teste de fumaça para cálculo/sanitização/ativos/migração, verificação de existência dos quatro ativos locais e checagem de ausência das referências antigas de CDN para Chart.js, QRCode.js e Leaflet. O aplicativo foi servido localmente e os recursos sob demanda responderam com HTTP 200.
