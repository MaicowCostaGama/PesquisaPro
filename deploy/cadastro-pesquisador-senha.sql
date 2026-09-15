-- PesquisaPro — senha definida pelo pesquisador no autocadastro
-- Não armazena senha. A senha pertence exclusivamente ao Supabase Auth.
-- Compatível com signups já existentes: p_auth_user_id é opcional para a assinatura antiga.

begin;

alter table public.signups
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists signups_auth_user_idx
  on public.signups(auth_user_id)
  where auth_user_id is not null;

drop function if exists public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[]);
drop function if exists public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[],text,text);

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
  p_cidades_atuacao text[] default '{}',
  p_doc_foto_url text default null,
  p_doc_comprovante_url text default null,
  p_auth_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.profiles;
  new_id uuid;
  city_count integer;
  auth_email text;
begin
  select * into r
  from public.profiles
  where role='recrutador'
    and status='ativo'
    and lower(recruiter_code)=lower(trim(p_recruiter_code))
  limit 1;

  if r.id is null then raise exception 'Link de recrutador inválido ou inativo'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'Nome é obrigatório'; end if;
  if nullif(trim(coalesce(p_email,'')),'') is null then raise exception 'E-mail é obrigatório'; end if;
  if nullif(trim(coalesce(p_phone,'')),'') is null then raise exception 'Celular é obrigatório'; end if;
  if nullif(trim(coalesce(p_cidade,'')),'') is null then raise exception 'Cidade é obrigatória'; end if;
  if nullif(trim(coalesce(p_doc_foto_url,'')),'') is null then raise exception 'Documento com foto é obrigatório'; end if;
  if nullif(trim(coalesce(p_doc_comprovante_url,'')),'') is null then raise exception 'Comprovante de endereço é obrigatório'; end if;
  if left(trim(p_doc_foto_url),8) <> 'signups/' or left(trim(p_doc_comprovante_url),8) <> 'signups/' then
    raise exception 'Caminho de documento inválido';
  end if;

  if p_auth_user_id is not null then
    select lower(trim(u.email)) into auth_email
    from auth.users u
    where u.id=p_auth_user_id;
    if auth_email is null or auth_email <> lower(trim(p_email)) then
      raise exception 'O usuário de autenticação não corresponde ao e-mail informado';
    end if;
    if exists(select 1 from public.signups s where s.auth_user_id=p_auth_user_id and s.status <> 'reprovado') then
      raise exception 'Este usuário já possui um cadastro ativo ou em análise';
    end if;
  end if;

  select count(*) into city_count
  from (
    select distinct trim(x) as city
    from unnest(coalesce(p_cidades_atuacao,'{}')) x
    where nullif(trim(x),'') is not null
  ) cities;
  if city_count > 5 then raise exception 'Escolha no máximo cinco cidades'; end if;

  insert into public.signups(
    name,cpf,birth,email,phone,cidade,rua,numero,cep,
    doc_foto_url,doc_comprovante_url,status,recruiter_id,recruiter_code,recruiter_capture_value,auth_user_id
  )
  values(
    trim(p_name),nullif(trim(p_cpf),''),p_birth,nullif(trim(p_email),''),nullif(trim(p_phone),''),nullif(trim(p_cidade),''),
    nullif(trim(p_rua),''),nullif(trim(p_numero),''),nullif(trim(p_cep),''),
    trim(p_doc_foto_url),trim(p_doc_comprovante_url),'novo',r.id,r.recruiter_code,r.recruiter_capture_value,p_auth_user_id
  )
  returning id into new_id;

  insert into public.signup_cidades_atuacao(signup_id,cidade)
  select new_id,trim(x)
  from unnest(coalesce(p_cidades_atuacao,'{}')) x
  where nullif(trim(x),'') is not null
  group by trim(x)
  on conflict do nothing;

  return new_id;
end;
$$;

revoke all on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[],text,text,uuid) from public;
grant execute on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[],text,text,uuid) to anon, authenticated;

commit;
