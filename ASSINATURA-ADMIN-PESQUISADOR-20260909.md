# Assinatura administrativa por pesquisador

Na tabela **Pesquisadores** da tela **Contratos**, cada cadastro com status **Aguardando assinatura** exibe o botão **Assinar**. O botão aparece somente para `admin` e `admpro`.

Ao clicar, o administrador confirma explicitamente que está registrando a assinatura administrativa daquele pesquisador na versão vigente. A ação é gravada pela RPC `admin_sign_researcher_contract`, vinculada ao administrador autenticado, com versão, data/hora, hash do texto apresentado, origem `admin` e `signed_by_admin`.

A operação é idempotente por pesquisador e versão: se já existir uma assinatura, a RPC devolve o registro existente e não cria duplicidade. A assinatura da CONTRATANTE permanece separada no cartão superior.

## Aplicação no Supabase

Execute `deploy/assinatura-admin-pesquisador.sql` no SQL Editor. A migration adiciona somente os campos de auditoria e a RPC protegida; não apaga contratos existentes. O resultado esperado é **Success. No rows returned**.

> Observação de governança: a ação registra uma assinatura administrativa em nome do pesquisador. O uso deve seguir a autorização e os procedimentos jurídicos definidos pela PesquisaPro.
