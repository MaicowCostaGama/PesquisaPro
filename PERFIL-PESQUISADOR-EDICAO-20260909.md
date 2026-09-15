# Perfil do pesquisador — edição própria

O painel do pesquisador agora possui a opção **Meus dados**. Nessa tela, o usuário pode corrigir o próprio nome, data de nascimento, celular, cidade onde mora, endereço, CEP, cidades de atuação e dados de pagamento.

O pesquisador precisa manter pelo menos uma cidade de atuação e pode selecionar no máximo cinco cidades de qualquer estado do Brasil. A lista usa `public-cities.js`, baseada na relação nacional de municípios usada pelo autocadastro.

O PIX é opcional. A chave, banco, documento do titular, agência e conta podem ser deixados vazios e informados posteriormente. O formulário administrativo também não bloqueia mais a gravação quando o PIX não estiver preenchido.

Por segurança, CPF, e-mail, status, aprovação, documentos oficiais e demais campos administrativos aparecem como somente leitura ou permanecem sob controle da gestão. O pesquisador não pode editar seu papel, aprovação, vínculo com pesquisas ou documentos de validação.

## Persistência e segurança

A migration `deploy/perfil-pesquisador-edicao.sql` cria a RPC `update_my_researcher_profile`, que valida `auth.uid()`, confirma que a sessão pertence a um pesquisador, limita as cidades a uma a cinco e atualiza apenas os campos permitidos. A mesma migration ativa RLS em `profile_cidades_atuacao`, permitindo que o pesquisador leia e altere somente suas próprias cidades e que a gestão mantenha o gerenciamento administrativo.

A função é `security definer`, não armazena senha e não permite a alteração de CPF, e-mail, status, aprovação ou documentos. A migration é idempotente e não remove cadastros existentes.

## Implantação

Execute a migration no SQL Editor do Supabase depois do código publicado. O resultado esperado é **“Success. No rows returned”**. Em seguida, atualize o painel com `Ctrl + Shift + R`, entre no perfil de pesquisador e abra **Meus dados**.
