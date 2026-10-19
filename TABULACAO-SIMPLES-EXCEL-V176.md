# PesquisaPro v176 — Tabulação simples das perguntas abertas

## O que muda

A tabulação deixa de exigir nomes de cópias, criação de versões, atualização de bases ou escolha de uma versão para aplicar ao relatório. A gestão passa a usar um painel direto em **Relatórios**, logo abaixo dos controles da pesquisa:

1. **Baixar Excel para tratar**: escolha uma pergunta aberta ou todas as perguntas abertas.
2. **Enviar Excel tratado**: selecione o arquivo preenchido. O sistema valida os registros, apresenta uma confirmação e aplica o tratamento automaticamente.
3. **Restaurar respostas originais**: confirme para retirar o tratamento da pesquisa e voltar aos resultados da coleta original.

Não é preciso escolher um cliente, criar nome de cópia ou clicar em Salvar estrutura para aplicar o Excel. A estrutura do relatório continua tendo seu salvamento próprio para título, textos, destinatário e cruzamentos; isso é independente da tabulação.

## Como preencher

Use o modelo baixado pelo aplicativo para a mesma pesquisa. Cada linha corresponde a uma resposta e mantém os identificadores necessários para associá-la à entrevista, à pergunta e às demais variáveis.

No novo modelo, preencha a coluna **Resposta tratada** com o texto ou a categoria que deseja divulgar. Uma célula vazia nessa coluna significa usar o original daquela resposta. O texto original não deve ser alterado.

Os identificadores e controles técnicos ficam ocultos para facilitar a edição, mas permanecem no arquivo. Não apague essas colunas, a aba de controle, linhas ou perguntas do modelo. É permitido ordenar linhas inteiras. Não use fórmulas, macros ou links; mantenha os valores como texto. Os controles ocultos são para organização, não substituem a validação no servidor.

O upload aceita modelos por pergunta ou com todas as perguntas abertas. Arquivos antigos da v175 continuam sujeitos à verificação de sua pesquisa, base, versão e ações; não é possível importar um Excel arbitrário sem os vínculos originais. O arquivo de totais exportado em “Baixar todas as perguntas em Excel” não é o modelo de tratamento.

## O que acontece ao enviar outro Excel

Depois da validação e confirmação, o novo arquivo atualiza o tratamento das perguntas que contém. Um arquivo de uma única pergunta não apaga o tratamento das demais perguntas. Para atualizar todas as abertas de uma vez, use o modelo com todas as perguntas.

O servidor conserva uma única fonte ativa de tabulação por pesquisa. A preparação técnica da cópia e dos registros de trabalho acontece automaticamente, sem controles adicionais para o usuário.

Os resultados, Excel de resultados, cruzamentos e novos PDFs passam a usar a fonte ativa. Clientes com acesso total liberado podem consultar esses resultados e fazer os cruzamentos permitidos, sem enviar arquivos ou restaurar dados. O limite de três variáveis e a apresentação tabular dos cruzamentos de duas variáveis permanecem.

## Restaurar ao original

O botão de restauração pede confirmação. Se confirmado, retira o tratamento ativo, limpa a identificação do arquivo e exclui os registros de tratamento gerados pelo novo fluxo simplificado. A coleta original e a base técnica original não são apagadas.

O mesmo botão também permite voltar ao original quando a pesquisa ainda usa uma seleção anterior da v175, sem obrigar a enviar um novo arquivo primeiro. As versões legadas da v175 permanecem preservadas internamente como registros anteriores; a restauração da v176 impede que uma seleção antiga de rascunho volte a aplicá-las aos resultados da pesquisa. O arquivo bruto XLSX não é armazenado no banco: o aplicativo lê e valida seus conteúdos. O aplicativo não pode apagar uma cópia do Excel salva no seu computador.

Após restaurar, pode baixar outro modelo ou enviar novamente um modelo válido da mesma pesquisa, sem criar nomes ou versões.

## Integridade e falhas seguras

- Entrevistas, respostas originais, perguntas fechadas, GPS, áudios, pagamentos, contratos e usuários não são alterados pelo tratamento.
- Os identificadores de cada resposta e entrevista são conferidos no servidor. Não é permitida a associação de uma resposta a outra entrevista ou pesquisa.
- Arquivos incompletos, adulterados, de outra pesquisa ou sem os controles necessários são recusados antes de alterar a fonte ativa.
- A importação e a ativação são transacionais: uma falha não pode deixar somente parte do Excel aplicada.
- Atualizações simultâneas são detectadas. Uma operação tardia não pode sobrescrever uma tabulação mais recente ou reaplicar o tratamento depois de uma restauração.
- Resultados tardios de outra pesquisa ou sessão não são apresentados como se fossem da seleção atual.
- Cancelar a confirmação de upload ou de restauração não modifica o tratamento.
- A tabulação usa a base de entrevistas que acompanha o modelo exportado, preservando as variáveis de origem. Não deve ser tratada como cópia automaticamente sincronizada com novas coletas ou auditorias posteriores.
- Mapas continuam mostrando a coleta, não categorias editadas no Excel. PDFs já publicados permanecem intactos; gere um novo PDF para divulgar os resultados atualizados.

## Ativação

A v176 requer a migration aditiva **deploy/tabulacao-simples-excel-v176.sql**, aplicada manualmente pelo administrador no SQL Editor do Supabase. O frontend deve ser publicado no GitHub/Vercel e a página deve ser atualizada.

A migration pressupõe as funcionalidades de bases isoladas, leitura dos clientes e tratamento Excel instaladas anteriormente nas v171, v172 e v175. Nenhuma migration anterior deve ser substituída por este arquivo.

O desenvolvimento e a validação não executam SQL no Supabase real, não importam planilhas reais, não restauram pesquisas e não alteram dados de produção. A publicação depende de autorização específica para a v176.

## Validação da versão

Foram validados 121 smoke tests JavaScript, a sintaxe dos módulos, o ciclo XLSX real e o painel em cinco telas (desktop, tablet, celular, paisagem e janela reduzida), sem requisições externas. A suíte PostgreSQL local validou criação automática, importação transacional, preservação entre perguntas, restauração, retentativas e acesso somente leitura de clientes, incluindo cliente sem rascunho salvo. Todos os cenários usam dados fictícios; nenhum teste atua no Supabase real.
