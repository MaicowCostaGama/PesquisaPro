# Exclusão de pesquisador com histórico de coleta

O botão **Excluir** do painel não conseguia remover pesquisadores que possuíam registros em `collection_events`, porque a chave estrangeira mantinha o comportamento padrão de bloqueio (`restrict`).

A correção altera essa relação para `ON DELETE SET NULL`. Assim, ao excluir o perfil, as entrevistas, respostas, localização, status e dados necessários para auditoria permanecem no banco, mas o campo `researcher_id` do evento fica nulo. Os vínculos operacionais dependentes do perfil continuam seguindo as regras já existentes do schema.

## Aplicação no Supabase

Executar uma vez no SQL Editor o arquivo `deploy/exclusao-pesquisador-com-coletas.sql`. A migration é transacional e recria a constraint `collection_events_researcher_id_fkey` com `ON DELETE SET NULL`.

Em seguida, executar `deploy/exclusao-pesquisador-pagamentos.sql`. Essa segunda migration torna `payments.researcher_id` anulável, preserva o resumo financeiro e ajusta o gatilho para não recriar pagamentos durante a remoção do perfil.

Antes da execução, não é necessário apagar eventos ou pagamentos manualmente. Depois de cada mensagem **Success. No rows returned**, o administrador poderá excluir o pesquisador pelo painel.

## Segurança e auditoria

As alterações não liberam acesso adicional nem removem eventos ou resumos financeiros. Elas apenas removem o vínculo de identidade do perfil, mantendo o histórico para auditoria. O painel identifica os bloqueios antigos de coleta e financeiro e informa o nome exato da migration que ainda faltar executar.
