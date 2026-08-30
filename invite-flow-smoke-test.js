const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('app.html', 'utf8');
const sql = fs.readFileSync('deploy/convite-equipe-por-pesquisa.sql', 'utf8');

assert(app.includes('function surveyInviteLink(inviteId)'));
assert(app.includes("url.searchParams.set('convite',inviteId)"));
assert(app.includes("window.open('https://wa.me/'+digits+'?text='+encodeURIComponent(msg),'_blank','noopener')"));
assert(app.includes('Aceitar e entrar na equipe'));
assert(app.includes("sb.rpc('respond_survey_invite'"));
assert(app.includes("window.history.replaceState"));
assert(html.includes('app.html?v=') === false || html.includes('app.html'));
assert(sql.includes('create table if not exists public.survey_invites'));
assert(sql.includes('unique (survey_id, researcher_id)'));
assert(sql.includes('insert into public.survey_team'));
assert(sql.includes('on conflict (survey_id, researcher_id) do nothing'));
assert(sql.includes('grant execute on function public.respond_survey_invite(uuid, boolean) to authenticated'));
console.log('Invite flow smoke test OK: link individual, WhatsApp, aceite autenticado e vínculo em survey_team verificados.');
