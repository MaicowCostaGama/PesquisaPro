# Recuperação de senha por e-mail

O fluxo de recuperação dos pesquisadores usa o Supabase Auth. O pesquisador informa o e-mail na tela de login, recebe um link e retorna ao endereço canônico `app.html?redefinir-senha=1`, onde cria uma nova senha com pelo menos oito caracteres.

A implementação trata os dois formatos usados pelo Supabase: código PKCE na query string e `access_token`/`refresh_token` no fragmento da URL. A sessão temporária é preparada antes da tela de nova senha e a senha é atualizada com `supabase.auth.updateUser({ password })`. Nenhuma senha é armazenada na tabela de perfis ou no cadastro.

## Configuração no Supabase

No painel do projeto APPesquisa, abra **Authentication → URL Configuration** e confirme:

| Campo | Valor recomendado |
|---|---|
| Site URL | `https://www.pesquisa-pro.com` |
| Redirect URL | `https://www.pesquisa-pro.com/app.html` |
| Redirect URL de recuperação | `https://www.pesquisa-pro.com/app.html?redefinir-senha=1` |
| Domínio sem www, se usado | `https://pesquisa-pro.com/app.html` e a variante com `?redefinir-senha=1` |

O e-mail deve usar o template padrão de recuperação do Supabase ou um template que mantenha o link `{{ .ConfirmationURL }}`. Não substitua o link por uma URL fixa diferente do domínio autorizado.

## Teste

1. Abra `https://www.pesquisa-pro.com/app.html`.
2. Informe o e-mail de um pesquisador existente.
3. Clique em **Esqueci minha senha**.
4. Abra o e-mail no mesmo navegador, de preferência sem remover a parte final do link.
5. Confirme que aparece **Criar nova senha**.
6. Informe duas vezes uma senha com pelo menos oito caracteres e salve.
7. Entre novamente com o e-mail e a nova senha.

Se o link informar que expirou ou não está autorizado, gere um novo link e confira se o endereço de retorno está cadastrado em **Redirect URLs**. O ajuste não apaga usuários existentes nem altera suas senhas até que o próprio usuário conclua a redefinição.
