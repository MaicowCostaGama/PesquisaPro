-- PesquisaPro — georreferenciamento agregado para clientes
-- O cliente recebe somente pontos aproximados e contagens agregadas.
-- Não expõe pesquisador, telefone, CPF, e-mail, motivo de reprovação ou coordenada exata.

begin;

create or replace function public.client_collection_geo_summary(p_survey_id uuid)
returns table(
  lat numeric,
  lng numeric,
  point_count bigint,
  valid_count bigint,
  rejected_count bigint,
  calibration_count bigint,
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
      round(ce.lat::numeric, 3) as lat,
      round(ce.lng::numeric, 3) as lng,
      count(*)::bigint as point_count,
      count(*) filter (where ce.status = 'valid' and ce.is_calibration = false)::bigint as valid_count,
      count(*) filter (where ce.status = 'rejected')::bigint as rejected_count,
      count(*) filter (where ce.is_calibration = true)::bigint as calibration_count,
      max(ce.occurred_at) as last_occurred_at
    from public.collection_events ce
    where ce.survey_id = p_survey_id
      and ce.lat is not null
      and ce.lng is not null
    group by round(ce.lat::numeric, 3), round(ce.lng::numeric, 3)
    order by max(ce.occurred_at) desc;
end;
$$;

create or replace function public.client_collection_geo_feed(p_survey_id uuid)
returns table(
  quota_label text,
  status text,
  is_calibration boolean,
  occurred_at timestamptz,
  synced boolean,
  accuracy_m numeric
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
      coalesce(ce.quota_label, 'Sem cota') as quota_label,
      ce.status,
      ce.is_calibration,
      ce.occurred_at,
      ce.synced,
      ce.accuracy_m::numeric
    from public.collection_events ce
    where ce.survey_id = p_survey_id
    order by ce.occurred_at desc
    limit 100;
end;
$$;

revoke all on function public.client_collection_geo_summary(uuid) from public;
revoke all on function public.client_collection_geo_feed(uuid) from public;
grant execute on function public.client_collection_geo_summary(uuid) to authenticated;
grant execute on function public.client_collection_geo_feed(uuid) to authenticated;

comment on function public.client_collection_geo_summary(uuid) is
  'Pontos aproximados e contagens agregadas da coleta para cliente liberado; não expõe pesquisador ou coordenada exata.';
comment on function public.client_collection_geo_feed(uuid) is
  'Feed agregado e anonimizado da coleta para cliente liberado.';

commit;
