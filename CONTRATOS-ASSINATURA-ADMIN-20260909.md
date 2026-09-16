# Assinatura administrativa dos contratos

A tela **Contratos** usa um contrato-quadro por versão. O administrador autorizado assina uma única vez em nome da CONTRATANTE, e essa assinatura passa a aparecer para todos os pesquisadores que assinarem a mesma versão. Não é necessário registrar uma assinatura repetida para cada pesquisador.

O botão **Assinar todos os contratos pela CONTRATANTE** exige nome, cargo/função e confirmação explícita. O registro é feito pela RPC `public.sign_company_contract`, que usa `auth.uid()` para vincular o administrador autenticado, verifica `public.is_admin()` e impede duplicidade por `contract_version`.

A assinatura do pesquisador continua sendo pessoal e individual. O lote administrativo não substitui a declaração de concordância de cada pesquisador.

## Aplicação no Supabase

Execute `deploy/contratos-assinatura-admin.sql` no SQL Editor do projeto APPesquisa. A migration é aditiva, não apaga assinaturas e devolve a assinatura existente se a versão já tiver sido registrada. O resultado esperado é **Success. No rows returned**.

Depois, atualize o painel, abra **Contratos**, preencha o nome e o cargo do administrador, marque a autorização e clique em **Assinar todos os contratos pela CONTRATANTE**.
