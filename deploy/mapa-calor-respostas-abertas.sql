-- PesquisaPro — mapas de calor por resposta selecionada
-- Master: qualquer pesquisa autorizada pela gestão.
-- Cliente: somente pesquisa vinculada com resultado liberado.
-- Retorna apenas agregações; coordenadas arredondadas e sem identificação pessoal.

begin;

create or replace function public.response_heatmap_authorized(p_survey_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_staff() or public.client_results_released(p_survey_id);
$$;

create or replace function public.survey_response_values(
  p_survey_id uuid,
  p_question_id uuid
)
returns table(value_label text,response_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.response_heatmap_authorized(p_survey_id) then
    raise exception 'not authorized';
  end if;
  if not exists (
    select 1 from public.survey_questions q
    where q.id=p_question_id and q.survey_id=p_survey_id and q.type<>'date'
  ) then
    raise exception 'question must be answerable and belong to this survey';
  end if;

  return query
    select coalesce(nullif(trim(a.value_text),''),a.value_number::text,'(sem resposta)') as value_label,
           count(distinct a.collection_event_id)::bigint as response_count
    from public.collection_answers a
    join public.collection_events ce on ce.id=a.collection_event_id
    where ce.survey_id=p_survey_id
      and a.question_id=p_question_id
      and ce.status='valid'
      and ce.is_calibration=false
    group by coalesce(nullif(trim(a.value_text),''),a.value_number::text,'(sem resposta)')
    order by response_count desc,value_label
    limit 100;
end;
$$;

create or replace function public.survey_response_heatmap(
  p_survey_id uuid,
  p_question_id uuid,
  p_value_label text
)
returns table(lat numeric,lng numeric,point_count bigint,last_occurred_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.response_heatmap_authorized(p_survey_id) then
    raise exception 'not authorized';
  end if;
  if not exists (
    select 1 from public.survey_questions q
    where q.id=p_question_id and q.survey_id=p_survey_id and q.type<>'date'
  ) then
    raise exception 'question must be answerable and belong to this survey';
  end if;

  return query
    select round(ce.lat::numeric,3) as lat,
           round(ce.lng::numeric,3) as lng,
           count(distinct ce.id)::bigint as point_count,
           max(ce.occurred_at) as last_occurred_at
    from public.collection_answers a
    join public.collection_events ce on ce.id=a.collection_event_id
    where ce.survey_id=p_survey_id
      and a.question_id=p_question_id
      and ce.status='valid'
      and ce.is_calibration=false
      and lower(trim(coalesce(nullif(a.value_text,''),a.value_number::text,'(sem resposta)'))) = lower(trim(coalesce(p_value_label,'(sem resposta)')))
      and ce.lat is not null
      and ce.lng is not null
    group by round(ce.lat::numeric,3),round(ce.lng::numeric,3)
    order by max(ce.occurred_at) desc;
end;
$$;

revoke all on function public.response_heatmap_authorized(uuid) from public;
revoke all on function public.survey_response_values(uuid,uuid) from public;
revoke all on function public.survey_response_heatmap(uuid,uuid,text) from public;
grant execute on function public.response_heatmap_authorized(uuid) to authenticated;
grant execute on function public.survey_response_values(uuid,uuid) to authenticated;
grant execute on function public.survey_response_heatmap(uuid,uuid,text) to authenticated;

comment on function public.survey_response_values(uuid,uuid) is
  'Lista respostas agregadas de pergunta para seleção do mapa de calor.';
comment on function public.survey_response_heatmap(uuid,uuid,text) is
  'Mapa de calor agregado de uma resposta selecionada, com coordenadas arredondadas.';

commit;
