# Correção da associação das respostas no Relatório — v146

## Ajuste final

O banco e a RPC v2 retornam respostas para as perguntas 13–22, mas o cartão podia receber um agrupamento vazio antes de chegar ao fallback correto.

A renderização agora avalia, nesta ordem:

1. UUID;
2. posição;
3. texto normalizado;
4. ordem ordinal segura.

Para cada candidato, o frontend escolhe o primeiro agrupamento que possui ao menos uma contagem `cnt > 0`. Um agrupamento vazio não bloqueia mais os próximos fallbacks.

## Migration

Nenhuma migration nova é necessária. A migration v143 já executada permanece suficiente.

## Teste

Após a publicação, atualizar com `Ctrl + Shift + R`, abrir **Relatórios** e verificar as perguntas 13 em diante.
