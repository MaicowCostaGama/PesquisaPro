-- PesquisaPro — módulo comercial
-- Execute depois do schema.sql e dos scripts de RLS existentes.
-- Migration idempotente: pode ser executada novamente sem recriar dados.

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  client_name text not null,
  email text,
  phone text,
  city text,
  region text,
  source text not null default 'Indicação',
  survey_type text,
  estimated_interviews integer check (estimated_interviews is null or estimated_interviews > 0),
  expected_value numeric(14,2) check (expected_value is null or expected_value >= 0),
  stage text not null default 'novo' check (stage in ('novo','qualificacao','briefing','proposta','negociacao','ganha','perdida')),
  next_action_at date,
  description text,
  notes text,
  seller_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_proposals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete cascade,
  proposal_number text not null unique,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada','expirada')),
  valid_until date,
  scope_text text,
  payment_terms text,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  sent_at timestamptz,
  sent_via text check (sent_via is null or sent_via in ('email','whatsapp','link')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_commercial_opportunities_seller_stage
  on public.commercial_opportunities (seller_id, stage, updated_at desc);

create index if not exists idx_commercial_opportunities_stage_action
  on public.commercial_opportunities (stage, next_action_at);

create index if not exists idx_commercial_opportunities_created_by
  on public.commercial_opportunities (created_by, created_at desc);

create index if not exists idx_commercial_proposals_opportunity_status
  on public.commercial_proposals (opportunity_id, status, updated_at desc);

create index if not exists idx_commercial_proposal_items_proposal
  on public.commercial_proposal_items (proposal_id, created_at);

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','coord','gerente','admpro')
  );
$$;

grant execute on function public.is_staff() to authenticated;

alter table public.commercial_opportunities enable row level security;
alter table public.commercial_proposals enable row level security;
alter table public.commercial_proposal_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_opportunities' and policyname='staff gerencia oportunidades comerciais'
  ) then
    create policy "staff gerencia oportunidades comerciais"
      on public.commercial_opportunities for all
      using (public.is_staff())
      with check (public.is_staff());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_opportunities' and policyname='vendedor gerencia suas oportunidades comerciais'
  ) then
    create policy "vendedor gerencia suas oportunidades comerciais"
      on public.commercial_opportunities for all
      using (seller_id = auth.uid())
      with check (seller_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposals' and policyname='staff gerencia propostas comerciais'
  ) then
    create policy "staff gerencia propostas comerciais"
      on public.commercial_proposals for all
      using (public.is_staff())
      with check (public.is_staff());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposals' and policyname='vendedor gerencia propostas das suas oportunidades'
  ) then
    create policy "vendedor gerencia propostas das suas oportunidades"
      on public.commercial_proposals for all
      using (exists (
        select 1 from public.commercial_opportunities o
        where o.id = commercial_proposals.opportunity_id and o.seller_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.commercial_opportunities o
        where o.id = commercial_proposals.opportunity_id and o.seller_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposal_items' and policyname='staff gerencia itens de propostas'
  ) then
    create policy "staff gerencia itens de propostas"
      on public.commercial_proposal_items for all
      using (public.is_staff())
      with check (public.is_staff());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposal_items' and policyname='vendedor gerencia itens das suas propostas'
  ) then
    create policy "vendedor gerencia itens das suas propostas"
      on public.commercial_proposal_items for all
      using (exists (
        select 1 from public.commercial_proposals p
        join public.commercial_opportunities o on o.id = p.opportunity_id
        where p.id = commercial_proposal_items.proposal_id and o.seller_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.commercial_proposals p
        join public.commercial_opportunities o on o.id = p.opportunity_id
        where p.id = commercial_proposal_items.proposal_id and o.seller_id = auth.uid()
      ));
  end if;
end;
$$;

revoke all on public.commercial_opportunities from anon;
revoke all on public.commercial_proposals from anon;
revoke all on public.commercial_proposal_items from anon;
grant select, insert, update, delete on public.commercial_opportunities to authenticated;
grant select, insert, update, delete on public.commercial_proposals to authenticated;
grant select, insert, update, delete on public.commercial_proposal_items to authenticated;
