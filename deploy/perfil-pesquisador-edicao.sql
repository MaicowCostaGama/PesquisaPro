begin;

alter table public.profile_cidades_atuacao enable row level security;
drop policy if exists "pesquisador vê próprias cidades" on public.profile_cidades_atuacao;
drop policy if exists "pesquisador insere próprias cidades" on public.profile_cidades_atuacao;
drop policy if exists "pesquisador atualiza próprias cidades" on public.profile_cidades_atuacao;
drop policy if exists "pesquisador remove próprias cidades" on public.profile_cidades_atuacao;
drop policy if exists "admin gerencia cidades dos pesquisadores" on public.profile_cidades_atuacao;
create policy "pesquisador vê próprias cidades" on public.profile_cidades_atuacao for select using (auth.uid() = profile_id or public.is_admin());
create policy "pesquisador insere próprias cidades" on public.profile_cidades_atuacao for insert with check (auth.uid() = profile_id);
create policy "pesquisador atualiza próprias cidades" on public.profile_cidades_atuacao for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "pesquisador remove próprias cidades" on public.profile_cidades_atuacao for delete using (auth.uid() = profile_id);
create policy "admin gerencia cidades dos pesquisadores" on public.profile_cidades_atuacao for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.update_my_researcher_profile(
  p_name text,
  p_birth date default null,
  p_phone text default null,
  p_cidade text default null,
  p_rua text default null,
  p_numero text default null,
  p_cep text default null,
  p_pix_key text default null,
  p_pix_doc text default null,
  p_pix_bank text default null,
  p_pix_ag text default null,
  p_pix_acc text default null,
  p_cidades text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_city_count integer;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_uid and role = 'pesq'
  ) then
    raise exception 'Somente pesquisadores podem atualizar este cadastro';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Nome completo é obrigatório';
  end if;
  if nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'Celular é obrigatório';
  end if;
  if nullif(trim(coalesce(p_cidade, '')), '') is null then
    raise exception 'Cidade onde mora é obrigatória';
  end if;

  select count(*) into v_city_count
  from (
    select distinct trim(value) as cidade
    from unnest(coalesce(p_cidades, '{}'::text[])) as value
    where nullif(trim(value), '') is not null
  ) cities;

  if v_city_count < 1 or v_city_count > 5 then
    raise exception 'Escolha de uma a cinco cidades de atuação';
  end if;

  update public.profiles
  set name = trim(p_name),
      birth = p_birth,
      phone = nullif(trim(p_phone), ''),
      cidade = nullif(trim(p_cidade), ''),
      rua = nullif(trim(coalesce(p_rua, '')), ''),
      numero = nullif(trim(coalesce(p_numero, '')), ''),
      cep = nullif(trim(coalesce(p_cep, '')), ''),
      pix_key = nullif(trim(coalesce(p_pix_key, '')), ''),
      pix_doc = nullif(trim(coalesce(p_pix_doc, '')), ''),
      pix_bank = nullif(trim(coalesce(p_pix_bank, '')), ''),
      pix_ag = nullif(trim(coalesce(p_pix_ag, '')), ''),
      pix_acc = nullif(trim(coalesce(p_pix_acc, '')), '')
  where id = v_uid;

  delete from public.profile_cidades_atuacao
  where profile_id = v_uid;

  insert into public.profile_cidades_atuacao(profile_id, cidade)
  select v_uid, trim(value)
  from unnest(coalesce(p_cidades, '{}'::text[])) as value
  where nullif(trim(value), '') is not null
  on conflict (profile_id, cidade) do nothing;
end;
$$;

revoke all on function public.update_my_researcher_profile(text,date,text,text,text,text,text,text,text,text,text,text,text[]) from public;
grant execute on function public.update_my_researcher_profile(text,date,text,text,text,text,text,text,text,text,text,text,text[]) to authenticated;

commit;

-- Aplique no SQL Editor do Supabase. A função não armazena senha,
-- não permite alterar CPF, e-mail, status, aprovação ou documentos,
-- e só aceita a própria sessão autenticada do pesquisador.

-- O autocadastro público já valida de 1 a 5 cidades e não solicita PIX.
-- O formulário administrativo também mantém PIX opcional.
