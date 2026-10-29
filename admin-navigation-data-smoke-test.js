'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'admin-navigation-data.js'), 'utf8');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function surveyRow(id, extra = {}) {
  return {
    id,
    name: `Pesquisa ${id}`,
    status: 'campo',
    archived_at: null,
    created_at: '2026-10-29T12:00:00Z',
    populacao: 1000,
    margem_erro: 0.03,
    nivel_confianca: 1.96,
    proporcao: 50,
    form_started: true,
    form_approval_required: false,
    question_count: 2,
    team_count: 1,
    valid_count: 7,
    ...extra,
  };
}

function overviewValue(extra = {}) {
  return {
    active_researchers: 3,
    active_clients: 4,
    pending_signups: 2,
    pending_contracts: 1,
    valid_interviews: 9,
    company_signed: true,
    daily_counts: [{ day: '2026-10-28', count: 3 }, { day: '2026-10-29', count: 6 }],
    ...extra,
  };
}

function makeEnvironment({
  profile = { id: 'admin-1', role: 'admin' },
  surveyRows = [],
  overview = overviewValue(),
  pageError,
  overviewError,
  pending = false,
  fakeTimers = false,
} = {}) {
  const calls = [];
  const timers = [];
  let timerId = 0;
  let now = 1000000;
  const state = { profile, surveyRows: surveyRows.slice(), overview, pageError, overviewError, pending };

  const timerApi = fakeTimers
    ? {
        setTimeout(fn, ms) {
          const item = { id: ++timerId, fn, ms, cleared: false };
          timers.push(item);
          return item.id;
        },
        clearTimeout(id) {
          const item = timers.find((entry) => entry.id === id);
          if (item) item.cleared = true;
        },
      }
    : { setTimeout, clearTimeout };

  function responseFor(call) {
    if (call.name === 'admin_navigation_overview_v1') {
      if (state.overviewError) return { data: null, error: state.overviewError };
      return { data: state.overview, error: null };
    }
    if (state.pageError) return { data: null, error: state.pageError };
    const from = call.args.p_offset;
    const to = from + call.args.p_limit;
    return { data: state.surveyRows.slice(from, to), error: null };
  }

  const sb = {
    rpc(name, args) {
      const call = { name, args: args || {}, signal: null };
      calls.push(call);
      const wait = deferred();
      const query = {
        abortSignal(signal) {
          call.signal = signal;
          if (state.pending) {
            signal.addEventListener('abort', () => wait.resolve({ data: null, error: { message: 'aborted' } }), { once: true });
          } else {
            queueMicrotask(() => wait.resolve(responseFor(call)));
          }
          return query;
        },
        then(resolve, reject) {
          return wait.promise.then(resolve, reject);
        },
      };
      return query;
    },
  };

  const context = {
    window: {},
    CURRENT_PROFILE: profile,
    sb,
    console: { warn() {}, error() {} },
    Promise,
    Error,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    JSON,
    Date: class extends Date {
      static now() { return now; }
    },
    AbortController,
    setTimeout: timerApi.setTimeout,
    clearTimeout: timerApi.clearTimeout,
    queueMicrotask,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'admin-navigation-data.js' });

  return {
    context,
    api: context.window.PP_ADMIN_NAV_DATA,
    calls,
    timers,
    state,
    advance(ms) { now += ms; },
    fireTimeouts() {
      timers.filter((item) => !item.cleared && item.ms === 15000).forEach((item) => {
        item.cleared = true;
        item.fn();
      });
    },
  };
}

async function ticks(count = 8) {
  for (let index = 0; index < count; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

function assertSummaryShape(row) {
  assert.equal(row.summaryOnly, true);
  for (const forbidden of ['questions', 'opts', 'options', 'audio', 'phone', 'email', 'cpf', 'pessoal']) {
    assert.equal(Object.prototype.hasOwnProperty.call(row, forbidden), false, `payload leve não deve incluir ${forbidden}`);
  }
}

(async () => {
  // Paginação >100, ordenação entregue pelo RPC e payload sem snapshot completo.
  const paged = makeEnvironment({ surveyRows: Array.from({ length: 205 }, (_, index) => surveyRow(`s-${index}`)) });
  const first = paged.api.ensure('surveys');
  const second = paged.api.ensure('surveys');
  assert.strictEqual(first, second, 'promises simultâneas do mesmo recurso devem ser compartilhadas');
  await first;
  assert.equal(paged.calls.length, 3, '205 pesquisas devem usar três páginas de 100');
  assert.deepEqual(JSON.parse(JSON.stringify(paged.calls.map((call) => call.args))), [
    { p_offset: 0, p_limit: 100 },
    { p_offset: 100, p_limit: 100 },
    { p_offset: 200, p_limit: 100 },
  ]);
  assert.equal(paged.api.rows().length, 205);
  assert.equal(paged.api.rows()[0].id, 's-0');
  assertSummaryShape(paged.api.rows()[0]);
  assert.equal(paged.api.state('surveys').status, 'ready');
  assert.equal(paged.api.ready('surveys'), true);
  await paged.api.ensure('surveys');
  assert.equal(paged.calls.length, 3, 'cache dentro do TTL deve deduplicar carga pronta');

  // Overview: validação de contadores/dias e company_signed.
  const overview = makeEnvironment();
  await overview.api.ensure('overview');
  assert.deepEqual(JSON.parse(JSON.stringify(overview.api.overview())), overviewValue());
  assert.equal(overview.api.overview().company_signed, true);
  assert.equal(overview.api.state('overview').status, 'ready');

  // pending_signups nulo é aceito somente para coord/gerente.
  const restricted = makeEnvironment({ profile: { id: 'coord-1', role: 'coord' }, overview: overviewValue({ pending_signups: null }) });
  await restricted.api.ensure('overview');
  assert.equal(restricted.api.overview().pending_signups, null);
  const forbiddenNull = makeEnvironment({ overview: overviewValue({ pending_signups: null }) });
  await forbiddenNull.api.ensure('overview');
  assert.equal(forbiddenNull.api.state('overview').status, 'error');
  assert.match(forbiddenNull.api.state('overview').error, /pending_signups/);

  // Sessão obsoleta: retorno tardio não pode hidratar a nova sessão.
  const stale = makeEnvironment({ pending: true });
  const oldLoad = stale.api.ensure('surveys');
  await ticks();
  const oldCall = stale.calls[0];
  stale.context.CURRENT_PROFILE = { id: 'admin-2', role: 'admin' };
  stale.state.pending = false;
  stale.api.rows();
  await ticks();
  assert.equal(oldCall.signal.aborted, true, 'troca de sessão deve abortar a RPC antiga');
  assert.equal(stale.api.rows().length, 0, 'a sessão obsoleta não pode publicar linhas');
  await oldLoad;
  assert.equal(stale.api.rows().length, 0);
  stale.state.surveyRows = [surveyRow('new-session')];
  await stale.api.ensure('surveys');
  assert.equal(stale.calls.length, 2);
  assert.equal(stale.api.rows()[0].id, 'new-session');

  // reset cancela a requisição, invalida o estado e não deixa retorno tardio entrar.
  const resetEnv = makeEnvironment({ pending: true });
  const pendingLoad = resetEnv.api.ensure('overview');
  await ticks();
  const resetCall = resetEnv.calls[0];
  resetEnv.api.reset();
  assert.equal(resetCall.signal.aborted, true);
  assert.equal(resetEnv.api.state('overview').status, 'idle');
  await pendingLoad;
  assert.equal(resetEnv.api.overview(), null);

  // Timeout abortável, erro explícito e retry somente quando solicitado.
  const timeout = makeEnvironment({ pending: true, fakeTimers: true });
  const timeoutLoad = timeout.api.ensure('surveys');
  await ticks();
  timeout.fireTimeouts();
  await timeoutLoad;
  assert.equal(timeout.calls[0].signal.aborted, true);
  assert.equal(timeout.api.state('surveys').status, 'error');
  assert.match(timeout.api.state('surveys').error, /15 segundos/);
  timeout.state.pending = false;
  timeout.state.surveyRows = [surveyRow('recovered')];
  const retryLoad = timeout.api.retry('surveys');
  await retryLoad;
  assert.equal(timeout.api.rows()[0].id, 'recovered');
  assert.equal(timeout.calls.length, 2);

  // Falha não cria retry infinito; retry explícito recupera.
  const failure = makeEnvironment({ pageError: { message: 'Falha simulada' } });
  await failure.api.ensure('surveys');
  assert.equal(failure.api.state('surveys').status, 'error');
  for (let index = 0; index < 5; index += 1) await failure.api.ensure('surveys');
  assert.equal(failure.calls.length, 1);
  failure.state.pageError = null;
  failure.state.surveyRows = [surveyRow('after-error')];
  await failure.api.retry('surveys');
  assert.equal(failure.api.rows()[0].id, 'after-error');

  // TTL e refresh apenas na rota compatível; não sequestrar navegação.
  const ttl = makeEnvironment({ surveyRows: [surveyRow('ttl-survey')], overview: overviewValue() });
  await ttl.api.ensure('surveys');
  await ttl.api.ensure('overview');
  assert.equal(ttl.calls.length, 2);
  ttl.advance(30001);
  ttl.api.onNavigate('users', 'surveys');
  await ticks();
  assert.equal(ttl.calls.length, 2, 'rota não compatível não deve revalidar');
  ttl.api.onNavigate('dashboard', 'users');
  await ticks();
  assert.equal(ttl.calls.length, 4, 'dashboard deve revalidar surveys e overview expirados');
  assert.equal(ttl.calls[2].name, 'admin_navigation_surveys_v1');
  assert.equal(ttl.calls[3].name, 'admin_navigation_overview_v1');
  ttl.advance(30001);
  ttl.api.onNavigate('surveys', 'dashboard');
  await ticks();
  assert.equal(ttl.calls.length, 5, 'rota surveys só deve revalidar surveys');
  assert.equal(ttl.calls[4].name, 'admin_navigation_surveys_v1');
  assert.equal(ttl.api.overview().active_clients, 4, 'overview não deve ser descartado ao navegar');

  // Nenhuma escrita nos stores completos e nenhum fallback para carregar tudo.
  const isolated = makeEnvironment({ surveyRows: [surveyRow('isolated')] });
  isolated.context.SURVEYS = [{ id: 'full-store-sentinel' }];
  isolated.context.USERS = [{ id: 'users-sentinel' }];
  isolated.context.COLLECT_EVENTS = [{ id: 'events-sentinel' }];
  await isolated.api.ensure('surveys');
  assert.deepEqual(isolated.context.SURVEYS, [{ id: 'full-store-sentinel' }]);
  assert.deepEqual(isolated.context.USERS, [{ id: 'users-sentinel' }]);
  assert.deepEqual(isolated.context.COLLECT_EVENTS, [{ id: 'events-sentinel' }]);
  assert(isolated.calls.every((call) => call.name.startsWith('admin_navigation_')));
  assert(isolated.calls.every((call) => !Object.keys(call.args).some((key) => /question|option|audio|personal|pessoal/i.test(key))));

  // Validações: overview malformado e RPC ausente com orientação de deploy.
  for (const malformed of [
    overviewValue({ active_clients: -1 }),
    overviewValue({ daily_counts: [{ day: '29-10-2026', count: 1 }] }),
    overviewValue({ company_signed: 1 }),
  ]) {
    const malformedEnv = makeEnvironment({ overview: malformed });
    await malformedEnv.api.ensure('overview');
    assert.equal(malformedEnv.api.state('overview').status, 'error');
  }
  const missing = makeEnvironment({ overviewError: { code: 'PGRST202', message: 'Could not find the function' } });
  await missing.api.ensure('overview');
  assert.match(missing.api.state('overview').error, /navegacao-admin-leve-20261029\.sql/);

  // Limite atômico: página cheia na posição 10000 falha e não publica parcial.
  const capped = makeEnvironment({ surveyRows: Array.from({ length: 10000 }, (_, index) => surveyRow(`cap-${index}`)) });
  await capped.api.ensure('surveys');
  assert.equal(capped.api.state('surveys').status, 'error');
  assert.equal(capped.api.rows().length, 0);

  console.log('admin-navigation-data-smoke-test: PASS — RPCs leves, paginação >100, payload summaryOnly sem questões/opções/áudio/pessoal, overview/company_signed, pending_signups por role, sessão obsoleta, reset/abort, timeout, retry explícito, TTL por rota, dedup, isolamento de SURVEYS/USERS/COLLECT_EVENTS, validações, limite e PGRST202 verificados.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
