-- ============================================================================
-- Ativa a coleta de campo de verdade: segurança por linha (RLS) na tabela de
-- entrevistas (collection_events), uma função para o pesquisador ver o total
-- de cada cota já coletado pela equipe (sem enxergar as coletas dos colegas
-- uma a uma), e permissão para o pesquisador ler a própria pesquisa/perguntas
-- quando está na equipe dela.
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run".
-- ============================================================================

alter table public.collection_events enable row level security;

create policy "staff gerencia coletas"
  on public.collection_events for all
  using (public.is_staff());

create policy "pesquisador vê suas próprias coletas"
  on public.collection_events for select
  using (researcher_id = auth.uid());

create policy "pesquisador registra suas próprias coletas"
  on public.collection_events for insert
  with check (researcher_id = auth.uid());

create or replace function public.survey_quota_counts(p_survey_id uuid)
returns table(quota_label text, valid_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select quota_label, count(*)::bigint
  from public.collection_events
  where survey_id = p_survey_id
    and status = 'valid'
    and quota_label is not null
  group by quota_label;
$$;

grant execute on function public.survey_quota_counts(uuid) to authenticated;

create policy "pesquisador vê pesquisas da sua equipe"
  on public.surveys for select
  using (
    exists (
      select 1 from public.survey_team st
      where st.survey_id = surveys.id and st.researcher_id = auth.uid()
    )
  );

create policy "pesquisador vê perguntas das pesquisas da sua equipe"
  on public.survey_questions for select
  using (
    exists (
      select 1 from public.survey_team st
      where st.survey_id = survey_questions.survey_id and st.researcher_id = auth.uid()
    )
  );

create policy "pesquisador vê opções das pesquisas da sua equipe"
  on public.survey_question_options for select
  using (
    exists (
      select 1 from public.survey_questions q
      join public.survey_team st on st.survey_id = q.survey_id
      where q.id = survey_question_options.question_id and st.researcher_id = auth.uid()
    )
  );

-- Sincronização automática coleta → financeiro (veja o comentário completo em
-- schema.sql): o pesquisador não escreve direto em "payments", este gatilho
-- que recalcula válidos/rejeitados a partir de collection_events.
create or replace function public.sync_payment_from_collection_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey_id uuid;
  v_researcher_id uuid;
  v_valid integer;
  v_rejected integer;
begin
  v_survey_id := coalesce(new.survey_id, old.survey_id);
  v_researcher_id := coalesce(new.researcher_id, old.researcher_id);

  select count(*) filter (where status = 'valid'), count(*) filter (where status = 'rejected')
    into v_valid, v_rejected
    from public.collection_events
    where survey_id = v_survey_id and researcher_id = v_researcher_id;

  insert into public.payments (survey_id, researcher_id, valid_count, rejected_count, status, updated_at)
  values (v_survey_id, v_researcher_id, v_valid, v_rejected, 'pendente', now())
  on conflict (survey_id, researcher_id)
  do update set valid_count = excluded.valid_count,
                rejected_count = excluded.rejected_count,
                updated_at = now();
  return null;
end;
$$;

drop trigger if exists trg_sync_payment_from_collection_events on public.collection_events;
create trigger trg_sync_payment_from_collection_events
after insert or update on public.collection_events
for each row execute function public.sync_payment_from_collection_events();
