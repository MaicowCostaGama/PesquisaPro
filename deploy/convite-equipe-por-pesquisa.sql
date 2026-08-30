-- ============================================================================
-- Convites direcionados de pesquisadores por pesquisa
--
-- Fluxo:
-- 1) um perfil administrativo cria um convite para uma pesquisa e pesquisador;
-- 2) o aplicativo gera um link individual e abre o WhatsApp;
-- 3) o pesquisador entra com a própria conta e aceita no Meu painel;
-- 4) a RPC grava o aceite e cria o vínculo em survey_team na mesma transação.
-- ============================================================================

create table if not exists public.survey_invites (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  researcher_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id),
  status text not null default 'pendente' check (status in ('pendente','aceito','recusado')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (survey_id, researcher_id)
);

create index if not exists idx_survey_invites_survey_status
  on public.survey_invites (survey_id, status, invited_at desc);
create index if not exists idx_survey_invites_researcher_status
  on public.survey_invites (researcher_id, status, invited_at desc);

alter table public.survey_invites enable row level security;

-- Em instalações que já possuem as policies, os DROP tornam a migration
-- reexecutável no SQL Editor sem erro de nome duplicado.
drop policy if exists "staff gerencia convites" on public.survey_invites;
drop policy if exists "pesquisador vê seus convites" on public.survey_invites;
drop policy if exists "pesquisador responde seus convites" on public.survey_invites;

create policy "staff gerencia convites"
  on public.survey_invites for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "pesquisador vê seus convites"
  on public.survey_invites for select
  using (researcher_id = auth.uid());

create policy "pesquisador responde seus convites"
  on public.survey_invites for update
  using (researcher_id = auth.uid())
  with check (researcher_id = auth.uid());

create or replace function public.respond_survey_invite(
  p_invite_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.survey_invites%rowtype;
begin
  select * into v_invite
    from public.survey_invites
   where id = p_invite_id
     and researcher_id = auth.uid()
   for update;

  if not found then
    raise exception 'invite not found or not authorized';
  end if;

  if v_invite.status <> 'pendente' then
    return;
  end if;

  update public.survey_invites
     set status = case when p_accept then 'aceito' else 'recusado' end,
         responded_at = now()
   where id = p_invite_id;

  if p_accept then
    insert into public.survey_team (survey_id, researcher_id)
    values (v_invite.survey_id, v_invite.researcher_id)
    on conflict (survey_id, researcher_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.respond_survey_invite(uuid, boolean) from public;
grant execute on function public.respond_survey_invite(uuid, boolean) to authenticated;
