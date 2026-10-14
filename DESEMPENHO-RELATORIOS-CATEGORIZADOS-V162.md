# PesquisaPro — desempenho dos relatórios categorizados (v162)

## O erro

`canceling statement due to statement timeout` significa que o PostgreSQL cancelou uma consulta porque ela ultrapassou seu prazo. A mensagem, sozinha, não identifica qual chamada falhou nem comprova perda de agrupamentos.

A inspeção da v161 identificou um gargalo: para cada resposta, o banco expandia novamente o JSON de categorias e procurava seus membros. Os cruzamentos também repetiam esse trabalho dentro das agregações. Esse custo aumenta conforme a quantidade de respostas, categorias e variáveis.

## Correção

### Banco de dados

O arquivo `deploy/otimizar-relatorios-categorizados-v162.sql` otimiza as consultas categorizadas da v161, mantendo seus nomes, parâmetros e formatos de resultado. Assim, a melhoria principal também é compatível com o frontend v161 já publicado.

- Prepara a correspondência entre textos e categorias uma vez por consulta, em vez de percorrer todos os grupos para cada resposta.
- Normaliza uma única vez as respostas usadas nos cruzamentos e as agrega diretamente por entrevista, evitando joins repetidos.
- Cria, somente quando ausentes, os índices `idx_collection_events_survey_status_calibration` e `idx_collection_answers_event_question`, com os mesmos nomes e definições do SQL de índices já existente no projeto. Não duplica esses índices quando já instalados.
- Preserva a prioridade do primeiro grupo quando um texto aparece em mais de uma categoria.
- Mantém a contagem por entrevista válida, excluindo reprovadas e calibração.
- Mantém até seis variáveis, sua ordem, as combinações de respostas e as bases percentuais.
- Preserva o acesso restrito: gestão autenticada; cliente apenas com resultados liberados e o próprio relatório publicado.
- Perguntas abertas continuam exibindo apenas categorias revisadas, `(não categorizadas)` ou `(sem resposta)`, sem divulgar os textos originais.
- Não aumenta nem desativa `statement_timeout`.

### Aplicativo

- Consultas categorizadas idênticas e simultâneas compartilham o mesmo processamento, com isolamento por sessão, pesquisa e snapshot de agrupamento ou relatório publicado.
- Resultados concluídos não são mantidos como cache para futuras consultas.
- A atualização automática do relatório não inicia uma consulta durante a exportação de PDF. Uma consulta já iniciada pode terminar normalmente.
- Dois cartões com as mesmas variáveis, na mesma ordem, usam o mesmo resultado durante aquela geração de PDF. A geração seguinte consulta novamente os dados.
- A mensagem de prazo excedido passa a explicar o problema em português.
- Uma falha de consulta impede baixar, enviar ou publicar um PDF parcial.

## Ativação manual no Supabase

**Nenhum SQL desta correção foi executado automaticamente.**

1. No projeto Supabase usado pelo PesquisaPro, abra **SQL Editor → New query**.
2. Abra `deploy/otimizar-relatorios-categorizados-v162.sql` e copie seu conteúdo completo.
3. Cole na nova consulta e clique em **Run**.
4. Confirme que a execução terminou sem erro. Se aparecer erro, envie apenas a mensagem/captura, sem chaves ou credenciais.
5. Volte ao aplicativo e atualize com **Ctrl + Shift + R**.
6. Abra a pesquisa correta em **Relatórios** e tente **Gerar PDF** novamente.
7. Revise categorias, pendências, totais e cruzamentos antes de disponibilizar ao cliente.

Não é necessário reaplicar o SQL v161, recriar os agrupamentos ou alterar a Edge Function de IA. O SQL de otimização não remove as cotas da OpenAI nem modifica a configuração de IA; esse assunto é independente.

As melhorias adicionais do aplicativo dependem da publicação da v162 no GitHub/Vercel, após autorização. Executar o SQL é uma etapa separada da publicação do código web.

## Dados preservados

A correção não reescreve respostas, entrevistas, pesquisas, categorias salvas, usuários, contratos ou pagamentos. Mantém os controles de liberação dos resultados. O CSS e a função de IA não foram alterados. Os SQLs anteriores são preservados como histórico; use o novo arquivo para otimizar as funções da v161.

PDFs antigos não mudam sozinhos: gere um novo arquivo após a atualização e só o disponibilize depois de revisar.

## Validação

- **118 testes de regressão do aplicativo passaram**, incluindo concorrência, isolamento e cancelamento seguro do PDF.
- Validação de sintaxe JavaScript concluída.
- Testes de navegador em desktop, tablet, celular, tela estreita e paisagem passaram.
- O PDF completo de teste manteve categorias e cruzamentos de seis variáveis sem os textos originais.
- **13 verificações comparativas de SQL passaram**, comprovando a equivalência dos resultados das quatro consultas entre v161 e v162, a preservação das permissões, ranking, campos compostos, números, textos e contagens.
- **20 verificações adicionais de SQL passaram**, incluindo liberação do cliente, relatório publicado, snapshots, dimensões, entrevistas vazias, JSON malformado, reexecução segura e preservação dos dados e das funções anteriores.
- Sintaxe SQL/PLpgSQL validada; o plano local confirma que o lookup das categorias é executado uma vez por consulta.

### Medição local de software

Benchmark sintético em PGlite/PostgreSQL WASM, com 1.200 entrevistas, 22 perguntas, 26.400 respostas, 600 textos de configuração e os mesmos índices de acesso nas duas versões. Uma execução por consulta, sem aquecimento; os bancos isolados foram medidos em workers paralelos. Não são medições nem resultados da pesquisa real.

| Consulta | v161 | v162 |
|---|---:|---:|
| Resultados por pergunta — gestão | 5,395 s | 0,268 s |
| Resultados por pergunta — cliente | 5,597 s | 0,286 s |
| Cruzamento de seis variáveis — gestão | 4,704 s | 0,120 s |
| Cruzamento de seis variáveis — cliente | 4,655 s | 0,104 s |

Esses tempos demonstram a melhora no cenário local de teste, mas **não garantem a mesma latência no Supabase de produção**. O teste em produção continua necessário após a ativação manual.

**Limitação:** não houve acesso ao plano de execução, à carga ou aos índices efetivos do seu Supabase de produção. A confirmação fim a fim depende da execução manual do SQL e de um novo teste no aplicativo. Se o erro persistir, será necessário identificar a consulta específica que excedeu o prazo; não se deve divulgar um resultado parcial como completo.
