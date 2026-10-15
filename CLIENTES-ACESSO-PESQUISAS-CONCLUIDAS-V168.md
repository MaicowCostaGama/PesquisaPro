# PesquisaPro v168 — clientes e acesso nas pesquisas concluídas

## Situação da entrega

Implementação preparada e testada localmente. **A v168 ainda não foi publicada** no GitHub/Vercel. Nenhuma migration foi executada no Supabase por esta implementação e nenhuma permissão de um cliente real foi alterada.

Cache da nova versão: `20261015173500`.

## O que foi acrescentado

Na aba **Concluídas**, cada pesquisa encerrada recebe o botão **Clientes e acesso**, ao lado dos atalhos existentes. Ele abre um painel específico, sem usar o assistente de edição do formulário e sem reabrir a coleta.

O painel permite:

- Buscar os clientes visíveis pelas permissões atuais, por nome, contato, e-mail ou telefone.
- Consultar os clientes vinculados à pesquisa e o estado de acesso.
- Vincular ou desvincular um cliente existente.
- Marcar ou desmarcar **Liberar acesso total desta pesquisa: andamento detalhado e resultados**.
- Editar, quando autorizado, nome/razão social, pessoa de contato, telefone/WhatsApp, CPF/CNPJ, tipo de pessoa, cidade, rua, número e CEP.
- Revisar a lista final, as desvinculações e os valores cadastrais alterados antes de confirmar o salvamento.

**E-mail de login, senha, papel do usuário, estado do cadastro e liberação global não são editados neste painel.** Não há criação de contas novas: essa tarefa permanece em Usuários → Clientes.

## Como usar após a ativação

1. Entre no aplicativo com uma conta de gestão autorizada.
2. Abra **Concluídas** e encontre a pesquisa.
3. Clique em **Clientes e acesso**.
4. Selecione um cliente no catálogo.
5. Ajuste o vínculo e a liberação de acesso desta pesquisa.
6. Se tiver permissão administrativa, ajuste os dados cadastrais necessários.
7. Clique em **Salvar clientes e acesso**.
8. Confira a mensagem com o conteúdo final e confirme, se estiver correto.

O botão **← Concluídas** retorna à lista. Se houver alterações pendentes, solicita confirmação antes de descartá-las. Durante uma gravação, o painel evita duplicar o envio ou abandonar o salvamento em andamento.

## Diferença entre acesso por pesquisa e acesso global

O controle deste painel modifica apenas `survey_clients.results_released` da pesquisa selecionada. A regra global/legada em `profiles.results_released` permanece intacta.

> Se o cliente já possui liberação global, desmarcar a liberação desta pesquisa **não bloqueia o acesso enquanto a permissão global continuar ativa**. O painel mostra um aviso explícito. Para revisar a liberação global, utilize Usuários → Clientes.

Desvincular remove o vínculo da pesquisa selecionada, sem apagar os documentos históricos. A edição dos dados cadastrais, como razão social e telefone, vale para aquele cliente **em todo o sistema**; os controles de acesso das outras pesquisas não são alterados.

Liberar acesso não publica um rascunho nem gera um novo PDF. Relatórios disponíveis continuam sujeitos aos fluxos e autorizações existentes de geração e publicação.

## Permissões e preservação dos dados

- Gestão de vínculos: somente os perfis de gestão que já têm autorização nas políticas existentes.
- Edição de cadastro: somente administradores autorizados (`admin`/`admpro`, conforme a função `is_admin` já existente).
- Coordenadores e gerentes não recebem novas permissões sobre cadastros. O catálogo continua limitado à leitura permitida pela RLS.
- Clientes não podem abrir esta gestão nem alterar suas permissões pelas novas consultas.
- Pesquisas em campo e arquivadas ficam fora deste fluxo de edição de concluídas.

O salvamento não modifica formulário, perguntas, respostas, coleta, status, datas, equipe, metas, agrupamentos, financeiro ou relatórios históricos. As consultas novas não alteram políticas RLS nem concedem acesso adicional às tabelas.

As alterações de vínculos e dos campos cadastrais autorizados são feitas em uma única transação. Se houver falha, são revertidas em conjunto. Se outra sessão tiver alterado os dados esperados, o painel solicita recarregar, em vez de sobrescrever silenciosamente.

## Ativação manual no Supabase

Arquivo novo:

`deploy/clientes-acesso-pesquisas-concluidas-v168.sql`

Depois de autorizar a publicação do código:

1. Abra o projeto correto do PesquisaPro no Supabase.
2. Acesse **SQL Editor → New query**.
3. Copie o conteúdo completo do arquivo novo, de `begin;` até `commit;`, incluindo as definições das funções.
4. Execute manualmente e confira a mensagem **Success. No rows returned**.
5. Recarregue o aplicativo e teste o botão **Clientes e acesso** de uma pesquisa concluída.

A migration cria somente as novas consultas `completed_survey_client_settings` e `save_completed_survey_clients`, com validações e permissões de execução. Não é preciso atualizar a Edge Function da IA, cadastrar segredos ou repetir as migrations anteriores.

Se o SQL ainda não estiver aplicado, o painel orienta a ativação e não tenta gravar parcialmente pelo fluxo antigo.

## Validações concluídas

- **125 testes de regressão do aplicativo** passaram; sintaxe JavaScript verificada.
- **27 verificações específicas da interface** passaram, incluindo isolamento de sessão, confirmação detalhada, preservação de campos não editados e ausência de salvamento parcial.
- Navegador Chromium validado em **cinco tamanhos de tela**: desktop, tablet, celular, celular pequeno e paisagem.
- **48 verificações PostgreSQL locais** passaram: autorização, RLS, liberação global preservada, isolamento entre pesquisas, campos protegidos, conflitos, rollback após falha durante gravação e reexecução da migration.
- CSS anterior preservado integralmente; novos estilos apenas acrescentados.
- SQLs e funções de IA anteriores preservados.
- Clone de publicação e sua alteração preexistente protegida preservados.

Todos os ensaios utilizaram dados fictícios e banco local isolado. PGlite não reproduz integralmente Supabase/PostgREST, todos os grants nem concorrência real entre sessões. **O teste ponta a ponta em produção ainda depende da publicação autorizada e da execução manual do novo SQL.**
