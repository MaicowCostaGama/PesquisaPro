# Comissões comerciais — atualização 2026-08-30

## Regras aprovadas

A comissão é calculada sobre o valor total da proposta aceita. Quando a proposta passa para o estado `aceita`, o banco cria ou atualiza os lançamentos de comissão como `a_receber`.

O vendedor possui dois percentuais no cadastro: a comissão padrão e a comissão específica quando a oportunidade também possui um indicador. A migration garante que o percentual com indicador não seja maior que o percentual padrão.

O indicador possui seu próprio percentual e recebe uma comissão independente quando a indicação converte em venda. Quando há vendedor e indicador na mesma oportunidade, são criados dois lançamentos separados, cada um com o percentual do seu perfil.

## Estados financeiros

Os lançamentos podem estar em `a_receber`, `aprovada`, `paga` ou `cancelada`. A gestão pode atualizar o estado. A data de pagamento é gravada quando o estado muda para `paga`.

## Visões por perfil

Administradores e perfis de gestão visualizam o funil completo e uma lista administrativa das comissões, com alteração de status. O vendedor vê apenas suas oportunidades, sua taxa, suas vendas ganhas e suas comissões. O indicador vê apenas as indicações próprias, o estágio de cada indicação e as comissões geradas; não cria propostas nem altera o estágio da negociação.

## Segurança

A migration adiciona `commission_rate`, `commission_rate_with_indicator` e `indicator_id`, cria `commercial_commissions` com vínculo único por oportunidade, parceiro e papel, gera os lançamentos por trigger após aceite de proposta e aplica RLS para que parceiros consultem apenas suas próprias comissões e indicações.
