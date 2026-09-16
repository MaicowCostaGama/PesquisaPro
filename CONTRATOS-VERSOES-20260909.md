# Versões do contrato-quadro

A tela **Contratos** mantém o histórico das assinaturas por versão. Quando a versão vigente já foi assinada pela CONTRATANTE, o cartão verde não é clicável e o formulário fica oculto para evitar uma segunda assinatura do mesmo documento.

Um administrador pode clicar em **Criar nova versão para assinatura**, informar uma versão como `v2-2026` e confirmar. A versão anterior permanece registrada em `company_contract_signatures` e `researcher_contracts`; nenhuma assinatura é apagada. A nova versão passa a ser a vigente, fica pendente da assinatura da CONTRATANTE e exige nova concordância individual dos pesquisadores antes da coleta.

A versão vigente é compartilhada por todos os perfis por meio da tabela `contract_settings` e das RPCs `get_current_contract_version` e `create_contract_version`. Execute `deploy/contratos-versoes.sql` no SQL Editor do Supabase antes de usar o botão. O resultado esperado é **Success. No rows returned**.

A criação de nova versão não substitui a assinatura pessoal de cada pesquisador e não autoriza o administrador a assinar em nome dos pesquisadores.
