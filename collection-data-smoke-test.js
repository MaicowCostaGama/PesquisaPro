'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'collection-data.js'), 'utf8');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function makeQuery(call, response, pending = false) {
  const wait = deferred();
  const query = {
    _call: call,
    _signal: null,
    select(fields) { call.select = fields; return query; },
    eq(field, value) { (call.eq ||= []).push([field, value]); return query; },
    neq(field, value) { (call.neq ||= []).push([field, value]); return query; },
    not(field, operator, value) { (call.not ||= []).push([field, operator, value]); return query; },
    order(field, options) { (call.order ||= []).push([field, options]); return query; },
    limit(value) { call.limit = value; return query; },
    range(from, to) { call.range = [from, to]; return query; },
    single() { call.single = true; return query; },
    abortSignal(signal) {
      call.abortSignal = signal;
      query._signal = signal;
      if (pending) signal.addEventListener('abort', () => wait.resolve({ data: null, error: { message: 'aborted' } }), { once: true });
      return query;
    },
    then(resolve, reject) { return wait.promise.then(resolve, reject); },
  };
  if (!pending) queueMicrotask(() => wait.resolve(response));
  call.finish = value => wait.resolve(value);
  call.reject = error => wait.reject(error);
  return query;
}

function makeEnvironment({ profile = { id: 'p1', role: 'pesq', status: 'ativo' }, surveyRows = [], surveyResponses = {}, indexRows = [], previousRows = [], recentRows = [], quotaRows = [], pendingTables = new Set(), fakeTimers = false } = {}) {
  const calls = [];
  const optionsCalls = [];
  const callbacks = [];
  const timers = [];
  const indexRowsCopy = indexRows.slice();
  const state = { profile, surveyResponses, previousRows, recentRows, quotaRows, pendingTables };

  function responseFor(table, call) {
    if (table === 'surveys' && call.range) {
      const [from, to] = call.range;
      return { data: indexRowsCopy.slice(from, to + 1), error: null };
    }
    if (table === 'surveys' && call.single) {
      return state.surveyResponses[call.id] || { data: null, error: { message: 'survey not found' } };
    }
    if (table === 'collection_events' && call.limit === 1) return state.previousRows instanceof Error
      ? { data: null, error: state.previousRows }
      : { data: state.previousRows, error: null };
    if (table === 'collection_events' && call.limit === 6) return { data: state.recentRows, error: null };
    return { data: [], error: null };
  }

  const client = {
    from(table) {
      const call = { table };
      calls.push(call);
      const response = responseFor(table, call);
      const query = makeQuery(call, response, state.pendingTables.has(table) || table === 'surveys' || table === 'collection_events');
      if (table === 'surveys') {
        const oldSelect = query.select;
        query.select = fields => {
          oldSelect(fields);
          if (call.single) {
            const match = state.surveyResponses[call.id];
            if (match) query._call.finish(match);
          }
          return query;
        };
        const oldEq = query.eq;
        query.eq = (field, value) => {
          oldEq(field, value);
          if (field === 'id') {
            call.id = value;
            if (call.single) {
              const match = state.surveyResponses[value];
              queueMicrotask(() => call.finish(match || { data: null, error: { message: 'survey not found' } }));
            }
          }
          return query;
        };
        const oldSingle = query.single;
        query.single = () => {
          oldSingle();
          const match = state.surveyResponses[call.id];
          queueMicrotask(() => call.finish(match || { data: null, error: { message: 'survey not found' } }));
          return query;
        };
        const oldRange = query.range;
        query.range = (from, to) => {
          oldRange(from, to);
          queueMicrotask(() => call.finish(responseFor(table, call)));
          return query;
        };
      }
      if (table === 'collection_events') {
        const oldLimit = query.limit;
        query.limit = value => {
          oldLimit(value);
          queueMicrotask(() => call.finish(responseFor(table, call)));
          return query;
        };
      }
      return query;
    },
    rpc(name, args) {
      const call = { table: `rpc:${name}`, name, args };
      calls.push(call);
      const response = name === 'survey_quota_counts'
        ? (state.quotaRows instanceof Error ? { data: null, error: state.quotaRows } : { data: state.quotaRows, error: null })
        : { data: [], error: null };
      return makeQuery(call, response, state.pendingTables.has(`rpc:${name}`));
    },
  };

  const context = {
    console,
    Promise,
    Date,
    Error,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    JSON,
    AbortController,
    setTimeout: fakeTimers ? (callback, ms) => {
      const timer = { callback, ms, cleared: false };
      timers.push(timer);
      return timer;
    } : setTimeout,
    clearTimeout: fakeTimers ? timer => { if (timer) timer.cleared = true; } : clearTimeout,
    queueMicrotask,
    CURRENT_PROFILE: profile,
    PP_SUPABASE_CLIENT: client,
    SURVEY_JOIN_SELECT: 'FULL_JOIN_SELECT',
    SURVEY_JOIN_SELECT_LEGACY: 'LEGACY_JOIN_SELECT',
    isCollectionTestUser: p => p?.is_collection_test_user === true,
    surveyRowToSnapshot(row, questionRows) {
      return {
        id: row.id,
        name: row.name,
        tipo: row.tipo || '',
        status: row.status,
        archivedAt: row.archived_at || null,
        formStarted: row.form_started === true,
        questions: questionRows,
        teamIds: (row.survey_team || []).map(item => item.researcher_id),
      };
    },
    async loadSurveyQuestionOptions(questionRows, { signal } = {}) {
      optionsCalls.push({ ids: questionRows.map(row => row.id), signal });
      return new Map(questionRows.map(row => [String(row.id), [{ question_id: row.id, label: `Opção ${row.id}` }]]));
    },
    attachSurveyQuestionOptions(rows, byQuestion) {
      rows.forEach(row => (row.survey_questions || []).forEach(question => {
        question.survey_question_options = byQuestion.get(String(question.id)) || [];
      }));
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'collection-data.js' });
  context.api = context.PP_COLLECTION_DATA;
  context.api.setOnChange((name, id) => callbacks.push([name, id]));
  return { context, api: context.api, calls, optionsCalls, callbacks, state, timers };
}

function indexRow(id, overrides = {}) {
  return {
    id,
    name: `Pesquisa ${id}`,
    tipo: 'Opinião',
    status: 'campo',
    form_started: true,
    archived_at: null,
    survey_team: [{ researcher_id: 'p1' }],
    ...overrides,
  };
}

async function selectedSurveyAndCacheTest() {
  const row = {
    id: 's1',
    name: 'Pesquisa selecionada',
    tipo: 'Opinião',
    status: 'campo',
    form_started: true,
    archived_at: null,
    survey_team: [{ researcher_id: 'p1' }],
    survey_questions: [
      { id: 'q1', position: 2, text: 'Dois' },
      { id: 'q0', position: 1, text: 'Um' },
    ],
  };
  const env = makeEnvironment({ surveyResponses: { s1: { data: row, error: null } } });
  const first = env.api.loadSurvey('s1');
  const second = env.api.loadSurvey('s1');
  assert.strictEqual(first, second, 'loadSurvey deve deduplicar o mesmo recurso/id');
  const snapshot = await first;
  assert.equal(snapshot.id, 's1');
  assert.deepEqual(snapshot.questions.map(q => q.id), ['q0', 'q1'], 'perguntas devem respeitar position');
  assert.deepEqual(env.optionsCalls.map(item => item.ids), [['q0', 'q1']], 'opções devem ser solicitadas somente para a pesquisa selecionada');
  assert.equal(env.calls.filter(call => call.table === 'surveys').length, 1, 'dedup não pode consultar duas vezes');
  assert.equal(env.calls[0].select, 'FULL_JOIN_SELECT');
  assert.equal(env.api.survey('s1').questions[0].survey_question_options[0].label, 'Opção q0');
  assert.equal(env.api.state('survey', 's1').status, 'ready');
  await env.api.loadSurvey('s1');
  assert.equal(env.calls.filter(call => call.table === 'surveys').length, 1, 'snapshot pronto dentro do TTL deve ser reutilizado');
  assert.deepEqual(env.callbacks, [['survey', 's1'], ['survey', 's1']], 'callbacks devem identificar o início e a conclusão do recurso carregado');
}

async function indexPaginationAndAuthorizationTest() {
  const rows = [
    indexRow('mine'),
    indexRow('other', { survey_team: [{ researcher_id: 'p-other' }] }),
    indexRow('archived', { archived_at: '2026-01-01T00:00:00Z' }),
    indexRow('draft', { status: 'rascunho' }),
    ...Array.from({ length: 497 }, (_, index) => indexRow(`extra-${index}`)),
    indexRow('last'),
  ];
  const env = makeEnvironment({ indexRows: rows });
  await env.api.ensureIndex();
  const visible = env.api.surveys();
  assert.equal(visible.length, 499, 'índice deve paginar em lotes de 500 e filtrar o que não é da equipe');
  assert.ok(visible.some(row => row.id === 'mine'));
  assert.ok(visible.some(row => row.id === 'last'));
  assert.ok(!visible.some(row => ['other', 'archived', 'draft'].includes(row.id)));
  assert.deepEqual(Object.keys(visible[0]).sort(), ['archivedAt', 'formStarted', 'id', 'name', 'status', 'teamIds', 'tipo'].sort());
  const indexCalls = env.calls.filter(call => call.table === 'surveys');
  assert.equal(indexCalls.length, 2, '501 linhas devem gerar duas páginas');
  assert.deepEqual(indexCalls.map(call => call.range), [[0, 499], [500, 999]]);
  assert.equal(indexCalls[0].select, 'id,name,tipo,status,form_started,archived_at,survey_team(researcher_id)');
}

async function testUserIndexTest() {
  const testProfile = { id: 'test', role: 'pesq', status: 'ativo', is_collection_test_user: true };
  const env = makeEnvironment({
    profile: testProfile,
    indexRows: [
      indexRow('draft-test', { status: 'rascunho', survey_team: [] }),
      indexRow('field-test', { status: 'campo', survey_team: [] }),
      indexRow('closed', { status: 'encerrada', survey_team: [] }),
      indexRow('not-started', { status: 'campo', form_started: false, survey_team: [] }),
    ],
  });
  await env.api.ensureIndex();
  assert.equal(Array.from(env.api.surveys(), row => row.id).join(','), 'draft-test,field-test');
}

async function historyAndQuotasTest() {
  const env = makeEnvironment({
    previousRows: [{ id: 'e1', survey_id: 's1', researcher_id: 'p1', status: 'valid', lat: '-20.1', lng: '-44.2', occurred_at: '2026-10-23T12:00:00Z' }],
    recentRows: Array.from({ length: 8 }, (_, index) => ({
      id: `e${index + 1}`, survey_id: `s${index + 1}`, researcher_id: 'p1', quota_label: `Cota ${index + 1}`,
      occurred_at: `2026-10-23T${String(12 - index).padStart(2, '0')}:00:00Z`, synced: index !== 1,
      status: index === 2 ? 'rejected' : 'valid', reject_reason: index === 2 ? 'motivo' : null, is_calibration: index === 3,
    })),
    quotaRows: [{ quota_label: '18-24', valid_count: 4 }, { quota_label: '25-34', valid_count: '2' }],
  });
  const previous = await env.api.loadPrevious('s1', { force: true });
  assert.equal(JSON.stringify(previous), JSON.stringify({ id: 'e1', surveyId: 's1', researcherId: 'p1', status: 'valid', lat: -20.1, lng: -44.2, ts: Date.parse('2026-10-23T12:00:00Z') }));
  assert.equal(env.api.previous('s1').id, 'e1');
  const previousCall = env.calls.find(call => call.table === 'collection_events' && call.limit === 1);
  assert.deepEqual(previousCall.eq, [['survey_id', 's1'], ['researcher_id', 'p1']]);
  assert.deepEqual(previousCall.neq, [['status', 'rejected']]);
  assert.deepEqual(previousCall.not, [['lat', 'is', null], ['lng', 'is', null]]);

  const recent = await env.api.loadRecent({ force: true });
  assert.equal(recent.length, 6);
  assert.ok(recent.every(row => row.researcherId === 'p1'));
  assert.equal(recent[1].synced, false);
  assert.equal(recent[2].rejectReason, 'motivo');
  assert.equal(recent[3].calibration, true);
  const recentCall = env.calls.find(call => call.table === 'collection_events' && call.limit === 6);
  assert.deepEqual(recentCall.eq, [['researcher_id', 'p1']]);
  assert.deepEqual(recentCall.order.map(item => item[0]), ['occurred_at', 'id']);
  assert.equal(recentCall.select, 'id,survey_id,researcher_id,quota_label,occurred_at,synced,status,reject_reason,is_calibration');

  const quotas = await env.api.loadQuotas('s1', { force: true });
  assert.equal(JSON.stringify(quotas), JSON.stringify({ '18-24': 4, '25-34': 2 }));
  assert.equal(JSON.stringify(env.api.quotas('s1')), JSON.stringify(quotas));
}

async function explicitErrorsTest() {
  const env = makeEnvironment({
    previousRows: new Error('falha anterior'),
    quotaRows: new Error('falha quota'),
  });
  /* O stub de histórico retorna o objeto Error como data para simular falha. */
  const previousCall = env.calls;
  const previousPromise = env.api.loadPrevious('s-error', { force: true });
  await assert.rejects(previousPromise, /falha anterior|coleta anterior|retorno inválido/i);
  assert.equal(env.api.previous('s-error'), null, 'falha não pode virar ausência de histórico');
  assert.equal(env.api.state('previous', 's-error').status, 'error');

  await assert.rejects(env.api.loadQuotas('s-error', { force: true }), /falha quota/);
  assert.equal(env.api.quotas('s-error'), null, 'falha de cotas não pode retornar {}');
  assert.equal(env.api.state('quotas', 's-error').status, 'error');
  assert.ok(previousCall.length > 0);
}

async function fallbackAndAuthorizationTest() {
  const row = { id: 's-fallback', name: 'Fallback', status: 'campo', form_started: true, archived_at: null, survey_team: [{ researcher_id: 'p1' }], survey_questions: [] };
  const env = makeEnvironment({ surveyResponses: { 's-fallback': { data: row, error: null } } });
  const firstSurveyCall = env.calls;
  /* Troca o cliente por um stub mínimo para forçar a seleção legada e garantir
     que a busca continue limitada ao id selecionado. */
  let calls = 0;
  env.context.PP_SUPABASE_CLIENT = {
    from(table) {
      const call = { table };
      firstSurveyCall.push(call);
      const q = makeQuery(call, calls++ === 0
        ? { data: null, error: { message: 'column survey_question_fields does not exist' } }
        : { data: row, error: null });
      q.select = fields => { call.select = fields; return q; };
      q.eq = (field, value) => { call.eq = [[field, value]]; return q; };
      q.single = () => { call.single = true; return q; };
      return q;
    },
  };
  const loaded = await env.api.loadSurvey('s-fallback', { force: true });
  assert.equal(loaded.id, 's-fallback');
  const surveyCalls = firstSurveyCall.filter(call => call.table === 'surveys');
  assert.deepEqual(surveyCalls.map(call => call.select), ['FULL_JOIN_SELECT', 'LEGACY_JOIN_SELECT']);
  assert.deepEqual(surveyCalls.map(call => call.eq), [[['id', 's-fallback']], [['id', 's-fallback']]]);

  env.api.reset();
  const unauthorized = { ...row, id: 'not-mine', survey_team: [{ researcher_id: 'p-other' }] };
  env.context.PP_SUPABASE_CLIENT = {
    from() {
      const call = {};
      const q = makeQuery(call, { data: unauthorized, error: null });
      q.select = () => q;
      q.eq = () => q;
      q.single = () => q;
      return q;
    },
  };
  await assert.rejects(env.api.loadSurvey('not-mine', { force: true }), /não está disponível/i);
  assert.equal(env.api.state('survey', 'not-mine').status, 'error');
}

async function cancellationAndStaleSessionTest() {
  const pending = makeEnvironment({ pendingTables: new Set(['surveys']) });
  const pendingPromise = pending.api.loadSurvey('s1', { force: true });
  await Promise.resolve();
  assert.equal(pending.api.state('survey', 's1').status, 'loading');
  pending.api.cancelPending();
  assert.equal(pending.api.state('survey', 's1').status, 'idle');
  assert.equal(pending.api.survey('s1'), null);
  await pendingPromise;

  const old = makeEnvironment({ pendingTables: new Set(['surveys']) });
  const oldPromise = old.api.loadSurvey('old', { force: true });
  await Promise.resolve();
  old.context.CURRENT_PROFILE = { id: 'p2', role: 'pesq', status: 'ativo' };
  assert.equal(old.api.surveys().length, 0, 'a nova conta deve observar store vazio');
  await oldPromise;
  assert.equal(old.api.survey('old'), null, 'resposta de conta antiga não pode entrar no store novo');
  assert.equal(old.api.state('survey', 'old').status, 'idle');
}

async function idIsolationAndRecentDedupTest() {
  const env = makeEnvironment({ pendingTables: new Set(['surveys']) });
  const a = env.api.loadSurvey('a', { force: true });
  const b = env.api.loadSurvey('b', { force: true });
  assert.notStrictEqual(a, b, 'pesquisas diferentes não podem compartilhar a promessa');
  await Promise.resolve();
  const surveyCalls = env.calls.filter(call => call.table === 'surveys');
  surveyCalls.forEach((call, index) => call.finish({ data: {
    id: index === 0 ? 'a' : 'b', name: index === 0 ? 'A' : 'B', status: 'campo', form_started: true,
    archived_at: null, survey_team: [{ researcher_id: 'p1' }], survey_questions: [],
  }, error: null }));
  await Promise.all([a, b]);
  assert.equal(env.api.survey('a').name, 'A');
  assert.equal(env.api.survey('b').name, 'B');

  const recentEnv = makeEnvironment({ recentRows: [] });
  const recentA = recentEnv.api.loadRecent({ force: true });
  const recentB = recentEnv.api.loadRecent({ force: true });
  assert.strictEqual(recentA, recentB, 'histórico recente deve deduplicar chamadas simultâneas');
  await recentA;
  assert.equal(recentEnv.calls.filter(call => call.table === 'collection_events').length, 1);
}

(async () => {
  await selectedSurveyAndCacheTest();
  await indexPaginationAndAuthorizationTest();
  await testUserIndexTest();
  await historyAndQuotasTest();
  await explicitErrorsTest();
  await fallbackAndAuthorizationTest();
  await cancellationAndStaleSessionTest();
  await idIsolationAndRecentDedupTest();
  console.log('collection-data-smoke-test: PASS — stores isolados, questionário completo selecionado, escopos, paginação, cache/dedup, erros, timeout/cancelamento e sessões verificados.');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
