const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const migration=fs.readFileSync('deploy/tempo-minimo-coleta-auditoria.sql','utf8');
const correction=fs.readFileSync('deploy/atualizar-mensagem-tempo-minimo-coleta.sql','utf8');
const html=fs.readFileSync('app.html','utf8');

for(const token of [
  'difficulty',
  'qDifficulty',
  'surveyAutomaticMinimumSeconds',
  'surveyEffectiveMinimumSeconds',
  'auditMinimumDurationMarkup',
  'saveAuditMinimumDuration',
  'save_survey_minimum_collection_seconds',
  'serverRejectedReason',
  'COLLECT_MIN_DURATION_REJECTION_MESSAGE',
  'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',
  'collection-rejection-tag'
])assert(app.includes(token),`app sem ${token}`);

for(const token of [
  '.q-duration-hint',
  '.q-difficulty-control',
  '.audit-minimum-duration-card',
  '.audit-minimum-duration-grid',
  '.collection-rejection-message',
  '.collection-rejection-tag'
])assert(css.includes(token),`CSS sem ${token}`);
assert(css.includes('.finance-table-scroll'),'CSS financeiro foi perdido');

for(const token of [
  'add column if not exists minimum_collection_seconds integer',
  'add column if not exists difficulty smallint not null default 3',
  'add column if not exists duration_seconds integer',
  'calculate_survey_minimum_collection_seconds',
  'save_survey_minimum_collection_seconds',
  'public.is_staff()',
  'minimum_collection_seconds between 30 and 3600',
  'difficulty between 1 and 5',
  'enforce_collection_minimum_duration',
  "before insert on public.collection_events",
  'new.status := \'rejected\'',
  "new.reject_reason := 'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real'",
  "array_append(coalesce(new.flags, '{}'::text[])",
  'grant execute on function public.save_survey_minimum_collection_seconds(uuid, integer) to authenticated',
  'begin;',
  'commit;'
])assert(migration.includes(token),`migration sem ${token}`);
assert(correction.includes("new.reject_reason := 'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real'"),'migration corretiva sem mensagem exata');
assert(!/drop\s+table|drop\s+column|truncate|delete\s+from/i.test(migration),'migration contém operação destrutiva');
assert(!/drop\s+table|drop\s+column|truncate|delete\s+from/i.test(correction),'migration corretiva contém operação destrutiva');
assert(html.includes('app.js?v=20261007205401'),'cache não atualizado');
console.log('Collection minimum duration smoke test: PASS — dificuldade, cálculo, ajuste, trigger seguro e mensagem verificados.');
