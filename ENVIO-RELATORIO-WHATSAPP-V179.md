# PesquisaPro v179 — Enviar relatório por WhatsApp

A v179 acrescenta a ação **Enviar relatório por WhatsApp** na gestão, em **Relatórios → Estrutura do relatório final**, ao lado de **Finalizar e disponibilizar ao cliente**. O botão só fica disponível quando essa estrutura tem um PDF publicado. Não envia rascunhos e não gera outro PDF: usa o último arquivo publicado da estrutura selecionada.

## Como usar

1. Publique o relatório ou abra uma estrutura que já esteja com status **Publicado**.
2. Clique em **Enviar relatório por WhatsApp**.
3. Escolha o cliente destinatário. A lista contém apenas clientes ativos, vinculados à pesquisa e com acesso total liberado no vínculo ou no perfil global. Pesquisas arquivadas são bloqueadas; pesquisas concluídas continuam elegíveis.
4. Clique em **Preparar PDF e mensagem**. O aplicativo confere o acesso e prepara o arquivo privado somente na memória do navegador.
5. Confira a mensagem e o destinatário. No computador, use **Baixar PDF para anexar** e **Abrir WhatsApp com mensagem**. Anexe o PDF como documento na conversa e confirme o envio no próprio WhatsApp.
6. Em dispositivos compatíveis, **Compartilhar PDF e mensagem** abre a seleção nativa de aplicativos. Escolha WhatsApp e confirme o contato. Conforme o dispositivo, o texto pode precisar ser copiado e colado separadamente; há o botão **Copiar mensagem**.

O botão não dispara mensagens automaticamente. Abertura da conversa ou da seleção nativa não comprova envio, recebimento ou leitura. Não há envio em massa, contador de entrega, conexão a API de WhatsApp ou credenciais novas.

## Mensagem pronta

O texto identifica o cliente, a pesquisa e o título do relatório. Informa que no perfil o cliente pode consultar resultados, cruzar até três variáveis, baixar respostas em Excel, inclusive originais, e abrir ou baixar o PDF do relatório final. Inclui o acesso **https://www.pesquisa-pro.com/app.html** e os caminhos **Minhas pesquisas**, **Resultados e relatórios** e **Relatórios finais (PDF)**.

Nenhum token, link assinado de Storage, resposta individual ou URL pública do PDF é incluído na mensagem. O link do perfil exige autenticação e preserva os controles de acesso do aplicativo. O PDF anexado manualmente é uma cópia enviada ao destinatário: como qualquer documento enviado pelo WhatsApp, pode ser guardado ou encaminhado por quem o recebe.

## Segurança e preservação

O preparo consulta novamente o documento, a pesquisa, o perfil da gestão, os vínculos e os clientes. Antes de abrir a conversa ou baixar o arquivo, reconfirma o destinatário e o mesmo PDF publicado. O compartilhamento nativo requer clique explícito depois de preparar o arquivo, com preparo recente; não é aberto automaticamente após uma consulta assíncrona. Um preparo vencido deve ser feito novamente.

O módulo não salva, publica, edita ou exclui documentos e não modifica coletas, respostas, tratamentos Excel, usuários ou permissões. Troca de sessão, pesquisa, cliente responsável pela estrutura, status de publicação ou saída da tela limpa o compartilhamento. Fechar ou cancelar não modifica o relatório. Erros de acesso, arquivo ausente ou inválido e bloqueio de pop-up são apresentados sem afirmar entrega.

PDFs acima de 50 MB não são mantidos neste painel; devem ser acessados pela área usual de relatórios. O aplicativo não torna o bucket público nem altera políticas SQL.

## Implantação

Esta versão é somente frontend. **Não há SQL novo, migration ou Edge Function a executar.** O compartilhamento de leitura entre clientes já liberados depende da v178, cuja migration o usuário informou ter aplicado com sucesso. A v179 não altera essa migration.

A publicação no GitHub/Vercel deve ocorrer somente após autorização específica do usuário para a v179. O ZIP versionado contém a implementação e os testes, mas não dados reais.

## Limitações verificadas

O clique para conversar do WhatsApp aceita número internacional e mensagem pré-preenchida; não é uma API de anexos. O compartilhamento nativo depende do navegador e do sistema operacional. Os testes locais simulam ambos os caminhos e não enviam mensagens ou PDFs reais.

Referências técnicas: [WhatsApp — Click to chat](https://faq.whatsapp.com/5913398998672934) e [MDN — Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

## Validação da entrega

Foram aprovados 126 smoke tests do aplicativo e a verificação de sintaxe dos arquivos JavaScript. O teste específico do envio cobre 18 cenários com SDK, arquivos e destinatários fictícios. O teste de integração verifica que a publicação habilita o botão depois de terminar, que rascunhos não permitem envio e que a saída limpa o estado.

O Chromium local aprovou 35 verificações em desktop, tablet, celular, paisagem e janela reduzida, usando o CSS efetivamente incluído na v179. Não houve sobreposição horizontal de controles, requisições externas ou uso de dados reais. Compartilhamento nativo e abertura de WhatsApp foram simulados; nenhum relatório ou mensagem foi enviado a uma pessoa.
