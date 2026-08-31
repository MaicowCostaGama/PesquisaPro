# Desempenho comercial por vendedor

## Vínculo comercial

Toda oportunidade criada pela gestão deve possuir um vendedor responsável antes de avançar para proposta, negociação ou fechamento. O vendedor continua podendo criar e editar suas próprias oportunidades; coordenação, gerência, ADM PesquisaPro e administrador podem atribuir ou transferir o responsável.

Toda proposta gravada recebe `seller_id` igual ao vendedor da oportunidade. A migration faz o preenchimento das propostas antigas e mantém esse vínculo sincronizado quando a oportunidade é transferida para outro vendedor.

## Métricas administrativas

A visão **Desempenho** do Comercial apresenta, por vendedor ativo, oportunidades atribuídas, abertas, ganhas e perdidas, propostas criadas e enviadas, taxa de conversão, valor vendido, comissão a receber, comissão aprovada e comissão já paga. O ranking é ordenado por valor vendido, depois por vendas ganhas e volume de oportunidades.

O valor vendido prioriza o total da proposta aceita. Se uma oportunidade ganha não tiver uma proposta aceita associada, a tela usa o valor estimado da oportunidade como fallback visual.

## Implantação

Executar na ordem:

1. `deploy/comercial.sql`
2. `deploy/comercial-comissoes.sql`
3. `deploy/comercial-desempenho.sql`

A última migration é incremental e idempotente. Ela adiciona o vínculo direto da proposta, preenche registros antigos, cria índices e instala triggers de sincronização. Não remove dados de oportunidades, propostas ou comissões.
