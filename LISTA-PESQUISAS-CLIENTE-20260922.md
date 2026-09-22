# Lista visível de pesquisas do cliente — 22/09/2026

O perfil de cliente deixou de depender do botão superior **Trocar pesquisa** para localizar suas pesquisas. Após o login, o cliente passa a abrir diretamente a área **Minhas pesquisas**, dentro do menu principal.

A página apresenta todas as pesquisas disponibilizadas e vinculadas à conta em uma lista de cartões. Cada cartão exibe o nome, o tipo, o status, a abrangência e a situação dos resultados. Ao clicar em um cartão, o cliente entra na ficha da pesquisa e visualiza período, amostra prevista, margem de erro, nível de confiança, abrangência, quantidade de perguntas e situação da liberação dos resultados.

A ficha permite selecionar a pesquisa para abrir o andamento da coleta ou, quando configurado, acessar a aprovação do formulário. O seletor superior fica oculto exclusivamente para o perfil cliente; os demais perfis continuam com o comportamento anterior.

A alteração é de interface e navegação e utiliza os vínculos existentes em `survey_clients`. Nenhuma migration SQL foi criada, executada ou modificada.
