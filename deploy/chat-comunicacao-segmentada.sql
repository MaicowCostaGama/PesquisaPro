-- PesquisaPro — comunicação e chat segmentado
-- Migration aditiva: não remove perfis, pesquisas, equipes, convites ou mensagens existentes.
-- Públicos: todos, região, estado, cidade ou participantes de uma pesquisa.
begin;

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience_type text not null check (audience_type in ('all','region','state','city','survey')),
  audience_value text,
  survey_id uuid references public.surveys(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  is_archived boolean not null default false,
  constraint chat_channels_scope_check check (
    (audience_type in ('all','region','state','city') and survey_id is null)
    or (audience_type = 'survey' and survey_id is not null)
  )
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  sender_name text not null,
  sender_role text not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_message_reads (
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists chat_channels_visibility_idx
  on public.chat_channels(audience_type, audience_value, survey_id, is_archived, last_message_at desc);
create index if not exists chat_messages_channel_created_idx
  on public.chat_messages(channel_id, created_at asc);
create index if not exists chat_message_reads_user_idx
  on public.chat_message_reads(user_id, last_read_at desc);

create or replace function public.chat_state_from_location(p_location text)
returns text
language sql
immutable
as $$
  select upper(coalesce(substring(trim(coalesce(p_location, '')) from '([A-Za-z]{2})\s*$'), ''));
$$;

create or replace function public.chat_region_from_state(p_state text)
returns text
language sql
immutable
as $$
  select case upper(coalesce(p_state, ''))
    when 'AC' then 'Norte' when 'AP' then 'Norte' when 'AM' then 'Norte'
    when 'PA' then 'Norte' when 'RO' then 'Norte' when 'RR' then 'Norte'
    when 'TO' then 'Norte'
    when 'AL' then 'Nordeste' when 'BA' then 'Nordeste' when 'CE' then 'Nordeste'
    when 'MA' then 'Nordeste' when 'PB' then 'Nordeste' when 'PE' then 'Nordeste'
    when 'PI' then 'Nordeste' when 'RN' then 'Nordeste' when 'SE' then 'Nordeste'
    when 'DF' then 'Centro-Oeste' when 'GO' then 'Centro-Oeste'
    when 'MT' then 'Centro-Oeste' when 'MS' then 'Centro-Oeste'
    when 'ES' then 'Sudeste' when 'MG' then 'Sudeste' when 'RJ' then 'Sudeste'
    when 'SP' then 'Sudeste'
    when 'PR' then 'Sul' when 'RS' then 'Sul' when 'SC' then 'Sul'
    else ''
  end;
$$;

create or replace function public.chat_location_matches(
  p_location text,
  p_audience_type text,
  p_audience_value text
)
returns boolean
language sql
immutable
as $$
  select case p_audience_type
    when 'city' then lower(trim(coalesce(p_location, ''))) = lower(trim(coalesce(p_audience_value, '')))
    when 'state' then public.chat_state_from_location(p_location) = upper(trim(coalesce(p_audience_value, '')))
    when 'region' then public.chat_region_from_state(public.chat_state_from_location(p_location)) = trim(coalesce(p_audience_value, ''))
    else false
  end;
$$;

create or replace function public.chat_user_can_access_channel(p_channel_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_channel public.chat_channels%rowtype;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then return false; end if;
  select * into v_channel from public.chat_channels where id = p_channel_id;
  if not found then return false; end if;
  if v_channel.is_archived then
    return public.is_staff();
  end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then return false; end if;
  if v_profile.role in ('admin','coord','gerente','admpro') then return true; end if;
  if v_channel.audience_type = 'all' then return true; end if;
  if v_channel.audience_type = 'survey' then
    return exists (
      select 1 from public.survey_team st
      where st.survey_id = v_channel.survey_id and st.researcher_id = auth.uid()
    ) or exists (
      select 1 from public.survey_clients sc
      where sc.survey_id = v_channel.survey_id and sc.client_id = auth.uid()
    );
  end if;
  if public.chat_location_matches(v_profile.cidade, v_channel.audience_type, v_channel.audience_value) then return true; end if;
  return exists (
    select 1 from public.profile_cidades_atuacao pca
    where pca.profile_id = auth.uid()
      and public.chat_location_matches(pca.cidade, v_channel.audience_type, v_channel.audience_value)
  );
end;
$$;

create or replace function public.chat_create_channel(
  p_name text,
  p_audience_type text,
  p_audience_value text default null,
  p_survey_id uuid default null
)
returns public.chat_channels
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.chat_channels%rowtype;
  v_value text;
begin
  if not public.is_staff() then raise exception 'not authorized to create chat channels'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'channel name is required'; end if;
  if p_audience_type not in ('all','region','state','city','survey') then raise exception 'invalid chat audience'; end if;
  if p_audience_type = 'survey' and p_survey_id is null then raise exception 'survey channel requires a survey'; end if;
  if p_audience_type <> 'survey' and p_survey_id is not null then raise exception 'non-survey channel cannot have a survey'; end if;
  v_value=nullif(trim(coalesce(p_audience_value, '')), '');
  if p_audience_type in ('region','state','city') and v_value is null then raise exception 'location audience requires a value'; end if;
  if p_audience_type='state' then v_value=upper(v_value); end if;
  insert into public.chat_channels(name,audience_type,audience_value,survey_id,created_by)
  values(trim(p_name),p_audience_type,v_value,p_survey_id,auth.uid())
  returning * into v_channel;
  return v_channel;
end;
$$;

create or replace function public.chat_send_message(
  p_channel_id uuid,
  p_body text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_message public.chat_messages%rowtype;
  v_body text;
begin
  if auth.uid() is null or not public.chat_user_can_access_channel(p_channel_id) then
    raise exception 'not authorized to send to this chat';
  end if;
  v_body=trim(coalesce(p_body, ''));
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'message must contain between 1 and 4000 characters';
  end if;
  select * into v_profile from public.profiles where id=auth.uid();
  insert into public.chat_messages(channel_id,sender_id,sender_name,sender_role,body)
  values(p_channel_id,auth.uid(),v_profile.name,v_profile.role,v_body)
  returning * into v_message;
  return v_message;
end;
$$;

create or replace function public.chat_mark_read(p_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.chat_user_can_access_channel(p_channel_id) then
    raise exception 'not authorized to mark this chat as read';
  end if;
  insert into public.chat_message_reads(channel_id,user_id,last_read_at)
  values(p_channel_id,auth.uid(),now())
  on conflict (channel_id,user_id) do update set last_read_at=excluded.last_read_at;
end;
$$;

create or replace function public.chat_touch_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_channels set last_message_at=new.created_at where id=new.channel_id;
  return new;
end;
$$;

drop trigger if exists chat_messages_touch_channel on public.chat_messages;
create trigger chat_messages_touch_channel
after insert on public.chat_messages
for each row execute function public.chat_touch_channel();

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_message_reads enable row level security;

drop policy if exists "usuário vê canais autorizados" on public.chat_channels;
drop policy if exists "staff cria canais" on public.chat_channels;
drop policy if exists "staff atualiza canais" on public.chat_channels;
drop policy if exists "usuário vê mensagens autorizadas" on public.chat_messages;
drop policy if exists "usuário envia mensagens autorizadas" on public.chat_messages;
drop policy if exists "usuário vê suas leituras" on public.chat_message_reads;
drop policy if exists "usuário grava suas leituras" on public.chat_message_reads;

create policy "usuário vê canais autorizados"
  on public.chat_channels for select
  using (public.chat_user_can_access_channel(id));
create policy "staff cria canais"
  on public.chat_channels for insert
  with check (public.is_staff() and created_by=auth.uid());
create policy "staff atualiza canais"
  on public.chat_channels for update
  using (public.is_staff()) with check (public.is_staff());
create policy "usuário vê mensagens autorizadas"
  on public.chat_messages for select
  using (public.chat_user_can_access_channel(channel_id));
create policy "usuário envia mensagens autorizadas"
  on public.chat_messages for insert
  with check (sender_id=auth.uid() and public.chat_user_can_access_channel(channel_id));
create policy "usuário vê suas leituras"
  on public.chat_message_reads for select
  using (user_id=auth.uid());
create policy "usuário grava suas leituras"
  on public.chat_message_reads for insert
  with check (user_id=auth.uid() and public.chat_user_can_access_channel(channel_id));
create policy "usuário atualiza suas leituras"
  on public.chat_message_reads for update
  using (user_id=auth.uid() and public.chat_user_can_access_channel(channel_id))
  with check (user_id=auth.uid() and public.chat_user_can_access_channel(channel_id));

grant select on public.chat_channels, public.chat_messages, public.chat_message_reads to authenticated;
grant insert on public.chat_message_reads to authenticated;
grant update on public.chat_message_reads to authenticated;
revoke all on function public.chat_user_can_access_channel(uuid) from public;
revoke all on function public.chat_create_channel(text,text,text,uuid) from public;
revoke all on function public.chat_send_message(uuid,text) from public;
revoke all on function public.chat_mark_read(uuid) from public;
grant execute on function public.chat_user_can_access_channel(uuid) to authenticated;
grant execute on function public.chat_create_channel(text,text,text,uuid) to authenticated;
grant execute on function public.chat_send_message(uuid,text) to authenticated;
grant execute on function public.chat_mark_read(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_rel pr
       join pg_class c on c.oid=pr.prrelid
       join pg_publication p on p.oid=pr.prpubid
       where p.pubname='supabase_realtime' and c.relname='chat_messages'
     ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;

commit;
