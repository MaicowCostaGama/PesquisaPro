const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, 'deploy', 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, 'deploy', 'exclusao-pesquisador-com-coletas.sql'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

assert(schema.includes('researcher_id uuid references public.profiles(id) on delete set null'), 'schema não preserva eventos quando o pesquisador é excluído');
assert(migration.includes('drop constraint if exists collection_events_researcher_id_fkey'), 'migration não remove a constraint antiga');
assert(migration.includes('on delete set null'), 'migration não configura SET NULL');
assert(migration.includes('begin;') && migration.includes('commit;'), 'migration não está transacional');
assert(app.includes("error.code==='23503'&&errorText.includes('collection_events')"), 'painel não identifica o bloqueio de coleta');
assert(app.includes('exclusao-pesquisador-com-coletas.sql'), 'painel não orienta a migration correta');
console.log('Pesquisador deletion smoke test OK: histórico preservado e erro orientado.');
