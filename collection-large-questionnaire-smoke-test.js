'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const collectionDataSource = fs.readFileSync(path.join(root, 'collection-data.js'), 'utf8');

function extractFunction(source, name) {
  const candidates = [`async function ${name}(`, `function ${name}(`];
  const start = candidates.map(token => source.indexOf(token)).filter(index => index >= 0).sort((a, b) => a - b)[0];
  assert(start >= 0, `função real ${name} não encontrada no app.js`);
  let signatureQuote = null;
  let signatureEscaped = false;
  let signatureDepth = 0;
  let open = -1;
  for (let i = source.indexOf('(', start); i < source.length; i += 1) {
    const ch = source[i];
    if (signatureQuote) {
      if (signatureEscaped) signatureEscaped = false;
      else if (ch === '\\') signatureEscaped = true;
      else if (ch === signatureQuote) signatureQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      signatureQuote = ch;
      continue;
    }
    if (ch === '(') signatureDepth += 1;
    if (ch === ')') {
      signatureDepth -= 1;
      if (signatureDepth === 0) {
        open = source.indexOf('{', i);
        break;
      }
    }
  }
  assert(open > start, `corpo da função real ${name} não encontrado`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`não foi possível extrair a função real ${name}`);
}

function extractConst(source, name) {
  const start = source.indexOf(`const ${name}`);
  assert(start >= 0, `constante real ${name} não encontrada no app.js`);
  const end = source.indexOf(';', start);
  assert(end > start, `declaração real ${name} não encontrada`);
  return source.slice(start, end + 1);
}

const helperSource = [
  extractConst(appSource, 'DEFAULT_CURRENCY_CONFIG'),
  extractConst(appSource, 'CURRENCY_MAX_VALUE'),
  extractConst(appSource, 'DEFAULT_PAIR_FIELDS'),
  extractConst(appSource, 'SURVEY_OPTIONS_PAGE_SIZE'),
  extractConst(appSource, 'SURVEY_OPTIONS_MAX_ROWS'),
  extractFunction(appSource, 'roundCurrencyValue'),
  extractFunction(appSource, 'normalizeCurrencyConfig'),
  extractFunction(appSource, 'surveyGeoStatesCatalog'),
  extractFunction(appSource, 'normalizeGeoStates'),
  extractFunction(appSource, 'normalizeGeoCities'),
  extractFunction(appSource, 'normalizeSurveyGeo'),
  extractFunction(appSource, 'fmtRelativo'),
  extractFunction(appSource, 'isCollectionTestUser'),
  extractFunction(appSource, 'surveyRowToSnapshot'),
  extractFunction(appSource, 'attachSurveyQuestionOptions'),
  extractFunction(appSource, 'loadSurveyQuestionOptions'),
].join('\n');

assert.match(appSource, /async function loadSurveyQuestionOptions\(questionRows,\{signal,pageConcurrency=1,onProgress\}\=\{\}\)/,
  'implementação nova de loadSurveyQuestionOptions ausente; não há motivo para aguardar em loop');
assert.match(collectionDataSource, /const SURVEY_OPERATION_TIMEOUT_MS = 120000;/,
  'timeout total de survey de 120s ausente; não há motivo para aguardar em loop');
assert.match(collectionDataSource, /const SURVEY_IDLE_TIMEOUT_MS = 30000;/,
  'watchdog idle de survey de 30s ausente; não há motivo para aguardar em loop');

function makeClock() {
  let now = 0;
  let sequence = 0;
  const timers = [];
  function setTimeoutVirtual(callback, milliseconds) {
    const timer = {
      at: now + Math.max(0, Number(milliseconds) || 0),
      sequence: sequence += 1,
      callback,
      cleared: false,
      fired: false,
    };
    timers.push(timer);
    return timer;
  }
  function clearTimeoutVirtual(timer) {
    if (timer) timer.cleared = true;
  }
  function nextAt() {
    const live = timers.filter(timer => !timer.cleared && !timer.fired);
    return live.length ? Math.min(...live.map(timer => timer.at)) : null;
  }
  function advanceTo(target) {
    assert(target >= now, `relógio virtual não pode retroceder (${now} -> ${target})`);
    now = target;
    for (;;) {
      const due = timers
        .filter(timer => !timer.cleared && !timer.fired && timer.at <= now)
        .sort((a, b) => a.at - b.at || a.sequence - b.sequence);
      if (!due.length) return;
      due.forEach(timer => {
        timer.fired = true;
        timer.callback();
      });
    }
  }
  return {
    get now() { return now; },
    setTimeout: setTimeoutVirtual,
    clearTimeout: clearTimeoutVirtual,
    nextAt,
    advanceTo,
  };
}

class VirtualDate extends Date {
  static now() {
    return VirtualDate.clock ? VirtualDate.clock.now : Date.now();
  }
}

async function flushMicrotasks(rounds = 24) {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

function track(promise) {
  const result = { status: 'pending', value: undefined, error: undefined };
  Promise.resolve(promise).then(
    value => { result.status = 'fulfilled'; result.value = value; },
    error => { result.status = 'rejected'; result.error = error; },
  );
  return result;
}

async function drive(clock, promise, maximumSteps = 400) {
  const result = track(promise);
  for (let step = 0; step < maximumSteps; step += 1) {
    await flushMicrotasks();
    if (result.status !== 'pending') return result;
    const next = clock.nextAt();
    assert.notEqual(next, null, 'promessa ficou pendente sem timer virtual para avançar');
    clock.advanceTo(next);
  }
  throw new Error('relógio virtual excedeu o limite enquanto aguardava a promessa');
}

function makeOptionRows(questionId, count, labelFor) {
  return Array.from({ length: count }, (_, position) => ({
    id: `${questionId}-option-${String(position).padStart(5, '0')}`,
    question_id: questionId,
    position,
    label: labelFor ? labelFor(position) : `${questionId} opção ${position}`,
    quota_enabled: true,
    ends_interview: false,
  }));
}

function makeLargeFixture() {
  const questionRows = [
    { id: 'q-a', position: 2, text: 'Veículos', type: 'single', is_active: true },
    { id: 'q-b', position: 1, text: 'Modelos', type: 'single', is_active: true },
    { id: 'q-c', position: 3, text: 'Confirmação', type: 'single', is_active: true },
    { id: 'q-inactive', position: 4, text: 'Pergunta removida', type: 'single', is_active: false },
  ];
  const optionRows = [
    ...makeOptionRows('q-a', 8500, position => position === 8300 ? 'RAM RAMPAGE' : `Veículo ${position}`),
    ...makeOptionRows('q-b', 10000),
    ...makeOptionRows('q-c', 3, position => `Pequena ${position}`),
  ].sort((a, b) => String(a.question_id).localeCompare(String(b.question_id))
    || Number(a.position) - Number(b.position)
    || String(a.id).localeCompare(String(b.id)));
  const surveyRow = {
    id: 's-large',
    name: 'Pesquisa grande',
    tipo: 'Opinião',
    status: 'campo',
    form_started: true,
    archived_at: null,
    survey_team: [{ researcher_id: 'p1' }],
    survey_questions: questionRows.map(question => ({ ...question, survey_question_options: [] })),
  };
  return { questionRows, optionRows, surveyRow };
}

function makeEnvironment({
  source = collectionDataSource,
  surveyRow = makeLargeFixture().surveyRow,
  optionRows = makeLargeFixture().optionRows,
  metadataDelay = 1000,
  optionDelay = 5000,
  optionDelays = new Map(),
  failOptionOffsets = new Set(),
  pendingTables = new Set(),
  previousRows = [],
  quotaRows = [],
  profile = { id: 'p1', role: 'pesq', status: 'ativo' },
} = {}) {
  const clock = makeClock();
  VirtualDate.clock = clock;
  const calls = [];
  const changes = [];
  let activeOptions = 0;
  let maxOptionsInFlight = 0;

  function optionDelayFor(offset) {
    const configured = optionDelays instanceof Map ? optionDelays.get(offset) : optionDelays[offset];
    return configured == null ? optionDelay : configured;
  }

  function responseFor(call) {
    if (call.table === 'surveys' && call.single) return { data: surveyRow, error: null };
    if (call.table === 'survey_question_options') {
      const offset = call.range[0];
      if (failOptionOffsets.has(offset)) return { data: null, error: { message: `falha simulada na página ${offset}` } };
      return { data: optionRows.slice(call.range[0], call.range[1] + 1), error: null };
    }
    if (call.table === 'collection_events' && call.limit === 1) return { data: previousRows, error: null };
    if (call.table === 'collection_events' && call.limit === 6) return { data: [], error: null };
    if (call.table === 'rpc:survey_quota_counts') return { data: quotaRows, error: null };
    return { data: [], error: null };
  }

  function makeQuery(table) {
    const call = {
      table,
      eq: [],
      in: [],
      order: [],
      range: null,
      single: false,
      limit: null,
      abortSignal: null,
      scheduled: false,
      settled: false,
      lateResponse: false,
      abortedAt: null,
    };
    calls.push(call);
    let resolveThenable;
    const promise = new Promise(resolve => { resolveThenable = resolve; });

    function isOptionCall() {
      return table === 'survey_question_options';
    }
    function finish(value) {
      if (call.settled) {
        call.lateResponse = true;
        return;
      }
      call.settled = true;
      if (isOptionCall()) activeOptions -= 1;
      resolveThenable(value);
    }
    function schedule() {
      if (call.scheduled) return;
      call.scheduled = true;
      if (isOptionCall()) {
        activeOptions += 1;
        maxOptionsInFlight = Math.max(maxOptionsInFlight, activeOptions);
      }
      if (pendingTables.has(table)) return;
      let delay = table === 'surveys' ? metadataDelay : 0;
      if (isOptionCall()) delay = optionDelayFor(call.range[0]);
      if (!Number.isFinite(delay)) return;
      call.timer = clock.setTimeout(() => finish(responseFor(call)), delay);
    }
    function abort() {
      call.abortedAt = clock.now;
      finish({ data: null, error: { message: 'aborted' } });
    }

    const query = {
      select(fields) { call.select = fields; return query; },
      eq(field, value) { call.eq.push([field, value]); if (field === 'id') call.id = value; return query; },
      neq(field, value) { (call.neq ||= []).push([field, value]); return query; },
      not(field, operator, value) { (call.not ||= []).push([field, operator, value]); return query; },
      in(field, values) { call.in.push([field, Array.from(values)]); call.inIds = Array.from(values); return query; },
      order(field, options) { call.order.push([field, options]); return query; },
      range(from, to) { call.range = [from, to]; schedule(); return query; },
      single() { call.single = true; schedule(); return query; },
      limit(value) { call.limit = value; schedule(); return query; },
      abortSignal(signal) {
        call.abortSignal = signal;
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
        return query;
      },
      then(resolve, reject) { return promise.then(resolve, reject); },
    };
    if (table.startsWith('rpc:')) schedule();
    call.finish = finish;
    return query;
  }

  const client = {
    from(table) { return makeQuery(table); },
    rpc(name) { return makeQuery(`rpc:${name}`); },
  };

  const appContext = {
    console,
    Promise,
    Date: VirtualDate,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    JSON,
    Error,
    AbortController,
    BR_ESTADOS: [],
    BR_MUNICIPIOS: {},
    sb: client,
    CURRENT_PROFILE: profile,
  };
  vm.createContext(appContext);
  vm.runInContext(helperSource, appContext, { filename: 'app-real-helpers.vm.js' });

  const dataContext = {
    console,
    Promise,
    Date: VirtualDate,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    JSON,
    Error,
    AbortController,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    CURRENT_PROFILE: profile,
    PP_SUPABASE_CLIENT: client,
    SURVEY_JOIN_SELECT: 'FULL_JOIN_SELECT',
    SURVEY_JOIN_SELECT_LEGACY: 'LEGACY_JOIN_SELECT',
    isCollectionTestUser: appContext.isCollectionTestUser,
    surveyRowToSnapshot: appContext.surveyRowToSnapshot,
    loadSurveyQuestionOptions: appContext.loadSurveyQuestionOptions,
    attachSurveyQuestionOptions: appContext.attachSurveyQuestionOptions,
  };
  dataContext.window = dataContext;
  vm.createContext(dataContext);
  vm.runInContext(source, dataContext, { filename: 'collection-data.vm.js' });
  const api = dataContext.PP_COLLECTION_DATA;
  api.setOnChange((name, id) => changes.push({ name, id, state: api.state(name, id) }));

  return {
    clock,
    appContext,
    dataContext,
    api,
    client,
    calls,
    changes,
    get optionCalls() { return calls.filter(call => call.table === 'survey_question_options'); },
    get maxOptionsInFlight() { return maxOptionsInFlight; },
  };
}

async function largeQuestionnaireSuccessTest() {
  const fixture = makeLargeFixture();
  const env = makeEnvironment({ surveyRow: fixture.surveyRow, optionRows: fixture.optionRows });
  const metadata = env.api.metadata();
  assert.equal(metadata.operationTimeoutMs, 15000, 'recursos não survey continuam com timeout de 15s');
  assert.equal(metadata.surveyOperationTimeoutMs, 120000, 'survey expõe timeout total de 120s');
  assert.equal(metadata.surveyIdleTimeoutMs, 30000, 'survey expõe watchdog idle de 30s');

  const first = env.api.loadSurvey('s-large');
  const second = env.api.loadSurvey('s-large');
  assert.strictEqual(first, second, 'duas cargas simultâneas da mesma pesquisa devem deduplicar');
  await flushMicrotasks();
  assert.equal(env.calls.filter(call => call.table === 'surveys').length, 1, 'metadados devem ser consultados uma só vez');
  assert.equal(env.api.state('survey', 's-large').status, 'loading');

  env.clock.advanceTo(1000);
  await flushMicrotasks();
  assert.equal(env.optionCalls.length, 3, 'fetchSurvey deve repassar pageConcurrency:3 ao helper real');
  assert.equal(env.maxOptionsInFlight, 3, 'a primeira leva deve abrir no máximo três páginas');
  assert.deepEqual(env.optionCalls[0].inIds, ['q-b', 'q-a', 'q-c'], 'ids devem ser deduplicados e preservar a ordem das perguntas');
  assert(!env.optionCalls[0].inIds.includes('q-inactive'), 'pergunta inativa não deve ser buscada');
  assert.deepEqual(env.optionCalls[0].order.map(item => item[0]), ['question_id', 'position', 'id'], 'ordenação estável deve incluir question_id, position e id');
  assert.equal(env.api.state('survey', 's-large').progress.optionsLoaded, 0, 'metadados devem publicar progresso inicial sem snapshot');

  env.clock.advanceTo(15000);
  await flushMicrotasks();
  assert.equal(env.api.state('survey', 's-large').status, 'loading', 'carga acima de 15s não pode ser marcada como timeout');
  assert.equal(env.api.survey('s-large'), null, 'nenhum snapshot parcial pode aparecer durante as páginas');
  assert.ok(env.api.state('survey', 's-large').progress.optionsLoaded > 0, 'páginas aplicadas devem atualizar progresso');
  assert.ok(env.changes.every(change => change.name !== 'survey' || change.state.status !== 'ready'), 'ready só pode ocorrer no final');

  const result = await drive(env.clock, first);
  assert.equal(result.status, 'fulfilled', result.error?.stack || 'questionário grande deveria concluir');
  const snapshot = result.value;
  assert.equal(env.api.state('survey', 's-large').status, 'ready');
  assert.equal(env.api.state('survey', 's-large').progress.optionsLoaded, 18503);
  assert.equal(env.api.survey('s-large'), snapshot);
  assert(env.clock.now > 15000 && env.clock.now < 120000, 'carga total deve atravessar 15s, mas concluir antes de 120s');
  assert.equal(env.optionCalls.length, 21, 'a última leva de três ranges inclui duas respostas vazias após as dezenove páginas aplicadas');
  assert.equal(env.optionCalls.filter(call => call.range[0] < 19000).length, 19, '18.503 opções exigem dezenove ranges com dados');
  assert.equal(env.maxOptionsInFlight, 3, 'concorrência nunca pode exceder três páginas');
  assert.ok(env.optionCalls.every(call => call.abortSignal && !call.abortSignal.aborted), 'páginas concluídas devem receber abortSignal');

  const byId = new Map(snapshot.questions.map(question => [question.dbId, question]));
  assert.deepEqual(snapshot.questions.map(question => question.dbId), ['q-b', 'q-a', 'q-c'], 'perguntas devem preservar position');
  assert(!snapshot.questions.some(question => question.dbId === 'q-inactive'), 'pergunta inativa não deve aparecer no snapshot');
  assert.equal(byId.get('q-a').opts.length, 8500);
  assert.equal(byId.get('q-b').opts.length, 10000);
  assert.equal(byId.get('q-c').opts.length, 3);
  assert.equal(byId.get('q-a').opts[8300], 'RAM RAMPAGE', 'RAM RAMPAGE deve permanecer na posição 8300');
  assert.equal(byId.get('q-a').opts[8299], 'Veículo 8299');
  assert.equal(byId.get('q-a').opts[8301], 'Veículo 8301');
  assert.equal(byId.get('q-b').opts[9999], 'q-b opção 9999');
  assert.deepEqual(Array.from(byId.get('q-c').opts), ['Pequena 0', 'Pequena 1', 'Pequena 2']);
  const readyChanges = env.changes.filter(change => change.name === 'survey' && change.state.status === 'ready');
  assert.equal(readyChanges.length, 1, 'snapshot pronto deve ser publicado uma só vez');
  assert.ok(env.changes.some(change => change.state.progress?.optionsLoaded === 18503), 'onProgress final deve chegar ao state público');
  return env;
}

async function helperDedupTest() {
  const fixture = makeLargeFixture();
  const env = makeEnvironment({ optionRows: fixture.optionRows.filter(row => row.question_id === 'q-c') });
  const promise = env.appContext.loadSurveyQuestionOptions(
    [{ id: 'q-c' }, { id: 'q-c' }],
    { pageConcurrency: 3 },
  );
  await flushMicrotasks();
  assert.equal(env.optionCalls.length, 3, 'helper real pode abrir a leva concorrente completa para uma pergunta pequena');
  assert(env.optionCalls.every(call => call.inIds.length === 1 && call.inIds[0] === 'q-c'), 'questionRows repetidas devem virar um único question_id');
  env.clock.advanceTo(5000);
  const result = await drive(env.clock, promise);
  assert.equal(result.status, 'fulfilled');
  assert.equal(result.value.get('q-c').length, 3);
}

async function cancellationAndLateResponseTest() {
  const env = makeEnvironment({ metadataDelay: 5000 });
  const promise = env.api.loadSurvey('s-large');
  await flushMicrotasks();
  assert.equal(env.api.state('survey', 's-large').status, 'loading');
  env.api.cancelPending();
  assert.equal(env.api.state('survey', 's-large').status, 'idle');
  env.clock.advanceTo(5000);
  await flushMicrotasks();
  const result = await drive(env.clock, promise);
  assert.equal(result.status, 'fulfilled', 'cancelPending deve encerrar sem rejeição espúria');
  assert.equal(result.value, null);
  assert.equal(env.api.survey('s-large'), null, 'resposta atrasada não pode instalar snapshot');
  const metadataCall = env.calls.find(call => call.table === 'surveys');
  assert(metadataCall.abortSignal?.aborted, 'cancelPending deve abortar a consulta de metadados');
  assert(metadataCall.lateResponse, 'resposta tardia após cancelamento deve ser ignorada');
}

async function idleWatchdogTest() {
  const fixture = makeLargeFixture();
  const delayedOffsets = new Map([[3000, 40000], [4000, 40000], [5000, 40000]]);
  const env = makeEnvironment({
    surveyRow: fixture.surveyRow,
    optionRows: fixture.optionRows,
    optionDelays: delayedOffsets,
  });
  const promise = env.api.loadSurvey('s-large');
  await flushMicrotasks();
  env.clock.advanceTo(1000);
  await flushMicrotasks();
  env.clock.advanceTo(6000);
  await flushMicrotasks();
  assert.equal(env.api.state('survey', 's-large').status, 'loading');
  assert.equal(env.api.state('survey', 's-large').progress.optionsLoaded, 3000);
  assert.equal(env.clock.nextAt(), 36000, 'opções recebidas devem rearmar o idle watchdog para 30s');
  env.clock.advanceTo(36000);
  const result = await drive(env.clock, promise);
  assert.equal(result.status, 'rejected', 'idle sem nova página deve rejeitar a carga');
  assert.match(String(result.error?.message), /30s/);
  assert.equal(env.api.state('survey', 's-large').status, 'error');
  assert.equal(env.api.survey('s-large'), null, 'watchdog não pode instalar snapshot parcial');
  assert.ok(env.optionCalls.filter(call => call.abortSignal?.aborted).length >= 3, 'watchdog deve abortar todas as páginas pendentes');
}

async function pageErrorAndForceRetryTest() {
  const fixture = makeLargeFixture();
  const smallRows = [
    ...makeOptionRows('q-a', 1500, position => position === 1200 ? 'RAM RAMPAGE' : `Veículo ${position}`),
    ...makeOptionRows('q-c', 2, position => `Pequena ${position}`),
  ].sort((a, b) => String(a.question_id).localeCompare(String(b.question_id))
    || Number(a.position) - Number(b.position)
    || String(a.id).localeCompare(String(b.id)));
  const failOffsets = new Set([1000]);
  const env = makeEnvironment({
    surveyRow: fixture.surveyRow,
    optionRows: smallRows,
    failOptionOffsets: failOffsets,
  });
  const failed = await drive(env.clock, env.api.loadSurvey('s-large'));
  assert.equal(failed.status, 'rejected');
  assert.match(String(failed.error?.message), /página 1000/);
  assert.equal(env.api.state('survey', 's-large').status, 'error');
  assert.equal(env.api.survey('s-large'), null, 'erro de uma página não pode preservar carga parcial');
  assert.ok(env.optionCalls.some(call => call.abortSignal?.aborted), 'erro de página deve abortar as consultas irmãs');

  failOffsets.clear();
  const retried = await drive(env.clock, env.api.loadSurvey('s-large', { force: true }));
  assert.equal(retried.status, 'fulfilled', retried.error?.stack || 'force:true deveria permitir nova carga');
  assert.equal(env.api.state('survey', 's-large').status, 'ready');
  assert.equal(env.api.survey('s-large').questions.find(question => question.dbId === 'q-a').opts.length, 1500);
}

async function nonSurveyTimeoutTest() {
  const env = makeEnvironment({
    pendingTables: new Set(['collection_events', 'rpc:survey_quota_counts']),
  });
  const previous = env.api.loadPrevious('s-large', { force: true });
  const quotas = env.api.loadQuotas('s-large', { force: true });
  await flushMicrotasks();
  assert.equal(env.api.state('previous', 's-large').status, 'loading');
  assert.equal(env.api.state('quotas', 's-large').status, 'loading');
  env.clock.advanceTo(15000);
  const previousResult = await drive(env.clock, previous);
  const quotaResult = await drive(env.clock, quotas);
  assert.equal(previousResult.status, 'rejected');
  assert.equal(quotaResult.status, 'rejected');
  assert.match(String(previousResult.error?.message), /15s/);
  assert.match(String(quotaResult.error?.message), /15s/);
  assert.equal(env.api.state('previous', 's-large').status, 'error');
  assert.equal(env.api.state('quotas', 's-large').status, 'error');
  assert.ok(env.calls.filter(call => call.table === 'collection_events' || call.table === 'rpc:survey_quota_counts').every(call => call.abortSignal?.aborted), 'timeouts de recursos antigos devem abortar as consultas');
}

async function legacySurveyTimeoutBaselineTest() {
  assert.match(collectionDataSource, /const SURVEY_OPERATION_TIMEOUT_MS = 120000;/);
  const legacySource = collectionDataSource.replace(
    'const SURVEY_OPERATION_TIMEOUT_MS = 120000;',
    'const SURVEY_OPERATION_TIMEOUT_MS = OPERATION_TIMEOUT_MS;',
  );
  assert.notEqual(legacySource, collectionDataSource, 'mutação temporária de baseline não foi aplicada');
  const env = makeEnvironment({
    source: legacySource,
    pendingTables: new Set(['surveys']),
  });
  assert.equal(env.api.metadata().surveyOperationTimeoutMs, 15000, 'baseline mutado deve demonstrar o timeout antigo de 15s');
  const promise = env.api.loadSurvey('s-large');
  await flushMicrotasks();
  env.clock.advanceTo(15000);
  const result = await drive(env.clock, promise);
  assert.equal(result.status, 'rejected');
  assert.match(String(result.error?.message), /15s/);
  assert.equal(env.api.survey('s-large'), null);
  assert(env.calls.find(call => call.table === 'surveys').abortSignal?.aborted);
}

(async () => {
  await largeQuestionnaireSuccessTest();
  await helperDedupTest();
  await cancellationAndLateResponseTest();
  await idleWatchdogTest();
  await pageErrorAndForceRetryTest();
  await nonSurveyTimeoutTest();
  await legacySurveyTimeoutBaselineTest();
  console.log('collection-large-questionnaire-smoke-test: PASS — helpers reais, 18.503 opções, RAM RAMPAGE na posição 8300, concorrência 3, progresso, 120s/30s, cancelamento, erro sem parcial, retry force, timeouts legados e baseline de 15s verificados.');
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
