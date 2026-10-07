# Atualização das orientações e do treinamento — 07/10/2026

## O que foi atualizado

A mensagem padrão de **orientações iniciais** e o vídeo do guia do pesquisador agora incluem:

- a trava de **15 metros somente entre coletas da mesma pesquisa**;
- a informação de que pesquisas diferentes podem ser realizadas no mesmo local, mantendo cidade/região, GPS, tempo mínimo e demais regras;
- a aba **Seu Ranking**;
- os pesos do ranking: respostas (30%), integridade (30%), duração (20%) e distância (20%);
- a explicação de que notas abaixo de 80 reduzem a prioridade para novos convites;
- o aviso de que notas muito baixas podem interromper novos convites após análise da equipe;
- o reforço de que entrevistas reais, respostas fiéis e respeito aos controles são o único caminho para continuar recebendo convites;
- as consequências de entrevistas inventadas, duplicadas ou feitas para burlar regras: rejeição, ausência de pagamento e possível desligamento.

## Vídeo atualizado

O vídeo mantém o treinamento original e acrescenta um módulo final com sete telas narradas sobre distância por pesquisa, composição da nota, consequências transparentes e continuidade dos convites.

- Arquivo local do aplicativo: `assets/pesquisa-pro-orientacoes-coleta.mp4`
- Duração aproximada: 7 minutos e 24 segundos
- Resolução: 1920 × 1080
- Vídeo: H.264
- Áudio: AAC mono
- URL usada nos convites: `https://files.manuscdn.com/user_upload_by_module/session_file/310519663067279939/eRSQOsqQYTCEppwp.mp4`

## Comportamento para mensagens personalizadas

A gestão continua podendo editar a mensagem por pesquisa. Se uma mensagem personalizada não contiver os avisos essenciais, o aplicativo acrescenta automaticamente os blocos obrigatórios quando abre a mensagem para envio.

## Validação

O smoke test `orientation-training-update-smoke-test.js` verifica o texto novo, o cache, a presença do vídeo local, a duração, a resolução, o codec H.264 e a faixa de áudio. Nenhuma migration do Supabase é necessária para esta atualização.
