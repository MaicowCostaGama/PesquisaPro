# PesquisaPro — v149: carregamento completo dos relatórios

## Situação

**Versão local pronta e testada; publicação da v149 ainda não autorizada.**

- Cache de execução: `20261008171600`.
- Não há nova migration e nenhum SQL foi aplicado ao Supabase.
- Nenhuma coleta, resposta, aprovação, pagamento, contrato ou cadastro foi alterado.
- O CSS foi preservado sem alterações nesta versão.

## Falha identificada

O código anterior buscava os agregados de todas as perguntas em uma única chamada à API, sem paginação. O Supabase tem, por padrão, um limite de **1.000 linhas por requisição**. Cada categoria de resposta é uma linha do agregado — inclusive cada texto distinto das perguntas abertas.

Assim, um relatório pode exceder esse limite mesmo com menos de 1.000 entrevistas. Uma pergunta aberta com muitos textos diferentes pode ocupar grande parte do primeiro lote. Como a RPC ordena as perguntas, as categorias posteriores podem ficar fora da resposta HTTP recebida pelo aplicativo.

As capturas anteriores do SQL Editor mostraram contagens nas perguntas finais e UUIDs coincidentes na RPC. Isso é compatível com um corte na entrega do resultado ao navegador, não com a inexistência de respostas no banco.

**Limite da confirmação:** foi comprovada a ausência de paginação no código e reproduzido o mesmo sintoma em teste. Não foi possível medir diretamente o retorno HTTP na sessão autenticada do usuário, pois a inspeção por console não estava disponível. Portanto, a confirmação definitiva na pesquisa real deve ser feita após a publicação e o recarregamento do aplicativo. As hipóteses anteriores de associação por ID ou de pesquisa homônima não bastaram para resolver o sintoma observado.

## Correção implementada

1. Carregar os resultados em páginas de até **500 agrupamentos**, seguindo os offsets até concluir o resultado.
2. Solicitar a contagem total e verificar se todos os agrupamentos foram recebidos. Um limite do servidor menor que 500 também é tratado corretamente.
3. Ordenar de forma consistente por pergunta, frequência decrescente e texto da categoria; nos cruzamentos, por variáveis.
4. Não interromper apenas porque uma página veio menor que o tamanho solicitado.
5. Não preencher o cache nem apresentar o relatório completo com somente o primeiro lote se ocorrer um erro posterior.
6. Retentar uma vez se a contagem de agrupamentos ou a base válida mudar entre páginas. Essa verificação detecta alterações na contagem/base, mas não constitui um snapshot transacional único de todas as páginas.
7. Aplicar timeout por requisição, prazo total e limite seguro de páginas; em caso de falha, exibir uma mensagem de carregamento incompleto.
8. Manter a compatibilidade com a RPC anterior somente quando a RPC v2 estiver ausente; erros de autorização não acionam esse fallback.
9. Usar o mesmo carregamento completo no relatório da gestão, nos cruzamentos, no PDF e no relatório do cliente, preservando suas RPCs e regras de liberação.
10. Evitar aplicar um retorno atrasado à tela após a troca da pesquisa selecionada.

**Esta correção não inventa respostas nem transfere resultados de uma pesquisa para outra.**

## Testes executados

- Sintaxe de todos os arquivos JavaScript: aprovada.
- **102 smoke tests: aprovados.**
- Teste funcional com 22 perguntas e mais de 1.000 agrupamentos:
  - a carga antiga limitada a 1.000 reproduziu os cartões vazios a partir da pergunta 13;
  - o carregamento paginado recuperou os agrupamentos das 22 perguntas;
  - foram testados limites menores do servidor, resultado vazio, quantidade exata de páginas, falha intermediária, interrupção antecipada, mudança da base, mudança da contagem, RPC legada e erro de autorização.
- Validação com o **SDK Supabase real e HTTP simulado**: aprovados o POST da RPC, `count=exact`, ordenação, offsets, limites e recuperação de 1.505 linhas. Não foram utilizadas credenciais ou respostas de produção nessa validação.
- CSS: idêntico ao da versão anterior.

Os testes de paginação usam dados sintéticos. Eles comprovam o comportamento do código sob truncamento, mas não substituem a validação visual na pesquisa real.

## Publicação e validação no aplicativo

A v149 está no pacote local versionado. Para publicar no GitHub/Vercel é necessária uma autorização específica do usuário; o “ok” durante a investigação não foi tratado como autorização de publicação.

Depois da publicação:

1. Reabrir/recarregar o aplicativo para usar o cache `20261008171600`.
2. Entrar em **Relatórios** e selecionar a pesquisa desejada.
3. Aguardar o término do carregamento completo.
4. Conferir as categorias e contagens das perguntas **13 a 22**.
5. Conferir também o PDF e, quando os resultados estiverem liberados, a visão do cliente.

Se ainda houver cartões vazios, verificar a quantidade de agrupamentos efetivamente recebidos e o ID da pesquisa dessa sessão antes de fazer uma nova alteração. Não afirmar que respostas inexistem nem propor reconstrução de dados sem essa evidência.

## Referências técnicas

- [Supabase — limite padrão de linhas e paginação](https://supabase.com/docs/reference/javascript/select)
- [Supabase — range, offsets inclusivos e ordenação](https://supabase.com/docs/reference/javascript/using-modifiers-range)
