-- PesquisaPro — crachá virtual do pesquisador
-- Executar uma vez no SQL Editor do Supabase.
-- Expõe publicamente somente nome, status do vínculo e foto do crachá via RPC.
-- CPF, e-mail, telefone, endereço, documentos, PIX e demais campos permanecem privados.

alter table public.profiles
  add column if not exists badge_public_token text,
  add column if not exists badge_photo_path text;

update public.profiles
set badge_public_token = replace(gen_random_uuid()::text,'-','')
where role = 'pesq' and nullif(trim(badge_public_token),'') is null;

alter table public.profiles
  alter column badge_public_token set default replace(gen_random_uuid()::text,'-','');

create unique index if not exists profiles_badge_public_token_uidx
  on public.profiles(badge_public_token)
  where badge_public_token is not null;

-- Fotos de crachá não são documentos de identidade: ficam em bucket público para
-- que a pessoa entrevistada consiga verificar a foto pelo QR Code.
insert into storage.buckets (id, name, public)
values ('researcher-badge-photos', 'researcher-badge-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "pesquisador envia foto do crachá" on storage.objects;
create policy "pesquisador envia foto do crachá"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'researcher-badge-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'pesq'
    )
  );

drop policy if exists "pesquisador atualiza foto do crachá" on storage.objects;
create policy "pesquisador atualiza foto do crachá"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'researcher-badge-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'researcher-badge-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "pesquisador remove foto do crachá" on storage.objects;
create policy "pesquisador remove foto do crachá"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'researcher-badge-photos'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create or replace function public.verify_researcher_badge(p_badge_token text)
returns table(
  display_name text,
  photo_path text,
  badge_status text,
  verified_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.name,
    p.badge_photo_path,
    case when p.status = 'ativo' then 'ativo' else 'inativo' end,
    coalesce(p.approved_at, p.created_at)
  from public.profiles p
  where p.role = 'pesq'
    and p.badge_public_token = nullif(trim(p_badge_token),'')
  limit 1;
$$;

revoke all on function public.verify_researcher_badge(text) from public;
grant execute on function public.verify_researcher_badge(text) to anon, authenticated;

comment on function public.verify_researcher_badge(text) is
  'Verificação pública limitada do crachá: nome, foto, status do vínculo e data de emissão. Não retorna dados pessoais sensíveis.';
