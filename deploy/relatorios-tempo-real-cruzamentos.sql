-- PesquisaPro — relatórios em tempo real e cruzamentos de até três variáveis
-- Executar uma vez no SQL Editor do Supabase.
-- Não retorna respostas individuais para o navegador: devolve apenas agregações.

begin;

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
        coalesce(nullif(trim(a.value_text), ''), a.value_number::text, '(sem resposta)') as label,
        count(distinct a.collection_event_id)::bigint as amount
      from public.collection_answers a
      join public.collection_events ce on ce.id = a.collection_event_id
      where ce.survey_id = p_survey_id
        and ce.status = 'valid'
        and ce.is_calibration = false
      group by a.question_id, coalesce(nullif(trim(a.value_text), ''), a.value_number::text, '(sem resposta)')
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
      and q.type <> 'open'
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
grant execute on function public.survey_report_all_questions(uuid) to authenticated;
grant execute on function public.survey_report_cross_tab(uuid,uuid[]) to authenticated;

comment on function public.survey_report_all_questions(uuid) is
  'Agrega respostas válidas de todas as perguntas de uma pesquisa; acesso restrito à gestão.';
comment on function public.survey_report_cross_tab(uuid,uuid[]) is
  'Cruza uma, duas ou três perguntas não abertas; acesso restrito à gestão.';

commit;
