# Monitoramento completo do cliente — 22/09/2026

Quando os resultados da pesquisa estão liberados para o cliente, a página **Andamento** passa a concentrar o acompanhamento completo da pesquisa. Além do progresso geral e das cotas, ela apresenta os resultados agregados de todas as perguntas, os cruzamentos publicados, o georreferenciamento com áreas aproximadas, o mapa de calor por resposta e os relatórios finais publicados.

A mesma página também apresenta uma tabela agregada da equipe de campo. Para cada pesquisador que registrou entrevistas na pesquisa, são mostrados o total de coletas, a quantidade válida, a quantidade reprovada e a data da última coleta. Não são exibidos CPF, e-mail, telefone, coordenadas exatas ou respostas individuais.

O carregamento das consultas passou a ter limite de tempo. Se uma RPC estiver indisponível, a interface deixa de ficar presa em “Carregando” e informa qual migration ou recurso precisa ser verificado.

## Migration manual

O novo agregado por pesquisador depende de `deploy/progresso-pesquisadores-cliente.sql`. Ela deve ser executada no SQL Editor do Supabase depois de `deploy/relatorios-resultados-clientes.sql`. A migration é aditiva, usa a mesma autorização de resultados liberados e não remove registros existentes.

Os módulos de resultados, georreferenciamento e mapa de calor continuam dependentes das migrations correspondentes já documentadas no projeto. Se alguma delas não estiver aplicada, o cartão específico exibirá uma mensagem de erro sem bloquear os demais módulos.
