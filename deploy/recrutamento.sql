-- PesquisaPro — recrutamento por link/QR Code e ranking de captação
-- Idempotente: pode ser executada mais de uma vez.

alter table public.profiles
  add column if not exists recruiter_code text,
  add column if not exists recruiter_capture_value numeric(12,2) not null default 0;

update public.profiles
set recruiter_code = 'rec-' || lower(substr(replace(id::text,'-',''),1,8))
where role = 'recrutador' and (recruiter_code is null or trim(recruiter_code) = '');

create unique index if not exists profiles_recruiter_code_uidx
  on public.profiles(recruiter_code)
  where recruiter_code is not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','coord','gerente','pesq','cliente','admpro','vendedor','indicador','recrutador'));

alter table public.profiles drop constraint if exists profiles_recruiter_capture_value_check;
alter table public.profiles add constraint profiles_recruiter_capture_value_check
  check (recruiter_capture_value >= 0);

alter table public.signups
  add column if not exists recruiter_id uuid references public.profiles(id) on delete set null,
  add column if not exists recruiter_code text,
  add column if not exists recruiter_capture_value numeric(12,2) not null default 0,
  add column if not exists approved_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.signups drop constraint if exists signups_status_check;
alter table public.signups add constraint signups_status_check
  check (status in ('novo','diligencia','aprovado','reprovado'));

alter table public.signups drop constraint if exists signups_recruiter_capture_value_check;
alter table public.signups add constraint signups_recruiter_capture_value_check
  check (recruiter_capture_value >= 0);

create index if not exists signups_recruiter_idx
  on public.signups(recruiter_id, status, sent_at desc);
create index if not exists signups_recruiter_code_idx
  on public.signups(recruiter_code);

create table if not exists public.recruiter_captures (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null unique references public.signups(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete restrict,
  recruiter_code text not null,
  capture_value numeric(12,2) not null default 0 check (capture_value >= 0),
  candidate_name text,
  candidate_phone text,
  candidate_city text,
  status text not null default 'pendente' check (status in ('pendente','a_receber','paga','cancelada')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz
);

alter table public.recruiter_captures add column if not exists candidate_name text;
alter table public.recruiter_captures add column if not exists candidate_phone text;
alter table public.recruiter_captures add column if not exists candidate_city text;

create index if not exists recruiter_captures_recruiter_idx
  on public.recruiter_captures(recruiter_id, status, created_at desc);
create index if not exists recruiter_captures_status_idx
  on public.recruiter_captures(status, created_at desc);

create or replace function public.recruiter_capture_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r public.profiles;
begin
  if new.recruiter_id is null then
    return new;
  end if;
  select * into r from public.profiles where id = new.recruiter_id and role = 'recrutador';
  if r.id is null then
    return new;
  end if;
  insert into public.recruiter_captures(signup_id,recruiter_id,recruiter_code,capture_value,candidate_name,candidate_phone,candidate_city,status,approved_at)
  values(new.id,r.id,coalesce(new.recruiter_code,r.recruiter_code),coalesce(new.recruiter_capture_value,r.recruiter_capture_value,0),new.name,new.phone,new.cidade,
    case when new.status='aprovado' then 'a_receber' when new.status='reprovado' then 'cancelada' else 'pendente' end,
    case when new.status='aprovado' then coalesce(new.approved_at,now()) else null end)
  on conflict (signup_id) do update set
    recruiter_id=excluded.recruiter_id,
    recruiter_code=excluded.recruiter_code,
    capture_value=excluded.capture_value,
    candidate_name=excluded.candidate_name,
    candidate_phone=excluded.candidate_phone,
    candidate_city=excluded.candidate_city,
    status=case when excluded.status='cancelada' then 'cancelada' when excluded.status='a_receber' then 'a_receber' else public.recruiter_captures.status end,
    approved_at=coalesce(excluded.approved_at,public.recruiter_captures.approved_at);
  return new;
end;
$$;

drop trigger if exists trg_recruiter_capture_sync on public.signups;
create trigger trg_recruiter_capture_sync
after insert or update of recruiter_id,recruiter_code,recruiter_capture_value,status,approved_at on public.signups
for each row execute function public.recruiter_capture_sync();

insert into public.recruiter_captures(signup_id,recruiter_id,recruiter_code,capture_value,candidate_name,candidate_phone,candidate_city,status,approved_at)
select s.id,r.id,coalesce(s.recruiter_code,r.recruiter_code),coalesce(s.recruiter_capture_value,r.recruiter_capture_value,0),s.name,s.phone,s.cidade,
  case when s.status='aprovado' then 'a_receber' when s.status='reprovado' then 'cancelada' else 'pendente' end,
  case when s.status='aprovado' then coalesce(s.approved_at,now()) else null end
from public.signups s
join public.profiles r on r.id=s.recruiter_id and r.role='recrutador'
on conflict (signup_id) do update set
  recruiter_id=excluded.recruiter_id,
  recruiter_code=excluded.recruiter_code,
  capture_value=excluded.capture_value,
  candidate_name=excluded.candidate_name,
  candidate_phone=excluded.candidate_phone,
  candidate_city=excluded.candidate_city,
  status=case when excluded.status='cancelada' then 'cancelada' when excluded.status='a_receber' then 'a_receber' else public.recruiter_captures.status end,
  approved_at=coalesce(excluded.approved_at,public.recruiter_captures.approved_at);

create or replace function public.submit_recruiter_signup(
  p_recruiter_code text,
  p_name text,
  p_cpf text,
  p_birth date,
  p_email text,
  p_phone text,
  p_cidade text,
  p_rua text default null,
  p_numero text default null,
  p_cep text default null,
  p_cidades_atuacao text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare r public.profiles; new_id uuid;
begin
  select * into r from public.profiles
  where role='recrutador' and status='ativo' and lower(recruiter_code)=lower(trim(p_recruiter_code))
  limit 1;
  if r.id is null then raise exception 'Link de recrutador inválido ou inativo'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'Nome é obrigatório'; end if;
  if nullif(trim(coalesce(p_email,'')),'') is null then raise exception 'E-mail é obrigatório'; end if;
  insert into public.signups(name,cpf,birth,email,phone,cidade,rua,numero,cep,status,recruiter_id,recruiter_code,recruiter_capture_value)
  values(trim(p_name),nullif(trim(p_cpf),''),p_birth,nullif(trim(p_email),''),nullif(trim(p_phone),''),nullif(trim(p_cidade),''),
    nullif(trim(p_rua),''),nullif(trim(p_numero),''),nullif(trim(p_cep),''),'novo',r.id,r.recruiter_code,r.recruiter_capture_value)
  returning id into new_id;
  if coalesce(array_length(p_cidades_atuacao,1),0)>0 then
    insert into public.signup_cidades_atuacao(signup_id,cidade)
    select new_id,trim(x) from unnest(p_cidades_atuacao) x where nullif(trim(x),'') is not null
    on conflict do nothing;
  end if;
  return new_id;
end;
$$;

revoke all on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[]) from public;
grant execute on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[]) to anon, authenticated;

create or replace function public.recruiter_public_info(p_code text)
returns table(name text, recruiter_code text)
language sql
security definer
set search_path = public
as $$
  select p.name,p.recruiter_code from public.profiles p
  where p.role='recrutador' and p.status='ativo' and lower(p.recruiter_code)=lower(trim(p_code)) limit 1;
$$;
revoke all on function public.recruiter_public_info(text) from public;
grant execute on function public.recruiter_public_info(text) to anon, authenticated;

alter table public.recruiter_captures enable row level security;

drop policy if exists "admin gerencia captacoes recrutamento" on public.recruiter_captures;
create policy "admin gerencia captacoes recrutamento"
  on public.recruiter_captures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "recrutador ve suas captacoes" on public.recruiter_captures;
create policy "recrutador ve suas captacoes"
  on public.recruiter_captures for select to authenticated
  using (recruiter_id = auth.uid());

drop policy if exists "admin ve origem dos cadastros" on public.signups;
create policy "admin ve origem dos cadastros"
  on public.signups for select to authenticated
  using (public.is_admin());

drop policy if exists "admin atualiza origem dos cadastros" on public.signups;
create policy "admin atualiza origem dos cadastros"
  on public.signups for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Não libera SELECT público de perfis/cadastros. O formulário usa apenas a RPC.
