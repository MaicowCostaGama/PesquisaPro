# PesquisaPro v155 — Sugestões de agrupamento por significado

## Situação desta entrega

Implementação **local**, ainda não publicada nem ativada em produção. A v154 pública permanece inalterada. Não foi executado nenhum SQL no Supabase, instalada função remota ou configurado segredo de produção.

O agrupamento manual continua disponível. A v155 acrescenta sugestões semânticas por IA, sempre com revisão antes de aplicar.

## Como usar após a ativação

1. Abra **Relatórios → pergunta aberta → Agrupar respostas**.
2. Se desejar, selecione os textos originais que devem entrar na análise. Sem seleção, o sistema usa os textos ainda não agrupados e não analisados nesta abertura.
3. Revise o conteúdo e marque a autorização de envio à OpenAI. Não inclua dados pessoais.
4. Clique em **Sugerir com IA (até 120 textos)**.
5. Confira o nome proposto, a justificativa e os textos de cada categoria. Pode editar o nome e retirar textos de uma sugestão.
6. Marque **Aplicar esta sugestão** nas categorias que aprovar e clique em **Aplicar somente sugestões selecionadas**.
7. Confira a prévia e use **Salvar agrupamentos na estrutura** para persistir no rascunho do relatório. Permanecem as exigências existentes de cliente e título.

As caixas de aprovação começam desmarcadas. Gerar uma sugestão não altera categorias, percentuais, respostas originais ou o rascunho.

### Exemplo ilustrativo, não resultado de uma pesquisa

“Está muito caro”, “preço elevado” e “o custo é alto” podem formar **Preço elevado**. “Preço baixo” não deve entrar nesse grupo. Respostas ambíguas ou com vários assuntos devem permanecer separadas para revisão manual.

## Frequências e percentuais

- A IA recebe somente o contexto da pergunta e os textos distintos do lote com identificadores temporários.
- Não recebe contagens, percentuais, GPS, perfil do pesquisador ou IDs de entrevistas.
- A aplicação soma as frequências originais no aplicativo; a IA não determina os números.
- Permanecem as duas bases da v154: **respostas preenchidas desta pergunta** e **todas as entrevistas válidas**.
- Textos não agrupados não desaparecem. A soma das ocorrências é preservada.
- As categorias aprovadas integram a prévia, o CSV e o PDF pelo fluxo existente da v154.

## Limitações e controles

- Até **120 textos distintos por solicitação**, com até 1.200 caracteres cada. Não significa 120 entrevistas.
- Lotes são independentes. Confira equivalências entre lotes. Ao aplicar categorias com o mesmo nome, os textos podem completar essa categoria, sem reatribuir os já agrupados.
- Categorias manuais existentes são preservadas e seus textos não entram na análise por padrão.
- Há controle de até **2 solicitações por minuto e 40 em janela móvel de 24 horas por gestor**. Tentativas reservadas também consomem o limite; não é promessa de custo máximo em dinheiro.
- Fechar a revisão cancela a espera do navegador. Se o provedor já recebeu a solicitação, isso não garante cancelamento do processamento no servidor ou de sua cobrança.
- Mudança de pesquisa, sessão ou categorias durante a análise impede a aplicação de um resultado desatualizado.
- Existe **Desfazer última aplicação da IA**. Após outras edições, utilize **Desfazer agrupamento** na categoria para não descartar alterações posteriores.
- A avaliação “alta/média/baixa” é qualitativa da IA, não probabilidade, margem de erro ou garantia de correção.
- Revisão humana permanece indispensável: a IA pode interpretar uma resposta incorretamente.

## Privacidade e segurança

A função aceita apenas usuários autenticados da gestão ativa, verifica a pergunta na pesquisa indicada e confere os textos contra a distribuição autorizada do banco. Não usa service-role.

E-mails, links e padrões detectáveis de contatos/documentos/contas são excluídos antes da chamada à OpenAI. Essa detecção **não é anonimização completa**: nomes, endereços e outros dados pessoais podem não ser detectados. Selecione somente textos adequados e trate os demais manualmente.

A chave fica em segredo do servidor, nunca no JavaScript publicado. O pedido usa `store: false`; isso não equivale a garantia de retenção zero no provedor. Revise as condições e controles de dados da conta de API usada.

O controle de uso guarda apenas referências do gestor, pesquisa, pergunta e horário; não guarda respostas ou prompts. A função não altera coletas, respostas, pesquisas, pagamentos, comprovantes, contratos ou senhas. Somente o fluxo já existente de salvar rascunho persiste categorias aprovadas.

## Ativação em produção — etapas separadas

**Publicar no GitHub/Vercel não ativa a IA no Supabase.** Não copie a chave do ambiente de teste do Manus para o aplicativo. Use uma chave própria da organização para a API oficial da OpenAI.

### 1. SQL — execução manual pelo usuário

Execute no SQL Editor do projeto `soejywbqjgqsrluhbyit`:

`deploy/controle-uso-ia-respostas-abertas.sql`

A migration é aditiva: cria a tabela de reservas, seu índice, RLS e uma função restrita de reserva. Não remova políticas existentes nem execute outros diagnósticos/migrations para ativar este recurso.

### 2. Segredos no Supabase

No painel de Edge Functions/Secrets, configure:

| Nome | Uso |
| --- | --- |
| `OPENAI_API_KEY` | Chave própria da API oficial da OpenAI, cadastrada diretamente nos segredos do Supabase. Não enviar por mensagem, commit ou frontend. |
| `OPENAI_GROUPING_MODEL` | Opcional. Padrão: `gpt-5-mini`. Se alterar, usar modelo compatível com Chat Completions, JSON Schema estrito e os parâmetros implementados. |
| `APP_ALLOWED_ORIGINS` | Opcional. Padrão: `https://www.pesquisa-pro.com,https://pesquisa-pro.com`. |

`SUPABASE_URL` e `SUPABASE_ANON_KEY` são variáveis disponibilizadas pelo ambiente da Edge Function. Não é necessário configurar service-role para este serviço.

É necessária uma conta de API do provedor com acesso ao modelo e faturamento próprio. A integração não usa automaticamente uma assinatura de chat.

### 3. Instalar a Edge Function

A pasta completa a publicar, com **os dois arquivos**, é:

```text
supabase/functions/suggest-open-answer-groups/
├── index.ts
└── core.mjs
```

Em ambiente com Supabase CLI e credenciais autorizadas, a partir da raiz do projeto:

```bash
supabase functions deploy suggest-open-answer-groups --project-ref soejywbqjgqsrluhbyit
```

Não use `--no-verify-jwt` nem abra a função a usuários anônimos. O código também verifica a sessão e o perfil. Se usar o editor do painel, inclua `core.mjs` junto ao `index.ts`; copiar somente o arquivo principal não basta.

Esta entrega não executa esse comando. A implantação da função precisa ser realizada separadamente com acesso autorizado ao Supabase.

### 4. Publicação e teste final

Após autorização específica, publicar o frontend v155 no GitHub/Vercel. Testar na sessão de gestão: geração, revisão de uma sugestão, aplicação e gravação do rascunho. Confirmar que o CSV/PDF e o retorno à pesquisa mantêm a categoria salva.

Se o SQL, segredo ou função ainda não estiverem ativados, o botão apresentará uma mensagem de indisponibilidade e nenhuma categoria será aplicada. O agrupamento manual continua funcionando.

## Validação realizada

- Testes funcionais de consentimento, cobertura completa do lote, rejeição de IDs inválidos/duplicados, aplicação apenas selecionada, soma, reversão e isolamento de sessão.
- Servidor testado com HTTP simulado: autenticação, perfis, origem, limites, conferência dos textos na pesquisa, exclusão de contatos e falhas de configuração/provedor.
- DOM com cliques reais simulados e inspeção visual desktop/celular usando somente exemplos sintéticos.
- Um teste com modelo real, via ambiente de teste do Manus e exemplos inventados: equivalências, opiniões opostas, resposta multitemática e instruções embutidas. Nenhuma resposta de produção foi enviada. Esse teste não confirma instalação nem comportamento completo do serviço remoto.
- Verificação TypeScript/Deno da função e parser PostgreSQL da migration. Parser não substitui execução em um banco de homologação.

O funcionamento no Supabase e com a chave própria de produção só poderá ser confirmado após as etapas de ativação.

## Referências

- [Saída estruturada da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Proteção das chaves de API](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)

## Resultado final da validação local

- **110 smoke tests passaram**, além da verificação de sintaxe dos JavaScript, TypeScript/Deno, teste HTTP do servidor e teste DOM da IA.
- CSS anterior preservado integralmente; estilos novos somente acrescentados.
- SQLs do clone de publicação preservados byte a byte, inclusive a alteração preexistente não publicada.
- Cache local: `20261013115400`.
- Nenhuma ativação de produção ou publicação foi feita nesta entrega.
