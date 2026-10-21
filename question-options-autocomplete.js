/* PesquisaPro v195 — autocomplete de opções grandes na coleta.
   O módulo não altera o banco: usa as opções já carregadas da pesquisa e
   chama os handlers existentes quando o pesquisador seleciona uma opção. */
(function(root){
  'use strict';
  const MAX_SUGGESTIONS=20;
  const queries=new Map();
  const sources=new Map();

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
  function filtered(options,query){
    const list=optionsFor(options),needle=normalize(query);
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
  function currentQuery(mode,qid,fieldIndex){return queries.get(key(mode,qid,fieldIndex))||'';}
  function setQuery(mode,qid,fieldIndex,value){queries.set(key(mode,qid,fieldIndex),String(value??''));renderSuggestions(mode,qid,fieldIndex);}
  function clearQuery(mode,qid,fieldIndex){queries.delete(key(mode,qid,fieldIndex));}
  function wrapper(mode,qid,fieldIndex){return root.document?.querySelector(`[data-q-autocomplete="${mode}:${qid}:${fieldIndex==null?'':fieldIndex}"]`);}
  function sourceKey(mode,qid,fieldIndex){return key(mode,qid,fieldIndex);}
  function suggestionMarkup(mode,qid,fieldIndex,options,selected){
    const query=currentQuery(mode,qid,fieldIndex),results=filtered(options,query),selectedSet=new Set(Array.isArray(selected)?selected:[]);
    if(!query.trim()&&results.length===0)return '<div class="q-autocomplete-empty">Nenhuma opção disponível.</div>';
    if(query.trim()&&!results.length)return '<div class="q-autocomplete-empty">Nenhuma opção encontrada.</div>';
    const shown=results.map(item=>{
      const isSelected=selectedSet.has(item.label);
      return `<button type="button" class="q-autocomplete-option ${isSelected?'is-selected':''}" data-q-option="${esc(item.label)}" onmousedown="event.preventDefault()" onclick="PP_QUESTION_OPTIONS_AUTOCOMPLETE.select('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},${arg(item.label)},${item.index})"><span>${esc(item.label)}</span>${isSelected?'<b>✓</b>':''}</button>`;
    }).join('');
    const suffix=(query.trim()&&optionsFor(options).length>results.length)?`<small class="q-autocomplete-more">Mostrando até ${MAX_SUGGESTIONS} resultados. Refine a busca para localizar o item correto.</small>`:'';
    return shown+suffix;
  }
  function renderSuggestions(mode,qid,fieldIndex){
    const host=wrapper(mode,qid,fieldIndex);if(!host)return;
    const source=sources.get(sourceKey(mode,qid,fieldIndex))||{};
    const options=source.options||host._qOptions||[],selected=source.selected||host._qSelected||[];
    const list=host.querySelector('[data-q-autocomplete-list]');if(list)list.innerHTML=suggestionMarkup(mode,qid,fieldIndex,options,selected);
  }
  function inputMarkup(mode,qid,fieldIndex,options,selected,locked=false){
    const idKey=key(mode,qid,fieldIndex),selectedValues=Array.isArray(selected)?selected:[],query=currentQuery(mode,qid,fieldIndex);
    if(locked)return `<div class="q-autocomplete-locked">${esc(selectedValues[0]||'Opção definida pela cota')}</div>`;
    const hostAttr=`data-q-autocomplete="${esc(`${mode}:${qid}:${fieldIndex==null?'':fieldIndex}`)}"`;
    return `<div class="q-autocomplete" ${hostAttr} data-q-autocomplete-mode="${esc(mode)}" data-q-autocomplete-qid="${esc(qid)}" data-q-autocomplete-field="${fieldIndex==null?'':Number(fieldIndex)}">
      ${mode==='multi'&&selectedValues.length?`<div class="q-autocomplete-selected">${selectedValues.map(value=>`<span>${esc(value)}<button type="button" aria-label="Remover ${esc(value)}" onclick="PP_QUESTION_OPTIONS_AUTOCOMPLETE.select('multi',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},${arg(value)},${optionsFor(options).find(item=>item.label===value)?.index??-1})">×</button></span>`).join('')}</div>`:''}
      ${mode==='single'||mode==='pair-single'?(selectedValues.length?`<div class="q-autocomplete-current"><b>Selecionado:</b> ${esc(selectedValues[0])}</div>`:''):''}
      <input class="inp q-autocomplete-input" type="search" autocomplete="off" spellcheck="false" value="${esc(query)}" placeholder="Digite para buscar uma opção…" oninput="PP_QUESTION_OPTIONS_AUTOCOMPLETE.input('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)},this.value)" onfocus="PP_QUESTION_OPTIONS_AUTOCOMPLETE.focus('${esc(mode)}',${arg(qid)},${fieldIndex==null?'null':Number(fieldIndex)})" aria-label="Buscar opção">
      <div class="q-autocomplete-list" data-q-autocomplete-list role="listbox">${suggestionMarkup(mode,qid,fieldIndex,options,selectedValues)}</div>
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
  }
  function focus(mode,qid,fieldIndex){renderSuggestions(mode,qid,fieldIndex);}
  function select(mode,qid,fieldIndex,label,index){callExisting(mode,qid,fieldIndex,label,index);}
  function clearAll(){queries.clear();sources.clear();}
  root.PP_QUESTION_OPTIONS_AUTOCOMPLETE={MAX_SUGGESTIONS,input,focus,select,clearAll,mount,renderSuggestions,filtered,normalize};
})(window);
