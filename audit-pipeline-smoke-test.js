const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function block(startToken,endToken){
  const start=app.indexOf(startToken),end=app.indexOf(endToken,start);
  assert(start>=0&&end>start,`bloco ausente: ${startToken}`);
  return app.slice(start,end);
}
const events=[
  {id:'sys-time',status:'rejected',rejectReason:'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',flags:['Tempo abaixo do mínimo da pesquisa']},
  {id:'sys-duration',status:'rejected',rejectReason:'Duração da coleta não foi informada; não é possível validar o tempo mínimo da pesquisa',flags:['Duração não informada']},
  {id:'sys-distance',status:'rejected',rejectReason:'Coleta a menos da distância mínima configurada de outra coleta válida desta pesquisa',flags:['Coleta reprovada por distância mínima da pesquisa']},
  {id:'sys-legacy',status:'rejected',rejectReason:'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',flags:[]},
  {id:'admin-marked',status:'rejected',rejectReason:'Motivo registrado pela gestão',flags:['Reprovada manualmente pela administração']},
  {id:'admin-same-reason',status:'rejected',rejectReason:'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',rejectionSource:'admin',flags:[]},
  {id:'admin-legacy',status:'rejected',rejectReason:'Fora do padrão da pesquisa, verificar com a coordenação',flags:[]},
  {id:'approved',status:'valid',calibration:false,flags:[]},
  {id:'calibration',status:'valid',calibration:true,flags:[]},
  {id:'pending',status:'pending_recording',calibration:false,flags:[]}
];
const rows=[];
const tabNodes=['all','systemRejected','exceptSystemRejected','adminRejected','approved'].map(key=>({dataset:{auditFocusTab:key},classList:{toggle(name,value){this[name]=value;}},setAttribute(name,value){this[name.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;}}));
const nodes={auditCurrentViewTitle:{},auditCurrentViewDescription:{}};
const context={
  COLLECT_IDX:0,
  USERS:[],
  isCollectionTestEvent:()=>false,
  selectedRole:'admin',
  document:{querySelectorAll:selector=>selector==='[data-audit-focus-tab]'?tabNodes:[],getElementById:id=>nodes[id]||null},
  eventsForSurveyIdx:()=>events,
  renderAudit:idx=>rows.push(idx),
  Object
};
vm.createContext(context);
vm.runInContext(block('const COLLECTION_ADMIN_REJECTION_REASON_PREFIX=','let COLLECT_RECORDING_COLUMNS_AVAILABLE=')+'\nthis.visibleReason=collectionVisibleRejectReason;',context);
vm.runInContext(block('const AUDIT_PAGE_SIZE=','function goToAuditFromMap(id){')+'\nthis.api={auditIsSystemRejected,auditEventsForView,auditInternalCounts,auditApplyInternalView,auditSetInternalView,auditInternalNavigationMarkup,auditPageItems,auditRenderPagination,AUDIT_VIEWS,getView:()=>AUDIT_INTERNAL_VIEW,setView:value=>{AUDIT_INTERNAL_VIEW=value;},getPage:()=>AUDIT_PAGE,setPage:value=>{AUDIT_PAGE=value;}};',context);
vm.runInContext(block('function collectionEventRowToEntry(row){','/* carrega as coletas —'),context);
const api=context.api;
assert.strictEqual(context.visibleReason('[PP-ADMIN-REJECTED] Motivo manual'),'Motivo manual','helper deve ocultar prefixo interno em qualquer mensagem');
const mappedManual=context.collectionEventRowToEntry({id:'manual-from-db',status:'rejected',reject_reason:'[PP-ADMIN-REJECTED] Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real',flags:[]});
assert.strictEqual(mappedManual.rejectReason,'Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real','prefixo interno não deve aparecer como parte do motivo');
assert.strictEqual(mappedManual.rejectionSource,'admin');
assert.strictEqual(api.auditIsSystemRejected(mappedManual),false,'motivo persistido pela administração não pode ser reclassificado como rejeição automática');
assert.strictEqual(api.auditIsSystemRejected(events[0]),true);
assert.strictEqual(api.auditIsSystemRejected(events[1]),true);
assert.strictEqual(api.auditIsSystemRejected(events[2]),true);
assert.strictEqual(api.auditIsSystemRejected(events[3]),true,'motivos automáticos legados conhecidos devem ser classificados');
assert.strictEqual(api.auditIsSystemRejected(events[4]),false,'motivo manual sem regra automática deve ir para a etapa administrativa');
assert.strictEqual(api.auditIsSystemRejected(events[5]),false,'metadado manual prevalece mesmo quando o motivo coincide com regra automática');
assert.strictEqual(api.auditIsSystemRejected(events[6]),false,'rejeições manuais antigas com motivo não automático continuam administrativas');
assert.deepStrictEqual(Array.from(api.auditEventsForView(events,'systemRejected'),e=>e.id),['sys-time','sys-duration','sys-distance','sys-legacy']);
assert.strictEqual(api.auditEventsForView(events,'exceptSystemRejected').length,6);
assert.deepStrictEqual(Array.from(api.auditEventsForView(events,'adminRejected'),e=>e.id),['admin-marked','admin-same-reason','admin-legacy']);
assert.deepStrictEqual(Array.from(api.auditEventsForView(events,'approved'),e=>e.id),['approved']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(api.auditInternalCounts(0))),{all:10,systemRejected:4,exceptSystemRejected:6,adminRejected:3,approved:1});
const markup=api.auditInternalNavigationMarkup(0);
for(const key of ['all','systemRejected','exceptSystemRejected','adminRejected','approved'])assert(markup.includes(`data-audit-focus-tab="${key}"`),`aba ausente: ${key}`);
api.setView('adminRejected');
api.auditApplyInternalView();
assert.strictEqual(nodes.auditCurrentViewTitle.textContent,'Reprovadas pelo administrador');
assert.strictEqual(tabNodes.find(node=>node.dataset.auditFocusTab==='adminRejected').ariaSelected,'true');
api.auditSetInternalView('approved');
assert.strictEqual(api.getView(),'approved');
assert.deepStrictEqual(rows,[0]);
assert.strictEqual(nodes.auditCurrentViewTitle.textContent,'Aprovadas');
const many=Array.from({length:124},(_,index)=>index);
assert.deepStrictEqual(Array.from(api.auditPageItems(many,0)),many.slice(0,50),'primeira página contém até 50 registros');
assert.deepStrictEqual(Array.from(api.auditPageItems(many,1)),many.slice(50,100),'segunda página dá continuidade sem perder coleta');
assert.deepStrictEqual(Array.from(api.auditPageItems(many,2)),many.slice(100),'última página mantém o restante completo');
api.setPage(2);api.auditSetInternalView('adminRejected');
assert.strictEqual(api.getPage(),0,'trocar de etapa reinicia na página 1');
assert(app.includes('auditRenderPagination(viewEvents.length)'),'tabela deve renderizar paginação da categoria filtrada');
assert(app.includes('auditPageSet(${AUDIT_PAGE+1})'),'botão de próxima página deve navegar pelas coletas');
assert(app.includes("const COLLECTION_ADMIN_REJECTION_REASON_PREFIX='[PP-ADMIN-REJECTED] '"),'marcador administrativo interno ausente');
assert(app.includes('rejectionSource:isAdminRejected?\'admin\':null'),'origem interna deve ser mapeada sem prefixo para os textos visíveis');
assert(app.includes('COLLECTION_ADMIN_REJECTION_REASON_PREFIX+trimmed'),'novas reprovações manuais devem persistir a origem');
assert(!app.includes('flags:nextFlags'),'a origem administrativa não deve ser gravada em flags que alimentam o ranking');
console.log('Audit pipeline smoke test: PASS — 5 categorias, classificação automática/manual, contagens e seleção de abas.');
