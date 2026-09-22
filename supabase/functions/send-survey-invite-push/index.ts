import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'method not allowed'},405);
  const supabaseUrl=Deno.env.get('SUPABASE_URL')||'';
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const vapidPublic=Deno.env.get('VAPID_PUBLIC_KEY')||'';
  const vapidPrivate=Deno.env.get('VAPID_PRIVATE_KEY')||'';
  const vapidSubject=Deno.env.get('VAPID_SUBJECT')||'mailto:admin@pesquisa-pro.com';
  if(!supabaseUrl||!serviceKey||!vapidPublic||!vapidPrivate)return json({error:'push secrets are not configured'},503);

  const authHeader=req.headers.get('Authorization')||'';
  const userClient=createClient(supabaseUrl,Deno.env.get('SUPABASE_ANON_KEY')||'',{global:{headers:{Authorization:authHeader}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user)return json({error:'not authenticated'},401);
  const admin=createClient(supabaseUrl,serviceKey);
  const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(!profile||!['admin','coord','gerente','admpro'].includes(profile.role))return json({error:'not authorized'},403);

  let body:{survey_id?:string,invite_ids?:string[],invite_messages?:Record<string,string>}={};
  try{body=await req.json();}catch(ex){return json({error:'invalid json'},400);}
  if(!body.survey_id||!Array.isArray(body.invite_ids)||!body.invite_ids.length)return json({error:'survey_id and invite_ids are required'},400);

  const {data:survey}=await admin.from('surveys').select('id,name').eq('id',body.survey_id).maybeSingle();
  if(!survey)return json({error:'survey not found'},404);
  const {data:invites,error:inviteError}=await admin.from('survey_invites').select('id,researcher_id,status').eq('survey_id',body.survey_id).in('id',body.invite_ids).eq('status','pendente');
  if(inviteError)return json({error:inviteError.message},500);
  if(!invites?.length)return json({sent:0,skipped:body.invite_ids.length});
  const ids=invites.map(invite=>invite.researcher_id);
  const {data:subscriptions,error:subscriptionError}=await admin.from('push_subscriptions').select('user_id,endpoint,subscription').in('user_id',ids);
  if(subscriptionError)return json({error:subscriptionError.message},500);

  webpush.setVapidDetails(vapidSubject,vapidPublic,vapidPrivate);
  // A URL de destino é substituída pelo domínio do app para não levar o usuário
  // ao domínio da API Supabase.
  const appUrl=Deno.env.get('APP_URL')||'https://www.pesquisa-pro.com/app.html';
  let sent=0,failed=0,skipped=0;
  for(const invite of invites){
    const userSubs=(subscriptions||[]).filter(item=>item.user_id===invite.researcher_id);
    if(!userSubs.length){skipped++;continue;}
    const inviteUrl=new URL(appUrl);inviteUrl.searchParams.set('convite',invite.id);
    const payload=JSON.stringify({
      title:'Convite para participar da pesquisa — PesquisaPro',
      body:String(body.invite_messages?.[invite.id]||`Você foi convidado(a) para participar de “${survey.name}”. Abra o convite para consultar as regras e aceitar ou recusar.`),
      url:inviteUrl.href,
      survey_id:survey.id,
      invite_id:invite.id,
      tag:`survey-invite-${survey.id}`
    });
    let userSent=false;
    for(const item of userSubs){
      try{await webpush.sendNotification(item.subscription,payload);sent++;userSent=true;}
      catch(ex){
        failed++;
        const status=Number((ex as {statusCode?:number})?.statusCode||0);
        if(status===404||status===410)await admin.from('push_subscriptions').delete().eq('endpoint',item.endpoint);
      }
    }
    await admin.from('survey_invites').update({push_delivery_status:userSent?'sent':'failed'}).eq('id',invite.id);
  }
  return json({sent,failed,skipped,total:invites.length});
});
