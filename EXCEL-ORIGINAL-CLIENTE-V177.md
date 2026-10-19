# PesquisaPro v177 — Excel original para clientes

## O que muda

O cliente com acesso total liberado pode baixar os resultados das perguntas da coleta original, inclusive ao consultar uma pesquisa concluída. O download é separado da fonte usada no relatório: se a gestão aplicou um Excel tratado, o novo arquivo original não utiliza esse tratamento.

O botão **Respostas originais (Excel)** aparece nas informações da pesquisa e leva ao painel de download na consulta da coleta. O painel **Respostas originais em Excel** também fica disponível em **Resultados e relatórios**.

## Como usar

1. Entre no perfil do cliente e abra **Minhas pesquisas**.
2. Selecione a pesquisa disponibilizada para a conta.
3. Clique em **Respostas originais (Excel)** ou entre em **Consultar coleta concluída**.
4. No painel **Respostas originais em Excel**, escolha uma pergunta ou **Todas as perguntas**.
5. Clique em **Baixar respostas originais em Excel**.

O arquivo `.xlsx` contém uma aba por pergunta selecionada, com respostas ou alternativas, contagens e percentuais. As perguntas abertas e fechadas são incluídas. Alternativas sem ocorrência permanecem nas planilhas. A exportação lê todas as páginas, sem limitar o arquivo às respostas visíveis na tela.

## Qual fonte é usada

Este download consulta o questionário e os resultados da **coleta original atual** da pesquisa, usando as funções de leitura dos clientes da v172. Não usa a base congelada nem as versões ou os tratamentos da v175/v176.

O botão de Excel já existente na central de resultados continua exportando a fonte selecionada pela gestão. Assim, os dois caminhos ficam identificados: o novo painel é explicitamente original, enquanto a exportação da central mantém o comportamento atual do relatório.

Consultar ou baixar não reabre uma pesquisa concluída. Não é preciso restaurar o original, remover o Excel tratado ou trocar a fonte do relatório para utilizar o novo download.

## Integridade e privacidade

- Só clientes ativos, vinculados à pesquisa não arquivada e com acesso total liberado podem utilizar o painel.
- O servidor aplica a autorização em todas as consultas. O acesso é reconfirmado antes de gerar o arquivo.
- Trocar de perfil, pesquisa, página ou encerrar a sessão durante o download impede a entrega dos dados do contexto anterior.
- Erros de consulta, páginas incompletas ou inconsistências da base impedem a criação de um Excel parcial.
- A base considera entrevistas válidas, sem rejeitadas ou calibração, conforme as consultas originais já existentes.
- A exportação é de resultados por pergunta, não de uma lista identificada de entrevistados: não exporta IDs de entrevistas, contatos, GPS, áudios ou informações financeiras.
- Textos livres ainda podem conter dados pessoais inseridos na própria resposta; devem ser revisados antes de compartilhar o arquivo.
- Textos começando por `=` ou contendo HTML são preservados como texto, sem virar fórmulas ou executar código.

## Somente leitura

Nenhum upload é permitido nesse painel do cliente. O download não edita respostas, tratamentos, questionários, rascunhos, PDFs publicados ou permissões. A fonte tratada da gestão continua intacta.

## Implantação

A v177 é uma alteração somente de frontend e **não exige SQL novo ou atualização de Edge Function**. Ela reutiliza `client_report_structure_v172` e `client_report_overview_v172`, já necessárias para o acesso integral dos clientes.

Se essas consultas não estiverem instaladas em uma implantação antiga, o painel informa a ausência em vez de buscar tabelas administrativas ou apresentar um arquivo parcial. Nenhum SQL é executado automaticamente pelo aplicativo ou pelo agente.

O pacote ZIP deve ser validado antes da autorização de publicação no GitHub/Vercel. Dados de produção não são utilizados nos testes automatizados.

## Validação da entrega

Foram aprovados 123 testes de regressão e verificações de sintaxe JavaScript. A validação Chromium utilizou XLSX real, 1.252 textos abertos em múltiplas páginas e 22 perguntas, incluindo as perguntas finais. As cinco telas — desktop, tablet, celular, paisagem e janela reduzida — não apresentaram overflow horizontal, requisições externas ou erros de página.

Os testes funcionais também cobrem erro intermediário sem arquivo parcial, revogação do acesso, troca de perfil/pesquisa/página e clique repetido. Toda essa validação usa dados fictícios identificados como fixtures, sem consultar dados reais de clientes ou entrevistas.

Este ajuste é o download original do cliente. Ele não depende do carregamento dos resultados tratados e não modifica as consultas SQL da tabulação; a investigação do timeout do relatório tratado é um trabalho separado.
