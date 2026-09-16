-- PesquisaPro — assinatura administrativa do contrato-quadro
-- Adotiva: não apaga nem altera assinaturas existentes.
-- A assinatura da CONTRATANTE é única por versão do contrato e vale para
-- todos os pesquisadores que assinarem essa mesma versão.

begin;

create or replace function public.sign_company_contract(
  p_contract_version text,
  p_signer_name text,
  p_signer_role text,
  p_content_hash text,
  p_ip_address text default null,
  p_user_agent text default null
)
returns public.company_contract_signatures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.company_contract_signatures;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas um administrador pode assinar pela contratante';
  end if;
  if nullif(trim(coalesce(p_contract_version,'')),'') is null then
    raise exception 'Versão do contrato não informada';
  end if;
  if nullif(trim(coalesce(p_signer_name,'')),'') is null then
    raise exception 'Nome do signatário não informado';
  end if;
  if nullif(trim(coalesce(p_signer_role,'')),'') is null then
    raise exception 'Cargo do signatário não informado';
  end if;

  insert into public.company_contract_signatures(
    contract_version,signed_by,signer_name,signer_role,content_hash,ip_address,user_agent
  ) values (
    trim(p_contract_version),auth.uid(),trim(p_signer_name),trim(p_signer_role),
    coalesce(nullif(trim(p_content_hash),''),'indisponível neste navegador'),p_ip_address,p_user_agent
  )
  on conflict (contract_version) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
      from public.company_contract_signatures
      where contract_version=trim(p_contract_version);
  end if;
  return v_row;
end;
$$;

revoke all on function public.sign_company_contract(text,text,text,text,text,text) from public;
grant execute on function public.sign_company_contract(text,text,text,text,text,text) to authenticated;

commit;
