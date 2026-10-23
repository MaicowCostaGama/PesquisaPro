'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PROJECT_DIR = __dirname;
const APP_PATH = path.join(PROJECT_DIR, 'app.js');
const JSPDF_PATH = path.join(PROJECT_DIR, 'vendor', 'jspdf.umd.min.js');
const IMPORTED_PREFIX = 'IMPORTED_LABEL_';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeImportedOptions(kind, count) {
  // Keep whitespace-only cells beside the synthetic values: the PDF summary must
  // count only trimmed, non-empty cells and must never print these labels.
  return Array.from({length: count}, (_, index) => `${IMPORTED_PREFIX}${kind}_${index + 1}`)
    .concat(['', '   ', '\t', '\n']);
}

function makeSourceSnapshot() {
  return {
    id: 'editor-snapshot-001',
    name: 'Pesquisa Smoke Test Excel',
    tipo: 'Pesquisa de validação',
    dataIni: '2026-01-02',
    dataFim: '2026-01-31',
    abrangencia: 'estadual',
    estados: ['SP'],
    cidades: {SP: ['São Paulo']},
    pop: 8500000,
    clientes: ['Cliente Smoke'],
    questions: [
      {
        id: 'q-single-imported',
        text: 'Escolha única importada',
        type: 'single',
        optionsImported: true,
        opts: makeImportedOptions('SINGLE', 8500),
        endsInterview: [false],
      },
      {
        id: 'q-multi-imported',
        text: 'Múltipla importada',
        type: 'multi',
        optionsImported: true,
        opts: makeImportedOptions('MULTI', 10000),
        endsInterview: [false],
      },
      {
        id: 'q-ranking-imported',
        text: 'Ranking importado',
        type: 'ranking',
        optionsImported: true,
        opts: ['   ', `${IMPORTED_PREFIX}RANKING_1`, '\n'],
        endsInterview: [false],
      },
      {
        id: 'q-pair-mixed',
        text: 'Duas respostas: importada e manual',
        type: 'pair',
        // The non-boolean flag must remain false; only literal true imports.
        fieldOptionsImported: ['true', true],
        fields: [
          {
            label: 'Campo manual',
            type: 'single',
            options: ['MANUAL_PAIR_LEFT_A', '   ', 'MANUAL_PAIR_LEFT_B'],
          },
          {
            label: 'Campo importado',
            type: 'single',
            options: [`${IMPORTED_PREFIX}PAIR_RIGHT_1`, ' ', `${IMPORTED_PREFIX}PAIR_RIGHT_2`],
          },
        ],
      },
      {
        id: 'q-strict-flag',
        text: 'Lista manual com flag não estrita',
        type: 'single',
        optionsImported: 'true',
        opts: ['MANUAL_STRICT_A', ' ', 'MANUAL_STRICT_B'],
        endsInterview: [false, false],
      },
    ],
    // Extra snapshot-only fields model saved survey records and must not affect
    // the normalized PDF data.
    saved_at: '2026-02-01T10:00:00.000Z',
    db_revision: 7,
  };
}

function loadLiveSurveyPdfBlock() {
  const app = fs.readFileSync(APP_PATH, 'utf8');
  const start = app.indexOf('function surveyFormPdfData(');
  const end = app.indexOf('async function surveyFormPdfDownload(', start);
  if (start < 0 || end < 0) {
    throw new Error('Não foi possível localizar o bloco surveyFormPdfData…surveyFormPdfDownload em app.js.');
  }
  const block = app.slice(start, end);
  const required = [
    'optionsImported',
    'fieldOptionsImported',
    'surveyFormPdfImportedOptionsSummary',
  ];
  const missing = required.filter(marker => !block.includes(marker));
  if (missing.length) {
    return {
      ready: false,
      message: `Teste preparado, mas a implementação ainda não está presente (faltam: ${missing.join(', ')}).`,
    };
  }

  const {jsPDF} = require(JSPDF_PATH);
  if (typeof jsPDF !== 'function') throw new Error('vendor/jspdf.umd.min.js não expôs jsPDF.');

  // These are deliberately small VM stubs for the report-only dependencies. The
  // PDF document and all survey-PDF functions remain the real app/jsPDF code.
  const context = vm.createContext({
    console,
    Q_HAS_OPTS: type => type === 'single' || type === 'multi' || type === 'ranking',
    Q_CLOSED_FIELD_TYPES: ['single', 'multi'],
    questionTypeLabel: question => ({
      single: 'Escolha única',
      multi: 'Múltipla escolha',
      ranking: 'Ranking de preferências',
      pair: 'Duas respostas',
    })[question?.type] || question?.type || 'Pergunta',
    DEFAULT_PAIR_FIELDS: () => [
      {label: 'Resposta 1', type: 'open', options: []},
      {label: 'Resposta 2', type: 'open', options: []},
    ],
    ABRANGENCIA_LABELS: {
      municipal: 'Municipal',
      'regional-estadual': 'Regional estadual',
      estadual: 'Estadual',
      'regional-nacional': 'Regional nacional',
      nacional: 'Nacional',
    },
    fmtDataBR: value => String(value || '—'),
    reportsPdfHeader(doc, title, subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(String(title || 'Relatório'), 16, 12);
      if (subtitle) doc.text(String(subtitle), 16, 17);
      return 25;
    },
    reportsPdfFooter(doc) {
      const pages = doc.internal.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Página ${page} de ${pages}`, 16, 285);
      }
    },
  });
  vm.runInContext(block, context, {filename: APP_PATH});
  return {ready: true, context, jsPDF};
}

function assertNormalizedFlags(data) {
  for (const question of data.questions) {
    assert.equal(typeof question.optionsImported, 'boolean', 'flag de pergunta deve ser booleano estrito');
    for (const field of question.fields) {
      assert.equal(typeof field.optionsImported, 'boolean', 'flag de subcampo deve ser booleano estrito');
    }
  }
  assert.strictEqual(data.questions[0].optionsImported, true);
  assert.strictEqual(data.questions[1].optionsImported, true);
  assert.strictEqual(data.questions[2].optionsImported, true);
  assert.strictEqual(data.questions[3].optionsImported, false);
  assert.deepStrictEqual(
    data.questions[3].fields.map(field => field.optionsImported),
    [false, true],
    'importação deve ser independente por subcampo',
  );
  assert.strictEqual(data.questions[4].optionsImported, false, '"true" não é true estrito');
}

function renderPdf(context, jsPDF, data) {
  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  const capturedTexts = [];
  const originalText = doc.text.bind(doc);
  doc.text = (text, ...args) => {
    capturedTexts.push(Array.isArray(text) ? text.map(String).join('\n') : String(text));
    return originalText(text, ...args);
  };

  // Exercise the real cover and question writer. Header/footer are the VM stubs
  // above, matching the production call contract without browser dependencies.
  context.surveyFormPdfCover(doc, data, null);
  doc.addPage();
  let y = context.reportsPdfHeader(doc, 'Formulário da pesquisa', data.name);
  for (let index = 0; index < data.questions.length; index += 1) {
    y = context.surveyFormPdfWriteQuestion(doc, data, data.questions[index], index, y);
  }
  context.reportsPdfFooter(doc);

  const pdf = doc.output('arraybuffer');
  assert.ok(pdf.byteLength > 1000, 'jsPDF real deve exportar um PDF não vazio');
  return {
    texts: capturedTexts,
    allText: capturedTexts.join('\n'),
    pages: doc.internal.getNumberOfPages(),
  };
}

function run() {
  const loaded = loadLiveSurveyPdfBlock();
  if (!loaded.ready) {
    console.log(loaded.message);
    return;
  }

  const {context, jsPDF} = loaded;
  const editorLike = makeSourceSnapshot();
  const savedSurveyLike = clone(editorLike);
  savedSurveyLike.id = 'saved-survey-snapshot-001';
  savedSurveyLike.saved_record = true;
  const editorBefore = clone(editorLike);
  const savedBefore = clone(savedSurveyLike);

  const editorData = context.surveyFormPdfData(editorLike);
  const savedData = context.surveyFormPdfData(savedSurveyLike);

  // Normalization is deterministic for editor and saved-survey snapshots, while
  // unrelated saved-record metadata is ignored.
  assert.deepStrictEqual(savedData, editorData, 'editor e snapshot salvo devem gerar os mesmos dados PDF');
  assertNormalizedFlags(editorData);
  assert.deepStrictEqual(editorLike, editorBefore, 'a fonte do editor não pode ser mutada');
  assert.deepStrictEqual(savedSurveyLike, savedBefore, 'a fonte salva não pode ser mutada');
  assert.deepStrictEqual(editorLike.questions[0].opts, editorBefore.questions[0].opts);
  assert.deepStrictEqual(editorLike.questions[3].fields, editorBefore.questions[3].fields);

  const summary = context.surveyFormPdfImportedOptionsSummary;
  assert.strictEqual(summary([]), '0 opções de escolha disponíveis (importadas do Excel).');
  assert.strictEqual(summary([' ', '\t', '\n']), '0 opções de escolha disponíveis (importadas do Excel).');
  assert.strictEqual(summary(['  uma opção  ']), '1 opção de escolha disponível (importada do Excel).');
  assert.strictEqual(summary(['A', ' ', 'B', '\n']), '2 opções de escolha disponíveis (importadas do Excel).');

  const editorRender = renderPdf(context, jsPDF, editorData);
  const savedRender = renderPdf(context, jsPDF, savedData);
  assert.deepStrictEqual(savedRender.texts, editorRender.texts, 'PDF textual do editor e do snapshot salvo deve ser igual');
  assert.strictEqual(savedRender.pages, editorRender.pages, 'paginação do editor e do snapshot salvo deve ser igual');
  assert.ok(editorRender.pages >= 1 && editorRender.pages <= 5, `paginação curta esperada (1–5), obtida: ${editorRender.pages}`);

  const allText = editorRender.allText;
  assert.ok(allText.includes('8.500 opções de escolha disponíveis (importadas do Excel).'));
  assert.ok(allText.includes('10.000 opções de escolha disponíveis (importadas do Excel).'));
  assert.ok(allText.includes('1 opção de escolha disponível (importada do Excel).'));
  assert.ok(allText.includes('2 opções de escolha disponíveis (importadas do Excel).'));
  assert.ok(!allText.includes(IMPORTED_PREFIX), 'labels importados não podem aparecer no PDF');
  for (const manualLabel of [
    'MANUAL_PAIR_LEFT_A',
    'MANUAL_PAIR_LEFT_B',
    'MANUAL_STRICT_A',
    'MANUAL_STRICT_B',
  ]) {
    assert.ok(allText.includes(manualLabel), `label manual ausente do PDF: ${manualLabel}`);
  }
  assert.ok(!allText.includes('MANUAL_PAIR_LEFT_A\n   '), 'células apenas com espaços não devem virar opções');

  console.log(`OK: smoke test survey PDF Excel/importado passou (editor + salvo, ${editorRender.pages} página(s), jsPDF real).`);
}

try {
  run();
} catch (error) {
  console.error(`FALHA: ${error.stack || error}`);
  process.exitCode = 1;
}
