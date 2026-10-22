const fs = require('fs');
const path = require('path');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const sqlPath = path.join(root, 'deploy', 'usuario-teste-coleta-v211.sql');
const docsPath = path.join(root, 'USUARIO-TESTE-COLETA-V211.md');
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';
const docs = fs.existsSync(docsPath) ? fs.readFileSync(docsPath, 'utf8') : '';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

assert(/function isCollectionTestUser\(profile=CURRENT_PROFILE\)/.test(app), 'helper do usuário de teste existe');
assert(/profile\?\.role==='pesq'&&profile\?\.status==='ativo'&&profile\?\.is_collection_test_user===true/.test(app), 'helper exige pesquisador ativo e flag server-side');
assert(/if\(isCollectionTestUser\(\)\)return SURVEYS\.filter\(s=>!s\.archivedAt&&\['rascunho','campo'\]\.includes\(s\.status\)&&s\.formStarted===true\)/.test(app), 'lista inclui rascunho/campo somente com formulário iniciado');
assert(/isCollectionTestUser\(\)\?'<div class="collection-test-banner"/.test(app), 'banner de modo de teste aparece na coleta');
assert(/is_calibration:isCollectionTestUser\(\)/.test(app), 'payload marca calibração no cliente como sinalização');
assert(/if\(!isCollectionTestUser\(\)&&distance!=null&&distance<15\)/.test(app), 'distância do testador não bloqueia o ensaio');
assert(/if\(hasTargets&&!isCollectionTestUser\(\)\)/.test(app), 'abrangência não bloqueia o ensaio');
assert(/20261022172500/.test(html), 'cache v211 está aplicado no painel');

if (sql) {
  assert(/add column if not exists is_collection_test_user boolean not null default false/i.test(sql), 'migration cria flag desligada por padrão');
  assert(/create or replace function public\.is_collection_test_user\(\)/i.test(sql), 'migration cria helper server-side');
  assert(/p\.role = 'pesq'/i.test(sql) && /p\.status = 'ativo'/i.test(sql), 'helper SQL restringe papel e status');
  assert(/update public\.profiles[\s\S]*lower\(trim\(name\)\) = lower\('Adm Pesquisador PesquisaPro'\)/i.test(sql), 'perfil nominal é marcado sem criar conta');
  assert(/trg_protect_collection_test_user_flag/i.test(sql) && /not public\.is_admin\(\)/i.test(sql), 'o próprio usuário não pode conceder a flag');
  assert(/status in \('rascunho','campo'\)/i.test(sql) && /form_started = true/i.test(sql), 'RLS limita pesquisas prontas e não arquivadas');
  assert(/new\.is_calibration := true/i.test(sql), 'trigger grava calibração no servidor');
  assert(/new\.is_calibration := false/i.test(sql), 'trigger impede calibração forjada por pesquisador comum');
  assert(/coalesce\(ce\.is_calibration, false\) = false/i.test(sql), 'cotas, distância e pagamentos excluem calibrações');
  assert(/not public\.is_collection_test_user\(\) and not exists[\s\S]*survey_team/i.test(sql), 'reserva de gravação permite testador sem equipe e mantém equipe normal');
  assert(/create policy "testador vê perguntas para teste"/i.test(sql), 'RLS cobre perguntas');
  assert(/create policy "testador vê opções para teste"/i.test(sql), 'RLS cobre opções');
  assert(/create policy "testador vê campos para teste"/i.test(sql), 'RLS cobre subcampos');
} else {
  console.log('INFO: migration manual não está no clone público; validação SQL foi mantida para a fonte local.');
}
if (docs) assert(/não foi executado|não foi executada/i.test(docs), 'documentação deixa claro que SQL é manual');

console.log('collection-test-user-smoke-test: PASS');
