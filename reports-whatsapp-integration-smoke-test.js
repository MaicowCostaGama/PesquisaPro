'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const app=fs.readFileSync(__dirname+'/app.js','utf8'),html=fs.readFileSync(__dirname+'/app.html','utf8');
function fn(n){const a=app.search(new RegExp('^(?:async )?function '+n+'\\(','m'));assert(a>=0,n);const e=app.indexOf('\n',a);return app.slice(a,e).trim().endsWith('}')?app.slice(a,e):app.slice(a,app.indexOf('\n}',a)+2);}
assert(html.includes('reports-whatsapp.js?v=20261020182000'));assert(html.indexOf('reports-whatsapp.js?')<html.indexOf('src="app.js?'));
const ctx=vm.createContext({calls:[],statusEl:{},button:{disabled:true},console});
vm.runInContext(`let RP_REPORT_DOCUMENT_STATUS='new',RP_REPORT_DOCUMENT_ID='doc-test',RP_REPORT_EXPORT_BUSY=false,RP_TAB_SOURCE=null,RP_TAB_META=null,RP_TAB_SOURCE_REVISION=0,RP_TAB_SOURCE_SAVED=0,RP_OPEN_GROUPING={};
const window={PP_REPORT_WHATSAPP:{refresh:()=>calls.push(['refresh',RP_REPORT_DOCUMENT_STATUS,RP_REPORT_EXPORT_BUSY]),reset:()=>calls.push(['reset'])}};
const document={getElementById:()=>statusEl};function reportsOpenClose(){};
${fn('reportsSetDocumentStatus')}\n${fn('reportsOpenReset')}\nreportsSetDocumentStatus('published');reportsSetDocumentStatus('draft');reportsOpenReset();`,ctx);
assert.equal(ctx.calls[0][1],'published');assert.equal(ctx.calls[1][1],'draft');assert.equal(ctx.calls[2][0],'reset');
const editor=fn('reportsDocumentEditorMarkup');assert(editor.includes('id="rp-share-whatsapp"'));assert(editor.includes('window.PP_REPORT_WHATSAPP.open()" disabled'));assert(editor.includes('Enviar relatório por WhatsApp'));
const finalize=fn('reportsFinalizeAndPublish');assert(/finally\{RP_REPORT_EXPORT_BUSY=false;if\(typeof window/.test(finalize));
const run=vm.createContext({events:[],console});
vm.runInContext(`let RP_REPORT_EXPORT_BUSY=false,CURRENT_PROFILE={id:'gestao'};const window={PP_REPORT_WHATSAPP:{refresh:()=>events.push(['button-refresh',RP_REPORT_EXPORT_BUSY])}};
function reportsSimpleBusy(){return false;}function reportsDocFeedback(){}async function reportsRequireDraft(){}function reportsDocPayload(){return {surveyId:'s',clientId:'c'};}function reportsValidatePdfCrossings(){}async function reportsSaveDraft(){return 'doc-test';}async function reportsCreatePdfBlob(){return {blob:{}};}function reportsVerifyDocumentSnapshot(){}function reportsSetDocumentStatus(v){events.push(['status',v]);}const sb={storage:{from:()=>({upload:async()=>({})})},rpc:async()=>({})};
${finalize}\nreportsFinalizeAndPublish();`,run);
(async()=>{await new Promise(r=>setImmediate(r));assert.equal(run.events[0][1],'published');assert.deepEqual(Array.from(run.events[1]),['button-refresh',false]);
assert(fn('logout').includes('PP_REPORT_WHATSAPP.reset()'));assert(fn('go').includes('PP_REPORT_WHATSAPP.reset()'));assert(fn('reportsOpenReset').includes('PP_REPORT_WHATSAPP.reset()'));console.log('PASS v179: integração, script antes do app, publicação habilita botão, rascunho e saída invalidam envio.');})().catch(e=>{console.error(e);process.exitCode=1;});
