const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, 'deploy', 'schema.sql'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, 'deploy', 'exclusao-pesquisador-com-coletas.sql'), 'utf8');
const paymentsMigration = fs.readFileSync(path.join(__dirname, 'deploy', 'exclusao-pesquisador-pagamentos.sql'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

assert(schema.includes('researcher_id uuid references public.profiles(id) on delete set null'), 'schema não preserva eventos quando o pesquisador é excluído');
assert(migration.includes('drop constraint if exists collection_events_researcher_id_fkey'), 'migration não remove a constraint antiga');
assert(migration.includes('on delete set null'), 'migration não configura SET NULL');
assert(migration.includes('begin;') && migration.includes('commit;'), 'migration não está transacional');
assert(schema.includes('researcher_id uuid references public.profiles(id) on delete set null,\n  valid_count'), 'schema não preserva o resumo financeiro');
assert(paymentsMigration.includes('alter column researcher_id drop not null'), 'migration financeira não torna o vínculo anulável');
assert(paymentsMigration.includes('payments_researcher_id_fkey') && paymentsMigration.includes('on delete set null'), 'migration financeira não configura SET NULL');
assert(paymentsMigration.includes('if new.researcher_id is null'), 'gatilho financeiro não ignora evento sem pesquisador');
assert(app.includes("error.code==='23503'&&errorText.includes('collection_events')"), 'painel não identifica o bloqueio de coleta');
assert(app.includes("error.code==='23503'&&errorText.includes('payments')"), 'painel não identifica o bloqueio financeiro');
assert(app.includes('exclusao-pesquisador-com-coletas.sql'), 'painel não orienta a migration de coleta');
assert(app.includes('exclusao-pesquisador-pagamentos.sql'), 'painel não orienta a migration financeira');
console.log('Pesquisador deletion smoke test OK: coletas, pagamentos e gatilho preservados.');
