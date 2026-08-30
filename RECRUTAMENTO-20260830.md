# Recrutamento — PesquisaPro

## Fluxo

O administrador ou ADM PesquisaPro cadastra um perfil com o papel **Recrutador** em **Usuários → Recrutadores** e informa o valor por pesquisador captado. O sistema gera um código exclusivo e um link público no formato `cadastro.html?recrutador=CODIGO`.

A aba **Recrutamento** exibe o link, QR Code, botão para compartilhar no WhatsApp e o ranking de captação. O ranking prioriza pesquisadores aprovados e depois o volume total de cadastros.

## Cadastro público

A pessoa acessa o link, confirma o nome do recrutador e preenche os dados básicos. A RPC `submit_recruiter_signup` valida o código do recrutador ativo e grava o cadastro com `recruiter_id`, `recruiter_code` e `recruiter_capture_value`. O cadastro continua sujeito à análise administrativa.

## Reconhecimento

O trigger `recruiter_capture_sync` espelha cada cadastro em `recruiter_captures`. O valor fica **Pendente** enquanto o cadastro aguarda análise, muda para **A receber** após aprovação e pode ser marcado como **Paga** ou **Cancelada** pelo administrador. A migration também faz reconciliação idempotente de cadastros antigos que já possuam recrutador de origem.

## Permissões

Administradores e ADM PesquisaPro visualizam o ranking completo, perfis, cadastros e valores. O recrutador visualiza somente o próprio link e as próprias captações. O cadastro público não recebe acesso de leitura às tabelas: usa somente as RPCs públicas com validação do código.

## WhatsApp sem API

Como a conta possui apenas o número Business, a notificação interna abre o WhatsApp com uma mensagem pré-preenchida para `+55 39 96668-3030`; o envio final depende do clique da pessoa em **Enviar**. A integração pode ser trocada posteriormente por uma API oficial sem mudar o rastreamento.

## Implantação

1. Publicar os arquivos do aplicativo.
2. Executar `deploy/recrutamento.sql` no SQL Editor do projeto Supabase.
3. Atualizar o painel e cadastrar os primeiros recrutadores.
4. Compartilhar o link ou QR Code de cada recrutador.
