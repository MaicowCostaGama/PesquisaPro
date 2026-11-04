#!/usr/bin/env python3
"""Runs the distance migration only against a throwaway local PostgreSQL cluster."""
from pathlib import Path
import os
import pwd
import shutil
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent
SQL = ROOT / 'deploy' / 'distancia-minima-coleta-por-pesquisa-20261104.sql'
PG_BINDIR = Path(subprocess.check_output(['pg_config', '--bindir'], text=True).strip())
RUNUSER = shutil.which('runuser')
if not RUNUSER or not (PG_BINDIR / 'initdb').exists():
    raise SystemExit('PostgreSQL local completo e runuser são necessários; nenhum banco remoto foi acessado.')


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def as_postgres(*args, check=True):
    result = subprocess.run(['sudo', RUNUSER, '-u', 'postgres', '--', *map(str, args)], text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result


def main():
    base = Path(tempfile.mkdtemp(prefix='pp-distance-pg-'))
    data = base / 'data'
    data.mkdir()
    subprocess.run(['sudo', 'chown', '-R', 'postgres:postgres', str(base)], check=True)
    port = free_port()
    started = False
    try:
        as_postgres(PG_BINDIR / 'initdb', '-D', data, '--no-locale', '--encoding=UTF8', '--auth=trust')
        as_postgres(PG_BINDIR / 'pg_ctl', '-D', data, '-l', base / 'postgres.log', '-o', f'-h 127.0.0.1 -p {port}', '-w', 'start')
        started = True

        def psql(script=None, file=None, check=True):
            cmd = ['psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1']
            if file:
                cmd += ['-f', str(file)]
                result = subprocess.run(cmd, text=True, capture_output=True)
            else:
                result = subprocess.run(cmd, input=script, text=True, capture_output=True)
            if check and result.returncode:
                raise RuntimeError(result.stdout + result.stderr)
            return result

        bootstrap = r"""
        create schema auth;
        create role anon;
        create role authenticated;
        create or replace function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        create table public.profiles(id uuid primary key, name text, role text, status text, is_collection_test_user boolean not null default false);
        create table public.surveys(
          id uuid primary key, archived_at timestamptz, status text, form_started boolean not null default true,
          minimum_collection_distance_m integer, minimum_collection_seconds integer,
          updated_at timestamptz default now(), cidades jsonb not null default '{}'::jsonb, estados text[] not null default '{}'
        );
        create table public.survey_team(survey_id uuid, researcher_id uuid, primary key(survey_id,researcher_id));
        create table public.collection_events(
          id uuid primary key default gen_random_uuid(), survey_id uuid not null, researcher_id uuid not null,
          status text not null default 'valid', is_calibration boolean not null default false,
          flags text[] not null default '{}', lat double precision, lng double precision, occurred_at timestamptz not null default now(),
          duration_seconds integer, captured_city text, captured_state text,
          rejected_at timestamptz, reject_reason text, recording_status text
        );
        create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
          select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','coordenador'))
        $$;
        create or replace function public.is_collection_test_user() returns boolean language sql stable security definer set search_path=public as $$
          select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_collection_test_user is true and p.role='pesq' and p.status='ativo')
        $$;
        create or replace function public._collection_event_is_test(uuid,boolean,text[]) returns boolean language sql stable security definer set search_path=public as $$
          select exists(select 1 from public.profiles p where p.id=$1 and p.is_collection_test_user is true)
             or (coalesce($2,false) and coalesce($3,'{}'::text[]) @> array['Coleta de teste autorizada — calibração']::text[])
        $$;
        create or replace function public.calculate_survey_minimum_collection_seconds(uuid) returns integer language sql stable as $$ select 60 $$;
        insert into public.profiles values
          ('00000000-0000-0000-0000-000000000001','Pesq A','pesq','ativo',false),
          ('00000000-0000-0000-0000-000000000002','Pesq B','pesq','ativo',false),
          ('00000000-0000-0000-0000-000000000003','Teste','pesq','ativo',true),
          ('00000000-0000-0000-0000-000000000004','Admin','admin','ativo',false);
        insert into public.surveys(id,status,form_started,minimum_collection_seconds)
          values ('10000000-0000-0000-0000-000000000001','campo',true,60),
                 ('10000000-0000-0000-0000-000000000002','campo',true,60),
                 ('10000000-0000-0000-0000-000000000003','campo',true,60),
                 ('10000000-0000-0000-0000-000000000004','campo',true,60),
                 ('10000000-0000-0000-0000-000000000005','campo',true,60);
        insert into public.survey_team values
          ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001'),
          ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'),
          ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002'),
          ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002'),
          ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001'),
          ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002'),
          ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001'),
          ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002');
        """
        psql(bootstrap)
        psql(file=SQL)

        cases = r"""
        -- Existing research rows receive 15 m; staff can save a custom value.
        do $$ begin
          if (select minimum_collection_distance_m from public.surveys where id='10000000-0000-0000-0000-000000000001') <> 15 then raise exception 'default is not 15'; end if;
        end $$;
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
        select public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000001',100);
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
        -- First valid point by researcher A is accepted.
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',0,0,120);
        -- B is allowed into the same survey but blocked 20 m away under the 100 m rule.
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
        do $$ declare r record; begin
          select * into r from public.validate_collection_start_with_distance('10000000-0000-0000-0000-000000000001',0,0.00018);
          if r.allowed is not false or r.code <> 'too_close' or r.distance_m >= 100 then raise exception 'team-wide start distance failed: %',row_to_json(r); end if;
        end $$;
        do $$ begin
          begin
            insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
              values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',0,0.00018,120);
            raise exception 'too-close team insert unexpectedly passed';
          exception when others then
            if sqlerrm not like 'too_close:%' then raise; end if;
          end;
        end $$;
        -- Missing duration must never create a valid event to bypass either rule.
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',0,0.00018,null);
        do $$ begin
          if not exists (
            select 1 from public.collection_events
             where survey_id='10000000-0000-0000-0000-000000000001'
               and researcher_id='00000000-0000-0000-0000-000000000002'
               and status='rejected' and reject_reason like '%Duração da coleta não foi informada%'
          ) then raise exception 'missing duration was not preserved as an audited rejection'; end if;
        end $$;
        -- Rejected and calibration events do not block; valid events from another survey do not block.
        insert into public.collection_events(survey_id,researcher_id,status,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','rejected',0,0.00001,10);
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',0,0,120);
        -- Explicitly marked calibration is ignored by the distance helper.
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
        insert into public.collection_events(survey_id,researcher_id,is_calibration,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',true,0,0.00001,120);
        -- Test profile still needs GPS but bypasses the test radius; insertion is calibrated server-side.
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
        do $$ declare r record; begin
          select * into r from public.validate_collection_start_with_distance('10000000-0000-0000-0000-000000000001',0,0.00001);
          if r.allowed is not true or r.code <> 'ok_test' then raise exception 'test profile bypass failed: %',row_to_json(r); end if;
        end $$;
        insert into public.collection_events(survey_id,researcher_id,status,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','pending_recording',0,0.00001,120);
        update public.collection_events set status='valid'
          where survey_id='10000000-0000-0000-0000-000000000001' and researcher_id='00000000-0000-0000-0000-000000000003';
        do $$ begin
          if not exists(select 1 from public.collection_events where researcher_id='00000000-0000-0000-0000-000000000003' and is_calibration=true) then raise exception 'test was not classified as calibration'; end if;
        end $$;
        -- 0 disables the distance rule; a researcher in the team can submit at the same point.
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
        select public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000001',0);
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
        do $$ declare r record; begin
          select * into r from public.validate_collection_start_with_distance('10000000-0000-0000-0000-000000000001',0,0);
          if r.allowed is not true or r.code <> 'ok' then raise exception 'zero-distance override failed'; end if;
        end $$;
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',0,0,120);
        -- Longitude bounds wrap correctly across +/-180° (about 22 m apart).
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
        select public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000003',500);
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',0,179.9999,120);
        do $$ declare r record; begin
          select * into r from public.validate_collection_start_with_distance('10000000-0000-0000-0000-000000000003',0,-179.9999);
          if r.allowed is not false or r.code <> 'too_close' or r.distance_m > 30 then raise exception 'longitude wrap distance failed: %',row_to_json(r); end if;
        end $$;
        -- High-latitude spherical bounds: 60 degrees of longitude is still
        -- within 10 km near 89.9°N and must not be dropped by a coarse box.
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
        select public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000003',10000);
        set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
        insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
          values ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',89.9,0,120);
        do $$ declare r record; begin
          select * into r from public.validate_collection_start_with_distance('10000000-0000-0000-0000-000000000003',89.95,60);
          if r.allowed is not false or r.code <> 'too_close' or r.distance_m >= 10000 then raise exception 'polar distance bound failed: %',row_to_json(r); end if;
        end $$;
        """
        psql(cases)

        # Two distinct researchers insert within 100 m concurrently. The second
        # session must wait for the survey lock, get a fresh snapshot, then fail.
        psql("set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';\nselect public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000004',100);")
        conn = ['psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1']
        first = subprocess.Popen(conn, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        first.stdin.write(r"""
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
          begin;
          insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
            values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',0,0,120);
          select pg_sleep(1.0);
          commit;
        """)
        first.stdin.flush()
        time.sleep(0.2)
        second = subprocess.run(conn, input=r"""
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
          insert into public.collection_events(survey_id,researcher_id,lat,lng,duration_seconds)
            values ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',0,0.00018,120);
        """, text=True, capture_output=True, timeout=10)
        first_out, first_err = first.communicate(timeout=10)
        if first.returncode != 0:
            raise RuntimeError(first_out + first_err)
        if second.returncode == 0 or 'too_close:' not in second.stderr:
            raise AssertionError(f'Concurrent nearby insert was not blocked: {second.stdout}{second.stderr}')
        psql(r"""
          do $$ begin
            if (select count(*) from public.collection_events where survey_id='10000000-0000-0000-0000-000000000004') <> 1 then
              raise exception 'concurrent distance guard allowed more than one nearby valid event';
            end if;
          end $$;
        """)
        # Pending nighttime recordings do not count yet; the transition to
        # valid is serialized and rechecked so only one nearby event can qualify.
        psql(r"""
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
          select public.save_survey_minimum_collection_distance('10000000-0000-0000-0000-000000000005',100);
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
          insert into public.collection_events(survey_id,researcher_id,status,lat,lng,duration_seconds,recording_status)
            values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','pending_recording',0,0,120,'uploaded');
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
          insert into public.collection_events(survey_id,researcher_id,status,lat,lng,duration_seconds,recording_status)
            values ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','pending_recording',0,0.00018,120,'uploaded');
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
          update public.collection_events set status='valid'
            where survey_id='10000000-0000-0000-0000-000000000005' and researcher_id='00000000-0000-0000-0000-000000000001';
          set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
          do $$ begin
            update public.collection_events set status='valid'
              where survey_id='10000000-0000-0000-0000-000000000005' and researcher_id='00000000-0000-0000-0000-000000000002';
            if (select count(*) from public.collection_events where survey_id='10000000-0000-0000-0000-000000000005' and status='valid') <> 1 then
              raise exception 'night recording transition did not preserve a single valid collection';
            end if;
            if not exists (
              select 1 from public.collection_events
               where survey_id='10000000-0000-0000-0000-000000000005'
                 and researcher_id='00000000-0000-0000-0000-000000000002'
                 and status='rejected'
                 and recording_status='uploaded'
                 and rejected_at is not null
                 and reject_reason like '%distância mínima%'
            ) then
              raise exception 'nearby night recording was not preserved as an audited rejection with audio attached';
            end if;
          end $$;
        """)
        print('Distance minimum PostgreSQL regression: PASS (team-wide defaults/custom values, calibration/rejection exclusions, test profile, radius 0, dateline and polar bounds, insert/update guards, and concurrent inserts).')
    finally:
        if started:
            as_postgres(PG_BINDIR / 'pg_ctl', '-D', data, '-m', 'immediate', '-w', 'stop', check=False)
        shutil.rmtree(base, ignore_errors=True)


if __name__ == '__main__':
    main()
