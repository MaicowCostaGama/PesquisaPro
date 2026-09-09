-- PesquisaPro — progresso real no perfil cliente
-- Executar depois de deploy/relatorios-resultados-clientes.sql.
-- Retorna somente agregados da pesquisa vinculada e liberada; não expõe linhas individuais.

begin;

create or replace function public.client_collection_progress(p_survey_id uuid)
returns table(
  valid_count bigint,
  total_count bigint,
  rejected_count bigint,
  calibration_count bigint,
  researcher_count bigint,
  last_occurred_at timestamptz
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
    select
      count(*) filter (where ce.status = 'valid' and ce.is_calibration = false)::bigint,
      count(*)::bigint,
      count(*) filter (where ce.status = 'rejected')::bigint,
      count(*) filter (where ce.is_calibration = true)::bigint,
      count(distinct ce.researcher_id)::bigint,
      max(ce.occurred_at)
    from public.collection_events ce
    where ce.survey_id = p_survey_id;
end;
$$;

create or replace function public.client_collection_quota_progress(p_survey_id uuid)
returns table(
  question_id uuid,
  question_text text,
  quota_label text,
  valid_count bigint,
  target_count bigint
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
    with settings as (
      select
        greatest(1, ceil(
          (
            s.populacao
            * power(coalesce(s.nivel_confianca, 1.96), 2)
            * (coalesce(s.proporcao, 50) / 100.0)
            * (1 - coalesce(s.proporcao, 50) / 100.0)
          )
          / nullif(
              power(coalesce(s.margem_erro, 0.03), 2) * greatest(s.populacao - 1, 1)
              + power(coalesce(s.nivel_confianca, 1.96), 2)
                * (coalesce(s.proporcao, 50) / 100.0)
                * (1 - coalesce(s.proporcao, 50) / 100.0),
              0
            )
        ) * 1.1)::bigint as adjusted_sample
      from public.surveys s
      where s.id = p_survey_id
    )
    select
      q.id,
      q.text,
      o.label,
      count(ce.id) filter (
        where ce.status = 'valid' and ce.is_calibration = false
      )::bigint,
      greatest(1, ceil(coalesce(settings.adjusted_sample, 0) * o.quota_pct / 100.0))::bigint
    from public.survey_questions q
    join public.survey_question_options o on o.question_id = q.id
    cross join settings
    left join public.collection_events ce
      on ce.survey_id = p_survey_id
     and ce.quota_label = o.label
    where q.survey_id = p_survey_id
      and o.quota_enabled = true
      and o.quota_pct is not null
    group by q.id, q.text, o.position, o.label, o.quota_pct, settings.adjusted_sample
    order by q.position, o.position;
end;
$$;

revoke all on function public.client_collection_progress(uuid) from public;
revoke all on function public.client_collection_quota_progress(uuid) from public;
grant execute on function public.client_collection_progress(uuid) to authenticated;
grant execute on function public.client_collection_quota_progress(uuid) to authenticated;

comment on function public.client_collection_progress(uuid) is
  'Resumo agregado real da coleta para o cliente vinculado com resultado liberado.';
comment on function public.client_collection_quota_progress(uuid) is
  'Metas e contagens agregadas reais das cotas para o cliente vinculado com resultado liberado.';

commit;
