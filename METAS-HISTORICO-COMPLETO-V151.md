# PesquisaPro v151 — Metas calculadas com o histórico completo

## Situação relatada

Em 10/10/2026, a gestão informou que a meta do Centro havia sido atingida no dia anterior, mas passou a indicar **46 de 47 entrevistas**, com **1 restante**.

## Evidências da investigação

- A sessão autenticada mostrou a pesquisa **PESQUISA PROTEÇAO VEICULAR SP** com Centro em **46/47**.
- A auditoria completa mostrou **exatamente 1.000 registros**. Durante a consulta, a tela apresentou 899 válidos e 101 rejeitados.
- O código da versão v150 consultava `collection_events` em uma única requisição, ordenada da entrevista mais recente para a mais antiga, sem buscar páginas adicionais.
- As metas são calculadas a partir dessa mesma lista local de eventos. Uma entrevista antiga que sai do retorno truncado também sai da contagem local, embora continue no banco.
- Existem reprovações históricas do Centro na auditoria. A data exibida na lista é a data da coleta; isso, isoladamente, não demonstra quando uma reprovação foi aplicada, nem comprova que ela provocou a mudança relatada.

**Conclusão técnica:** foi identificado um defeito real de carregamento que pode reduzir indevidamente a meta ao aumentar o número de coletas. Não é necessário apagar entrevistas nem alterar a regra de validade. O registro específico que explica a diferença real do Centro ainda não foi identificado; sua confirmação exige a leitura completa no ambiente publicado.

## Reprodução funcional

Foi criado um cenário sintético com **1.001 registros** e **47 entrevistas válidas do Centro**, sendo uma delas a mais antiga:

| Leitura | Registros recebidos | Centro | Restante |
|---|---:|---:|---:|
| Consulta antiga, truncada | 1.000 | 46/47 | 1 |
| Consulta corrigida | 1.001 | 47/47 | 0 |

O teste demonstra o mecanismo do defeito; não substitui a validação dos registros reais da pesquisa.

## Correção v151

1. Buscar o histórico por páginas de até 500 registros, até conferir o total retornado pelo banco.
2. Ordenar por data e ID para manter a ordem consistente.
3. Fixar o limite superior das páginas seguintes pela data do registro mais recente retornado pelo banco, sem depender do relógio do aparelho.
4. Rejeitar resultados incompletos, duplicados, inconsistentes ou com erro de conexão. Nessas situações, a atualização não substitui o cache anterior por uma lista parcial.
5. Compartilhar consultas iguais que estejam simultaneamente em andamento.
6. Preservar RLS e limitar sempre pesquisadores ao próprio ID. Limpar o histórico e invalidar consultas antigas ao entrar ou sair da conta.
7. Carregar os vínculos de gravação em lotes menores, evitando URLs excessivas após a ampliação do histórico.
8. Manter compatibilidade com schemas antigos sem campos de duração ou gravação.

A mudança corrige a origem comum dos dados usados nas metas, auditoria, evolução e históricos/extratos que consomem esse carregador. Não muda valores financeiros nem o status de nenhuma entrevista.

## Regras mantidas

- As metas continuam considerando apenas entrevistas **válidas**, excluindo **reprovações** e **calibrações**.
- Uma reprovação real pode legitimamente reduzir uma meta antes atingida. A correção não força a exibição de 100%.
- Nenhum dado de coleta, resposta, pagamento, contrato, usuário ou cadastro foi alterado no banco.
- Nenhuma migration foi criada ou executada.
- CSS e a alteração SQL preexistente do clone de publicação permaneceram intactos.

## Validação

- Sintaxe JavaScript: **115 arquivos**, sem falhas.
- Suíte de smoke tests: **104 testes**, sem falhas.
- Reprodução funcional da queda de 47 para 46: aprovada.
- Testes de limites menores do servidor, sessão, ausência de autenticação, falha em página intermediária, duplicação, mudanças no total e compatibilidade de schema: aprovados.
- Validação com o SDK real do Supabase e HTTP sintético: **1.503 registros**, incluindo as 47 entrevistas do Centro, recebidos integralmente.
- Nenhuma alteração de produção foi executada durante esses testes.

## Publicação e confirmação

**Estado desta entrega: v151 local, não publicada.** Cache preparado: `20261010134750`.

Após autorização específica da gestão para publicar no GitHub/Vercel:

1. Abrir Coleta e campo → PESQUISA PROTEÇAO VEICULAR SP → Metas de cotas.
2. Usar Atualizar metas e aguardar a leitura completa.
3. Conferir o Centro e o total da Auditoria completa.
4. Se Centro continuar em 46/47 com o histórico íntegro, conferir os eventos e a data de reprovação; nesse caso, a diferença pode ser legítima e não deve ser corrigida inventando uma entrevista válida.

**Não é necessário executar SQL para a v151.**
