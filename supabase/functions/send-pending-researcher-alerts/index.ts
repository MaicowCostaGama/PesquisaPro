import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_APP_URL = 'https://www.pesquisa-pro.com/app.html';
const MAX_JOBS = 50;

type AlertJob = {
  id: string;
  event_type: 'invite' | 'orientation';
  event_id: string;
  survey_id: string;
  researcher_id: string;
  channel: 'email' | 'push';
  event_cycle_at: string;
  attempt_count: number;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  subscription: unknown;
};

type PushClient = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (subscription: unknown, payload: string) => Promise<unknown>;
};

const pushClient = webpush as unknown as PushClient;
const TRUSTED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
  'wns.windows.com',
];

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

function env(name: string): string {
  return (Deno.env.get(name) || '').trim();
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function providerStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === 'number' ? value : 0;
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= 320
    && !/[\r\n]/.test(value)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validFrom(value: string): boolean {
  return value.length > 0 && value.length <= 320 && !/[\r\n]/.test(value);
}

function trustedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trusted = TRUSTED_PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && trusted;
  } catch {
    return false;
  }
}

function validPushSubscription(value: unknown, rowEndpoint: string): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const item = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return item.endpoint === rowEndpoint
    && trustedPushEndpoint(item.endpoint)
    && !!item.keys
    && typeof item.keys.p256dh === 'string'
    && item.keys.p256dh.length > 0
    && typeof item.keys.auth === 'string'
    && item.keys.auth.length > 0;
}

function appUrl(): string {
  const configured = env('APP_URL');
  try {
    const url = new URL(configured);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !['pesquisa-pro.com', 'www.pesquisa-pro.com'].includes(host)) {
      return DEFAULT_APP_URL;
    }
    url.pathname = '/app.html';
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return DEFAULT_APP_URL;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));
}

function retrySeconds(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(6, (attemptCount || 1) - 1));
  return Math.min(21600, 300 * (2 ** exponent));
}

function code(prefix: string, status = 0): string {
  return status > 0 ? `${prefix}_http_${status}` : `${prefix}_temporary_failure`;
}

async function finishJob(
  admin: ReturnType<typeof createClient>,
  job: AlertJob,
  workerId: string,
  result: string,
  errorCode?: string,
  providerMessageId?: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc('finish_researcher_alert_job', {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_result: result,
    p_provider_message_id: providerMessageId || null,
    p_error: errorCode || null,
    p_retry_seconds: retrySeconds(job.attempt_count),
  });
  return !error && data === true;
}

function sameTimestamp(left: unknown, right: string): boolean {
  if (typeof left !== 'string' || !right) return false;
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

async function sourceIsStillPending(
  admin: ReturnType<typeof createClient>,
  job: AlertJob,
): Promise<{ pending: boolean; error: boolean }> {
  if (job.event_type === 'invite') {
    const { data, error } = await admin
      .from('survey_invites')
      .select('status,researcher_id,survey_id,invited_at')
      .eq('id', job.event_id)
      .maybeSingle();
    if (error) return { pending: false, error: true };
    return {
      pending: !!data
        && data.status === 'pendente'
        && data.researcher_id === job.researcher_id
        && data.survey_id === job.survey_id
        && sameTimestamp(data.invited_at, job.event_cycle_at),
      error: false,
    };
  }

  const orientation = await admin
    .from('survey_researcher_orientation_sends')
    .select('message_id,researcher_id,survey_id,sent_at')
    .eq('message_id', job.event_id)
    .maybeSingle();
  if (orientation.error) return { pending: false, error: true };
  if (!orientation.data
    || orientation.data.researcher_id !== job.researcher_id
    || orientation.data.survey_id !== job.survey_id
    || !sameTimestamp(orientation.data.sent_at, job.event_cycle_at)) {
    return { pending: false, error: false };
  }

  const recipient = await admin
    .from('survey_researcher_message_recipients')
    .select('acknowledged_at')
    .eq('message_id', job.event_id)
    .eq('researcher_id', job.researcher_id)
    .maybeSingle();
  if (recipient.error) return { pending: false, error: true };
  return { pending: !!recipient.data && recipient.data.acknowledged_at == null, error: false };
}

async function sendEmail(
  job: AlertJob,
  recipient: string,
  from: string,
  resendKey: string,
  destination: string,
): Promise<{ result: 'gateway_accepted' | 'retry' | 'dead' | 'invalid_address'; code?: string; id?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        // A stable key prevents a retry from creating a second Resend email.
        'Idempotency-Key': job.id,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: 'Você tem um aviso pendente na PesquisaPro',
        text: `Há um convite ou orientação pendente na PesquisaPro. Abra ${destination} para consultar o aplicativo.`,
        html: `<p>Há um convite ou orientação pendente na PesquisaPro.</p><p>Abra <a href="${escapeHtml(destination)}">o aplicativo PesquisaPro</a> para consultar.</p>`,
      }),
    });
    const raw = await response.text();
    let parsed: { id?: unknown } = {};
    try { parsed = raw ? JSON.parse(raw) as { id?: unknown } : {}; } catch { /* provider body is not trusted */ }
    if (response.ok) {
      return {
        result: 'gateway_accepted',
        id: typeof parsed.id === 'string' ? parsed.id : undefined,
      };
    }
    if (response.status === 401 || response.status === 403 || response.status === 408
      || response.status === 429 || response.status >= 500) {
      return { result: 'retry', code: code('email_retry', response.status) };
    }
    // Resend 400/422 can mean a misconfigured/unverified sender or payload;
    // they do not prove that the Auth recipient address is invalid.
    return { result: 'dead', code: code('email_provider_rejected', response.status) };
  } catch {
    return { result: 'retry', code: 'email_network_failure' };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendPush(
  job: AlertJob,
  subscriptions: PushSubscriptionRow[],
  vapidPublic: string,
  vapidPrivate: string,
  vapidSubject: string,
  destination: string,
  admin: ReturnType<typeof createClient>,
): Promise<{ result: 'gateway_accepted' | 'retry' | 'dead' | 'invalid_subscription' | 'skipped_no_subscription'; code?: string }> {
  const valid = subscriptions.filter((row) => validPushSubscription(row.subscription, row.endpoint));
  if (!subscriptions.length) return { result: 'skipped_no_subscription' };
  // A linha permanece para inspeção/reparo manual: somente 404/410 do
  // gateway prova que uma subscription expirou e autoriza invalid_subscription
  // + exclusão. Um JSON local inválido não é prova de expiração.
  if (!valid.length) return { result: 'dead', code: 'subscription_invalid_shape' };

  try {
    pushClient.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch {
    return { result: 'retry', code: 'vapid_configuration_invalid' };
  }

  let accepted = 0;
  let transient = 0;
  let hardFailure = 0;
  let invalid = 0;
  for (const row of valid) {
    try {
      await pushClient.sendNotification(row.subscription, JSON.stringify({
        title: 'Aviso pendente — PesquisaPro',
        body: 'Você tem um convite ou orientação pendente. Abra o aplicativo para consultar.',
        url: destination,
        tag: `researcher-alert-${job.event_id}`,
      }));
      accepted += 1;
    } catch (error) {
      const status = providerStatus(error);
      // Only 404/410 prove an obsolete subscription. Do not delete on any
      // other provider error, because it may be transient or authorization.
      if (status === 404 || status === 410) {
        invalid += 1;
        await admin.from('push_subscriptions').delete().eq('id', row.id);
      } else if (status === 408 || status === 429 || status >= 500 || status === 0) {
        transient += 1;
      } else {
        hardFailure += 1;
      }
    }
  }

  if (accepted > 0) return { result: 'gateway_accepted' };
  if (transient > 0) return { result: 'retry', code: 'push_provider_temporary_failure' };
  if (invalid === valid.length) return { result: 'invalid_subscription', code: 'push_subscription_expired' };
  if (hardFailure > 0) return { result: 'dead', code: 'push_provider_rejected' };
  return { result: 'dead', code: 'push_subscription_invalid' };
}

async function processJob(
  admin: ReturnType<typeof createClient>,
  job: AlertJob,
  workerId: string,
  settings: {
    resendKey: string;
    from: string;
    vapidPublic: string;
    vapidPrivate: string;
    vapidSubject: string;
    destination: string;
  },
): Promise<string> {
  const source = await sourceIsStillPending(admin, job);
  if (source.error) {
    await finishJob(admin, job, workerId, 'unavailable', 'source_query_failed');
    return 'unavailable';
  }
  if (!source.pending) {
    await finishJob(admin, job, workerId, 'cancelled', 'source_no_longer_pending');
    return 'cancelled';
  }

  const preference = await admin
    .from('researcher_alert_preferences')
    .select('email_enabled,push_enabled')
    .eq('researcher_id', job.researcher_id)
    .maybeSingle();
  if (preference.error) {
    await finishJob(admin, job, workerId, 'unavailable', 'preference_query_failed');
    return 'unavailable';
  }
  const enabled = job.channel === 'email'
    ? preference.data?.email_enabled === true
    : preference.data?.push_enabled === true;
  if (!enabled) {
    await finishJob(admin, job, workerId, 'skipped_preference');
    return 'skipped_preference';
  }

  const profile = await admin
    .from('profiles')
    .select('role,status')
    .eq('id', job.researcher_id)
    .maybeSingle();
  if (profile.error) {
    await finishJob(admin, job, workerId, 'unavailable', 'profile_query_failed');
    return 'unavailable';
  }
  if (!profile.data || profile.data.role !== 'pesq' || profile.data.status !== 'ativo') {
    await finishJob(admin, job, workerId, 'cancelled', 'researcher_not_active');
    return 'cancelled';
  }

  if (job.channel === 'email') {
    if (!settings.resendKey || !validFrom(settings.from)) {
      await finishJob(admin, job, workerId, 'unavailable', 'email_secrets_unavailable');
      return 'unavailable';
    }
    // profiles.email is editable application data and is deliberately not an
    // address source. Only a confirmed address owned by Auth is eligible.
    const authUser = await admin.auth.admin.getUserById(job.researcher_id);
    if (authUser.error) {
      await finishJob(admin, job, workerId, 'unavailable', 'auth_user_query_failed');
      return 'unavailable';
    }
    const user = authUser.data.user;
    if (!user || !user.email_confirmed_at || !validEmail(user.email)) {
      await finishJob(admin, job, workerId, 'invalid_address', 'auth_email_unconfirmed_or_invalid');
      return 'invalid_address';
    }
    const result = await sendEmail(job, user.email.trim(), settings.from, settings.resendKey, settings.destination);
    await finishJob(admin, job, workerId, result.result, result.code, result.id);
    return result.result;
  }

  if (!settings.vapidPublic || !settings.vapidPrivate || !settings.vapidSubject) {
    await finishJob(admin, job, workerId, 'unavailable', 'push_secrets_unavailable');
    return 'unavailable';
  }
  const subscriptions = await admin
    .from('push_subscriptions')
    .select('id,endpoint,subscription')
    .eq('user_id', job.researcher_id);
  if (subscriptions.error) {
    await finishJob(admin, job, workerId, 'unavailable', 'subscription_query_failed');
    return 'unavailable';
  }
  const result = await sendPush(job, (subscriptions.data || []) as PushSubscriptionRow[], settings.vapidPublic,
    settings.vapidPrivate, settings.vapidSubject, settings.destination, admin);
  await finishJob(admin, job, workerId, result.result, result.code);
  return result.result;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const workerSecret = env('ALERT_WORKER_SECRET');
  const suppliedSecret = request.headers.get('x-alert-worker-secret') || '';
  if (!workerSecret || !suppliedSecret || !constantTimeEqual(workerSecret, suppliedSecret)) {
    return json({ error: 'not authorized' }, 401);
  }

  const supabaseUrl = env('SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'worker unavailable: Supabase service configuration is missing' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const workerId = crypto.randomUUID();
  const parsedBody = await request.json().catch(() => ({}));
  const body = parsedBody && typeof parsedBody === 'object'
    ? parsedBody as { limit?: unknown }
    : {};
  const requestedLimit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : MAX_JOBS;
  const limit = Math.min(MAX_JOBS, Math.max(1, Math.floor(requestedLimit)));

  const claimed = await admin.rpc('claim_researcher_alert_jobs', {
    p_limit: limit,
    p_worker_id: workerId,
  });
  if (claimed.error) {
    return json({ error: 'worker unavailable: queue claim failed' }, 503);
  }

  const settings = {
    resendKey: env('RESEND_API_KEY'),
    from: env('ALERT_FROM_EMAIL'),
    vapidPublic: env('VAPID_PUBLIC_KEY'),
    vapidPrivate: env('VAPID_PRIVATE_KEY'),
    vapidSubject: env('VAPID_SUBJECT') || 'mailto:admin@pesquisa-pro.com',
    destination: appUrl(),
  };
  const counts: Record<string, number> = {};
  for (const job of (claimed.data || []) as AlertJob[]) {
    const result = await processJob(admin, job, workerId, settings);
    counts[result] = (counts[result] || 0) + 1;
  }

  const unavailable = (counts.unavailable || 0) > 0
    || (!settings.resendKey && !settings.vapidPrivate && !settings.vapidPublic);
  return json({ claimed: claimed.data?.length || 0, processed: Object.values(counts).reduce((a, b) => a + b, 0), counts }, unavailable ? 503 : 200);
});
