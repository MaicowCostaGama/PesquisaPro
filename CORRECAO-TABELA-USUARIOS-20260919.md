# Correção da tabela de usuários — 19/09/2026

A tela de usuários foi ajustada para evitar o corte das informações e das ações administrativas observado na tabela de pesquisadores.

A tabela agora possui rolagem horizontal própria e uma indicação visual orientando o usuário a deslizar para consultar todas as colunas. A coluna **Ações** permanece fixa à direita durante a rolagem, permitindo acessar continuamente **Conversar**, **Aprovar**, **Ver dados**, **Editar**, **Resetar senha** e **Excluir**.

As larguras das colunas foram dimensionadas para preservar nomes, cidades/estados, escolaridade, documentos, PIX e status. No celular, a tabela mantém a rolagem horizontal sem expandir ou cortar a página inteira. O contêiner principal também passou a respeitar a largura disponível do viewport.

A correção não altera registros, permissões, filtros, convites ou migrations do Supabase.
