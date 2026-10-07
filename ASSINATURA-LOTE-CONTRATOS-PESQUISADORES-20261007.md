# Assinatura em lote de contratos pendentes

## O que foi implementado

Na tela **Contratos**, o administrador verá, acima da tabela de pesquisadores, o botão:

> **Assinar todos os N pendentes**

O número corresponde aos pesquisadores ativos que ainda não possuem assinatura na versão vigente do contrato.

## Segurança e auditoria

- O botão aparece somente para `admin` e `admpro`.
- Antes de iniciar, o sistema pede confirmação explícita informando a quantidade e a versão do contrato.
- O lote assina apenas pesquisadores ativos sem assinatura na versão atual.
- Contratos já assinados não são alterados.
- Cada assinatura usa a RPC existente `admin_sign_researcher_contract`, mantendo o registro individual do pesquisador, administrador, data, IP quando disponível, agente do navegador e hash do texto do contrato.
- O progresso aparece no botão, por exemplo: `Assinando 37/165…`.
- Se algum item falhar, o sistema informa quantos foram concluídos e lista os primeiros erros para correção.

## Supabase

Não é necessária uma migration nova para esta função. O botão reutiliza a RPC já criada pela migration:

```text
deploy/assinatura-admin-pesquisador.sql
```

Essa migration precisa estar aplicada no Supabase para que a assinatura individual e a assinatura em lote funcionem.

## Como usar

1. Acesse **Contratos** com um perfil administrador.
2. Confira a versão vigente e a quantidade de pendentes.
3. Clique em **Assinar todos os N pendentes**.
4. Revise a confirmação e clique em **OK**.
5. Aguarde o progresso terminar.
6. Verifique a tabela e o contador **Já assinaram**.

A ação representa uma assinatura administrativa em nome dos pesquisadores e deve ser usada somente quando o administrador estiver autorizado a fazê-lo.
