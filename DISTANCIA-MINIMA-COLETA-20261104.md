# Distância mínima entre coletas por pesquisa

## O que muda

Cada pesquisa passa a ter sua própria distância mínima entre coletas. A regra compara a nova coleta com **todas as coletas válidas da mesma pesquisa, feitas por qualquer pesquisador da equipe**. Pesquisas diferentes não se afetam.

Coletas reprovadas, entrevistas de calibração/teste e registros sem coordenadas não entram na comparação. O GPS continua obrigatório e a localização e a abrangência da pesquisa continuam sendo validadas. O perfil `Adm Pesquisador PesquisaPro` permanece classificado como teste/calibração e continua fora do georreferenciamento, cotas, pagamentos, rankings e resultados oficiais, conforme a migration de isolamento já aplicada.

## Onde configurar

- **Nova pesquisa:** no mesmo passo do formulário em que se configura o tempo mínimo.
- **Pesquisa existente:** em **Auditoria**, dentro do bloco de regras de qualidade da coleta.

Informe um número inteiro entre **0 e 10.000 metros**. Pesquisas existentes e novas usam **15 metros** por padrão. Use **0** para desativar apenas a trava de distância naquela pesquisa.

Alterar o limite não reprocessa nem apaga entrevistas antigas; a regra vale para as próximas tentativas de iniciar e registrar coletas.

## Validação e corridas

O aplicativo verifica a regra ao iniciar. O banco também verifica ao gravar uma entrevista válida, para impedir que duas coletas próximas feitas quase simultaneamente passem juntas. Em um caso simultâneo, uma entrevista pode ser interrompida somente no envio, se outra coleta válida tiver sido registrada primeiro. Coletas noturnas pendentes são verificadas novamente quando a confirmação gravada é anexada. Se houver conflito de distância, a gravação permanece anexada e o evento é preservado como reprovado para auditoria; a exigência de gravação após 21h permanece intacta.

Uma entrevista abaixo do tempo mínimo segue a validação atual de duração e pode ser reprovada por esse motivo; a nova trava de distância não substitui essa regra. Coletas sem duração informada não podem ignorar a distância. O usuário de teste autorizado mantém GPS, mas sua calibração não bloqueia nem entra na distância oficial.

## Aplicação

1. A migration deve ser aplicada manualmente no **Supabase → SQL Editor** por alguém autorizado. Ela é aditiva e não apaga pesquisas, entrevistas, respostas ou pagamentos.
2. Depois da aplicação do SQL, publique a versão correspondente do frontend para exibir e salvar os campos e validar no início. A consulta final da migration confirma a coluna, as RPCs, o helper e o índice instalados.
3. Após a publicação, confira em uma pesquisa de teste: defina uma distância, salve e confirme que o valor permanece na Auditoria depois de recarregar. Faça a validação com pontos fictícios em uma pesquisa segura, não com entrevistas oficiais.

A migration exige que as migrações atuais de tempo mínimo, modo de testador e isolamento das coletas de teste estejam instaladas. Ela confirma a presença dessas dependências antes de efetivar alterações e pode ser reexecutada sem duplicar coluna, índice ou constraint.

## Observação sobre o contrato

O texto do contrato-quadro atualmente menciona a regra antiga de 15 m por pesquisador. Não alterei essa cláusula nesta implementação: mudar o contrato exige uma nova versão contratual e pode solicitar novas assinaturas. A configuração operacional e as orientações da pesquisa passam a usar o limite atualizado. Se quiser, o contrato pode ser revisado em uma etapa separada, com confirmação antes de criar uma nova versão.
