# Ranking de preferências e duas respostas — 17/09/2026

O editor de pesquisas passa a oferecer dois novos formatos: **Ranking de preferências** e **Duas respostas**.

## Ranking de preferências

O administrador cadastra todas as opções disponíveis. Durante a coleta, o pesquisador apresenta as opções ao entrevistado, que deve organizá-las da mais preferida para a menos preferida. O ranking pode ser reordenado por arraste ou pelas setas de subir e descer, para funcionar também em celulares.

Cada posição é persistida separadamente: a opção fica em `value_text` e sua posição, começando em 1, fica em `value_number`. No relatório agregado, os resultados aparecem como `1º — opção`, `2º — opção` e assim por diante.

## Duas respostas

O administrador cria uma única pergunta com dois subcampos independentes. Para cada subcampo, escolhe entre **Aberta**, **Escolha única** ou **Múltipla escolha**. Nos formatos fechados, cadastra as opções correspondentes.

Na coleta, os dois subcampos aparecem juntos e são obrigatórios. Uma resposta aberta é guardada como texto; uma escolha única como um texto; e uma múltipla escolha como uma linha para cada opção marcada. Todas as respostas são vinculadas ao respectivo `field_id`, evitando misturar a primeira variável com a segunda. No relatório geral, os rótulos dos subcampos identificam a origem, por exemplo `Marca: Opção A` e `Motivo: Preço`.

Perguntas de ranking e perguntas compostas aparecem no resultado geral e no PDF. Elas não aparecem como uma única variável no montador de cruzamentos, porque o ranking contém várias posições e a pergunta composta já contém duas variáveis internas. As demais perguntas continuam disponíveis para cruzamentos de até três variáveis.

## Migration

O arquivo `deploy/perguntas-ranking-duas-respostas.sql` é aditivo. Ele amplia o conjunto de tipos, cria `survey_question_fields`, adiciona `collection_answers.field_id`, cria índices e políticas RLS, e atualiza as RPCs agregadas de resultados do staff e do cliente. Não apaga pesquisas, perguntas, opções, respostas, pesquisadores ou contratos. O código também possui fallback de leitura para que o app não deixe de carregar pesquisas antigas enquanto a migration não for aplicada; entretanto, para criar e coletar os novos tipos, a migration precisa ser executada no SQL Editor do Supabase.

A alteração do constraint de tipo apenas permite os novos valores `ranking` e `pair`; os registros antigos permanecem válidos. Como a tabela de subcampos usa `on delete cascade` a partir da pergunta, a exclusão de uma pergunta pelo fluxo administrativo remove somente seus próprios subcampos relacionados, sem atingir respostas de outras perguntas.

## Validação

Foram executados `node --check app.js`, o smoke test específico `ranking-pair-smoke-test.js` e os smoke tests existentes do projeto. A publicação e a aplicação da migration devem aguardar autorização explícita do responsável.
