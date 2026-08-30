# Mapa de coleta — atualização 2026-08-30

O mapa da coleta foi transformado em um painel de monitoramento de campo, mantendo o Leaflet e as fontes de mapa já usadas pelo aplicativo.

## Entrega

O painel agora mostra um cabeçalho próprio de monitoramento, quantidade de pontos e pesquisadores visíveis, filtros por pesquisador e status, opção de exibir somente a última coleta de cada pesquisador, enquadramento automático/manual, atualização manual e atualização automática pelo polling da pesquisa aberta. Também inclui legenda para última coleta, histórico, reprovação e calibração.

Os marcadores foram atualizados para usar estados visuais distintos, com a última coleta destacada, histórico atenuado e estados de reprovação/calibração identificáveis. Os popups apresentam pesquisador, cota, data/hora, precisão do GPS, sincronização e atalho para a auditoria.

O mapa preserva as camadas Mapa e Satélite, carrega o Leaflet sob demanda, exibe estado de carregamento/indisponibilidade e mantém o enquadramento enquanto novos pontos chegam pelo polling.

## Validação

Foram executados testes de sintaxe, testes existentes do aplicativo, teste Comercial, teste de convites, teste estrutural do mapa e teste unitário dos filtros. A prévia visual temporária confirmou o painel, controles, legenda, mapa Carto Voyager, controles de zoom e marcadores. A página de prévia foi removida e não faz parte da entrega.
