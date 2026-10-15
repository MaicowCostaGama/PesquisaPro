/* v166 contextual grouping — isolated, opt-in review module.
 *
 * The host application intentionally owns the report editor, persistence, and
 * scope guards. This file only renders into #rp-open-ai and calls the named
 * reportsOpen* hooks supplied by that host. It never starts a request while
 * rendering and never writes to the database directly.
 */
function reportsContextEsc(value){
  if(typeof esc==='function')return esc(value);
  return String(value==null?'':value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;');
}
function reportsContextArg(value){
  if(typeof jsArg==='function')return jsArg(value);
  return JSON.stringify(value==null?'':value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
function reportsContextText(value,max){
  var text=String(value==null?'':value).trim();
  return max?text.slice(0,max):text;
}
function reportsContextLower(value){return reportsContextText(value).toLocaleLowerCase('pt-BR');}
function reportsContextState(){
  if(typeof reportsOpenEditorValid!=='function'||!reportsOpenEditorValid()||typeof RP_OPEN_EDITOR==='undefined'||!RP_OPEN_EDITOR)return null;
  var editor=RP_OPEN_EDITOR;
  var scope=typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope():null;
  if(!editor.context){
    editor.context={consent:false,criterion:'',allowMultiple:false,batchSize:10,busy:false,controller:null,message:'',mode:'classify',cursor:0,reevalExisting:false,discovery:[],classification:[],resultRevision:scope?.revision||0,resultModel:'',undo:null,draft:null,draftRevision:null,draftDirty:false,lastBatchIndices:[]};
  }
  var state=editor.context;
  if(!Array.isArray(state.discovery))state.discovery=[];
  if(!Array.isArray(state.classification))state.classification=[];
  if(!Array.isArray(state.lastBatchIndices))state.lastBatchIndices=[];
  if(!Number.isFinite(Number(state.cursor))||Number(state.cursor)<0)state.cursor=0;
  return state;
}
function reportsContextConfigRaw(){
  if(!reportsContextState())return {denominator:'answered',coding:'contextual',allowMultiple:false,criterion:'',groups:[]};
  var editor=RP_OPEN_EDITOR;
  var raw=typeof reportsOpenConfig==='function'?reportsOpenConfig(editor.qid):null;
  raw=raw&&typeof raw==='object'?raw:{};
  var groups=[],ids=new Set();
  for(var item of Array.isArray(raw.groups)?raw.groups:[]){
    var id=reportsContextText(item?.id,100);
    var members=[...new Set((Array.isArray(item?.members)?item.members:[]).filter(function(x){return typeof x==='string';}).map(function(x){return reportsContextText(x);}).filter(Boolean))];
    if(!id){
      /* v1 data normally has ids. This deterministic fallback keeps legacy
       * data addressable without merging categories by visible name. */
      id='legacy-'+reportsContextHash((item?.label||'')+'|'+members.join('|'));
    }
    if(ids.has(id))continue;
    ids.add(id);
    groups.push({id:id,label:reportsContextText(item?.label,160),definition:reportsContextText(item?.definition,1200),exclusions:reportsContextText(item?.exclusions,800),members:members});
  }
  return {denominator:raw.denominator==='valid'?'valid':'answered',coding:'contextual',allowMultiple:raw.allowMultiple===true,criterion:reportsContextText(raw.criterion,2000),groups:groups};
}
function reportsContextHash(value){
  var hash=2166136261,text=String(value||'');
  for(var i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36);
}
function reportsContextDraftFromConfig(config){
  return {criterion:reportsContextText(config.criterion,2000),allowMultiple:config.allowMultiple===true,groups:(config.groups||[]).map(function(group){return {id:group.id,label:group.label,definition:reportsContextText(group.definition,1200),exclusions:reportsContextText(group.exclusions,800)};})};
}
function reportsContextSyncDraft(state,config,scope){
  var revision=Number(scope?.revision)||0;
  if(!state.draft){state.draft=reportsContextDraftFromConfig(config);state.draftRevision=revision;state.draftDirty=false;return;}
  if(state.draftRevision===revision)return;
  if(state.draftDirty){
    var old=new Map((state.draft.groups||[]).map(function(group){return [group.id,group];}));
    var merged=reportsContextDraftFromConfig(config);
    merged.criterion=state.draft.criterion;merged.allowMultiple=state.draft.allowMultiple===true;
    merged.groups=merged.groups.map(function(group){return old.get(group.id)?{id:group.id,label:old.get(group.id).label,definition:old.get(group.id).definition,exclusions:old.get(group.id).exclusions}:group;});
    state.draft=merged;
  }else state.draft=reportsContextDraftFromConfig(config);
  state.draftRevision=revision;
}
function reportsContextSyncRevision(state){
  if(!state||typeof reportsOpenEnsureScope!=='function')return;
  var scope=reportsOpenEnsureScope(),revision=Number(scope?.revision)||0;
  if(Number(state.resultRevision)!==revision&&((state.discovery&&state.discovery.length)||(state.classification&&state.classification.length))){
    state.discovery=[];state.classification=[];state.resultModel='';state.lastBatchIndices=[];state.message='As categorias ou os metadados mudaram. As sugestões anteriores foram descartadas; gere uma nova análise.';
  }
  state.resultRevision=revision;
}
function reportsContextEditorOriginals(){return Array.isArray(RP_OPEN_EDITOR?.originals)?RP_OPEN_EDITOR.originals:[];}
function reportsContextGroupMap(config){return new Map((config.groups||[]).map(function(group){return [group.id,group];}));}
function reportsContextAssignedMap(config){
  var map=new Map();
  for(var group of config.groups||[])for(var member of group.members||[])if(!map.has(member))map.set(member,group.id);
  return map;
}
function reportsContextPendingIndices(config,state){
  var originals=reportsContextEditorOriginals(),assigned=reportsContextAssignedMap(config);
  return originals.map(function(_,index){return index;}).filter(function(index){return state.reevalExisting===true||!assigned.has(originals[index]?.value_label);});
}
function reportsContextDictionary(config){return (config.groups||[]).slice(0,80);}
function reportsContextConfidenceText(value){return value==='high'?'alta':value==='medium'?'média':'baixa';}
function reportsContextCategoryId(value){return reportsContextText(value,100);}
function reportsContextNewId(){
  var random='';try{random=globalThis.crypto?.randomUUID?.()||'';}catch(_){random='';}
  return 'ctx-'+(random||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
}
function reportsContextFriendlyError(error){
  var text=String(error?.message||error||'');
  if(/classify-open-answers-contextual|function .*does not exist|not found|404|edge function|unavailable|não.*ativad/i.test(text))return 'A função de classificação contextual ainda não está ativada. Nenhuma alteração foi feita.';
  if(/abort|timeout|prazo/i.test(text))return 'A análise foi cancelada ou excedeu 125 segundos. Nenhuma alteração foi feita.';
  if(/^(Campo |IDs |Metadados |A base |Não foi possível validar|A IA |Somente gestão|Cada categoria|Classify exige|Selecione entre|Ative primeiro|O provedor|Entre novamente|Complete a definição|As categorias mudaram)/.test(text))return text;
  return 'Não foi possível consultar a IA contextual. Nenhuma alteração foi feita.';
}
function reportsContextErrorPayload(error){
  return Promise.resolve().then(async function(){
    try{var body=await error?.context?.json?.();return body?.error?String(body.error):'';}catch(_){return '';}
  });
}
function reportsContextNormalizeConfigForCommit(config){
  var groups=[],ids=new Set();
  for(var item of Array.isArray(config?.groups)?config.groups:[]){
    var id=reportsContextText(item?.id,100),label=reportsContextText(item?.label,160);
    if(!id||!label||ids.has(id))continue;
    ids.add(id);groups.push({id:id,label:label,definition:reportsContextText(item?.definition,2000),exclusions:reportsContextText(item?.exclusions,2000),members:[...new Set((Array.isArray(item?.members)?item.members:[]).filter(function(x){return typeof x==='string';}).map(function(x){return reportsContextText(x);}).filter(Boolean))]});
  }
  return {denominator:config?.denominator==='valid'?'valid':'answered',coding:'contextual',allowMultiple:config?.allowMultiple===true,criterion:reportsContextText(config?.criterion,2000),groups:groups};
}
function reportsContextBuildDraftConfig(state,base){
  var draft=state.draft||reportsContextDraftFromConfig(base),groupsById=new Map((base.groups||[]).map(function(group){return [group.id,group];})),ids=new Set(),labels=new Set(),groups=[];
  if((draft.groups||[]).length>80){return {error:'O dicionário aceita até 80 categorias por solicitação; mantenha as demais para uma revisão manual.'};}
  for(var row of draft.groups||[]){
    var id=reportsContextText(row.id,100),label=reportsContextText(row.label,160),key=reportsContextLower(label);
    if(!id||!label||label==='(sem resposta)'||label==='(não categorizadas)')return {error:'Cada categoria precisa de um nome válido.'};
    if(ids.has(id))return {error:'Há códigos de categoria repetidos. Os códigos estáveis não podem ser mesclados.'};
    if(labels.has(key))return {error:'Há nomes de categoria repetidos. Renomeie ou use a categoria existente; não há mesclagem automática.'};
    ids.add(id);labels.add(key);
    var original=groupsById.get(id);
    groups.push({id:id,label:label,definition:reportsContextText(row.definition,1200),exclusions:reportsContextText(row.exclusions,800),members:[...new Set((original?.members||[]).filter(function(x){return typeof x==='string';}).map(function(x){return reportsContextText(x);}).filter(Boolean))]});
  }
  return reportsContextNormalizeConfigForCommit({...base,coding:'contextual',criterion:reportsContextText(draft.criterion,2000),allowMultiple:draft.allowMultiple===true,groups:groups});
}
function reportsContextCommitConfig(config){
  if(typeof reportsOpenCommit!=='function'||!reportsContextState())return false;
  var editor=RP_OPEN_EDITOR,next=reportsContextNormalizeConfigForCommit(config);
  reportsOpenCommit(editor.qid,next);
  if(RP_OPEN_EDITOR!==editor||!reportsContextState())return false;
  var state=reportsContextState(),scope=typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope():null;
  state.resultRevision=Number(scope?.revision)||0;state.draft=reportsContextDraftFromConfig(reportsContextConfigRaw());state.draftRevision=state.resultRevision;state.draftDirty=false;state.discovery=[];state.classification=[];state.lastBatchIndices=[];state.undo=null;state.revision=state.resultRevision;
  if(typeof reportsOpenEditorRender==='function')reportsOpenEditorRender();
  return true;
}
function reportsContextInvalidate(state,message){
  state.discovery=[];state.classification=[];state.resultModel='';state.lastBatchIndices=[];state.message=message||'';state.undo=null;state.resultRevision=Number(typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope()?.revision:0)||0;
}
function reportsContextPersistDraft(state){
  if(!state?.draftDirty)return true;
  var base=reportsContextConfigRaw(),built=reportsContextBuildDraftConfig(state,base);
  if(built.error){state.message=built.error;return false;}
  var previous=JSON.parse(JSON.stringify(base));
  if(!reportsContextCommitConfig(built)){state.message='Não foi possível atualizar os metadados desta pergunta. Nenhuma alteração foi feita.';return false;}
  state.message='Metadados da pergunta salvos na prévia. Salve a estrutura ao terminar.';
  state.undo={config:previous,revision:state.resultRevision};
  return true;
}
function reportsContextDraftField(index,field,value){
  var state=reportsContextState();if(!state||state.busy||!['label','definition','exclusions'].includes(field))return;
  if(!state.draft){var initialConfig=reportsContextConfigRaw();state.draft=reportsContextDraftFromConfig(initialConfig);state.draftRevision=Number(typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope()?.revision:0)||0;}
  if(!state.draft.groups[index])return;
  state.draft.groups[index][field]=String(value||'').slice(0,field==='label'?160:field==='definition'?1200:800);state.draftDirty=true;
}
function reportsContextDraftMeta(field,value){
  var state=reportsContextState();if(!state||state.busy||!['criterion','allowMultiple'].includes(field))return;
  if(!state.draft){var initialConfig=reportsContextConfigRaw();state.draft=reportsContextDraftFromConfig(initialConfig);state.draftRevision=Number(typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope()?.revision:0)||0;}
  state.draft[field]=field==='criterion'?String(value||'').slice(0,2000):Boolean(value);state.draftDirty=true;
}
function reportsContextSetConsent(value){var state=reportsContextState();if(state&&!state.busy){state.consent=Boolean(value);reportsContextRender();}}
function reportsContextSetBatch(value){var state=reportsContextState(),size=Number(value);if(state&&!state.busy&&[5,10,20,40,60].includes(size)){state.batchSize=size;reportsContextRender();}}
function reportsContextSetReeval(value){var state=reportsContextState();if(state&&!state.busy){state.reevalExisting=Boolean(value);state.cursor=0;state.message='';reportsContextRender();}}
function reportsContextSaveMetadata(){
  var state=reportsContextState();if(!state||state.busy)return;
  var base=reportsContextConfigRaw(),built=reportsContextBuildDraftConfig(state,base);if(built.error){state.message=built.error;reportsContextRender();return;}
  var previous=JSON.parse(JSON.stringify(base));if(!reportsContextCommitConfig(built)){state.message='Não foi possível atualizar os metadados desta pergunta. Nenhuma alteração foi feita.';reportsContextRender();return;}
  state.message='Critério e dicionário salvos na prévia. Use “Salvar agrupamentos na estrutura” para persistir.';state.undo={config:previous,revision:state.resultRevision};reportsContextRender();
}
function reportsContextCreateManual(){
  var state=reportsContextState();if(!state||state.busy)return;
  var name=reportsContextText(document.getElementById('rp-context-new-label')?.value,160),definition=reportsContextText(document.getElementById('rp-context-new-definition')?.value,1200),base=reportsContextConfigRaw();
  if(!name||name==='(sem resposta)'||name==='(não categorizadas)'){state.message='Informe um nome válido para a categoria manual.';reportsContextRender();return;}
  if(!definition){state.message='A categoria manual precisa de uma definição revisada antes de ser criada.';reportsContextRender();return;}
  if(base.groups.some(function(group){return reportsContextLower(group.label)===reportsContextLower(name);})){state.message='Esta categoria já existe. Edite a categoria existente em vez de criar uma duplicata.';reportsContextRender();return;}
  if(!reportsContextPersistDraft(state)) {reportsContextRender();return;}
  base=reportsContextConfigRaw();var previous=JSON.parse(JSON.stringify(base));base.groups.push({id:reportsContextNewId(),label:name,definition:definition,exclusions:'',members:[]});
  if(!reportsContextCommitConfig(base)){state.message='Não foi possível criar a categoria manual. Nenhuma alteração foi feita.';reportsContextRender();return;}
  state.message='Categoria manual criada sem membros. Ela ainda não foi aplicada a nenhum texto.';state.undo={config:previous,revision:state.resultRevision};reportsContextRender();
}
function reportsContextRequestCategories(config,operation){
  return reportsContextDictionary(config).filter(function(group){return operation!=='discover'||Boolean(group.definition.trim());}).map(function(group){return {id:group.id,label:group.label,definition:group.definition||'',exclusions:group.exclusions||'',examples:(group.members||[]).slice(0,3)};});
}
function reportsContextValidateBatchItems(editor,indexes){
  var items=[],seen=new Set();
  for(var index of indexes){var row=editor.originals?.[index],text=reportsContextText(row?.value_label,1200);if(!row||!text)throw new Error('Há um texto vazio ou inválido no lote.');if(String(row.value_label||'').length>1200)throw new Error('Um texto selecionado excede 1.200 caracteres. Trate-o manualmente; nada foi enviado.');var id='r'+index;if(seen.has(id))throw new Error('IDs duplicados no lote.');seen.add(id);items.push({id:id,text:text,index:index});}
  if(items.length<1||items.length>60)throw new Error('Selecione entre 1 e 60 textos por lote.');return items;
}
function reportsContextTakeBatch(state,config,operation){
  var editor=RP_OPEN_EDITOR,pending=reportsContextPendingIndices(config,state),size=Math.min(Number(state.batchSize)||10,60),selected=editor.selected instanceof Set?[...editor.selected]:[];
  var chosen=selected.filter(function(index){return pending.includes(index);});
  if(!chosen.length){var cursor=Math.max(0,Number(state.cursor)||0),available=pending.filter(function(index){return index>=cursor;});if(!available.length){cursor=0;available=pending;}chosen=available.slice(0,size);/* avanço confirmado após resposta válida */}
  else if(chosen.length>size)chosen=chosen.slice(0,size);
  if(!chosen.length)return [];
  return reportsContextValidateBatchItems(editor,chosen);
}
function reportsContextKnownCategories(config,operation){
  var groups=reportsContextDictionary(config),map=new Map();for(var group of groups)map.set(group.id,group);return {groups:groups,map:map};
}
function reportsContextValidateResponse(raw,operation,batch,config,allowMultiple){
  if(!raw||typeof raw!=='object'||raw.operation!==operation)throw new Error('A resposta da IA contextual não informou uma operação válida. Nenhuma sugestão aplicada.');
  for(var requiredOutput of ['operation','model','categories','assignments','unassigned','excluded_ids'])if(!Object.prototype.hasOwnProperty.call(raw,requiredOutput))throw new Error('A resposta da IA contextual está incompleta. Nenhuma sugestão aplicada.');
  var known=reportsContextKnownCategories(config,operation),itemIds=new Set(batch.map(function(item){return item.id;})),categories=Array.isArray(raw.categories)?raw.categories:[],categoryIds=new Set(),outputCategories=[];
  if(operation==='classify'&&categories.length)throw new Error('A classificação não pode criar categorias. Nenhuma sugestão aplicada.');
  for(var category of categories){
    var id=reportsContextCategoryId(category?.id),label=reportsContextText(category?.label,160),definition=reportsContextText(category?.definition,1200),exclusions=reportsContextText(category?.exclusions,800),examples=Array.isArray(category?.example_ids)?category.example_ids.map(function(x){return String(x);}):[];
    if(!id||categoryIds.has(id)||!label||label==='(sem resposta)'||!definition||!examples.length||examples.length>batch.length||examples.some(function(x){return !itemIds.has(x);}))throw new Error('A resposta da IA contextual contém categoria ou exemplo inválido. Nenhuma sugestão aplicada.');
    if(operation==='discover'){if(id!=='new-'+outputCategories.length||known.map.has(id))throw new Error('A descoberta tentou alterar um código existente. Nenhuma sugestão aplicada.');}
    else if(!known.map.has(id))throw new Error('A classificação referenciou uma categoria desconhecida. Nenhuma sugestão aplicada.');
    categoryIds.add(id);outputCategories.push({id:id,label:label,definition:definition,exclusions:exclusions,example_ids:[...new Set(examples)]});
  }
  var assignments=Array.isArray(raw.assignments)?raw.assignments:[],unassigned=Array.isArray(raw.unassigned)?raw.unassigned:[],excluded=Array.isArray(raw.excluded_ids)?raw.excluded_ids.map(function(x){return String(x);}):[];
  if(operation==='discover'&&assignments.length)throw new Error('A descoberta não pode retornar classificações. Nenhuma sugestão aplicada.');
  var covered=new Set(),excludedSet=new Set();
  for(var ex of excluded){if(!itemIds.has(ex)||excludedSet.has(ex))throw new Error('A resposta contém exclusões inválidas ou duplicadas. Nenhuma sugestão aplicada.');excludedSet.add(ex);covered.add(ex);}
  for(var row of assignments){
    var itemId=String(row?.item_id||'');if(!itemIds.has(itemId)||covered.has(itemId))throw new Error('A resposta contém atribuições inválidas ou duplicadas. Nenhuma sugestão aplicada.');
    var ids=Array.isArray(row?.category_ids)?row.category_ids.map(function(x){return String(x);}):[];if(!ids.length||new Set(ids).size!==ids.length||ids.some(function(id){return !known.map.has(id);} )||(!allowMultiple&&ids.length>1))throw new Error('A resposta contém códigos de categoria inválidos para esta pergunta. Nenhuma sugestão aplicada.');
    if(typeof row.reason!=='string'||!row.reason.trim()||row.reason.length>1200||!['high','medium','low'].includes(row.confidence))throw new Error('A resposta contém justificativa ou confiança inválida. Nenhuma sugestão aplicada.');
    covered.add(itemId);
  }
  var unassignedIds=new Set();
  for(var pending of unassigned){var pendingId=String(pending?.item_id||'');if(!itemIds.has(pendingId)||covered.has(pendingId)||unassignedIds.has(pendingId)||typeof pending.reason!=='string'||!pending.reason.trim()||pending.reason.length>1200)throw new Error('A resposta contém pendências inválidas ou duplicadas. Nenhuma sugestão aplicada.');unassignedIds.add(pendingId);covered.add(pendingId);}
  if(operation==='classify'&&covered.size!==itemIds.size)throw new Error('A classificação retornou cobertura incompleta do lote. Nenhuma sugestão aplicada.');
  var sampleIds=new Set();for(var output of outputCategories)for(var sample of output.example_ids){if(sampleIds.has(sample)&&!allowMultiple)throw new Error('A descoberta sobrepôs exemplos em categorias diferentes. Nenhuma sugestão aplicada.');sampleIds.add(sample);}
  if(operation==='discover'){for(var id of sampleIds)if(excludedSet.has(id))throw new Error('A descoberta incluiu um item excluído. Nenhuma sugestão aplicada.');for(var sampleId of sampleIds){if(unassignedIds.has(sampleId))throw new Error('Um exemplo também apareceu como pendência. Nenhuma sugestão aplicada.');covered.add(sampleId);}if(covered.size!==itemIds.size)throw new Error('A descoberta retornou lote incompleto. Nenhuma sugestão aplicada.');}
  return {operation:operation,model:reportsContextText(raw.model,120),categories:outputCategories,assignments:assignments.map(function(row){return {item_id:String(row.item_id),category_ids:row.category_ids.map(function(x){return String(x);}),reason:reportsContextText(row.reason,600),confidence:['high','medium','low'].includes(row.confidence)?row.confidence:'low'};}),unassigned:unassigned.map(function(row){return {item_id:String(row.item_id),reason:reportsContextText(row.reason,600)};}),excluded_ids:excluded};
}
function reportsContextResultItems(result,batch){
  var byId=new Map(batch.map(function(item){return [item.id,item];})),items=[];
  for(var assignment of result.assignments||[]){var item=byId.get(assignment.item_id);if(item)items.push({id:item.id,index:item.index,text:item.text,count:RP_OPEN_EDITOR.originals[item.index]?.cnt||0,suggestedIds:[...assignment.category_ids],selectedIds:[],excluded:false,reason:assignment.reason,confidence:assignment.confidence});}
  for(var unassigned of result.unassigned||[]){var item=byId.get(unassigned.item_id);if(item)items.push({id:item.id,index:item.index,text:item.text,count:RP_OPEN_EDITOR.originals[item.index]?.cnt||0,suggestedIds:[],selectedIds:[],excluded:false,reason:unassigned.reason,confidence:'low'});}
  for(var excludedId of result.excluded_ids||[]){var item=byId.get(excludedId);if(item)items.push({id:item.id,index:item.index,text:item.text,count:RP_OPEN_EDITOR.originals[item.index]?.cnt||0,suggestedIds:[],selectedIds:[],excluded:true,reason:'O servidor marcou este texto como excluído da análise.',confidence:'low'});}
  return items.sort(function(a,b){return a.index-b.index;});
}
async function reportsContextRun(operation,intent){
  var state=reportsContextState();if(!state||state.busy)return;
  if(!state.consent){state.message='Marque o consentimento explícito antes de enviar textos à OpenAI.';reportsContextRender();return;}
  if(!state.draft?.criterion?.trim()){state.message='Informe o critério desta pergunta antes de analisar.';reportsContextRender();return;}
  if(state.draftDirty&&!reportsContextPersistDraft(state)){reportsContextRender();return;}
  var config=reportsContextConfigRaw();if(config.groups.length>80){state.message='O dicionário aceita até 80 categorias por solicitação; reveja as categorias manualmente.';reportsContextRender();return;}
  if(operation==='classify'){
    if(!config.groups.length){state.message='Crie ou descubra ao menos uma categoria revisada antes de classificar.';reportsContextRender();return;}
    if(config.groups.some(function(group){return !group.definition.trim();})){state.message='Complete a definição de todas as categorias antes de classificar. A IA não preenche definições de códigos existentes.';reportsContextRender();return;}
  }
  var batch;
  try{batch=reportsContextTakeBatch(state,config,operation);}catch(error){state.message=String(error.message||error);reportsContextRender();return;}
  if(!batch.length){state.message=operation==='classify'?'Não há textos pendentes neste modo. Ative “Reavaliar textos já categorizados” para revisar textos existentes.':'Não há textos pendentes para descobrir categorias.';reportsContextRender();return;}
  var categories=reportsContextRequestCategories(config,operation),editor=RP_OPEN_EDITOR,scope=typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope():null,revision=Number(scope?.revision)||0;
  state.busy=true;state.mode=operation;state.lastBatchIndices=batch.map(function(item){return item.index;});state.message=(intent==='definitions'?'Sugerindo definições sem alterar códigos existentes. ':'')+'Enviando '+batch.length+' textos. Nenhuma categoria será aplicada automaticamente.';state.controller=new AbortController();reportsContextRender();
  var timer=setTimeout(function(){state.controller?.abort();},125000);
  try{
    if(typeof sb==='undefined'||!sb?.functions?.invoke)throw new Error('A função contextual não está disponível.');
    var response=await sb.functions.invoke('classify-open-answers-contextual',{body:{survey_id:editor.surveyId,question_id:editor.qid,consent:true,criterion:config.criterion,allow_multiple:config.allowMultiple===true,operation:operation,categories:categories,items:batch.map(function(item){return {id:item.id,text:item.text};})},signal:state.controller.signal});
    if(RP_OPEN_EDITOR!==editor||typeof reportsOpenEditorValid!=='function'||!reportsOpenEditorValid())return;
    if(typeof reportsOpenEnsureScope==='function'&&reportsOpenEnsureScope()!==scope)return;
    if(response?.error){var payload=await reportsContextErrorPayload(response.error);throw new Error(payload||String(response.error.message||'IA contextual indisponível.'));}
    var validated=reportsContextValidateResponse(response?.data,operation,batch,config,config.allowMultiple===true);
    if(typeof reportsOpenEnsureScope==='function'&&Number(reportsOpenEnsureScope()?.revision)!==revision)throw new Error('As categorias mudaram durante a análise. Gere novamente; nada foi aplicado.');
    var items=reportsContextResultItems(validated,batch);
    if(operation==='discover'){
      var batchById=new Map(batch.map(function(item){return [item.id,item];}));
      state.discovery=validated.categories.map(function(category){return {proposedId:category.id,label:category.label,definition:category.definition,exclusions:category.exclusions,exampleIds:category.example_ids.slice(),examples:category.example_ids.map(function(id){return batchById.get(id)?.text||'';}).filter(Boolean),proposalSelected:false};});
    }else state.classification=items;
    state.resultModel=validated.model||'';state.resultRevision=revision;state.message=(operation==='discover'?validated.categories.length+' propostas de categoria neste lote. Revise definições e exemplos; nada foi criado.':'Classificação revisada recebida. Marque categorias por texto; nada foi aplicado.')+' '+(validated.excluded_ids.length||0)+' texto(s) excluído(s) pelo servidor.';
    state.lastBatchIndices=batch.map(function(item){return item.index;});state.cursor=Math.max(...state.lastBatchIndices)+1;
  }catch(error){
    if(RP_OPEN_EDITOR===editor&&typeof reportsOpenEditorValid==='function'&&reportsOpenEditorValid())state.message=state.controller?.signal?.aborted?'A análise foi cancelada ou excedeu 125 segundos. Nenhuma alteração foi feita.':reportsContextFriendlyError(error);
  }finally{
    clearTimeout(timer);if(RP_OPEN_EDITOR===editor){state.busy=false;state.controller=null;if(typeof reportsOpenEditorValid==='function'&&reportsOpenEditorValid())reportsContextRender();}
  }
}
function reportsContextDiscover(){return reportsContextRun('discover','categories');}
function reportsContextCompleteDefinitions(){
  var state=reportsContextState();if(!state||state.busy)return;
  if(!state.draft){reportsContextRender();state=reportsContextState();}
  var count=0;for(var group of state.draft.groups||[]){if(!String(group.definition||'').trim()){group.definition='Respostas equivalentes a “'+group.label+'” no contexto da pergunta e do critério. Não incluir apenas palavras parecidas, outros modelos ou entidades, nem opiniões de polaridade diferente.';count++;}}
  if(count)state.draftDirty=true;state.message=count?count+' definições iniciais preparadas localmente. Revise cada uma e salve os metadados antes de classificar. Nenhum texto foi enviado à IA.':'As categorias já têm definições. Revise-as antes de classificar.';reportsContextRender();
}
function reportsContextClassify(){return reportsContextRun('classify','classify');}
function reportsContextNextBatch(){
  var state=reportsContextState();if(!state||state.busy)return;
  state.discovery=[];state.classification=[];state.message='';
  return state.mode==='discover'?reportsContextDiscover():reportsContextClassify();
}
function reportsContextReanalyzePending(){
  var state=reportsContextState();if(!state||state.busy)return;
  state.cursor=0;state.discovery=[];state.classification=[];state.message='';
  return reportsContextClassify();
}
function reportsContextProposalToggle(index,checked){var state=reportsContextState();if(!state||state.busy||!state.discovery[index])return;state.discovery[index].proposalSelected=Boolean(checked);}
function reportsContextProposalField(index,field,value){var state=reportsContextState();if(!state||state.busy||!state.discovery[index]||!['label','definition','exclusions'].includes(field))return;state.discovery[index][field]=String(value||'').slice(0,field==='label'?160:2000);}
function reportsContextClassifyToggle(itemIndex,categoryId,checked){
  var state=reportsContextState(),item=state?.classification?.[itemIndex];if(!state||state.busy||!item||item.excluded)return;
  var known=reportsContextKnownCategories(reportsContextConfigRaw(),'classify').map;
  if(!known.has(categoryId))return;
  var ids=new Set(item.selectedIds||[]);if(checked){if(!state.draft?.allowMultiple)ids.clear();ids.add(categoryId);}else ids.delete(categoryId);item.selectedIds=[...ids];
  document.querySelectorAll('[data-context-item="'+itemIndex+'"] input[data-context-category]').forEach(function(input){input.checked=ids.has(input.getAttribute('data-context-category'));});
}
function reportsContextClassifyExclude(itemIndex,excluded){var state=reportsContextState(),item=state?.classification?.[itemIndex];if(!state||state.busy||!item)return;item.excluded=Boolean(excluded);if(item.excluded)item.selectedIds=[];}
function reportsContextClassifySelect(index,value){
  var state=reportsContextState(),item=state?.classification?.[index];if(!state||state.busy||!item||item.excluded)return;
  var ids=[...new Set(String(value||'').split(',').map(function(x){return reportsContextText(x,100);}).filter(Boolean))];if(!state.draft?.allowMultiple&&ids.length>1)ids=ids.slice(0,1);item.selectedIds=ids;
}
function reportsContextApproveDiscovery(){
  var state=reportsContextState();if(!state||state.busy)return;
  var config=reportsContextConfigRaw(),picked=state.discovery.filter(function(item){return item.proposalSelected===true;});
  if(!picked.length){state.message='Marque explicitamente as categorias revisadas que deseja adicionar.';reportsContextRender();return;}
  var proposals=new Map();for(var item of picked){var id=reportsContextText(item.proposedId||item.proposalIds?.[0],100)||reportsContextNewId(),label=reportsContextText(item.label,160),definition=reportsContextText(item.definition,1200),exclusions=reportsContextText(item.exclusions,800);if(!label||!definition){state.message='Cada categoria aprovada precisa de nome e definição revisados.';reportsContextRender();return;}var key=reportsContextLower(label);if(config.groups.some(function(group){return reportsContextLower(group.label)===key;})||[...proposals.values()].some(function(group){return reportsContextLower(group.label)===key;})){state.message='Uma proposta usa nome já existente. Edite-a para usar a categoria existente; não há mesclagem automática.';reportsContextRender();return;}if(proposals.has(id))continue;proposals.set(id,{id:reportsContextNewId(),label:label,definition:definition,exclusions:exclusions,members:[]});}
  var next=JSON.parse(JSON.stringify(config)),previous=JSON.parse(JSON.stringify(config));next.groups=next.groups.concat([...proposals.values()]);
  if(next.groups.length>80){state.message='O dicionário aceita até 80 categorias.';reportsContextRender();return;}
  if(!reportsContextCommitConfig(next)){state.message='Não foi possível adicionar as categorias revisadas. Nenhuma alteração foi feita.';reportsContextRender();return;}
  state.undo={config:previous,revision:state.resultRevision};state.discovery=[];state.classification=[];state.message='Categorias revisadas adicionadas sem membros. As sugestões antigas foram invalidadas; execute nova classificação para aplicá-las.';reportsContextRender();
}
function reportsContextClearResults(){var state=reportsContextState();if(!state||state.busy)return;state.discovery=[];state.classification=[];state.message='Sugestões descartadas. Categorias e membros aplicados anteriormente permanecem intactos.';reportsContextRender();}
function reportsContextApply(){
  var state=reportsContextState();if(!state||state.busy)return;
  var editor=RP_OPEN_EDITOR,scope=typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope():null,revision=Number(scope?.revision)||0;
  if(Number(state.resultRevision)!==revision){state.message='As categorias mudaram desde a análise. Gere a classificação novamente; nada foi aplicado.';reportsContextRender();return;}
  if(state.draftDirty){state.message='Salve o critério e as definições antes de aplicar as sugestões.';reportsContextRender();return;}
  var config=reportsContextConfigRaw(),groups=JSON.parse(JSON.stringify(config.groups||[])),known=new Map(groups.map(function(group){return [group.id,group];})),items=state.classification||[],selected=items.filter(function(item){return !item.excluded&&Array.isArray(item.selectedIds)&&item.selectedIds.length;});
  if(!selected.length){state.message='Marque explicitamente ao menos uma categoria em um texto antes de aplicar.';reportsContextRender();return;}
  for(var item of selected){
    var ids=[...new Set(item.selectedIds.map(function(id){return String(id);})),];
    if(ids.some(function(id){return !known.has(id);})||(!config.allowMultiple&&ids.length>1)){state.message='Há uma categoria desconhecida ou mais de uma categoria em uma pergunta de resposta única. Nada foi aplicado.';reportsContextRender();return;}
    if(!editor.originals?.[item.index]){state.message='Um índice original deixou de existir. Gere novamente; nada foi aplicado.';reportsContextRender();return;}
  }
  var previous=JSON.parse(JSON.stringify(config)),replace=state.reevalExisting===true;
  if(replace){
    var selectedTexts=new Set(selected.map(function(item){return editor.originals[item.index].value_label;}));
    for(var group of groups)group.members=(group.members||[]).filter(function(member){return !selectedTexts.has(member);});
  }
  for(var selectedItem of selected){var text=editor.originals[selectedItem.index].value_label;for(var categoryId of selectedItem.selectedIds){var target=known.get(categoryId);if(!target.members.includes(text))target.members.push(text);}}
  var next={...config,groups:groups};if(!reportsContextCommitConfig(next)){state.message='Não foi possível aplicar as categorias. Nenhuma alteração foi feita.';reportsContextRender();return;}
  state.undo={config:previous,revision:state.resultRevision};state.classification=[];state.message=(replace?'A aplicação substituiu as atribuições dos textos selecionados. ':'A aplicação adicionou as atribuições selecionadas. ')+'Totais e textos originais foram preservados na prévia; salve a estrutura para persistir.';reportsContextRender();
}
function reportsContextUndo(){
  var state=reportsContextState();if(!state?.undo||state.busy)return;
  var revision=Number(typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope()?.revision:0)||0;if(Number(state.undo.revision)!==revision){state.message='Há edições posteriores. A reversão não pode sobrescrevê-las.';reportsContextRender();return;}
  var previous=state.undo.config;if(!reportsContextCommitConfig(previous)){state.message='Não foi possível desfazer a última aplicação.';reportsContextRender();return;}state.undo=null;state.message='Última aplicação contextual desfeita na prévia. Salve a estrutura para persistir a reversão.';reportsContextRender();
}
function reportsContextDictionaryHtml(state,config){
  var groups=reportsContextDictionary(config);return groups.map(function(group,index){var draft=state.draft.groups[index]&&state.draft.groups[index].id===group.id?state.draft.groups[index]:{id:group.id,label:group.label,definition:group.definition||'',exclusions:group.exclusions||''};return `<article class="reports-context-dictionary-card"><div class="reports-context-dictionary-head"><strong>${reportsContextEsc(group.id)}</strong><span>${group.members.length.toLocaleString('pt-BR')} membro(s)</span></div><label class="lbl" for="rp-context-label-${index}">Nome preservando o código ${reportsContextEsc(group.id)}<input id="rp-context-label-${index}" class="inp" maxlength="160" value="${reportsContextEsc(draft.label)}" onchange="reportsContextDraftField(${index},'label',this.value)"></label><label class="lbl" for="rp-context-definition-${index}">Definição revisada<textarea id="rp-context-definition-${index}" class="inp" maxlength="2000" rows="2" onchange="reportsContextDraftField(${index},'definition',this.value)">${reportsContextEsc(draft.definition)}</textarea></label><label class="lbl" for="rp-context-exclusions-${index}">Exclusões / não inclui<textarea id="rp-context-exclusions-${index}" class="inp" maxlength="2000" rows="2" onchange="reportsContextDraftField(${index},'exclusions',this.value)">${reportsContextEsc(draft.exclusions)}</textarea></label><details><summary>Ver ${group.members.length} texto(s) original(is)</summary><div class="reports-context-members">${group.members.slice(0,100).map(function(member){return `<div>${reportsContextEsc(member)}</div>`;}).join('')||'<span>Nenhum membro ainda; categoria preservada.</span>'}</div></details></article>`;}).join('')||'<p class="reports-context-muted">Nenhuma categoria contextual criada ainda. Descubra propostas ou crie uma categoria manual.</p>';
}
function reportsContextDiscoveryHtml(state,config){
  if(!state.discovery.length)return '';
  return `<section class="reports-context-subpanel"><div class="reports-context-subhead"><div><h4>Propostas para revisar</h4><p>Checkboxes começam desmarcados. Revise nome, definição e exclusões; exemplos do lote são somente leitura.</p></div><button type="button" class="btn btn-out" onclick="reportsContextClearResults()" ${state.busy?'disabled':''}>Descartar este lote</button></div><div class="reports-context-proposals">${state.discovery.map(function(proposal,index){var label=proposal.label||'Proposta sem nome',definition=proposal.definition||'',exclusions=proposal.exclusions||'';return `<article class="reports-context-proposal"><label class="reports-context-check"><input type="checkbox" aria-label="Adicionar proposta ${reportsContextEsc(label)}" onchange="reportsContextProposalToggle(${index},this.checked)" ${proposal.proposalSelected?'checked':''}><strong>Adicionar somente categoria revisada</strong></label><label class="lbl">Nome revisável<input class="inp" maxlength="160" value="${reportsContextEsc(label)}" onchange="reportsContextProposalField(${index},'label',this.value)"></label><label class="lbl">Definição revisável<textarea class="inp" maxlength="2000" rows="2" onchange="reportsContextProposalField(${index},'definition',this.value)">${reportsContextEsc(definition)}</textarea></label><label class="lbl">Exclusões<textarea class="inp" maxlength="2000" rows="2" onchange="reportsContextProposalField(${index},'exclusions',this.value)">${reportsContextEsc(exclusions)}</textarea></label><p><b>Código proposto pelo servidor:</b> ${reportsContextEsc(proposal.proposedId)}. Ao aprovar, um novo código ${reportsContextEsc('ctx-UUID')} será persistido; nenhum código existente será alterado.</p><details><summary>Exemplos readonly (${proposal.examples.length})</summary>${proposal.examples.map(function(example){return `<div class="reports-context-example">${reportsContextEsc(example)}</div>`;}).join('')}</details></article>`;}).join('')}</div><button type="button" class="btn btn-fill" onclick="reportsContextApproveDiscovery()" ${state.busy?'disabled':''}>Adicionar somente categorias revisadas</button></section>`;
}
function reportsContextClassificationHtml(state,config){
  if(!state.classification.length)return '';
  var groups=reportsContextDictionary(config),items=state.classification;
  return `<section class="reports-context-subpanel"><div class="reports-context-subhead"><div><h4>Classificação recebida para revisão</h4><p>Texto original preservado. Selecione manualmente a(s) categoria(s); confiança é qualitativa e não aplica automaticamente.</p></div><button type="button" class="btn btn-out" onclick="reportsContextClearResults()" ${state.busy?'disabled':''}>Descartar este lote</button></div><div class="reports-context-classification-list">${items.map(function(item,index){var ids=new Set(item.selectedIds||[]);return `<article data-context-item="${index}" class="reports-context-item ${item.excluded?'is-excluded':''}"><div class="reports-context-item-text"><strong>${reportsContextEsc(item.text)}</strong><small>${item.count.toLocaleString('pt-BR')} ocorrência(s) · id original r${item.index}</small></div>${item.excluded?'<p class="reports-context-readonly"><b>Excluído para revisão de privacidade.</b> Este texto não pode ser aplicado.</p>':`<p class="reports-context-suggested"><b>Sugestão da análise:</b> ${reportsContextEsc((item.suggestedIds||[]).map(function(id){return groups.find(function(g){return g.id===id;})?.label||id;}).join(' + ')||'Pendente — escolha somente após revisar o texto e o critério.')}</p><div class="reports-context-category-options">${groups.map(function(group){return `<label class="reports-context-check"><input type="checkbox" data-context-category="${reportsContextEsc(group.id)}" onchange="reportsContextClassifyToggle(${index},${reportsContextArg(group.id)},this.checked)" ${ids.has(group.id)?'checked':''}><span><b>${reportsContextEsc(group.label)}</b> <small>(${reportsContextEsc(group.id)})</small></span></label>`;}).join('')}</div><p class="reports-context-reason"><b>Motivo:</b> ${reportsContextEsc(item.reason||'Sem justificativa')} · <b>Confiança qualitativa:</b> ${reportsContextConfidenceText(item.confidence)}</p><label class="reports-context-check"><input type="checkbox" onchange="reportsContextClassifyExclude(${index},this.checked)"><span>Excluir esta sugestão da aplicação</span></label>`}</article>`;}).join('')}</div><button type="button" class="btn btn-fill" onclick="reportsContextApply()" ${state.busy?'disabled':''}>Aplicar somente marcações selecionadas</button><p class="reports-context-muted">Aplicação exige revisão explícita. Textos excluídos ficam readonly e nunca entram nos membros.</p></section>`;
}
function reportsContextControlsHtml(state,config){
  var originals=reportsContextEditorOriginals(),pending=reportsContextPendingIndices(config,state),assigned=originals.length-pending.length;
  return `<div class="reports-context-heading"><div><h3>Classificação contextual — teste</h3><p>Referencial por pergunta: critério, definições, exclusões e até três exemplos por categoria. Sugestões são efêmeras até a aprovação.</p></div><span class="pill pill-blue">${pending.length} pendentes · ${assigned} categorizados</span></div><div class="reports-context-consent-box"><label class="reports-context-consent"><input type="checkbox" onchange="reportsContextSetConsent(this.checked)" ${state.consent?'checked':''} ${state.busy?'disabled':''}><span><b>Autorizo enviar textos à OpenAI.</b> A solicitação inclui a pergunta/critério, definições, exclusões e exemplos informados, além dos textos deste lote. Não envie GPS ou dados pessoais; revise os textos antes. A saída é uma sugestão, não uma decisão.</span></label><p class="reports-context-cost">Usa API OpenAI e o modelo configurado no servidor. Nenhuma chave fica no frontend; não há cota diária adicional do aplicativo.</p></div><div class="reports-context-meta"><label class="lbl" for="rp-context-criterion">Critério desta pergunta <textarea id="rp-context-criterion" class="inp" maxlength="2000" rows="3" placeholder="Ex.: Classificar o motivo citado; separar custo de cobertura e preservar marcas/modelos distintos." onchange="reportsContextDraftMeta('criterion',this.value)">${reportsContextEsc(state.draft?.criterion||'')}</textarea></label><label class="reports-context-check reports-context-multiple"><input type="checkbox" onchange="reportsContextDraftMeta('allowMultiple',this.checked)" ${state.draft?.allowMultiple?'checked':''}><span><b>Permitir múltiplos temas por resposta</b><small>Desmarcado: uma categoria por texto; respostas com vários temas ficam pendentes para revisão. Marcado: presença por categoria, com totais únicos por entrevista e percentuais que podem somar mais de 100%.</small></span></label></div><div class="reports-context-actions"><label class="lbl">Textos por análise<select class="inp" onchange="reportsContextSetBatch(this.value)" ${state.busy?'disabled':''}>${[5,10,20,40,60].map(function(size){return `<option value="${size}" ${state.batchSize===size?'selected':''}>${size}${size===10?' (padrão)' :''}</option>`;}).join('')}</select></label><label class="reports-context-check"><input type="checkbox" onchange="reportsContextSetReeval(this.checked)" ${state.reevalExisting?'checked':''} ${state.busy?'disabled':''}><span><b>Reavaliar textos já categorizados</b><small>Opt-in. Ao aplicar, substitui somente as atribuições dos textos selecionados.</small></span></label><button type="button" class="btn btn-out" onclick="reportsContextSaveMetadata()" ${state.busy?'disabled':''}>Salvar critério e metadados</button><button type="button" class="btn btn-fill" onclick="reportsContextDiscover()" ${state.busy||!state.consent?'disabled':''}>Sugerir categorias da pergunta</button><button type="button" class="btn btn-fill" onclick="reportsContextClassify()" ${state.busy||!state.consent?'disabled':''}>Classificar com categorias revisadas</button><button type="button" class="btn btn-out" onclick="reportsContextUndo()" ${state.busy||!state.undo?'disabled':''}>Desfazer última aplicação contextual</button>${state.lastBatchIndices.length?`<button type="button" class="btn btn-out" onclick="reportsContextNextBatch()" ${state.busy||!state.consent?'disabled':''}>Próximo lote</button><button type="button" class="btn btn-out" onclick="reportsContextReanalyzePending()" ${state.busy||!state.consent?'disabled':''}>Reanalisar pendentes</button>`:''}</div><p class="reports-context-status" role="status" aria-live="polite">${reportsContextEsc(state.message||'Defina o critério e revise o dicionário antes de enviar. Nenhum texto é enviado automaticamente.')}</p>`;
}
function reportsContextRender(){
  var state=reportsContextState(),host=document.getElementById('rp-open-ai');if(!state||!host)return false;
  var config=reportsContextConfigRaw(),scope=typeof reportsOpenEnsureScope==='function'?reportsOpenEnsureScope():null;reportsContextSyncDraft(state,config,scope);reportsContextSyncRevision(state);
  host.innerHTML=`<div class="reports-context-panel"><div class="reports-context-scroll">${reportsContextControlsHtml(state,config)}<section class="reports-context-subpanel"><div class="reports-context-subhead"><div><h4>Dicionário da pergunta (${config.groups.length}/80)</h4><p>IDs estáveis são a identidade. Renomear preserva o ID; alterar definição invalida sugestões após salvar. Categorias vazias são preservadas.</p></div><button type="button" class="btn btn-out" onclick="reportsContextCompleteDefinitions()" ${state.busy?'disabled':''}>Preparar definições para revisão</button></div><div class="reports-context-dictionary">${reportsContextDictionaryHtml(state,config)}</div><div class="reports-context-manual"><h4>Criar categoria manual</h4><div class="reports-context-manual-grid"><label class="lbl">Nome<input id="rp-context-new-label" class="inp" maxlength="160"></label><label class="lbl">Definição<textarea id="rp-context-new-definition" class="inp" maxlength="2000" rows="2"></textarea></label></div><button type="button" class="btn btn-out" onclick="reportsContextCreateManual()" ${state.busy?'disabled':''}>Criar categoria manual</button></div></section>${reportsContextDiscoveryHtml(state,config)}${reportsContextClassificationHtml(state,config)}<p class="reports-context-help">O botão “Salvar agrupamentos na estrutura” no rodapé continua sendo o único passo de persistência do relatório. A IA não é chamada ao abrir o painel.</p></div></div>`;
  return true;
}
