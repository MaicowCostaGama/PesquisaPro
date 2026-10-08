const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const html=fs.readFileSync(__dirname+'/app.html','utf8');
function ok(condition,message){assert(condition,message);}

ok(app.includes("if(selectedRole==='pesq')return;"),'o ticker ainda pode iniciar para o pesquisador');
ok(app.includes("const showInterviewTimer=selectedRole!=='pesq';"),'a renderização não diferencia pesquisador de equipe');
ok(app.includes('const interviewBanner=showInterviewTimer?'),'banner de duração não está condicionado ao papel');
ok(app.includes("const elapsedSeconds=Math.max(0,Math.round(elapsedMs/1000));"),'tempo interno deixou de ser calculado');
ok(app.includes('duration_seconds:elapsedSeconds'),'tempo interno deixou de ser enviado para auditoria');
ok(app.includes('ACOLLECT_RECORDING_STOP_TIMER=setTimeout(()=>acollectRecordingStop(),ACOLLECT_RECORDING_MAX_SECONDS*1000);'),'limite automático da gravação foi removido');
ok(app.includes('A gravação será encerrada automaticamente.'),'orientação sem contador para a gravação ausente');
ok(!app.includes('id="acollectRecordingTimer">00:00</div>'),'contador visual da gravação ainda aparece');
ok(html.includes('app.js?v=20261008162850'),'cache do app não foi atualizado');
console.log('researcher-collection-timer-smoke-test: PASS');
