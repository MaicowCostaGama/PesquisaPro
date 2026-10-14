# PesquisaPro v165 — Excel de respostas por pergunta

## O que foi acrescentado

Na aba **Relatórios**, a gestão pode baixar um arquivo Excel verdadeiro (`.xlsx`) com **todas as perguntas abertas e fechadas**, separadas em abas. Também há um botão em cada pergunta para baixar apenas aquela pergunta.

A exportação apresenta distribuições agregadas: uma linha por resposta, alternativa ou categoria, acompanhada de quantidade, percentual e base de cálculo. Não é uma planilha com uma linha por entrevista ou dados individuais de entrevistados.

## Como usar após a publicação

1. Entre com um perfil ativo de gestão que já tenha acesso aos relatórios.
2. Abra **Relatórios** e selecione a pesquisa correta, incluindo as concluídas.
3. No seletor **Conteúdo do Excel**, escolha:
   - **Resultados tratados**: categorias revisadas substituem seus membros; respostas que não pertencem a categorias continuam pelo texto original. Quando não há agrupamentos, os textos originais são apresentados normalmente.
   - **Respostas originais**: exporta os textos e alternativas sem aplicar agrupamentos. É a opção destinada à análise interna.
4. Clique em **Baixar todas as perguntas em Excel** para obter uma aba por pergunta.
5. Para obter somente uma pergunta, use **Baixar esta pergunta em Excel** no cartão correspondente. O botão segue o mesmo modo escolhido no seletor do topo.

## Organização do arquivo

- **Informações**: pesquisa, data de geração, modo escolhido, critérios e avisos de privacidade.
- **Resumo**: relação das perguntas, nomes das abas, quantidades e bases.
- **Q01 Aberta**, **Q02 Fechada** etc.: resposta/categoria, quantidade, percentual numérico, base percentual e tipo de resultado.
- Cada aba identifica o enunciado completo e o tipo da pergunta.
- As alternativas cadastradas de escolha única e múltipla escolha que não tiveram ocorrências também são incluídas com quantidade zero.
- Ranking e duas respostas preservam os rótulos de posição/tipo devolvidos pela consulta existente.

## Contagens e percentuais

- Usa a base de entrevistas válidas, sem incluir rejeitadas ou coletas de calibração.
- Lê a consulta paginada completa, sem usar o limite de 100 resultados mostrado nos cartões da tela.
- Nas abertas, respeita a base escolhida nos agrupamentos: respostas preenchidas da pergunta ou entrevistas válidas.
- Nas fechadas, informa o percentual sobre entrevistas válidas.
- Quantidade e percentual são células numéricas, próprias para cálculo no Excel.
- Múltipla escolha, ranking e duas respostas podem somar mais ocorrências que entrevistas e mais de 100% sobre a base válida. Isso é identificado nas informações do arquivo; não se apresenta a soma de ocorrências como número de entrevistados.
- Quando `(sem resposta)` é retornada pelo servidor, a linha é preservada. Na aberta calculada sobre respondidas, seu percentual fica vazio porque ela não integra essa base.
- Os rótulos já tratados pela consulta oficial não são agrupados novamente no navegador, evitando contagem duplicada.

## Preservação e segurança

- Exportar não salva a estrutura, não publica o relatório e não altera respostas nem categorias.
- O modo tratado usa a revisão atual carregada no aplicativo. Para persistir alterações de categorias, continue usando o fluxo existente de salvar agrupamentos/estrutura.
- O arquivo não acrescenta IDs de entrevistas, GPS, dados financeiros, credenciais ou cadastros de pesquisadores.
- Textos livres podem conter dados pessoais. **Revise antes de compartilhar; agregação não significa anonimização.**
- Valores textuais são gravados como texto, não como fórmulas ou hyperlinks automáticos, preservando inclusive números com zeros iniciais.
- Se houver erro de consulta, troca de sessão/pesquisa ou mudança dos agrupamentos durante a exportação tratada, nenhum arquivo parcial é baixado.
- O limite de texto de uma célula Excel é verificado. Um texto que exceda esse limite não é cortado silenciosamente: o arquivo deixa de ser gerado e aparece uma mensagem explicativa.
- As permissões do banco e dos clientes permanecem inalteradas. Os novos botões foram adicionados somente à área de gestão.

## Ativação

Esta versão é uma alteração de frontend e **não exige novo SQL nem atualização de Edge Function**. Reutiliza as consultas completas já existentes na v163/v164. O SQL v163 anteriormente executado com sucesso não deve ser reaplicado apenas por causa desta exportação.

A publicação no GitHub/Vercel ainda depende de autorização específica para a **v165**.

## Validações locais

- 121 testes de regressão do aplicativo passaram em cópia isolada.
- 54 verificações específicas da exportação: arquivos XLSX reais, categorias, originais, respostas fechadas, bases percentuais, tipos de célula e falhas seguras.
- Downloads globais e individuais validados em desktop, tablet, celular, tela estreita e paisagem.
- Caso com mais de 1.250 respostas distintas verificou a presença da última resposta no arquivo, apesar do limite visual da tela.
- Dez arquivos baixados conferidos também com uma segunda biblioteca Excel, verificando integridade do ZIP, células numéricas, textos e ausência de fórmulas.
- SQLs, função de IA e clone publicado preservados. CSS anterior mantido integralmente, com estilos novos apenas anexados.

Os testes de download utilizaram dados fictícios identificados como tais. Nenhuma resposta real foi exportada durante esta implementação e não houve operação remota no Supabase, GitHub ou Vercel.
