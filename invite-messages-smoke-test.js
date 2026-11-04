const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('app.html','utf8');
const edge=fs.readFileSync('supabase/functions/send-survey-invite-push/index.ts','utf8');
for(const token of [
  'surveyInvitationMoney',
  'surveyInvitationPeriod',
  'surveyInvitationArea',
  'surveyInvitationQuotaText',
  'surveyInvitationPriceText',
  'surveyCommunicationWithoutGroups',
  'surveyInvitationPushBody',
  'surveyInvitationWhatsappMessage',
  'surveyInvitationSiteUrl',
  'Convidar pelo aplicativo',
  'Convidar por WhatsApp',
  'Reenviar WhatsApp',
  'O botão azul registra convites no aplicativo',
  'chave Pix correta e atualizada',
  'Pagamentos semanais',
  'Site do PesquisaPro',
  'https://www.pesquisa-pro.com/app.html',
  'Antes da primeira coleta',
  'georreferenciamento',
  'confirmação curta gravada',
  'Aceitar e entrar na equipe'
]) assert(app.includes(token),`modelo ausente no app: ${token}`);
assert(/function\s+surveyInvitationPushBody\s*\(\s*s\s*,\s*(?:name|researcherName)\s*,\s*link\s*\)/.test(app),'Push deve usar somente pesquisa, nome e link individual');
assert(/function\s+surveyInvitationWhatsappMessage\s*\(\s*s\s*,\s*u\s*,\s*link\s*\)/.test(app),'WhatsApp deve usar somente pesquisa, usuário e link individual');
for(const token of ['surveyInvitationGroupText','teamWhatsappGroupUrl','whatsapp_group_url','{{grupo}}','Entrar no grupo do WhatsApp','Grupo oficial da pesquisa no WhatsApp']) assert(!app.includes(token),`resíduo de grupo no app: ${token}`);
assert(!app.includes("sb.functions.invoke('send-survey-invite-push'"),'envio imediato legado não deve ignorar preferências e confirmação');
for(const token of ['invite_messages?:Record<string,string>','inviteUrl.searchParams.set(\'convite\',invite.id)','invite_id:invite.id','title:\'Convite para participar da pesquisa — PesquisaPro\'']) assert(edge.includes(token),`modelo ausente no push: ${token}`);
const version=html.match(/name="pesquisapro-app-version" content="(\d+)"/)?.[1];
assert(version&&html.includes(`app.js?v=${version}`),'cache do app não acompanha a versão');
assert(version&&html.includes(`push-config.js?v=${version}`),'cache do push não acompanha a versão');
assert(app.includes('mySurveyCommunicationsMarkup()'),'dashboard do pesquisador mantém a área de comunicação');
assert(app.includes('openResearcherSurveyChat'),'chat interno individual continua disponível');
assert(app.includes("window.open('https://wa.me/'+digits"),'WhatsApp individual continua disponível');
console.log('Invite messages smoke test: PASS — convites sem grupos, Push/WhatsApp individual, chat interno e conteúdo de pesquisa preservados.');
