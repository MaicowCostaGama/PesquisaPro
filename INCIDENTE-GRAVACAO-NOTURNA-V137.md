# Incidente de gravação noturna — diagnóstico e correção v137

## O que foi demonstrado

Na captura da Auditoria há entrevistas registradas após 21h, marcadas como **sincronizadas**, com **“Falha técnica — Caminho de gravação inválido”**. A captura não fornece IDs de eventos nem comprova, por si só, se os arquivos ainda estão no Storage ou quais pagamentos foram aprovados.

Há um defeito **determinístico** em `deploy/gravacao-confirmacao-20pct.sql`: `left(p_storage_path, 13)` é comparado a `confirmations/`, uma sequência de **14 caracteres**. A função `attach_collection_recording` rejeita, assim, mesmo o caminho válido. O fluxo atual envia primeiro o evento `valid` e só depois faz upload do arquivo e tenta anexá-lo. A falha do anexo resulta em `recording_status='failed'`, mas não retira `status='valid'`; portanto o evento pode continuar sendo contado no pagamento e nos resultados. O upload pode ter deixado um arquivo sem vínculo no bucket privado, porém sua existência em produção **ainda precisa ser confirmada**.

“Sincronizado” significa que o evento chegou ao banco; **não significa que a gravação foi anexada nem que a entrevista foi validada**.

## Correção publicada (teste funcional controlado pendente)

A migration aditiva [corrigir-gravacao-noturna-e-recuperar-audios.sql](/home/ubuntu/PesquisaPro-remoto/deploy/corrigir-gravacao-noturna-e-recuperar-audios.sql):

1. Corrige a comparação do caminho e exige objeto não vazio no bucket privado, prefixo vinculado ao pesquisador e ID do evento.
2. Insere novas coletas feitas após 21h no estado `pending_recording` até que o anexo seja confirmado. Esse estado **não conta como válido nem como rejeitado**, portanto não integra resultados, cotas nem valor devido. Após anexo, promove a `valid` na mesma transação. A rejeição anterior por tempo mínimo não é desfeita.
3. Impede reaprovar manualmente como `valid` uma entrevista noturna cujo arquivo não esteja vinculado no Storage.
4. Oferece à gestão o botão **Recuperar áudio do armazenamento** na Auditoria. A função procura apenas um objeto não vazio no prefixo exato da entrevista, registra a operação em log e vincula esse arquivo. Sem objeto, ou com mais de um candidato, **não** adivinha nem altera a entrevista.
5. Mostra pendência de áudio no painel do pesquisador, Auditoria, mapa e extrato como **valor potencial em auditoria**, nunca como ganho aprovado.
6. Destaca na Auditoria os registros históricos após 21h que **ainda estão válidos sem áudio** com o alerta “Válida sem áudio · revisar financeiro”. O alerta não reclassifica nem estorna pagamentos existentes.

A ampliação da restrição de status substitui apenas a `CHECK` existente, dentro da mesma transação, **sem excluir linhas ou registros históricos**. Nenhuma migration antiga é reexecutada.

### Ordem de ativação

1. A gestão verifica com consulta somente leitura os casos antigos e, se houver pagamento aprovado ou quitado, reconcilia individualmente **sem alterar recibos por inferência**.
2. O usuário executa **manualmente** a migration nova no Supabase SQL Editor, depois de conferir que `gravacao-confirmacao-regra-21h.sql` já está aplicada. **Nunca executar `schema.sql` ou a migration antiga `gravacao-confirmacao-20pct.sql` novamente.**
3. Publicar o frontend v137 **somente depois** da migration, com nova autorização específica. A migration já é compatível com o frontend anterior: novos eventos ficam pendentes se o áudio falhar, e passam a válidos quando o vínculo terminar.
4. Testar em ambiente de homologação com entrevista noturna e áudio de teste; confirmar que um upload válido aparece como `uploaded`/`valid` e que erro de upload resulta em `pending_recording`/`failed`, não pagamento.

**Não executei SQL no Supabase nem alterei entrevistas ou pagamentos de produção.** Os testes de JS/SQL locais foram estáticos; a transação no banco e o serviço Storage reais ainda dependem de um teste controlado com uma entrevista de homologação.

**Atualização:** o usuário mostrou `Success. No rows returned` após o `COMMIT` da migration v137, e autorizou a publicação do código. O commit inicial `f9ed8e9` foi enviado ao GitHub e o cache `20261007213940` foi confirmado no domínio da Vercel. Isso não comprova que cada áudio histórico exista ou seja audível.

## Diagnóstico somente leitura dos registros históricos

Executar o `SELECT` abaixo no projeto correto (não contém dados pessoais do entrevistado, GPS ou caminho completo do áudio). Ele identifica coletas noturnas com gravação necessária mas não vinculada; não altera nem reclassifica nada. Para incluir casos criados à noite e concluídos depois da meia-noite, também considera a reserva.

```sql
select e.id as coleta_id,
       e.occurred_at at time zone 'America/Sao_Paulo' as horario_local,
       e.status as status_coleta,
       e.recording_status as status_audio,
       e.recording_error as erro_audio,
       (select count(*) from storage.objects o
         where o.bucket_id='collection-recordings'
           and left(o.name,length('confirmations/'||e.researcher_id::text||'/'||e.id::text||'-'))
               = 'confirmations/'||e.researcher_id::text||'/'||e.id::text||'-') as arquivos_candidatos,
       exists(select 1 from public.collection_recordings c
              where c.collection_event_id=e.id) as audio_vinculado
from public.collection_events e
where e.recording_required is true
  and e.status='valid'
  and e.recording_status<>'uploaded'
  and (extract(hour from e.occurred_at at time zone 'America/Sao_Paulo')>=21
       or exists(select 1 from public.collection_recording_reservations r
                 where r.id=e.recording_reservation_id
                   and extract(hour from r.created_at at time zone 'America/Sao_Paulo')>=21))
order by e.occurred_at desc
limit 100;
```

**Interpretação:** `arquivos_candidatos=1` sugere um áudio recuperável, mas não prova que o conteúdo está íntegro ou audível; é necessário ouvir antes de validar. `0` exige revisão da coleta e eventual reprovação manual; `>1` exige revisão técnica para escolher o arquivo correto. Registros históricos válidos permanecem intactos até a gestão tomar decisão individual sobre aprovações e eventuais pagamentos já realizados.

## Testes locais

`node --check app.js`, `node night-recording-integrity-smoke-test.js`, parser `pglast` para a migration e a suíte geral de smoke tests. **Sem teste em banco de produção nem envio de entrevista real.**
