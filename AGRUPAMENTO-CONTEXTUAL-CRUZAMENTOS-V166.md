# PesquisaPro v166 — classificação contextual e cruzamentos por códigos

**Estado:** implementado e validado em ambiente local, com demonstração de interface. **Não publicado no GitHub/Vercel nem implantado no Supabase nesta etapa.** A autorização recebida foi implementar para testar. A versão publicada permanece a v165.

## 1. O que muda

O agrupamento passa a ter um **dicionário persistente por pergunta**. Cada categoria possui código estável, nome, definição, exclusões e exemplos. A classificação usa a pergunta real, o critério revisado e o mesmo dicionário nos lotes seguintes.

Há duas etapas diferentes:

1. **Sugerir categorias da pergunta:** apresenta propostas de categorias, definições, exclusões e exemplos. Não cria categorias automaticamente e não classifica os exemplos automaticamente.
2. **Classificar com categorias revisadas:** associa sugestões de códigos já existentes aos textos do lote. Não pode inventar categorias nesta operação. Você marca as categorias desejadas antes de aplicar.

A OpenAI continua sendo o mecanismo de análise linguística. A melhoria não é apenas trocar de modelo: é separar descoberta de classificação, fixar os códigos e critérios e validar integralmente a resposta. O modelo padrão da função nova é `gpt-5`, com esforço de raciocínio `low`. Pode ser alterado em `OPENAI_CONTEXTUAL_MODEL` nos Secrets do Supabase.

## 2. Revisão, manutenção e preservação

- Abrir o editor não envia nada à IA nem converte os agrupamentos existentes automaticamente.
- **Preparar definições para revisão** preenche o rascunho do dicionário; revise e salve explicitamente os metadados para ativar a classificação contextual da pergunta.
- Categorias já existentes mantêm os códigos ao receber definições ou ser renomeadas. Categorias vazias podem continuar no dicionário.
- A interface preserva os textos originais, a frequência de cada texto e as respostas armazenadas nas entrevistas.
- Sugestões e atribuições começam desmarcadas. A confiança é qualitativa, não é probabilidade de acerto.
- Alterar os critérios ou definições invalida a revisão antiga. Desfazer não sobrepõe edições posteriores feitas fora daquela aplicação.
- Reavaliar textos já categorizados é **opt-in**. Ao aplicar, substitui apenas os vínculos dos textos expressamente selecionados.
- O botão do rodapé **Salvar agrupamentos na estrutura** é o passo de persistência no relatório. Exportar não salva nem publica.
- Permanecem as abas Não categorizadas / Categorizadas / Todas e a união manual de categorias.

## 3. Uma categoria ou vários temas

A escolha padrão é **uma categoria por texto**. Isso evita mudar silenciosamente a metodologia de pesquisas existentes. Quando uma resposta menciona assuntos diferentes, a análise pode deixá-la pendente para revisão.

A opção **Permitir múltiplos temas por resposta** é explícita por pergunta. Ative somente se for adequada ao objetivo da pergunta e ao dicionário revisado.

Exemplos de critérios:

| Pergunta | Critério sugerido |
|---|---|
| Qual a marca e o modelo do seu veículo? | Identificar a combinação marca/modelo; juntar apenas grafias e abreviações inequívocas da mesma combinação. Fiat Palio e Fiat Uno continuam separados. |
| Qual empresa vem primeiro à sua mente? | Identificar a empresa mencionada; juntar grafias equivalentes, mas não marcas distintas ou opiniões sobre a empresa. |
| Por que você não contrataria o serviço? | Classificar os motivos explícitos; preço alto, cobertura insuficiente e atendimento ruim são temas distintos. Não confundir recomendação com não recomendação. |

Evite categorias redundantes e hierárquicas sem objetivo analítico: por exemplo, “Fiat” e “Fiat Palio” simultaneamente não são necessariamente dois temas independentes. A descoberta sugere; você define o dicionário final.

## 4. Cruzamentos corretos

As consultas novas transformam as respostas usando o snapshot de agrupamento **antes de agregar**, mantendo o vínculo por entrevista no banco. O frontend não tenta inferir cruzamentos a partir de totais de perguntas separadas.

- A identidade é o código da categoria, não apenas seu nome.
- Um nome de categoria igual a um texto ainda não agrupado não mistura os dois resultados. São distinguidos como categoria ou texto original.
- Cada entrevista conta no máximo uma vez por categoria e combinação.
- Com múltiplos temas, uma entrevista pode aparecer em várias células. **TOTAL, total da linha, total da coluna e total do recorte usam entrevistas únicas**, não a soma das células.
- Até seis variáveis permanecem disponíveis. Os recortes conservam rótulos, códigos e base correta.
- O PDF, o CSV e o Excel tratado usam as mesmas categorias e bases. O Excel tratado inclui código estável e percentuais numéricos.
- Sem agrupamento: mostra respostas originais. Com agrupamento parcial: mostra categorias e textos ainda não vinculados. Com agrupamento completo: mostra as categorias.
- O cliente usa o snapshot do relatório publicado. Um rascunho em edição não altera retroativamente esse snapshot.

### Exemplo de incidência

Três entrevistados podem produzir seis células preenchidas se respostas tiverem vários temas. Nesse caso, o TOTAL continua sendo **3 entrevistas**, e não 6. A soma de percentuais de presença pode exceder 100%, mas cada célula e cada base permanecem identificadas.

## 5. Demonstração sem dados reais

Endereço temporário:

https://8776-iz7b2djrvb86bxyv2wq8m-e7f7cf86.us1.manus.computer/

A demonstração usa apenas textos fictícios e **respostas simuladas da IA**. Não chama a OpenAI, não usa login real, não salva no Supabase e não representa uma implantação do aplicativo.

Para testar a revisão:

1. Abra a demonstração e examine o critério e o dicionário.
2. Marque o consentimento demonstrativo.
3. Clique em **Classificar com categorias revisadas**.
4. Confira que nada foi aplicado. Marque manualmente uma categoria em um texto e aplique.
5. Veja os contadores e a aba de não categorizadas se atualizarem.
6. Experimente desfazer, revisar critérios e pedir propostas de categorias.

O endereço é temporário. O pacote completo contém uma cópia portátil em `demonstracao-v166/`, que funciona localmente abrindo `index.html`.

## 6. Ativação no aplicativo real — somente após autorização de publicação

### A. SQL manual

Você já executou o SQL v163 com sucesso. Não precisa reaplicá-lo. A função de classificação contextual e os cruzamentos tipados exigem a **migration nova**:

`deploy/relatorios-codigos-contextuais-v166.sql`

Ela é aditiva, cria consultas e helpers novos e não apaga pesquisas, entrevistas, respostas, pagamentos ou agrupamentos. Não desativa RLS. O SQL precisa ser executado por você no SQL Editor do projeto correto: `soejywbqjgqsrluhbyit`.

Após execução completa, a mensagem esperada é **Success. No rows returned**. Esta etapa não foi executada remotamente pelo agente.

### B. Nova Edge Function

Não substituir nem excluir `suggest-open-answer-groups`. Criar uma função nova com este nome exato:

```text
classify-open-answers-contextual
```

No editor Supabase, usar os arquivos adaptados do pacote:

- `supabase-editor-v166/index.ts`
- `supabase-editor-v166/file2.ts`

O `index.ts` dessa cópia já importa `./file2.ts`. Não colar a cópia canônica que importa `./core.mjs` junto de um auxiliar chamado `file2.ts`.

Passos:

1. Edge Functions → criar nova função → editor.
2. Nomear `classify-open-answers-contextual`.
3. Substituir todo o conteúdo de `index.ts` pelo arquivo adaptado.
4. Criar o auxiliar `file2.ts` e colar todo o seu conteúdo.
5. Clicar em **Deploy function**.
6. Manter **Verify JWT** habilitado. A função também valida a sessão e o perfil internamente.

A função antiga continua disponível para perguntas ainda não ativadas no novo método.

### C. Secrets

O segredo obrigatório continua sendo `OPENAI_API_KEY`. Se já existe nos Secrets do mesmo projeto Supabase, a função nova pode utilizá-lo. Não é necessário enviá-lo ao agente nem colá-lo no código.

Opcional: `OPENAI_CONTEXTUAL_MODEL=gpt-5`. A função já usa esse padrão se o segredo opcional não existir. `OPENAI_GROUPING_MODEL` da função antiga não é o nome da configuração nova.

`APP_ALLOWED_ORIGINS` aceita por padrão os dois domínios do PesquisaPro. Não configurar manualmente service-role, nem colocar chave OpenAI no Vercel, frontend, SQL ou GitHub.

A remoção de cotas internas já aplicada pelo usuário permanece preservada. A função usa a mesma RPC de registro de solicitações; não introduz limite diário próprio. Limites do provedor continuam independentes.

### D. Frontend

A v166 deve ser publicada no GitHub/Vercel mediante **nova autorização explícita**. Nesta entrega ela permanece local. O backup versionado foi preparado antes de qualquer pedido de publicação.

Recomenda-se SQL e função disponíveis antes do teste real da interface nova. Nenhuma migration ou implantação Supabase será executada automaticamente.

## 7. Teste funcional após ativação

Comece em uma pergunta com poucos textos sem dados pessoais. Inicialmente use lotes de **5 ou 10 textos**, com dicionário curto e específico.

1. Relatórios → pergunta aberta → Agrupar respostas.
2. Preparar e revisar critério, definições e exclusões; salvar metadados explicitamente.
3. Revisar propostas, criar somente as categorias úteis, sem duplicações ou temas redundantes.
4. Classificar; conferir sugestão e motivo de cada texto; marcar e aplicar somente o que estiver correto.
5. Confirmar que os textos e totais originais permanecem intactos.
6. Salvar agrupamentos na estrutura.
7. Montar um cruzamento simples com uma pergunta fechada, depois ampliar até seis variáveis.
8. Conferir contagens e bases; gerar PDF e Excel tratado.
9. Só depois da revisão, finalizar e disponibilizar ao cliente. PDFs antigos são estáticos e precisam ser gerados novamente; não são reescritos automaticamente.

Se um texto for ambíguo, deixe-o pendente e revise manualmente. Completar o tratamento não significa forçar todas as respostas para categorias inadequadas.

## 8. Validação realizada e limites

- **123 scripts da suíte de regressão passaram**, incluindo duas novas regressões de revisão contextual e exportações por código.
- 15 testes do módulo/schema e 4 testes HTTP sintéticos passaram; checagem Deno da função canônica e da cópia do editor passou.
- Editor contextual e relatório/PDF testados no Chromium em cinco dimensões de tela.
- PDF completo conferido por extração, incluindo 1.250 respostas não agrupadas sem corte.
- Excel real gravado e lido novamente, com código estável, percentuais numéricos e sem fórmulas originadas de textos livres.
- PostgreSQL local: autorização, snapshot publicado versus rascunho, respostas antigas por posição, uma a seis variáveis, repetição de categoria na mesma entrevista, nomes iguais, literal `(sem resposta)`, bases únicas e equivalência de saída foram testados.
- Benchmark local com 600, 1.000 e 1.500 entrevistas fictícias e até 80 categorias: o lookup otimizado preservou as mesmas linhas e foi aproximadamente 3,6 a 3,9 vezes mais rápido que o helper contextual não otimizado. Medição PGlite/WASM, **não promessa de tempo em produção**.
- Ensaios finais limitados com modelo real e somente dados fictícios: grafias da mesma empresa, modelos distintos, preço alto versus baixo, negação, múltiplos temas e conteúdo tentando dar instruções ao modelo passaram na classificação; descoberta com exemplo já conhecido separado de tema novo passou. Um teste anterior tinha um exemplo de empresa com elogio de atendimento; sugerir atendimento nesse caso não mede apenas duplicação de empresa. Os registros dessa divergência foram mantidos.
- Durante o desenvolvimento, chamadas com o contrato anterior excederam o limite de geração. O contrato final omite campos proibidos por operação e normaliza a saída internamente; os ensaios finais usaram esse contrato simplificado.

**Não houve teste fim a fim no Supabase de produção com a função nova, nem análise das respostas reais da pesquisa.** Os testes indicam que a implementação está pronta para uma rodada controlada de teste, não que a IA acertará todas as respostas. Os filtros de contatos não removem todos os dados pessoais; nomes e informações sensíveis exigem revisão humana antes do envio e da divulgação.

## 9. Arquivos principais

- `reports-contextual.js`: interface experimental e revisão do dicionário.
- `app.js`: integração, códigos, bases únicas e exportações.
- `style.css`: estilos apenas acrescentados, preservando regras anteriores.
- `supabase/functions/classify-open-answers-contextual/index.ts` e `core.mjs`: função canônica.
- `deploy/relatorios-codigos-contextuais-v166.sql`: SQL manual novo.
- `supabase-editor-v166/`: cópia pronta para o editor manual.
- `demonstracao-v166/`: demonstração portátil, sem IA real.

As funções antigas, os SQLs anteriores e a alteração protegida `deploy/cadastro-pesquisador-senha.sql` no clone de publicação foram preservados byte a byte.
