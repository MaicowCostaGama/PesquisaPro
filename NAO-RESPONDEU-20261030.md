# Não respondeu — recusa explícita por pergunta

## Estado

Implementação preparada em cópia isolada do aplicativo. A publicação depende de autorização explícita e o SQL deve ser executado manualmente pelo administrador no Supabase. Nenhum código deste recurso executa migrations automaticamente.

## O que muda

O pesquisador pode registrar que o entrevistado preferiu não responder uma pergunta habilitada pela administração e continuar a entrevista. O registro recebe `value_text = 'Não respondeu'`, `value_number = null` e uma marca própria de não resposta. Não é atribuído um zero, nota, alternativa de escolha ou posição de ranking artificial.

A entrevista concluída continua sendo uma entrevista oficial, sujeita às regras normais de login, localização, orientações, vídeo, duração, áudio e auditoria. A recusa isolada, quando autorizada, não é resposta faltante para a avaliação do pesquisador. As demais causas legítimas de reprovação e sinalização continuam em vigor.

Não confundir com **desistência**: na desistência o entrevistado para a entrevista e a ocorrência é neutra, fora das métricas oficiais; em **Não respondeu**, ele recusa uma pergunta e continua.

## Instalação

1. Execute manualmente `nao-respondeu-pergunta-20261030.sql` no SQL Editor do Supabase, como administrador do projeto. O arquivo é aditivo e contém uma conferência final da instalação.
2. Confirme que a execução concluiu sem erro.
3. Autorize a publicação dos arquivos do aplicativo. O SQL e os testes PostgreSQL locais ficam fora da publicação no GitHub/Vercel.
4. Após a publicação, reabra o aplicativo para carregar o novo código. As permissões começam desabilitadas em todas as perguntas existentes.

## Caminho do administrador

**Coleta e campo → abrir a pesquisa → Configurar “Não respondeu”.**

Também existe acesso na etapa **Formulário**, em cada pergunta já salva: **Configurar “Não respondeu” nesta pergunta**. Perguntas novas precisam ser salvas antes.

Marque a habilitação nas perguntas pertinentes e confirme. A alteração é salva imediatamente, em uma chamada específica de configuração. Não precisa clicar em “Salvar alterações” do editor completo: essa chamada não apaga nem reinsere as opções, inclusive nas listas importadas do Excel.

Perguntas de região, cotas e caminhos condicionais/encerramento são protegidas. Não resposta não deve ser usada para contornar a elegibilidade do entrevistado. A aplicação não tenta deduzir regras de triagem pelo texto: a administração continua responsável por habilitar somente as perguntas apropriadas.

Após configurar, oriente a equipe a reabrir o aplicativo **antes da próxima entrevista**, sem interromper uma entrevista em andamento.

## Caminho do pesquisador

Durante a entrevista, na pergunta habilitada:

1. Toque em **Não respondeu**.
2. Confirme que o entrevistado preferiu não responder.
3. Continue as próximas perguntas e finalize normalmente.

A seleção substitui a resposta local daquela pergunta e é exclusiva: não pode coexistir com alternativas normais de múltipla escolha. Antes do envio, o botão **Responder esta pergunta** desfaz a marca e permite preencher uma resposta real. Nas perguntas de duas respostas, a recusa se aplica aos dois subcampos.

## Resultados e histórico

“Não respondeu” aparece como categoria nos resultados, percentuais, exportação Excel e cruzamentos que incluem essa pergunta, respeitando a base/denominador já adotado pelo relatório. Não entra como valor zero em número, moeda, escala ou NPS. Não recebe posição artificial em ranking de alternativas.

O recurso não muda respostas já coletadas nem converte campos antigos em branco. PDFs já publicados e bases de tabulação congeladas não são regenerados automaticamente. Para análises com uma cópia antiga de tabulação, use a fonte original atual ou atualize a base conforme o fluxo existente.

A permissão é verificada no banco antes de criar o evento que declara as recusas. A autorização daquele envio é preservada no evento, para não invalidar as respostas se a configuração for desabilitada segundos depois. Uma configuração desabilitada antes do envio é rejeitada pelo servidor e deve ser corrigida no formulário antes de tentar novamente.

## Validação e limites

Validação com dados fictícios em navegador local de celular e desktop, testes do módulo real, cruzamentos/Excel e PostgreSQL temporário. Nenhuma consulta de escrita foi realizada na produção. A instalação real e o teste do perfil autenticado devem ser conferidos após aplicação manual e publicação.

O sistema já separava a gravação do evento da gravação das respostas; esta implementação não refatora todo o envio em uma única transação. As proteções específicas de não resposta impedem a aceitação de uma permissão ausente/forjada e a mistura de recusa com alternativas normais. Falhas de rede entre as etapas continuam exigindo acompanhamento conforme os avisos existentes do aplicativo.
