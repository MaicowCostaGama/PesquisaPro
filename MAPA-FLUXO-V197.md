# PesquisaPro v197 — linhas editáveis no mapa de fluxo

A v197 transforma as linhas do **Mapa do fluxo** em elementos editáveis. Além de arrastar os balões, é possível selecionar e alterar as próprias conexões.

## Como criar uma linha

1. Abra **Nova pesquisa** ou edite uma pesquisa em elaboração.
2. Avance até **Formulário** e entre na aba **Mapa do fluxo**.
3. Abra **Configurar conexões**.
4. Para uma conexão direta, arraste a porta verde da pergunta até outro balão.
5. Para uma conexão por resposta, arraste a porta azul da alternativa até o balão de destino.
6. Também é possível usar os seletores no painel de conexões.

## Como mudar uma linha

- Clique ou arraste a própria linha azul ou verde.
- A linha fica selecionada e sua alça final aparece destacada.
- Arraste a linha ou a alça final até outro balão.
- O destino é substituído somente quando o novo balão é uma pergunta posterior.
- O balão **Fim da entrevista** também pode ser usado como destino.

## Como remover uma linha

Selecione a linha e clique em **Remover linha**. Também é possível focar a área do mapa e pressionar **Delete** ou **Backspace**. O botão **Limpar conexões** continua disponível para remover todos os caminhos de uma vez.

## Regras de segurança

O sistema não permite conectar uma pergunta a ela mesma, criar loops ou apontar para uma pergunta anterior. Uma conexão específica por resposta continua tendo prioridade sobre a conexão direta da mesma pergunta.

## SQL

Não há SQL novo na v197. A funcionalidade usa o campo `survey_questions.logic_jsonb` criado pela migration `deploy/caminhos-condicionais-v189.sql`. Se essa migration já foi executada, não é necessário executar outro SQL.

Nenhum dado de coleta, resposta, usuário, pagamento ou pesquisa é apagado pela v197.
