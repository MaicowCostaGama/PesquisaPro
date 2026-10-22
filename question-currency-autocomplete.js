/* PesquisaPro — autocomplete de valores monetários em reais.
   Gera apenas sugestões próximas do que foi digitado; não materializa toda a faixa.
   Os handlers existentes continuam responsáveis por manter o estado da coleta. */
(function(root){
  'use strict';
  const MAX_SUGGESTIONS=12;
  const states=new Map();
  const text=value=>String(value??'').replace(/\u0000/g,'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arg=value=>JSON.stringify(String(value??'')).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/"/g,'&quot;');
  const key=(mode,qid)=>`${mode}:${qid}`;
  function configOf(config){
    const min=Math.max(0.01,Number(config?.min)||0.01),max=Math.max(min+0.01,Number(config?.max)||1000),step=Math.max(0.01,Number(config?.step)||0.01);
    return {min,max,step};
  }
  function parseMoney(value){
    let raw=text(value).replace(/R\$/gi,'').replace(/\s/g,'');
    if(!raw)return null;
    if(raw.includes(',')&&raw.includes('.'))raw=raw.lastIndexOf(',')>raw.lastIndexOf('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');
    else if(raw.includes(','))raw=raw.replace(',','.');
    const n=Number(raw.replace(/[^0-9.+-]/g,''));
    return Number.isFinite(n)?n:null;
  }
  function round(value){return Math.round(Number(value)*100)/100;}
  function aligned(value,cfg){
    const steps=Math.round((value-cfg.min)/cfg.step);
    return round(cfg.min+steps*cfg.step);
  }
  function valid(value,cfg){return Number.isFinite(value)&&value>=cfg.min-0.000001&&value<=cfg.max+0.000001;}
  function valuesFor(query,cfg){
    const typed=parseMoney(query),list=[];
    if(typed==null){for(let i=0;i<MAX_SUGGESTIONS;i++){const value=round(cfg.min+i*cfg.step);if(valid(value,cfg))list.push(value);else break;}return list;}
    if(valid(typed,cfg))list.push(round(typed));
    const center=aligned(Math.max(cfg.min,Math.min(cfg.max,typed)),cfg);
    const centerIndex=Math.max(0,Math.round((center-cfg.min)/cfg.step));
    for(let offset=0;list.length<MAX_SUGGESTIONS&&offset<MAX_SUGGESTIONS;offset++){
      const candidates=offset===0?[center]:[centerIndex-offset,centerIndex+offset].map(index=>round(cfg.min+index*cfg.step));
      for(const value of candidates)if(valid(value,cfg)&&!list.includes(value))list.push(value);
    }
    return list;
  }
  function host(mode,qid){return root.document?.querySelector(`[data-currency-autocomplete="${mode}:${qid}"]`);}
  function render(mode,qid){
    const el=host(mode,qid),state=states.get(key(mode,qid));if(!el||!state)return;
    const values=valuesFor(state.query,state.config),selected=Array.isArray(state.selected)?state.selected:[];
    const list=el.querySelector('[data-currency-list]');if(!list)return;
    if(!values.length){list.innerHTML='<div class="q-autocomplete-empty">Digite um valor dentro da faixa configurada.</div>';return;}
    list.innerHTML=values.map(value=>{
      const selectedNow=selected.some(item=>Math.abs(Number(item)-value)<0.005);
      return `<button type="button" class="q-autocomplete-option ${selectedNow?'is-selected':''}" onmousedown="event.preventDefault()" onclick="PP_QUESTION_CURRENCY_AUTOCOMPLETE.select('${mode}',${arg(qid)},${value})"><span>${esc(value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}))}</span>${selectedNow?'<b>✓</b>':''}</button>`;
    }).join('');
  }
  function inputMarkup(mode,qid,config,selected,locked){
    const state=states.get(key(mode,qid)),values=Array.isArray(selected)?selected:[];
    if(locked)return `<div class="q-autocomplete-locked">${esc(values[0]!=null?format(values[0]):'Valor definido pela cota')}</div>`;
    return `<div class="q-autocomplete q-currency-autocomplete" data-currency-autocomplete="${esc(`${mode}:${qid}`)}">
      ${mode==='currency-multi'&&values.length?`<div class="q-autocomplete-selected">${values.map(value=>`<span>${esc(format(value))}<button type="button" aria-label="Remover ${esc(format(value))}" onclick="PP_QUESTION_CURRENCY_AUTOCOMPLETE.select('${mode}',${arg(qid)},${Number(value)})">×</button></span>`).join('')}</div>`:''}
      ${mode==='currency-single'&&values.length?`<div class="q-autocomplete-current"><b>Selecionado:</b> ${esc(format(values[0]))}</div>`:''}
      <input class="inp q-autocomplete-input" type="search" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(state?.query||'')}" placeholder="Digite o valor, por exemplo 25,50" oninput="PP_QUESTION_CURRENCY_AUTOCOMPLETE.input('${mode}',${arg(qid)},this.value)" onfocus="PP_QUESTION_CURRENCY_AUTOCOMPLETE.focus('${mode}',${arg(qid)})" aria-label="Buscar valor em reais">
      <div class="q-autocomplete-list" data-currency-list role="listbox"></div>
    </div>`;
  }
  function format(value){return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});}
  function mount(mode,qid,config,selected,locked=false){
    states.set(key(mode,qid),{config:configOf(config),selected:Array.isArray(selected)?selected.slice():[],query:''});
    const html=inputMarkup(mode,qid,config,selected,locked);setTimeout(()=>render(mode,qid),0);return html;
  }
  function input(mode,qid,value){const state=states.get(key(mode,qid));if(!state)return;state.query=String(value??'');render(mode,qid);}
  function focus(mode,qid){render(mode,qid);}
  function select(mode,qid,value){
    const state=states.get(key(mode,qid));if(!state)return;
    state.query='';const number=round(value);
    if(mode==='currency-single'&&typeof root.acollectSetAnswer==='function')root.acollectSetAnswer(qid,number,true);
    else if(mode==='currency-multi'&&typeof root.acollectToggleMultiAnswer==='function')root.acollectToggleMultiAnswer(qid,number,null);
  }
  function clearAll(){states.clear();}
  root.PP_QUESTION_CURRENCY_AUTOCOMPLETE={mount,input,focus,select,clearAll,parseMoney,valuesFor,format};
})(window);
