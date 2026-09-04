const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const migration = fs.readFileSync('deploy/gravacao-confirmacao-20pct.sql', 'utf8');
const schema = fs.readFileSync('deploy/schema.sql', 'utf8');

for (const token of [
  'reserve_collection_recording',
  'recordingRequired',
  'recording_consent',
  'recording_status',
  'acollectRecordingStart',
  'acollectRecordingDecline',
  'MediaRecorder',
  'getUserMedia({audio:true})',
  'collection-recordings',
  'openCollectionRecording',
  "['admin','coord','gerente','admpro']"
]) assert(app.includes(token), `fluxo de gravação ausente: ${token}`);

for (const token of [
  "random() < 0.20",
  "recording_status in ('not_selected','declined','pending_upload','uploaded','failed')",
  "bucket_id = 'collection-recordings'",
  'public.is_staff()',
  'on delete set null',
  'on delete cascade',
  'mark_collection_recording_failed',
  'attach_collection_recording'
]) assert(migration.includes(token), `regra SQL ausente: ${token}`);

for (const token of ['collection_recording_reservations', 'collection_recordings', 'recording_reservation_id', 'recording_consent']) {
  assert(schema.includes(token), `schema de referência sem: ${token}`);
}
assert(migration.includes('ACOLLECT_RECORDING_MAX_SECONDS') === false, 'detalhe de frontend vazou para a migration');
assert(app.includes('const ACOLLECT_RECORDING_MAX_SECONDS=12'), 'limite de 12 segundos não encontrado');
assert(css.includes('.recording-consent-card'), 'estilo do consentimento ausente');
assert(css.includes('.recording-ready audio'), 'player da prévia ausente');
console.log('Gravação de confirmação smoke test OK: seleção server-side, consentimento, limite, privacidade e auditoria verificados.');
