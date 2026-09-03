# Exclusão de pesquisador com histórico de coleta

O botão **Excluir** do painel não conseguia remover pesquisadores que possuíam registros em `collection_events`, porque a chave estrangeira mantinha o comportamento padrão de bloqueio (`restrict`).

A correção altera essa relação para `ON DELETE SET NULL`. Assim, ao excluir o perfil, as entrevistas, respostas, localização, status e dados necessários para auditoria permanecem no banco, mas o campo `researcher_id` do evento fica nulo. Os vínculos operacionais dependentes do perfil continuam seguindo as regras já existentes do schema.

## Aplicação no Supabase

Executar uma vez no SQL Editor o arquivo `deploy/exclusao-pesquisador-com-coletas.sql`. A migration é transacional e recria a constraint `collection_events_researcher_id_fkey` com `ON DELETE SET NULL`.

Antes da execução, não é necessário apagar eventos manualmente. Depois da mensagem **Success. No rows returned**, o administrador poderá excluir o pesquisador pelo painel.

## Segurança e auditoria

A alteração não libera acesso adicional nem remove eventos de coleta. Ela apenas permite a remoção do perfil sem apagar o histórico da pesquisa. O painel também identifica o erro antigo e informa o nome exato da migration caso ela ainda não tenha sido executada.
