const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'deploy', 'arquivar-pesquisa.sql'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'ARQUIVAMENTO-PESQUISA-PRESERVA-HISTORICO-20261006.md'), 'utf8');

assert(app.includes('archivedAt:row.archived_at||null'), 'frontend não normaliza archived_at');
assert(app.includes("PAGES['surveys-archived']=()=>"), 'página de pesquisas arquivadas ausente');
assert(app.includes("sb.rpc('archive_survey',{p_survey_id:s.id})"), 'frontend não chama archive_survey');
assert(app.includes("sb.rpc('restore_survey',{p_survey_id:s.id})"), 'frontend não chama restore_survey');
assert(app.includes('onclick="surveyArchive(${idx})"'), 'botão de operação ainda não usa arquivamento');
assert(app.includes('onclick="surveyRestore(${idx})"'), 'botão de restauração ausente');
assert(!app.includes("from('surveys').delete()"), 'frontend ainda tenta apagar surveys fisicamente');
assert(app.includes("filter(entry=>!entry.s.archivedAt)"), 'financeiro operacional ainda inclui pesquisas arquivadas');
assert(app.includes("const archived=!!s?.archivedAt||!s"), 'extrato do pesquisador não neutraliza pesquisa arquivada');
assert(app.includes("p.researcherId===myId&&!SURVEYS.find(x=>x.id===p.surveyId)?.archivedAt"), 'painel do pesquisador ainda soma pagamento arquivado');
assert(app.includes('visibleMyInvites'), 'painel do pesquisador ainda exibe convite arquivado');
assert(app.includes("row.code==='survey_archived'"), 'mensagem de pesquisa arquivada ausente no início de coleta');
assert(app.includes("!s.archivedAt&&s.status==='campo'"), 'lista de coleta não exclui arquivadas');

assert(migration.includes('add column if not exists archived_at timestamptz'), 'migration não é compatível com instalação existente');
assert(migration.includes('create or replace function public.archive_survey(p_survey_id uuid)'), 'RPC de arquivamento ausente');
assert(migration.includes('create or replace function public.restore_survey(p_survey_id uuid)'), 'RPC de restauração ausente');
assert(migration.includes("grant execute on function public.archive_survey(uuid) to authenticated"), 'grant de arquivamento ausente');
assert(migration.includes("grant execute on function public.restore_survey(uuid) to authenticated"), 'grant de restauração ausente');
assert(migration.includes('create trigger trg_prevent_archived_collection'), 'bloqueio de coletas arquivadas ausente');
assert(migration.includes('create trigger trg_prevent_archived_invite'), 'bloqueio de convites arquivados ausente');
assert(migration.includes('create trigger trg_prevent_archived_team'), 'bloqueio de equipe arquivada ausente');
assert(migration.includes("return query select false, 'survey_archived'::text"), 'RPC não bloqueia início em pesquisa arquivada');
assert(migration.includes("and ce.survey_id=p_survey_id"), 'validação RPC não restringe pela pesquisa');
assert(migration.includes("and ce.survey_id=new.survey_id"), 'trigger de coleta não restringe pela pesquisa');
assert(migration.includes("ce.status<>'rejected'"), 'coleta rejeitada não foi excluída da referência');
assert(migration.includes("'collection-distance:'||v_researcher_id::text||':'||p_survey_id::text"), 'lock da RPC não está no escopo pesquisador + pesquisa');
assert(migration.includes("'collection-distance:'||new.researcher_id::text||':'||new.survey_id::text"), 'lock do trigger não está no escopo pesquisador + pesquisa');
assert(migration.includes("if v_distance<15"), 'limite de distância de 15 m não foi preservado');
assert(migration.includes('notify pgrst'), 'migration não recarrega o schema do PostgREST');
assert(!/\b(delete\s+from|truncate\s+|drop\s+(table|schema|database))/i.test(migration), 'migration contém operação destrutiva');
assert(doc.includes('não altera nem apaga pagamentos') && doc.includes('não é contabilizada como financeiro pendente'), 'documentação não explica preservação e financeiro');

console.log('Survey archive smoke test OK: arquivamento reversível, histórico preservado e financeiro operacional protegido.');
