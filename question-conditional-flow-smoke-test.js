const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
const css=fs.readFileSync(root+'/style.css','utf8');
const sql=fs.readFileSync(root+'/deploy/caminhos-condicionais-v189.sql','utf8');
const source=fs.readFileSync(root+'/question-conditional-flow.js','utf8');
const context={console,Set,Map,Array,Object,String,Number,JSON};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);
const flow=context.PP_CONDITIONAL_FLOW;
function ok(condition,message){assert.ok(condition,message);}
const questions=[
  {id:1,dbId:'q1',type:'single',opts:['Carro','Moto'],routeTargets:['3','']},
  {id:2,dbId:'q2',type:'open',opts:[]},
  {id:3,dbId:'q3',type:'single',opts:['Sim','Não'],routeTargets:['__end__','']},
  {id:4,dbId:'q4',type:'open',opts:[]},
];
const directQuestions=[
  {id:1,dbId:'d1',type:'single',opts:['Sim'],routeTargets:[''],directTarget:'3'},
  {id:2,dbId:'d2',type:'open',opts:[]},
  {id:3,dbId:'d3',type:'open',opts:[]},
];
ok(flow&&typeof flow.visibleQuestions==='function','motor de fluxo não foi carregado');
ok(flow.validateQuestions(questions).length===0,'fluxo válido foi rejeitado');
ok(flow.visibleQuestionIds(questions,{}).join(',')==='q1,q2,q3,q4','sem resposta a sequência normal deve permanecer visível');
ok(flow.visibleQuestionIds(questions,{q1:{value:'Carro'}}).join(',')==='q1,q3,q4','resposta condicional não saltou o nó intermediário');
ok(flow.visibleQuestionIds(questions,{q1:{value:'Carro'},q3:{value:'Sim'}}).join(',')==='q1,q3','saída de encerramento não parou o fluxo');
ok(flow.directTargetFor(directQuestions[0])==='3','conexão direta não foi reconhecida');
ok(flow.visibleQuestionIds(directQuestions,{d1:{value:'Sim'}}).join(',')==='d1,d3','conexão direta não saltou para a pergunta indicada');
ok(flow.hiddenAnsweredQuestionIds(questions,{q1:{value:'Carro'},q2:{value:'resposta antiga'}}).includes('q2'),'resposta de pergunta pulada foi identificada');
ok(flow.validateQuestions([{id:1,type:'single',opts:['A'],routeTargets:['999']}]).some(error=>/inexistente/.test(error)),'alvo inexistente não foi recusado');
ok(flow.validateQuestions([{id:1,type:'single',opts:['A'],routeTargets:['1']}]).some(error=>/posterior/.test(error)),'loop ou salto para trás não foi recusado');
ok(flow.validateQuestions([{id:1,type:'open',opts:[],routeTargets:['2']},{id:2,type:'open',opts:[]}]).some(error=>/escolha única/.test(error)),'regra em pergunta aberta não foi recusada');
const dbTargets=flow.dbTargetsFromLocal({id:1,type:'single',opts:['A','B'],routeTargets:['2','__end__']},new Map([['2','uuid-q2']]));
assert.deepEqual(Array.from(dbTargets),['uuid-q2','__end__']);
assert.equal(flow.dbDirectTargetFromLocal({directTarget:'2'},new Map([['2','uuid-q2']])), 'uuid-q2');
ok(/function qConditionalEditorMarkup/.test(app)&&/function qFlowGraphMarkup/.test(app),'editor visual de nós ausente');
ok(/function qRouteTarget/.test(app)&&/PP_CONDITIONAL_FLOW/.test(app),'integração do motor no editor/coleta ausente');
ok(/function qSetEditorTab/.test(app)&&/q-tab-flow/.test(app)&&/q-tab-questions/.test(app),'mapa do fluxo não está separado em uma aba própria');
ok(/function qFlowStartNodeDrag/.test(app)&&/function qFlowStartConnect/.test(app)&&/function qFlowStartDirectConnect/.test(app)&&/q-flow-node-card/.test(app),'nós arrastáveis ou os dois tipos de conexão estão ausentes');
ok(/flowPosition/.test(app)&&/const logicJson=\{version:2,route_targets:routeTargets,direct_target:directTarget,position\}/.test(app)&&/options_source/.test(app),'posição, conexão direta e metadados da pergunta não foram integrados ao estado do editor');
ok(/function qFlowEdges/.test(app)&&/q-flow-edge-path \$\{edge.kind===.direct./.test(app)&&/qFlowZoomIn/.test(app)&&/qFlowWheelZoom/.test(app),'linhas diferenciadas ou controles de zoom ausentes');
ok(/visibleQuestions/.test(app)&&/acollectBuildAnswerRows/.test(app),'coleta não usa o ramo visível para validar e persistir respostas');
ok(/acollectOptionAutocompleteBody\('single'/.test(app)&&/acollectSetAnswer\(qDbId,value,rerenderForm,optionIndex\)/.test(app),'escolha única não usa o caminho de seleção que redesenha o ramo');
ok(html.includes('question-conditional-flow.js?v=20261021181200'),'módulo condicional não foi carregado com cache v197');
ok(html.includes('pesquisapro-app-version" content="20261021181200'),'meta de versão v197 ausente');
ok(css.includes('.q-flow-map')&&css.includes('.q-flow-node-card')&&css.includes('.q-flow-edge-path')&&css.includes('.q-flow-edge-path.is-direct')&&css.includes('.q-flow-zoom-controls')&&css.includes('.q-editor-tabs'),'estilos do editor visual ausentes');
ok(/add column if not exists logic_jsonb/i.test(sql)&&/route_targets/i.test(sql)&&/alter column logic_jsonb set not null/i.test(sql),'migration SQL v189 incompleta');
ok(!/SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|OPENAI_API_KEY/.test(source+app+sql),'segredo encontrado na implementação');
console.log('question-conditional-flow-smoke-test: PASS — 29 verificações.');
