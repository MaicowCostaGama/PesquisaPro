# Tempo mínimo na formulação da pesquisa — v209

A formulação da pesquisa agora apresenta, no passo **Formulário**, o tempo mínimo sugerido para a auditoria. O cálculo considera as perguntas que possuem enunciado, o tipo de cada pergunta, a quantidade de opções quando aplicável e a dificuldade escolhida pela gestão de 1 (fácil) a 5 (muito difícil).

## Como usar

1. Abra **Nova pesquisa** ou edite uma pesquisa em elaboração.
2. Entre no passo **Formulário**.
3. Defina a dificuldade de cada pergunta.
4. Confira o cartão **Tempo mínimo sugerido para a entrevista**.
5. Deixe o campo manual vazio para usar a sugestão automática ou informe um número inteiro entre **30 e 3600 segundos** para aplicar um ajuste específico.
6. Avance normalmente e, no passo **Revisão**, confirme a regra exibida como automática ou manual.
7. Salve a pesquisa. O valor manual, quando preenchido, é salvo em `surveys.minimum_collection_seconds`; a dificuldade é salva em `survey_questions.difficulty`.

A sugestão é recalculada enquanto o gestor edita o texto, a dificuldade e as opções das perguntas. A duração efetiva é arredondada para blocos de cinco segundos e limitada entre 30 segundos e 1 hora.

## Banco de dados

A aplicação já possui a migration manual `deploy/tempo-minimo-coleta-auditoria.sql`. Ela deve ser executada pelo administrador no SQL Editor do Supabase para que a regra seja aplicada também no servidor. Sem essa migration, a interface pode mostrar a sugestão local, mas a rejeição automática de coletas abaixo do mínimo não estará protegida no banco.

A migration é aditiva: não apaga pesquisas, perguntas, coletas, respostas ou pagamentos. A regra é aplicada somente a novas inserções de coletas válidas; registros antigos não são reprocessados.
