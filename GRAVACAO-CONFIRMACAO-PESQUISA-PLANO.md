# Confirmação final gravada da entrevista

## Decisão de produto

A gravação não será feita durante toda a entrevista. Para aproximadamente 20% das entrevistas de cada pesquisa, a plataforma selecionará a coleta para uma confirmação final gravada em áudio. A seleção deverá ser decidida no servidor/banco, para que o pesquisador não escolha quais entrevistas serão gravadas.

Ao concluir o questionário, o aplicativo mostrará ao pesquisador que aquela entrevista foi selecionada para auditoria. O entrevistado ouvirá uma pergunta clara, poderá autorizar ou recusar a gravação, e a recusa não invalidará a entrevista nem impedirá o envio. Se autorizar, será gravado somente um trecho curto com a confirmação da pessoa, e não o questionário completo.

Frase sugerida: “Para controle de qualidade, esta entrevista foi selecionada para uma confirmação final em áudio. Você autoriza a gravação da sua resposta? A gravação será usada somente para verificar se a pesquisa foi realizada corretamente e ficará disponível apenas para a equipe autorizada.”

Pergunta sugerida após a autorização: “Você confirma que esta pesquisa foi realizada corretamente e que respondeu às perguntas de forma voluntária?” A resposta deve ser registrada em áudio por poucos segundos, com limite de duração e possibilidade de cancelar antes do envio.

## Dados e segurança

A tabela `collection_events` guarda os metadados da confirmação, como `recording_reservation_id`, `recording_required`, `recording_consent`, `recording_status`, `recording_created_at` e `recording_error`. O áudio e seus metadados técnicos ficam em `collection_recordings`, associado ao evento. O arquivo é enviado para o bucket privado `collection-recordings`, com leitura somente para a gestão por URL assinada temporária. O caminho do arquivo não é exposto ao entrevistado ou ao pesquisador.

A entrevista continua válida quando a pessoa recusar, quando o navegador não tiver microfone ou quando houver falha técnica. Nesses casos, o sistema registra o motivo sem tentar gravar escondido e sem travar o envio.

A gravação no navegador usará `getUserMedia({audio:true})` somente depois da autorização na interface e `MediaRecorder` para um trecho curto. O site precisa estar em HTTPS para solicitar o microfone. O código deverá testar `MediaRecorder.isTypeSupported()` e escolher um MIME type compatível, em vez de assumir um formato único.

## Regra da amostra

A seleção de aproximadamente 20% é feita por função server-side no banco, usando `random() < 0.20` durante a reserva da entrevista. Não há `Math.random()` no navegador para decidir a amostra, portanto o pesquisador não controla a seleção. Uma reserva ativa é reutilizada até a entrevista ser enviada ou expirar, evitando mudar a decisão durante o mesmo atendimento.

A auditoria diferencia entrevistas não selecionadas, selecionadas, autorizadas, recusadas, aguardando upload e com falha técnica. Como a regra é probabilística, 20% é uma aproximação ao longo do volume de entrevistas, não uma garantia de exatamente 20% em cada pequeno lote.

## Fontes técnicas e de privacidade

1. MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
2. MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
3. Serpro — Seu consentimento é lei: https://www.serpro.gov.br/lgpd/cidadao/seu-consentimento-e-lei

As fontes técnicas indicam que `getUserMedia()` requer permissão do usuário e contexto seguro (HTTPS), enquanto `MediaRecorder` permite iniciar/parar a gravação, receber os dados por `dataavailable` e verificar MIME types suportados. A referência de consentimento reforça que a autorização deve ser explícita, para finalidade determinada, transparente e revogável quando aplicável.

O texto definitivo de consentimento, o prazo de retenção e o procedimento de atendimento aos titulares devem ser revisados por profissional jurídico antes do uso definitivo.

## Implantação

A migration `deploy/gravacao-confirmacao-20pct.sql` deve ser executada no SQL Editor do Supabase depois do schema e das migrations de coleta já existentes. O resultado esperado é `Success. No rows returned`. A seleção de 20% e a reserva da entrevista acontecem no banco; sem essa migration, o fluxo antigo de coleta continua funcionando sem solicitar áudio.

O teste de aceitação deve usar uma pesquisa em campo e um pesquisador atribuído. Em cada entrevista, o pesquisador deve responder o questionário, observar se a confirmação final foi selecionada, testar a recusa e, em uma entrevista selecionada, autorizar o microfone, gravar o trecho curto, revisar a prévia e enviar. Na aba Auditoria, a gestão deve visualizar somente o status e, quando houver áudio, abrir uma URL assinada temporária. O caminho do arquivo nunca deve ser exibido para o pesquisador.

A limpeza de arquivos é restrita à gestão. Em uma falha rara entre o upload e o vínculo do evento, o arquivo permanece privado para posterior limpeza administrativa; não foi criada deleção ampla para usuários autenticados.
