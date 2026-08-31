-- PesquisaPro — vínculo de propostas e desempenho por vendedor
-- Executar depois de deploy/comercial.sql e deploy/comercial-comissoes.sql.
-- Migration idempotente: não apaga dados.

alter table public.commercial_proposals
  add column if not exists seller_id uuid references public.profiles(id) on delete set null;

update public.commercial_proposals p
set seller_id = o.seller_id
from public.commercial_opportunities o
where p.opportunity_id = o.id
  and p.seller_id is null;

create index if not exists idx_commercial_proposals_seller_status
  on public.commercial_proposals (seller_id, status, updated_at desc);

create or replace function public.sync_commercial_proposal_seller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
begin
  select seller_id into v_seller_id
  from public.commercial_opportunities
  where id = new.opportunity_id;

  if v_seller_id is null then
    raise exception 'A oportunidade precisa ter um vendedor responsável antes da proposta';
  end if;

  new.seller_id := v_seller_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_commercial_proposal_seller on public.commercial_proposals;
create trigger trg_sync_commercial_proposal_seller
before insert or update of opportunity_id, seller_id on public.commercial_proposals
for each row execute function public.sync_commercial_proposal_seller();

create or replace function public.sync_commercial_proposals_after_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.seller_id is null then
    raise exception 'A oportunidade precisa ter um vendedor responsável';
  end if;
  if new.seller_id is distinct from old.seller_id then
    update public.commercial_proposals
       set seller_id = new.seller_id,
           updated_at = now()
     where opportunity_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_commercial_proposals_after_opportunity on public.commercial_opportunities;
create trigger trg_sync_commercial_proposals_after_opportunity
after update of seller_id on public.commercial_opportunities
for each row execute function public.sync_commercial_proposals_after_opportunity();

-- Reforça que vendedores somente consultem e alterem propostas de suas oportunidades.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='commercial_proposals'
      and policyname='vendedor consulta propostas pelo vinculo direto'
  ) then
    create policy "vendedor consulta propostas pelo vinculo direto"
      on public.commercial_proposals for select to authenticated
      using (seller_id = auth.uid());
  end if;
end;
$$;

revoke all on public.commercial_proposals from anon;
grant select, insert, update, delete on public.commercial_proposals to authenticated;
grant execute on function public.sync_commercial_proposal_seller() to authenticated;
grant execute on function public.sync_commercial_proposals_after_opportunity() to authenticated;
