-- PesquisaPro — reconciliação segura de aprovação de pesquisadores
-- Migration idempotente: não remove nem altera dados existentes.
-- Garante que cada signup aprovado possa guardar o UUID do perfil criado/localizado.

begin;

alter table public.signups
  add column if not exists approved_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

create index if not exists signups_approved_profile_idx
  on public.signups(approved_profile_id)
  where approved_profile_id is not null;

commit;
