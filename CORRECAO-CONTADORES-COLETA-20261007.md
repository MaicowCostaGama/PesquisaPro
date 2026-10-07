# Correção dos contadores de coleta — 2026-10-07

## Causa da divergência

O cartão **Coletado** da aba **Coleta e campo** e o cartão **Total válido** da aba **Evolução da coleta** eram atualizados em momentos diferentes:

- **Coletado** podia permanecer com o valor materializado em `surveys.collected` ou com o valor da renderização anterior;
- **Total válido** contava diretamente os eventos válidos em `collection_events` quando a evolução era renderizada ou atualizada.

Assim, uma tela podia mostrar 465 no cartão superior e 467 na evolução, mesmo havendo 467 eventos válidos no banco.

## Correção

A interface agora:

1. usa a mesma contagem de eventos válidos para a linha da pesquisa e para a evolução quando os eventos já foram carregados;
2. adiciona um alvo identificável ao cartão **Coletado**;
3. atualiza esse cartão durante o ciclo de atualização ao vivo da pesquisa;
4. recalcula o percentual com a mesma fonte do total exibido;
5. mantém `surveys.collected` apenas como fallback temporário enquanto a consulta real ainda está carregando.

O banco não é alterado por esta correção e nenhum dado é removido ou recalculado de forma destrutiva.
