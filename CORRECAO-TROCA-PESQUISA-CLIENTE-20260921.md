# Correção da troca de pesquisa/campanha — 21/09/2026

O botão **Trocar pesquisa** do cabeçalho deixou de exibir o alerta de recurso não configurado. Agora ele abre um seletor modal com as pesquisas vinculadas ao perfil atual.

Para clientes, são exibidas as pesquisas associadas ao cliente por vínculo persistido e, quando aplicável, pela compatibilidade com os nomes legados do cadastro. Ao selecionar uma pesquisa, as telas de **Andamento**, **Resultados**, **Aprovar formulário** e demais áreas que usam a pesquisa atual são redesenhadas com o vínculo escolhido.

Para pesquisadores, o seletor apresenta as pesquisas em campo às quais o pesquisador foi atribuído. Para a equipe administrativa, apresenta as pesquisas ativas disponíveis no sistema. A seleção é mantida durante a sessão e é limpa ao sair ou trocar de usuário.

A alteração é exclusivamente de código e interface. Nenhuma migration SQL foi criada, executada ou modificada.
