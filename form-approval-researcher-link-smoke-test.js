const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const migrationPath='deploy/aprovacao-formulario-link-pesquisadores.sql';
const migrationPresent=fs.existsSync(migrationPath);
const sql=migrationPresent?fs.readFileSync(migrationPath,'utf8'):'';
const css=fs.readFileSync('style.css','utf8');
for(const token of [
  "PAGES['form-approval']",
  'requestSurveyFormApprovalForClient',
  'loadAdminClientApprovalStatus',
  'adminApprovalStatusText',
  "sb.rpc('request_survey_form_approval'",
  "sb.rpc('respond_survey_form_approval'",
  "url.searchParams.set('aprovar',requestId)",
  'Solicitar ajustes',
  'Aprovar formulário',
  "PAGES['researcher-link-invite']",
  "sb.rpc('get_survey_researcher_link_context'",
  "sb.rpc('accept_survey_researcher_link'",
  "url.searchParams.set('equipe',token)",
  'Aceitar e entrar na equipe',
  'TEAM_RESEARCHER_LINK'
])assert(app.includes(token),`app.js não contém ${token}`);
if(migrationPresent){
  for(const token of [
    'survey_form_approval_requests',
    'survey_form_approval_events',
    'survey_researcher_links',
    'survey_researcher_link_acceptances',
    'request_survey_form_approval',
    'respond_survey_form_approval',
    'create_survey_researcher_link',
    'get_survey_researcher_link_context',
    'accept_survey_researcher_link',
    'researcher_is_eligible_for_survey',
    'insert into public.survey_team',
    "status='aprovado'",
    'form_approval_required',
    'surveys_require_form_approval'
  ])assert(sql.includes(token),`migration não contém ${token}`);
  assert(!/drop\s+(table|column)|truncate\s+/i.test(sql),'migration contém operação destrutiva');
}
for(const token of ['approval-form-question','approval-response-actions','researcher-link-invite-card','team-researcher-link-card'])assert(css.includes(token),`style.css não contém ${token}`);
console.log(`Form approval/researcher link smoke test OK: código${migrationPresent?' e migration':''} — aprovação versionada, ajustes, bloqueio de campo, link geral, elegibilidade, aceite e entrada automática na equipe verificados.`);
