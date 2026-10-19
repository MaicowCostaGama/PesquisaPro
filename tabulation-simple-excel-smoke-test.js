const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const XLSX=require('./vendor/xlsx.full.min.js');
const moduleText=fs.readFileSync(__dirname+'/reports-simple-tabulation.js','utf8');
const treatmentText=fs.readFileSync(__dirname+'/reports-treatment.js','utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const surveyId=id(1),baseId=id(2),profileId=id(3),q1=id(4),q2=id(5),qClosed=id(6),fp='a'.repeat(64),clone=x=>JSON.parse(JSON.stringify(x));
const profile={id:profileId,role:'admin',status:'ativo'};
const survey={id:surveyId,name:'Pesquisa fictícia v176',questions:[
  {id:q1,dbId:q1,type:'open',position:0,text:'Qual marca?',options:[],opts:[],fields:[]},
  {id:q2,dbId:q2,type:'open',position:1,text:'Qual modelo?',options:[],opts:[],fields:[]},
  {id:qClosed,dbId:qClosed,type:'single',position:2,text:'Região',options:[{label:'Centro'}],opts:['Centro'],fields:[]}
]};
const raw=[
 {answer_id:id(100),event_id:id(200),question_id:q1,field_id:null,value_text:'Fiat',value_number:null,treated_text:null},
 {answer_id:id(101),event_id:id(201),question_id:q1,field_id:null,value_text:'Nissan',value_number:null,treated_text:null},
 {answer_id:id(102),event_id:id(202),question_id:q2,field_id:null,value_text:'Uno',value_number:null,treated_text:null},
 {answer_id:id(103),event_id:id(203),question_id:q2,field_id:null,value_text:'March',value_number:null,treated_text:null}
];
const base={id:baseId,survey_id:surveyId,name:'Base original v176',source_fingerprint:fp,event_count:2,answer_count:4,question_count:3,questions:survey.questions};
let state={survey_id:surveyId,revision:0,managed:false,source:null,base:null,file_name:null,updated_at:null};
let treatment=new Map(),calls=[],downloads=[],confirmValue=true,mode='normal',requestAttempts=0,onChanges=[];
const host={isConnected:true,innerHTML:'',dataset:{},addEventListener(){}};
const document={activeElement:null,getElementById(n){return n==='rp-simple-tabulation'?host:null;}};
function activeRows(versionId){return raw.map(a=>({...a,treated_text:versionId?(treatment.get(a.answer_id)||null):null}));}
function resultFor(name,args){
  calls.push({name,args:clone(args)});
  if(name==='tabulation_simple_state_v176')return clone(state);
  if(name==='tabulation_simple_prepare_v176'){state={...state,base:clone(base)};return clone(state);}
  if(name==='tabulation_version_info_v175')return {id:args.p_version_id,survey_id:surveyId,base_id:baseId,source_fingerprint:fp,event_count:2,revision:1,questions:survey.questions,name:'v176 internal'};
  if(name==='tabulation_excel_rows_v175'){
    if(mode==='short-page'&&args.p_offset===0)return {rows:raw.slice(0,1),total:raw.length,base_id:baseId,version_id:args.p_version_id||null,revision:args.p_version_id?1:0,source_fingerprint:fp};
    const source=activeRows(args.p_version_id).filter(a=>!args.p_question_id||a.question_id===args.p_question_id);
    return {rows:source.slice(args.p_offset,args.p_offset+args.p_limit),total:source.length,base_id:baseId,version_id:args.p_version_id||null,revision:args.p_version_id?1:0,source_fingerprint:fp};
  }
  if(name==='tabulation_simple_apply_v176'){
    requestAttempts++;
    if(mode==='timeout-once'&&requestAttempts===1){const e=new Error('The request timed out');e.name='AbortError';throw e;}
    assert.equal(args.p_survey_id,surveyId);assert.equal(args.p_base_id,baseId);assert.equal(args.p_expected_revision,state.revision);
    assert.ok(Array.isArray(args.p_rows)&&args.p_rows.length===raw.length,'payload has complete original rows');
    for(const r of args.p_rows){assert.ok(raw.some(a=>a.answer_id===r.answer_id&&a.event_id===r.event_id&&a.question_id===r.question_id),'IDs preserved in p_rows');if(r.action==='TRATAR')treatment.set(r.answer_id,r.treated_text);else treatment.delete(r.answer_id);}
    state={survey_id:surveyId,revision:state.revision+1,managed:true,source:{baseId,versionId:id(700+state.revision+1),fingerprint:fp},base:clone(base),file_name:args.p_file_name,updated_at:'2026-10-19T00:00:00Z'};
    return clone(state);
  }
  if(name==='tabulation_simple_restore_v176'){
    assert.equal(args.p_expected_revision,state.revision);treatment.clear();state={...state,revision:state.revision+1,managed:true,source:null,file_name:null,updated_at:'2026-10-19T00:00:00Z'};return clone(state);
  }
  throw new Error('RPC inesperada '+name);
}
function query(name,args){const q={abortSignal(){return q;},then(resolve,reject){return Promise.resolve().then(()=>({data:resultFor(name,args),error:null})).then(resolve,reject);}};return q;}
const sb={rpc:(name,args)=>query(name,args)};
const ctx={console,AbortController,setTimeout,clearTimeout,Map,Set,JSON,Number,String,Object,Array,Date,DataView,Uint8Array,document,crypto:{randomUUID:()=>crypto.randomUUID()},confirm:()=>confirmValue,XLSX:{...XLSX,writeFile:(book,name)=>downloads.push({book,name})}};
ctx.window=ctx;vm.createContext(ctx);vm.runInContext(treatmentText+'\n'+moduleText,ctx);
const api=ctx.PP_SIMPLE_TABULATION;
function envFor(p=profile,s=survey){return {host,sb,loadExcel:async()=>{},getContext:()=>({profile:p,survey:s}),getBusy:()=>false,onChange:async snap=>onChanges.push(clone(snap))};}
function fileFromBook(book,name='tratamento.xlsx'){const bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx',compression:true});const arrayBuffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);return {name,size:bytes.length,arrayBuffer:async()=>arrayBuffer};}
async function wait(){await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));}
let checks=0;function check(name,fn){fn();checks++;console.log('PASS — '+name);}
async function reject(name,fn,re){await assert.rejects(fn,re);checks++;console.log('PASS — '+name);}
(async()=>{
  api.mount(envFor());await wait();
  check('UI direta tem pergunta/todas, download, envio e restore sem nomes/versões/clientes',()=>{assert(host.innerHTML.includes('Tabulação das perguntas abertas'));assert(host.innerHTML.includes('Todas as perguntas abertas'));assert(host.innerHTML.includes('Baixar Excel para tratar'));assert(host.innerHTML.includes('Enviar Excel tratado'));assert(host.innerHTML.includes('Restaurar respostas originais'));for(const bad of ['Nome da nova versão','Criar versão','Salvar estrutura','Usar esta versão no rascunho','Escolher cliente'])assert(!host.innerHTML.includes(bad),bad);});
  check('montagem só lê estado e ausência não prepara base',()=>{assert.deepEqual(calls.map(x=>x.name),['tabulation_simple_state_v176']);assert.equal(state.base,null);});
  await api.exportExcel();
  check('download original prepara base sem ativar fonte e modelo real v176',()=>{assert.equal(calls.filter(x=>x.name==='tabulation_simple_prepare_v176').length,1);assert.equal(state.managed,false);assert.equal(downloads.length,1);const b=downloads[0].book;const control=XLSX.utils.sheet_to_json(b.Sheets._Controle,{header:1,defval:''});const map=Object.fromEntries(control.filter(r=>r[0]).map(r=>[r[0],r[1]]));assert.equal(map.version_id,'');assert.equal(map.revision,'0');assert.equal(map.simple_format,'v176');assert.equal(map.source_base_id,baseId);assert.equal(map.source_version_id,'');assert.equal(b.Sheets.Q01['!cols'][0].hidden,true);assert.equal(b.Sheets.Q01['!cols'][7].hidden,false);assert.equal(b.Sheets.Q01['!cols'][11].hidden,false);assert.equal(b.Sheets.Q01.A1.v,'ID pesquisa');assert.equal(b.Sheets.Q01.H1.v,'Texto original');assert.equal(b.Sheets.Q01.L1.v,'Resposta tratada');});
  let edited=XLSX.read(XLSX.write(downloads[0].book,{type:'buffer',bookType:'xlsx',compression:true}),{type:'buffer',raw:true});
  edited.Sheets.Q01.L2={t:'s',v:'Fiat tratado'};delete edited.Sheets.Q01.K2;
  edited.Sheets.Q02.L2={t:'s',v:'Uno atualizado'};delete edited.Sheets.Q02.K2;
  await api.uploadFile(fileFromBook(edited,'revisao.xlsx'));await wait();
  check('upload automático confirma uma vez, normaliza sem Ação e atualiza duas perguntas',()=>{const a=calls.filter(x=>x.name==='tabulation_simple_apply_v176');assert.equal(a.length,1);assert.equal(a[0].args.p_question_ids.length,2);assert.equal(a[0].args.p_rows.find(x=>x.answer_id===id(100)).action,'TRATAR');assert.equal(a[0].args.p_rows.find(x=>x.answer_id===id(100)).treated_text,'Fiat tratado');assert.equal(a[0].args.p_rows.find(x=>x.answer_id===id(102)).treated_text,'Uno atualizado');assert.equal(onChanges.length,2);assert.equal(state.source.baseId,baseId);assert.equal(state.managed,true);assert.equal(calls.some(x=>x.name==='report_document_save'),false);});
  const bad=XLSX.read(XLSX.write(downloads[0].book,{type:'buffer',bookType:'xlsx',compression:true}),{type:'buffer',raw:true});bad.Sheets.Q01.L2={t:'n',v:2,f:'1+1'};const countBeforeBad=calls.filter(x=>x.name==='tabulation_simple_apply_v176').length;await api.uploadFile(fileFromBook(bad));check('fórmula em Resposta tratada é recusada antes de normalizar',()=>{assert.match(api.getState().error,/fórmulas/);assert.equal(calls.filter(x=>x.name==='tabulation_simple_apply_v176').length,countBeforeBad);});
  const req=a=>a.args.p_request_id;const beforeCancel=calls.filter(x=>x.name==='tabulation_simple_restore_v176').length;confirmValue=false;await api.restore();confirmValue=true;check('cancelar restore não grava',()=>assert.equal(calls.filter(x=>x.name==='tabulation_simple_restore_v176').length,beforeCancel));
  await api.restore();await wait();check('restore confirmado remove fonte, limpa tratamentos e notifica',()=>{assert.equal(calls.filter(x=>x.name==='tabulation_simple_restore_v176').length,beforeCancel+1);assert.equal(state.source,null);assert.equal(treatment.size,0);assert.equal(onChanges.at(-1).source,null);});
  mode='timeout-once';requestAttempts=0;let retryBook=XLSX.read(XLSX.write(downloads[0].book,{type:'buffer',bookType:'xlsx',compression:true}),{type:'buffer',raw:true});retryBook.Sheets.Q01.L2={t:'s',v:'Retentativa'};delete retryBook.Sheets.Q01.K2;await api.uploadFile(fileFromBook(retryBook,'retry.xlsx'));await wait();const pending=api.getState().pending;assert(pending);const pendingArgs=clone(pending.args);mode='normal';await api.retry();await wait();check('timeout preserva UUID e p_rows para retry',()=>{const apps=calls.filter(x=>x.name==='tabulation_simple_apply_v176');assert.equal(apps.length,3);assert.equal(apps[1].args.p_request_id,pendingArgs.p_request_id);assert.equal(apps[2].args.p_request_id,pendingArgs.p_request_id);assert.deepEqual(apps[2].args.p_rows,pendingArgs.p_rows);assert.equal(api.getState().pending,null);});
  mode='short-page';const n=downloads.length;const failedExport=await api.exportExcel();check('falha de página não baixa parcial nem escreve',()=>{assert.equal(failedExport,false);assert(/faltou uma página|página/i.test(api.getState().error));assert.equal(downloads.length,n);});mode='normal';
  const originalIds=raw.map(x=>x.answer_id+':'+x.event_id).join('|');check('IDs originais permanecem intactos e só RPCs v176/v175 foram usados',()=>{assert.equal(raw.map(x=>x.answer_id+':'+x.event_id).join('|'),originalIds);assert(calls.every(x=>/^tabulation_(simple_|excel_rows|version_info)/.test(x.name)));});
  api.reset();const client={id:id(8),role:'cliente',status:'ativo'};const clientHost={isConnected:true,innerHTML:'',dataset:{},addEventListener(){}};const stateCallsBeforeClient=calls.filter(x=>x.name==='tabulation_simple_state_v176').length;api.mount({host:clientHost,sb,loadExcel:async()=>{},getContext:()=>({profile:client,survey}),getBusy:()=>false});check('cliente bloqueado sem RPC direto',()=>{assert(clientHost.innerHTML.includes('somente para a equipe autorizada'));assert.equal(calls.filter(x=>x.name==='tabulation_simple_state_v176').length,stateCallsBeforeClient);});
  console.log('tabulation-simple-excel-smoke-test: PASS — '+checks+' verificações específicas v176.');
})().catch(ex=>{console.error(ex);process.exitCode=1;});
