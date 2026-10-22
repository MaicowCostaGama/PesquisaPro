/* PesquisaPro — autocomplete de opções grandes na coleta.
   Usa primeiro as opções carregadas na pesquisa e, quando necessário, faz uma
   busca paginada/limitada no banco com a sessão autenticada do pesquisador.
   A busca remota só lê survey_question_options via RLS; não cria acesso novo. */
(function(root){
  'use strict';
  const MAX_SUGGESTIONS=20;
  const MAX_REMOTE_RESULTS=40;
  const queries=new Map();
  const sources=new Map();
  const remoteResults=new Map();
  const remoteSequence=new Map();

  function text(value){return String(value??'').replace(/\u0000/g,'').trim();}
  function normalize(value){return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function arg(value){
    return JSON.stringify(String(value??''))
      .replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
      .replace(/"/g,'&quot;');
  }
  function key(mode,qid,fieldIndex){return `${mode}:${qid}:${fieldIndex==null?'':fieldIndex}`;}
  function optionsFor(options){return (Array.isArray(options)?options:[]).map((value,index)=>({label:text(value),index})).filter(item=>item.label);}
  function optionItems(options,remote){
    const items=optionsFor(options),seen=new Set(items.map(item=>normalize(item.label)));
    for(const item of Array.isArray(remote)?remote:[]){
      const label=text(item?.label),normalized=normalize(label);
      if(!label||seen.has(normalized))continue;
      seen.add(normalized);items.push({label,index:Number.isInteger(Number(item.index))?Number(item.index):items.length});
    }
    return items;
  }
  function filterItems(items,query){
    const list=Array.isArray(items)?items:[],needle=normalize(query);
    if(!needle)return list.slice(0,8);
    const starts=[],contains=[];
    for(const item of list){
      const value=normalize(item.label);
      if(value.startsWith(needle))starts.push(item);
      else if(value.includes(needle))contains.push(item);
      if(starts.length+contains.length>=MAX_SUGGESTIONS)break;
    }
    return starts.concat(contains).slice(0,MAX_SUGGESTIONS);
  }
  function filtered(options,query){return filterItems(optionsFor(options),query);}
  function currentQuery(mode,qid,fieldIndex){return queries.get(key(mode,qid,fieldIndex))||'';}
  function setQuery(mode,qid,fieldIndex,value){queries.set(key(mode,qid,fieldIndex),String(value??''));renderSuggestions(mode,qid,fieldIndex);}
  function clearQuery(mode,qid,fieldIndex){queries.delete(key(mode,qid,fieldIndex));remoteResults.delete(key(mode,qid,fieldIndex));remoteSequence.set(key(mode,qid,fieldIndex),(remoteSequence.get(key(mode,qid,fieldIndex))||0)+1);}
  function wrapper(mode,qid,fieldIndex){return root.document?.querySelector(`[data-q-autocomplete="${mode}:${qid}:${fieldIndex==null?'':fieldIndex}"]`);}
  function sourceKey(mode,qid,fieldIndex){return key(mode,qid,fieldIndex);}
  function remotePattern(value){
    /* Impede que % e _ digitados virem curingas adicionais no ilike. */
    return `%${String(value??'').replace(/[\\%_]/g,'\\$&')}%`;
  }
  async function searchRemote(mode,qid,fieldIndex,query){
    if(!String(query||'').trim()||fieldIndex!=null||!['single','multi'].includes(mode))return;
    const client=root.PP_SUPABASE_CLIENT;
    if(!client?.from)return;
    const searchKey=sourceKey(mode,qid,fieldIndex),sequence=(remoteSequence.get(searchKey)||0)+1;
    remoteSequence.set(searchKey,sequence);
    try{
      const result=await client.from('survey_question_options')
        .select('label,position')
        .eq('question_id',String(qid))
        .ilike('label',remotePattern(query))
        .order('position',{ascending:true})
        .limit(MAX_REMOTE_RESULTS);
      if(remoteSequence.get(searchKey)!==sequence||currentQuery(mode,qid,fieldIndex)!==String(query??''))return;
      if(result.error)throw result.error;
      remoteResults.set(searchKey,{query:String(query??''),items:(result.data||[]).map(row=>({label:row.label,index:Number(row.position)}))});
      renderSuggestions(mode,qid,fieldIndex);
    }catch(error){
      if(remoteSequence.get(searchKey)===sequence)remoteResults.set(searchKey,{query:String(query??''),items:[]});
      console.warn('Busca complementar de opções indisponível:',error?.message||error);
    }
  }
  function suggestionMarkup(mode,qid,fieldIndex,options,selected,remote){
    const query=currentQuery(mode,qid,fieldIndex),items=optionItems(options,remote),results=filterItems(items,query),selectedSet=new Set(Array.isArray(selected)?selected:[]);
    if(!query.trim()&&results.length===0)return '<div class="q-autocomplete-empty">Nenhuma opção disponível.</div>';
    if(query.trim()&&!results.length)return '<div class="q-autocomplete-empty">Nenhuma opção encontrada.</div>';
    const shown=results.map(item=>{
      const isSelected=selectedSet.has(item.label);
      return `<button type="button" class="q-autocomplete-option ${isSelected?'is-selected':''}" data-q-option="${esc(item.label)}" onmousedown="event.preventDefault()" onclick="PP_QUESTION_OPTIONS_AUTOCOMPLETE.select('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},${arg(item.label)},${item.index})"><span>${esc(item.label)}</span>${isSelected?'<b>✓</b>':''}</button>`;
    }).join('');
    const suffix=(query.trim()&&items.length>results.length)?`<small class="q-autocomplete-more">Mostrando até ${MAX_SUGGESTIONS} resultados. Refine a busca para localizar o item correto.</small>`:'';
    return shown+suffix;
  }
  function renderSuggestions(mode,qid,fieldIndex){
    const host=wrapper(mode,qid,fieldIndex);if(!host)return;
    const source=sources.get(sourceKey(mode,qid,fieldIndex))||{};
    const options=source.options||host._qOptions||[],selected=source.selected||host._qSelected||[],remoteState=remoteResults.get(sourceKey(mode,qid,fieldIndex));
    const remote=remoteState?.query===currentQuery(mode,qid,fieldIndex)?remoteState.items:[];
    const list=host.querySelector('[data-q-autocomplete-list]');if(list)list.innerHTML=suggestionMarkup(mode,qid,fieldIndex,options,selected,remote);
  }
  function inputMarkup(mode,qid,fieldIndex,options,selected,locked=false){
    const selectedValues=Array.isArray(selected)?selected:[],query=currentQuery(mode,qid,fieldIndex);
    if(locked)return `<div class="q-autocomplete-locked">${esc(selectedValues[0]||'Opção definida pela cota')}</div>`;
    const hostAttr=`data-q-autocomplete="${esc(`${mode}:${qid}:${fieldIndex==null?'':fieldIndex}`)}"`;
    const source=remoteResults.get(sourceKey(mode,qid,fieldIndex)),remote=source?.query===query?source.items:[];
    return `<div class="q-autocomplete" ${hostAttr} data-q-autocomplete-mode="${esc(mode)}" data-q-autocomplete-qid="${esc(qid)}" data-q-autocomplete-field="${fieldIndex==null?'':Number(fieldIndex)}">
      ${mode==='multi'&&selectedValues.length?`<div class="q-autocomplete-selected">${selectedValues.map(value=>`<span>${esc(value)}<button type="button" aria-label="Remover ${esc(value)}" onclick="PP_QUESTION_OPTIONS_AUTOCOMPLETE.select('multi',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},${arg(value)},${optionsFor(options).find(item=>item.label===value)?.index??-1})">×</button></span>`).join('')}</div>`:''}
      ${mode==='single'||mode==='pair-single'?(selectedValues.length?`<div class="q-autocomplete-current"><b>Selecionado:</b> ${esc(selectedValues[0])}</div>`:''):''}
      <input class="inp q-autocomplete-input" type="search" autocomplete="off" spellcheck="false" value="${esc(query)}" placeholder="Digite para buscar uma opção…" oninput="PP_QUESTION_OPTIONS_AUTOCOMPLETE.input('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},this.value)" onfocus="PP_QUESTION_OPTIONS_AUTOCOMPLETE.focus('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)})" aria-label="Buscar opção">
      <div class="q-autocomplete-list" data-q-autocomplete-list role="listbox">${suggestionMarkup(mode,qid,fieldIndex,options,selectedValues,remote)}</div>
    </div>`;
  }
  function mount(mode,qid,fieldIndex,options,selected,locked=false){
    sources.set(sourceKey(mode,qid,fieldIndex),{options:Array.isArray(options)?options.slice():[],selected:Array.isArray(selected)?selected.slice():[]});
    return inputMarkup(mode,qid,fieldIndex,options,selected,locked);
  }
  function callExisting(mode,qid,fieldIndex,label,index){
    clearQuery(mode,qid,fieldIndex);
    if(mode==='single'&&typeof root.acollectSetAnswer==='function')root.acollectSetAnswer(qid,label,true,index);
    else if(mode==='multi'&&typeof root.acollectToggleMultiAnswer==='function')root.acollectToggleMultiAnswer(qid,label,index);
    else if(mode==='pair-single'&&typeof root.acollectSetPairField==='function'){root.acollectSetPairField(qid,Number(fieldIndex),label);if(typeof root.renderAcollectForm==='function')root.renderAcollectForm();}
    else if(mode==='pair-multi'&&typeof root.acollectTogglePairMulti==='function'){root.acollectTogglePairMulti(qid,Number(fieldIndex),label);if(typeof root.renderAcollectForm==='function')root.renderAcollectForm();}
  }
  function input(mode,qid,fieldIndex,value){
    setQuery(mode,qid,fieldIndex,value);
    const host=wrapper(mode,qid,fieldIndex);if(host)host._qOptions=host._qOptions||[];
    searchRemote(mode,qid,fieldIndex,String(value??''));
  }
  function focus(mode,qid,fieldIndex){renderSuggestions(mode,qid,fieldIndex);}
  function select(mode,qid,fieldIndex,label,index){callExisting(mode,qid,fieldIndex,label,index);}
  function clearAll(){queries.clear();sources.clear();remoteResults.clear();remoteSequence.clear();}
  root.PP_QUESTION_OPTIONS_AUTOCOMPLETE={MAX_SUGGESTIONS,MAX_REMOTE_RESULTS,input,focus,select,clearAll,mount,renderSuggestions,filtered,normalize,searchRemote};
})(window);
