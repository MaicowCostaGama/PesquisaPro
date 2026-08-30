-- PesquisaPro — comissões de vendedores e indicadores
-- Executar depois de deploy/comercial.sql.
-- Não apaga dados: adiciona campos/tabela, índices, trigger e policies.

alter table public.profiles
  add column if not exists commission_rate numeric(5,2) not null default 0,
  add column if not exists commission_rate_with_indicator numeric(5,2) not null default 0;

alter table public.profiles
  drop constraint if exists profiles_commission_rate_check;
alter table public.profiles
  add constraint profiles_commission_rate_check
  check (commission_rate between 0 and 100 and commission_rate_with_indicator between 0 and 100 and commission_rate_with_indicator <= commission_rate);

alter table public.commercial_opportunities
  add column if not exists indicator_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_commercial_opportunities_indicator_stage
  on public.commercial_opportunities (indicator_id, stage, updated_at desc);

create table if not exists public.commercial_commissions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete restrict,
  proposal_id uuid references public.commercial_proposals(id) on delete set null,
  partner_id uuid not null references public.profiles(id) on delete restrict,
  partner_role text not null check (partner_role in ('vendedor','indicador')),
  rate numeric(5,2) not null check (rate between 0 and 100),
  base_amount numeric(14,2) not null check (base_amount >= 0),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'a_receber' check (status in ('a_receber','aprovada','paga','cancelada')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, partner_id, partner_role)
);

create index if not exists idx_commercial_commissions_partner_status
  on public.commercial_commissions (partner_id, status, created_at desc);
create index if not exists idx_commercial_commissions_opportunity
  on public.commercial_commissions (opportunity_id, created_at desc);

create or replace function public.sync_commercial_commission_from_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opportunity public.commercial_opportunities%rowtype;
  v_seller_rate numeric(5,2);
  v_indicator_rate numeric(5,2);
  v_total numeric(14,2);
begin
  if NEW.status = 'aceita' then
    select * into v_opportunity
    from public.commercial_opportunities
    where id = NEW.opportunity_id;

    v_total := greatest(coalesce(NEW.total, 0), 0);

    if v_opportunity.seller_id is not null then
      select case when v_opportunity.indicator_id is not null
                  then coalesce(p.commission_rate_with_indicator, 0)
                  else coalesce(p.commission_rate, 0)
             end
        into v_seller_rate
      from public.profiles p
      where p.id = v_opportunity.seller_id
        and p.role = 'vendedor';

      if v_seller_rate is not null then
        insert into public.commercial_commissions
          (opportunity_id, proposal_id, partner_id, partner_role, rate, base_amount, amount, status, updated_at)
        values
          (NEW.opportunity_id, NEW.id, v_opportunity.seller_id, 'vendedor', v_seller_rate, v_total,
           round(v_total * v_seller_rate / 100, 2), 'a_receber', now())
        on conflict (opportunity_id, partner_id, partner_role) do update
          set proposal_id = excluded.proposal_id,
              rate = excluded.rate,
              base_amount = excluded.base_amount,
              amount = excluded.amount,
              updated_at = now()
          where public.commercial_commissions.status not in ('aprovada','paga');
      end if;
    end if;

    if v_opportunity.indicator_id is not null then
      select coalesce(p.commission_rate, 0)
        into v_indicator_rate
      from public.profiles p
      where p.id = v_opportunity.indicator_id
        and p.role = 'indicador';

      if v_indicator_rate is not null then
        insert into public.commercial_commissions
          (opportunity_id, proposal_id, partner_id, partner_role, rate, base_amount, amount, status, updated_at)
        values
          (NEW.opportunity_id, NEW.id, v_opportunity.indicator_id, 'indicador', v_indicator_rate, v_total,
           round(v_total * v_indicator_rate / 100, 2), 'a_receber', now())
        on conflict (opportunity_id, partner_id, partner_role) do update
          set proposal_id = excluded.proposal_id,
              rate = excluded.rate,
              base_amount = excluded.base_amount,
              amount = excluded.amount,
              updated_at = now()
          where public.commercial_commissions.status not in ('aprovada','paga');
      end if;
    end if;
  elsif NEW.status in ('recusada','expirada') and OLD.status = 'aceita' then
    update public.commercial_commissions
       set status = 'cancelada', updated_at = now()
     where proposal_id = NEW.id and status = 'a_receber';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_commercial_commission on public.commercial_proposals;
create trigger trg_sync_commercial_commission
after insert or update of status, total on public.commercial_proposals
for each row execute function public.sync_commercial_commission_from_proposal();

alter table public.commercial_commissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_opportunities' and policyname='indicador gerencia suas indicacoes'
  ) then
    create policy "indicador gerencia suas indicacoes"
      on public.commercial_opportunities for all
      using (indicator_id = auth.uid())
      with check (indicator_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposals' and policyname='indicador consulta propostas das indicacoes'
  ) then
    create policy "indicador consulta propostas das indicacoes"
      on public.commercial_proposals for select
      using (exists (
        select 1 from public.commercial_opportunities o
        where o.id = commercial_proposals.opportunity_id and o.indicator_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_proposal_items' and policyname='indicador consulta itens das indicacoes'
  ) then
    create policy "indicador consulta itens das indicacoes"
      on public.commercial_proposal_items for select
      using (exists (
        select 1
        from public.commercial_proposals p
        join public.commercial_opportunities o on o.id = p.opportunity_id
        where p.id = commercial_proposal_items.proposal_id and o.indicator_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_commissions' and policyname='staff gerencia comissoes comerciais'
  ) then
    create policy "staff gerencia comissoes comerciais"
      on public.commercial_commissions for all
      using (public.is_staff())
      with check (public.is_staff());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='commercial_commissions' and policyname='parceiro consulta suas comissoes'
  ) then
    create policy "parceiro consulta suas comissoes"
      on public.commercial_commissions for select
      using (partner_id = auth.uid());
  end if;
end;
$$;

revoke all on public.commercial_commissions from anon;
grant select on public.commercial_commissions to authenticated;
grant update on public.commercial_commissions to authenticated;
grant execute on function public.sync_commercial_commission_from_proposal() to authenticated;

-- Backfill idempotente de propostas já aceitas antes desta migration.
insert into public.commercial_commissions
  (opportunity_id, proposal_id, partner_id, partner_role, rate, base_amount, amount, status)
select p.opportunity_id, p.id, o.seller_id, 'vendedor',
       case when o.indicator_id is not null then coalesce(s.commission_rate_with_indicator,0) else coalesce(s.commission_rate,0) end,
       coalesce(p.total,0),
       round(coalesce(p.total,0) * case when o.indicator_id is not null then coalesce(s.commission_rate_with_indicator,0) else coalesce(s.commission_rate,0) end / 100, 2),
       'a_receber'
from public.commercial_proposals p
join public.commercial_opportunities o on o.id = p.opportunity_id
join public.profiles s on s.id = o.seller_id and s.role = 'vendedor'
where p.status = 'aceita'
  and o.seller_id is not null
on conflict (opportunity_id, partner_id, partner_role) do nothing;

insert into public.commercial_commissions
  (opportunity_id, proposal_id, partner_id, partner_role, rate, base_amount, amount, status)
select p.opportunity_id, p.id, o.indicator_id, 'indicador', coalesce(i.commission_rate,0),
       coalesce(p.total,0), round(coalesce(p.total,0) * coalesce(i.commission_rate,0) / 100, 2), 'a_receber'
from public.commercial_proposals p
join public.commercial_opportunities o on o.id = p.opportunity_id
join public.profiles i on i.id = o.indicator_id and i.role = 'indicador'
where p.status = 'aceita'
  and o.indicator_id is not null
on conflict (opportunity_id, partner_id, partner_role) do nothing;
