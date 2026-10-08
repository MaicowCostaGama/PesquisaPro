const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const migrationPath = path.join(root, 'deploy/alertas-pendentes-push-email.sql');
const edgePath = path.join(root, 'supabase/functions/send-pending-researcher-alerts/index.ts');
const migration = fs.readFileSync(migrationPath, 'utf8');
const edge = fs.readFileSync(edgePath, 'utf8');

function ok(condition, message) {
  assert(condition, message);
}
function hasAll(source, tokens, label) {
  for (const token of tokens) ok(source.includes(token), `${label} sem ${token}`);
}

// This is intentionally static: it never contacts Supabase, Resend, browser
// push gateways, auth.users, or a real database.
for (const source of [migration, edge]) {
  ok(!/\b(drop\s+table|drop\s+column|truncate|delete\s+from)\b/i.test(source), 'artefato contém operação destrutiva proibida');
}

hasAll(migration, [
  'PesquisaPro v135',
  'create table if not exists public.researcher_alert_preferences',
  'researcher_id uuid primary key references public.profiles(id) on delete cascade',
  'email_enabled boolean not null default false',
  'push_enabled boolean not null default false',
  'alter table public.researcher_alert_preferences enable row level security',
  'researcher_id=auth.uid() or public.is_staff()',
  'create or replace function public.save_my_researcher_alert_preferences(',
  'auth.uid()',
  'revoke all on function public.save_my_researcher_alert_preferences(boolean,boolean) from public',
  'grant execute on function public.save_my_researcher_alert_preferences(boolean,boolean) to authenticated',
], 'migration/preferências');
ok(!migration.includes('p_researcher_id'), 'RPC de preferências aceita alvo arbitrário');

hasAll(migration, [
  'create table if not exists public.researcher_alert_queue',
  'event_cycle_at timestamptz not null',
  'create unique index if not exists researcher_alert_queue_event_cycle_channel_uidx',
  'on public.researcher_alert_queue(event_type,event_id,event_cycle_at,channel)',
  "status text not null default 'pending' check (status in (",
  "'skipped_preference','skipped_no_subscription'",
  'for update skip locked',
  "where status='processing'",
  "set status='cancelled'",
  'i.invited_at=q.event_cycle_at',
  'o.sent_at=q.event_cycle_at',
  'after insert on public.survey_invites',
  'after update of status, invited_at on public.survey_invites',
  'after insert on public.survey_researcher_orientation_sends',
  'on conflict do nothing',
  "interval '20 minutes'",
  'grant execute on function public.claim_researcher_alert_jobs(integer,text) to service_role',
  'grant execute on function public.finish_researcher_alert_job(uuid,text,text,text,text,integer) to service_role',
], 'migration/fila');
ok(!/coalesce\s*\(\s*event_cycle_at\s*::text/i.test(migration), 'índice usa cast timestamptz->text não immutable');
ok(!/backfill\s+autom[aá]tico/i.test(migration), 'migration sugere backfill automático');

hasAll(edge, [
  "request.headers.get('x-alert-worker-secret')",
  'constantTimeEqual',
  'ALERT_WORKER_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  "admin.rpc('claim_researcher_alert_jobs'",
  "admin.rpc('finish_researcher_alert_job'",
  "admin.auth.admin.getUserById(job.researcher_id)",
  'email_confirmed_at',
  'https://api.resend.com/emails',
  "'Idempotency-Key': job.id",
  'RESEND_API_KEY',
  'ALERT_FROM_EMAIL',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'webpush',
  'sendNotification',
  'status === 404 || status === 410',
  "push_subscriptions').delete().eq('id', row.id)",
  'event_cycle_at: string',
  'sameTimestamp(data.invited_at, job.event_cycle_at)',
  'sameTimestamp(orientation.data.sent_at, job.event_cycle_at)',
  "['pesquisa-pro.com', 'www.pesquisa-pro.com']",
  'escapeHtml(destination)',
  'trustedPushEndpoint',
  'item.endpoint === rowEndpoint',
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
], 'edge worker');
ok(!/select\([^)]*\bemail\b[^)]*\)\s*\n?\s*\.eq\(['"]id['"]/.test(edge), 'worker consulta email mutável de profiles');
ok(!edge.includes("select('role,status,email')"), 'worker inclui profiles.email como fonte do e-mail');
ok(!edge.includes("email_invalid"), 'Resend 400/422 tratado erroneamente como endereço inválido');
ok(!edge.includes('Authorization: req.headers.get'), 'worker aceita autorização do browser');

console.log('Pending alerts backend smoke test: PASS — v135, opt-in/RLS/RPC, fila por ciclo com lock/retry, cancelamento de pendências, auth email confirmado, Resend idempotente, VAPID, SSRF push e segredo dedicado verificados estaticamente.');
