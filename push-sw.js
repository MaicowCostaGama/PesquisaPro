self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(ex){data={body:event.data?event.data.text():''};}
  const title=data.title||'Novo convite de pesquisa — PesquisaPro';
  const options={
    body:data.body||'Você recebeu um convite para participar de uma pesquisa.',
    icon:data.icon||'assets/icon-512.png',
    badge:data.badge||'assets/favicon-32.png',
    tag:data.tag||('survey-invite-'+(data.survey_id||'general')),
    renotify:true,
    data:{url:data.url||'app.html',invite_id:data.invite_id||null,survey_id:data.survey_id||null}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'app.html';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(target);return client.focus();}}
    if(clients.openWindow)return clients.openWindow(target);
  }));
});
