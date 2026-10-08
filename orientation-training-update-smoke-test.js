const assert=require('assert');
const fs=require('fs');
const {execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('app.html','utf8');
const video='assets/pesquisa-pro-orientacoes-coleta.mp4';
for(const token of [
  'surveyInitialOrientationDefaultTemplate',
  'surveyInitialOrientationWhatsappMessage',
  'surveyTrainingVideoUrl',
  'eRSQOsqQYTCEppwp.mp4',
  'cidade ou região autorizada',
  'menos de 15 metros',
  'desta mesma pesquisa',
  'tempo mínimo calculado',
  'Coletas abaixo do mínimo serão rejeitadas',
  'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',
  'Algumas entrevistas solicitarão',
  'Todas as entrevistas realizadas após as 21:00',
  'não serão contabilizadas para pagamento',
  'alguém pagou pela informação correta',
  'Seu Ranking',
  'entrevistas de verdade',
  'continuar recebendo convites',
  'Assista a este vídeo para entender como fazer as coletas corretamente',
  'poderão ser desligados da operação',
  '08','Respeite a distância','Respeite o tempo mínimo'
]) assert(app.includes(token),`app sem ${token}`);
assert(html.includes('app.js?v=20261007222347'),'cache do app não atualizado');
assert(fs.existsSync(video),'vídeo local não foi incluído');
const stat=fs.statSync(video);
assert(stat.size>30*1024*1024,`vídeo revisado muito pequeno: ${stat.size}`);
const probe=execFileSync('ffprobe',['-v','error','-show_entries','format=duration:stream=width,height,codec_name,codec_type','-of','json',video],{encoding:'utf8'});
const meta=JSON.parse(probe);
const duration=Number(meta.format?.duration||0);
assert(duration>=435&&duration<=450,`duração inesperada: ${duration}`);
const stream=(meta.streams||[]).find(s=>s.codec_type==='video');
assert(stream&&stream.width===1920&&stream.height===1080,'resolução do vídeo revisado inesperada');
assert(stream.codec_name==='h264','vídeo revisado sem H.264');
assert((meta.streams||[]).some(s=>s.codec_type==='audio'),'vídeo revisado sem áudio');
console.log(`Orientation training update smoke test: PASS — mensagem revisada, vídeo ${duration.toFixed(2)}s em 1920x1080, áudio e cache verificados.`);
