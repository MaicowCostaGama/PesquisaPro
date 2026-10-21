# PesquisaPro v198 — sequência normal visível no mapa de fluxo

A v198 corrige o mapa para mostrar automaticamente as linhas da sequência normal entre perguntas. Mesmo antes de configurar saltos condicionais, o fluxo padrão agora aparece no diagrama.

## Tipos de linha

- **Sequência normal:** linha cinza tracejada que liga cada pergunta à próxima na ordem do formulário.
- **Conexão direta:** linha verde que substitui a sequência normal daquela pergunta e aponta para uma pergunta posterior ou para o fim.
- **Conexão por resposta:** linha azul que sai de uma resposta específica e aponta para outra pergunta ou para o fim.

Quando uma pergunta de escolha única tem destinos configurados para todas as respostas preenchidas, a sequência normal deixa de ser desenhada para evitar duplicidade visual. Se ainda houver respostas sem destino específico, a linha cinza continua indicando o caminho padrão.

## Como editar

As linhas especiais podem ser arrastadas pela própria linha ou pela alça final. A sequência normal também pode ser arrastada: ao conectá-la a outro balão, ela se transforma em uma conexão direta.

O botão **Remover linha** remove conexões diretas e conexões por resposta. A sequência normal é o caminho padrão do formulário e volta a aparecer quando uma conexão especial é removida.

## SQL

Não há SQL novo na v198. A persistência continua usando `survey_questions.logic_jsonb`, criado pela migration `deploy/caminhos-condicionais-v189.sql`.
