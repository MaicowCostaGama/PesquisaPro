# Senha no autocadastro de pesquisadores

O cadastro público de pesquisador agora solicita uma senha de acesso e sua confirmação. A senha é enviada diretamente ao Supabase Auth por `auth.signUp`; ela não é gravada na tabela `signups`, no perfil público, em migrations ou no JavaScript do aplicativo.

A migration `deploy/cadastro-pesquisador-senha.sql` acrescenta somente o vínculo `signups.auth_user_id`, valida que o UUID Auth pertence ao e-mail informado e substitui as assinaturas públicas antigas da RPC por uma assinatura que exige o UUID da conta criada. A migration é idempotente e não remove cadastros existentes.

Após o envio, o pesquisador recebe a confirmação do cadastro e, depois da aprovação administrativa, o perfil é vinculado à conta Auth que já possui a senha escolhida. Cadastros aprovados antigos sem conta Auth continuam sendo tratados pelo fluxo de reconciliação; nesse caso, o sistema cria uma conta temporária e envia um link para o pesquisador definir a senha.

O login possui a ação **Esqueci minha senha**, que chama `resetPasswordForEmail`. O pesquisador recebe um link por e-mail, define uma senha nova com pelo menos oito caracteres, confirma a senha e retorna ao login. Esse mesmo fluxo atende pesquisadores antigos, clientes, equipe administrativa e demais perfis que já possuam e-mail cadastrado.

Nenhuma migration de senhas existentes é necessária. Os usuários continuam com suas credenciais atuais; a recuperação por e-mail é a forma segura de criar ou substituir uma senha quando necessário. Para produção, o Supabase deve autorizar os redirecionamentos usados pelo aplicativo em **Authentication → URL Configuration → Redirect URLs**.
