# Reordenação de perguntas — 17/09/2026

A edição de pesquisas do PesquisaPro agora permite reorganizar as perguntas diretamente no passo **Formulário**. A mudança atua sobre a lista existente e mantém cada pergunta, suas opções, cotas e marcações de região; nenhum registro é excluído pela reordenação.

## Como usar

Na tela de edição, use a alça pontilhada **⠿** à direita de cada pergunta e arraste o cartão para a posição desejada. Uma linha azul indica se a pergunta será inserida antes ou depois do cartão sob o cursor. Em celulares, a mesma alça funciona por toque.

Como alternativa acessível, as setas **↑** e **↓** permitem mover uma pergunta uma posição por vez usando mouse, teclado ou leitor de tela. As setas ficam desativadas quando a pergunta já está no primeiro ou no último lugar.

## Salvamento e preservação

A ordem é aplicada à sequência local do formulário e é gravada quando o fluxo existente salva a pesquisa, ao avançar entre etapas ou ao concluir a edição. No banco, cada pergunta continua sendo armazenada em `survey_questions` com `position` sequencial, e a leitura da pesquisa reconstitui a ordem por esse campo.

A rotina de salvamento continua substituindo apenas as perguntas e opções da pesquisa em edição, como já fazia antes. A nova interação não exige migration SQL e não remove pesquisas, pesquisadores, respostas, contratos ou outros dados existentes.

## Validação realizada

Foram executados `node --check app.js`, todos os smoke tests do projeto e o novo `question-reorder-smoke-test.js`. A sintaxe e todos os testes foram aprovados localmente.
