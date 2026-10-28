#!/usr/bin/env node
'use strict';

/*
 * Smoke test contratual do isolamento de coletas de teste.
 *
 * Este arquivo deliberadamente não importa/executa o app inteiro: ele lê
 * app.js, extrai as declarações das funções sob contrato e as avalia em uma
 * VM com estado, DOM, Supabase e rede totalmente stubados.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const APP_PATH = path.join(__dirname, 'app.js');
const EXACT_CALIBRATION_FLAG = 'Coleta de teste autorizada — calibração';

function findFunctionSource(source, name) {
  const declaration = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = declaration.exec(source);
  if (!match) return null;

  // Os helpers sob teste não têm chamadas nos parâmetros, mas podem ter
  // objetos padrão como options={}; esses objetos não são o corpo da função.
  const parametersEnd = source.indexOf(')', match.index + match[0].length);
  const open = source.indexOf('{', parametersEnd);
  if (open < 0) return null;

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
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }

  return null;
}

function extractFunctions(source, names) {
  const snippets = [];
  const missing = [];
  for (const name of names) {
    const snippet = findFunctionSource(source, name);
    if (!snippet) missing.push(name);
    else snippets.push(snippet);
  }
  return { snippets, missing };
}

function makeFixtures() {
  const profiles = [
    {
      id: 'user-test-marked',
      name: 'Marcado por evento',
      role: 'pesq',
      status: 'ativo',
      phone: '5511999990001',
    },
    {
      id: 'user-test-legacy',
      name: 'Nome arbitrário legado',
      role: 'pesq',
      status: 'encerrado',
      is_collection_test_user: true,
      phone: '5511999990002',
    },
    {
      id: 'user-test-camel',
      name: 'Perfil legado camelCase',
      role: 'pesq',
      status: 'encerrado',
      isCollectionTestUser: true,
      phone: '5511999990004',
    },
    {
      id: 'user-current-test',
      name: 'Perfil próprio de calibração',
      role: 'pesq',
      status: 'encerrado',
      phone: '5511999990003',
    },
    {
      id: 'user-real-name-only',
      name: 'Adm Pesquisador PesquisaPro',
      role: 'pesq',
      status: 'ativo',
      phone: '5511999990010',
    },
    {
      id: 'user-real-manual',
      name: 'Pesquisador real com calibração manual',
      role: 'pesq',
      status: 'ativo',
      phone: '5511999990011',
    },
    {
      id: 'user-real-rejected',
      name: 'Pesquisador real reprovado',
      role: 'pesq',
      status: 'ativo',
      phone: '5511999990012',
    },
    {
      id: 'user-real-pending',
      name: 'Pesquisador real pendente',
      role: 'pesq',
      status: 'ativo',
      phone: '5511999990013',
    },
  ];

  const currentProfile = {
    id: 'user-current-test',
    name: 'Perfil próprio de calibração',
    role: 'pesq',
    status: 'encerrado',
    isCollectionTestUser: true,
  };

  const rows = [
    {
      id: 'event-test-flag',
      survey_id: 'survey-1',
      researcher_id: 'user-test-marked',
      flags: [EXACT_CALIBRATION_FLAG],
      is_calibration: true,
      lat: '-23.550520',
      lng: '-46.633308',
      accuracy_m: 7,
      occurred_at: '2026-10-28T14:00:00.000Z',
      synced: true,
      status: 'valid',
      recording_required: true,
      recording_consent: true,
      recording_status: 'pending_upload',
      duration_seconds: 74,
      recording_path: 'collection-recordings/event-test-flag.webm',
    },
    {
      id: 'event-test-legacy',
      survey_id: 'survey-1',
      researcher_id: 'user-test-legacy',
      flags: [],
      is_calibration: false,
      lat: '-22.906847',
      lng: '-43.172897',
      accuracy_m: 9,
      occurred_at: '2026-10-28T15:00:00.000Z',
      synced: true,
      status: 'valid',
    },
    {
      id: 'event-test-current-profile',
      survey_id: 'survey-1',
      researcher_id: 'user-current-test',
      flags: [],
      is_calibration: false,
      lat: '10.000000',
      lng: '20.000000',
      accuracy_m: 5,
      occurred_at: '2026-10-28T16:00:00.000Z',
      synced: false,
      status: 'pending_recording',
    },
    {
      id: 'event-real-name-only',
      survey_id: 'survey-1',
      researcher_id: 'user-real-name-only',
      flags: [],
      is_calibration: false,
      lat: '-19.916681',
      lng: '-43.934493',
      accuracy_m: 11,
      occurred_at: '2026-10-28T17:00:00.000Z',
      synced: true,
      status: 'valid',
    },
    {
      id: 'event-real-manual-calibration',
      survey_id: 'survey-1',
      researcher_id: 'user-real-manual',
      flags: [],
      is_calibration: true,
      lat: '-25.428954',
      lng: '-49.267137',
      accuracy_m: 13,
      occurred_at: '2026-10-28T18:00:00.000Z',
      synced: true,
      status: 'valid',
    },
    {
      id: 'event-real-rejected',
      survey_id: 'survey-1',
      researcher_id: 'user-real-rejected',
      flags: [],
      is_calibration: false,
      lat: '-30.034647',
      lng: '-51.217658',
      accuracy_m: 15,
      occurred_at: '2026-10-28T19:00:00.000Z',
      synced: true,
      status: 'rejected',
      reject_reason: 'GPS incompatível',
    },
    {
      id: 'event-real-pending',
      survey_id: 'survey-1',
      researcher_id: 'user-real-pending',
      flags: [],
      is_calibration: false,
      lat: '-3.731862',
      lng: '-38.526669',
      accuracy_m: 18,
      occurred_at: '2026-10-28T20:00:00.000Z',
      synced: false,
      status: 'valid',
    },
    {
      id: 'event-other-survey',
      survey_id: 'survey-2',
      researcher_id: 'user-real-name-only',
      flags: [],
      is_calibration: false,
      lat: '-8.047562',
      lng: '-34.877003',
      accuracy_m: 20,
      occurred_at: '2026-10-28T21:00:00.000Z',
      synced: true,
      status: 'valid',
    },
  ];

  return {
    profiles,
    currentProfile,
    rows,
    surveys: [{ id: 'survey-1', name: 'Pesquisa contratual' }, { id: 'survey-2', name: 'Outra pesquisa' }],
  };
}

function createContext(fixtures) {
  const context = {
    console,
    Date,
    Intl,
    JSON,
    Math,
    Map,
    Set,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Promise,
    isFinite,
    parseInt,
    parseFloat,
    USERS: fixtures.profiles,
    CURRENT_PROFILE: fixtures.currentProfile,
    SURVEYS: fixtures.surveys,
    COLLECT_EVENTS: [],
    COLLECT_EVENTS_LOADED: true,
    selectedRole: 'admin',
    _collectMapFilters: { researcher: 'all', researcherQuery: '', status: 'all', latest: false },
    renderAudit: () => {},
    window: {},
    document: {},
    alert: () => {},
    sb: null,
  };
  return vm.createContext(context);
}

function runSnippet(context, snippet, label) {
  try {
    vm.runInContext(snippet, context, { filename: `${path.basename(APP_PATH)}:${label}` });
  } catch (error) {
    error.message = `falha ao extrair ${label}: ${error.message}`;
    throw error;
  }
}

function makeEntry(context, row) {
  return context.collectionEventRowToEntry(row);
}

async function main() {
  if (!fs.existsSync(APP_PATH)) {
    throw new Error(`app.js não encontrado em ${APP_PATH}`);
  }

  const source = fs.readFileSync(APP_PATH, 'utf8');
  const requiredFunctions = [
    'isCollectionTestEvent',
    'collectionEventRowToEntry',
    'eventsForSurveyIdx',
    'collectMapFilterEvents',
    'reportsGeoNormalizeRows',
    'reportsGeoStatus',
    'reportsGeoModel',
    'auditToggleCalibration',
  ];
  const optionalFunctions = ['collectMapDisplayPositions', 'collectionNightAudioIssue'];
  const required = extractFunctions(source, requiredFunctions);
  const optional = extractFunctions(source, optionalFunctions);
  if (required.missing.length) {
    throw new Error(`funções do contrato ausentes no app.js: ${required.missing.join(', ')}`);
  }

  const fixtures = makeFixtures();
  const context = createContext(fixtures);
  const snippets = [...required.snippets, ...optional.snippets];
  const helper = findFunctionSource(source, 'isCollectionTestUser');
  if (helper) snippets.unshift(helper);
  for (const snippet of snippets) {
    const name = snippet.match(/function\s+([A-Za-z0-9_$]+)/)?.[1] || 'função';
    runSnippet(context, snippet, name);
  }

  const checks = [];
  const failures = [];
  const skipped = [];
  async function check(name, fn) {
    try {
      await fn();
      checks.push(name);
      console.log(`ok - ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.error(`not ok - ${name}: ${error.message}`);
    }
  }

  const exactFlagEvent = {
    id: 'synthetic-flag-event',
    researcherId: 'user-real-name-only',
    calibration: true,
    flags: [EXACT_CALIBRATION_FLAG],
  };
  const camelMarkedEvent = { id: 'synthetic-camel-event', researcherId: 'user-real-name-only', isTestCollection: true };
  const snakeMarkedEvent = { id: 'synthetic-snake-event', researcher_id: 'user-real-name-only', is_collection_test: true };
  const legacyEvent = { id: 'synthetic-legacy-event', researcher_id: 'user-test-legacy' };
  const camelProfileEvent = { id: 'synthetic-camel-profile-event', researcherId: 'user-test-camel' };
  const currentProfileEvent = { id: 'synthetic-current-event', researcherId: 'user-current-test' };
  const realNameOnlyEvent = { id: 'synthetic-real-name-event', researcherId: 'user-real-name-only' };

  await check('isCollectionTestEvent reconhece a flag exata de calibração', () => {
    assert.equal(context.isCollectionTestEvent(exactFlagEvent), true);
  });
  await check('marca avulsa sem calibração nem perfil autorizado não oculta coleta real', () => {
    assert.equal(context.isCollectionTestEvent({...exactFlagEvent,calibration:false}), false);
  });
  await check('isCollectionTestEvent reconhece isTestCollection=true', () => {
    assert.equal(context.isCollectionTestEvent(camelMarkedEvent), true);
  });
  await check('isCollectionTestEvent reconhece is_collection_test=true', () => {
    assert.equal(context.isCollectionTestEvent(snakeMarkedEvent), true);
  });
  await check('perfil legado por UUID funciona sem depender de nome ou status ativo', () => {
    assert.equal(context.isCollectionTestEvent(legacyEvent), true);
  });
  await check('perfil legado camelCase por UUID também funciona', () => {
    assert.equal(context.isCollectionTestEvent(camelProfileEvent), true);
  });
  await check('flag do CURRENT_PROFILE funciona para o próprio ID no histórico inativo', () => {
    assert.equal(context.isCollectionTestEvent(currentProfileEvent), true);
  });
  await check('nome parecido com teste, sem flag, não concede permissão', () => {
    assert.equal(context.isCollectionTestEvent(realNameOnlyEvent), false);
  });

  const entries = fixtures.rows.map(row => makeEntry(context, row));
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  context.COLLECT_EVENTS = entries;

  await check('collectionEventRowToEntry marca testes e força calibração histórica', () => {
    for (const id of ['event-test-flag', 'event-test-legacy', 'event-test-current-profile']) {
      const entry = byId.get(id);
      assert.equal(entry.isTestCollection, true, `${id}: isTestCollection`);
      assert.equal(entry.calibration, true, `${id}: calibration`);
    }
  });
  await check('coordenadas e evidências de áudio permanecem no histórico restrito', () => {
    const entry = byId.get('event-test-flag');
    assert.equal(entry.lat, -23.55052);
    assert.equal(entry.lng, -46.633308);
    assert.equal(entry.acc, 7);
    assert.equal(entry.recordingRequired, true);
    assert.equal(entry.recordingConsent, true);
    assert.equal(entry.recordingStatus, 'pending_upload');
    assert.equal(entry.durationSeconds, 74);
    assert.equal(entry.recordingPath, 'collection-recordings/event-test-flag.webm');
  });
  await check('pesquisador real com nome histórico não é marcado nem excluído', () => {
    const entry = byId.get('event-real-name-only');
    assert.equal(entry.isTestCollection, false);
    assert.equal(entry.calibration, false);
  });
  await check('calibração manual real continua representada na auditoria', () => {
    const entry = byId.get('event-real-manual-calibration');
    assert.equal(entry.isTestCollection, false);
    assert.equal(entry.calibration, true);
  });

  const rawIdsBefore = context.COLLECT_EVENTS.map(event => event.id);
  await check('eventsForSurveyIdx exclui testes sem destruir o cache bruto', () => {
    const visible = context.eventsForSurveyIdx(0);
    assert.equal(visible.some(event => event.isTestCollection), false);
    assert.deepEqual(visible.map(event => event.id).sort(), [
      'event-real-manual-calibration',
      'event-real-name-only',
      'event-real-pending',
      'event-real-rejected',
    ].sort());
    assert.deepEqual(context.COLLECT_EVENTS.map(event => event.id), rawIdsBefore);
    assert.equal(context.COLLECT_EVENTS.length, fixtures.rows.length);
    assert.equal(context.COLLECT_EVENTS.some(event => event.id === 'event-test-flag'), true);
  });

  const mapFilters = [
    ['all', { researcher: 'all', researcherQuery: '', status: 'all', latest: false }],
    ['valid', { researcher: 'all', researcherQuery: '', status: 'valid', latest: false }],
    ['rejected', { researcher: 'all', researcherQuery: '', status: 'rejected', latest: false }],
    ['calibration', { researcher: 'all', researcherQuery: '', status: 'calibration', latest: false }],
    ['pending', { researcher: 'all', researcherQuery: '', status: 'pending', latest: false }],
    ['latest', { researcher: 'all', researcherQuery: '', status: 'all', latest: true }],
  ];
  for (const [label, filter] of mapFilters) {
    await check(`collectMapFilterEvents não retorna testes no filtro ${label}`, () => {
      context._collectMapFilters = filter;
      const result = context.collectMapFilterEvents(context.COLLECT_EVENTS);
      assert.equal(result.some(event => event.isTestCollection === true), false);
      assert.equal(result.some(event => event.id.startsWith('event-test-')), false);
    });
  }

  await check('reportsGeoNormalizeRows remove testes antes do modelo geográfico', () => {
    const normalized = context.reportsGeoNormalizeRows(fixtures.rows);
    assert.equal(normalized.some(event => event.id.startsWith('event-test-')), false);
    assert.equal(normalized.some(event => event.id === 'event-real-name-only'), true);
    assert.equal(normalized.some(event => event.id === 'event-real-manual-calibration'), true);
  });
  await check('reportsGeoModel remove testes mesmo se receber um cache contaminado', () => {
    const normalized = context.reportsGeoNormalizeRows(fixtures.rows);
    const contaminated = normalized.concat({
      id: 'synthetic-model-test',
      researcherId: 'user-test-legacy',
      researcherName: 'Nome arbitrário legado',
      status: 'valid',
      calibration: true,
      isTestCollection: true,
      hasGps: true,
      lat: 80,
      lng: 170,
      occurredAt: '2026-10-28T22:00:00.000Z',
    });
    const model = context.reportsGeoModel(contaminated, { researcher: 'all', status: 'all' });
    assert.equal(model.total, normalized.length);
    assert.equal(model.selected, normalized.length);
    assert.equal(model.areas.some(area => area.lat === 80 && area.lng === 170), false);
  });

  await check('extrato não classifica entrevistas de teste como pagas, a pagar ou reprovadas', () => {
    const statement = findFunctionSource(source, 'financeStatementRender');
    assert(statement, 'renderizador do extrato ausente');
    const boundary = statement.indexOf('  const price=');
    assert(boundary > 0, 'filtros iniciais do extrato ausentes');
    const prefix = statement.slice(0,boundary).replace('function financeStatementRender(', 'function statementFilters(');
    runSnippet(context, prefix + 'return {validEvents,auditEvents,rejectedEvents};\n}', 'statementFilters');
    const groups = context.statementFilters({}, {}, {}, context.COLLECT_EVENTS, {});
    for(const rows of Object.values(groups))assert.equal(rows.some(event=>context.isCollectionTestEvent(event)),false);
    assert.equal(groups.validEvents.some(event=>event.id==='event-real-name-only'),true);
  });

  await check('mapa oficial usa somente posições de eventos não-testes', () => {
    if (typeof context.collectMapDisplayPositions !== 'function') {
      skipped.push('collectMapDisplayPositions não disponível');
      return;
    }
    const official = context.collectMapFilterEvents(context.eventsForSurveyIdx(0));
    const positions = context.collectMapDisplayPositions(official);
    assert.equal(positions.has('event-test-flag'), false);
    assert.equal(positions.has('event-test-legacy'), false);
    assert.equal(positions.has('event-real-name-only'), true);
    assert.equal(positions.has('event-real-manual-calibration'), true);

    const real = byId.get('event-real-name-only');
    const collocatedTest = {
      id: 'event-test-collocated',
      isTestCollection: true,
      name: 'Perfil de teste',
      lat: real.lat,
      lng: real.lng,
      ts: real.ts + 1,
    };
    const withTest = context.collectMapFilterEvents(official.concat(collocatedTest));
    const withTestPositions = context.collectMapDisplayPositions(withTest);
    const realPosition = withTestPositions.get(real.id);
    assert.equal(realPosition[0], real.lat);
    assert.equal(realPosition[1], real.lng);
    assert.equal(withTestPositions.has(collocatedTest.id), false);
  });

  let alerts = [];
  let sbCalls = 0;
  let updateCalls = 0;
  context.alert = message => alerts.push(String(message));
  context.sb = {
    from() {
      sbCalls += 1;
      return {
        update(payload) {
          updateCalls += 1;
          return {
            eq() {
              return Promise.resolve({ error: null, payload });
            },
          };
        },
      };
    },
  };

  await check('auditToggleCalibration alerta antes de qualquer sb call para teste', async () => {
    alerts = [];
    sbCalls = 0;
    updateCalls = 0;
    const testEntry = byId.get('event-test-flag');
    const before = testEntry.calibration;
    await context.auditToggleCalibration(testEntry.id);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /teste|calibra/i);
    assert.equal(sbCalls, 0);
    assert.equal(updateCalls, 0);
    assert.equal(testEntry.calibration, before);
  });
  await check('auditToggleCalibration mantém calibração manual real acessível', async () => {
    alerts = [];
    sbCalls = 0;
    updateCalls = 0;
    const realEntry = byId.get('event-real-manual-calibration');
    assert.equal(realEntry.calibration, true);
    await context.auditToggleCalibration(realEntry.id);
    assert.equal(alerts.length, 0);
    assert.equal(sbCalls, 1);
    assert.equal(updateCalls, 1);
    assert.equal(realEntry.calibration, false);
  });

  await check('regra de gravação pós-21h continua observável quando a função existe', () => {
    if (typeof context.collectionNightAudioIssue !== 'function') {
      skipped.push('collectionNightAudioIssue não disponível');
      return;
    }
    const entry = byId.get('event-test-flag');
    assert.equal(context.collectionNightAudioIssue(entry), false, 'o fixture inicial não é pós-21h');
    const after21 = {
      ...entry,
      ts: new Date('2026-10-29T00:30:00.000Z').getTime(),
      status: 'valid',
      recordingStatus: 'pending_upload',
    };
    assert.equal(context.collectionNightAudioIssue(after21), true);
  });

  console.log(`\nSmoke test: ${checks.length} ok, ${failures.length} falha(s), ${skipped.length} opcional(is) ignorado(s).`);
  if (skipped.length) console.log(`Ignorados: ${skipped.join('; ')}`);
  if (failures.length) {
    const detail = failures.map(({ name, error }) => `- ${name}: ${error.stack || error.message}`).join('\n');
    throw new Error(`Contrato de isolamento não atendido:\n${detail}`);
  }
}

main().catch(error => {
  console.error(`\nSMOKE TEST FALHOU: ${error.stack || error.message}`);
  process.exitCode = 1;
});
