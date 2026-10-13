# PesquisaPro v156 — lotes ajustáveis e erros específicos da IA

**Situação:** correção preparada e validada localmente em 13/10/2026. Não publicada no GitHub/Vercel nem implantada no Supabase. A v155 continua em produção. O usuário já executou o SQL de controle, implantou a função e informou ter cadastrado a chave no Supabase. Não foi acessada nem copiada a chave de produção, e nenhuma resposta de produção foi enviada em nossos testes.

## O limite de 120 não é um limite da pergunta inteira

O limite é de **120 textos diferentes por solicitação**, não de 120 entrevistas nem de 120 ocorrências. Uma resposta repetida pode representar várias entrevistas: as frequências continuam sendo as originais.

A captura mostra 562 textos diferentes. Para percorrer todos com lotes de até 120, são necessários 5 envios: quatro de 120 e um de 82. Com lotes de 40, são 15 envios, sendo o último de 2. Textos com possíveis contatos são excluídos pelo servidor e precisam ser tratados manualmente; textos já agrupados ou analisados nesta abertura não entram de novo por padrão.

Os envios continuam sendo acionados pelo usuário. Não há repetição automática de solicitações, nem aplicação automática de sugestões. Os limites de até 2 solicitações por minuto e 40 em janela móvel de 24 horas por gestor permanecem. Tentativas reservadas, inclusive falhas, consomem esse limite.

**Lotes são independentes.** A IA não faz uma reconciliação global automática entre os 562 textos. Confira categorias equivalentes entre lotes. Nomes exatamente iguais podem completar uma categoria pelo fluxo existente; nomes diferentes precisam de revisão e ajuste manual. Em uma pergunta sobre marca e modelo de veículo, modelos diferentes não devem ser unidos só porque pertencem à mesma marca.

## O que foi identificado no erro

A mensagem da v155 “A IA não concluiu uma sugestão válida no prazo” era usada para qualquer exceção na chamada e na validação. Portanto, a captura sozinha não comprova que a causa foi tempo excedido: saída truncada, JSON inválido, IDs repetidos, cobertura incompleta ou categorias inválidas também produziam a mesma mensagem.

A v155 impunha 60 segundos à chamada da OpenAI, enquanto o navegador aguardava até 90 segundos. A nova versão dá 90 segundos à chamada da OpenAI e até 125 segundos ao navegador. É uma margem maior, não garantia de conclusão. A validação da base permanece separada e protegida.

A documentação do Supabase informa limite de resposta de 150 segundos e duração de 150 segundos no plano gratuito ou 400 segundos nos pagos. A versão usa prazos inferiores a esses limites, mas rede, validação e outras etapas também consomem tempo. Se houver timeout, prefira menos textos.

## Alterações da v156

- Seletor visível de **20, 40, 80 ou 120 textos por envio**.
- Padrão recomendado de **40**, preservando a opção de 120.
- O botão mostra o tamanho escolhido. A tela explica que o lote não limita a pergunta inteira.
- Mensagens diferentes para prazo excedido, limite de geração, recusa, resultado incompleto, JSON inválido, categoria inválida e falha de conexão.
- Falhas não marcam o lote como concluído e não repetem a chamada automaticamente.
- Permanecem consentimento explícito, validação contra o banco, filtros de contato, sessão de gestão ativa, quota e revisão humana.
- Nenhum texto original, frequência, pesquisa, coleta, pagamento, contrato ou senha é alterado pela geração de sugestões.
- CSS e SQLs anteriores preservados integralmente. **Não há migration nova. Não execute o SQL de controle novamente.**

## Teste imediato com a versão atual

Antes de qualquer atualização, selecione manualmente 10 a 20 textos originais adequados e sem dados pessoais. Com seleção, a v155 envia apenas esses textos, respeitando o máximo de 120. Gere a sugestão e revise sem aplicar automaticamente. Se funcionar, isso ajuda a avaliar a sensibilidade ao tamanho do lote, mas não confirma a causa da falha anterior.

## Atualização após autorização de publicação

1. Publicar o frontend v156 no GitHub/Vercel somente após autorização específica. Cache da versão: `20261013130500`.
2. Confirmar a versão no domínio público e atualizar a página do aplicativo.
3. No Supabase, abrir **Edge Functions → suggest-open-answer-groups → Code**.
4. Substituir somente o conteúdo de `index.ts` pelo arquivo **`ativacao-manual/index.ts`** deste pacote. Essa cópia já importa `./file2.ts`, conforme os nomes que o usuário criou no editor.
5. Manter `file2.ts` como está: o auxiliar não mudou. A cópia em `ativacao-manual/file2.ts` está incluída somente para conferência ou recuperação. O código canônico em `supabase/functions/suggest-open-answer-groups/index.ts` continua importando `./core.mjs`.
6. Implantar novamente a função e manter JWT ativado. Não trocar o nome da função, não executar SQL e não alterar a chave de API.
7. Testar primeiro com 20 textos sem dados pessoais. Confirmar a geração, a edição do nome, a seleção explícita de uma categoria, a aplicação e a gravação do rascunho.
8. Confirmar que totais e textos originais permanecem preservados. Em caso de falha, registrar somente a mensagem visível, sem segredo, token ou dados pessoais.

**Importante:** publicar o frontend não atualiza a Edge Function. Os dois passos precisam ser concluídos. Não atualize apenas a função mantendo o frontend antigo, pois o navegador da v155 ainda tem o prazo anterior.

## Validação concluída

- **111 smoke tests passaram**, executados em cópia isolada, incluindo teste novo de continuação entre lotes, tamanho ajustável, erro sem retry e preservação de totais.
- Verificação de sintaxe dos JavaScript e `deno check` da função canônica passaram.
- **14 cenários HTTP sintéticos** passaram para sucesso, timeout, cancelamento, rede, erro do provedor, limite de uso, JSON inválido, truncamento, recusa, filtro de conteúdo, retorno ausente, JSON do conteúdo inválido, cobertura incompleta e IDs repetidos.
- Testes anteriores de autorização, origem, conferência contra a base, filtros de contato e limites passaram.
- Teste DOM de consentimento, seletor, edição de rótulo, revisão explícita, aplicação, desfazer e cancelamento passou.
- Prévias sintéticas inspecionadas em desktop e celular, sem sobreposição no seletor ou nos botões.
- Nenhuma chamada real ao modelo foi feita nesta correção. Os testes de HTTP usam respostas simuladas; o teste final em produção ainda está pendente.

## Referências

- [Limites oficiais de Edge Functions do Supabase](https://supabase.com/docs/guides/functions/limits)
- [Structured Outputs da OpenAI: saídas incompletas e outros casos de erro](https://developers.openai.com/api/docs/guides/structured-outputs)
