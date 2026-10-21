# PesquisaPro v189 — caminhos condicionais com editor visual

A v189 adiciona um **Editor de Fluxo Visual** ao passo **Formulário** de uma pesquisa. As perguntas continuam sendo criadas em sequência, mas cada resposta de uma pergunta de **Escolha única** pode apontar para uma pergunta posterior ou encerrar a entrevista.

## Como usar

1. Abra **Nova pesquisa** ou edite um rascunho.
2. No passo **Formulário**, crie as perguntas normalmente.
3. Em uma pergunta de escolha única, localize a área **Fluxo condicional**.
4. Para cada opção, escolha **Próxima pergunta (sequência normal)**, uma pergunta posterior ou **Encerrar entrevista**.
5. O bloco **Editor de Fluxo Visual** mostra os nós da pesquisa e as conexões configuradas.
6. Avance e salve a pesquisa normalmente.

O editor não permite apontar para uma pergunta anterior ou para a própria pergunta. Isso evita loops difíceis de auditar. Se uma pergunta ainda não foi respondida durante a coleta, a sequência permanece visível; o salto passa a valer assim que a escolha é feita. Perguntas que ficam fora do ramo escolhido não são obrigatórias e suas respostas antigas não são reenviadas.

## Migration manual obrigatória

Execute no SQL Editor do projeto Supabase correto o arquivo:

`deploy/caminhos-condicionais-v189.sql`

A migration apenas acrescenta `survey_questions.logic_jsonb` e preenche um valor vazio nas perguntas existentes. Ela não apaga pesquisas, respostas, coletas, usuários ou pagamentos. Se você configurar um caminho antes de executar o SQL, o aplicativo impedirá o salvamento da pesquisa e mostrará o caminho do arquivo necessário.

Depois de executar a migration, atualize a página com `Ctrl+F5` (ou feche e reabra o aplicativo). Não é necessário executar SQL novamente para cada pesquisa; a coluna passa a armazenar as regras de todos os formulários.

## Escopo atual

- Escolha única: suporta sequência normal, salto para pergunta posterior e encerramento.
- Escolha múltipla, ranking, escala e perguntas abertas: continuam seguindo a sequência normal; não recebem ramificações nesta versão.
- O editor usa os IDs reais das perguntas somente no momento de salvar, preservando a ordem visual e evitando referências quebradas.
