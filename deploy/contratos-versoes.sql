-- PesquisaPro — versões persistentes do contrato-quadro
-- Adotiva: preserva assinaturas e contratos já registrados.

begin;

create table if not exists public.contract_settings (
  id smallint primary key default 1 check (id = 1),
  current_version text not null default 'v1-2026',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.contract_settings(id,current_version)
values (1,'v1-2026')
on conflict (id) do nothing;

alter table public.contract_settings enable row level security;

drop policy if exists "logados veem versao vigente" on public.contract_settings;
create policy "logados veem versao vigente"
  on public.contract_settings for select to authenticated using (true);

drop policy if exists "admin gerencia versao vigente" on public.contract_settings;
create policy "admin gerencia versao vigente"
  on public.contract_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_current_contract_version()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select current_version from public.contract_settings where id=1;
$$;

create or replace function public.create_contract_version(p_new_version text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_version text := trim(coalesce(p_new_version,''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas um administrador pode criar uma versão de contrato';
  end if;
  if v_version !~ '^v[0-9]+-[0-9]{4}([.-][A-Za-z0-9_-]+)?$' then
    raise exception 'Use um formato como v2-2026';
  end if;
  update public.contract_settings
     set current_version=v_version, updated_by=auth.uid(), updated_at=now()
   where id=1;
  return v_version;
end;
$$;

revoke all on function public.get_current_contract_version() from public;
grant execute on function public.get_current_contract_version() to authenticated;
revoke all on function public.create_contract_version(text) from public;
grant execute on function public.create_contract_version(text) to authenticated;

commit;
