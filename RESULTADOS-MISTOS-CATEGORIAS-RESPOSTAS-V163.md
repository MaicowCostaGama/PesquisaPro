# PesquisaPro — categorias e respostas não agrupadas (v163)

**Estado da entrega:** código e SQL preparados e testados localmente. Esta versão ainda não foi publicada no GitHub/Vercel e a migration v163 não foi executada no Supabase por este agente.

Versão de cache: `20261014175000`.

## Regra de apresentação

Esta versão substitui a regra da v161 que colocava todos os textos ainda não tratados em uma única linha “(não categorizadas)”.

| Situação da pergunta aberta | Resultado mostrado |
| --- | --- |
| Sem agrupamento | Cada resposta original distinta, com sua quantidade e percentual. |
| Agrupamento parcial | Categorias revisadas para seus textos vinculados **mais cada resposta ainda não agrupada**, separada pelo texto original. |
| Agrupamento completo | Categorias revisadas para todos os textos vinculados; seus textos membros não são repetidos como resultados adicionais. |

Se novas respostas entrarem após a revisão, as que não estão vinculadas a uma categoria permanecem como textos originais separados. Não são agrupadas automaticamente nem escondidas em um total genérico.

“(Sem resposta)” continua representando ausência de resposta, não ausência de categorização. As bases já escolhidas no editor são preservadas: respostas preenchidas ou entrevistas válidas. Nos cruzamentos, mantém-se a base geral de entrevistas válidas. Entrevistas reprovadas, pendentes e de calibração continuam fora da base válida.

## Onde a regra foi aplicada

- Resultados por pergunta na gestão.
- PDF final, inclusive perguntas sem qualquer tratamento.
- Cruzamentos de uma a seis variáveis, antes da agregação por entrevista.
- Exportação CSV dos cruzamentos.
- Painel do cliente autorizado, usando o snapshot dos agrupamentos do documento publicado, e não as edições posteriores de um rascunho.

As contagens vinculadas a uma categoria não são contadas novamente como respostas originais. Rótulos já retornados pelo banco não são recategorizados no navegador, mesmo se coincidirem com um membro de outra categoria. Nenhuma resposta armazenada é editada.

Um texto literal igual ao nome de uma categoria aparece sob esse mesmo rótulo com a contagem agregada correspondente, sem duplicar ocorrências. A origem da categorização permanece no editor, não é inferida pelo rótulo do resultado.

## Ativação no Supabase — execução manual

O usuário já mostrou sucesso na execução das migrations v161 e v162. **Não é necessário reaplicá-las.**

1. Abra o projeto do PesquisaPro no Supabase (`soejywbqjgqsrluhbyit`).
2. Entre em **SQL Editor** e abra uma nova consulta.
3. Copie **todo** o arquivo `deploy/relatorios-categorias-e-respostas-v163.sql` deste pacote.
4. Clique em **Run** e confirme o resultado `Success. No rows returned`.
5. Publique o código v163 no GitHub/Vercel após a autorização de publicação.
6. Atualize a página do aplicativo para carregar a versão nova.

O SQL substitui as funções de consulta agrupada e mantém a otimização v162: mapa de categorias materializado uma vez por consulta e índices auxiliares criados somente se ausentes. Não apaga nem altera pesquisas, respostas, coletas, pagamentos, contratos, perfis ou agrupamentos salvos. Permissões, autenticação e vínculo de cliente/documento continuam validados.

**Não exige alteração da Edge Function, de Secrets nem de `OPENAI_API_KEY`.** Esta é uma correção da apresentação dos resultados e das consultas, não da geração de sugestões por IA. Não modifica os limites da IA.

A execução do SQL modifica as consultas online imediatamente; atualizar o código completa os textos explicativos e os caminhos de PDF da nova regra. PDFs já armazenados não são reescritos automaticamente.

## Relatórios e PDFs existentes

Após a ativação:

1. Selecione a pesquisa e o cliente corretos em **Relatórios**.
2. Confirme os agrupamentos salvos e a base percentual de cada pergunta.
3. Salve a estrutura quando houver alterações.
4. Clique em **Gerar PDF**.
5. Confira uma pergunta sem agrupamento, uma parcialmente agrupada e os cruzamentos.
6. Somente após a revisão, use **Finalizar e disponibilizar ao cliente** para substituir o PDF anterior.

Esta entrega não disponibiliza relatórios ao cliente automaticamente. Um erro na consulta não deve produzir ou publicar PDF parcial.

## Revisão antes da divulgação

Textos ainda não agrupados poderão conter nomes, contatos, documentos ou outros dados pessoais. **Contagem agregada não equivale a anonimização.** Revise as respostas antes de divulgar ou vincule os textos a categorias apropriadas quando necessário. Esta versão não elimina textos nem aplica filtros silenciosos que alterem o resultado.

## Validação realizada

- **119 testes do aplicativo passaram**, com verificação de sintaxe JavaScript.
- **19 verificações locais da nova regra SQL passaram**, cobrindo ausência de agrupamento, tratamento parcial e completo, textos literais, colisões de rótulo, permissões, snapshots e uma a seis dimensões.
- **20 verificações adicionais de regressão PostgreSQL passaram** sobre a migration final, incluindo contagem por entrevista, isolamento do rascunho, ausência de duplicidade de membros, liberação ao cliente, autenticação e reexecução sem perda de dados.
- Interface testada no Chromium em cinco dimensões de tela.
- PDF real de sete páginas testado com dados fictícios, mostrando os três regimes e cruzamentos de seis variáveis.
- Outro PDF real confirmou todas as **1.250 respostas distintas não agrupadas**, inclusive a primeira e a última, sem truncamento de exportação.
- SQLs anteriores, Edge Functions, CSS e clone de publicação preservados integralmente. A alteração preexistente de `deploy/cadastro-pesquisador-senha.sql` no clone permanece intocada.

Os testes de banco usam PostgreSQL/PGlite local com fixtures e mocks de autenticação. Não reproduzem todas as políticas, estatísticas e condições do Supabase de produção. O benchmark é sintético, não uma promessa de tempo de resposta. Não houve acesso a respostas reais, execução SQL remota ou publicação nesta etapa.

## Arquivos da versão

- `app.js` e arquivos de cache: regra mista e mensagens atualizadas, com as melhorias de concorrência da v162 incluídas.
- `deploy/relatorios-categorias-e-respostas-v163.sql`: migration manual cumulativa das consultas oficiais otimizadas.
- `reports-mixed-results-smoke-test.js`: regressão da nova regra no frontend, PDF, cliente e CSV.
- `RESULTADOS-MISTOS-CATEGORIAS-RESPOSTAS-V163.md`: este guia.

O ZIP é um backup completo versionado do aplicativo, não uma instrução para executar todos os SQLs históricos. Para esta atualização, execute somente a migration v163 indicada acima.
