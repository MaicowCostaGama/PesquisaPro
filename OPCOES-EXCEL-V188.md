# PesquisaPro v188 — opções por Excel

A v188 adiciona ao editor de perguntas um importador de opções por **Excel (`.xlsx`/`.xls`) ou CSV**.

## Como usar

1. Abra **Nova pesquisa** ou **Editar pesquisa**.
2. No passo **Formulário**, crie ou selecione uma pergunta de **Escolha única**, **Múltipla escolha** ou **Ranking**.
3. Clique em **Importar opções do Excel**.
4. Selecione o arquivo. A primeira aba será usada e a primeira coluna com conteúdo será identificada automaticamente.
5. Revise a prévia. Se a primeira linha for um título, marque **A primeira linha é um cabeçalho**.
6. Escolha uma das opções:
   - **Adicionar às opções atuais**: mantém o que já existe e acrescenta as novas opções;
   - **Substituir as opções atuais**: troca a lista do editor pela lista importada.
7. Clique em **Aplicar opções** e, depois, use o botão normal **Salvar alterações/Criar pesquisa**.

Em perguntas **Duas respostas**, o botão aparece somente quando o subcampo foi configurado como **Escolha única** ou **Múltipla escolha**.

## Regras aplicadas

- Linhas vazias são ignoradas.
- Opções repetidas são removidas, inclusive diferenças apenas de maiúsculas/minúsculas e acentos.
- O limite é de 5.000 opções e 200 caracteres por opção.
- O arquivo tem limite de 8 MB.
- Macros, fórmulas, links, erros e datas automáticas são recusados.
- Apenas a primeira aba e a primeira coluna preenchida são importadas.
- A prévia não grava nada no banco. A mudança fica somente no editor até o administrador salvar a pesquisa.
- A lista de opções existente é preservada até a confirmação explícita de **Aplicar opções**.
- Se uma opção já tinha a marca de **encerrar entrevista**, essa marca é preservada quando a opção continua existindo em uma importação.

## Compatibilidade

A funcionalidade reutiliza a biblioteca local `vendor/xlsx.full.min.js` já usada pelos relatórios e exportações do aplicativo. Não cria tabela, não exige migration e não altera respostas ou coletas existentes.

## Arquivos principais

- `question-options-excel.js`: leitura, validação, prévia e aplicação;
- `app.js`: botões no editor e sincronização com o modelo existente;
- `app.html`: cache v188 e carregamento do módulo;
- `style.css`: interface responsiva da prévia;
- `question-options-excel-smoke-test.js`: validação automatizada da funcionalidade.
