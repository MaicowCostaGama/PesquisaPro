# PesquisaPro v205 — pergunta de valor em moeda

## O que foi implementado

O construtor agora oferece dois tipos novos de pergunta:

- **Valor em moeda · escolha única**;
- **Valores em moeda · múltipla**.

A configuração usa reais (R$) e permite informar:

- valor mínimo, com padrão de **R$ 0,01**;
- valor máximo, com padrão de **R$ 1.000,00**;
- intervalo das sugestões, com padrão de **R$ 0,01**.

A faixa pode ser alterada para qualquer valor dentro do limite técnico de R$ 999.999.999,99. O intervalo pode ser, por exemplo, R$ 0,01, R$ 1,00 ou R$ 10,00.

## Como usar

1. Abra a elaboração ou edição de uma pesquisa.
2. Em **Adicionar pergunta**, escolha **Valor em moeda · escolha única** ou **Valores em moeda · múltipla**.
3. Digite o enunciado da pergunta.
4. Informe o valor mínimo, máximo e o intervalo das sugestões.
5. Salve a pesquisa normalmente.
6. Na coleta, o pesquisador digita parte do valor, como `25,50`, e seleciona uma sugestão em reais.
7. No tipo múltipla, ele pode selecionar mais de um valor; no tipo única, um valor substitui o anterior.

O sistema mostra no máximo 12 sugestões próximas ao texto digitado. Ele não cria uma lista com milhares ou milhões de valores. O valor digitado exatamente também é sugerido quando está dentro da faixa.

## Armazenamento e relatórios

Cada resposta monetária é gravada em `collection_answers` com:

- `value_number`: valor numérico para cálculos, cruzamentos e análises;
- `value_text`: valor formatado em reais, preservando a apresentação da resposta.

Perguntas antigas e respostas existentes não são alteradas. A configuração da pergunta fica em `survey_questions.logic_jsonb`, usando a coluna criada pela migration de caminhos condicionais v189.

## SQL manual

A funcionalidade principal depende de `deploy/caminhos-condicionais-v189.sql`, que já deve estar aplicada no Supabase porque o aplicativo usa essa coluna para os caminhos condicionais.

Foi criada uma migration adicional, `deploy/pergunta-valor-moeda-v205.sql`, apenas para incluir `logic_jsonb` no snapshot enviado ao cliente quando a pesquisa utiliza aprovação de formulário. Ela permite que o cliente veja no preview a faixa monetária configurada.

Execute essa migration manualmente no SQL Editor do Supabase se o fluxo de aprovação de formulário pelo cliente for utilizado. Ela não foi executada automaticamente e não altera respostas ou dados antigos.

## Arquivos da implementação

- `app.js`: tipos, editor, persistência, coleta, respostas e preview de aprovação;
- `question-currency-autocomplete.js`: autocomplete limitado e geração de sugestões;
- `app.html`: inclusão do componente e atualização de cache;
- `style.css`: estilos anexados ao CSS existente;
- `deploy/pergunta-valor-moeda-v205.sql`: migration manual do snapshot de aprovação;
- `currency-question-smoke-test.js`: teste estrutural local.

## Validações realizadas

- `node --check` em todos os 172 arquivos JavaScript: aprovado;
- smoke test da pergunta monetária: aprovado;
- teste de valores com vírgula decimal, como `25,50`: aprovado;
- parser PostgreSQL da migration local: aprovado;
- varredura de segredos no frontend: aprovada;
- nenhuma migration foi executada remotamente;
- o SQL permanece separado do código publicado e deve ser executado manualmente no Supabase.
