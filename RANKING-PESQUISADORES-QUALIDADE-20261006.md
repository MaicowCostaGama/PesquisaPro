# Ranking de pesquisadores e qualidade da coleta — 06/10/2026

## Objetivo

O PesquisaPro passa a ter um painel de **desempenho e risco operacional** dos pesquisadores. O ranking serve para orientar convites futuros e priorizar auditorias; ele **não é uma prova automática de fraude** e não substitui a revisão humana.

A análise considera somente dados reais gravados no banco. Nenhuma coleta, resposta, gravação, pagamento ou contrato é apagado ou alterado pelo ranking.

## Pesos aprovados

| Componente | Peso | O que é analisado |
|---|---:|---|
| Qualidade e coerência das respostas | **30%** | Completude das perguntas obrigatórias, preenchimento de respostas abertas, padrões de respostas repetidos e consistência estrutural com o formulário |
| Integridade do processo | **30%** | Reprovações, intervalos muito curtos, pontos geográficos muito próximos e flags de auditoria |
| Duração compatível | **20%** | Duração registrada comparada ao tempo mínimo calculado/configurado para cada pesquisa; tempos excessivos são limitados para não gerar vantagem artificial |
| Distância entre coletas | **20%** | Distância média entre coletas consecutivas do mesmo pesquisador na mesma pesquisa; o valor é limitado para evitar que uma viagem excepcional domine a nota |

A nota final vai de 0 a 100 quando a amostra mínima é atingida. Abaixo da quantidade mínima, o cartão aparece como **amostra insuficiente** e não recebe nota final.

## Qualidade das respostas

A análise avalia a **qualidade da aplicação**, não se a opinião do entrevistado é verdadeira ou correta. Uma distribuição uniforme de respostas, sozinha, não é fraude.

São exibidos sinais agregados de:

- perguntas obrigatórias respondidas;
- respostas abertas preenchidas, quando existirem;
- repetição do mesmo conjunto de respostas pelo mesmo pesquisador na mesma pesquisa;
- compatibilidade estrutural com o formulário e as perguntas condicionantes.

Respostas brutas continuam protegidas pelas regras de acesso existentes. O ranking não expõe respostas individuais.

## Gravações

As gravações não dão pontos positivos apenas por existirem, pois a seleção é aleatória. Quando uma confirmação é obrigatória — inclusive nas entrevistas realizadas após as 21:00 — uma ausência, recusa ou falha entra como sinal de integridade para revisão, conforme a regra já existente.

## Uso recomendado

1. Filtre por período, pesquisa, nome ou quantidade mínima de entrevistas.
2. Compare pesquisadores somente quando houver amostra suficiente.
3. Abra **Auditoria** para conferir duração, intervalo, georreferenciamento, status e gravação.
4. Use o WhatsApp para solicitar esclarecimentos quando necessário.
5. Considere o histórico, a área de atuação e as condições da pesquisa antes de qualquer decisão.

A versão entregue não encerra acesso nem exclui pesquisador automaticamente. Uma decisão de suspensão, se desejada, deve ser manual, documentada e preservando todo o histórico.

## Migration manual

Execute manualmente no Supabase:

```text
deploy/ranking-desempenho-pesquisadores.sql
```

A migration cria somente a função agregadora `researcher_performance_ranking(...)`, restringe sua execução a usuários autenticados e não modifica dados existentes. Se ela ainda não tiver sido aplicada, o painel informa que a função precisa ser habilitada.

> Observação: perguntas abertas são opcionais no formulário atual; a ausência delas não reduz a nota. Repetições anormais continuam sendo sinalizadas quando houver respostas registradas.


## Aba **Seu Ranking** no perfil do pesquisador

O pesquisador autenticado passou a ter uma área própria chamada **Seu Ranking**. Ela mostra somente os próprios indicadores, sem expor dados de outros pesquisadores:

- nota final, quando houver pelo menos 10 coletas no período de 90 dias;
- fatores separados de respostas, integridade, duração e distância;
- quantidade de coletas válidas, reprovadas e sinais que merecem revisão;
- explicação textual do motivo da nota e dos pontos que podem ser melhorados.

A regra de convites apresentada ao pesquisador é:

- **nota 80 ou mais:** faixa esperada para manter a prioridade normal;
- **nota menor que 80:** a gestão pode reduzir a frequência de convites;
- **nota abaixo de 60:** nota muito baixa; após avaliar o contexto, a gestão pode deixar de convidar o pesquisador para novas coletas.

Esses limiares são orientações para seleção de convites. A nota não prova fraude, não exclui automaticamente o pesquisador e não apaga qualquer histórico. Em caso de divergência, a gestão deve conferir a auditoria e o pesquisador pode usar o chat para pedir esclarecimentos.

## Migration adicional para o acesso individual

Depois da migration agregada, execute também manualmente no Supabase:

```text
deploy/ranking-desempenho-pesquisador.sql
```

Essa migration cria `researcher_my_performance(...)` com `security definer`, mas restringe o resultado por `auth.uid()` e pelo papel `pesq`. Ela não utiliza `is_staff()` para o acesso individual, não retorna dados de outros pesquisadores e não contém exclusão, alteração ou reprocessamento de dados.
