# Arquivamento de pesquisa — PesquisaPro — 06/10/2026

## O que foi corrigido

O botão **Excluir** foi substituído por **Arquivar**. A exclusão definitiva causava erro quando a pesquisa possuía pagamentos com comprovantes porque o banco protege o histórico financeiro.

Ao arquivar uma pesquisa:

- a pesquisa sai das listas operacionais de desenvolvimento e concluídas;
- deixa de aparecer no financeiro operacional e **não é contabilizada como financeiro pendente**;
- novas coletas, convites e entradas de equipe ficam bloqueados no banco;
- pesquisadores não recebem a pesquisa como disponível;
- coletas, respostas, auditoria, pagamentos, comprovantes, contratos, equipes, convites e arquivos privados são preservados;
- a gestão pode abrir **Pesquisas arquivadas** e usar **Restaurar**.

A restauração remove apenas a marca de arquivamento e mantém o status anterior, o histórico e os valores já registrados.

## Migration manual

O código foi preparado para a migration:

```text
deploy/arquivar-pesquisa.sql
```

Ela é **aditiva, transacional e não destrutiva**. Deve ser executada manualmente no SQL Editor do projeto Supabase, pois não foi aplicada automaticamente.

A migration:

1. adiciona `surveys.archived_at`;
2. cria `archive_survey(uuid)` e `restore_survey(uuid)`, protegidas para a gestão;
3. impede novas coletas, convites e vínculos de equipe em pesquisas arquivadas;
4. mantém as regras de GPS, cidade/UF e distância mínima de 15 m;
5. mantém a trava de distância no escopo correto: pesquisador + mesma pesquisa;
6. recarrega o cache de schema do PostgREST.

## Observação financeira

O arquivamento não altera nem apaga pagamentos e comprovantes. Eles continuam disponíveis no histórico preservado. Porém, enquanto a pesquisa estiver arquivada, seus valores **não entram em pendente, a receber ou saldo devido operacional**.

Antes de executar em produção, confira se o SQL Editor está conectado ao projeto correto. Não execute migrations antigas novamente.
