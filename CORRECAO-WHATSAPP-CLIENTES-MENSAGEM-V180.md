# PesquisaPro v180 — destinatários e mensagem modelo do WhatsApp

## O que muda

A janela **Enviar relatório por WhatsApp** passa a mostrar a mensagem modelo assim que um cliente autorizado é selecionado. Não é necessário baixar ou preparar o PDF para visualizar o texto. A mensagem usa o nome do destinatário, a pesquisa e o título do relatório publicado e informa os recursos do perfil do cliente: resultados, cruzamentos de até três variáveis, Excel das respostas e PDF final.

O botão **Preparar PDF para enviar** continua necessário antes de habilitar as ações de envio e de download do PDF. A preparação reconfirma as permissões e verifica o arquivo publicado. Não há envio automático nem ligação com uma API paga do WhatsApp.

## Por que um cliente pode não aparecer como disponível

A v179 exibia somente os clientes elegíveis. Um cliente podia estar cadastrado como **Prospecto** e ter **Acesso total liberado**, mas ainda não passar pela condição de cadastro **Ativo** exigida também pelas permissões existentes do PDF.

A v180 preserva essa proteção: clientes vinculados ou referenciados na estrutura, mas não autorizados, são exibidos bloqueados, com o motivo. Os motivos incluem cadastro em Prospecto, cadastro inativo ou pendente, ausência de vínculo exato com a pesquisa, acesso total não liberado e cadastro indisponível para consulta.

A tela não ativa clientes, não aprova cadastros e não concede acesso. Um nome igual ou uma associação antiga por nome não substitui o vínculo pelo identificador da conta. O destinatário original do documento não recebe autorização extra somente por constar no relatório.

## Como usar

1. Entre em **Relatórios** e selecione a pesquisa.
2. Abra a **Estrutura do relatório final** com PDF já publicado.
3. Clique em **Enviar relatório por WhatsApp**.
4. Selecione um cliente disponível. A mensagem modelo aparece imediatamente.
5. Clique em **Preparar PDF para enviar**.
6. No computador, abra o WhatsApp com a mensagem e baixe o PDF para anexá-lo como documento. Em dispositivos compatíveis, também é possível solicitar o compartilhamento do PDF e da mensagem. Confira o contato e confirme o envio no WhatsApp.

Se o cliente estiver em Prospecto e a conta realmente deva estar ativa, o administrador precisa revisar o cadastro em **Usuários → Clientes → Editar** e alterar o status para **Ativo**, além de manter o vínculo correto e a liberação desejada da pesquisa. Essa é uma decisão de acesso; a v180 não a executa automaticamente.

## Proteções preservadas

- Somente gestão ativa pode preparar o envio.
- Somente PDF publicado, válido e da pesquisa selecionada pode ser preparado.
- A autorização continua exigindo cliente ativo, vínculo exato e liberação total no vínculo ou no perfil.
- Alterações de destinatário descartam o PDF temporário e exigem novo preparo.
- Rechecagens, tempo de validade do preparo, descarte de operações tardias e isolamento de sessão continuam ativos.
- Mensagens não contêm links públicos do Storage, tokens ou respostas individuais.
- Coletas, respostas, documentos publicados e permissões não são modificados.

## Ativação

Esta versão é somente frontend. **Não há SQL novo nem alteração de Edge Function.** O ZIP é entregue antes da autorização de publicação. A implantação no GitHub/Vercel e qualquer alteração de status de cliente dependem de autorização específica.
