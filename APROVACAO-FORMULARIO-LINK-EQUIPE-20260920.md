# Aprovação do formulário e convite geral da equipe

## Visão geral

O PesquisaPro agora possui dois fluxos relacionados à preparação de uma pesquisa. O primeiro permite enviar ao cliente uma versão congelada do formulário para aprovação ou solicitação de ajustes. O segundo gera um link geral da pesquisa para que pesquisadores elegíveis possam entrar com a própria conta, aceitar o convite e entrar automaticamente na equipe.

A implementação é aditiva. Ela não exclui pesquisas, perguntas, clientes, pesquisadores, equipes, convites ou respostas existentes.

## Aprovação do cliente

No perfil administrativo do cliente, selecione uma pesquisa vinculada e use **Enviar formulário via WhatsApp** ou **Gerar e copiar link**. O sistema cria uma solicitação versionada contendo um retrato do formulário naquele momento: identificação da pesquisa, perguntas, tipos, opções e subcampos.

O cliente acessa o link com a própria conta e abre o menu **Aprovar formulário**. Ele pode aprovar a versão ou solicitar ajustes. O comentário é obrigatório quando ajustes são solicitados. Cada decisão é registrada com versão, situação, autor e data/hora no histórico de aprovação.

Se o formulário for alterado depois de uma aprovação, a aprovação anterior é invalidada e registrada como evento histórico. Uma nova solicitação deve ser enviada ao cliente. Quando a aprovação for exigida, a tentativa de colocar a pesquisa em campo será bloqueada até que todos os clientes vinculados tenham aprovado a versão atual.

## Link geral para pesquisadores

Na tela **Equipe** de uma pesquisa, use **Gerar link geral da pesquisa**. O link pode ser copiado ou compartilhado pelo WhatsApp. Gerar um novo link desativa o anterior; também é possível desativar o link atual.

Depois de entrar com a própria conta, o pesquisador vê a pesquisa e o motivo da elegibilidade. O aceite só é permitido quando o perfil está ativo, possui documento com foto e comprovante de endereço e possui cidade compatível com a abrangência configurada. Ao aceitar, o sistema grava, na mesma operação, o vínculo em `survey_team`, o aceite correspondente e o canal de chat da pesquisa. O grupo de WhatsApp continua sendo acessado pelo link oficial configurado pela gestão.

O link geral não adiciona pesquisadores sem o aceite autenticado. Pesquisadores fora dos critérios podem visualizar que o convite não está disponível para o perfil, mas não conseguem entrar na equipe.

## Migration manual

Execute no SQL Editor do Supabase o arquivo [aprovacao-formulario-link-pesquisadores.sql](deploy/aprovacao-formulario-link-pesquisadores.sql). Ele depende das estruturas já utilizadas pelo app para `survey_invites`, chat, `survey_questions`, `survey_question_options`, `survey_question_fields`, perfis e cidades de atuação.

A migration cria tabelas de solicitações, eventos de auditoria, links gerais e aceites; cria as RPCs protegidas; adiciona a exigência de aprovação à pesquisa; instala o bloqueio antes do status `campo`; e configura RLS. A execução é transacional e não contém `drop table`, `drop column` ou `truncate`.

Após executar, confirme **Success. No rows returned**. Depois, atualize o app com **Ctrl + Shift + R** e teste primeiro uma pesquisa de teste e um cliente vinculado. A publicação do código e a execução da migration são etapas independentes.

## Testes locais

A implementação foi validada com `node --check app.js` e todos os smoke tests do projeto. O teste específico é `form-approval-researcher-link-smoke-test.js`.

> A aprovação do formulário e a entrada de pesquisadores são implementações técnicas de fluxo. A organização deve revisar os textos, responsabilidades e efeitos jurídicos do aceite com sua assessoria adequada.
