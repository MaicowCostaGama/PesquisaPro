const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function block(startToken,endToken){
  const start=app.indexOf(startToken),end=app.indexOf(endToken,start);
  assert(start>=0&&end>start,`bloco não encontrado: ${startToken}`);
  return app.slice(start,end);
}
const events=[
  {id:'selected',surveyId:'survey',name:'Marta Pesquisadora',cota:'Centro',ts:300,status:'valid',calibration:false,synced:true},
  {id:'same-interviewer',surveyId:'survey',name:'Marta Pesquisadora',cota:'Bairro Norte',ts:200,status:'valid',calibration:false,synced:true},
  {id:'another-person',surveyId:'survey',name:'João Pesquisador',cota:'Sul',ts:100,status:'valid',calibration:false,synced:true}
];
const elements={
  collectResearcherSearch:{value:'Marta'},
  collectMapResearcher:{value:'Marta'},
  collectMapStatus:{value:'rejected'},
  collectMapLatest:{checked:true},
  collectMapSingleEventNotice:{innerHTML:'',hidden:true},
  collectMapFeedTitle:{textContent:''},
  collectMapFeedDescription:{textContent:''},
  collectTabMapaBtn:{id:'map-tab'}
};
const clearButton={disabled:false};
const rendered=[];let tabSelection=null;
const context={
  COLLECT_EVENTS:events,COLLECT_IDX:0,
  _collectMapFilters:{researcher:'Marta Pesquisadora',researcherQuery:'marta pesquisadora',status:'rejected',latest:true},
  _collectMapOnlyEventId:null,_collectMapFocusId:null,_collectMapSingleEventRestore:null,_collectMapDidFit:true,
  document:{getElementById:id=>elements[id]||null,querySelector:selector=>selector==='.collect-researcher-search button'?clearButton:null,querySelectorAll:()=>[]},
  isCollectionTestEvent:()=>false,
  eventsForSurveyIdx:()=>events,
  collectTab:(button,which)=>{tabSelection={button,which};},
  collectMapFit:()=>{},
  renderCollectMap:idx=>rendered.push(['map',idx]),
  renderLiveFeed:idx=>rendered.push(['feed',idx]),
  esc:value=>String(value),
};
vm.createContext(context);
vm.runInContext(block('function collectMapFilterEvents(events){','function collectMapApplyFilters(){')+'\nthis.filter=collectMapFilterEvents;',context);
vm.runInContext(block('function goToMapFromAudit(id){','function focusCollectMapEvent(id){'),context);
vm.runInContext(block('function collectMapSingleEventControls(disabled){','function collectMapRefresh(){'),context);
context.goToMapFromAudit('selected');
assert.strictEqual(context._collectMapOnlyEventId,'selected','navegação deve fixar o ID da coleta');
assert.deepStrictEqual(Array.from(context.filter(events),event=>event.id),['selected'],'não pode exibir outras coletas do mesmo entrevistador');
assert.strictEqual(tabSelection.which,'mapa','a navegação deve abrir a aba Mapa ao vivo');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context._collectMapSingleEventRestore.filters)),{researcher:'Marta Pesquisadora',researcherQuery:'marta pesquisadora',status:'rejected',latest:true},'deve guardar filtros anteriores');
assert.strictEqual(elements.collectResearcherSearch.value,'','deve limpar busca incompatível com foco individual');
assert.strictEqual(elements.collectMapResearcher.value,'all');
assert.strictEqual(elements.collectMapStatus.value,'all');
assert.strictEqual(elements.collectMapLatest.checked,false);
context.collectMapUpdateSingleEventNotice();
assert.strictEqual(elements.collectMapSingleEventNotice.hidden,false);
assert(elements.collectMapSingleEventNotice.innerHTML.includes('Visão individual'));
assert(clearButton.disabled,'busca de pesquisador deve ficar bloqueada durante foco individual');
context.collectMapClearSingleEvent();
assert.strictEqual(context._collectMapOnlyEventId,null,'a saída restaura o mapa sem o filtro por ID');
assert.strictEqual(context._collectMapFocusId,null);
assert.deepStrictEqual(JSON.parse(JSON.stringify(context._collectMapFilters)),{researcher:'Marta Pesquisadora',researcherQuery:'marta pesquisadora',status:'rejected',latest:true});
assert.strictEqual(elements.collectResearcherSearch.value,'Marta');
assert.strictEqual(elements.collectMapResearcher.value,'Marta');
assert.strictEqual(elements.collectMapStatus.value,'rejected');
assert.strictEqual(elements.collectMapLatest.checked,true);
assert.deepStrictEqual(rendered,[['map',0],['feed',0]],'ao sair, redesenha mapa e feed');
assert.strictEqual(clearButton.disabled,false);
console.log('Map single collection smoke test: PASS — somente o ID escolhido, restauração dos filtros e retorno ao mapa completo.');
