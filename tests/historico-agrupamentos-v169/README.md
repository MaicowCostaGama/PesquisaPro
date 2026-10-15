# Testes históricos de agrupamento — até v169

Os 14 testes deste diretório foram preservados byte a byte a partir da versão v169 publicada. Eles registram o contrato antigo de agrupamento, categorização, IA, desagrupamento e limpeza.

A v170 retira esses recursos do uso do aplicativo. Portanto, estes testes não fazem parte da suíte atual e não devem ser executados contra a v170 esperando o comportamento antigo. Para estudar o funcionamento anterior, use o código e o pacote da v169 correspondente.

A cobertura atual está nos testes `reports-original-only-smoke-test.js`, `reports-mixed-results-smoke-test.js` e `reports-questions-excel-smoke-test.js`, além dos demais smoke tests ativos na raiz do aplicativo. Eles verificam resultados originais, exportações, cruzamentos, permissões e preservação de metadados antigos sem aplicação do agrupamento.

Nenhuma migration ou Edge Function foi apagada ou executada por este arquivamento de testes.
