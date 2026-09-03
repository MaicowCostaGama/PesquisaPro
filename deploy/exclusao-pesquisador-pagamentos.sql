-- PesquisaPro — concluir exclusão de pesquisador com histórico financeiro
-- Executar depois de deploy/exclusao-pesquisador-com-coletas.sql.
-- Preserva o resumo financeiro, removendo somente a identidade do perfil.

begin;

alter table public.payments
  alter column researcher_id drop not null;

alter table public.payments
  drop constraint if exists payments_researcher_id_fkey;

alter table public.payments
  add constraint payments_researcher_id_fkey
  foreign key (researcher_id)
  references public.profiles(id)
  on delete set null;

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
  -- Durante a exclusão do perfil, a FK de collection_events coloca
  -- researcher_id em NULL. Não recriar payment sem um perfil válido.
  if new.researcher_id is null then
    return null;
  end if;

  v_survey_id := new.survey_id;
  v_researcher_id := new.researcher_id;

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

commit;
