const fs=require('fs');
const app=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/app.js','utf8');
const html=fs.readFileSync('/home/ubuntu/PesquisaPro-remoto/app.html','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(/pesq:\['dashboard-pesq','researcher-guide','app-collect','my-earnings','my-contract','support'\]/.test(app),'Suporte não está autorizado no menu do pesquisador');
assert(/support:\{ico:'☎',label:'Suporte',group:'Ajuda'\}/.test(app),'Item Suporte não está definido no menu');
assert(/function openResearcherSupport\(\)/.test(app),'Handler do Suporte não foi criado');
assert(/5531996683030/.test(app),'Número de WhatsApp do suporte está incorreto');
assert(/preciso de suporte para usar o aplicativo de coleta/.test(app),'Mensagem contextual do suporte não encontrada');
assert(/app\.js\?v=20260904190000/.test(html),'Cache do app não foi atualizado');
console.log('researcher-support-smoke-test: PASS');
