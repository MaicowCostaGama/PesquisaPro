'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = __dirname;
const UI_SOURCE = fs.readFileSync(path.join(ROOT, 'admin-navigation-ui.js'), 'utf8');
const APP_SOURCE = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const HTML_SOURCE = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function ticks(count = 8) {
  return Array.from({ length: count }).reduce(
    (promise) => promise.then(() => new Promise((resolve) => setImmediate(resolve))),
    Promise.resolve(),
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

function jsArg(value) {
  return JSON.stringify(String(value));
}

function makeSummary(id, extra = {}) {
  return {
    id,
    name: `Pesquisa ${id}`,
    status: 'campo',
    archivedAt: null,
    createdAt: '2026-10-29T12:00:00Z',
    pop: 1000,
    err: 0.03,
    conf: 1.96,
    prop: 50,
    formStarted: true,
    formApprovalRequired: false,
    questionCount: 4,
    teamCount: 2,
    collected: 7,
    summaryOnly: true,
    ...extra,
  };
}

function makeOverview(extra = {}) {
  return {
    active_researchers: 11,
    active_clients: 12,
    pending_signups: 13,
    pending_contracts: 14,
    valid_interviews: 15,
    company_signed: true,
    daily_counts: [{ day: '2026-10-28', count: 3 }, { day: '2026-10-29', count: 6 }],
    ...extra,
  };
}

function makeFullSurvey(id, extra = {}) {
  return {
    id,
    summaryOnly: false,
    questions: [{ id: 1, text: 'Pergunta completa' }],
    ...extra,
  };
}

function makeNode(key, active = false) {
  return {
    dataset: { key },
    classList: {
      toggle() {},
      add() {},
      remove() {},
      contains() { return active; },
    },
    setAttribute() {},
    removeAttribute() {},
  };
}

function makeUiEnvironment({
  profile = { id: 'admin-1', role: 'admin' },
  routeKey = 'surveys',
  rows = [makeSummary('summary-1')],
  overview = makeOverview(),
  surveyStatus = 'idle',
  overviewStatus = 'idle',
  surveyError = null,
  overviewError = null,
  loadSurveys = null,
  go = null,
} = {}) {
  const calls = {
    ensure: [],
    invalidate: 0,
    retry: [],
    go: [],
    alerts: [],
    legacyLoads: [],
    handlers: [],
    sql: [],
  };
  const state = {
    surveyStatus,
    overviewStatus,
    surveyError,
    overviewError,
    rows,
    overview,
  };
  const navNode = makeNode(routeKey, true);
  const main = {
    innerHTML: '',
    scrollTop: 0,
    focus() {},
  };
  const data = {
    ensure(name) {
      calls.ensure.push(name);
      return Promise.resolve(null);
    },
    ready(name) {
      return name === 'surveys' ? state.surveyStatus === 'ready' : state.overviewStatus === 'ready';
    },
    state(name) {
      return name === 'surveys'
        ? { status: state.surveyStatus, error: state.surveyError, loadedAt: 1 }
        : { status: state.overviewStatus, error: state.overviewError, loadedAt: 1 };
    },
    rows() {
      return state.rows.map((row) => ({ ...row }));
    },
    overview() {
      return state.overview ? { ...state.overview, daily_counts: state.overview.daily_counts.map((item) => ({ ...item })) } : null;
    },
    invalidate() {
      calls.invalidate += 1;
    },
    retry(name) {
      calls.retry.push(name);
      return Promise.resolve(null);
    },
    reset() {
      calls.dataReset = (calls.dataReset || 0) + 1;
    },
    onNavigate(...args) {
      calls.dataOnNavigate = calls.dataOnNavigate || [];
      calls.dataOnNavigate.push(args);
    },
  };

  const context = {
    window: {},
    CURRENT_PROFILE: profile,
    APP_DATA_SESSION_EPOCH: 0,
    PP_ADMIN_NAV_DATA: data,
    document: {
      querySelector(selector) {
        return selector === '.nav-item.on' ? navNode : null;
      },
      getElementById(id) {
        if (id === 'main') return main;
        return null;
      },
      querySelectorAll() { return []; },
    },
    console: { warn() {}, error() {} },
    Promise,
    Error,
    Number,
    String,
    Object,
    Array,
    Date,
    Map,
    Set,
    JSON,
    Math,
    Intl,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    alert(message) { calls.alerts.push(String(message)); },
    confirm() { return true; },
    head(title, description, actions = '') {
      return `<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${actions}</header>`;
    },
    stat(label, value, sub) {
      return `<div class="stat"><span class="s-label">${escapeHtml(label)}</span><span class="s-val">${value}</span><span class="s-sub">${escapeHtml(sub)}</span></div>`;
    },
    esc: escapeHtml,
    jsArg,
    surveySample() { return 123; },
    surveyCoveragePct(collected, sample) { return `${Math.round((collected / sample) * 100)}%`; },
    STATUS_PILL: {
      campo: '<span class="pill">Em campo</span>',
      rascunho: '<span class="pill">Rascunho</span>',
      encerrada: '<span class="pill">Encerrada</span>',
      arquivada: '<span class="pill">Arquivada</span>',
    },
    loadLocalAsset() { return Promise.resolve(); },
    Chart: undefined,
  };
  context.window = context;
  context.window.PP_ADMIN_NAV_DATA = data;
  context.window.PP_ADMIN_NAV_UI = null;
  context.go = (key) => {
    calls.go.push(key);
    if (typeof go === 'function') return go(key, context, calls);
    return undefined;
  };
  context.loadSurveysIfNeeded = loadSurveys || (() => {
    calls.legacyLoads.push('loadSurveysIfNeeded');
    return Promise.resolve();
  });
  for (const name of [
    'loadUsersIfNeeded',
    'loadCollectEventsIfNeeded',
    'loadAllContractsIfNeeded',
    'loadContractsIfNeeded',
    'loadCompanySignatureIfNeeded',
  ]) {
    context[name] = () => {
      calls.legacyLoads.push(name);
      return Promise.resolve();
    };
  }
  context.SURVEYS = [];
  context.SURVEYS_LOADED = false;
  context.WIZ = { data: { draft: 'untouched' }, editIndex: null };
  context.surveyStart = (index) => calls.handlers.push(['start', index]);
  context.surveyFinish = (index) => calls.handlers.push(['finish', index]);
  context.surveyReopen = (index) => calls.handlers.push(['reopen', index]);
  context.surveyArchive = (index) => calls.handlers.push(['archive', index]);
  context.surveyRestore = (index) => calls.handlers.push(['restore', index]);
  context.surveyDelete = (index) => calls.handlers.push(['delete', index]);
  context.surveyDuplicate = (index) => calls.handlers.push(['duplicate', index]);
  context.surveyEdit = (index) => calls.handlers.push(['edit', index]);
  context.surveyTeam = (index) => calls.handlers.push(['team', index]);
  context.surveyFormPdfDownload = (index) => calls.handlers.push(['pdf', index]);
  context.collectOpenCompletedSurvey = (id) => calls.handlers.push(['collect', id]);
  context.completedClientsOpen = (id) => calls.handlers.push(['clients', id]);
  context.chatOpenSurveyChannel = (id) => calls.handlers.push(['chat', id]);
  vm.createContext(context);
  vm.runInContext(UI_SOURCE, context, { filename: 'admin-navigation-ui.js' });
  return { context, data, state, calls, navNode, main, ui: context.window.PP_ADMIN_NAV_UI };
}

function extractBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert(start >= 0 && end > start, `não foi possível extrair ${startNeedle}`);
  return source.slice(start, end);
}

function testHtmlOrder() {
  const scripts = [...HTML_SOURCE.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
  const dataIndex = scripts.findIndex((src) => src.startsWith('admin-navigation-data.js'));
  const uiIndex = scripts.findIndex((src) => src.startsWith('admin-navigation-ui.js'));
  const appIndex = scripts.findIndex((src) => src.startsWith('app.js'));
  assert(dataIndex >= 0 && uiIndex >= 0 && appIndex >= 0, 'HTML precisa carregar data, UI e app');
  assert(dataIndex < uiIndex && uiIndex < appIndex, 'admin-navigation-data.js e admin-navigation-ui.js devem vir antes de app.js');
  assert.equal(scripts.filter((src) => src.startsWith('admin-navigation-data.js')).length, 1, 'data module deve aparecer uma vez');
  assert.equal(scripts.filter((src) => src.startsWith('admin-navigation-ui.js')).length, 1, 'UI module deve aparecer uma vez');
}

function testUiRenderersAndDataBoundaries() {
  const unsafeName = '<img src=x onerror=alert(1)> & "pesquisa"';
  const env = makeUiEnvironment({
    rows: [makeSummary('summary-1', { name: unsafeName, questionCount: 7, teamCount: 3 })],
    surveyStatus: 'idle',
    overviewStatus: 'idle',
  });
  const draftBefore = JSON.stringify(env.context.WIZ);

  const unknown = env.ui.dashboard();
  assert.deepEqual(env.calls.ensure, ['surveys', 'overview'], 'dashboard deve solicitar somente os dois recursos leves');
  assert.equal(env.calls.legacyLoads.length, 0, 'dashboard leve não pode chamar carregadores legados');
  assert(unknown.includes('…'), 'dashboard sem dados deve mostrar números desconhecidos');
  assert(!unknown.includes('>0<'), 'dashboard sem dados não pode fabricar zero');
  assert.equal(JSON.stringify(env.context.SURVEYS), '[]', 'dashboard não pode hidratar SURVEYS completo');
  assert.equal(JSON.stringify(env.context.WIZ), draftBefore, 'dashboard não pode alterar o draft/WIZ');

  env.state.surveyStatus = 'ready';
  const list = env.ui.list('surveys');
  assert.equal(env.calls.legacyLoads.length, 0, 'lista leve não pode chamar carregadores legados');
  assert(list.includes('&lt;img src=x onerror=alert(1)&gt;'), 'nome não confiável deve ser escapado no HTML');
  assert(!list.includes('<img src=x onerror=alert(1)>'), 'nome não confiável não pode virar HTML executável');
  assert(list.includes('7 perguntas'), 'questionCount do resumo deve ser usado diretamente');
  assert(list.includes('3 pessoas'), 'teamCount do resumo deve ser usado diretamente');
  assert(!list.includes('questions'), 'resumo renderizado não deve carregar perguntas');
  assert.equal(JSON.stringify(env.context.SURVEYS), '[]', 'lista leve não pode misturar resumos em SURVEYS');
  assert.equal(JSON.stringify(env.context.WIZ), draftBefore, 'lista leve não pode alterar o draft/WIZ');

  const sqlMessage = '<b>SQL indisponível</b> · execute deploy/navegacao-admin-leve-20261029.sql';
  env.state.surveyStatus = 'error';
  env.state.surveyError = sqlMessage;
  const errorList = env.ui.list('surveys-done');
  assert(errorList.includes('Tentar novamente'), 'erro do SQL deve oferecer retry explícito');
  assert(errorList.includes('&lt;b&gt;SQL indisponível&lt;/b&gt;'), 'mensagem de erro deve ser escapada');
  assert(!errorList.includes('<b>SQL indisponível</b>'), 'mensagem não confiável não pode virar HTML');
  assert.equal(env.calls.legacyLoads.length, 0, 'erro da RPC leve não pode cair para o carregador completo');

  env.state.surveyStatus = 'ready';
  env.state.overviewStatus = 'ready';
  env.state.overview = makeOverview({ active_researchers: 21, pending_signups: 0 });
  env.ui.dashboard();
  assert(env.calls.ensure.includes('surveys') && env.calls.ensure.includes('overview'), 'dashboard pronto deve continuar ligado aos recursos leves');
  assert.equal(env.calls.legacyLoads.length, 0, 'dashboard pronto não pode chamar carregadores legados');
}

function installActualAdminPages(env) {
  const dashboardSource = extractBetween(APP_SOURCE, 'PAGES.dashboard=()=>', '/* ============ DASHBOARD pesquisador');
  const listSource = extractBetween(APP_SOURCE, 'PAGES.surveys=()=>', 'async function surveyStart');
  vm.runInContext('var PAGES = {};\n' + dashboardSource + listSource, env.context, { filename: 'app-admin-pages-extracted.js' });
  return env.context.PAGES;
}

function testActualPageEarlyReturns() {
  const env = makeUiEnvironment({ surveyStatus: 'ready', overviewStatus: 'ready' });
  const pages = installActualAdminPages(env);
  assert.equal(typeof pages.dashboard, 'function');
  assert.equal(typeof pages.surveys, 'function');
  assert.equal(typeof pages['surveys-done'], 'function');
  assert.equal(typeof pages['surveys-archived'], 'function');
  const draftBefore = JSON.stringify(env.context.WIZ);
  for (const key of ['dashboard', 'surveys', 'surveys-done', 'surveys-archived']) {
    const html = pages[key]();
    assert(html && typeof html === 'string', `${key} deve retornar HTML pelo módulo novo`);
  }
  assert.equal(env.calls.legacyLoads.length, 0, 'early returns reais das PAGES não podem carregar stores legados');
  assert.equal(JSON.stringify(env.context.SURVEYS), '[]', 'PAGES leves não podem publicar resumos em SURVEYS');
  assert.equal(JSON.stringify(env.context.WIZ), draftBefore, 'PAGES leves não podem alterar WIZ');
}

async function runActionBoundary(name, options = {}) {
  const load = deferred();
  let loaderCalls = 0;
  let sharedLoad = null;
  const env = makeUiEnvironment({
    routeKey: options.routeKey || 'surveys',
    rows: [makeSummary('target-uuid', { status: options.status || 'campo' })],
    loadSurveys: () => {
      loaderCalls += 1;
      const owner = env.context.CURRENT_PROFILE;
      const epoch = env.context.APP_DATA_SESSION_EPOCH;
      if (!sharedLoad) {
        sharedLoad = load.promise.then(() => {
          if (options.cancelled || env.context.CURRENT_PROFILE !== owner || env.context.APP_DATA_SESSION_EPOCH !== epoch) return undefined;
          env.context.SURVEYS = [
            makeFullSurvey('other-uuid'),
            makeFullSurvey('target-uuid'),
          ];
          env.context.SURVEYS_LOADED = true;
        });
      }
      return sharedLoad;
    },
  });
  env.context.sb = {
    from() {
      env.calls.sql.push('from');
      throw new Error('ação de smoke test não pode chamar SQL real');
    },
    rpc() {
      env.calls.sql.push('rpc');
      throw new Error('ação de smoke test não pode chamar SQL real');
    },
  };
  const draftBefore = JSON.stringify(env.context.WIZ);
  const first = env.ui.action('target-uuid', name);
  const second = options.checkBusy ? env.ui.action('target-uuid', name) : null;
  if (options.changeRoute) {
    env.navNode.dataset.key = options.changeRoute;
  }
  if (options.changeSession) {
    env.context.CURRENT_PROFILE = { id: 'admin-new', role: 'admin' };
    env.context.APP_DATA_SESSION_EPOCH += 1;
  }
  if (options.cancelled) load.reject(new Error('cancelamento simulado'));
  else load.resolve();
  await Promise.all([first, second].filter(Boolean));
  await ticks();
  assert.equal(env.calls.sql.length, 0, 'handlers legados do boundary não podem disparar SQL real');
  assert.equal(JSON.stringify(env.context.WIZ), draftBefore, 'ação de lista não pode alterar o draft/WIZ');
  return { env, loaderCalls };
}

async function testExplicitActions() {
  for (const name of ['pdf', 'edit', 'duplicate', 'team', 'delete']) {
    const { env, loaderCalls } = await runActionBoundary(name);
    assert.equal(loaderCalls, 1, `${name} deve usar o carregador completo global uma vez`);
    assert.deepEqual(env.calls.handlers, [[name, 1]], `${name} deve resolver o UUID para o índice somente depois do await`);
    assert.equal(env.context.SURVEYS_LOADED, true, `${name} deve exigir store completo`);
  }
  for (const name of ['collect', 'clients']) {
    const { env, loaderCalls } = await runActionBoundary(name, { status: 'encerrada' });
    assert.equal(loaderCalls, 1, `${name} deve usar o carregador completo global uma vez`);
    assert.deepEqual(env.calls.handlers, [[name, 'target-uuid']], `${name} deve preservar o UUID no boundary legado após o await`);
    assert.equal(env.context.SURVEYS_LOADED, true, `${name} deve exigir store completo`);
  }

  const busy = await runActionBoundary('pdf', { checkBusy: true });
  assert.equal(busy.loaderCalls, 1, 'cliques simultâneos devem ser deduplicados pelo busy owner');
  assert.deepEqual(busy.env.calls.handlers, [['pdf', 1]], 'busy dedup não pode disparar a ação duas vezes');

  const routeChanged = await runActionBoundary('edit', { changeRoute: 'dashboard' });
  assert.equal(routeChanged.loaderCalls, 1, 'ação tardia ainda deve ter aguardado o carregador iniciado');
  assert.deepEqual(routeChanged.env.calls.handlers, [], 'navegação alterada deve bloquear a ação tardia');
  assert.equal(routeChanged.env.context.SURVEYS_LOADED, true, 'navegação alterada pode concluir a carga global, mas não pode executar a ação tardia');

  const sessionChanged = await runActionBoundary('duplicate', { changeSession: true });
  assert.equal(sessionChanged.loaderCalls, 1, 'ação de sessão obsoleta deve aguardar apenas a carga já iniciada');
  assert.deepEqual(sessionChanged.env.calls.handlers, [], 'sessão alterada deve bloquear a ação tardia');
  assert.equal(sessionChanged.env.context.SURVEYS_LOADED, false, 'sessão obsoleta não deve publicar store completo');

  const cancelled = await runActionBoundary('team', { cancelled: true });
  assert.deepEqual(cancelled.env.calls.handlers, [], 'falha/cancelamento da carga deve impedir mutação');
  assert.equal(cancelled.env.context.SURVEYS_LOADED, false, 'falha/cancelamento não pode marcar SURVEYS_LOADED');
  assert.deepEqual(cancelled.env.context.SURVEYS, [], 'falha/cancelamento deve manter integridade de SURVEYS');
}

function makeLoaderHookEnvironment() {
  const firstFullLoad = deferred();
  const secondFullLoad = deferred();
  let fullCalls = 0;
  const resetCalls = [];
  const context = {
    window: {},
    Promise,
    Map,
    APP_DATA_SESSION_EPOCH: 0,
    APP_DATA_SESSION_REQUESTS: new Map(),
    CURRENT_PROFILE: { id: 'admin-1', role: 'admin' },
    SURVEYS: [],
    SURVEYS_LOADED: false,
    SURVEYS_LOADING: false,
    SURVEYS_LOAD_ERROR: '',
    SURVEYS_LOAD_PROMISE: null,
    MY_CONTRACT: null,
    MY_CONTRACT_LOADED: false,
    MY_CONTRACT_LOADING: false,
    MY_INVITES: [],
    MY_INVITES_LOADED: false,
    MY_INVITES_LOADING: false,
    MY_INVITES_LOAD_PROMISE: null,
    MY_INVITE_RESPONDING: null,
    MY_COMMUNICATIONS: [],
    MY_COMMUNICATIONS_LOADED: false,
    MY_COMMUNICATIONS_LOADING: false,
    MY_SURVEY_RESEARCHER_MESSAGES: [],
    MY_SURVEY_RESEARCHER_MESSAGES_LOADED: false,
    MY_SURVEY_RESEARCHER_MESSAGES_LOADING: false,
    MY_SURVEY_RESEARCHER_MESSAGES_LAST_LOADED: 0,
    ACOLLECT_SURVEY_ID: null,
    ACOLLECT_SELECTED_QUOTA: null,
    ACOLLECT_START_LOADING: false,
    ACOLLECT_IN_PROGRESS: false,
    ACOLLECT_SUBMITTING: false,
    ACOLLECT_STARTED_AT: null,
    ACOLLECT_ANSWERS: {},
    ACOLLECT_QUOTA_COUNTS: {},
    ACOLLECT_QUOTA_LIST: [],
    APP_DATA_SESSION_REQUESTS: new Map(),
    stopAcollectQuotaLive() { resetCalls.push('stopAcollectQuotaLive'); },
    acollectResetRecordingState() { resetCalls.push('acollectResetRecordingState'); },
    console: { warn() {}, error() {} },
    setTimeout,
    clearTimeout,
  };
  context.window = context;
  for (const key of ['PP_RESEARCHER_DASHBOARD', 'PP_COLLECTION_DATA', 'PP_COLLECTION_LOADING']) {
    context.window[key] = { reset() { resetCalls.push(`${key}.reset`); } };
  }
  context.window.PP_ADMIN_NAV_DATA = { reset() { resetCalls.push('admin-data.reset'); } };
  context.window.PP_ADMIN_NAV_UI = { reset() { resetCalls.push('admin-ui.reset'); } };
  context.loadFullSurveysIfNeeded = () => {
    fullCalls += 1;
    return fullCalls === 1 ? firstFullLoad.promise : secondFullLoad.promise;
  };
  vm.createContext(context);
  const loader = extractBetween(APP_SOURCE, 'function loadSurveysIfNeeded(){', 'async function loadFullSurveysIfNeeded');
  const reset = extractBetween(APP_SOURCE, 'function resetSessionPanelData(){', 'function researcherUpdateVersionFromHtml');
  vm.runInContext(loader + reset, context, { filename: 'app-session-hooks-extracted.js' });
  return { context, firstFullLoad, secondFullLoad, resetCalls, get fullCalls() { return fullCalls; } };
}

async function testSharedRealLoaderAndSessionReset() {
  const env = makeLoaderHookEnvironment();
  const first = env.context.loadSurveysIfNeeded();
  const second = env.context.loadSurveysIfNeeded();
  assert.strictEqual(first, second, 'loadSurveysIfNeeded real deve compartilhar a promise');
  assert.equal(env.fullCalls, 1, 'loadFullSurveysIfNeeded mock deve ser chamado uma vez');
  env.firstFullLoad.resolve();
  await first;
  await ticks();
  assert.equal(env.context.SURVEYS_LOAD_PROMISE, null, 'promise compartilhada deve ser limpa ao finalizar');

  const pending = env.context.loadSurveysIfNeeded();
  assert.equal(env.fullCalls, 2, 'nova carga deve ser permitida depois da limpeza');
  env.context.resetSessionPanelData();
  assert.equal(env.context.SURVEYS_LOAD_PROMISE, null, 'reset de sessão deve limpar a promise da carga completa');
  assert(env.resetCalls.includes('admin-data.reset'), 'resetSessionPanelData deve chamar reset do data module');
  assert(env.resetCalls.includes('admin-ui.reset'), 'resetSessionPanelData deve chamar reset da UI module');
  env.secondFullLoad.resolve();
  await pending;
  await ticks();
  assert.equal(env.context.SURVEYS_LOAD_PROMISE, null, 'retorno tardio não deve reinstalar promise depois do reset');
}

function makeGoHookEnvironment() {
  const calls = [];
  const active = makeNode('surveys', true);
  const other = makeNode('dashboard', false);
  const main = { innerHTML: '', scrollTop: 0, focus() { calls.push('main.focus'); } };
  const context = {
    window: {},
    CURRENT_PROFILE: { id: 'admin-1', role: 'admin' },
    document: {
      querySelector(selector) { return selector === '.nav-item.on' ? active : null; },
      querySelectorAll() { return [active, other]; },
      getElementById(id) { return id === 'main' ? main : null; },
    },
    console: { warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    staffNavPendingEnabled() { return false; },
    updateCampaignSwitcherButton() { calls.push('campaign'); },
    closeSidebar() { calls.push('closeSidebar'); },
    PAGES: { dashboard: () => '<div>dashboard</div>' },
    _beforeRender(key) { calls.push(['before', key]); },
    _afterRender(key) { calls.push(['after', key]); },
    PP_ROUTE_MODULES: { prepare() { calls.push('route.prepare'); return true; } },
    PP_COLLECTION_LOADING: { navigate(...args) { calls.push(['collection.navigate', ...args]); } },
  };
  context.window = context;
  context.window.PP_SYSTEM_MESSAGES = { guardNavigation() { calls.push('guard'); return true; }, reset() { calls.push('system.reset'); } };
  context.window.PP_RESEARCHER_DASHBOARD = { onNavigate(...args) { calls.push(['researcher.onNavigate', ...args]); } };
  context.window.PP_ADMIN_NAV_UI = { onNavigate(...args) { calls.push(['admin-ui.onNavigate', ...args]); } };
  context.window.PP_ADMIN_NAV_DATA = { onNavigate(...args) { calls.push(['admin-data.onNavigate', ...args]); } };
  context.window.PP_REPORT_WHATSAPP = { reset() { calls.push('whatsapp.reset'); } };
  context.window.PP_USERS_PUSH = { reset() { calls.push('users-push.reset'); } };
  context.window.PP_SIMPLE_TABULATION = { canLeave() { return true; }, reset() { calls.push('simple.reset'); } };
  context.window.PP_TABULATION = { canLeave() { return true; }, reset() { calls.push('tabulation.reset'); } };
  context.window.APP_DATA_SESSION_EPOCH = 0;
  vm.createContext(context);
  const go = extractBetween(APP_SOURCE, 'function go(key){', '/* menu lateral no celular');
  vm.runInContext(go, context, { filename: 'app-go-extracted.js' });
  return { context, calls, main };
}

function testGoNavigationHooks() {
  const env = makeGoHookEnvironment();
  env.context.go('dashboard');
  assert(env.calls.some((entry) => Array.isArray(entry) && entry[0] === 'admin-ui.onNavigate' && entry[1] === 'dashboard' && entry[2] === 'surveys'), 'go deve notificar onNavigate da UI com rota anterior');
  assert(env.calls.some((entry) => Array.isArray(entry) && entry[0] === 'admin-data.onNavigate' && entry[1] === 'dashboard' && entry[2] === 'surveys'), 'go deve notificar onNavigate dos dados com rota anterior');
  assert.deepEqual(env.main.innerHTML, '<div>dashboard</div>');
  assert(env.calls.some((entry) => Array.isArray(entry) && entry[0] === 'before' && entry[1] === 'dashboard'), 'go deve executar beforeRender');
  assert(env.calls.some((entry) => Array.isArray(entry) && entry[0] === 'after' && entry[1] === 'dashboard'), 'go deve executar afterRender');
}

async function testLiveSummaryRefresh(){
  const env=makeUiEnvironment();
  const requests=[];
  env.context.AbortController=AbortController;
  env.context.sb={rpc(name,args){const request=deferred();requests.push({name,args,...request});return {abortSignal(){return request.promise;}};}};
  vm.runInContext(fs.readFileSync(path.join(ROOT,'admin-navigation-data.js'),'utf8'),env.context,{filename:'admin-navigation-data.js'});
  env.context.go=key=>{
    env.calls.go.push(key);env.navNode.dataset.key=key;
    if(key==='dashboard')env.main.innerHTML=env.ui.dashboard();
    else if(['surveys','surveys-done','surveys-archived'].includes(key))env.main.innerHTML=env.ui.list(key);
    else env.main.innerHTML='Outra área';
  };
  const raw={id:'target',name:'Resumo carregado automaticamente',status:'campo',archived_at:null,created_at:'2026-10-29T12:00:00Z',populacao:1000,margem_erro:0.03,nivel_confianca:1.96,proporcao:50,form_started:true,form_approval_required:false,question_count:23,team_count:4,valid_count:12};
  env.context.go('surveys');env.ui.list('surveys');env.ui.list('surveys');
  await ticks();
  assert.equal(requests.length,1,'renderizações repetidas precisam compartilhar a RPC');
  assert(env.main.innerHTML.includes('Carregando resumos'),'primeira renderização deve indicar carregamento');
  requests[0].resolve({data:[raw],error:null});await ticks();
  assert(env.main.innerHTML.includes(raw.name),'a lista deve atualizar automaticamente ao concluir a RPC');
  assert.equal(env.calls.go.length,2,'uma única conclusão deve disparar somente um refresh');
  assert.equal(env.context.SURVEYS_LOADED,false,'resumo pronto não equivale ao store completo');
  assert.equal(env.context.SURVEYS.length,0,'refresh não pode publicar resumos no formulário completo');

  env.context.go('dashboard');await ticks();
  assert.equal(requests.length,2,'painel reutiliza a lista e busca somente os indicadores');
  requests[1].resolve({data:makeOverview(),error:null});await ticks();
  assert(env.main.innerHTML.includes('Coletas por dia'),'indicadores prontos precisam aparecer sem clique extra');
  assert.equal(env.calls.legacyLoads.length,0);

  env.context.PP_ADMIN_NAV_DATA.invalidate();env.context.go('surveys');await ticks();
  requests[2].resolve({data:null,error:{code:'PGRST202',message:'RPC ausente'}});await ticks();
  assert(env.main.innerHTML.includes('Tentar novamente'));
  assert(env.main.innerHTML.includes('navegacao-admin-leve-20261029.sql'));
  assert(env.main.innerHTML.includes('PP_ADMIN_NAV_UI.retry'),'retry deve renderizar os estados da interface');
  env.ui.retry('surveys');await ticks();
  assert(env.main.innerHTML.includes('Carregando resumos'));
  requests[3].resolve({data:[raw],error:null});await ticks();
  assert(env.main.innerHTML.includes(raw.name),'retry deve terminar na lista pronta');

  env.context.PP_ADMIN_NAV_DATA.invalidate();env.context.go('surveys');await ticks();
  env.context.go('users');const count=env.calls.go.length;
  requests[4].resolve({data:[raw],error:null});await ticks();
  assert.equal(env.calls.go.length,count,'requisição concluída não deve tirar o usuário de outra área');
  assert.equal(env.main.innerHTML,'Outra área');

  env.context.PP_ADMIN_NAV_DATA.invalidate();env.context.go('surveys');await ticks();
  env.context.CURRENT_PROFILE=null;env.context.APP_DATA_SESSION_EPOCH++;
  env.context.PP_ADMIN_NAV_DATA.reset();env.ui.reset();const logoutCount=env.calls.go.length;
  requests[5].resolve({data:[raw],error:null});await ticks();
  assert.equal(env.calls.go.length,logoutCount,'logout precisa invalidar a assinatura de atualização da tela');
  assert.equal(env.context.PP_ADMIN_NAV_DATA.rows().length,0);
}

(async () => {
  testHtmlOrder();
  testUiRenderersAndDataBoundaries();
  testActualPageEarlyReturns();
  await testExplicitActions();
  await testSharedRealLoaderAndSessionReset();
  testGoNavigationHooks();
  await testLiveSummaryRefresh();
  console.log('admin-navigation-integration-smoke-test: PASS — renderer VM, unknown/error retry sem zero fake, escape HTML, summary isolation, PAGES early returns, actions com carregador completo/UUID após await, busy/session/route/cancelamento, promise compartilhada/reset, hooks e ordem HTML verificados.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
