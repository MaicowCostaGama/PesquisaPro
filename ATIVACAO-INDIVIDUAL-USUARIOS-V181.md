# PesquisaPro v181 — ativação individual de usuários

## Uso

Na aba **Usuários**, escolha a categoria e encontre o cadastro. Para qualquer perfil existente que esteja Pendente, Prospecto ou Encerrado, a coluna **Ações** e a página de detalhes passam a oferecer **Ativar usuário**. Usuários já ativos não mostram a ação.

Ao clicar, confira o nome, o perfil, o e-mail e a mudança de situação antes de confirmar. A ativação é individual; não há ativação automática nem em lote. Depois da confirmação do banco, o status exibido passa a **Ativo**. Não é necessário abrir o formulário e salvar novamente todos os campos.

O botão abrange Clientes, Pesquisadores, Usuários inativos, ADM PesquisaPro, Vendedores, Indicadores de Clientes, Recrutadores e os papéis da categoria Administração (Administrador master, Coordenador e Gerente).

## Quem pode ativar

A operação exige uma conta ativa de **Administrador master** ou **ADM PesquisaPro**, tanto no frontend quanto no banco. Coordenadores, gerentes, clientes, pesquisadores e demais perfis não podem se autoativar nem ativar outras contas pela nova função.

## O que é preservado

A ativação altera somente o status do perfil para `ativo`. Não muda o tipo de usuário ou as permissões daquele papel, senhas, e-mails, documentos, PIX, valores, pesquisas vinculadas, liberações de resultados, contratos, coletas ou pagamentos. A operação não aceita convites, assina contratos, aprova pagamentos ou concede acesso total automaticamente.

No caso do Kleber APVS, mudar Prospecto para Ativo preserva a liberação total que já estiver registrada. O botão não libera acesso para um cliente que ainda não tenha essa autorização.

Pesquisadores pendentes ou prospectos continuam precisando dos dois documentos obrigatórios para ativação. Cadastros de autocadastro ainda não convertidos em perfis continuam no processo de aprovação existente. Reativar um pesquisador encerrado mantém seu histórico e registra a restauração quando houver um encerramento aberto; não altera assinaturas contratuais.

A função atua sobre o cadastro do PesquisaPro. Não cria um login inexistente nem modifica eventuais bloqueios independentes do serviço Supabase Auth.

## Segurança e falhas

O botão usa o UUID do perfil, não o nome nem a posição da linha. A função confere o status esperado e recusa alterações concorrentes. O aplicativo só muda a situação mostrada depois de receber a confirmação correspondente do banco.

Cliques repetidos são bloqueados enquanto houver uma solicitação em andamento. Troca de sessão ou saída da área descarta respostas tardias. Em falha ou tempo limite, a interface não afirma sucesso: recarregue a lista e confira o estado antes de tentar novamente. A operação registra uma auditoria administrativa sem expor dados pessoais adicionais.

## Ativação da versão

A v181 inclui o novo SQL **`deploy/ativacao-individual-usuarios-v181.sql`**, que deve ser executado manualmente pelo administrador no SQL Editor do Supabase. A migration adiciona a função específica e sua trilha de auditoria; não altera migrations antigas, regras globais de papéis ou dados dos usuários durante a instalação.

A publicação do frontend será feita apenas após aprovação da v181. Não há Edge Function nova, configuração de chave ou envio de mensagem automático. A instalação da migration, por si só, não ativa o Kleber nem qualquer outro usuário: a ativação depende do clique e da confirmação individual.

## Validação local da v181

A versão foi validada com dados fictícios: suíte completa de 128 smoke tests do aplicativo, teste dedicado de ativação com 57 cenários, testes Chromium em desktop, tablet, celular, paisagem e janela reduzida, e 37 cenários em PostgreSQL 16 local. A suíte SQL verifica os nove papéis de destino, rejeição dos demais perfis como atores, CAS, idempotência, documentos obrigatórios, reativação com ou sem tabela de encerramentos, reaplicação da migration e leitura administrativa da auditoria. Mesmo concedendo permissões amplas no banco fictício, RLS bloqueou INSERT, UPDATE e DELETE diretos na auditoria.

Os campos de cada perfil foram comparados integralmente, desconsiderando somente `status`; nome, e-mail, telefone, documentos, PIX, papel e liberação de resultados permaneceram iguais. Nenhum cadastro real foi ativado nos testes, nenhum SQL remoto foi executado e nenhuma mensagem foi enviada. O pacote inclui as evidências locais de regressão, navegador e SQL.
