/* PesquisaPro v188 — importação de opções de perguntas por Excel/CSV.
   O módulo apenas altera o estado local do editor; o salvamento no Supabase
   continua acontecendo pelo fluxo normal de salvar a pesquisa. */
(function(root){
  'use strict';

  const MAX_FILE_BYTES=8*1024*1024;
  const MAX_ROWS=5000;
  const MAX_COLUMNS=20;
  const MAX_CELLS=120000;
  const MAX_OPTION_LENGTH=200;
  const ACCEPTED_EXTENSIONS=new Set(['.xlsx','.xls','.csv']);
  let previewState=null;
  let modal=null;

  function text(value){return String(value??'').replace(/\u0000/g,'').trim();}
  function key(value){return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function cellText(value){
    if(value==null)return '';
    if(typeof value==='object'&&value.v!=null)return text(value.v);
    return text(value);
  }
  function extension(name){
    const value=String(name||'').toLowerCase();
    const dot=value.lastIndexOf('.');
    return dot>=0?value.slice(dot):'';
  }
  function assertFile(file){
    if(!file)throw new Error('Selecione um arquivo de Excel ou CSV.');
    if(!ACCEPTED_EXTENSIONS.has(extension(file.name)))throw new Error('Use um arquivo .xlsx, .xls ou .csv.');
    if(Number(file.size)>MAX_FILE_BYTES)throw new Error('O arquivo excede o limite seguro de 8 MB.');
  }
  function inspectWorkbook(lib,book){
    if(!book?.Sheets||!Array.isArray(book.SheetNames)||!book.SheetNames.length)throw new Error('A planilha não possui uma aba válida.');
    if(book.vbaraw)throw new Error('Planilhas com macros não são aceitas.');
    let cells=0;
    for(const sheetName of book.SheetNames.slice(0,20)){
      const sheet=book.Sheets[sheetName];
      if(!sheet)continue;
      if(sheet['!ref']){
        const bounds=lib.utils.decode_range(sheet['!ref']);
        const rowCount=bounds.e.r-bounds.s.r+1;
        const columnCount=bounds.e.c-bounds.s.c+1;
        if(rowCount>MAX_ROWS+1)throw new Error('A planilha excede o limite de 5.000 linhas.');
        if(columnCount>MAX_COLUMNS)throw new Error('A planilha excede o limite de 20 colunas.');
      }
      for(const [address,cell] of Object.entries(sheet)){
        if(address.startsWith('!'))continue;
        cells++;
        if(cells>MAX_CELLS)throw new Error('A planilha excede o limite seguro de células.');
        if(cell&&(cell.f||cell.F))throw new Error('A planilha contém fórmulas. Use valores simples, sem fórmulas.');
        if(cell&&(cell.l||cell.t==='e'||cell.t==='d'))throw new Error('A planilha contém links, erros ou datas automáticas. Use texto simples.');
      }
    }
    return true;
  }
  function parseWorkbook(lib,book){
    inspectWorkbook(lib,book);
    const sheetName=book.SheetNames[0];
    const sheet=book.Sheets[sheetName];
    if(!sheet?.['!ref'])throw new Error('A primeira aba está vazia.');
    const rows=lib.utils.sheet_to_json(sheet,{header:1,raw:true,defval:''});
    if(rows.length>MAX_ROWS+1)throw new Error('A planilha excede o limite de 5.000 linhas.');
    let column=-1;
    for(let index=0;index<Math.min(MAX_COLUMNS,rows.reduce((max,row)=>Math.max(max,Array.isArray(row)?row.length:0),0));index++){
      if(rows.some(row=>cellText(Array.isArray(row)?row[index]:'')!=='')){column=index;break;}
    }
    if(column<0)throw new Error('Não encontrei uma coluna com opções preenchidas.');
    const rawValues=rows.map(row=>cellText(Array.isArray(row)?row[column]:''));
    if(!rawValues.some(Boolean))throw new Error('Não encontrei opções preenchidas na planilha.');
    return {sheetName,column,rawValues,rawRowCount:rows.length};
  }
  function cleanValues(values){
    const out=[],seen=new Set();
    for(const value of values||[]){
      const item=text(value);
      if(!item)continue;
      if(item.length>MAX_OPTION_LENGTH)throw new Error(`A opção “${item.slice(0,45)}…” excede o limite de ${MAX_OPTION_LENGTH} caracteres.`);
      const normalized=key(item);
      if(!normalized||seen.has(normalized))continue;
      seen.add(normalized);out.push(item);
      if(out.length>MAX_ROWS)throw new Error('A importação excede o limite de 5.000 opções.');
    }
    return out;
  }
  function buildOptionList(existing,imported,mode){
    const old=cleanValues(existing||[]),incoming=cleanValues(imported||[]);
    if(mode==='replace')return incoming;
    if(mode!=='append')throw new Error('Modo de importação inválido.');
    return cleanValues([...old,...incoming]);
  }
  function optionCountLabel(count){return `${count.toLocaleString('pt-BR')} ${count===1?'opção':'opções'}`;}
  function targetFor(qid,fieldIndex){
    const q=typeof root.qFind==='function'?root.qFind(qid):null;
    if(!q)throw new Error('Pergunta não encontrada no editor.');
    if(q.type==='pair'){
      const field=q.fields?.[fieldIndex];
      if(!field||!['single','multi'].includes(field.type))throw new Error('Selecione um subcampo fechado para importar opções.');
      return {q,target:field,label:field.label||`Resposta ${Number(fieldIndex)+1}`};
    }
    if(!['single','multi','ranking'].includes(q.type))throw new Error('Esta pergunta não aceita opções importadas.');
    return {q,target:q,label:q.text||'Pergunta'};
  }
  function describeTarget(qid,fieldIndex){
    try{
      const {q,target,label}=targetFor(qid,fieldIndex);
      return {q,target,label,questionText:q.type==='pair'?`${q.text||'Pergunta'} · ${label}`:label};
    }catch(ex){return {q:null,target:null,label:'',questionText:'Pergunta'};}
  }
  function targetOptions(target,q){return Array.isArray(target?.options)?target.options:(Array.isArray(target?.opts)?target.opts:(Array.isArray(q?.opts)?q.opts:[]));}
  function buttonMarkup(qid,fieldIndex,type){
    const isPair=type==='pair';
    const args=isPair?`${Number(qid)},${Number(fieldIndex)}`:`${Number(qid)}`;
    const label=isPair?'Importar opções deste subcampo':'Importar opções do Excel';
    return `<div class="q-excel-import-tools"><button type="button" class="btn btn-out q-excel-import-button" onclick="PP_QUESTION_OPTIONS_EXCEL.open(${args})">▣ ${label}</button><span>Excel, XLS ou CSV · uma opção por linha</span></div>`;
  }
  function closeModal(){
    if(modal?.parentNode)modal.parentNode.removeChild(modal);
    modal=null;previewState=null;
  }
  function showError(message){
    if(typeof root.alert==='function')root.alert(message);
    else console.warn(message);
  }
  function previewMarkup(){
    const p=previewState;if(!p)return;
    const target=describeTarget(p.qid,p.fieldIndex);
    const sample=p.rawValues.filter(Boolean).slice(0,12);
      const current=cleanValues(targetOptions(target.target,target.q));
    modal=root.document.createElement('div');
    modal.className='q-excel-import-overlay';
    modal.innerHTML=`<section class="q-excel-import-dialog" role="dialog" aria-modal="true" aria-labelledby="qExcelImportTitle">
      <button type="button" class="q-excel-import-close" aria-label="Fechar" data-q-excel-close>×</button>
      <span class="eyebrow">IMPORTAR OPÇÕES · EXCEL</span>
      <h2 id="qExcelImportTitle">Revisar opções importadas</h2>
      <p class="q-excel-import-question"><b>${esc(target.questionText)}</b></p>
      <p class="q-excel-import-file">Arquivo: <b>${esc(p.fileName)}</b> · Aba: ${esc(p.sheetName)} · Coluna ${String.fromCharCode(65+p.column)}</p>
      <div class="q-excel-import-summary"><strong>${optionCountLabel(p.rawValues.filter(Boolean).length)}</strong><span>preenchidas antes da deduplicação · ${optionCountLabel(current.length)} já existentes</span></div>
      <label class="q-excel-import-check"><input type="checkbox" id="qExcelSkipHeader"> A primeira linha é um cabeçalho e deve ser ignorada</label>
      <div class="q-excel-import-mode"><span class="lbl">Como aplicar ao editor?</span><label><input type="radio" name="qExcelMode" value="append" checked> Adicionar às opções atuais</label><label><input type="radio" name="qExcelMode" value="replace"> Substituir as opções atuais</label></div>
      <div class="q-excel-import-preview"><div class="q-excel-import-preview-title">Prévia</div><ol>${sample.map(value=>`<li>${esc(value)}</li>`).join('')}${p.rawValues.filter(Boolean).length>sample.length?`<li class="q-excel-more">… e mais ${p.rawValues.filter(Boolean).length-sample.length}</li>`:''}</ol></div>
      <p class="q-excel-import-note">Linhas vazias e opções repetidas serão removidas. A pesquisa só será alterada quando você confirmar e salvar a pesquisa.</p>
      <div class="q-excel-import-actions"><button type="button" class="btn btn-out" data-q-excel-close>Cancelar</button><button type="button" class="btn btn-fill" data-q-excel-apply>Aplicar opções</button></div>
    </section>`;
    root.document.body.appendChild(modal);
    modal.querySelectorAll('[data-q-excel-close]').forEach(button=>button.addEventListener('click',closeModal));
    modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
    modal.querySelector('[data-q-excel-apply]')?.addEventListener('click',applyPreview);
    modal.querySelector('#qExcelSkipHeader')?.focus();
  }
  function updateQuestionOptions(q,target,next){
    const old=targetOptions(target,q);
    const oldFlags=new Map();
    if(target===q&&Array.isArray(q.endsInterview))old.forEach((value,index)=>{const normalized=key(value);if(normalized)oldFlags.set(normalized,q.endsInterview[index]===true);});
    if(Array.isArray(target.options))target.options=next.slice();
    else target.opts=next.slice();
    if(target===q&&['single','multi'].includes(q.type))q.endsInterview=next.map(value=>oldFlags.get(key(value))===true);
    if(typeof root.qRender==='function')root.qRender();
  }
  function applyPreview(){
    if(!previewState)return;
    try{
      const p=previewState,skip=!!modal.querySelector('#qExcelSkipHeader')?.checked;
      const mode=modal.querySelector('input[name="qExcelMode"]:checked')?.value||'append';
      const imported=cleanValues(p.rawValues.slice(skip?1:0));
      if(!imported.length)throw new Error('Depois de ignorar o cabeçalho, não restaram opções preenchidas.');
      const {q,target}=targetFor(p.qid,p.fieldIndex);
      const next=buildOptionList(targetOptions(target,q),imported,mode);
      if(!next.length)throw new Error('Nenhuma opção válida para aplicar.');
      updateQuestionOptions(q,target,next);
      closeModal();
      if(typeof root.alert==='function')root.alert(`${optionCountLabel(imported.length)} importadas. Revise o formulário e salve a pesquisa para persistir a alteração.`);
    }catch(ex){showError(ex.message||'Não foi possível aplicar as opções.');}
  }
  async function reviewFile(file,qid,fieldIndex){
    assertFile(file);
    if(!root.XLSX&&typeof root.loadLocalAsset==='function')await root.loadLocalAsset('xlsx');
    const lib=root.XLSX;
    if(!lib?.read||!lib.utils?.sheet_to_json)throw new Error('A biblioteca Excel não pôde ser carregada.');
    const buffer=await file.arrayBuffer();
    if(buffer.byteLength>MAX_FILE_BYTES)throw new Error('O arquivo excede o limite seguro de 8 MB.');
    const book=lib.read(buffer,{type:'array',raw:true,cellFormula:true,cellDates:false,bookVBA:true,cellHTML:false});
    const parsed=parseWorkbook(lib,book);
    const target=targetFor(qid,fieldIndex);
    previewState={qid,fieldIndex,fileName:file.name||'opcoes.xlsx',...parsed,questionText:target.label};
    previewMarkup();
  }
  async function open(qid,fieldIndex=null){
    try{
      targetFor(qid,fieldIndex);
      const input=root.document.createElement('input');
      input.type='file';input.accept='.xlsx,.xls,.csv';input.style.display='none';
      input.addEventListener('change',async()=>{
        const file=input.files?.[0];input.remove();if(!file)return;
        try{await reviewFile(file,qid,fieldIndex);}catch(ex){showError(ex.message||'Não foi possível ler a planilha.');}
      });
      root.document.body.appendChild(input);input.click();
    }catch(ex){showError(ex.message||'Não foi possível abrir o importador.');}
  }
  root.PP_QUESTION_OPTIONS_EXCEL={
    MAX_FILE_BYTES,MAX_ROWS,MAX_OPTION_LENGTH,
    buttonMarkup,open,reviewFile,parseWorkbook,cleanValues,buildOptionList,
    getPreview:()=>previewState,close:closeModal
  };
})(window);
