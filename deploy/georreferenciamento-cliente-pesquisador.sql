-- PesquisaPro — pesquisador no georreferenciamento do cliente
-- Executar depois de deploy/georreferenciamento-clientes.sql.
-- Expõe somente nomes, sem telefone, CPF, e-mail, documentos ou coordenadas exatas.

begin;

drop function if exists public.client_collection_geo_summary(uuid);

create function public.client_collection_geo_summary(p_survey_id uuid)
returns table(
  lat numeric,
  lng numeric,
  point_count bigint,
  valid_count bigint,
  rejected_count bigint,
  calibration_count bigint,
  last_occurred_at timestamptz,
  researcher_names text
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
      max(ce.occurred_at) as last_occurred_at,
      coalesce(
        string_agg(
          distinct nullif(trim(p.name), ''),
          ', ' order by nullif(trim(p.name), '')
        ),
        'Pesquisador não identificado'
      ) as researcher_names
    from public.collection_events ce
    left join public.profiles p on p.id = ce.researcher_id
    where ce.survey_id = p_survey_id
      and ce.lat is not null
      and ce.lng is not null
    group by round(ce.lat::numeric, 3), round(ce.lng::numeric, 3)
    order by max(ce.occurred_at) desc;
end;
$$;

revoke all on function public.client_collection_geo_summary(uuid) from public;
grant execute on function public.client_collection_geo_summary(uuid) to authenticated;

comment on function public.client_collection_geo_summary(uuid) is
  'Pontos aproximados, contagens e nomes dos pesquisadores da área para cliente liberado; não expõe contatos ou coordenadas exatas.';

commit;
