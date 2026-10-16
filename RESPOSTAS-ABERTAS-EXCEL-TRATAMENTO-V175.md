# PesquisaPro v175 — tratar respostas abertas no Excel e reimportar com os vínculos preservados

## O que esta versão faz

Permite baixar um **modelo Excel com uma linha por resposta de pergunta aberta**, fazer o tratamento manual fora do aplicativo e importar o resultado em **uma nova versão da base de tabulação isolada**.

Cada linha mantém os identificadores da pesquisa, da base congelada, da pergunta, da resposta, da entrevista e do subcampo, quando existir. Assim, dois textos diferentes podem receber o mesmo texto tratado e continuar ligados às suas entrevistas e às respostas das outras perguntas.

**A coleta original nunca é atualizada por este fluxo.** O snapshot original da v171 e as versões anteriores permanecem preservados. Não há IA nem agrupamento automático.

## Pré-requisitos e ativação

1. As funcionalidades de bases isoladas da **v171** precisam estar ativadas.
2. Para clientes com acesso total, a leitura integral da **v172** precisa estar ativada. A v173 mantém o limite de três variáveis; a v174 fornece tabelas nos cruzamentos de duas variáveis.
3. A gestão deve executar **manualmente** a migration `deploy/respostas-abertas-excel-v175.sql` no SQL Editor do Supabase. O agente não executa SQL na produção.
4. O frontend v175 precisa ser publicado no GitHub/Vercel. O pacote preparado não equivale à publicação.
5. Atualize a página do aplicativo após a implantação.

Não há nova Edge Function, chave de API ou serviço externo de IA para configurar.

## Passo a passo

### 1. Criar ou escolher uma base congelada

Em **Relatórios**, selecione a pesquisa e abra **Bases de tabulação isoladas**. Crie uma cópia ou escolha uma base já existente.

A base contém apenas as entrevistas elegíveis no momento da criação. Coletas posteriores não entram automaticamente nessa cópia. Caso queira incluí-las, crie outra base. A troca de fonte não mistura uma resposta tratada de uma base com variáveis de outra.

### 2. Baixar o modelo para tratamento

No painel **Tratar perguntas abertas no Excel**, escolha todas as perguntas abertas ou uma pergunta específica e clique em **Baixar Excel para tratar**.

O arquivo contém:

- **Instruções**: pesquisa, base, versão de origem e orientações.
- **_Controle**: identificação do formato, pesquisa, base, versão, revisão, fingerprint e abas/perguntas do arquivo.
- **Q01, Q02…**: uma aba por pergunta aberta selecionada, com uma linha por resposta. O número corresponde à posição da pergunta no questionário congelado.

As perguntas fechadas não precisam ser editadas no modelo: suas respostas já estão na mesma base congelada e continuam disponíveis nos resultados e cruzamentos.

> O Excel comum de totais, disponível nos relatórios, **não é o modelo de reimportação**. Use o botão específico “Baixar Excel para tratar”.

### 3. Editar somente as colunas permitidas

| Coluna | Finalidade | Pode alterar? |
| --- | --- | --- |
| ID pesquisa | Identifica a pesquisa | Não |
| ID base | Identifica o snapshot congelado | Não |
| ID versão origem | Identifica a versão da qual o arquivo foi exportado; vazio no original congelado | Não |
| ID pergunta | Mantém a pergunta de origem | Não |
| ID resposta | Identifica a resposta individual | Não |
| ID entrevista | Mantém o vínculo com as outras perguntas respondidas na mesma entrevista | Não |
| ID subcampo | Identifica o campo de origem, quando existir | Não |
| Texto original | Preserva o texto coletado | Não |
| Texto original nulo | Distingue ausência de texto de um texto vazio | Não |
| Valor numérico original | Preserva o valor numérico como texto, sem arredondamento no Excel | Não |
| **Ação** | Escolhe MANTER, TRATAR ou ORIGINAL | **Sim** |
| **Resposta tratada** | Texto usado na nova versão quando a ação é TRATAR | **Sim, com TRATAR** |

Ações disponíveis:

- **MANTER**: conserva o resultado da versão de origem para essa linha. Em um modelo exportado do original, mantém a resposta original.
- **TRATAR**: usa o texto preenchido em **Resposta tratada**, após remover espaços nas extremidades. Limite: **1.000 caracteres**. Preencher a coluna sem escolher TRATAR não aplica a mudança.
- **ORIGINAL**: remove o tratamento daquela resposta **na nova versão**, voltando ao texto original. Não edite a coluna “Resposta tratada” nessa ação; o aplicativo consulta o original preservado pelos IDs.

Exemplo:

| Texto original | Ação | Resposta tratada |
| --- | --- | --- |
| Fiat Uno | TRATAR | Fiat |
| Uno da Fiat | TRATAR | Fiat |
| Nissan March | MANTER | |

As duas primeiras linhas passam a ser contadas como “Fiat” na nova versão, mas continuam sendo duas respostas individuais, ligadas a entrevistas distintas quando assim estiverem na origem.

Não apague linhas, não copie IDs de outras respostas, não altere o controle nem os cabeçalhos. Pode ordenar **linhas completas**, sem separar as colunas. Use texto simples: fórmulas reais, macros, links ativos e arquivos inválidos são recusados. Uma resposta originalmente vazia não pode virar resposta preenchida por este fluxo.

### 4. Revisar e importar

1. Dê um nome à nova versão.
2. Selecione o arquivo `.xlsx` preenchido no mesmo painel.
3. O aplicativo lê novamente os registros da base e confere identidade, originais, perguntas, número de linhas, revisão e fingerprint.
4. Examine o resumo e a amostra das mudanças. **Até aqui nada foi gravado.**
5. Clique em **Confirmar importação em nova versão** e confirme a pesquisa, a quantidade e o nome apresentado.

A importação é transacional: uma linha inválida impede a operação inteira. A revisão permanece disponível se ocorrer uma falha temporária; uma retentativa do mesmo upload reutiliza um identificador idempotente para evitar criar versões duplicadas por uma resposta de rede perdida.

Se exportou somente uma pergunta, os tratamentos das perguntas não incluídas são herdados da versão de origem. O original congelado continua preservado. As versões importadas são imutáveis; para mudar o tratamento, exporte novamente e importe **outra versão**.

### 5. Usar a versão no relatório

A importação **não troca automaticamente** a fonte do relatório.

1. Selecione o cliente destinatário na estrutura do relatório.
2. Selecione a versão tratada no laboratório.
3. Clique em **Usar esta versão no rascunho do relatório**.
4. Confirme a base, a pesquisa, o cliente e a quantidade de entrevistas.
5. Clique em **Salvar estrutura**.

A fonte escolhida fica identificada na estrutura. Resultados por pergunta, Excel de resultados e novos PDFs/cruzamentos passam a usar os textos tratados e os demais registros da **mesma cópia congelada**.

Para voltar, clique em **Voltar à coleta original no relatório** e depois em **Salvar estrutura**. Isso restaura o uso da coleta original atual, **sem excluir a base isolada ou qualquer versão tratada**.

## Cruzamentos e percentuais

- Continuam limitados a **três variáveis**.
- Duas variáveis produzem **tabelas**, com a primeira nas linhas e a segunda nas colunas; a terceira é o recorte.
- Os cruzamentos usam o ID de entrevista da cópia, e não uma associação por texto, posição da linha no Excel ou nome da pessoa.
- Cada entrevista participa uma vez em cada combinação; respostas múltiplas formam um conjunto, conforme o modelo vigente.
- Nas perguntas abertas, a base percentual é a quantidade de entrevistas que responderam à pergunta. As tabelas de cruzamento usam a base total da cópia, incluindo ausência de resposta conforme identificado pelo sistema.
- Mapas de coleta permanecem sendo consultas da coleta atual; o snapshot de tabulação não duplica localização, áudio, dados financeiros ou operação de campo.

## Clientes com acesso total

Clientes continuam em **modo somente leitura**: podem consultar os resultados da fonte destinada à própria conta, baixar Excel e calcular cruzamentos temporários. Não podem importar, selecionar ou salvar a fonte do relatório, editar respostas, criar versões ou publicar PDFs.

Os PDFs anteriormente publicados não são modificados por uma troca de fonte. Para disponibilizar um PDF com o tratamento novo, a gestão precisa gerar/publicar uma nova entrega pelo fluxo existente.

## Limites e proteção

- Modelo/upload: até **100.000 linhas de respostas abertas** e arquivo `.xlsx` de até **15 MB**.
- Leitura paginada de 500 registros, com conferência de total e revisão. Nenhuma planilha parcial é apresentada como completa.
- Limites de descompressão e de células evitam processar arquivos desproporcionalmente grandes.
- IDs e valores numéricos são exportados como texto para preservar identidade e precisão.
- Se a fonte tratada estiver inválida, sem autorização ou sem a migration, a operação falha; o aplicativo não a substitui silenciosamente pela coleta original.
- Textos livres podem conter dados pessoais. A exportação por resposta é restrita à gestão e deve ser guardada e compartilhada com cuidado.

## Estado de preparação

O código e a migration são preparados e testados com dados fictícios, somente em ambiente local. A publicação e a aplicação manual do SQL são etapas separadas. Nenhuma coleta real é exportada ou alterada durante essa preparação.

## Validação desta entrega

- **119 testes de regressão JavaScript**, sem falhas, e sintaxe verificada.
- **40 cenários PostgreSQL locais**, sem falhas: exportação de mais de 1.200 respostas, importação e retorno ao original, herança, idempotência, adulteração de IDs/valores, imutabilidade, permissões e contagens.
- **Cinco telas Chromium**: desktop, tablet, celular, paisagem e janela reduzida, com arquivos XLSX reais, upload revisado, tabelas e acesso do cliente somente leitura.
- CSS anterior preservado, com alterações aditivas. Migrations anteriores e Edge Functions intactas. Clone de publicação sem alterações nesta etapa.

Essas verificações locais não substituem a conferência da implantação e um teste de uso após executar manualmente o SQL e publicar a v175.
