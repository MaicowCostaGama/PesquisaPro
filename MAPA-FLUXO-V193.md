# PesquisaPro v193 — mapa de fluxo com caminhos visuais

A v193 reorganiza o editor de caminhos condicionais em uma aba própria chamada **Mapa do fluxo**. A lista de perguntas permanece na aba **Perguntas**, evitando que os controles do formulário ocupem a mesma área dos caminhos.

## Como usar

1. Abra **Nova pesquisa** ou edite um rascunho e avance até **Formulário**.
2. Crie todas as perguntas na aba **Perguntas**.
3. Abra a aba **Mapa do fluxo**.
4. Arraste os balões para posicioná-los no local desejado.
5. Em uma pergunta de escolha única, arraste o ponto azul ao lado de uma resposta até o balão da pergunta posterior que deve ser exibida.
6. Repita o procedimento para criar dois, três, quatro ou mais caminhos na mesma pergunta. Cada resposta pode ter seu próprio destino.
7. Se preferir, use o seletor exibido dentro de cada resposta para escolher o destino sem arrastar.
8. Use **Organizar automaticamente** para reorganizar os balões ou **Limpar caminhos** para remover as conexões condicionais.
9. Salve a pesquisa pelo fluxo normal do sistema.

As conexões continuam obedecendo à regra de segurança da v189: uma resposta só pode apontar para uma pergunta posterior ou para o encerramento da entrevista. Isso evita loops e mantém a auditoria do questionário previsível.

## SQL

Não há SQL novo na v193. A posição dos balões é armazenada no mesmo campo `survey_questions.logic_jsonb` criado pelo arquivo `deploy/caminhos-condicionais-v189.sql`. Portanto, é necessário executar a migration v189 uma única vez no Supabase, caso ainda não tenha sido executada. Depois disso, a v193 salva as posições e os caminhos no próprio JSON da pergunta.

Nenhum dado de coleta, resposta, usuário, pagamento ou pesquisa é apagado pela v193.
