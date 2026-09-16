-- PesquisaPro — assinatura individual administrativa do pesquisador
-- Ação explícita, auditável e idempotente. Não remove assinaturas existentes.

begin;

alter table public.researcher_contracts
  add column if not exists signature_origin text not null default 'researcher',
  add column if not exists signed_by_admin uuid references public.profiles(id);

alter table public.researcher_contracts
  drop constraint if exists researcher_contracts_signature_origin_check;
alter table public.researcher_contracts
  add constraint researcher_contracts_signature_origin_check
  check (signature_origin in ('researcher','admin'));

create or replace function public.admin_sign_researcher_contract(
  p_researcher_id uuid,
  p_contract_version text,
  p_content_hash text,
  p_ip_address text default null,
  p_user_agent text default null
)
returns public.researcher_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_row public.researcher_contracts;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas um administrador pode executar esta ação';
  end if;

  select * into v_profile from public.profiles where id=p_researcher_id and role='pesq';
  if v_profile.id is null then
    raise exception 'Pesquisador não encontrado';
  end if;
  if nullif(trim(coalesce(p_contract_version,'')),'') is null then
    raise exception 'Versão do contrato não informada';
  end if;

  insert into public.researcher_contracts(
    researcher_id,contract_version,full_name,cpf,content_hash,ip_address,user_agent,
    signature_origin,signed_by_admin
  ) values (
    v_profile.id,trim(p_contract_version),v_profile.name,v_profile.cpf,
    coalesce(nullif(trim(p_content_hash),''),'indisponível neste navegador'),
    p_ip_address,p_user_agent,'admin',auth.uid()
  ) on conflict (researcher_id,contract_version) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.researcher_contracts
     where researcher_id=p_researcher_id and contract_version=trim(p_contract_version);
  end if;
  return v_row;
end;
$$;

revoke all on function public.admin_sign_researcher_contract(uuid,text,text,text,text) from public;
grant execute on function public.admin_sign_researcher_contract(uuid,text,text,text,text) to authenticated;

commit;
