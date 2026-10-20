# PesquisaPro v178 — PDFs finais compartilhados com clientes autorizados

## O que foi corrigido

O acesso total à pesquisa e o destinatário usado na montagem do relatório eram critérios independentes: o cliente podia ter acesso aos resultados, mas não ao PDF gerado para outro destinatário.

Na v178, cada PDF publicado da pesquisa passa a estar disponível para todos os clientes ativos vinculados a essa mesma pesquisa com acesso total liberado, seja na pesquisa, seja no cadastro global. Não é necessário gerar uma cópia de PDF para cada cliente. A conclusão da pesquisa não impede a leitura.

O destinatário original continua registrado e identifica a estrutura e a capa do documento. Esta versão não altera o conteúdo ou a capa dos PDFs já gerados. Todos os clientes autorizados verão o mesmo conteúdo publicado, inclusive eventuais referências ao cliente na capa. Rascunhos não são compartilhados.

## Quem pode consultar

A conta deve estar autenticada, ter perfil de cliente ativo, manter o vínculo exato com a pesquisa e ter resultados liberados. A pesquisa não pode estar arquivada. A liberação global não permite consultar pesquisas sem vínculo. Clientes inativos, sem liberação ou desvinculados não obtêm novas assinaturas para o PDF.

A autorização é verificada também no banco e no acesso ao arquivo privado. Não são concedidas permissões de edição, upload, salvamento ou publicação aos clientes. As políticas de gestão continuam preservadas.

## Interface do cliente

Em **Minhas pesquisas → selecionar pesquisa → Relatórios finais (PDF)**, o cliente pode usar **Abrir PDF**, **Baixar PDF** e **Atualizar relatórios finais**. Erros de acesso ao arquivo passam a ser informados, em vez de aparecer indefinidamente como “Preparando arquivo”. Respostas de outra sessão, pesquisa ou atualização antiga são descartadas.

Na gestão, o seletor passa a se chamar **Cliente responsável pela estrutura**, com um aviso de que o PDF publicado é compartilhado com os demais clientes autorizados dessa pesquisa.

## Ativação

1. Execute manualmente no SQL Editor do Supabase o arquivo `deploy/relatorios-pdf-compartilhados-clientes-v178.sql`. Não é necessário executar novamente as migrations anteriores que já estão instaladas.
2. Publique o frontend v178 após confirmar a publicação. O pacote desta entrega ainda não representa uma implantação no GitHub/Vercel.
3. Atualize o aplicativo na conta do cliente e abra **Relatórios finais (PDF)**. Se a tela já estiver aberta, use **Atualizar relatórios finais**.

A migration preserva registros existentes, PDFs e destinatários. Um PDF que já está publicado e cujo arquivo existe pode ser compartilhado sem republicação. Um rascunho, arquivo ausente ou caminho inválido continua indisponível; nesse caso a gestão deve conferir o documento, sem presumir que houve uma nova publicação.

As URLs assinadas têm validade de dez minutos. Retirar a liberação impede novos acessos, mas não apaga arquivos que o cliente já tenha baixado nem revoga instantaneamente URLs ainda válidas.

## Escopo e preservação

Não foram alteradas respostas, entrevistas, usuários, vínculos, liberação de resultados, pagamentos, tratamentos Excel, cruzamentos ou regras de coleta. O bucket permanece privado. A mudança não corrige nem substitui a investigação separada de timeout na tabulação tratada.

A migration nova altera somente as autorizações de leitura dos PDFs e a listagem compatível já usada pelo aplicativo. Não redefine as funções de salvamento e publicação.

## Validação

A validação usa somente dados fictícios, testes JavaScript, Chromium isolado em cinco tamanhos de tela e PostgreSQL local. As evidências de regressão, navegador e SQL estão incluídas no ZIP da versão. Nenhuma migration foi executada pelo agente no Supabase real e nenhum relatório foi publicado ou alterado durante a preparação.

Validação final: 124 testes de regressão JavaScript sem falhas, cinco telas Chromium sem transbordamento horizontal e 75 verificações PostgreSQL locais aprovadas. Os testes do banco incluem o bloqueio por RLS mesmo quando o papel autenticado possui grants de escrita, além da preservação de uma dependência da RPC já instalada.
