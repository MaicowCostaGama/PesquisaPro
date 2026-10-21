const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const migration=fs.readFileSync(path.join(root,'deploy','excluir-pesquisa.sql'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');

assert(app.includes("sb.rpc('delete_survey_permanently',{p_survey_id:s.id})"),'frontend não chama a RPC de exclusão protegida');
assert(app.includes("['admin','admpro'].includes(CURRENT_PROFILE?.role)"),'frontend não restringe a exclusão ao perfil administrativo');
assert(app.includes('Excluir definitivamente'),'ação de exclusão não foi apresentada na lista');
assert(app.includes('Nenhum dado foi apagado'),'falha da migration não está sendo comunicada como operação segura');
assert(app.includes("SURVEYS=SURVEYS.filter(row=>row.id!==deletedId)"),'lista local não é atualizada após exclusão');
assert(app.includes('data-label="Ações"'),'células da tabela não têm rótulos para o modo compacto');
assert(css.includes('.survey-row-actions'),'contêiner de ações da pesquisa ausente');
assert(css.includes('.survey-table-scroll tbody tr{display:grid'),'layout de cartões responsivo ausente');
assert(css.includes('.survey-delete-action'),'estilo da ação destrutiva ausente');
assert(html.includes('20261021143000'),'cache v191 ausente no HTML');
assert(html.includes('app.js?v=20261021143000'),'app.js não está versionado em v191');

assert(migration.includes('create or replace function public.delete_survey_permanently(p_survey_id uuid)'),'RPC de exclusão ausente');
assert(migration.includes('if v_uid is null or not public.is_admin()'),'RPC não valida administrador');
assert(migration.includes("revoke all on function public.delete_survey_permanently(uuid) from public"),'RPC não foi revogada do público');
assert(migration.includes("grant execute on function public.delete_survey_permanently(uuid) to authenticated"),'RPC não foi liberada para autenticados');
assert(migration.includes('open_answer_ai_requests'),'dependência de IA não é removida');
assert(migration.includes('survey_researcher_orientation_sends'),'orientações não são removidas');
assert(migration.includes('collection_recording_recovery_log'),'log de recuperação de áudio não é removido antes dos eventos');
assert(migration.includes("bucket_id = 'collection-recordings'"),'limpeza do bucket de áudios ausente');
assert(migration.includes("bucket_id = 'client-reports'"),'limpeza do bucket de relatórios ausente');
assert(migration.includes("bucket_id = 'payment-receipts'"),'limpeza do bucket de comprovantes ausente');
assert(migration.includes('delete from public.surveys where id = p_survey_id'),'pesquisa não é excluída ao final da RPC');
assert(!/\b(drop\s+(table|schema|database)|truncate\s+)/i.test(migration),'migration contém operação destrutiva ampla ou perigosa');
const protectedNames=[
  'SUPABASE'+'_SERVICE_ROLE_KEY',
  'VAPID'+'_PRIVATE_KEY',
  'OPENAI'+'_API_KEY',
];
assert(!protectedNames.some(name=>(app+css+migration).includes(name)),'segredo apareceu nos arquivos da v191');

console.log('Survey delete smoke test OK: exclusão administrativa protegida, dependências tratadas e tabela responsiva.');
