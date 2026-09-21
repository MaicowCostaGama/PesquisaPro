const assert=require('assert');
const fs=require('fs');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
function ok(condition,message){assert(condition,message);}

ok(app.includes('function qDragStart'), 'handler de início do arraste ausente');
ok(app.includes('function qDragOver'), 'handler de movimento sobre o destino ausente');
ok(app.includes('function qDrop'), 'handler de soltura ausente');
ok(app.includes('function qMove'), 'alternativa por botões de ordem ausente');
ok(app.includes('function qPointerDown')&&app.includes('function qPointerMove'), 'suporte a toque ausente');
ok(app.includes('data-qid="${q.id}"'), 'card não identifica a pergunta para reordenação');
ok(app.includes('ondragstart="qDragStart(event,${q.id})"'), 'alça não inicia arraste nativo');
ok(app.includes('ondragover="qDragOver(event,${q.id})"')&&app.includes('ondrop="qDrop(event,${q.id})"'), 'card não aceita drop');
ok(app.includes('Mover pergunta ${i+1} para cima')&&app.includes('Mover pergunta ${i+1} para baixo'), 'controles não estão acessíveis por teclado');
ok(app.includes('Arraste a alça pontilhada para mudar a ordem'), 'instrução de ordenação ausente');
ok(app.includes('position:i'), 'ordem não é persistida pelo position do banco');
ok(app.includes('sort((a,b)=>a.position-b.position)'), 'ordem não é reidratada pela posição persistida');
ok(css.includes('.q-drag-handle')&&css.includes('touch-action:none'), 'estilo da alça não permite arraste por toque');
ok(css.includes('.q-drop-before')&&css.includes('.q-drop-after'), 'indicador visual de destino ausente');
ok(html.includes('app.js?v=20260921183500')&&html.includes('style.css?v=20260921183500'), 'cache da nova versão não foi atualizado');
console.log('question-reorder-smoke-test: PASS');
