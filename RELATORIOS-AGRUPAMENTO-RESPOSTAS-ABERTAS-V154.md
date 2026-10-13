# PesquisaPro v154 — agrupamento de respostas abertas

## Resultado

A aba **Relatórios**, no modo **Todas as perguntas**, passa a oferecer **Agrupar respostas** em cada pergunta aberta. A gestão seleciona os textos que representam a mesma resposta e define uma categoria comum. O sistema soma suas ocorrências e recalcula o percentual, sem editar ou apagar as respostas originais da coleta.

A alteração está pronta **localmente**, ainda não publicada. Cache da v154: `20261013105130`.

## Como utilizar

1. Abra **Relatórios** e selecione a pesquisa correta.
2. Na pergunta aberta, clique em **Agrupar respostas**.
3. Marque os textos equivalentes. A busca e a troca de página não apagam sua seleção.
4. Informe um nome, por exemplo **Preço elevado**, ou escolha uma categoria existente.
5. Clique em **Aplicar aos textos selecionados**.
6. Confira as ocorrências, os percentuais e os textos vinculados na prévia.
7. Clique em **Salvar agrupamentos na estrutura**. O salvamento usa o cliente vinculado e o título definidos na estrutura do relatório; ambos precisam estar preenchidos.
8. Ao gerar o PDF, as categorias salvas ou presentes na estrutura enviada ao gerador substituem os textos separados apenas na apresentação dos resultados. A opção **Exportar categorias** gera um CSV compatível com Excel, incluindo frequências, duas bases percentuais e textos originais.

É possível renomear categorias, mover textos para outra categoria ou **Desfazer agrupamento**. Ao desfazer, os textos voltam a aparecer separadamente.

## Regras de percentual

O percentual principal pode usar:

- **Respostas preenchidas desta pergunta** — padrão, indicado para estratificar a distribuição entre as pessoas que efetivamente responderam à pergunta aberta;
- **Todas as entrevistas válidas** — para mostrar o peso da categoria na base válida da pesquisa.

A tela e o CSV identificam as duas bases. Respostas vazias e o marcador `(sem resposta)` não entram na base de respostas preenchidas. Coletas reprovadas e calibrações continuam excluídas pelas consultas existentes.

### Exemplo ilustrativo, usado somente nos testes

| Texto original | Ocorrências |
|---|---:|
| Muito caro | 4 |
| Preço alto | 3 |
| É caro | 2 |
| Bom atendimento | 1 |

Ao agrupar os três primeiros em **Preço elevado**:

- Ocorrências da categoria: **9**;
- Total de respostas preenchidas: **10**;
- Percentual entre respostas preenchidas: **90,0%**;
- Se a pesquisa tiver 20 entrevistas válidas, percentual sobre essa base: **45,0%**.

Percentuais são mostrados com uma casa decimal e podem não somar exatamente 100% por arredondamento. A base responde a uma pergunta aberta simples; o agrupador não faz codificação de vários temas dentro da mesma resposta.

## Revisão semântica

O agrupamento é **manual e revisado pela gestão**, não automático por inteligência artificial. Textos novos, ainda não classificados, continuam separados. Novas ocorrências de um texto já vinculado são somadas à sua categoria quando os agregados são atualizados.

Não juntar opiniões contrárias, marcas diferentes ou assuntos apenas relacionados. Por exemplo, “preço alto” e “preço baixo” não são a mesma resposta. O recurso não altera o mapa de calor nem os cruzamentos: a categorização aplica-se à apresentação por pergunta aberta, ao CSV de categorias e ao PDF do relatório.

## Persistência e segurança

- Categorias armazenadas em `sections.openAnswerGrouping` do rascunho existente do relatório, por pesquisa/cliente;
- Mantidos os controles de acesso já existentes das RPCs de rascunho;
- Edição disponível para perfis de gestão; não disponibilizada ao pesquisador ou cliente;
- Nenhuma gravação em `collection_answers`, nenhuma migração nova e nenhuma alteração de permissões;
- Nenhum envio dos textos a serviços externos de IA;
- Nenhum armazenamento de categorias em `localStorage` ou `sessionStorage`;
- Textos escapados na interface e protegidos contra fórmulas no CSV;
- Estado e modal limpos na troca de sessão/pesquisa;
- Aviso de descarte ao trocar pesquisa/cliente com alterações pendentes e aviso do navegador ao fechar/recarregar a página;
- Se a leitura do rascunho falhar, o agrupador pede nova tentativa antes de editar, evitando sobrescrever categorias anteriores sem conhecê-las;
- Salvamento só é informado como concluído após confirmação da RPC. Se houver alterações durante a gravação, a revisão mais nova continua pendente.

Salvar uma estrutura mantém o comportamento já existente de rascunho: para entregar o PDF atualizado ao cliente, é necessário usar o fluxo de geração/publicação do relatório. A publicação do código do app, por si só, não altera os documentos existentes dos clientes.

## Cobertura de volume e interface

O carregamento paginado da v149 permanece preservado. A prévia exibe as primeiras 100 categorias; o agrupador permite acessar todos os textos por páginas de 50. As bases, o CSV e o PDF usam o conjunto completo carregado, e não apenas os itens visíveis.

Modal responsivo, fechamento por Escape, foco de teclado contido no diálogo e retorno ao botão de origem. Estilos antigos preservados integralmente; apenas regras adicionais no CSS.

## Validações

- Sintaxe de todos os JavaScript: aprovada;
- **109/109 smoke tests**: aprovados;
- Testes de soma, denominadores, reversão, mais de 1.000 textos, isolamento de sessão e segurança de texto;
- Testes de falha de leitura/gravação e de respostas assíncronas tardias;
- Interações DOM com seleção, busca, aplicação, salvamento, revisão concorrente e reidratação;
- PDFs reais gerados com a biblioteca do aplicativo e dados sintéticos: confirmados **90,0%** e **45,0%** nas bases correspondentes, mantendo pergunta fechada inalterada;
- Capturas desktop e celular inspecionadas;
- Conteúdo das migrations locais conferido contra o ZIP v153: integralmente preservado.

Os testes de funcionamento usam dados sintéticos e não classificam respostas reais da pesquisa. A validação na sessão de produção será feita após a publicação autorizada e o uso do recurso pela gestão.

## Entrega e publicação

Pacote: `PesquisaPro-v20261013-agrupamento-respostas-abertas-v154.zip`.

**Não é necessário executar novo SQL.** O recurso reutiliza o armazenamento de rascunhos já existente (`relatorios-pdf-clientes.sql`). Se uma instalação ainda não tiver esse recurso histórico, o app informa a falha; não foi criada nem executada uma migration nesta alteração.

A v153 permanece no clone de publicação. Publicar a v154 no GitHub/Vercel somente após autorização específica do usuário. Manter todo o diretório `deploy/` fora do commit e preservar a alteração preexistente `deploy/cadastro-pesquisador-senha.sql`.
