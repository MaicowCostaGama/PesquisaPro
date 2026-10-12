# PesquisaPro v153 — Georreferenciamento nos Relatórios

## Entrega

Adicionado o painel **Georreferenciamento da pesquisa** imediatamente depois do mapa de calor e antes de **Todas as perguntas**, na aba Relatórios da gestão.

- Representa a distribuição geral das entrevistas da pesquisa selecionada, independentemente da pergunta ou resposta escolhida no mapa de calor.
- Disponível em pesquisas em andamento e concluídas, sem reabrir a pesquisa.
- Filtros por pesquisador e situação: válidas (padrão), todas, reprovadas, calibração e pendentes.
- Contadores do total registrado, válidas, reprovadas e calibração/pendentes. Esses contadores resumem a pesquisa; a linha abaixo dos filtros informa o subconjunto selecionado, entrevistas com/sem GPS válido e áreas aproximadas.
- Botões **Atualizar mapa** e **Enquadrar pontos**, com atualização no ciclo existente de 15 segundos e nos eventos de coleta recebidos em tempo real.
- Ao clicar numa área, mostra quantidade de entrevistas, nomes dos pesquisadores, situações e data da última coleta daquela área.

## Histórico completo e localização

O novo painel usa a leitura paginada por ID da pesquisa já implementada na v151. Uma falha de leitura não apresenta um conjunto parcial como completo: mantém o último histórico completo da mesma conta/pesquisa com aviso de desatualização, ou informa que o histórico está indisponível.

Os marcadores deste painel usam latitude/longitude arredondadas a três casas decimais e agrupam entrevistas na mesma área aproximada. Não mostram coordenadas exatas, contatos, PIX, respostas individuais ou links de gravação. Entrevistas sem GPS válido aparecem nos contadores, mas não são inventadas no mapa. Acesso restrito aos perfis de gestão já previstos: administrador, administrador PRO, coordenador e gerente; sem ampliar permissões de clientes ou pesquisadores.

No **mapa de Coleta e campo**, removido também o corte visual preexistente de 120 pontos. Agora todas as entrevistas com GPS válido no filtro entram no mapa; o clique para auditoria continua preservado. A separação visual de pontos sobrepostos é pré-calculada em vez de percorrer repetidamente todo o histórico. Campos de GPS ausentes não são convertidos artificialmente para zero.

## Preservação

- Nenhuma pesquisa, entrevista, resposta, pagamento, contrato, comprovante ou senha é alterada.
- Nenhuma migration nova; **não é necessário executar SQL para esta versão**.
- Nenhuma alteração nos SQLs do clone de publicação, inclusive `deploy/cadastro-pesquisador-senha.sql`.
- CSS preexistente preservado integralmente; estilos do novo painel somente acrescentados.
- Troca de pesquisa/conta e saída da página descartam operações antigas e limpam marcadores conforme os controles de sessão.
- Mapa de calor, paginação de respostas v149 e acesso à coleta concluída v152 preservados.

## Validação local

- Sintaxe de todos os arquivos JavaScript aprovada.
- **107 de 107 smoke tests aprovados**, incluindo os dois novos testes funcionais.
- Teste com 1.177 marcadores no mapa de coleta, incluindo clique na última entrevista, sem corte de 120.
- Teste de 6.001 áreas sintéticas no painel de Relatórios, sem descarte silencioso de marcadores.
- Filtros, estados vazios, GPS ausente/inválido, erro após página parcial, preservação de cache e isolamento entre pesquisas/contas testados.
- Cliques em filtros e botões testados em DOM com dados sintéticos.
- Layout desktop e celular renderizado com Chromium e inspecionado. Nessas prévias, a área do Google Maps é apenas um espaço de teste claramente identificado, não um mapa real de produção.

A configuração existente do Google Maps foi reutilizada. A renderização com a pesquisa real ainda precisa ser conferida após publicação; os testes locais não comprovam a disponibilidade do serviço externo em produção.

## Versão e publicação

- Versão local: **v153**.
- Cache: `20261012134830`.
- Pacote: `PesquisaPro-v20261012-georreferenciamento-relatorios-v153.zip`.
- Estado na entrega: código e pacote locais prontos; **aguardando autorização específica para publicar no GitHub/Vercel**. Nenhuma publicação realizada para esta mudança.
