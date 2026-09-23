const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const migration=fs.readFileSync('deploy/duracao-entrevista-auditoria.sql','utf8');
const html=fs.readFileSync('app.html','utf8');
for(const token of [
  'duration_seconds',
  'elapsedSeconds',
  'fmtInterviewDuration',
  'Duração',
  'Não registrado',
  'Com gravação',
  'Recusada',
  'Falha técnica',
  'audit-recording-player',
  'createSignedUrl(rec.storage_path,600)',
  'controls preload="none"',
  'collectionRecordingCell(e)',
  'COLLECT_EVENT_SELECT_DURATION'
])assert(app.includes(token),`app sem ${token}`);
for(const token of [
  '.audit-duration-value',
  '.audit-recording-player',
  '.audit-recording-duration',
  '.audit-recording-note',
  '.audit-recording-error'
])assert(css.includes(token),`CSS sem ${token}`);
for(const token of [
  'alter table public.collection_events',
  'add column if not exists duration_seconds integer',
  'comment on column public.collection_events.duration_seconds',
  'begin;',
  'commit;'
])assert(migration.includes(token),`migration sem ${token}`);
assert(!/drop table|drop column|truncate|delete from/i.test(migration),'migration contém operação destrutiva');
assert(html.includes('app.js?v=20260922233000'),'cache não atualizado');
console.log('Audit recording duration smoke test: PASS — duração, status, recusa e player privado verificados.');
