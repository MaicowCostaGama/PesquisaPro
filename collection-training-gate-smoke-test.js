const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const ok=(condition,message)=>assert(condition,message);

for(const token of [
  'ACOLLECT_NOTICE_GATE_VIDEO_REQUIRED',
  'ACOLLECT_NOTICE_GATE_VIDEO_WATCHED',
  'acollectMessageRequiresTrainingVideo',
  'data-orientation-training-video',
  'acollectNoticeGateVideoEnded',
  'acollectNoticeGateUpdateConfirm',
  'Assista ao vídeo até o final',
  'acollectNoticeGateVideoStatus'
]){
  ok(app.includes(token),`app sem ${token}`);
}

ok(/<video class="acollect-notice-gate-video"[^>]*controls[^>]*playsinline/.test(app),'Vídeo deve ter controles e ser compatível com celular');
ok(/trainingVideo\.addEventListener\('ended',acollectNoticeGateVideoEnded\)/.test(app),'Término do vídeo não está conectado ao portão');
ok(/!videoReady/.test(app)&&/button\.disabled=!consent\?\.checked\|\|!videoReady/.test(app),'Confirmação deve permanecer desabilitada antes da conclusão do vídeo');
ok(/ACOLLECT_NOTICE_GATE_VIDEO_REQUIRED&&!ACOLLECT_NOTICE_GATE_VIDEO_WATCHED/.test(app),'Confirmação deve falhar fechada se o vídeo não foi concluído');
ok(/surveyTrainingVideoUrl\(\)/.test(app),'O vídeo precisa reutilizar a URL versionada do treinamento');
ok(css.includes('.acollect-notice-gate-training')&&css.includes('.acollect-notice-gate-video')&&css.includes('.acollect-notice-gate-video-status'),'CSS do treinamento obrigatório ausente');

console.log('Collection training gate smoke test: PASS — orientação, vídeo incorporado, término e confirmação bloqueada verificados.');
