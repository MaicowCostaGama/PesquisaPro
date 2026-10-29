'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = __dirname;
const MODULE_PATH = path.join(ROOT, 'collection-withdrawals.js');
const APP_PATH = path.join(ROOT, 'app.js');
const HTML_PATH = path.join(ROOT, 'app.html');
const MODULE = fs.readFileSync(MODULE_PATH, 'utf8');
const APP = fs.readFileSync(APP_PATH, 'utf8');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';
const UUID_3 = '33333333-3333-4333-8333-333333333333';
const STARTED_AT = Date.parse('2026-10-29T14:00:00.000Z');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let index = 0; index < 8; index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

function makeRpcQuery(call) {
  const query = {
    abortSignal(signal) {
      call.signal = signal;
      signal.addEventListener('abort', () => {
        call.aborted = true;
        if (!call.settled) {
          call.settled = true;
          call.deferred.resolve({ data: null, error: { message: 'aborted' } });
        }
      }, { once: true });
      return query;
    },
    then(resolve, reject) {
      return call.deferred.promise.then(resolve, reject);
    },
  };
  return query;
}

function makeHistoryQuery(call) {
  const query = {
    select(fields) {
      call.select = fields;
      return query;
    },
    eq(field, value) {
      call.eq.push([field, value]);
      return query;
    },
    order(field, options) {
      call.order.push([field, options]);
      return query;
    },
    range(from, to) {
      call.range = [from, to];
      return query;
    },
    abortSignal(signal) {
      call.signal = signal;
      signal.addEventListener('abort', () => {
        call.aborted = true;
        if (!call.settled) {
          call.settled = true;
          call.deferred.resolve({ data: null, error: { message: 'aborted' } });
        }
      }, { once: true });
      return query;
    },
    then(resolve, reject) {
      return call.deferred.promise.then(resolve, reject);
    },
  };
  return query;
}

function makeEnvironment({
  profile = { id: 'researcher-1', role: 'pesq', status: 'ativo' },
  surveyId = UUID,
  startedAt = STARTED_AT,
  inProgress = true,
  submitting = false,
  selectedQuota = 'Quota A',
  answers = { q1: { value: 'partial answer' } },
  reasonValue = 'declined_continue',
  confirmValue = true,
} = {}) {
  const state = {
    alerts: [],
    confirmations: [],
    renders: { form: 0, recording: 0, action: 0 },
    resetRecording: 0,
    cancel: 0,
    calls: [],
    confirmValue,
    reasonElement: { value: reasonValue },
    messageElement: { innerHTML: '' },
    historyHosts: [],
  };

  const elements = {
    acollectWithdrawalReason: state.reasonElement,
    acollectMsg: state.messageElement,
  };

  const users = [
    { id: 'researcher-1', name: '<img src=x onerror=alert(1)> Pesquisador' },
    { id: 'staff-researcher', name: 'Pesquisador <Equipe>' },
  ];

  function resolveCall(call, value) {
    if (call.settled) return;
    call.settled = true;
    call.deferred.resolve(value);
  }

  function rejectCall(call, error) {
    if (call.settled) return;
    call.settled = true;
    call.deferred.reject(error);
  }

  const sb = {
    rpc(name, args) {
      const call = {
        kind: 'rpc',
        name,
        args,
        deferred: deferred(),
        signal: null,
        settled: false,
        aborted: false,
      };
      state.calls.push(call);
      const query = makeRpcQuery(call);
      call.resolve = value => resolveCall(call, value);
      call.reject = error => rejectCall(call, error);
      return query;
    },
    from(table) {
      const call = {
        kind: 'from',
        table,
        select: null,
        eq: [],
        order: [],
        range: null,
        deferred: deferred(),
        signal: null,
        settled: false,
        aborted: false,
      };
      state.calls.push(call);
      const query = makeHistoryQuery(call);
      call.resolve = value => resolveCall(call, value);
      call.reject = error => rejectCall(call, error);
      return query;
    },
  };

  const context = {
    console: { log() {}, warn() {}, error() {} },
    Promise,
    Date,
    Error,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    AbortController,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    CURRENT_PROFILE: profile,
    APP_DATA_SESSION_EPOCH: 0,
    ACOLLECT_SURVEY_ID: surveyId,
    ACOLLECT_STARTED_AT: startedAt,
    ACOLLECT_IN_PROGRESS: inProgress,
    ACOLLECT_SUBMITTING: submitting,
    ACOLLECT_SELECTED_QUOTA: selectedQuota,
    ACOLLECT_ANSWERS: answers,
    sb,
    USERS: users,
    document: {
      getElementById(id) {
        return elements[id] || null;
      },
    },
    alert(message) {
      state.alerts.push(String(message));
    },
    confirm(message) {
      state.confirmations.push(String(message));
      return state.confirmValue;
    },
    crypto: { randomUUID: () => UUID_3 },
    acollectResetRecordingState() {
      state.resetRecording += 1;
    },
    renderAcollectForm() {
      state.renders.form += 1;
    },
    renderAcollectRecording() {
      state.renders.recording += 1;
    },
    renderAcollectActionState() {
      state.renders.action += 1;
    },
    acollectCancel() {
      state.cancel += 1;
      context.ACOLLECT_IN_PROGRESS = false;
      context.ACOLLECT_STARTED_AT = null;
      context.ACOLLECT_ANSWERS = {};
    },
    window: null,
    globalThis: null,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(MODULE, context, { filename: 'collection-withdrawals.js' });

  function hostAndButton() {
    const list = { innerHTML: '' };
    const host = {
      isConnected: true,
      querySelector(selector) {
        return selector === '.withdrawal-history-list' ? list : null;
      },
    };
    const button = {
      disabled: false,
      closest(selector) {
        return selector === '.withdrawal-history' ? host : null;
      },
    };
    state.historyHosts.push({ host, list, button });
    return { host, list, button };
  }

  return {
    context,
    api: context.window.PP_COLLECTION_WITHDRAWALS,
    state,
    users,
    hostAndButton,
    calls: state.calls,
  };
}

function rpcCalls(env) {
  return env.calls.filter(call => call.kind === 'rpc');
}

function historyCalls(env) {
  return env.calls.filter(call => call.kind === 'from');
}

async function testPublicApiAndModuleSafety() {
  const env = makeEnvironment();
  assert.deepEqual(Object.keys(env.api).sort(), [
    'active', 'busy', 'canLeave', 'controls', 'historyMarkup', 'loadHistory', 'quickControl', 'reasonChanged', 'renderPending', 'request', 'reset', 'save',
  ].sort(), 'UMD deve expor somente a API pública do contrato');
  assert.equal(typeof env.api.active(), 'boolean');
  assert.equal(typeof env.api.busy(), 'boolean');
  assert.equal(env.api.active(), false);
  assert.equal(env.api.busy(), false);
  assert.equal(env.api.controls().includes('acollectWithdrawalReason'), true);
  assert.equal(env.api.controls().includes('Registrar desistência'), true);

  for (const token of [
    "register_collection_withdrawal",
    'p_survey_id',
    'p_client_request_id',
    'p_started_at',
    'p_quota_label',
    'p_reason_code',
    'TIMEOUT_MS=15000',
    'abortSignal',
    'APP_DATA_SESSION_EPOCH',
    'generation',
  ]) {
    assert.ok(MODULE.includes(token), `módulo sem contrato: ${token}`);
  }
  assert.equal((MODULE.match(/sb\.rpc\(/g) || []).length, 1, 'desistência deve ter somente a RPC neutra de registro');
  const fromTables = [...MODULE.matchAll(/sb\.from\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  assert.deepEqual(fromTables, ['collection_withdrawals'], 'a única leitura permitida é o histórico explícito separado');
  for (const forbidden of [
    'collection_events',
    'collection_answers',
    'payments',
    'COLLECT_EVENTS',
    'invalidate',
    'metric',
    'localStorage',
    'sessionStorage',
    'getUserMedia',
    'MediaRecorder',
    'GEO',
    'recording_required',
    'acollectSubmit',
  ]) {
    assert.equal(MODULE.includes(forbidden), false, `módulo não pode depender de ${forbidden}`);
  }
}

async function testPreconditionsAndConfirmationCancel() {
  const invalidReason = makeEnvironment({ reasonValue: 'not-an-enum' });
  await invalidReason.api.request();
  assert.equal(rpcCalls(invalidReason).length, 0);
  assert.equal(invalidReason.state.confirmations.length, 0, 'motivo inválido deve ser recusado antes da confirmação');
  assert.match(invalidReason.state.alerts[0], /motivo válido/i);
  assert.equal(invalidReason.api.active(), false);

  const canceled = makeEnvironment({ confirmValue: false });
  const beforeAnswers = canceled.context.ACOLLECT_ANSWERS;
  await canceled.api.request();
  assert.equal(canceled.state.confirmations.length, 1);
  assert.equal(rpcCalls(canceled).length, 0, 'cancelar a confirmação não grava RPC');
  assert.equal(canceled.api.active(), false);
  assert.equal(canceled.context.ACOLLECT_IN_PROGRESS, true, 'cancelar confirmação preserva entrevista');
  assert.strictEqual(canceled.context.ACOLLECT_ANSWERS, beforeAnswers, 'cancelar confirmação preserva respostas parciais');
  assert.equal(canceled.state.resetRecording, 0, 'cancelar confirmação não toca no áudio');
  assert.equal(canceled.state.cancel, 0, 'cancelar confirmação não chama acollectCancel');

  const cases = [
    { profile: null, label: 'sem perfil' },
    { profile: { id: 'p', role: 'admin', status: 'ativo' }, label: 'perfil não pesq' },
    { profile: { id: 'p', role: 'pesq', status: 'encerrado' }, label: 'pesq inativo' },
    { inProgress: false, label: 'sem entrevista' },
    { submitting: true, label: 'entrevista enviando' },
    { surveyId: 'not-a-uuid', label: 'pesquisa inválida' },
    { startedAt: null, label: 'início ausente' },
  ];
  for (const options of cases) {
    const env = makeEnvironment(options);
    await env.api.request();
    assert.equal(rpcCalls(env).length, 0, `${options.label} não pode chamar RPC`);
    assert.equal(env.state.confirmations.length, 0, `${options.label} não pode abrir confirmação`);
    assert.equal(env.api.active(), false, `${options.label} não pode criar pendência`);
  }
}

async function testRequestPayloadBusyAndSuccess() {
  const env = makeEnvironment({ reasonValue: 'no_time', selectedQuota: 'Cota <A>' });
  const requestPromise = env.api.request();
  await flush();
  assert.equal(rpcCalls(env).length, 1, 'request deve chamar uma única RPC');
  const call = rpcCalls(env)[0];
  assert.equal(call.name, 'register_collection_withdrawal');
  assert.deepEqual(JSON.parse(JSON.stringify(call.args)), {
    p_survey_id: UUID,
    p_client_request_id: UUID_3,
    p_started_at: new Date(STARTED_AT).toISOString(),
    p_quota_label: 'Cota <A>',
    p_reason_code: 'no_time',
  });
  assert.equal(env.api.active(), true, 'pending withdrawal fica ativo durante o save');
  assert.equal(env.api.busy(), true, 'busy bloqueia novo clique enquanto a RPC está pendente');
  assert.deepEqual(JSON.parse(JSON.stringify(env.context.ACOLLECT_ANSWERS)), {}, 'respostas parciais ficam somente em memória e são limpas antes da RPC');
  assert.equal(env.context.ACOLLECT_IN_PROGRESS, true, 'entrevista continua ativa até confirmação do save');
  assert.equal(env.state.resetRecording, 1, 'áudio local é descartado ao confirmar a desistência');
  assert.equal(call.signal instanceof AbortSignal, true, 'RPC recebe sinal abortável');
  assert.match(env.state.confirmations[0], /sem contar como coleta/i);

  call.resolve({ data: UUID_3, error: null });
  await requestPromise;
  assert.equal(env.api.active(), false);
  assert.equal(env.api.busy(), false);
  assert.equal(env.state.cancel, 1, 'somente o sucesso chama acollectCancel');
  assert.equal(env.context.ACOLLECT_IN_PROGRESS, false);
  assert.equal(env.state.alerts.filter(message => /registrada/i.test(message)).length, 1);
  assert.match(env.state.messageElement.innerHTML, /Sem impacto/);
  assert.equal(historyCalls(env).length, 0, 'sucesso não consulta histórico automaticamente');
  assert.equal(rpcCalls(env).length, 1, 'sucesso não faz gravação oficial adicional');
  assert.equal(env.api.renderPending(), '', 'pendência some após confirmação do servidor');
}

async function testDoubleClickAndSameUuidRetry() {
  const env = makeEnvironment({ reasonValue: 'uncomfortable' });
  const first = env.api.request();
  await flush();
  const second = env.api.request();
  await second;
  assert.equal(rpcCalls(env).length, 1, 'duplo clique não pode abrir duas RPCs');
  assert.equal(env.state.confirmations.length, 1, 'duplo clique não pode abrir duas confirmações');
  const call = rpcCalls(env)[0];
  const firstArgs = JSON.parse(JSON.stringify(call.args));
  call.resolve({ data: null, error: { message: 'network-secret <not rendered>' } });
  await first;
  assert.equal(env.api.active(), true, 'falha mantém a desistência pendente');
  assert.equal(env.api.busy(), false, 'falha libera o botão de retry');
  assert.equal(env.api.renderPending().includes('Tentar registrar novamente'), true);
  assert.equal(env.api.renderPending().includes('network-secret'), false, 'erro bruto do servidor não deve vazar para HTML');

  const retry = env.api.save();
  await flush();
  assert.equal(rpcCalls(env).length, 2, 'retry deve tentar a mesma operação');
  const retryCall = rpcCalls(env)[1];
  assert.deepEqual(JSON.parse(JSON.stringify(retryCall.args)), firstArgs, 'retry mantém exatamente o mesmo payload e client request UUID');
  assert.equal(env.api.busy(), true);
  retryCall.resolve({ data: UUID_3, error: null });
  await retry;
  assert.equal(env.api.active(), false);
  assert.equal(env.state.cancel, 1);
}

async function testLateAckCannotClearNewInterview() {
  const env = makeEnvironment();
  const oldRequest = env.api.request();
  await flush();
  const oldCall = rpcCalls(env)[0];
  assert.ok(oldCall.signal);

  env.api.reset();
  env.context.ACOLLECT_SURVEY_ID = UUID_2;
  env.context.ACOLLECT_STARTED_AT = STARTED_AT + 3600000;
  env.context.ACOLLECT_IN_PROGRESS = true;
  env.context.ACOLLECT_ANSWERS = { newQuestion: { value: 'new interview' } };
  oldCall.resolve({ data: UUID_3, error: null });
  await oldRequest;

  assert.equal(oldCall.aborted, true, 'reset deve abortar a solicitação antiga');
  assert.equal(env.api.active(), false, 'reset invalida o estado antigo');
  assert.equal(env.state.cancel, 0, 'ack tardio não pode cancelar a nova entrevista');
  assert.equal(env.context.ACOLLECT_IN_PROGRESS, true, 'ack tardio não pode limpar entrevista nova');
  assert.deepEqual(env.context.ACOLLECT_ANSWERS, { newQuestion: { value: 'new interview' } });
  assert.equal(env.state.alerts.some(message => /registrada/i.test(message)), false);

  const staleProfile = makeEnvironment();
  const staleRequest = staleProfile.api.request();
  await flush();
  const staleCall = rpcCalls(staleProfile)[0];
  staleProfile.context.CURRENT_PROFILE = { id: 'different-profile', role: 'pesq', status: 'ativo' };
  staleProfile.context.APP_DATA_SESSION_EPOCH += 1;
  staleCall.resolve({ data: UUID_3, error: null });
  await staleRequest;
  assert.equal(staleProfile.state.cancel, 0, 'resposta de outro perfil/epoch deve ser ignorada');
  assert.equal(staleProfile.state.alerts.some(message => /registrada/i.test(message)), false);
  staleProfile.api.reset();
  assert.equal(staleProfile.api.active(), false);
}

function historyRow(overrides = {}) {
  return {
    id: UUID_3,
    survey_id: UUID,
    researcher_id: 'staff-researcher',
    registered_at: '2026-10-29T15:30:00.000Z',
    started_at: '2026-10-29T15:00:00.000Z',
    quota_label: '<img src=x onerror=alert(1)>',
    reason_code: 'other',
    is_test: true,
    ...overrides,
  };
}

async function testHistoryIsExplicitPaginatedAndEscaped() {
  const own = makeEnvironment();
  const ownMarkup = own.api.historyMarkup('own', null);
  assert.match(ownMarkup, /^<details/);
  assert.match(ownMarkup, /withdrawal-history-list/);
  assert.match(ownMarkup, /loadHistory\(this,'own',null\)/);
  assert.equal(historyCalls(own).length, 0, 'historyMarkup não pode consultar automaticamente');

  const ownDom = own.hostAndButton();
  const ownLoad = own.api.loadHistory(ownDom.button, 'own', null);
  await flush();
  assert.equal(historyCalls(own).length, 1);
  const ownCall = historyCalls(own)[0];
  assert.equal(ownCall.select, 'id,survey_id,researcher_id,registered_at,started_at,quota_label,reason_code,is_test');
  assert.deepEqual(ownCall.eq, [['researcher_id', 'researcher-1']], 'histórico próprio usa o id da sessão');
  assert.deepEqual(JSON.parse(JSON.stringify(ownCall.order)), [
    ['registered_at', { ascending: false }],
    ['id', { ascending: false }],
  ]);
  assert.deepEqual(ownCall.range, [0, 6], 'histórico próprio usa páginas de seis');
  assert.equal(ownCall.signal instanceof AbortSignal, true);
  ownCall.resolve({ data: Array.from({ length: 7 }, (_, index) => historyRow({ id: `${UUID_3.slice(0, -1)}${index}` })), error: null });
  await ownLoad;
  assert.equal(ownDom.button.disabled, false);
  assert.match(ownDom.list.innerHTML, /Sua entrevista interrompida/);
  assert.match(ownDom.list.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(ownDom.list.innerHTML, /Tentar|Próximos/);
  assert.match(ownDom.list.innerHTML, /Teste autorizado/);
  assert.doesNotMatch(ownDom.list.innerHTML, /<img src=x/);

  const staff = makeEnvironment({ profile: { id: 'staff-1', role: 'coord', status: 'ativo' } });
  const staffMarkup = staff.api.historyMarkup('staff', UUID);
  assert.match(staffMarkup, /^<details/);
  assert.match(staffMarkup, /loadHistory\(this,'staff','11111111-1111-4111-8111-111111111111'\)/);
  assert.equal(historyCalls(staff).length, 0, 'histórico staff também é explícito');
  const staffDom = staff.hostAndButton();
  const staffLoad = staff.api.loadHistory(staffDom.button, 'staff', UUID);
  await flush();
  const staffCall = historyCalls(staff)[0];
  assert.equal(staffCall.select, 'id,survey_id,researcher_id,registered_at,started_at,quota_label,reason_code,is_test');
  assert.deepEqual(staffCall.eq, [['survey_id', UUID]], 'histórico staff fica neutro e filtra somente a pesquisa');
  assert.equal(staffCall.eq.some(([field]) => field === 'researcher_id'), false);
  assert.deepEqual(staffCall.range, [0, 20], 'histórico staff usa páginas de vinte');
  staffCall.resolve({ data: Array.from({ length: 21 }, (_, index) => historyRow({ id: UUID_3, researcher_id: 'staff-researcher', quota_label: `Q${index}` })), error: null });
  await staffLoad;
  assert.match(staffDom.list.innerHTML, /Pesquisador &lt;Equipe&gt;/);
  assert.match(staffDom.list.innerHTML, /Próximos/);
  assert.doesNotMatch(staffDom.list.innerHTML, /<img/);

  const stale = makeEnvironment();
  const staleDom = stale.hostAndButton();
  const staleLoad = stale.api.loadHistory(staleDom.button, 'own', null);
  await flush();
  const staleCall = historyCalls(stale)[0];
  stale.context.CURRENT_PROFILE = { id: 'new-profile', role: 'pesq', status: 'ativo' };
  stale.context.APP_DATA_SESSION_EPOCH += 1;
  staleCall.resolve({ data: [historyRow()], error: null });
  await staleLoad;
  assert.equal(staleDom.list.innerHTML.includes('Pesquisador'), false, 'resposta de história antiga não pode renderizar em nova sessão');
  stale.api.reset();
}

function appSection(start, end) {
  const from = APP.indexOf(start);
  assert.ok(from >= 0, `app sem seção ${start}`);
  const to = APP.indexOf(end, from + start.length);
  assert.ok(to > from, `app sem fim de seção ${end}`);
  return APP.slice(from, to);
}

async function testRealSubmitGuardAgainstWithdrawalRace() {
  let location = deferred();
  const calls = [];
  const withdrawal = { active: () => false };
  const context = {
    console: { warn() {}, error() {} },
    Promise,
    Date,
    Error,
    Number,
    String,
    Object,
    Array,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    window: { PP_COLLECTION_WITHDRAWALS: withdrawal },
    alert() { calls.push({ kind: 'alert' }); },
    sb: {
      from(table) {
        calls.push({ kind: 'from', table });
        return {
          insert(payload) {
            calls.push({ kind: 'insert', table, payload });
            return {
              select() { return this; },
              single() { return Promise.resolve({ data: { id: UUID_3 }, error: null }); },
            };
          },
        };
      },
    },
    GEO: { status: 'granted' },
    CURRENT_PROFILE: { id: 'researcher-1', role: 'pesq', status: 'ativo' },
    APP_DATA_SESSION_EPOCH: 1,
    ACOLLECT_IN_PROGRESS: true,
    ACOLLECT_SUBMITTING: false,
    ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF: false,
    ACOLLECT_RECORDING_REQUIRED: false,
    ACOLLECT_RECORDING_FEATURE_AVAILABLE: false,
    ACOLLECT_RECORDING_STATUS: 'not_selected',
    ACOLLECT_RECORDING_CONSENT: null,
    ACOLLECT_STARTED_AT: STARTED_AT,
    ACOLLECT_SURVEY_ID: UUID,
    ACOLLECT_SELECTED_QUOTA: 'Quota A',
    ACOLLECT_RECORDING_BLOB: null,
    acollectIsAfterRecordingCutoff: () => false,
    acollectMissingRequired: () => [],
    acollectValidateLocation: () => location.promise,
    renderAcollectRecording() { calls.push({ kind: 'render-recording' }); },
    renderAcollectActionState() { calls.push({ kind: 'render-action' }); },
    acollectIntegrityMessage(message) { calls.push({ kind: 'integrity', message }); },
  };
  vm.createContext(context);
  vm.runInContext(appSection('async function acollectSubmit(){', 'function requestGeo()'), context, { filename: 'app.js#acollectSubmit' });

  const submit = vm.runInContext('acollectSubmit()', context);
  await flush();
  assert.equal(context.ACOLLECT_SUBMITTING, false, 'o envio não deve marcar submitting antes da validação');
  withdrawal.active = () => true;
  location.resolve({ ok: true, place: { city: 'São Paulo', state: 'SP' } });
  await submit;
  assert.equal(calls.some(call => call.kind === 'from' || call.kind === 'insert'), false, 'desistência que surge durante a validação deve impedir escrita oficial');
  assert.equal(context.ACOLLECT_SUBMITTING, false);

  withdrawal.active = () => false;
  for (const change of [
    () => { context.ACOLLECT_STARTED_AT += 1000; },
    () => { context.APP_DATA_SESSION_EPOCH += 1; },
    () => { context.CURRENT_PROFILE = { ...context.CURRENT_PROFILE }; },
    () => { context.ACOLLECT_SURVEY_ID = UUID_2; },
    () => { context.ACOLLECT_SUBMITTING = true; },
  ]) {
    context.ACOLLECT_SUBMITTING = false;
    location = deferred();
    const lateSubmit = vm.runInContext('acollectSubmit()', context);
    await flush();
    change();
    location.resolve({ ok: true });
    await lateSubmit;
    assert.equal(calls.some(call => call.kind === 'from' || call.kind === 'insert'), false, 'GPS antigo não pode enviar outra entrevista, outra sessão ou duplicar envio');
  }
}

async function testRecordingDiscardAndLatePermission() {
  const resetCode = appSection('function acollectResetRecordingState(){', 'function acollectRecordingMime()');
  const resetContext = { URL: { revokeObjectURL() {} }, clearTimeout };
  for (const name of new Set(resetCode.match(/ACOLLECT_RECORDING_[A-Z_]+/g))) resetContext[name] = null;
  let stopped = 0;
  const recorder = { state: 'recording', ondataavailable() {}, onstop() {}, onerror() {}, stop() { stopped++; } };
  resetContext.ACOLLECT_RECORDING_RECORDER = recorder;
  resetContext.ACOLLECT_RECORDING_STREAM = { getTracks: () => [{ stop() { stopped++; } }] };
  vm.createContext(resetContext);vm.runInContext(resetCode, resetContext);
  vm.runInContext('acollectResetRecordingState()', resetContext);
  assert.equal(stopped, 2);
  assert.equal(recorder.ondataavailable, null);assert.equal(recorder.onstop, null);assert.equal(recorder.onerror, null);
  assert.equal(resetContext.ACOLLECT_RECORDING_BLOB, null);

  const startCode = appSection('async function acollectRecordingStart(){', 'function acollectRecordingStopTracks()');
  for (const mode of ['withdrawal', 'new-interview', 'new-profile', 'ended']) {
    const permission = deferred();let tracksStopped = 0;
    const withdrawal = { active: () => false };
    const context = { window: { isSecureContext: true, PP_COLLECTION_WITHDRAWALS: withdrawal },
      CURRENT_PROFILE: { id: 'pesq' }, ACOLLECT_IN_PROGRESS: true, ACOLLECT_STARTED_AT: STARTED_AT,
      ACOLLECT_RECORDING_CONSENT: true, ACOLLECT_RECORDING_STATUS: 'awaiting_consent',
      navigator: { mediaDevices: { getUserMedia: () => permission.promise } },
      MediaRecorder: function() { throw new Error('Não pode iniciar gravação obsoleta'); },
      acollectRecordingMime: () => 'audio/webm',
    };
    vm.createContext(context);vm.runInContext(startCode, context);
    const recording = vm.runInContext('acollectRecordingStart()', context);
    if (mode === 'withdrawal') withdrawal.active = () => true;
    if (mode === 'new-interview') context.ACOLLECT_STARTED_AT++;
    if (mode === 'new-profile') context.CURRENT_PROFILE = { id: 'outro' };
    if (mode === 'ended') context.ACOLLECT_IN_PROGRESS = false;
    permission.resolve({ getTracks: () => [{ stop() { tracksStopped++; } }] });
    await recording;
    assert.equal(tracksStopped, 1, 'permissão tardia deve parar o microfone sem gravar');
  }
}

function testStaticAppIntegration() {
  const scriptTags = [...HTML.matchAll(/<script[^>]+src=["'][^"']+["'][^>]*>/g)].map(match => ({ index: match.index, tag: match[0] }));
  const moduleTag = scriptTags.find(item => /collection-withdrawals\.js/.test(item.tag));
  const appTag = scriptTags.find(item => /(?:^|["'\/])app\.js(?:\?|["'])/.test(item.tag));
  assert.ok(moduleTag, 'app.html deve carregar collection-withdrawals.js');
  assert.ok(appTag, 'app.html deve carregar app.js');
  assert.ok(appTag.index > moduleTag.index, 'collection-withdrawals.js deve ser carregado antes de app.js');

  const reset = appSection('function resetSessionPanelData(){', 'function researcherUpdateVersionFromHtml');
  assert.match(reset, /APP_DATA_SESSION_EPOCH\+\+/);
  assert.match(reset, /PP_COLLECTION_WITHDRAWALS\?\.reset\(\)/, 'reset de sessão deve invalidar a desistência pendente');

  const start = appSection('async function acollectStart(){', 'function acollectCancel()');
  const submit = appSection('async function acollectSubmit(){', 'function requestGeo()');
  const form = appSection('function renderAcollectForm(){', 'function acollectStartTicking()');
  const recording = appSection('function renderAcollectRecording(){', 'function acollectRecordingConsentChanged');
  const actions = appSection('function renderAcollectActionState(){', '/* antes de começar a entrevista');
  for (const [name, section] of [['start', start], ['submit', submit], ['form', form], ['recording', recording], ['actions', actions]]) {
    assert.match(section, /PP_COLLECTION_WITHDRAWALS/, `${name} deve integrar a desistência`);
  }
  assert.match(start, /PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'início deve ser bloqueado enquanto houver desistência pendente');
  assert.match(submit, /PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'envio deve ser bloqueado enquanto houver desistência pendente');
  assert.match(submit, /await acollectValidateLocation\(\)[\s\S]*PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'envio deve revalidar a desistência depois da validação assíncrona');
  assert.match(form, /renderPending\(\)|PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'formulário deve mostrar/bloquear o estado pendente');
  assert.match(recording, /PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'gravação deve ser bloqueada durante a desistência');
  assert.match(actions, /PP_COLLECTION_WITHDRAWALS[^\n]*active\(\)/, 'ações devem ficar bloqueadas durante a desistência');

  assert.match(APP, /PP_COLLECTION_WITHDRAWALS\.controls\(\)|PP_COLLECTION_WITHDRAWALS[^\n]*controls/, 'controle de desistência deve aparecer na tela de coleta');
  assert.match(APP, /historyMarkup\(['"]own['"]|PP_COLLECTION_WITHDRAWALS[^\n]*historyMarkup/, 'histórico próprio deve ser integrado como detalhes explícitos');
  assert.match(APP, /historyMarkup\(['"]staff['"]|PP_COLLECTION_WITHDRAWALS[^\n]*historyMarkup/, 'histórico staff deve ser integrado separadamente');

  const normalSubmit = submit;
  for (const token of [
    'acollectIsAfterRecordingCutoff()',
    'ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF',
    'Após 21h',
    'acollectValidateLocation()',
    'acollectMissingRequired()',
  ]) {
    assert.ok(normalSubmit.includes(token), `regra normal de envio ausente: ${token}`);
  }
  assert.ok(APP.includes('const ACOLLECT_RECORDING_CUTOFF_HOUR=21'), 'regra normal após 21h deve permanecer no app');
  assert.ok(!MODULE.includes('ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF'), 'desistência não pode alterar a regra de áudio após 21h');

  assert.match(APP, /acollectBuildAnswerRows\(eventId\)/, 'fluxo normal de respostas deve permanecer intacto');
  assert.match(APP, /collection_answers/, 'fluxo normal deve continuar salvando respostas quando há envio oficial');
}

(async () => {
  await testPublicApiAndModuleSafety();
  await testPreconditionsAndConfirmationCancel();
  await testRequestPayloadBusyAndSuccess();
  await testDoubleClickAndSameUuidRetry();
  await testLateAckCannotClearNewInterview();
  await testHistoryIsExplicitPaginatedAndEscaped();
  await testRealSubmitGuardAgainstWithdrawalRace();
  await testRecordingDiscardAndLatePermission();
  testStaticAppIntegration();
  console.log('collection-withdrawals-smoke-test: PASS — desistência neutra, confirmação, UUID idempotente, retry, abort/session epoch, histórico explícito/RLS, escape HTML e integração da coleta verificados.');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
