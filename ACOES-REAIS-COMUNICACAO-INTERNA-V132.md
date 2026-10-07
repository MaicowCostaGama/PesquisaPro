# PesquisaPro v132 — ações verificáveis e orientações internas

**Estado:** implementação e testes locais concluídos; publicação no GitHub/Vercel autorizada em 07/10/2026. **Nenhuma migration executada** no Supabase — a etapa SQL é manual e separada.

## 1. Ações que antes simulavam resultado

- **Metas e cotas:** a antiga página tinha amostra, cotas e coletas de demonstração, além de botões “Importar perfil” e “Salvar plano” que só exibiam alertas. Agora lista pesquisas reais e abre a aba **Coleta → Metas de cotas** da pesquisa escolhida. Planejamento/edição de cotas permanece no formulário da pesquisa. A importação IBGE/TSE não foi implementada.
- **Cadastro de pesquisadores:** o link e o QR usam o mesmo endereço real `cadastro.html` do domínio do app. **Copiar link** copia o URL real; **Baixar QR Code** salva a imagem gerada; **Redigir e-mail** apenas abre o programa de e-mail; **Abrir mensagem no WhatsApp** apenas abre um rascunho, sujeito à ação humana. Nenhum desses dois últimos botões alega entrega.
- **Relatórios/documentos, exportação bruta, modelos de contrato e dados da empresa:** funções sem backend efetivo ficaram explicitamente **indisponíveis**, em vez de exibir “salvo”, “enviado” ou “baixado”. A página de modelos avisa que não persiste edições; dados da empresa são referência somente leitura, até existir fluxo real com histórico. Removido o número profissional fictício “CONRE 0000”.
- **Financeiro e equipe:** bônus não configurado deixa de aparecer como crédito de R$ 20; a tabela de equipe não usa nomes, telefones, metas, links ou estado “online” simulados. Exibe cidade cadastrada e contagem de coletas válidas a partir de eventos carregados.

## 2. Comunicação prioritariamente pelo aplicativo

Em **Coleta → Equipe**, cada pesquisador aceito/vinculado pode receber **Orientações pelo aplicativo**. A gestão revisa uma prévia do modelo da pesquisa, com conteúdo obrigatório sobre área de coleta, 15 metros entre entrevistas da mesma pesquisa, duração mínima, gravação de confirmação após 21h, ranking e vídeo. Se a gestão remover um aviso obrigatório da prévia, ele é recolocado e a prévia deve ser revisada **antes** de uma nova confirmação de envio. Limite final: 4.000 caracteres; se excedido, o envio não ocorre.

A RPC envia a mensagem privada ao pesquisador **vinculado à pesquisa**, e registra separadamente a orientação interna. Na Coleta, o contador **App** é número de envios registrados; **não confirma leitura**. A lista “Novos aceitos” não usa cliques em WhatsApp como prova de que as orientações chegaram. A ação existente **Mensagem interna da pesquisa** continua disponível para todos os membros ou um membro individual; é distinta das orientações iniciais.

No painel do pesquisador, **Avisos das pesquisas** permite ler, marcar como lido e clicar em **Atualizar avisos**. O painel também consulta novamente ao retornar à aba se a última consulta tiver mais de um minuto. **Não se promete notificação instantânea/push para essa mensagem**, nem confirmação de entrega fora do aplicativo.

Os rótulos de WhatsApp agora dizem **“WhatsApp aberto”**: `wa.me` abre um rascunho e seu contador existente registra abertura/tentativa, não envio, entrega ou leitura. Cliques antigos não se tornam confirmação retroativa; pesquisadores com apenas aberturas antigas continuam na fila de orientações internas pendentes. Para comunicações externas, use contato com consentimento e respeite pedidos de interrupção, conforme a [política oficial da Meta](https://whatsappbusiness.com/policy/). O status real de `sent`, `delivered`, `read` ou `failed` exige integração adequada e eventos de [webhook oficiais](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status); **esta versão não implementa a API do WhatsApp**.

## 3. Supabase: passo manual, em ordem

1. Verifique se `deploy/mensagens-pesquisa-pesquisadores.sql` já foi executado **com sucesso**. A migration base fornece as tabelas de avisos privados e a RPC `send_survey_researcher_message`. Não a execute novamente por rotina se já aplicada; confirme antes no SQL Editor.
2. Depois, execute **manualmente** no SQL Editor do projeto correto o conteúdo integral de [`deploy/orientacoes-internas-coleta.sql`](deploy/orientacoes-internas-coleta.sql). A nova migration acrescenta somente a tabela de rastreio e duas RPCs (`send_survey_initial_orientation`, `get_survey_orientation_inapp_counts`). Ela não altera coletas, contratos ou pagamentos e não foi executada por nós.
3. Valide com uma pesquisa de teste: enviar a um pesquisador vinculado, abrir a conta dele, atualizar avisos, verificar texto e contador; em seguida testar outro pesquisador e confirmar que não vê o aviso individual. Verifique a lista “Novos aceitos”. Não envie mensagens reais de teste a toda a equipe.

Se a migration não estiver aplicada, o aplicativo deve informar a indisponibilidade e **não simular envio bem-sucedido**. A migration depende da base de mensagens interna já instalada.

## 4. Validação e limites

Verificação local: parser PostgreSQL (`pglast`), sintaxe de todos os `.js` e **88 smoke tests**. O teste `actions-and-inapp-orientation-smoke-test.js` executa isoladamente o cálculo do link, a cópia e o download simulado de QR; também verifica ausência de números e links de demonstração, separação dos contadores e autorização da migration. **Não houve teste de integração com usuários reais ou banco de produção.**

Próximas decisões de produto: criar importador IBGE/TSE somente com fonte/pesquisa definidas; editor persistente e versionado de modelos de contrato e dados da empresa; exportação real e envio de relatórios somente após controle de permissões; integração WhatsApp oficial apenas se necessária, com opt-in, templates, webhook e avaliação de custos. Não foram criados botões para alterar contratos já assinados.
