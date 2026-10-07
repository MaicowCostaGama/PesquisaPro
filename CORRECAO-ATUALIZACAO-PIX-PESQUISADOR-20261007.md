# Correção da atualização da chave PIX do pesquisador

## O que acontecia

A área **Meus ganhos** tentava alterar `profiles.pix_key` e `profiles.pix_bank` diretamente pelo navegador. Dependendo das policies/RLS instaladas no Supabase, essa atualização podia ser recusada ou não persistir, enquanto o estado visual local aparentava ter sido salvo.

## Correção aplicada

O botão **Salvar dados** agora chama a função protegida:

```text
update_my_researcher_payment_data(p_pix_key, p_pix_bank)
```

A função:

- aceita somente a sessão autenticada;
- confirma que a sessão pertence a um perfil com papel `pesq`;
- altera somente `pix_key` e `pix_bank` do próprio pesquisador;
- não altera CPF, e-mail, status, aprovação, pagamentos, recibos, coletas ou documentos;
- atualiza o estado visual do aplicativo somente depois da confirmação do banco.

O formulário **Meus dados** continua usando a RPC existente de edição completa do perfil, que também grava a chave PIX.

## Aplicação manual no Supabase

1. Abra o SQL Editor do projeto Supabase.
2. Copie o conteúdo de `deploy/corrigir-atualizacao-pix-pesquisador.sql`.
3. Execute uma única vez.
4. Saia e entre novamente no aplicativo, ou faça uma atualização completa da página.
5. Em **Meus ganhos**, altere a chave PIX e o banco e clique em **Salvar dados**.
6. Reabra a página para confirmar que o valor continua preenchido.

A migration é aditiva e não destrutiva. Ela não apaga nem altera históricos financeiros, pagamentos, comprovantes, coletas ou perfis.
