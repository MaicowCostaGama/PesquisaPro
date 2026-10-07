# Cartões de coletas válidas e rejeitadas — 2026-10-07

## Alteração

A aba **Coleta e campo** agora exibe cinco indicadores no topo:

- Pesquisadores vinculados;
- Coletado, para o progresso da pesquisa;
- **Coletas válidas**;
- **Coletas rejeitadas**;
- Status da pesquisa.

## Fonte dos números

Os cartões de status contam os registros reais de `collection_events` da pesquisa aberta:

- `status = 'valid'` → **Coletas válidas**;
- `status = 'rejected'` → **Coletas rejeitadas**.

As coletas rejeitadas continuam fora do total válido, das metas e do progresso financeiro da coleta.

## Atualização

Os dois cartões são atualizados junto com o ciclo de atualização ao vivo da aba, sem alterar dados no Supabase e sem exigir migration. Enquanto os eventos reais ainda estão carregando, o indicador de rejeitadas começa em zero e é corrigido assim que o histórico da pesquisa é carregado.

O layout é responsivo: os cinco cartões se reorganizam em três, duas ou uma coluna conforme a largura da tela.
