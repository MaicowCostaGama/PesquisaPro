-- PesquisaPro — ranking de preferências e pergunta composta com duas respostas
-- Migration aditiva: não remove pesquisas, perguntas ou respostas já coletadas.
begin;

alter table public.survey_questions
  add column if not exists is_active boolean not null default true;

-- A resposta de ranking mantém uma linha por opção, usando value_number para
-- guardar a posição (1 = mais preferida). As perguntas antigas continuam iguais.
do $$
begin
  alter table public.survey_questions
    drop constraint if exists survey_questions_type_check;
  alter table public.survey_questions
    add constraint survey_questions_type_check
    check (type in ('single','multi','ranking','pair','scale','scale10','nps','open','number','date'));
end $$;

-- Subcampos da pergunta "Duas respostas". O campo options_jsonb é usado apenas
-- quando o tipo do subcampo é single ou multi.
create table if not exists public.survey_question_fields (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  position integer not null,
  label text not null,
  type text not null check (type in ('open','single','multi')),
  options_jsonb jsonb not null default '[]'::jsonb,
  unique (question_id, position)
);

-- Identifica a qual subcampo pertence uma resposta composta. NULL preserva o
-- significado das respostas antigas e das perguntas simples.
alter table public.collection_answers
  add column if not exists field_id uuid references public.survey_question_fields(id) on delete cascade;

-- Se a coluna acabou de ser criada pela instrução acima ou já existia em uma
-- versão anterior, a exclusão de um subcampo deve apenas desassociar a resposta
-- histórica, nunca apagá-la.
alter table public.collection_answers
  drop constraint if exists collection_answers_field_id_fkey;
alter table public.collection_answers
  add constraint collection_answers_field_id_fkey
  foreign key (field_id) references public.survey_question_fields(id) on delete set null;

create index if not exists survey_question_fields_question_idx
  on public.survey_question_fields(question_id, position);

create index if not exists collection_answers_field_idx
  on public.collection_answers(field_id);

alter table public.survey_question_fields enable row level security;

drop policy if exists "staff gerencia campos de perguntas" on public.survey_question_fields;
create policy "staff gerencia campos de perguntas"
  on public.survey_question_fields for all
  using (public.is_staff());

drop policy if exists "pesquisador vê campos das pesquisas da sua equipe" on public.survey_question_fields;
create policy "pesquisador vê campos das pesquisas da sua equipe"
  on public.survey_question_fields for select
  using (
    exists (
      select 1
      from public.survey_questions q
      join public.survey_team st on st.survey_id = q.survey_id
      where q.id = survey_question_fields.question_id
        and st.researcher_id = auth.uid()
    )
  );

drop policy if exists "cliente vê campos das suas pesquisas" on public.survey_question_fields;
create policy "cliente vê campos das suas pesquisas"
  on public.survey_question_fields for select
  using (
    exists (
      select 1
      from public.survey_questions q
      join public.survey_clients sc on sc.survey_id = q.survey_id
      where q.id = survey_question_fields.question_id
        and sc.client_id = auth.uid()
    )
  );

-- Mantém a policy de respostas antigas e acrescenta a integridade da pergunta
-- composta: um pesquisador não pode apontar field_id para outro question_id.
drop policy if exists "pesquisador registra respostas das próprias coletas" on public.collection_answers;
create policy "pesquisador registra respostas das próprias coletas"
  on public.collection_answers for insert
  with check (
    exists (
      select 1 from public.collection_events ce
      where ce.id = collection_answers.collection_event_id
        and ce.researcher_id = auth.uid()
    )
    and (
      collection_answers.field_id is null
      or exists (
        select 1 from public.survey_question_fields f
        where f.id = collection_answers.field_id
          and f.question_id = collection_answers.question_id
      )
    )
  );

-- Distribuição usada por telas legadas de resultados. Mantém o mesmo retorno
-- público e apenas melhora o rótulo de ranking e subcampo.
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
    or exists (select 1 from public.survey_clients sc where sc.survey_id = p_survey_id and sc.client_id = auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select
      case when a.field_id is not null then coalesce(f.label,'Resposta')||': ' else '' end||
        case when q.type='ranking' and a.value_number is not null then a.value_number::int||'º — ' else '' end||
        coalesce(a.value_text, a.value_number::text) as value_label,
      count(distinct a.collection_event_id)::bigint as cnt
    from public.collection_answers a
    join public.collection_events ce on ce.id = a.collection_event_id
    join public.survey_questions q on q.id = a.question_id
    left join public.survey_question_fields f on f.id = a.field_id
    where ce.survey_id = p_survey_id
      and a.question_id = p_question_id
      and ce.status = 'valid'
      and ce.is_calibration = false
    group by q.type, a.field_id, f.label, a.value_text, a.value_number
    order by cnt desc;
end;
$$;
grant execute on function public.survey_answer_distribution(uuid, uuid) to authenticated;

-- Relatório agregado do staff. Ranking é mostrado por posição; cada subcampo
-- da pergunta composta recebe seu próprio rótulo. Nenhuma resposta individual
-- é devolvida ao navegador.
create or replace function public.survey_report_all_questions(p_survey_id uuid)
returns table(
  question_id uuid,
  value_label text,
  cnt bigint,
  valid_base bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  return query
    with valid_base as (
      select count(*)::bigint as total
      from public.collection_events ce
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
    ), grouped as (
      select
        a.question_id,
        case when a.field_id is not null then coalesce(f.label,'Resposta')||': ' else '' end||
          case when q.type='ranking' and a.value_number is not null then a.value_number::int||'º — ' else '' end||
          coalesce(nullif(trim(a.value_text), ''), a.value_number::text, '(sem resposta)') as label,
        count(distinct a.collection_event_id)::bigint as amount
      from public.collection_answers a
      join public.collection_events ce on ce.id = a.collection_event_id
      join public.survey_questions q on q.id = a.question_id
      left join public.survey_question_fields f on f.id = a.field_id
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
      group by a.question_id, q.type, a.field_id, f.label, a.value_number, a.value_text
    )
    select g.question_id,g.label,g.amount,b.total
    from grouped g cross join valid_base b
    order by g.question_id,g.amount desc,g.label;
end;
$$;

create or replace function public.survey_report_cross_tab(
  p_survey_id uuid,
  p_question_ids uuid[]
)
returns table(
  variable_1 text,
  variable_2 text,
  variable_3 text,
  cnt bigint,
  valid_base bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  question_count integer := coalesce(array_length(p_question_ids,1),0);
  invalid_count integer;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  if question_count < 1 or question_count > 3 then
    raise exception 'select from one to three variables';
  end if;

  select count(*)::integer into invalid_count
  from unnest(p_question_ids) as selected(id)
  where not exists (
    select 1 from public.survey_questions q
    where q.id = selected.id
      and q.survey_id = p_survey_id
      and q.type not in ('open','ranking','pair')
  );
  if invalid_count > 0 then
    raise exception 'one or more variables are invalid for this survey';
  end if;

  return query
    with valid_events as (
      select ce.id
      from public.collection_events ce
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
    ), per_event as (
      select
        ve.id,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where a.question_id = p_question_ids[1]) as v1,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where question_count >= 2 and a.question_id = p_question_ids[2]) as v2,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where question_count >= 3 and a.question_id = p_question_ids[3]) as v3
      from valid_events ve
      left join public.collection_answers a
        on a.collection_event_id = ve.id
       and a.question_id = any(p_question_ids)
      group by ve.id
    ), grouped as (
      select
        coalesce(v1,'(sem resposta)') as g1,
        case when question_count >= 2 then coalesce(v2,'(sem resposta)') else null end as g2,
        case when question_count >= 3 then coalesce(v3,'(sem resposta)') else null end as g3,
        count(*)::bigint as amount
      from per_event
      group by 1,2,3
    ), base as (
      select count(*)::bigint as total from valid_events
    )
    select g.g1,g.g2,g.g3,g.amount,b.total
    from grouped g cross join base b
    order by g.amount desc,g.g1,g.g2,g.g3;
end;
$$;

-- Relatório agregado liberado para o cliente; aplica a mesma modelagem e a
-- mesma exclusão de ranking/pergunta composta dos cruzamentos.
create or replace function public.client_report_all_questions(p_survey_id uuid)
returns table(
  question_id uuid,
  value_label text,
  cnt bigint,
  valid_base bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.client_results_released(p_survey_id) then
    raise exception 'results not released';
  end if;

  return query
    with valid_base as (
      select count(*)::bigint as total
      from public.collection_events ce
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
    ), grouped as (
      select
        a.question_id,
        case when a.field_id is not null then coalesce(f.label,'Resposta')||': ' else '' end||
          case when q.type='ranking' and a.value_number is not null then a.value_number::int||'º — ' else '' end||
          coalesce(nullif(trim(a.value_text), ''), a.value_number::text, '(sem resposta)') as label,
        count(distinct a.collection_event_id)::bigint as amount
      from public.collection_answers a
      join public.collection_events ce on ce.id = a.collection_event_id
      join public.survey_questions q on q.id = a.question_id
      left join public.survey_question_fields f on f.id = a.field_id
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
      group by a.question_id, q.type, a.field_id, f.label, a.value_number, a.value_text
    )
    select g.question_id,g.label,g.amount,b.total
    from grouped g cross join valid_base b
    order by g.question_id,g.amount desc,g.label;
end;
$$;

create or replace function public.client_report_cross_tab(
  p_survey_id uuid,
  p_question_ids uuid[]
)
returns table(
  variable_1 text,
  variable_2 text,
  variable_3 text,
  cnt bigint,
  valid_base bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  question_count integer := coalesce(array_length(p_question_ids,1),0);
  invalid_count integer;
begin
  if not public.client_results_released(p_survey_id) then
    raise exception 'results not released';
  end if;
  if question_count < 1 or question_count > 3 then
    raise exception 'select from one to three variables';
  end if;

  select count(*)::integer into invalid_count
  from unnest(p_question_ids) as selected(id)
  where not exists (
    select 1 from public.survey_questions q
    where q.id = selected.id
      and q.survey_id = p_survey_id
      and q.type not in ('open','ranking','pair')
  );
  if invalid_count > 0 then
    raise exception 'one or more variables are invalid for this survey';
  end if;

  return query
    with valid_events as (
      select ce.id
      from public.collection_events ce
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
    ), per_event as (
      select
        ve.id,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where a.question_id = p_question_ids[1]) as v1,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where question_count >= 2 and a.question_id = p_question_ids[2]) as v2,
        string_agg(distinct coalesce(nullif(trim(a.value_text), ''), a.value_number::text), ' + ' order by coalesce(nullif(trim(a.value_text), ''), a.value_number::text))
          filter (where question_count >= 3 and a.question_id = p_question_ids[3]) as v3
      from valid_events ve
      left join public.collection_answers a
        on a.collection_event_id = ve.id
       and a.question_id = any(p_question_ids)
      group by ve.id
    ), grouped as (
      select
        coalesce(v1,'(sem resposta)') as g1,
        case when question_count >= 2 then coalesce(v2,'(sem resposta)') else null end as g2,
        case when question_count >= 3 then coalesce(v3,'(sem resposta)') else null end as g3,
        count(*)::bigint as amount
      from per_event
      group by 1,2,3
    ), base as (
      select count(*)::bigint as total from valid_events
    )
    select g.g1,g.g2,g.g3,g.amount,b.total
    from grouped g cross join base b
    order by g.amount desc,g.g1,g.g2,g.g3;
end;
$$;

revoke all on function public.survey_report_all_questions(uuid) from public;
revoke all on function public.survey_report_cross_tab(uuid,uuid[]) from public;
revoke all on function public.client_report_all_questions(uuid) from public;
revoke all on function public.client_report_cross_tab(uuid,uuid[]) from public;
grant execute on function public.survey_report_all_questions(uuid) to authenticated;
grant execute on function public.survey_report_cross_tab(uuid,uuid[]) to authenticated;
grant execute on function public.client_report_all_questions(uuid) to authenticated;
grant execute on function public.client_report_cross_tab(uuid,uuid[]) to authenticated;

commit;
