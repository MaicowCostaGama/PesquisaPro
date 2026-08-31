# Privacidade no cadastro por recrutador

A página pública `cadastro.html?recrutador=CODIGO` valida silenciosamente o código do recrutador pela RPC `recruiter_public_info`, mas não exibe seu nome, avatar ou a mensagem de indicação ao candidato.

No envio, o formulário continua transmitindo `p_recruiter_code` para `submit_recruiter_signup`. O Supabase preserva a atribuição para o ranking, a aprovação do cadastro e o valor por captação.

A alteração é somente de apresentação e privacidade da página pública. O fluxo administrativo e o rastreamento interno permanecem inalterados.
