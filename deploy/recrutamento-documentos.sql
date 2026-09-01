-- PesquisaPro — documentos obrigatórios no cadastro de pesquisador
-- Executar depois de deploy/recrutamento.sql.
-- Não apaga dados; substitui a assinatura da RPC pública para receber os caminhos
-- dos documentos enviados ao bucket privado researcher-documents.

insert into storage.buckets (id, name, public)
values ('researcher-documents', 'researcher-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "cadastro público envia documentos" on storage.objects;
create policy "cadastro público envia documentos"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'researcher-documents'
    and (storage.foldername(name))[1] = 'signups'
  );

drop policy if exists "admin visualiza documentos de cadastro" on storage.objects;
create policy "admin visualiza documentos de cadastro"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'researcher-documents'
    and public.is_admin()
  );

drop policy if exists "admin remove documentos de cadastro" on storage.objects;
create policy "admin remove documentos de cadastro"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'researcher-documents'
    and public.is_admin()
  );

drop function if exists public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[]);

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
  p_doc_comprovante_url text default null
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
begin
  select * into r
  from public.profiles
  where role='recrutador'
    and status='ativo'
    and recruiter_code=trim(p_recruiter_code)
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

  select count(*) into city_count
  from (
    select distinct trim(x) as city
    from unnest(coalesce(p_cidades_atuacao,'{}')) x
    where nullif(trim(x),'') is not null
  ) cities;
  if city_count > 5 then raise exception 'Escolha no máximo cinco cidades'; end if;

  insert into public.signups(
    name,cpf,birth,email,phone,cidade,rua,numero,cep,
    doc_foto_url,doc_comprovante_url,status,recruiter_id,recruiter_code,recruiter_capture_value
  )
  values(
    trim(p_name),nullif(trim(p_cpf),''),p_birth,nullif(trim(p_email),''),nullif(trim(p_phone),''),nullif(trim(p_cidade),''),
    nullif(trim(p_rua),''),nullif(trim(p_numero),''),nullif(trim(p_cep),''),
    trim(p_doc_foto_url),trim(p_doc_comprovante_url),'novo',r.id,r.recruiter_code,r.recruiter_capture_value
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

revoke all on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[],text,text) from public;
grant execute on function public.submit_recruiter_signup(text,text,text,date,text,text,text,text,text,text,text[],text,text) to anon, authenticated;
