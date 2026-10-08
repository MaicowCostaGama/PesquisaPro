# PesquisaPro v136 — indicadores numéricos no menu da gestão

## O que aparece

Na barra lateral, os perfis **Administrador** e **ADM PesquisaPro** veem contadores em **Contratos**, **Comunicação** e **Usuários**. Coordenador e gerente veem somente o contador de **Comunicação**, que é a aba disponível para esses perfis. Pesquisadores e clientes não veem contadores administrativos.

| Botão | Quando soma 1 | Quando deixa de somar |
| --- | --- | --- |
| Contratos | Cada pesquisador **ativo** sem registro de assinatura para a **versão vigente**; soma também 1 se faltar a assinatura da contratante para essa versão. | Quando a assinatura respectiva é registrada; uma nova versão torna a assinatura anterior histórica, e a pendência reabre. |
| Comunicação | Cada **conversa privada de atendimento** não arquivada em que a última mensagem foi enviada pelo cliente/pesquisador. Várias mensagens seguidas no mesmo canal contam como 1. | Quando alguém da gestão responde no mesmo canal ou o canal é arquivado. Somente marcar a mensagem como lida **não** equivale a responder. |
| Usuários | Cada perfil com status `pendente` e cada autocadastro `novo` ou `diligencia` ainda sem perfil aprovado. | Após aprovação ou reprovação; solicitações de diligência continuam em análise. Não conta duas vezes o mesmo candidato se já tiver perfil pendente vinculado. |

O marcador visual mostra até **99+**, mas o texto acessível e o título do botão apresentam o número inteiro. Se não houver pendência, o marcador desaparece. A contagem é agregada no servidor, sem trazer mensagens, nomes, CPF ou conteúdo de contratos para o menu.

## Atualização

Os números carregam ao entrar no app, são atualizados a cada **45 segundos** enquanto a aba está visível e quando o usuário retorna à aba após algum tempo. Enviar/receber mensagem no chat aberto e ações de aprovação/assinatura no próprio app invalidam o cache e antecipam a atualização. Mudanças feitas por outras sessões podem levar até 45 segundos para aparecer. Em falha de rede ou antes da migration, o badge fica oculto, sem mostrar contagem antiga como se fosse atual.

## Etapa manual no Supabase

**Ainda não executada por esta entrega.** O usuário autorizou a publicação do código, mas a execução do SQL permanece exclusivamente manual. No projeto correto do Supabase, abra **SQL Editor**, cole e execute **uma vez** o conteúdo completo de [`deploy/contadores-pendencias-menu.sql`](/home/ubuntu/PesquisaPro-remoto/deploy/contadores-pendencias-menu.sql). A migration cria apenas índice e RPC agregada com acesso autenticado e autorização de gestão; não exclui nem modifica dados operacionais. Ela pressupõe que as migrations anteriores de chat privado, versões/assinaturas de contratos e cadastro já estejam instaladas.

Para uma conferência técnica após executar, entre com perfil administrador e verifique a presença dos indicadores nas três abas; responda a uma conversa privada de teste e confira que o contador de Comunicação reduz após atualizar; use uma **conta de teste** antes de efetuar qualquer aprovação/assinatura real. Nenhum SQL é aplicado automaticamente pelo deploy do site.

**Limites:** a migração foi validada por parser PostgreSQL (`pglast`), porém não aplicada a um banco de produção neste desenvolvimento; testes automatizados usam dados fictícios e não atestam os números reais do Supabase. O contador de Comunicação não se aplica aos avisos unidirecionais de pesquisa; eles exigem confirmação de leitura antes da coleta em fluxo separado.
