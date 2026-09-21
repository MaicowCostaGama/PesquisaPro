# Melhoria da aba Usuários — 21/09/2026

A aba **Usuários** foi reorganizada para funcionar como um painel de gestão operacional. A busca agora aceita nome, CPF, e-mail, telefone e cidade, incluindo cidade de cadastro e cidades de atuação do pesquisador. A busca ignora acentos e pontuação, e pode ser combinada com filtros de situação e cidade.

Cada categoria de perfil mantém sua própria aba: pesquisadores, clientes, ADM PesquisaPro, vendedores, indicadores, recrutadores e administração. Ao trocar de perfil, os filtros são reiniciados para evitar resultados escondidos por uma seleção feita em outra categoria.

Os contadores de registros, ativos, pendentes e resultados encontrados passam a acompanhar os filtros atuais. A tabela continua com rolagem horizontal e coluna de ações fixa, preservando o acesso a **Conversar**, **Ver dados**, **Editar**, **Resetar senha**, **Aprovar** quando aplicável e **Excluir**.

A fila de pesquisadores foi destacada no topo com a seção **Pendências de autorização**. Ela separa autocadastros e perfis pendentes, mostra a quantidade de cada grupo e permite consultar dados, abrir e baixar documentos, conversar por WhatsApp e aprovar o cadastro sem procurar essas ações no fim da tabela. A alteração é de interface e lógica de filtragem; não remove usuários, cadastros, documentos ou históricos e não exige migration SQL.
