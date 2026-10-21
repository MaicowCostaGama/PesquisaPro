# PesquisaPro v195 — opções grandes sem poluir a tela

A v195 mantém o limite de até **10.000 opções válidas** importadas por Excel, XLS ou CSV e muda a forma de apresentação:

## No formulário da pesquisa

- As opções continuam sendo armazenadas normalmente e não precisam de nova tabela ou migration.
- A lista aparece dentro de uma caixa com rolagem, mostrando somente algumas linhas por vez.
- O botão **Ir para a última** leva diretamente ao final da lista para revisar ou editar a última opção importada.
- O botão de importação continua aceitando adicionar opções às atuais ou substituir a lista, com confirmação antes de aplicar.

## Na coleta do pesquisador

- Somente perguntas de **Escolha única**, **Múltipla escolha** e subcampos fechados de **Duas respostas** que receberam opções por Excel/CSV usam o autocomplete. Perguntas comuns continuam com os controles tradicionais.
- Nessas perguntas importadas, o pesquisador digita parte da resposta e recebe somente as sugestões encontradas, com prioridade para opções que começam pelo texto digitado.
- A busca ignora diferenças de maiúsculas/minúsculas e acentos.
- São exibidas no máximo 20 sugestões por vez; uma mensagem orienta a refinar a busca quando houver mais resultados.
- Em múltipla escolha, as opções selecionadas aparecem como marcadores removíveis.
- O sistema registra a origem Excel/CSV junto da configuração já existente da pergunta e usa os valores salvos da pesquisa, sem criar dados paralelos ou alterar o registro até a entrevista ser enviada.

## Banco de dados e publicação

Não há SQL novo na v195. A melhoria é exclusivamente no frontend; as opções continuam usando as colunas e tabelas já existentes. O SQL da importação e das pesquisas anteriores não precisa ser executado novamente.
