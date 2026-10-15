# PesquisaPro — respostas originais, sem agrupamento (v170)

## Alteração solicitada

A função de agrupamento de respostas abertas foi retirada do uso do aplicativo. Não foi introduzida outra forma de organização automática ou manual.

### O que deixa de aparecer

- Botão **Agrupar respostas** nas perguntas abertas.
- Exportação específica de categorias.
- Editor de agrupamento, união de categorias, abas de categorização, desagrupamento e limpeza de agrupamentos.
- Sugestões de IA semântica e classificação contextual.
- Escolha de resultados tratados na exportação Excel.

O módulo contextual não é mais carregado pela página do aplicativo. Os caminhos antigos de edição estão bloqueados, inclusive se acionados diretamente na sessão da v170.

### O que continua disponível

- Respostas originais das perguntas abertas, com suas ocorrências e percentuais.
- Alternativas e resultados das perguntas fechadas.
- Excel de todas as perguntas ou de uma pergunta específica, com todas as linhas da consulta completa.
- Montagem e exportação de cruzamentos com até seis variáveis, usando as respostas originais.
- Estrutura do relatório, novos PDFs e liberação de relatórios aos clientes.

Na lista de perguntas abertas, a tela mostra os primeiros 100 textos. As exportações Excel e os novos PDFs não ficam limitados aos 100 textos visíveis.

## Como os resultados passam a ser apresentados

Cada texto original permanece separado. Textos iguais podem aparecer com a contagem de suas ocorrências, conforme a distribuição original do banco, mas textos distintos não são mais reunidos por significado ou por categorias antigas.

Nas perguntas abertas, o percentual principal usa as respostas preenchidas da pergunta. A tela também informa o percentual sobre a base de entrevistas válidas. Perguntas fechadas e cruzamentos mantêm suas respectivas bases de entrevistas válidas.

Os cálculos continuam excluindo coletas rejeitadas e entrevistas de calibração conforme as consultas originais já existentes. Múltipla escolha, ranking e perguntas de duas respostas continuam podendo ter mais ocorrências do que entrevistas.

## Preservação

A v170 **não apaga nem altera coletas, respostas, áudios, localização ou dados financeiros**.

As configurações antigas de agrupamento armazenadas na estrutura do relatório são preservadas como metadados inativos. Elas não são aplicadas aos resultados, aos novos PDFs, ao Excel ou aos cruzamentos. Ao carregar e salvar uma estrutura antiga, esses metadados são mantidos, incluindo campos desconhecidos, sem normalizar ou remover seu conteúdo.

Não é necessário usar a limpeza da v169 para deixar de aplicar agrupamentos na v170. A retirada funciona mesmo quando ainda existem categorias antigas salvas.

**PDFs já publicados não são alterados automaticamente.** A apresentação dinâmica dos resultados passa a usar as respostas originais. Se for desejado um PDF com essa apresentação, o usuário deve gerar e publicar um novo documento pelo fluxo normal do aplicativo.

As exigências de relatório publicado, liberação de resultados e permissões dos clientes permanecem. Nenhuma permissão adicional foi criada.

## Implantação

- Build/cache: `20261015190500`.
- **Nenhum SQL novo a executar.**
- **Nenhuma atualização de Edge Function ou segredo necessária.**
- Nenhuma migration ou função foi executada ou publicada no Supabase durante esta preparação.
- O clone de publicação permanece intacto, incluindo sua alteração SQL preexistente protegida.
- Esta versão foi preparada e testada localmente. A publicação GitHub/Vercel depende da autorização específica da v170.

Depois da publicação, recarregue o aplicativo. No computador, se uma tela antiga permanecer aberta, use `Ctrl + F5` para carregar a versão nova. Não há outro ajuste manual de banco relacionado a esta retirada.

## Validação

- 113 smoke tests atuais aprovados, com verificação de sintaxe JavaScript.
- 14 testes exclusivos da função retirada preservados como históricos em `tests/historico-agrupamentos-v169/`, sem serem apresentados como testes da função atual.
- Teste dedicado da v170 cobre ausência de controles, bloqueio do editor e da limpeza antiga, neutralidade dos metadados, preservação ao salvar, consultas originais de gestão e cliente, Excel/PDF e cruzamentos de até seis variáveis.
- Paginação verificada com 1.252 textos originais; Excel real também verificado com 1.250 respostas.
- Chromium validado em desktop, tablet, celular, paisagem e janela reduzida, sem transbordamento horizontal e sem requisições externas no teste.
- CSS original preservado; SQLs e funções existentes preservados.

Os testes usam dados fictícios e não substituem uma validação autorizada com dados de produção. Nenhuma limpeza de agrupamentos de uma pesquisa real foi executada nesta tarefa.
