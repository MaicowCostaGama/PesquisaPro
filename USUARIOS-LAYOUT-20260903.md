# Refinamento visual da tela Usuários

A barra de categorias foi reorganizada em duas camadas: o cabeçalho superior identifica a finalidade da área e mostra o total da categoria ativa; abaixo, as categorias ficam em uma faixa horizontal própria, com contadores compactos e rolagem horizontal em telas menores. Isso evita que a última aba seja empurrada para uma segunda linha sem contexto.

As ações das tabelas receberam uma área visual própria, com espaçamento uniforme, tamanhos compactos, prioridade para abrir/editar o cadastro, destaque discreto para redefinição de senha e tratamento visual reservado para exclusão. Ações longas podem quebrar de forma controlada sem comprimir os dados pessoais.

A solução mantém os mesmos handlers e permissões do painel. Foram preservados os botões de conversar, aprovar, visualizar, editar, redefinir senha e excluir; a alteração é de organização, legibilidade e responsividade.

## Correção de aprovação e edição de pesquisadores — 2026-09-09

A edição de um pesquisador agora exige um UUID válido do perfil persistido antes de chamar o Supabase. Quando o identificador estiver ausente ou inválido, o sistema interrompe o salvamento e informa que nenhum dado foi alterado, evitando o erro `invalid input syntax for type uuid: "undefined"`.

A aprovação de um autocadastro deixou de ser apenas uma alteração local na tela. O sistema cria ou localiza o perfil real do pesquisador, grava seu UUID em `signups.approved_profile_id`, sincroniza as cidades de atuação, registra `approved_at` e solicita redefinição de senha pelo e-mail cadastrado. Cadastros antigos marcados como aprovados sem perfil vinculado aparecem em uma área de reconciliação, sem serem apagados.

A migration `deploy/reconciliacao-aprovacao-pesquisadores.sql` é idempotente e apenas garante as colunas e o índice de vínculo. Ela não remove nem substitui cadastros existentes.
