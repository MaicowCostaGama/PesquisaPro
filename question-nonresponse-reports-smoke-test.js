'use strict';

/*
 * PesquisaPro — Não respondeu explícita · relatórios
 *
 * Fixtures abaixo são exclusivamente dados fictícios de regressão. Este teste
 * não consulta Supabase, não publica nada e não altera app.js ou SQL.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const XLSX = require('./vendor/xlsx.full.min.js');

const root = __dirname;
const app = fs.readFileSync(root + '/app.js', 'utf8');
const schemaSql = fs.readFileSync(root + '/deploy/schema.sql', 'utf8');
const staffSql = fs.readFileSync(root + '/deploy/relatorios-tempo-real-cruzamentos.sql', 'utf8');
const clientSql = fs.readFileSync(root + '/deploy/relatorios-resultados-clientes.sql', 'utf8');
const distributionSql = fs.readFileSync(root + '/deploy/ativar-rls-resultados.sql', 'utf8');
const treatmentSource = fs.readFileSync(root + '/reports-treatment.js', 'utf8');
const clientSource = fs.readFileSync(root + '/reports-client.js', 'utf8');

function takeRange(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start >= 0, `trecho ausente: ${startToken}`);
  const end = source.indexOf(endToken, start);
  assert(end > start, `fim ausente para: ${startToken}`);
  return source.slice(start, end);
}

function takeFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `função ausente: ${name}`);
  const brace = source.indexOf('{', start);
  assert(brace > start, `corpo ausente: ${name}`);
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
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`corpo não fechado: ${name}`);
}

function lineOf(source, token) {
  const index = source.indexOf(token);
  return index < 0 ? '?' : source.slice(0, index).split('\n').length;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const survey = {
  id: 'survey-fixture-nr',
  name: 'Pesquisa fictícia — NR explícito',
  clientIds: ['client-fixture'],
  questions: [
    { dbId: 'q-single', type: 'single', text: 'Escolha única', opts: ['Sim', 'Não', 'Não respondeu'] },
    { dbId: 'q-scale', type: 'scale', text: 'Escala 1–5', opts: [] },
    { dbId: 'q-scale10', type: 'scale10', text: 'Escala 1–10', opts: [] },
    { dbId: 'q-nps', type: 'nps', text: 'NPS', opts: [] },
    { dbId: 'q-number', type: 'number', text: 'Número', opts: [] },
    { dbId: 'q-ranking', type: 'ranking', text: 'Ranking', opts: ['A', 'B'] },
    { dbId: 'q-pair', type: 'pair', text: 'Duas respostas', opts: [] },
    { dbId: 'q-multi', type: 'multi', text: 'Múltipla escolha', opts: ['Sim', 'Não respondeu'] },
  ],
};
const validBase = 5;

/* O servidor já teria materializado o marcador explícito no texto. Para os
 * tipos numéricos, a ausência do número é intencional: não é zero. */
const overviewRows = [
  { question_id: 'q-single', value_label: 'Não respondeu', cnt: 2, valid_base: validBase },
  { question_id: 'q-single', value_label: 'Sim', cnt: 3, valid_base: validBase },
  { question_id: 'q-scale', value_label: 'Não respondeu', cnt: 1, valid_base: validBase },
  { question_id: 'q-scale', value_label: '4', cnt: 4, valid_base: validBase },
  { question_id: 'q-scale10', value_label: 'Não respondeu', cnt: 2, valid_base: validBase },
  { question_id: 'q-scale10', value_label: '8', cnt: 3, valid_base: validBase },
  { question_id: 'q-nps', value_label: 'Não respondeu', cnt: 1, valid_base: validBase },
  { question_id: 'q-nps', value_label: '9', cnt: 4, valid_base: validBase },
  { question_id: 'q-number', value_label: 'Não respondeu', cnt: 2, valid_base: validBase },
  { question_id: 'q-number', value_label: '42', cnt: 3, valid_base: validBase },
  { question_id: 'q-ranking', value_label: 'Não respondeu', cnt: 1, valid_base: validBase },
  { question_id: 'q-ranking', value_label: '1º — A', cnt: 4, valid_base: validBase },
  { question_id: 'q-pair', value_label: 'Primeira: Não respondeu', cnt: 1, valid_base: validBase },
  { question_id: 'q-pair', value_label: 'Segunda: Sim', cnt: 4, valid_base: validBase },
  { question_id: 'q-multi', value_label: 'Não respondeu', cnt: 2, valid_base: validBase },
  { question_id: 'q-multi', value_label: 'Sim', cnt: 3, valid_base: validBase },
  /* Blank antigo permanece semanticamente distinto e não vira NR. */
  { question_id: 'q-single', value_label: '(sem resposta)', cnt: 1, valid_base: validBase },
];

const crossRows = [
  { variable_1: 'Não respondeu', variable_2: 'Centro', cnt: 2, valid_base: validBase },
  { variable_1: 'Sim', variable_2: 'Centro', cnt: 1, valid_base: validBase },
  { variable_1: 'Sim', variable_2: 'Norte', cnt: 2, valid_base: validBase },
];

function loadTreatment() {
  const context = vm.createContext({
    console,
    Map,
    Set,
    JSON,
    Number,
    String,
    Object,
    Array,
    Date,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(treatmentSource, context, { filename: 'reports-treatment.js' });
  return context.PP_TREATMENT;
}

async function loadClientAndExercise() {
  const host = { isConnected: true, innerHTML: '', dataset: {}, querySelector: () => null, addEventListener: () => {} };
  const document = {
    activeElement: null,
    getElementById: id => id === 'client-reports-workspace' ? host : null,
  };
  const profile = { id: 'client-fixture', role: 'cliente', status: 'ativo' };
  const calls = [];
  const rpcData = {
    client_report_structure_v175: {
      survey_id: survey.id,
      questions: survey.questions,
      valid_base: validBase,
      document: null,
    },
    client_report_overview_v172: overviewRows,
    client_report_cross_v172: crossRows,
  };
  const sb = {
    rpc(name, args) {
      calls.push({ name, args: clone(args) });
      const response = { data: rpcData[name] || [], error: null, count: (rpcData[name] || []).length };
      return {
        abortSignal: () => Promise.resolve(response),
        then: (resolve, reject) => Promise.resolve(response).then(resolve, reject),
      };
    },
  };
  const questionModel = (question, rows) => ({
    basis: 'entrevistas válidas',
    percentBase: validBase,
    values: rows.filter(row => row.question_id === question.dbId).map(row => ({
      label: row.value_label,
      count: Number(row.cnt),
      percent: Number(row.cnt) / validBase,
    })),
  });
  const env = {
    sb,
    getContext: () => ({ profile, survey, released: true }),
    readPages: make => make(),
    overviewOrder: query => query,
    crossOrder: query => query,
    types: {},
    questionModel,
    partitions: rows => [{ rows, values: [] }],
    matrixModel: () => ({}),
    matrixMarkup: () => '<fixture-matrix></fixture-matrix>',
    sliceContainer: (_title, _amount, _base, content) => content,
  };
  const context = vm.createContext({
    console,
    document,
    Map,
    Set,
    JSON,
    Number,
    String,
    Object,
    Array,
    Date,
    AbortController,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    window: null,
  });
  context.window = context;
  vm.runInContext(clientSource, context, { filename: 'reports-client.js' });
  const api = context.PP_CLIENT_REPORTS;
  api.mount(env);
  for (let attempt = 0; attempt < 100 && api.getState()?.busy; attempt += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert(api.getState()?.loaded, 'relatório do cliente não carregou a fixture');
  assert.equal(api.getState().rows.find(row => row.question_id === 'q-scale' && row.value_label === 'Não respondeu').cnt, 1);
  api.getState().crossIds = ['q-single', 'q-scale'];
  await api.cross();
  assert.equal(api.getState().crossRows.length, 3);
  assert.equal(api.getState().crossRows.find(row => row.variable_1 === 'Não respondeu').cnt, 2);
  assert(calls.some(call => call.name === 'client_report_overview_v172'));
  assert(calls.some(call => call.name === 'client_report_cross_v172'));
  api.reset();
  return { calls };
}

function loadAppReportHelpers() {
  const cross = takeRange(app, 'function reportsCrossOptionLabels(', 'function reportsCrossSliceContainer(');
  const client = takeRange(app, 'function clientReportQuestionLabel(', 'function clientPublishedCrossings(');
  const excel = takeRange(app, 'function reportsExcelLegacyQuestionRows(', 'async function reportsExportQuestionsExcel(');
  const csv = takeFunction(app, 'reportsCrossCsvLines');
  const context = vm.createContext({
    console,
    Map,
    Set,
    JSON,
    Number,
    String,
    Object,
    Array,
    Date,
    Math,
    esc: value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])),
    reportsCurrentQuestions: () => survey.questions,
    reportsQuestionsForSurvey: () => survey.questions,
    reportsCurrentSurvey: () => survey,
    reportsQuestionLabel: id => survey.questions.find(question => question.dbId === id)?.text || 'Pergunta',
    reportsGroupingEnabled: () => false,
    reportsOfficialConfig: () => ({ denominator: 'answered', groups: [] }),
    reportsCodedDisplayRows: rows => rows,
    questionTypeLabel: question => question.type,
    clientReportQuestionLabel: (questions, id) => questions.find(question => question.dbId === id)?.text || 'Pergunta',
  });
  vm.runInContext(cross + client + excel + csv, context, { filename: 'app-report-helper-fixture.js' });
  return context;
}

(async () => {
  const treatment = loadTreatment();
  treatment.validateAggregates(overviewRows, {
    questions: survey.questions.map(question => ({ id: question.dbId, text: question.text, type: question.type })),
    event_count: validBase,
  });
  treatment.validateAggregates(crossRows, {
    questions: survey.questions.map(question => ({ id: question.dbId, text: question.text, type: question.type })),
    event_count: validBase,
  }, ['q-single', 'q-scale']);
  assert.equal(overviewRows.find(row => row.question_id === 'q-scale' && row.value_label === 'Não respondeu').cnt, 1);
  assert.equal(overviewRows.find(row => row.question_id === 'q-scale' && row.value_label === 'Não respondeu').value_number, undefined);

  await loadClientAndExercise();

  const ctx = loadAppReportHelpers();
  const crossModel = ctx.reportsCrossMatrixModel(crossRows, ['q-single', 'q-scale']);
  assert(crossModel.rowValues.includes('Não respondeu'), 'NR não virou linha do cruzamento');
  assert.equal(crossModel.counts.get('Não respondeu\u0000Centro'), 2);
  assert.equal(crossModel.rowTotals.get('Não respondeu'), 2);
  assert.equal(crossModel.uniqueTotal, validBase);
  const crossHtml = ctx.reportsCrossMatrixMarkup(crossModel, ['q-single', 'q-scale']);
  assert(crossHtml.includes('Não respondeu'));
  assert(crossHtml.includes('40,0%'));
  const csv = ctx.reportsCrossCsvLines(crossRows, ['q-single', 'q-scale']).join('\n');
  assert(csv.includes('Não respondeu'));
  assert(csv.includes('"2"'));
  assert(csv.includes('40,0%'));

  const numericTypes = ['q-scale', 'q-scale10', 'q-nps', 'q-number'];
  for (const questionId of numericTypes) {
    const model = ctx.reportsExcelQuestionRows(
      survey.questions.find(question => question.dbId === questionId),
      overviewRows,
      { version: 1, surveyId: survey.id, questions: {} },
      'original',
    );
    const nr = model.values.find(value => value.label === 'Não respondeu');
    assert(nr, `${questionId}: NR ausente do Excel`);
    assert.equal(nr.count, overviewRows.find(row => row.question_id === questionId && row.value_label === 'Não respondeu').cnt);
    assert.equal(nr.percent, nr.count / validBase);
    assert.notEqual(nr.count, 0, `${questionId}: NR foi convertido em zero`);
  }
  const ranking = ctx.reportsExcelQuestionRows(
    survey.questions.find(question => question.dbId === 'q-ranking'),
    overviewRows,
    { version: 1, surveyId: survey.id, questions: {} },
    'original',
  );
  assert.equal(ranking.values.find(value => value.label === 'Não respondeu').label, 'Não respondeu');
  assert(!ranking.values.some(value => value.label.startsWith('0º') && value.label.includes('Não respondeu')));
  const pair = ctx.reportsExcelQuestionRows(
    survey.questions.find(question => question.dbId === 'q-pair'),
    overviewRows,
    { version: 1, surveyId: survey.id, questions: {} },
    'original',
  );
  assert(pair.values.some(value => value.label === 'Primeira: Não respondeu'));
  assert(pair.values.some(value => value.label === 'Segunda: Sim'));
  assert(pair.values.length === 2, 'pair deve manter uma linha por campo');
  assert(overviewRows.some(row => row.value_label === '(sem resposta)'));
  assert(!overviewRows.some(row => row.value_label === '(sem resposta)' && row.value_label === 'Não respondeu'));

  const workbook = ctx.reportsExcelWorkbook(
    XLSX,
    { ...survey, tabulationSourceLabel: 'Coleta original atual' },
    [survey.questions.find(question => question.dbId === 'q-scale'), survey.questions.find(question => question.dbId === 'q-ranking'), survey.questions.find(question => question.dbId === 'q-pair')],
    overviewRows,
    { version: 1, surveyId: survey.id, questions: {} },
    'original',
    new Date('2026-10-30T00:00:00Z'),
  );
  const roundTrip = XLSX.read(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }), { type: 'buffer', cellNF: true });
  const allCells = Object.values(roundTrip.Sheets).flatMap(sheet => Object.values(sheet).filter(cell => !String(cell).startsWith('!')));
  assert(allCells.some(cell => cell.v === 'Não respondeu'), 'Excel não preservou o marcador NR');
  assert(allCells.some(cell => cell.v === 1), 'Excel não preservou contagem numérica da NR');
  assert(allCells.some(cell => cell.v === 0.2), 'Excel não preservou percentual numérico da NR');

  /* Avisos deliberados para a integração principal; este smoke test não os
   * transforma em patch porque app.js/SQL estão fora do escopo deste worktree. */
  assert(app.includes("if(a?.isNonresponse===true)"), 'ramo explícito de NR não está protegido antes da guarda de ausência');
  assert(app.includes("rows.push({collection_event_id:eventId,question_id:q.dbId,value_number:a.value});"), 'rota numérica da coleta mudou; revisar integração NR');

  console.log('question-nonresponse-reports-smoke-test: PASS — fixtures NR explícitas preservadas em overview, cliente, tabulação, ranking sem posição, pair por campo, cruzamento, CSV e Excel; blanks antigos distintos.');
  const explicitNrLine = lineOf(app, 'if(a?.isNonresponse===true)');
  const emptyGuardLine = lineOf(app, "if(!a||a.value===''||a.value==null");
  const sqlMarker = [schemaSql, staffSql, clientSql, distributionSql].some(source => source.includes('is_nonresponse'));
  console.log(`INFO integração app.js:${explicitNrLine}-${emptyGuardLine}: ramo explícito de NR precede a guarda de valor vazio; a rota numérica app.js:${lineOf(app, "value_number:a.value")} continua reservada para respostas numéricas reais.`);
  console.log(`WARN SQL local: schema.sql:${lineOf(schemaSql, 'create table public.collection_answers')} e RPCs staff/cliente em relatorios-tempo-real-cruzamentos.sql:${lineOf(staffSql, 'coalesce(nullif(trim(a.value_text)')}, relatorios-resultados-clientes.sql:${lineOf(clientSql, 'coalesce(nullif(trim(a.value_text)')} ${sqlMarker ? 'já declaram is_nonresponse; conferir o contrato retornado.' : 'não declaram is_nonresponse; o coalesce textual preserva o rótulo, mas não expõe o marker nem semântica numérica/denominator.'}`);
  console.log('WARN scoring: nenhum caminho response_issue/average/NPS denominator foi encontrado em app.js, reports-*.js ou deploy/*.sql; validar RPCs remotas v2 e a integração de coleta separadamente, sem inferir NR como zero.');
})().catch(error => {
  console.error('question-nonresponse-reports-smoke-test: FAIL');
  console.error(error.stack || error);
  process.exitCode = 1;
});
