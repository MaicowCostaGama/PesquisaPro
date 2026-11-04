const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function ok(condition, message) {
  assert.ok(condition, message);
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = app.indexOf(marker);
  ok(start >= 0, `função real ausente no app.js: ${name}`);
  const open = app.indexOf('{', start + marker.length);
  ok(open >= 0, `abertura ausente na função real: ${name}`);

  let depth = 0;
  let state = 'code';
  let quote = '';
  let escaped = false;
  let regexClass = false;

  const previousToken = index => {
    let i = index - 1;
    while (i >= 0 && /\s/.test(app[i])) i -= 1;
    let end = i;
    while (i >= 0 && /[A-Za-z0-9_$]/.test(app[i])) i -= 1;
    return app.slice(i + 1, end + 1);
  };

  const canStartRegex = index => {
    let i = index - 1;
    while (i >= 0 && /\s/.test(app[i])) i -= 1;
    const previous = app[i] || '';
    return !previous || /[([{:;,=!?&|+\-*%^~<>]/.test(previous) ||
      /^(return|throw|case|delete|void|typeof|instanceof|in|of|else|do)$/.test(previousToken(index));
  };

  for (let i = open; i < app.length; i += 1) {
    const ch = app[i];
    const next = app[i + 1] || '';

    if (state === 'line-comment') {
      if (ch === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i += 1;
      }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        state = 'code';
        quote = '';
      }
      continue;
    }
    if (state === 'regex') {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '[') {
        regexClass = true;
      } else if (ch === ']' && regexClass) {
        regexClass = false;
      } else if (ch === '/' && !regexClass) {
        state = 'code';
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      state = 'line-comment';
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      state = 'block-comment';
      i += 1;
      continue;
    }
    if (ch === '/' && canStartRegex(i)) {
      state = 'regex';
      regexClass = false;
      continue;
    }
    if (ch === "'") {
      state = 'single';
      quote = ch;
      escaped = false;
      continue;
    }
    if (ch === '"') {
      state = 'double';
      quote = ch;
      escaped = false;
      continue;
    }
    if (ch === '`') {
      state = 'template';
      quote = ch;
      escaped = false;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return app.slice(start, i + 1);
    }
  }

  throw new Error(`fechamento ausente na função real: ${name}`);
}

function sourceBetween(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  ok(start >= 0, `marcador ausente no app.js: ${startMarker}`);
  const end = app.indexOf(endMarker, start + startMarker.length);
  ok(end > start, `fim ausente no app.js: ${endMarker}`);
  return app.slice(start, end);
}

for (const expression of [
  /function\s+surveyCommunicationWithoutGroups\s*\(\s*value\s*\)/,
  /function\s+surveyInvitationWhatsappMessage\s*\(\s*s\s*,\s*u\s*,\s*link\s*\)/,
  /function\s+surveyInvitationPushBody\s*\(\s*s\s*,\s*(?:name|researcherName)\s*,\s*link\s*\)/,
  /function\s+surveyInitialOrientationWhatsappMessage\s*\(\s*s\s*,\s*u\s*,\s*template\s*=\s*['"]['"]\s*\)/,
]) {
  ok(expression.test(app), `assinatura nova ausente no app.js: ${expression}`);
}

for (const legacyToken of [
  'surveyInvitationGroupText',
  'teamWhatsappGroupUrl',
  'whatsapp_group_url',
  'team-whatsapp-group-url',
  'COLLECT_SURVEY_ORIENTATION_GROUP',
]) {
  ok(!app.includes(legacyToken), `resíduo de campo/chamada de grupo no app.js: ${legacyToken}`);
}

const functionNames = [
  'surveyCommunicationWithoutGroups',
  'surveyInvitationMoney',
  'surveyInvitationPeriod',
  'surveyInvitationArea',
  'surveyInvitationQuotaText',
  'surveyInvitationPriceText',
  'surveyInvitationSiteUrl',
  'surveyTrainingVideoUrl',
  'surveyInvitationPushBody',
  'surveyInvitationWhatsappMessage',
  'surveyInitialOrientationDefaultTemplate',
  'surveyInitialOrientationWhatsappMessage',
];
const context = {
  URL,
  ABRANGENCIA_LABELS: { nacional: 'Brasil' },
  fmtDataBR: value => String(value),
  surveyCityTargets: () => ({ cities: new Set(), states: new Set() }),
};
vm.createContext(context);
vm.runInContext(functionNames.map(extractFunction).join('\n'), context);

const survey = {
  name: 'Pesquisa Horizonte',
  tipo: 'opinião',
  dataIni: '2026-11-10',
  dataFim: '2026-11-20',
  abrangencia: 'nacional',
  price: 18,
  questions: [],
};
const researcher = { name: 'Ana Souza', phone: '11999990000' };
const inviteLink = 'https://www.pesquisa-pro.com/app.html?convite=invite-123';
const oldOfficialGroupLink = 'https://chat.whatsapp.com/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const oldInviteGroupLink = 'https://chat.whatsapp.com/invite/BBBBBBBBBBBBBBBBBBBB';

const oldCommunication = [
  'Mantenha o GPS ativo e confirme a localização antes da coleta.',
  `Entre no grupo oficial da pesquisa: ${oldOfficialGroupLink}`,
  'Orientações do grupo oficial: {{grupo}}',
  `Link do grupo: ${oldInviteGroupLink}`,
  'Assista ao treinamento {{video}}.',
  'Todas as entrevistas realizadas após as 21:00 devem ter gravação.',
  'Use o chat individual para falar com a equipe.',
].join('\n');
const sanitized = context.surveyCommunicationWithoutGroups(oldCommunication);
ok(typeof sanitized === 'string', 'sanitizador deve retornar texto');
for (const removed of [
  oldOfficialGroupLink,
  oldInviteGroupLink,
  '{{grupo}}',
  'grupo oficial',
]) {
  ok(!sanitized.toLowerCase().includes(removed.toLowerCase()), `sanitizador preservou conteúdo de grupo: ${removed}`);
}
ok(!/\bgrupo\b|whatsapp\.com/i.test(sanitized), 'sanitizador deixou referência de grupo no texto final');
ok(sanitized.includes('GPS'), 'sanitizador removeu a orientação de GPS');
ok(sanitized.includes('21:00'), 'sanitizador removeu a regra das 21h');
ok(sanitized.includes('chat individual'), 'sanitizador removeu o chat individual');
const mixed = context.surveyCommunicationWithoutGroups(`Leia os avisos. Entre no grupo oficial: ${oldOfficialGroupLink}. Mantenha o GPS ativo. Após 21:00 grave a confirmação.`);
ok(mixed.includes('Leia os avisos') && mixed.includes('GPS') && mixed.includes('21:00'), 'link pontuado não pode consumir instruções da frase seguinte');
ok(!/grupo|chat\.whatsapp/i.test(mixed), 'instrução de grupo em linha compartilhada deve desaparecer');
const combined = context.surveyCommunicationWithoutGroups('Entre no grupo oficial e mantenha o GPS ativo, preserve a privacidade e grave após 21:00.');
ok(!/grupo/i.test(combined) && combined.includes('GPS') && combined.includes('privacidade') && combined.includes('21:00'), 'uma mesma frase deve preservar todas as regras ao retirar a referência ao grupo');

function assertGroupFree(value, label) {
  const text = String(value || '');
  const lower = text.toLowerCase();
  for (const removed of [oldOfficialGroupLink, oldInviteGroupLink, '{{grupo}}']) {
    ok(!lower.includes(removed.toLowerCase()), `${label} inclui link/place-holder legado de grupo: ${removed}`);
  }
  ok(!/\bgrupo\b/i.test(text), `${label} ainda menciona grupo`);
}

// O quarto argumento é legado de propósito: uma função com o contrato novo não
// pode reintroduzir grupo mesmo que algum chamador antigo ainda o envie.
const whatsappInvite = context.surveyInvitationWhatsappMessage(
  survey,
  researcher,
  inviteLink,
  oldOfficialGroupLink,
);
const pushInvite = context.surveyInvitationPushBody(
  survey,
  researcher.name,
  inviteLink,
  oldInviteGroupLink,
);
assertGroupFree(whatsappInvite, 'convite WhatsApp');
assertGroupFree(pushInvite, 'corpo Push');
for (const [label, message] of [['convite WhatsApp', whatsappInvite], ['corpo Push', pushInvite]]) {
  ok(/georreferenciamento/i.test(message), `${label} perdeu georreferenciamento`);
  ok(message.includes('Pix'), `${label} perdeu instrução de pagamento`);
  ok(message.includes(inviteLink), `${label} perdeu o link individual de aceite`);
  ok(message.includes('Aceit') || message.includes('aceit'), `${label} perdeu instrução de aceite`);
}

const oldOrientationTemplate = [
  'Olá, {{pesquisador}}. Pesquisa: {{pesquisa}}.',
  'Mantenha o GPS ativo e faça a coleta na área autorizada.',
  `Entre no grupo oficial: ${oldOfficialGroupLink}`,
  'Use este link antigo {{grupo}}.',
  'Treinamento: {{video}}.',
  'Todas as entrevistas realizadas após as 21:00 devem ter gravação de confirmação.',
  'Fale pelo chat individual se houver dúvida.',
].join('\n');
const orientation = context.surveyInitialOrientationWhatsappMessage(
  survey,
  researcher,
  oldOrientationTemplate,
);
assertGroupFree(orientation, 'orientação inicial WhatsApp');
ok(orientation.includes('GPS'), 'orientação perdeu GPS');
ok(orientation.includes(context.surveyTrainingVideoUrl()), 'orientação perdeu vídeo de treinamento');
ok(orientation.includes('21:00'), 'orientação perdeu regra das 21h');
ok(orientation.includes('chat individual'), 'orientação perdeu comunicação individual');
ok(orientation.includes(researcher.name), 'orientação não personalizou o pesquisador');

const dashboardMarkup = extractFunction('mySurveyCommunicationsMarkup');
ok(dashboardMarkup.includes('Chat da pesquisa'), 'dashboard perdeu o chat interno da pesquisa');
ok(!/grupo|whatsapp_group_url/i.test(dashboardMarkup), 'dashboard ainda apresenta grupo/campo de grupo');
const linkInviteMarkup = extractFunction('teamResearcherLinkMarkup');
ok(linkInviteMarkup.includes('Convite por link geral'), 'UI de link geral do convite foi removida');
ok(linkInviteMarkup.includes('Enviar por WhatsApp'), 'UI de link geral perdeu compartilhamento individual por WhatsApp');
ok(!/grupo|whatsapp_group_url/i.test(linkInviteMarkup), 'UI de link geral ainda apresenta grupo');
const teamMarkup = sourceBetween("PAGES['survey-team']=()=>", 'function surveyTeam(');
ok(teamMarkup.includes('chatOpenSurveyChannel'), 'UI da equipe perdeu o chat da pesquisa');
ok(teamMarkup.includes('team-whatsapp-invite-btn'), 'UI da equipe perdeu convite WhatsApp individual');
ok(!/grupo|whatsapp_group_url/i.test(teamMarkup), 'UI da equipe ainda apresenta grupo');
ok(app.includes("window.open('https://wa.me/'"), 'WhatsApp individual por wa.me foi removido');
ok(app.includes('openResearcherSurveyChat'), 'atalho de chat individual do dashboard foi removido');

console.log('Remove WhatsApp groups smoke test: PASS — sanitizador, convites, orientação, UI sem grupo e chat individual verificados.');
