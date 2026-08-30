-- PesquisaPro — otimização de consultas e endurecimento das RPCs
-- Execute depois de schema.sql e dos scripts de RLS já existentes.
-- Esta migração não altera dados; cria índices e restringe funções ao perfil autenticado.

-- Consultas da lista/mapa/auditoria e sincronização financeira.
create index if not exists idx_collection_events_survey_occurred
  on public.collection_events (survey_id, occurred_at desc);

create index if not exists idx_collection_events_researcher_occurred
  on public.collection_events (researcher_id, occurred_at desc);

create index if not exists idx_collection_events_survey_researcher_status
  on public.collection_events (survey_id, researcher_id, status);

-- Relatórios agregam respostas por pergunta e evento.
create index if not exists idx_collection_answers_question_event
  on public.collection_answers (question_id, collection_event_id);

create index if not exists idx_collection_answers_event_question
  on public.collection_answers (collection_event_id, question_id);

-- A tela de equipe e os convites filtram frequentemente por pesquisador/status.
create index if not exists idx_survey_team_researcher_survey
  on public.survey_team (researcher_id, survey_id);

create index if not exists idx_survey_invites_researcher_status
  on public.survey_invites (researcher_id, status, invited_at desc);

create index if not exists idx_survey_invites_survey_status
  on public.survey_invites (survey_id, status, invited_at desc);

-- O cliente consulta os vínculos para descobrir suas pesquisas.
create index if not exists idx_survey_clients_client_survey
  on public.survey_clients (client_id, survey_id);

-- As funções de agregação expõem apenas dados resumidos e não devem ser
-- invocáveis por visitantes anônimos.
revoke execute on function public.survey_quota_counts(uuid) from public;
grant execute on function public.survey_quota_counts(uuid) to authenticated;

revoke execute on function public.survey_answer_distribution(uuid, uuid) from public;
grant execute on function public.survey_answer_distribution(uuid, uuid) to authenticated;

revoke execute on function public.respond_survey_invite(uuid, boolean) from public;
grant execute on function public.respond_survey_invite(uuid, boolean) to authenticated;

-- Evita que um usuário autenticado use a função de cota para consultar uma
-- pesquisa à qual não pertence. Staff continua vendo todas as pesquisas.
create or replace function public.survey_quota_counts(p_survey_id uuid)
returns table(quota_label text, valid_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
    public.is_staff()
    or exists (
      select 1 from public.survey_team st
      where st.survey_id = p_survey_id and st.researcher_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select ce.quota_label, count(*)::bigint
    from public.collection_events ce
    where ce.survey_id = p_survey_id
      and ce.status = 'valid'
      and ce.quota_label is not null
    group by ce.quota_label;
end;
$$;

grant execute on function public.survey_quota_counts(uuid) to authenticated;

-- Reforça que a função de distribuição só aceita pergunta pertencente à
-- pesquisa solicitada, evitando consulta cruzada entre pesquisas.
create or replace function public.survey_answer_distribution(p_survey_id uuid, p_question_id uuid)
returns table(value_label text, cnt bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
    public.is_staff()
    or exists (
      select 1 from public.survey_clients sc
      where sc.survey_id = p_survey_id and sc.client_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.survey_questions q
    where q.id = p_question_id and q.survey_id = p_survey_id
  ) then
    raise exception 'question does not belong to survey';
  end if;

  return query
    select coalesce(a.value_text, a.value_number::text) as value_label,
           count(*)::bigint as cnt
    from public.collection_answers a
    join public.collection_events ce on ce.id = a.collection_event_id
    where ce.survey_id = p_survey_id
      and a.question_id = p_question_id
      and ce.status = 'valid'
      and ce.is_calibration = false
    group by coalesce(a.value_text, a.value_number::text)
    order by cnt desc;
end;
$$;

grant execute on function public.survey_answer_distribution(uuid, uuid) to authenticated;
