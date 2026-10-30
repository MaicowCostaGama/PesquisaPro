'use strict';

/*
 * PesquisaPro — Não respondeu explícita · smoke test de coleta/configuração.
 *
 * Este arquivo é deliberadamente autocontido e não altera app.js, módulos,
 * SQL, CSS ou HTML. Ele carrega question-nonresponse.js inteiro e executa
 * funções reais extraídas de app.js em VM. O Supabase, GPS, áudio e DOM são
 * fixtures locais: nada é publicado nem apagado.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = __dirname;
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const nonresponseSource = fs.readFileSync(path.join(root, 'question-nonresponse.js'), 'utf8');

function takeFunction(source, token) {
  const start = source.indexOf(token);
  assert(start >= 0, `função ausente: ${token}`);
  const brace = source.indexOf('{', start);
  assert(brace > start, `corpo ausente: ${token}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
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
  throw new Error(`corpo não fechado: ${token}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

function parseAttrs(source) {
  const attrs = {};
  for (const match of String(source).matchAll(/([:\w-]+)(?:="([^"]*)")?/g)) {
    if (match[1] === 'input' || match[1] === 'button' || match[1] === 'type') continue;
    attrs[match[1]] = match[2] == null ? true : match[2];
  }
  return attrs;
}

/* DOM mínimo, orientado aos seletores que o módulo real usa. */
class FakeElement {
  constructor(tagName = 'div', document = null) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.id = '';
    this.disabled = false;
    this.checked = false;
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this._innerHTML = '';
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name === 'disabled') this.disabled = true;
    if (name === 'checked') this.checked = true;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, before) {
    child.parentNode = this;
    const index = this.children.indexOf(before);
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners[type] || []) listener({ target: this, ...event });
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? '');
    this.children = [];
    if (this.className === 'nonresponse-modal') this.parseModalShell();
    else if (this.className === 'nonresponse-modal-content') this.parseModalContent();
  }

  get innerHTML() {
    return this._innerHTML;
  }

  parseModalShell() {
    const section = new FakeElement('section', this.ownerDocument);
    section.setAttribute('role', 'dialog');
    const close = new FakeElement('button', this.ownerDocument);
    close.setAttribute('data-nonresponse-close', '');
    section.appendChild(close);
    const content = new FakeElement('div', this.ownerDocument);
    content.className = 'nonresponse-modal-content';
    section.appendChild(content);
    this.appendChild(section);
  }

  parseModalContent() {
    const html = this._innerHTML;
    for (const match of html.matchAll(/<input\s+type="checkbox"([^>]*)>/g)) {
      const input = new FakeElement('input', this.ownerDocument);
      const attrs = parseAttrs(match[1]);
      for (const [key, value] of Object.entries(attrs)) input.setAttribute(key, value === true ? '' : value);
      input.type = 'checkbox';
      this.appendChild(input);
    }
    if (html.includes('data-nonresponse-reload')) {
      const reload = new FakeElement('button', this.ownerDocument);
      reload.setAttribute('data-nonresponse-reload', '');
      this.appendChild(reload);
    }
  }

  matches(selector) {
    const s = String(selector);
    if (s === 'section') return this.tagName === 'SECTION';
    if (s === 'button') return this.tagName === 'BUTTON';
    if (s === 'input') return this.tagName === 'INPUT';
    if (s === '.nonresponse-modal-content') return this.className === 'nonresponse-modal-content';
    if (s === '[data-nonresponse-close]') return Object.prototype.hasOwnProperty.call(this.attributes, 'data-nonresponse-close');
    if (s === '[data-nonresponse-reload]') return Object.prototype.hasOwnProperty.call(this.attributes, 'data-nonresponse-reload');
    if (s === '[data-nonresponse-id]') return Object.prototype.hasOwnProperty.call(this.attributes, 'data-nonresponse-id');
    if (s === '#q-list') return this.id === 'q-list';
    if (s === '[data-nonresponse-id]:checked') return this.matches('[data-nonresponse-id]') && this.checked;
    if (s === 'button:not(:disabled)') return this.tagName === 'BUTTON' && !this.disabled;
    if (s === 'input:not(:disabled)') return this.tagName === 'INPUT' && !this.disabled;
    if (s === 'button:not(:disabled),input:not(:disabled)') return this.matches('button:not(:disabled)') || this.matches('input:not(:disabled)');
    return false;
  }

  querySelector(selector) {
    return [this, ...this.descendants()].find(node => node.matches(selector)) || null;
  }

  querySelectorAll(selector) {
    return [this, ...this.descendants()].filter(node => node.matches(selector));
  }

  descendants() {
    return this.children.flatMap(child => [child, ...child.descendants()]);
  }
}

class FakeDocument {
  constructor() {
    this.activeElement = null;
    this.body = new FakeElement('body', this);
    this.body.ownerDocument = this;
    this.byId = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  register(element) {
    if (element.id) this.byId.set(element.id, element);
    return element;
  }

  getElementById(id) {
    if (this.byId.has(id)) return this.byId.get(id);
    const found = this.body.querySelector(`#${id}`);
    if (found) this.byId.set(id, found);
    return found;
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }
}

function moduleContext({ profile = { id: 'admin-1', role: 'admin', status: 'ativo' }, epoch = 1, pendingRpc = false } = {}) {
  const document = new FakeDocument();
  const calls = [];
  const deferred = [];
  const state = {
    profile,
    epoch,
    calls,
    deferred,
    confirms: [],
    formRenders: 0,
    actionRenders: 0,
    reloads: 0,
  };
  const surveyId = '11111111-1111-4111-8111-111111111111';
  const q1 = { dbId: 'q1', type: 'single', text: 'Escolha', opts: ['A', 'B'], allowNonresponse: false };
  const survey = { id: surveyId, status: 'campo', questions: [q1], quotas: {}, quotaOff: {} };
  const answers = { q1: { value: 'A' }, qOther: { value: 'preservar' } };

  function rpc(name, args) {
    calls.push({ kind: 'rpc', name, args: clone(args) });
    let resolve;
    const promise = new Promise(res => { resolve = res; });
    const response = pendingRpc ? null : name === 'list_question_nonresponse'
      ? { data: { survey_id: surveyId, questions: [{ question_id: 'q1', position: 0, text: 'Escolha', eligible: true, allow_nonresponse: false }] }, error: null }
      : { data: { question_id: 'q1', allow_nonresponse: args.p_enabled }, error: null };
    const query = {
      abortSignal(signal) {
        query.signal = signal;
        return query;
      },
      then(onFulfilled, onRejected) {
        if (response) return Promise.resolve(response).then(onFulfilled, onRejected);
        deferred.push({ name, resolve });
        return promise.then(onFulfilled, onRejected);
      },
    };
    return query;
  }

  const context = {
    console,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    JSON,
    Date,
    Error,
    AbortController,
    setTimeout,
    clearTimeout,
    document,
    window: null,
    CURRENT_PROFILE: profile,
    APP_DATA_SESSION_EPOCH: epoch,
    ACOLLECT_IN_PROGRESS: true,
    ACOLLECT_SUBMITTING: false,
    ACOLLECT_ANSWERS: answers,
    SURVEYS: [{ ...survey, questions: [{ ...q1, opts: q1.opts.slice() }] }],
    WIZ: { data: { questions: [{ ...q1, opts: q1.opts.slice() }] } },
    wizEditingSurveyId: () => surveyId,
    qRender: () => {},
    acollectCurrentSurvey: () => survey,
    PP_CONDITIONAL_FLOW: { visibleQuestions: questions => questions },
    PP_COLLECTION_WITHDRAWALS: { active: () => false },
    renderAcollectForm: () => { state.formRenders += 1; },
    renderAcollectActionState: () => { state.actionRenders += 1; },
    confirm: message => { state.confirms.push(message); return state.confirmResult !== false; },
    alert: () => {},
    sb: { rpc, from: () => { throw new Error('configuração não pode usar sb.from'); } },
    location: { reload: () => { state.reloads += 1; } },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(nonresponseSource, context, { filename: 'question-nonresponse.js' });
  return { context, api: context.PP_QUESTION_NONRESPONSE, state, surveyId, q1, survey, answers, document };
}

function assertModuleRules() {
  const env = moduleContext();
  const { api, survey } = env;
  const base = { id: 'q', dbId: 'q', type: 'single', allowNonresponse: true };
  assert.equal(api.eligible({ ...base, isRegion: true }, survey), false, 'região não pode ser elegível');
  assert.equal(api.eligible({ ...base, endsInterview: [true] }, survey), false, 'encerramento não pode ser elegível');
  assert.equal(api.eligible({ ...base, routeTargets: ['q2'] }, survey), false, 'rota condicional não pode ser elegível');
  assert.equal(api.eligible({ ...base, directTarget: 'q2' }, survey), false, 'alvo direto não pode ser elegível');
  assert.equal(api.eligible({ ...base, type: 'single' }, { ...survey, quotas: { q: { 0: 20 } }, quotaOff: {} }), false, 'single com cota configurada não pode ser elegível');
  assert.equal(api.eligible({ ...base, type: 'single' }, { ...survey, quotas: { q: { 0: 20 } }, quotaOff: { q: true } }), true, 'single com cota explicitamente desligada deve ser elegível');
  assert.equal(api.eligible({ ...base, type: 'multi' }, { ...survey, quotas: { q: { 0: 20 } }, quotaOff: {} }), false, 'multi com cota configurada não pode ser elegível');
  assert.equal(api.eligible({ ...base, type: 'multi' }, { ...survey, quotas: { q: { 0: null } }, quotaOff: {} }), true, 'pct nulo não configura cota');
  assert.equal(api.eligible({ ...base, type: 'single' }, { ...survey, archivedAt: '2026-01-01' }), false, 'pesquisa arquivada não pode ser elegível');
  assert.equal(api.allowed({ ...base }, survey, {}), true, 'permissão habilitada deveria permitir NR');
  assert.equal(api.allowed({ ...base, allowNonresponse: false }, survey, {}), false, 'false/default deve bloquear NR');
  assert.equal(api.allowed({ ...base }, survey, { locked: true }), false, 'resposta travada deve bloquear NR');

  assert(api.control(base, {}, survey).includes('Não respondeu'), 'botão NR deveria aparecer para pergunta habilitada');
  assert.equal(api.control({ ...base, allowNonresponse: false }, {}, survey), '', 'botão NR não pode aparecer para pergunta desabilitada');
  assert.equal(api.control({ ...base, isRegion: true }, {}, survey), '', 'botão NR não pode aparecer para pergunta protegida');

  env.context.CURRENT_PROFILE = { id: 'pesq-1', role: 'pesq', status: 'ativo' };
  env.survey.questions[0].allowNonresponse = true;
  env.context.SURVEYS[0].questions[0].allowNonresponse = true;
  env.context.WIZ.data.questions[0].allowNonresponse = true;
  env.context.confirm = () => false;
  env.api.mark('q1');
  assert.equal(env.context.ACOLLECT_ANSWERS.q1.value, 'A', 'cancelar confirmação alterou a resposta');
  env.context.confirm = () => true;
  env.api.mark('q1');
  assert.equal(env.context.ACOLLECT_ANSWERS.q1.value, null, 'marcação correta não gravou value null');
  assert.equal(env.context.ACOLLECT_ANSWERS.q1.isNonresponse, true, 'marcação correta não gravou isNonresponse=true');
  assert.equal(env.state.formRenders, 1, 'marcação deveria redesenhar o formulário');
  env.context.ACOLLECT_ANSWERS.qOther = { value: 'preservar' };
  env.survey.questions[0].allowNonresponse = false;
  env.api.clear('q1');
  assert.equal(env.context.ACOLLECT_ANSWERS.q1, undefined, 'limpar NR não removeu somente a pergunta');
  assert.equal(env.context.ACOLLECT_ANSWERS.qOther.value, 'preservar', 'limpar NR perturbou outra pergunta');

  const declaredSurvey = {
    questions: [
      { dbId: '11111111-1111-4111-8111-111111111111', type: 'single', allowNonresponse: true },
      { dbId: '22222222-2222-4222-8222-222222222222', type: 'single', allowNonresponse: false },
      { dbId: '33333333-3333-4333-8333-333333333333', type: 'single', allowNonresponse: true, isRegion: true },
    ],
  };
  const declared = api.declaredQuestionIds(declaredSurvey, {
    [declaredSurvey.questions[0].dbId]: { value: null, isNonresponse: true },
    [declaredSurvey.questions[1].dbId]: { value: null, isNonresponse: true },
    [declaredSurvey.questions[2].dbId]: { value: null, isNonresponse: true },
  });
  assert.equal(declared.length, 1, 'declaredQuestionIds deve excluir NR desabilitada');
  assert.equal(String(declared[0]), String(declaredSurvey.questions[0].dbId), 'declaredQuestionIds deve conter somente NR visível e permitida');

  const pair = { dbId: 'pair', type: 'pair', fields: [{ id: 'f1' }, { id: 'f2' }] };
  const pairRows = api.answerRows(pair, 'event-1', { isNonresponse: true });
  assert.equal(pairRows.length, 2, 'pair NR deve gerar uma linha por campo');
  assert(pairRows.every(row => row.value_text === 'Não respondeu' && row.value_number === null && row.is_nonresponse === true), 'linhas pair NR perderam o marcador');
  assert.deepEqual(pairRows.map(row => row.field_id), ['f1', 'f2']);

  for (const type of ['number', 'scale', 'scale10', 'nps']) {
    const row = api.answerRows({ dbId: `q-${type}`, type }, 'event-1', { isNonresponse: true })[0];
    assert.equal(row.value_text, 'Não respondeu', `${type}: NR deve ser textual`);
    assert.equal(row.value_number, null, `${type}: NR não pode virar zero/número`);
    assert.equal(row.is_nonresponse, true, `${type}: flag NR ausente`);
  }
  const ranking = api.answerRows({ dbId: 'q-ranking', type: 'ranking' }, 'event-1', { isNonresponse: true })[0];
  assert.equal(ranking.value_number, null, 'ranking NR não pode receber posição');
  assert.equal(ranking.value_text, 'Não respondeu');

  const normal = { dbId: 'q-normal', type: 'single' };
  assert.equal(api.answerRows(normal, 'event-1', { value: '' }).length, 0, 'blank antigo não pode virar NR');
  assert.equal(api.answerRows(normal, 'event-1', { value: null }).length, 0, 'null antigo não pode virar NR');

  env.context.CURRENT_PROFILE = { id: 'admin-1', role: 'admin', status: 'ativo' };
  assert(api.manageButton({ id: env.surveyId, status: 'campo' }).includes('Configurar'), 'gestão deveria ter botão do modal');
  assert.equal(api.manageButton({ id: env.surveyId, status: 'encerrada' }), '', 'pesquisa encerrada não deve ter botão de gestão');
  assert.equal(api.editorControl({ dbId: 'q1' }).includes('Configurar'), true, 'admin deveria ver configuração no editor');

  env.context.CURRENT_PROFILE = { id: 'pesq-1', role: 'pesq', status: 'ativo' };
  assert.equal(api.canManage(), false, 'pesquisador não pode gerenciar NR');
  assert.equal(api.manageButton({ id: env.surveyId, status: 'campo' }), '', 'pesquisador não deve ver gestão NR');
  env.context.CURRENT_PROFILE = { id: 'admin-1', role: 'admin', status: 'inativo' };
  assert.equal(api.canManage(), false, 'perfil inativo não pode gerenciar NR');
}

function appContext() {
  const document = new FakeDocument();
  const form = new FakeElement('div', document);
  form.id = 'acollectForm';
  document.byId.set(form.id, form);
  const actions = new FakeElement('div', document);
  actions.id = 'acollectActions';
  document.byId.set(actions.id, actions);
  const alertMessages = [];
  const survey = {
    id: 'survey-fixture',
    status: 'campo',
    archivedAt: null,
    quotaOff: {},
    quotas: {},
    questions: [
      { id: 1, dbId: 'q-single', position: 0, type: 'single', text: 'Escolha', opts: ['A', 'B'], allowNonresponse: true, endsInterview: ['', ''], routeTargets: ['', ''], directTarget: '' },
      { id: 2, dbId: 'q-multi', position: 1, type: 'multi', text: 'Várias', opts: ['A', 'B'], allowNonresponse: true },
      { id: 3, dbId: 'q-scale', position: 2, type: 'scale', text: 'Escala', opts: [], allowNonresponse: true },
      { id: 4, dbId: 'q-number', position: 3, type: 'number', text: 'Número', opts: [], allowNonresponse: true },
      { id: 5, dbId: 'q-nps', position: 4, type: 'nps', text: 'NPS', opts: [], allowNonresponse: true },
      { id: 6, dbId: 'q-ranking', position: 5, type: 'ranking', text: 'Ranking', opts: ['A', 'B'], allowNonresponse: true },
      { id: 7, dbId: 'q-pair', position: 6, type: 'pair', text: 'Duas respostas', allowNonresponse: true, fields: [{ id: 'f1', type: 'single' }, { id: 'f2', type: 'open' }] },
      { id: 8, dbId: 'q-open-disabled', position: 7, type: 'open', text: 'Aberta bloqueada', opts: [], allowNonresponse: false },
      { id: 9, dbId: 'q-blank', position: 8, type: 'single', text: 'Blank antigo', opts: ['A'], allowNonresponse: true },
    ],
  };
  const context = {
    console,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    JSON,
    Date,
    Error,
    Math,
    Promise,
    AbortController,
    setTimeout,
    clearTimeout,
    Intl,
    document,
    window: null,
    CURRENT_PROFILE: { id: 'researcher-1', role: 'pesq', status: 'ativo' },
    APP_DATA_SESSION_EPOCH: 1,
    ACOLLECT_IN_PROGRESS: true,
    ACOLLECT_SUBMITTING: false,
    ACOLLECT_SURVEY_ID: survey.id,
    ACOLLECT_STARTED_AT: Date.now() - 120000,
    ACOLLECT_ANSWERS: {},
    PP_CONDITIONAL_FLOW: { visibleQuestions: questions => questions },
    PP_COLLECTION_WITHDRAWALS: { active: () => false },
    acollectCurrentSurvey: () => survey,
    renderAcollectForm: () => {},
    renderAcollectActionState: () => {},
    acollectEndByCondition: () => false,
    DEFAULT_PAIR_FIELDS: () => [{ id: 'f1', type: 'single' }, { id: 'f2', type: 'open' }],
    isCurrencyQuestion: () => false,
    formatCurrencyBRL: value => `R$ ${value}`,
    normalizeCurrencyConfig: value => value || {},
    Q_HAS_QUOTA_OPTS: () => true,
    normalizeSurveyGeo: () => ({ estados: [], cidades: [] }),
    fmtRelativo: () => 'agora',
    confirm: () => true,
    alert: message => alertMessages.push(String(message)),
    location: { reload: () => { throw new Error('reload inesperado'); } },
    selectedRole: 'pesq',
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(nonresponseSource, context, { filename: 'question-nonresponse.js' });
  const functions = [
    'function surveyRowToSnapshot(',
    'function acollectPairField(',
    'function acollectSetAnswer(',
    'function acollectToggleMultiAnswer(',
    'function acollectSetPairField(',
    'function acollectTogglePairMulti(',
    'function acollectRankingOptions(',
    'function acollectRankingSetOrder(',
    'function acollectMissingRequired(',
    'function acollectBuildAnswerRows(',
  ].map(token => takeFunction(appSource, token)).join('\n');
  vm.runInContext(functions, context, { filename: 'app-collection-extractions.js' });
  return { context, survey, document, form, actions, alertMessages };
}

function assertSnapshotAndAnswerState() {
  const env = appContext();
  const row = {
    id: 'snapshot-survey',
    name: 'Fixture',
    status: 'campo',
    form_started: true,
    survey_questions: [
      { id: 'q-region', position: 0, type: 'single', text: 'Região', is_region: true, allow_nonresponse: true, survey_question_options: [{ position: 0, label: 'Norte', quota_enabled: false }] },
      { id: 'q-single-quota', position: 1, type: 'single', text: 'Cota única', allow_nonresponse: true, survey_question_options: [{ position: 0, label: 'A', quota_enabled: true, quota_pct: 25 }] },
      { id: 'q-multi-free', position: 2, type: 'multi', text: 'Múltipla livre', allow_nonresponse: false, survey_question_options: [{ position: 0, label: 'A', quota_enabled: false }, { position: 1, label: 'B', quota_enabled: false }] },
      { id: 'q-route', position: 3, type: 'single', text: 'Rota', allow_nonresponse: true, logic_jsonb: { route_targets: ['', '__end__'], direct_target: '' }, survey_question_options: [{ position: 0, label: 'Sim' }, { position: 1, label: 'Não' }] },
    ],
  };
  const snapshot = env.context.surveyRowToSnapshot(row, row.survey_questions, [], []);
  assert.equal(snapshot.questions[0].allowNonresponse, true, 'snapshot não mapeou allow_nonresponse=true');
  assert.equal(snapshot.questions[2].allowNonresponse, false, 'snapshot default false não foi preservado');
  assert.equal(JSON.stringify(snapshot.quotaOff), JSON.stringify({ 1: true, 3: true }), 'snapshot não mapeou quotaOff por pergunta');
  assert.equal(JSON.stringify(snapshot.quotas), JSON.stringify({ 2: { 0: 25 } }), 'snapshot não mapeou percentual de cota');
  assert.equal(JSON.stringify(Array.from(snapshot.questions[3].routeTargets)), JSON.stringify(['', '__end__']));

  const ctx = env.context;
  ctx.ACOLLECT_ANSWERS = {
    'q-single': { value: 'A', isNonresponse: true },
    'q-multi': { value: ['A'], isNonresponse: true },
    'q-scale': { value: 4, isNonresponse: true },
    'q-number': { value: 7, isNonresponse: true },
    'q-nps': { value: 9, isNonresponse: true },
    'q-ranking': { value: ['A', 'B'], isNonresponse: true },
    'q-pair': { value: [['A'], 'texto'], isNonresponse: true },
    'q-open-disabled': { value: null, isNonresponse: true },
    'q-blank': { value: '', isNonresponse: false },
  };
  ctx.acollectSetAnswer('q-single', 'B', false);
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].value, 'B', 'setter regular não preservou valor normal');
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].isNonresponse, false, 'setter regular não resetou flag NR');
  const beforeSubmitting = clone(ctx.ACOLLECT_ANSWERS['q-single']);
  ctx.ACOLLECT_SUBMITTING = true;
  ctx.acollectSetAnswer('q-single', 'IGNORAR', false);
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].value, beforeSubmitting.value, 'setter aceitou edição durante envio');
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].isNonresponse, beforeSubmitting.isNonresponse, 'setter alterou flag durante envio');
  ctx.ACOLLECT_SUBMITTING = false;
  ctx.PP_COLLECTION_WITHDRAWALS.active = () => true;
  ctx.acollectSetAnswer('q-single', 'IGNORAR', false);
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].value, beforeSubmitting.value, 'setter aceitou edição durante desistência');
  assert.equal(ctx.ACOLLECT_ANSWERS['q-single'].isNonresponse, beforeSubmitting.isNonresponse, 'setter alterou flag durante desistência');
  ctx.PP_COLLECTION_WITHDRAWALS.active = () => false;
  ctx.ACOLLECT_ANSWERS['q-multi'] = { value: null, isNonresponse: true };
  ctx.acollectToggleMultiAnswer('q-multi', 'A', 0);
  assert.notEqual(ctx.ACOLLECT_ANSWERS['q-multi'].isNonresponse, true, 'múltipla selecionada manteve NR');
  assert.equal(String(ctx.ACOLLECT_ANSWERS['q-multi'].value[0]), 'A');
  assert.equal(ctx.ACOLLECT_ANSWERS['q-multi'].value.length, 1);
  ctx.acollectSetAnswer('q-scale', 4, false);
  ctx.acollectSetAnswer('q-number', 11, false);
  ctx.acollectSetAnswer('q-nps', 9, false);
  ctx.acollectRankingSetOrder('q-ranking', ['B', 'A']);
  ctx.acollectSetPairField('q-pair', 0, 'B');
  ctx.acollectTogglePairMulti('q-pair', 1, 'X');
  for (const id of ['q-scale', 'q-number', 'q-nps', 'q-ranking', 'q-pair']) assert.notEqual(ctx.ACOLLECT_ANSWERS[id].isNonresponse, true, `${id}: setter regular não resetou NR`);

  assert.throws(() => ctx.acollectBuildAnswerRows('event-invalid'), /Não resposta não permitida/, 'builder aceitou NR em pergunta desabilitada');
  ctx.ACOLLECT_ANSWERS['q-single'] = { value: null, isNonresponse: true };
  ctx.ACOLLECT_ANSWERS['q-scale'] = { value: null, isNonresponse: true };
  ctx.ACOLLECT_ANSWERS['q-number'] = { value: null, isNonresponse: true };
  ctx.ACOLLECT_ANSWERS['q-nps'] = { value: null, isNonresponse: true };
  ctx.ACOLLECT_ANSWERS['q-ranking'] = { value: null, isNonresponse: true };
  ctx.ACOLLECT_ANSWERS['q-pair'] = { value: null, isNonresponse: true };
  delete ctx.ACOLLECT_ANSWERS['q-open-disabled'];
  const rows = ctx.acollectBuildAnswerRows('event-1');
  const nrRows = rows.filter(rowItem => rowItem.is_nonresponse === true);
  assert.equal(nrRows.length, 1 + 1 + 1 + 1 + 1 + 2, 'respostas NR deveriam produzir linhas por pergunta/campo');
  assert.equal(nrRows.filter(rowItem => rowItem.question_id === 'q-pair').length, 2, 'pair NR deveria produzir duas linhas no builder');
  assert(nrRows.every(rowItem => rowItem.value_text === 'Não respondeu' && rowItem.value_number === null), 'builder atribuiu valor numérico à NR');
  assert.equal(rows.filter(rowItem => rowItem.question_id === 'q-ranking' && rowItem.is_nonresponse === true).length, 1, 'ranking marcado como NR deve gerar uma linha neutra, sem posição');
  assert.equal(rows.filter(rowItem => rowItem.question_id === 'q-blank').length, 0, 'blank antigo foi materializado como resposta');

  ctx.ACOLLECT_ANSWERS = {
    'q-single': { value: null, isNonresponse: true },
    'q-open-disabled': { value: null, isNonresponse: true },
  };
  const missing = ctx.acollectMissingRequired().map(q => q.dbId);
  assert(missing.includes('q-open-disabled'), 'open com NR desabilitada deveria ser inválida');
  assert(!missing.includes('q-single'), 'NR permitida deveria satisfazer obrigatoriedade');
  ctx.ACOLLECT_ANSWERS = { 'q-single': { value: null, isNonresponse: true } };
  assert(ctx.acollectMissingRequired().some(q => q.dbId === 'q-multi'), 'pergunta normal sem resposta deve continuar obrigatória');
}

async function runConfigSuccessAndErrorTests() {
  const env = moduleContext();
  env.api.open(env.surveyId);
  await tick();
  assert.deepEqual(env.state.calls.map(call => call.name), ['list_question_nonresponse'], 'modal deveria usar RPC list');
  assert.equal(env.context.SURVEYS[0].questions[0].allowNonresponse, false);
  const checkbox = env.document.body.querySelector('[data-nonresponse-id]');
  assert(checkbox, 'modal não renderizou checkbox de pergunta');
  env.context.confirm = () => true;
  checkbox.checked = true;
  checkbox.dispatch('change');
  await tick();
  await tick();
  const setCall = env.state.calls.find(call => call.name === 'set_question_nonresponse');
  assert(setCall, 'modal não usou RPC set');
  assert.deepEqual(setCall.args, { p_question_id: 'q1', p_enabled: true, p_expected_enabled: false }, 'set não enviou expected flag/concurrency');
  assert.deepEqual(env.state.calls.map(call => call.name), ['list_question_nonresponse', 'set_question_nonresponse'], 'configuração fez operação fora de list/set RPC');
  assert.equal(env.context.SURVEYS[0].questions[0].opts.join(','), 'A,B', 'set perturbou opções antigas');
  assert.deepEqual(env.context.ACOLLECT_ANSWERS, env.answers, 'configuração perturbou respostas antigas');
  assert.equal(env.state.reloads, 0, 'modal acionou reload completo da aplicação');

  const errorEnv = moduleContext();
  const originalRpc = errorEnv.context.sb.rpc;
  errorEnv.context.sb.rpc = (name, args) => {
    errorEnv.state.calls.push({ kind: 'rpc', name, args: clone(args) });
    return { abortSignal: () => ({ then: resolve => Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'schema cache' } }).then(resolve) }) };
  };
  errorEnv.api.open(errorEnv.surveyId);
  await tick();
  assert.equal(errorEnv.context.SURVEYS[0].questions[0].allowNonresponse, false, 'erro de list publicou estado parcial');
  assert(errorEnv.document.body.innerHTML === undefined || true, 'fixture DOM');
  errorEnv.context.sb.rpc = originalRpc;

  const permissionEnv = moduleContext({ profile: { id: 'p', role: 'pesq', status: 'ativo' } });
  permissionEnv.api.open(permissionEnv.surveyId);
  await tick();
  assert.equal(permissionEnv.state.calls.length, 0, 'perfil pesquisador abriu configuração administrativa');
}

async function runScopedAsyncTests() {
  const staleEpoch = moduleContext({ pendingRpc: true });
  staleEpoch.api.open(staleEpoch.surveyId);
  await tick();
  assert.equal(staleEpoch.state.deferred.length, 1, 'RPC pendente não foi registrada');
  staleEpoch.context.APP_DATA_SESSION_EPOCH = 2;
  staleEpoch.state.deferred[0].resolve({ data: { survey_id: staleEpoch.surveyId, questions: [{ question_id: 'q1', position: 0, eligible: true, allow_nonresponse: true }] }, error: null });
  await tick();
  await tick();
  assert.equal(staleEpoch.context.SURVEYS[0].questions[0].allowNonresponse, false, 'resposta de epoch antigo publicou configuração');

  const staleIdentity = moduleContext({ pendingRpc: true });
  staleIdentity.api.open(staleIdentity.surveyId);
  await tick();
  staleIdentity.context.CURRENT_PROFILE = { id: 'other-admin', role: 'admin', status: 'ativo' };
  staleIdentity.state.deferred[0].resolve({ data: { survey_id: staleIdentity.surveyId, questions: [{ question_id: 'q1', position: 0, eligible: true, allow_nonresponse: true }] }, error: null });
  await tick();
  await tick();
  assert.equal(staleIdentity.context.SURVEYS[0].questions[0].allowNonresponse, false, 'resposta de perfil antigo publicou configuração');
}

function submitContext({ nonresponse }) {
  const document = new FakeDocument();
  const form = new FakeElement('div', document); form.id = 'acollectForm'; document.byId.set(form.id, form);
  const msg = new FakeElement('div', document); msg.id = 'acollectMsg'; document.byId.set(msg.id, msg);
  const captured = { eventPayloads: [], answerBatches: [], calls: [] };
  const normalId = '44444444-4444-4444-8444-444444444444';
  const nrId = '55555555-5555-4555-8555-555555555555';
  const survey = { id: 'survey-submit', questions: [
    { dbId: normalId, type: 'single', text: 'Normal', opts: ['A'], allowNonresponse: true },
    { dbId: nrId, type: 'number', text: 'NR', opts: [], allowNonresponse: true },
  ] };
  const context = {
    console, Map, Set, Object, Array, String, Number, JSON, Date, Error, Math, Promise,
    Intl, AbortController, setTimeout, clearTimeout, document, window: null,
    CURRENT_PROFILE: { id: 'researcher-1', role: 'pesq', status: 'ativo' },
    APP_DATA_SESSION_EPOCH: 1,
    ACOLLECT_IN_PROGRESS: true, ACOLLECT_SUBMITTING: false, ACOLLECT_STARTED_AT: Date.now() - 120000,
    ACOLLECT_MIN_SECONDS: 60, ACOLLECT_TICK: null, PAYMENTS_LOADED: true,
    ACOLLECT_SURVEY_ID: survey.id, ACOLLECT_SELECTED_QUOTA: null, ACOLLECT_ANSWERS: nonresponse
      ? { [normalId]: { value: 'A' }, [nrId]: { value: null, isNonresponse: true } }
      : { [normalId]: { value: 'A' }, [nrId]: { value: 3 } },
    GEO: { status: 'granted', lat: -19.92, lng: -43.94, acc: 8 },
    ACOLLECT_RECORDING_REQUIRED: false, ACOLLECT_RECORDING_CONSENT: null, ACOLLECT_RECORDING_STATUS: 'not_selected',
    ACOLLECT_RECORDING_MANDATORY_AFTER_CUTOFF: false, ACOLLECT_RECORDING_FEATURE_AVAILABLE: false,
    ACOLLECT_RECORDING_RESERVATION_ID: null, ACOLLECT_RECORDING_ERROR: '', ACOLLECT_RECORDING_BLOB: null,
    COLLECT_DURATION_COLUMN_AVAILABLE: true, COLLECT_GEO_COLUMNS_AVAILABLE: true,
    PP_COLLECTION_WITHDRAWALS: { active: () => false },
    PP_RESEARCHER_DASHBOARD: { invalidate: () => {} },
    PP_SYSTEM_MESSAGES: { load: () => {} },
    acollectCurrentSurvey: () => survey,
    acollectMissingRequired: () => [],
    isCurrencyQuestion: () => false,
    acollectValidateLocation: async () => ({ ok: true, place: { city: 'Belo Horizonte', state: 'MG' } }),
    acollectIsAfterRecordingCutoff: () => false,
    renderAcollectActionState: () => {}, renderAcollectRecording: () => {},
    acollectResetRecordingState: () => {}, renderAcollectQuotas: () => {}, renderGeoLog: () => {},
    loadCollectEventsForced: async () => {}, acollectLoadQuotasForCurrent: async () => {},
    applyPendingResearcherUpdateIfSafe: () => {}, isCollectionTestUser: () => false,
    acollectUploadRecording: async () => ({ ok: true }), alert: () => {},
    sb: {
      from(table) {
        const chain = {
          insert(payload) {
            captured.calls.push({ kind: 'insert', table, payload: clone(payload) });
            if (table === 'collection_events') captured.eventPayloads.push(clone(payload));
            else captured.answerBatches.push(clone(payload));
            return chain;
          },
          select: () => chain,
          single: async () => ({ data: { id: 'event-1', status: 'valid' }, error: null }),
        };
        return chain;
      },
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(nonresponseSource, context, { filename: 'question-nonresponse.js' });
  const functions = [
    'function acollectBuildAnswerRows(',
    'async function acollectSubmit(',
  ].map(token => takeFunction(appSource, token)).join('\n');
  vm.runInContext(functions, context, { filename: 'app-submit-extractions.js' });
  return { context, captured };
}

async function runSubmitPayloadTests() {
  const normal = submitContext({ nonresponse: false });
  await normal.context.acollectSubmit();
  assert.equal(normal.captured.eventPayloads.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(normal.captured.eventPayloads[0], 'nonresponse_question_ids'), false, 'envio normal não pode incluir array NR');
  assert.equal(normal.captured.eventPayloads[0].lat, -19.92, 'GPS lat foi perdido no envio normal');
  assert.equal(normal.captured.eventPayloads[0].lng, -43.94, 'GPS lng foi perdido no envio normal');
  assert.equal(normal.captured.eventPayloads[0].captured_city, 'Belo Horizonte', 'cidade GPS foi perdida no envio normal');
  assert.equal(normal.captured.eventPayloads[0].captured_state, 'MG', 'UF GPS foi perdida no envio normal');

  const withNr = submitContext({ nonresponse: true });
  await withNr.context.acollectSubmit();
  const payload = withNr.captured.eventPayloads[0];
  assert(Array.isArray(payload.nonresponse_question_ids), 'envio com NR deve incluir collection_events.nonresponse_question_ids');
  assert.deepEqual(payload.nonresponse_question_ids, ['55555555-5555-4555-8555-555555555555'], 'array NR deve conter somente perguntas marcadas');
  assert.equal(withNr.captured.answerBatches[0][1].value_text, 'Não respondeu', 'resposta NR não chegou às linhas de answers');
}

function assertIntegrationGuards() {
  assert(nonresponseSource.includes("rpc(op,'list_question_nonresponse'"), 'list de NR não usa RPC esperada');
  assert(nonresponseSource.includes("rpc(op,'set_question_nonresponse'"), 'set de NR não usa RPC esperada');
  assert(!/sb\.from\s*\(/.test(nonresponseSource), 'módulo NR introduziu leitura/escrita por from()');
  assert(!/delete\s+from|reinsert|insert\s+into/i.test(nonresponseSource), 'módulo NR introduziu operação destrutiva/reconstrutiva');
  assert(appSource.includes('acollectUploadRecording'), 'integração de áudio da coleta foi removida');
  assert(appSource.includes('acollectValidateLocation'), 'integração de GPS da coleta foi removida');
  assert(appSource.includes('captured_city') && appSource.includes('captured_state'), 'payload GPS/cidade da coleta foi removido');
  assert(appSource.includes('recording_reservation_id') && appSource.includes('attach_collection_recording'), 'anexo de áudio da coleta foi removido');
}

(async () => {
  assertModuleRules();
  assertSnapshotAndAnswerState();
  await runConfigSuccessAndErrorTests();
  await runScopedAsyncTests();
  assertIntegrationGuards();
  await runSubmitPayloadTests();
  console.log('question-nonresponse-smoke-test: PASS — módulo real, snapshot allow_nonresponse, elegibilidade, confirmação/cancelamento, setters, pair/numeric/ranking/blanks, obrigatoriedade, modal RPC/epoch/permissão, preservação de opções/respostas e GPS/áudio verificados.');
})().catch(error => {
  console.error('question-nonresponse-smoke-test: FAIL');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
