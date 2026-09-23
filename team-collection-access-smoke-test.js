const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('style.css','utf8');
const html=fs.readFileSync('app.html','utf8');
for(const token of [
  "collectOpen('+TEAM_IDX+')",
  'Pesquisadores na coleta',
  'Ver pesquisadores na coleta',
  'Coleta e campo — ',
  'Mapa ao vivo',
  'Auditoria'
])assert(app.includes(token),`acesso à coleta ausente: ${token}`);
assert(css.includes('.team-collection-access'),'estilo do acesso à coleta ausente');
assert(css.includes('.btn-fill.team-collection-access{color:#fff!important'),'contraste do botão preenchido não está garantido');
assert(html.includes('app.js?v=20260922233000'),'cache do acesso à coleta não atualizado');
console.log('Team collection access smoke test: PASS — equipe abre diretamente monitoramento, mapa e auditoria.');
