# Busca e disponibilidade de pesquisadores — 19/09/2026

A gestão de pesquisadores agora permite localizar perfis por **cidade de atuação**, **estado** e **escolaridade**. A mesma lógica foi adicionada à tela de escolha da equipe de uma pesquisa.

## Lista administrativa

Na aba **Usuários → Pesquisadores**, o administrador pode combinar a busca textual com filtros de estado, cidade e escolaridade. O contador de disponibilidade acompanha o resultado filtrado.

Um pesquisador é contado como disponível quando está com status **Ativo**, possui os dois documentos cadastrados e tem ao menos uma localização de atuação registrada. A escolaridade permanece opcional para preservar cadastros antigos; perfis sem esse campo aparecem como “Não informada”.

## Escolha da equipe

Em **Atribuir equipe**, a lista pode ser filtrada por nome/cidade, estado, cidade e escolaridade. A contagem exibida considera somente pesquisadores disponíveis e compatíveis com a área geográfica da pesquisa. O botão de convite por WhatsApp somente aparece para quem está ativo, possui os documentos completos, tem cidade de atuação cadastrada e atende à área e aos filtros definidos.

Pesquisadores que já estejam na equipe continuam preservados ao alterar filtros. Pesquisadores fora da área ou com documentos pendentes podem ser visualizados, mas não podem ser convidados por esse fluxo.

## Escolaridade

A escolaridade pode ser preenchida ou corrigida no formulário administrativo do pesquisador. Quando um autocadastro possuir esse campo, ele é copiado para o perfil no momento da aprovação.

As opções são: ensino fundamental incompleto ou completo, ensino médio incompleto ou completo, ensino superior incompleto ou completo, pós-graduação/especialização, mestrado e doutorado.

## Migration

Execute no SQL Editor do Supabase o arquivo `deploy/pesquisadores-escolaridade-filtros.sql`. A migration é aditiva: cria as colunas opcionais `escolaridade` em `profiles` e `signups` e adiciona índices de busca. Ela não exclui perfis, cidades, convites, pesquisas ou respostas.

Após executar com sucesso, atualize o app com `Ctrl+Shift+R`. Cadastros antigos continuarão funcionando; para que apareçam em filtros de escolaridade, edite o perfil e informe o valor correspondente.
