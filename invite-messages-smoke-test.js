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
  'surveyInvitationPushBody',
  'surveyInvitationWhatsappMessage',
  'surveyInvitationGroupText',
  'surveyInvitationSiteUrl',
  'Convidar pesquisadores por push',
  'Convidar por WhatsApp',
  'Reenviar WhatsApp',
  'O botão azul envia convite em massa por push',
  'teamWhatsappGroupUrl',
  'invite_messages',
  'surveyInviteLink(item.id)',
  'chave Pix correta e atualizada',
  'Pagamentos semanais',
  'Grupo oficial da pesquisa no WhatsApp',
  'Site do PesquisaPro',
  'https://www.pesquisa-pro.com/app.html',
  'Antes da primeira coleta',
  'Entrar no grupo do WhatsApp',
  'georreferenciamento',
  'confirmação curta gravada',
  'Aceitar e entrar na equipe'
]) assert(app.includes(token),`modelo ausente no app: ${token}`);
for(const token of ['invite_messages?:Record<string,string>','inviteUrl.searchParams.set(\'convite\',invite.id)','invite_id:invite.id','title:\'Convite para participar da pesquisa — PesquisaPro\'']) assert(edge.includes(token),`modelo ausente no push: ${token}`);
assert(html.includes('app.js?v=20260923062000'),'cache do app não atualizado');
assert(html.includes('push-config.js?v=20260923062000'),'cache do push não atualizado');
assert(app.indexOf('mySurveyCommunicationsMarkup()')<app.indexOf('researcherAvailableSurveysMarkup(surveysMine)'),'link do grupo não aparece antes das pesquisas disponíveis');
console.log('Invite messages smoke test: PASS — push e WhatsApp com dados da pesquisa, regras, cotas, georreferenciamento, gravação, pagamento semanal, Pix e aceite individual.');
