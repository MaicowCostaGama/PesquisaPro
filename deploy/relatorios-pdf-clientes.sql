-- PesquisaPro — editor e entrega de relatórios PDF
-- Execute uma vez no SQL Editor do Supabase.
-- O PDF fica privado e só é acessível pela gestão e pelo cliente vinculado
-- quando o documento estiver com status = 'published'.

create table if not exists public.report_documents (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subtitle text,
  presentation text,
  methodology text,
  executive_summary text,
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  pdf_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists report_documents_survey_idx on public.report_documents(survey_id, status, updated_at desc);
create index if not exists report_documents_client_idx on public.report_documents(client_id, status, published_at desc);

alter table public.report_documents enable row level security;
drop policy if exists "staff manages report documents" on public.report_documents;
create policy "staff manages report documents"
  on public.report_documents for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "client sees published report documents" on public.report_documents;
create policy "client sees published report documents"
  on public.report_documents for select to authenticated
  using (status = 'published' and client_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('client-reports', 'client-reports', false)
on conflict (id) do update set public = false;

drop policy if exists "staff uploads client reports" on storage.objects;
create policy "staff uploads client reports"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'client-reports' and public.is_staff());
drop policy if exists "staff manages client reports" on storage.objects;
create policy "staff manages client reports"
  on storage.objects for all to authenticated
  using (bucket_id = 'client-reports' and public.is_staff())
  with check (bucket_id = 'client-reports' and public.is_staff());
drop policy if exists "client reads published reports" on storage.objects;
create policy "client reads published reports"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-reports'
    and exists (
      select 1 from public.report_documents rd
      where rd.pdf_path = name
        and rd.status = 'published'
        and rd.client_id = auth.uid()
    )
  );

drop function if exists public.report_document_latest(uuid,uuid);
create or replace function public.report_document_latest(p_survey_id uuid, p_client_id uuid)
returns table(
  id uuid, survey_id uuid, client_id uuid, title text, subtitle text,
  presentation text, methodology text, executive_summary text,
  sections jsonb, status text, pdf_path text, published_at timestamptz
) language sql stable security definer set search_path = public
as $$
  select rd.id,rd.survey_id,rd.client_id,rd.title,rd.subtitle,rd.presentation,
         rd.methodology,rd.executive_summary,rd.sections,rd.status,rd.pdf_path,rd.published_at
  from public.report_documents rd
  where public.is_staff()
    and rd.survey_id=p_survey_id and rd.client_id=p_client_id
  order by rd.updated_at desc
  limit 1;
$$;

drop function if exists public.report_document_save(uuid,uuid,uuid,text,text,text,text,text,jsonb);
create or replace function public.report_document_save(
  p_report_id uuid,
  p_survey_id uuid,
  p_client_id uuid,
  p_title text,
  p_subtitle text,
  p_presentation text,
  p_methodology text,
  p_executive_summary text,
  p_sections jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'Acesso restrito à gestão'; end if;
  if not exists (
    select 1 from public.survey_clients sc
    where sc.survey_id = p_survey_id and sc.client_id = p_client_id
  ) then
    raise exception 'Cliente não está vinculado a esta pesquisa';
  end if;
  if p_report_id is null then
    insert into public.report_documents(
      survey_id,client_id,title,subtitle,presentation,methodology,executive_summary,sections,created_by
    ) values (
      p_survey_id,p_client_id,coalesce(nullif(trim(p_title),''),'Relatório PesquisaPro'),p_subtitle,
      p_presentation,p_methodology,p_executive_summary,coalesce(p_sections,'[]'::jsonb),auth.uid()
    ) returning id into v_id;
  else
    update public.report_documents
    set survey_id=p_survey_id, client_id=p_client_id,
        title=coalesce(nullif(trim(p_title),''),'Relatório PesquisaPro'), subtitle=p_subtitle,
        presentation=p_presentation, methodology=p_methodology,
        executive_summary=p_executive_summary, sections=coalesce(p_sections,'[]'::jsonb),
        status=case when status='published' then 'draft' else status end,
        pdf_path=null, published_at=null, updated_at=now()
    where id=p_report_id
    returning id into v_id;
    if v_id is null then raise exception 'Relatório não encontrado'; end if;
  end if;
  return v_id;
end;
$$;

drop function if exists public.report_document_publish(uuid,text);
create or replace function public.report_document_publish(p_report_id uuid, p_pdf_path text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Acesso restrito à gestão'; end if;
  update public.report_documents
  set pdf_path=p_pdf_path, status='published', published_at=now(), updated_at=now()
  where id=p_report_id;
  if not found then raise exception 'Relatório não encontrado'; end if;
  return true;
end;
$$;

drop function if exists public.client_published_reports(uuid);
create or replace function public.client_published_reports(p_survey_id uuid default null)
returns table(
  id uuid, survey_id uuid, title text, subtitle text, executive_summary text,
  pdf_path text, published_at timestamptz, updated_at timestamptz
) language sql stable security definer set search_path = public
as $$
  select rd.id,rd.survey_id,rd.title,rd.subtitle,rd.executive_summary,
         rd.pdf_path,rd.published_at,rd.updated_at
  from public.report_documents rd
  where rd.client_id=auth.uid()
    and rd.status='published'
    and rd.pdf_path is not null
    and (p_survey_id is null or rd.survey_id=p_survey_id)
  order by rd.published_at desc nulls last;
$$;

revoke all on function public.report_document_latest(uuid,uuid) from public;
revoke all on function public.report_document_save(uuid,uuid,uuid,text,text,text,text,text,jsonb) from public;
revoke all on function public.report_document_publish(uuid,text) from public;
revoke all on function public.client_published_reports(uuid) from public;
grant execute on function public.report_document_latest(uuid,uuid) to authenticated;
grant execute on function public.report_document_save(uuid,uuid,uuid,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.report_document_publish(uuid,text) to authenticated;
grant execute on function public.client_published_reports(uuid) to authenticated;

comment on table public.report_documents is
  'Estruturas e PDFs finais de relatórios PesquisaPro. Rascunhos são da gestão; publicados aparecem ao cliente vinculado.';
comment on function public.client_published_reports(uuid) is
  'Retorna somente relatórios publicados do cliente autenticado, sem expor documentos de outros clientes.';
