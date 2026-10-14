# PesquisaPro — resultados oficiais categorizados · v161

## Correção solicitada

Perguntas abertas no relatório final devem divulgar **as categorias revisadas**, não os textos originais. O mesmo tratamento vale para os cruzamentos com até seis variáveis, o CSV dos cruzamentos e o painel de resultados publicado para o cliente.

## O que muda

- **Resultados por pergunta:** a gestão, o PDF e o painel do cliente passam a usar a distribuição tratada, calculada pelas mesmas regras de agregação.
- **Cruzamentos:** a resposta aberta é convertida em sua categoria **antes da agregação por entrevista**, em qualquer posição entre as seis variáveis. Linhas, colunas e recortes usam as categorias revisadas.
- **Reabertura do relatório:** os agrupamentos salvos são carregados antes de mudar de modo, salvar a estrutura ou gerar o PDF. Uma falha na leitura não permite sobrescrever a revisão salva com uma estrutura vazia.
- **Geração:** os dados são recarregados completamente, e o PDF usa o snapshot dos agrupamentos daquela estrutura. Alterações na estrutura, na pesquisa, no cliente ou na sessão durante a geração interrompem a divulgação daquele arquivo.
- **Cliente:** somente as categorias do documento publicado daquele cliente são usadas. Um rascunho posterior não substitui silenciosamente as categorias publicadas. Sem documento publicado, o aplicativo avisa que aguarda a publicação; não exibe respostas brutas como alternativa.
- **Mapa de calor do cliente:** perguntas abertas deixam de aparecer no seletor desse mapa enquanto não houver uma versão geográfica categorizada; isso evita divulgar textos originais por uma área alternativa. Perguntas fechadas e georreferenciamento geral continuam disponíveis.

### Respostas ainda não categorizadas

Elas são reunidas em uma linha identificada como **`(não categorizadas)`**, sem mostrar seu conteúdo original. Isso é um indicador de pendência, não uma classificação semântica automática. As entrevistas continuam contabilizadas; não se retiram pendências da base para inflar os percentuais das demais categorias.

Ausências de resposta nos cruzamentos permanecem como **`(sem resposta)`**, separadamente. Nas perguntas abertas, a base percentual continua sendo a opção escolhida no agrupador: respostas preenchidas ou entrevistas válidas. Os cruzamentos continuam usando a base geral de entrevistas válidas, não a base isolada do recorte.

A agregação oficial conta entrevistas distintas por categoria. Se houver registros anômalos com mais de um texto aberto da mesma entrevista apontando à mesma categoria, a entrevista não é duplicada nessa categoria. O tratamento interno conserva as ocorrências e os textos recebidos para revisão; nenhum registro original é atualizado ou removido.

## Ativação manual

**Esta versão ainda precisa de autorização de publicação do código. O SQL não foi executado no Supabase.**

1. No projeto Supabase usado pelo PesquisaPro (`soejywbqjgqsrluhbyit`), abra **SQL Editor → New query**.
2. Abra o arquivo `deploy/relatorios-categorias-oficiais-v161.sql` deste pacote.
3. Copie todo o conteúdo, cole no editor e execute **Run**.
4. Confirme a mensagem de sucesso. Em caso de erro, guarde a mensagem para diagnóstico; não reaplique outros SQLs às cegas.
5. Depois da publicação autorizada da v161 no GitHub/Vercel, atualize o aplicativo.
6. Em **Relatórios**, selecione a pesquisa e o cliente corretos. Reabra o agrupador para conferir as categorias salvas.
7. Revise a aba **Não categorizadas** e complete o tratamento quando necessário. Salve os agrupamentos.
8. Confira os cruzamentos no modo **Montar relatório**.
9. Clique em **Gerar PDF** e revise o novo arquivo.
10. Se estiver correto, use **Finalizar e disponibilizar ao cliente**.

**PDFs antigos não são reescritos automaticamente.** É necessário gerar e disponibilizar um novo documento para que a entrega final reflita a correção.

Não é necessário alterar `index.ts`, `file2.ts`, a Edge Function de IA ou os segredos. O SQL de remoção de limites internos da IA não é alterado por esta correção.

## Banco e permissões

O SQL é aditivo: cria consultas novas sem redefinir as antigas e sem alterar tabelas, políticas, respostas, entrevistas, pesquisas ou documentos existentes.

- `survey_report_grouped_questions`: distribuição tratada para a gestão, usando o snapshot da revisão local.
- `survey_report_grouped_cross`: cruzamentos tratados para a gestão.
- `client_report_grouped_questions`: distribuição do documento publicado do cliente autenticado.
- `client_report_grouped_cross`: cruzamentos do mesmo documento publicado.
- `_report_grouped_value`: auxiliar privado, sem permissão de execução direta para clientes, usuários autenticados ou anônimos.

As consultas do cliente exigem sessão autenticada, vínculo com a pesquisa, liberação dos resultados e documento publicado da própria conta. Não recebem categorias arbitrárias enviadas pelo cliente. As novas consultas não fazem fallback para respostas brutas se estiverem ausentes.

## Verificações realizadas

- Suíte de regressão do aplicativo em cópia isolada e verificação de sintaxe JavaScript.
- Testes de carregamento dos agrupamentos antes de salvar, gerar e publicar, com chamadas simuladas e dados fictícios.
- Teste de alteração durante a geração, que impede download/publicação do snapshot desatualizado.
- Teste de carga concorrente do rascunho com uma única consulta.
- PostgreSQL local em memória: mapeamento de categorias antes da agregação, equivalência entre gestão e cliente, seis dimensões, ausência de textos originais, preservação de bases, publicação/vínculos e negação de acessos indevidos.
- Chromium em cinco tamanhos de tela, incluindo celular, verificando a legibilidade e a ausência de transbordamento da página.
- PDF completo com dados fictícios: categorias por pergunta, percentuais e cruzamentos de seis variáveis. O texto extraído do PDF não contém os marcadores dos textos originais.
- Integridade dos SQLs anteriores, da função de IA, do CSS e do clone publicado preservada.

**Limitação da validação:** os testes PostgreSQL são locais com mocks mínimos de autenticação; não reproduzem toda a configuração real de RLS/Supabase. Não houve teste com os dados privados reais, execução de migration remota ou publicação automática de um relatório de cliente.
