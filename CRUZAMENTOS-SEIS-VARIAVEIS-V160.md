# PesquisaPro — cruzamentos com até seis variáveis (v160)

**Estado desta entrega:** implementação preparada e validada localmente. Não publicada no GitHub/Vercel e sem execução de SQL no Supabase por este trabalho.

## O que muda

Cada cartão de **Relatórios → Montar relatório** passa a aceitar de **uma a seis perguntas diferentes**. Continua sendo possível criar vários cartões independentes e escolher quais entram no PDF.

| Seleção | Uso no resultado |
| --- | --- |
| Variável 1 | Linhas da matriz |
| Variável 2 | Colunas da matriz; opcional |
| Variáveis 3 a 6 | Recortes combinados pelas respostas dessas perguntas; opcionais |

Exemplo: avaliação × região, separadas simultaneamente por faixa etária, sexo, renda e escolaridade. Cada combinação **realmente observada** nas variáveis 3 a 6 recebe uma matriz identificada. Não são criadas combinações hipotéticas.

Na tela de montagem, os recortes podem ser expandidos ou recolhidos. **CSV e PDF incluem todos os recortes**, mesmo que estejam recolhidos na tela.

## Como utilizar depois da ativação

1. Abra **Relatórios** e escolha a pesquisa correta.
2. Entre em **Montar relatório**.
3. Selecione até seis perguntas no cartão do cruzamento.
4. Confira os rótulos: linhas, colunas e recortes combinados.
5. Aguarde o carregamento completo; abra os recortes para revisar as matrizes.
6. Marque **Incluir este cruzamento no PDF**, se desejado.
7. Clique em **Salvar cruzamentos na estrutura** para persistir a seleção no rascunho.
8. Use **Exportar CSV completo** para baixar todas as combinações do cruzamento ativo.
9. Gere e revise o PDF antes de disponibilizá-lo ao cliente pelo fluxo existente.

Não é permitido selecionar a mesma pergunta duas vezes no cartão. Ao retirar uma variável intermediária, as posteriores são reorganizadas e os seletores mostram a nova ordem. As perguntas de **Ranking** e **Duas respostas** continuam fora da seleção como uma variável única.

### Respostas abertas

Perguntas abertas simples são aceitas pela nova RPC, alinhando o banco aos seletores existentes. **O cruzamento utiliza os textos originais agregados**; não aplica automaticamente os nomes das categorias manuais ou sugeridas por IA. A categorização revisada e a união de categorias das versões anteriores permanecem intactas no seu fluxo próprio.

### Percentuais e contagem

- A base é a quantidade total de **entrevistas válidas da pesquisa**.
- Coletas reprovadas, pendentes ou de calibração não entram na base.
- Ausência de resposta aparece como **(sem resposta)**, sem excluir silenciosamente a entrevista.
- Cada entrevista válida participa de **uma combinação**, evitando multiplicação por respostas múltiplas.
- Em pergunta de múltipla escolha, as alternativas selecionadas formam uma resposta combinada com ` + `, preservando a convenção dos cruzamentos antigos. Não é uma contagem independente de cada alternativa.
- O percentual de uma célula é sua contagem dividida pela **base geral**, não pela base apenas do recorte.
- Assim, o total de um recorte pode ser menor que 100%. A soma das contagens de todos os recortes deve corresponder à base geral.
- Recortes pequenos têm poucos casos e devem ser interpretados com cautela; não foi acrescentado teste de significância ou ponderação estatística.

## CSV e PDF

O CSV contém uma linha por combinação agregada e até nove colunas: seis variáveis, quantidade de entrevistas, base válida geral e percentual dessa base. Não se limita à primeira matriz da tela. Textos que poderiam ser interpretados como fórmula no Excel recebem um prefixo de proteção no arquivo exportado; os dados armazenados não são alterados.

O PDF percorre todos os recortes. Matrizes com muitas colunas são divididas em blocos de até seis colunas por página para manter a leitura. O **TOTAL da linha e o TOTAL geral do recorte incluem todas as colunas**, e podem se repetir nos blocos: não some os totais repetidos entre blocos. Cabeçalhos reaparecem nas páginas de continuação e textos longos não são descartados.

## Ativação manual no Supabase

A recomendação é executar a migration aditiva **antes da publicação do frontend**, pois as funções antigas continuam funcionando.

1. Abra o projeto Supabase do PesquisaPro: `soejywbqjgqsrluhbyit`.
2. Entre no **SQL Editor** e crie uma consulta nova.
3. Cole **todo o conteúdo** de `deploy/relatorios-cruzamentos-seis-variaveis-v160.sql`.
4. Execute e confira **Success. No rows returned**.
5. Depois da publicação autorizada da v160, atualize o aplicativo e faça um teste com quatro a seis variáveis.

**Execute somente esse novo SQL para este ajuste.** Não é necessário reaplicar migrations anteriores nem o SQL de limites da IA. Não há atualização da Edge Function, configuração de segredo ou solicitação de chave.

A migration cria somente:

- `survey_report_cross_tab_v2(uuid, uuid[])`, para gestão autenticada;
- `client_report_cross_tab_v2(uuid, uuid[])`, para cliente vinculado com resultados já liberados.

Os dados retornados são agregados; não contêm IDs de entrevistas, GPS ou dados de pesquisadores. As verificações de sessão, perfil, pesquisa e liberação continuam no servidor. As funções anteriores e suas assinaturas são preservadas.

Se o SQL novo ainda não estiver ativo, cruzamentos de até três variáveis continuam usando a RPC antiga quando ela estiver disponível. Cruzamentos de quatro a seis exibem a orientação para ativação; **não são reduzidos silenciosamente a três**.

## Preservação e validação

Foram preservados o CSS anterior (alteração por acréscimo), as migrations antigas, os agrupamentos de respostas abertas, as funções de IA, as pesquisas, respostas, coletas, contratos e pagamentos. O clone de publicação não foi modificado; a alteração protegida de `deploy/cadastro-pesquisador-senha.sql` não foi tocada.

Os testes utilizam exclusivamente dados fictícios para validação de software: seleção, persistência, distinção das variáveis 4 a 6, base percentual, ausência de resposta, exportação completa, paginação, erro da API, ausência da RPC nova e compatibilidade dos cruzamentos antigos. Há testes reais de interface em desktop, tablet, celular, tela estreita e paisagem, além de inspeção do PDF com muitas colunas e textos longos.

A validação PostgreSQL é local e isolada. As funções de autenticação/liberação são simuladas no banco de teste; isso não substitui um teste autenticado no Supabase real após a execução manual e a publicação. **Nenhum resultado real de pesquisa foi consultado ou enviado a serviços externos para estes testes.**

**Cache da versão:** `20261013224500`.
