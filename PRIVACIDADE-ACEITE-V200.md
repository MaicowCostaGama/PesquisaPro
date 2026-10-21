# v200 — aceite auditável da Política de Privacidade

## O que foi implementado

A Política de Privacidade e Guarda de Dados passa a ter uma evidência formal no Supabase. O checkbox do autocadastro continua sendo obrigatório no navegador, mas agora o banco também valida a versão e o SHA-256 informados pelo cliente antes de aceitar o cadastro.

A versão registrada nesta entrega é `v2-2026-10-21`, com a seguinte URL pública:

`https://www.pesquisa-pro.com/politica-privacidade.html`

SHA-256 exato do arquivo público usado pela migration:

`1b3088a5f69ddcae9f5dc24b93695335e690091d06493ff803e0e965add31766`

O livro de evidências é a tabela `public.privacy_policy_acceptances`. Ele registra origem (`signup` ou `contract`), versão, URL, hash, data/hora gerada pelo banco, data/hora informada pelo navegador, usuário autenticado, cadastro/contrato relacionado, IP quando disponível e user-agent. Não há `INSERT`, `UPDATE` ou `DELETE` liberado para o aplicativo; os registros são gravados pelas RPCs `security definer`.

## Arquivo SQL para executar manualmente

Use somente o arquivo `deploy/aceite-politica-privacidade-v200.sql` fornecido junto desta implementação. Ele **não foi executado automaticamente** por esta tarefa e não deve ser colocado no frontend.

No Supabase:

1. Abra o projeto correto e entre em **SQL Editor**.
2. Crie uma consulta nova.
3. Cole o conteúdo inteiro do arquivo SQL.
4. Execute uma única vez.
5. Confirme que a execução terminou sem erro.

A migration é transacional e aditiva. Ela não apaga pesquisas, coletas, respostas, usuários, pagamentos, documentos, contratos ou assinaturas anteriores.

## Ativar a nova versão do contrato

A migration não altera automaticamente `contract_settings.current_version`. Isso é intencional: evita que pesquisadores sejam bloqueados antes de a equipe revisar o contrato.

Depois de aplicar o SQL:

1. Entre como administrador.
2. Abra **Contratos**.
3. Clique em **Criar nova versão para assinatura**.
4. Informe exatamente `v3-2026-pesquisador`.
5. Revise o texto exibido. A cláusula de proteção de dados referencia a Política de Privacidade v2-2026-10-21, a URL pública e o vínculo por hash/data.
6. Assine a nova versão pela **CONTRATANTE**.
7. Oriente os pesquisadores a abrir **Meu contrato**, ler o documento e assinar pessoalmente.

A assinatura administrativa em lote fica desabilitada para a v3. Isso evita que uma assinatura do administrador seja confundida com o aceite pessoal do pesquisador. A RPC do banco também bloqueia inserções diretas sem os campos válidos da política.

## Comportamento dos cadastros

Os dois caminhos de autocadastro — link de recrutador e link de indicação — enviam a versão, o hash, a data/hora do aceite, o user-agent e o IP em melhor esforço. O Supabase confirma a versão/hash contra `privacy_policy_versions`, gera o timestamp do servidor e grava o cadastro e o registro em `privacy_policy_acceptances` na mesma transação.

Se alguém tentar chamar uma RPC antiga ou enviar uma versão/hash diferente, o banco rejeita o cadastro. Se a chamada falhar depois do upload dos documentos, o frontend mantém o comportamento existente de remover os arquivos recém-enviados daquela tentativa.

## Efeito sobre dados históricos

- Cadastros anteriores não são reclassificados como se tivessem aceitado a política.
- Assinaturas v2 e versões anteriores permanecem intactas, com seu texto/hash originais.
- Pesquisadores que já existiam antes da v200 podem aceitar pessoalmente a política ao assinar a v3; nesse caso o aceite fica vinculado ao contrato mesmo que não exista um registro de aceite no autocadastro antigo.
- Novos cadastros terão o aceite no cadastro e, quando assinarem a v3, um segundo registro vinculado à assinatura do contrato. Isso permite distinguir claramente o aceite do cadastro da assinatura contratual.
- Nenhum dado real é alterado em massa.

## Validações locais realizadas

Foram executados `node --check app.js`, o smoke test da política e o smoke test específico da integração v200. A política foi revisada nesta entrega para usar o canal oficial `adm@pesquisa-pro.com`; o hash acima corresponde ao arquivo revisado e conferido localmente.
