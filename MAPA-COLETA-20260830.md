# Mapa de coleta — atualização 2026-08-30

O mapa da coleta foi transformado em um painel de monitoramento de campo, mantendo o Leaflet e as fontes de mapa já usadas pelo aplicativo.

## Entrega

O painel agora mostra um cabeçalho próprio de monitoramento, quantidade de pontos e pesquisadores visíveis, filtros por pesquisador e status, opção de exibir somente a última coleta de cada pesquisador, enquadramento automático/manual, atualização manual e atualização automática pelo polling da pesquisa aberta. Também inclui legenda para última coleta, histórico, reprovação e calibração.

Os marcadores foram atualizados para usar pinos de localização no formato de mapa, com centro vazado, sombra e o tip ancorado na coordenada real. A última coleta é destacada, o histórico fica atenuado e os estados de reprovação/calibração são identificáveis por cor. Ao passar o cursor, um tooltip mostra o pesquisador, a cota, o estado e o horário. A roda do mouse controla o zoom do mapa. Ao clicar no ponto, a coleta é encaminhada diretamente para a aba de auditoria, que posiciona e destaca a linha correspondente. Os popups apresentam pesquisador, cota, data/hora, precisão do GPS, sincronização e atalho adicional para a auditoria.

O mapa preserva as camadas Mapa e Satélite, carrega o Leaflet sob demanda, exibe estado de carregamento/indisponibilidade e mantém o enquadramento enquanto novos pontos chegam pelo polling. O enquadramento aproxima a área das entrevistas, usa zoom 17 para uma única coleta e até 18 para grupos, e aplica um pequeno deslocamento visual em espiral quando várias entrevistas ocupam a mesma coordenada. A coordenada original permanece na auditoria. Ao clicar em qualquer ponto, a coleta é aberta na auditoria para decidir entre reprovar, marcar como calibração ou desfazer uma decisão.

## Validação

Foram executados testes de sintaxe, testes existentes do aplicativo, teste Comercial, teste de convites, teste estrutural do mapa, teste unitário dos filtros e teste unitário de sobreposição. A prévia visual temporária confirmou o painel, controles, legenda, mapa Carto Voyager, controles de zoom e marcadores. A página de prévia foi removida e não faz parte da entrega.
