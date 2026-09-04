-- PesquisaPro — confirmação final gravada em aproximadamente 20% das entrevistas
-- Executar depois de deploy/schema.sql e das migrations de recrutamento/documentos.
-- A gravação é somente um trecho final, nunca o questionário inteiro.
-- O texto de consentimento e a retenção devem ser revisados juridicamente antes do uso definitivo.

begin;

create table if not exists public.collection_recording_reservations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  researcher_id uuid not null references public.profiles(id) on delete cascade,
  recording_required boolean not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  consumed_at timestamptz
);

create unique index if not exists collection_recording_reservations_active_idx
  on public.collection_recording_reservations (survey_id, researcher_id)
  where consumed_at is null;

alter table public.collection_events
  add column if not exists recording_reservation_id uuid references public.collection_recording_reservations(id) on delete set null,
  add column if not exists recording_required boolean not null default false,
  add column if not exists recording_consent boolean,
  add column if not exists recording_status text not null default 'not_selected',
  add column if not exists recording_error text,
  add column if not exists recording_created_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collection_events_recording_status_check'
      and conrelid = 'public.collection_events'::regclass
  ) then
    alter table public.collection_events
      add constraint collection_events_recording_status_check
      check (recording_status in ('not_selected','declined','pending_upload','uploaded','failed'));
  end if;
end $$;

create table if not exists public.collection_recordings (
  collection_event_id uuid primary key references public.collection_events(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  duration_ms integer,
  created_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles(id) on delete set null
);

alter table public.collection_recording_reservations enable row level security;
alter table public.collection_recordings enable row level security;

revoke all on public.collection_recording_reservations from anon, authenticated;
revoke all on public.collection_recordings from anon, authenticated;
grant select on public.collection_recordings to authenticated;

drop policy if exists "gestao visualiza confirmacoes gravadas" on public.collection_recordings;
create policy "gestao visualiza confirmacoes gravadas"
  on public.collection_recordings for select to authenticated
  using (public.is_staff());

insert into storage.buckets (id, name, public)
values ('collection-recordings', 'collection-recordings', false)
on conflict (id) do update set public = false;

drop policy if exists "pesquisador envia sua confirmacao" on storage.objects;
create policy "pesquisador envia sua confirmacao"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'collection-recordings'
    and (storage.foldername(name))[1] = 'confirmations'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "gestao visualiza confirmacoes" on storage.objects;
create policy "gestao visualiza confirmacoes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collection-recordings'
    and public.is_staff()
  );

drop policy if exists "gestao remove confirmacoes" on storage.objects;
create policy "gestao remove confirmacoes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'collection-recordings'
    and public.is_staff()
  );

create or replace function public.reserve_collection_recording(p_survey_id uuid)
returns table(reservation_id uuid, recording_required boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_researcher_id uuid := auth.uid();
  v_id uuid;
  v_required boolean;
begin
  if v_researcher_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if not exists (
    select 1 from public.survey_team
    where survey_id = p_survey_id and researcher_id = v_researcher_id
  ) then
    raise exception 'Pesquisador não está atribuído a esta pesquisa';
  end if;

  update public.collection_recording_reservations
     set consumed_at = now()
   where survey_id = p_survey_id
     and researcher_id = v_researcher_id
     and consumed_at is null
     and expires_at <= now();

  select r.id, r.recording_required
    into v_id, v_required
    from public.collection_recording_reservations r
   where r.survey_id = p_survey_id
     and r.researcher_id = v_researcher_id
     and r.consumed_at is null
   order by r.created_at desc
   limit 1;

  if v_id is null then
    insert into public.collection_recording_reservations(survey_id, researcher_id, recording_required)
    values (p_survey_id, v_researcher_id, random() < 0.20)
    returning id, collection_recording_reservations.recording_required
      into v_id, v_required;
  end if;

  reservation_id := v_id;
  recording_required := v_required;
  return next;
end;
$$;

create or replace function public.apply_collection_recording_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required boolean;
  v_reservation uuid;
begin
  -- A gestão e integrações legadas podem inserir sem reserva. Para um
  -- pesquisador, o banco cria a reserva automaticamente e nunca deixa a
  -- decisão de 20% depender apenas do JavaScript do navegador.
  if new.recording_reservation_id is null then
    if auth.uid() is null or public.is_staff() then
      new.recording_required := false;
      new.recording_status := 'not_selected';
      return new;
    end if;
    insert into public.collection_recording_reservations(survey_id, researcher_id, recording_required)
    values (new.survey_id, auth.uid(), random() < 0.20)
    returning id, collection_recording_reservations.recording_required
      into v_reservation, v_required;
    new.recording_reservation_id := v_reservation;
  end if;

  select id, recording_required
    into v_reservation, v_required
    from public.collection_recording_reservations
   where id = new.recording_reservation_id
     and survey_id = new.survey_id
     and researcher_id = auth.uid()
     and consumed_at is null
     and expires_at > now()
   for update;

  if v_reservation is null then
    raise exception 'Reserva de auditoria de áudio inválida ou expirada';
  end if;

  new.recording_required := v_required;
    if v_required then
      new.recording_consent := coalesce(new.recording_consent, false);
      if new.recording_consent then
        if new.recording_status <> 'failed' then
          new.recording_status := 'pending_upload';
        end if;
      elsif new.recording_status <> 'failed' then
        new.recording_status := 'declined';
      end if;
    else
    new.recording_consent := null;
    new.recording_status := 'not_selected';
  end if;

  update public.collection_recording_reservations
     set consumed_at = now()
   where id = v_reservation;

  return new;
end;
$$;

drop trigger if exists trg_apply_collection_recording_reservation on public.collection_events;
create trigger trg_apply_collection_recording_reservation
before insert on public.collection_events
for each row execute function public.apply_collection_recording_reservation();

create or replace function public.attach_collection_recording(
  p_collection_event_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_duration_ms integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.collection_events;
begin
  if v_uid is null then raise exception 'Usuário não autenticado'; end if;
  if left(coalesce(p_storage_path,''), 13) <> 'confirmations/'
     or split_part(p_storage_path, '/', 2) <> v_uid::text then
    raise exception 'Caminho de gravação inválido';
  end if;

  select * into v_event
    from public.collection_events
   where id = p_collection_event_id
     and researcher_id = v_uid
     and recording_required = true
     and recording_consent = true
     and recording_status = 'pending_upload'
   for update;

  if v_event.id is null then
    raise exception 'Entrevista não está aguardando uma confirmação gravada';
  end if;

  insert into public.collection_recordings(collection_event_id, storage_path, mime_type, duration_ms, uploaded_by)
  values (p_collection_event_id, p_storage_path, left(coalesce(p_mime_type,'audio/webm'),100), greatest(p_duration_ms,0), v_uid)
  on conflict (collection_event_id) do update
    set storage_path = excluded.storage_path,
        mime_type = excluded.mime_type,
        duration_ms = excluded.duration_ms,
        uploaded_by = excluded.uploaded_by,
        created_at = now();

  update public.collection_events
     set recording_status = 'uploaded',
         recording_error = null,
         recording_created_at = now()
   where id = p_collection_event_id;
end;
$$;

create or replace function public.mark_collection_recording_failed(
  p_collection_event_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.collection_events
     set recording_status = 'failed',
         recording_error = left(coalesce(p_error,'Falha ao anexar a confirmação gravada'),500)
   where id = p_collection_event_id
     and researcher_id = auth.uid()
     and recording_required = true
     and recording_consent = true
     and recording_status = 'pending_upload';
  if not found then raise exception 'Entrevista não está aguardando uma gravação'; end if;
end;
$$;

revoke all on function public.reserve_collection_recording(uuid) from public;
revoke all on function public.attach_collection_recording(uuid,text,text,integer) from public;
revoke all on function public.mark_collection_recording_failed(uuid,text) from public;
grant execute on function public.reserve_collection_recording(uuid) to authenticated;
grant execute on function public.attach_collection_recording(uuid,text,text,integer) to authenticated;
grant execute on function public.mark_collection_recording_failed(uuid,text) to authenticated;

commit;
