const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const worker=fs.readFileSync('push-sw.js','utf8');
const config=fs.readFileSync('push-config.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
for(const token of [
  'function loadResearcherAlertPreferencesIfNeeded()',
  "sb.from('researcher_alert_preferences').select('email_enabled,push_enabled')",
  "sb.rpc('save_my_researcher_alert_preferences'",
  "email_enabled:false,push_enabled:false",
  'researcher-alert-email',
  'researcher-alert-push',
  'getSubscription()',
  'local.endpoint',
  'RESEARCHER_ALERT_PREFS_SCHEMA_MISSING',
  'researcherAlertPreferencesCard()',
  'RESEARCHER_ALERT_PREFS={email_enabled:false,push_enabled:false}',
  'Os alertas externos, quando configurados, respeitam as preferências',
])assert(app.includes(token),`Frontend sem controle seguro de alertas: ${token}`);
assert(!app.includes("sb.functions.invoke('send-survey-invite-push'"),'Push legado imediato ignora consentimento');
assert(!app.includes('O botão azul envia convite em massa por push'),'Interface afirma entrega indevidamente');
assert(app.includes('chave pública VAPID'),'Status deve mostrar que a chave está ausente');
assert(worker.includes('candidate.origin===self.location.origin'),'Push não pode abrir outro domínio');
assert(worker.includes("candidate.pathname.endsWith('/app.html')"),'Destino Push limitado à tela do app');
assert(config.includes("window.PP_PUSH_PUBLIC_KEY || ''"),'Chave pública pendente deve ficar explícita até configuração');
assert(css.includes('.researcher-alert-prefs label'),'Preferências devem ser legíveis em celular');
assert(html.includes('app.js?v=20261008155630'),'Cache do app não atualizado');
console.log('Researcher alert preferences smoke test: PASS — consentimento, estado honesto, isolamento e links Push seguros.');
