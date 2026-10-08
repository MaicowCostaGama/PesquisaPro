# Contagem de pesquisadores e cadastros indicados — v139

## Diagnóstico

A aba **Recrutamento** e a aba **Usuários** medem entidades diferentes:

- **Recrutamento** contabiliza cadastros na tabela `signups` associados a um `recruiter_id`/`recruiter_code`. Esses registros podem gerar uma captação para o recrutador.
- **Usuários** contabiliza perfis já criados na tabela `profiles`.
- **Indicações feitas por pesquisadores** usam `researcher_referral_id` e a tabela `researcher_referrals`. Esse fluxo não preenche `recruiter_id` e, portanto, não deve criar captação para 99jobs nem para outro recrutador.
- Um registro em **Link enviado** ainda não é cadastro e não entra no total de pessoas cadastradas.

Por isso, os números não devem ser somados como se fossem a mesma lista. Uma indicação pode aparecer no painel de indicações, virar um cadastro pendente e depois virar um único perfil aprovado.

## Correção aplicada localmente

Na aba **Usuários > Pesquisadores**, o total agora representa:

> perfis de pesquisadores visíveis + cadastros recebidos que ainda não possuem perfil

A contagem deduplica por:

1. `approved_profile_id` ou `auth_user_id`; e
2. e-mail normalizado, como proteção adicional contra duplicidade.

Também foram ajustados:

- o número exibido no contexto da aba;
- o badge da aba **Pesquisadores**;
- o cartão principal, agora chamado **Pesquisadores e cadastros**;
- o cartão **Aguardando análise**, que inclui cadastros pendentes e cadastros aprovados sem perfil vinculado (órfãos), caso existam.

## Exemplo do caso informado

Se houver **202 perfis de pesquisadores** e **3 cadastros recebidos aguardando análise**, o total esperado no fluxo será **205**, desde que os três cadastros não correspondam a e-mails ou IDs já presentes nos 202 perfis.

## Sobre os 199 cadastros do Recrutamento

Os 199 cadastros da tela de recrutamento não significam automaticamente 199 novos usuários, porque:

- alguns podem ainda estar apenas em `signups` e sem perfil aprovado;
- alguns podem já ter sido convertidos em perfis;
- cadastros indicados por pesquisadores não devem ser atribuídos ao recrutador 99jobs, salvo se a pessoa tiver efetivamente preenchido o cadastro usando o link/código do 99jobs;
- o painel de indicações pode conter tentativas ou links enviados que ainda não viraram cadastro.

A correção não altera captações, pagamentos, perfis ou vínculos no banco. Ela apenas torna a apresentação do total mais coerente e impede duplicação visual.

## Validação

- `node --check app.js`
- `node researcher-user-count-smoke-test.js`
- teste confirma que indicação usa `researcher_referral_id` e não cria `recruiter_id`;
- nenhum SQL foi aplicado e nenhuma publicação foi feita nesta versão local.
