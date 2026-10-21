# PesquisaPro v196 — conexões visuais do mapa de fluxo

A v196 mantém a aba **Mapa do fluxo** e acrescenta duas formas de ligar as perguntas. As conexões ficam visíveis como linhas com setas e cada tipo possui uma cor própria.

## 1. Conexão direta

A conexão direta é usada quando, depois que a pergunta for respondida, o fluxo deve seguir para uma pergunta específica, independentemente da alternativa escolhida.

- Use a porta **verde** na faixa “Conexão direta” do balão.
- Arraste-a até o balão da pergunta de destino; ou escolha o destino no seletor da faixa.
- A linha verde representa esse caminho.
- Se não houver conexão direta, a sequência normal seguirá para a próxima pergunta.

## 2. Conexão por resposta

A conexão por resposta é usada quando cada alternativa precisa seguir por um caminho diferente.

- Em uma pergunta de escolha única, localize a alternativa.
- Use a porta **azul** ao lado da alternativa.
- Arraste-a até a pergunta de destino; ou use o seletor daquela alternativa.
- A linha azul tracejada representa o salto condicionado àquela resposta.
- É possível criar dois, três, quatro ou mais caminhos na mesma pergunta, um para cada alternativa.

Quando uma resposta possui uma conexão específica, ela prevalece sobre a conexão direta da pergunta. Assim, é possível definir um caminho padrão direto e criar exceções para alternativas específicas.

## Espaçamento, arraste e zoom

Os balões têm espaçamento ampliado para as linhas ficarem legíveis. Arraste o cabeçalho de cada balão para reposicioná-lo. As posições são preservadas quando a pesquisa é salva.

Para visualizar mapas grandes:

- use `+` para aproximar;
- use `−` para afastar;
- clique no percentual para voltar a 100%;
- mantenha `Ctrl` (ou `Cmd` no Mac) pressionado e use a roda do mouse sobre o mapa.

Os seletores de destino continuam disponíveis para uma configuração precisa, inclusive quando existem muitas perguntas.

## Segurança do fluxo

Os destinos só podem apontar para perguntas posteriores ou para **Encerrar entrevista**. O sistema rejeita loops, saltos para trás e destinos inexistentes antes de salvar.

## SQL

Não há SQL novo na v196. As conexões continuam armazenadas no campo `survey_questions.logic_jsonb`, criado pela migration `deploy/caminhos-condicionais-v189.sql`. Se essa migration já foi executada anteriormente, não é necessário executar outro SQL. Se ainda não foi executada, execute-a uma única vez no Supabase antes de salvar caminhos no mapa.

Nenhum dado de coleta, resposta, usuário, pagamento ou pesquisa é apagado pela v196.
