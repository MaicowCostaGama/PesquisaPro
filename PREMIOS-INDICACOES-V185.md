# Brindes por indicação — v185/v187

A v185 acrescenta campanhas de brindes para incentivar pesquisadores a indicar novos pesquisadores em cidades prioritárias.

## Como funciona

1. A gestão abre **Brindes por indicação** no menu administrativo.
2. O pesquisador encontra **Campanhas de brindes** no menu lateral, dentro de **Meu perfil**, e pode abrir a página sem acessar dados de outros participantes.
3. Cria uma campanha informando nome, descrição do brinde, cidades-alvo, início, término e quantidade de ganhadores.
4. Durante o período, o pesquisador continua usando **Meus dados → Indicar outra pessoa para ser pesquisador**.
5. Uma indicação só entra na campanha quando a pessoa indicada:
   - conclui o cadastro pelo link individual;
   - é aprovada pela gestão;
   - possui perfil de pesquisador ativo;
   - está vinculada à indicação;
   - corresponde a uma cidade-alvo pela cidade informada na indicação, cidade do perfil ou cidade de atuação.
6. Cada novo pesquisador indicado vale uma única entrada naquela campanha. A mesma pessoa não gera várias chances por duplicidade.
7. Depois do horário final, a gestão abre **Ver elegíveis** e usa **Sortear ganhadores**.
8. O banco grava a lista de elegíveis, a posição dos ganhadores, a semente aleatória, o compromisso SHA-256 e o resultado. O sorteio não é feito pelo navegador.

A participação não altera ranking, pagamentos, contratos, coletas, respostas ou convites. A funcionalidade apenas cria e audita campanhas de incentivo.

## SQL manual no Supabase

Execute primeiro, se ainda não estiver instalado:

```text
deploy/indicacao-pesquisador.sql
```

Depois execute:

```text
deploy/premios-indicacoes-pesquisadores.sql
```

A migration é aditiva e não exclui dados. Ela cria somente as tabelas, índices, políticas e RPCs do sorteio. Não há Edge Function nem segredo para configurar.

## Auditoria

Para campanhas sorteadas, a gestão pode consultar o **Compromisso** e a **Semente** exibidos em **Ver resultado**. O compromisso é calculado antes da seleção final como SHA-256 da semente junto ao identificador da campanha. A ordenação dos hashes de seleção determina os ganhadores, sem depender da ordem de cadastro.

Os pesquisadores veem apenas suas próprias entradas e eventual posição de ganhador; não recebem a lista privada de outros participantes.

## Validação local

Foram validados:

- sintaxe de `app.js` e `referral-rewards.js`;
- smoke test de campanhas, cidades, elegibilidade, RLS, RPCs e auditoria;
- compatibilidade com indicações, recrutamento, mensagens obrigatórias e Push existentes;
- ausência de comandos destrutivos na migration.

A v185 está preparada localmente, mas a migration SQL ainda deve ser executada manualmente no Supabase e o código ainda precisa de publicação autorizada no GitHub/Vercel.
