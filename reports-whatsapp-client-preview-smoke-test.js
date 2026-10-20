#!/usr/bin/env node
'use strict';
const assert=require('assert');
const {makeEnv}=require('./reports-whatsapp-share-smoke-test.js');
(async()=>{
 const e=makeEnv();const el=id=>e.document.getElementById(id);const storageCalls=()=>e.db.calls.filter(x=>x.storage).length;
 e.db.people[0].name='Teste Pesquisa Pro Cliente';e.db.people[1].name='Kleber APVS';e.db.links[1].results_released=true;e.db.people[1].results_released=false;
 await e.api.open();assert.equal(el('rw-client').children.filter(o=>!o.disabled).length,2);assert(el('rw-message').value.includes('Teste Pesquisa Pro Cliente'));assert.equal(storageCalls(),0);assert(el('rw-actions').hidden);
 el('rw-client').value='client-global';el('rw-client').dispatchEvent({type:'change'});assert(el('rw-message').value.includes('Kleber APVS'));assert.equal(storageCalls(),0);assert(el('rw-actions').hidden);await e.api.prepare();assert(el('rw-message').value.includes('Kleber APVS'));assert.equal(storageCalls(),1);assert(!el('rw-actions').hidden);
 el('rw-client').value='client-a';el('rw-client').dispatchEvent({type:'change'});assert(el('rw-message').value.includes('Teste Pesquisa Pro Cliente'));assert(el('rw-actions').hidden);assert.equal(storageCalls(),1);
 e.api.reset();e.db.people[1].status='prospecto';await e.api.open();const kleber=el('rw-client').children.find(o=>o.value==='client-global');assert(kleber.disabled);assert(kleber.textContent.includes('Prospecto'));assert(el('rw-recipients-note').textContent.includes('Kleber APVS'));assert(el('rw-message').value.includes('Teste Pesquisa Pro Cliente'));
 el('rw-client').value='client-global';el('rw-client').dispatchEvent({type:'change'});assert.equal(el('rw-message').value,'');assert(el('rw-prepare').disabled);const count=storageCalls();await e.api.prepare();assert.equal(storageCalls(),count);assert(el('rw-actions').hidden);assert(el('rw-prepare').disabled);assert.equal(e.db.people[1].status,'prospecto');
 for(const status of ['pendente','inativo',null,'aprovado','Ativo'])assert(e.api.recipientReason({...e.db.people[0],status},e.db.links));assert.equal(e.api.recipientReason({...e.db.people[0],status:'ativo'},e.db.links),'');
 const own=e.db.people[0];assert(e.api.recipientReason({...own,role:'admin'},e.db.links));assert(e.api.recipientReason({...own,results_released:true},[]).includes('não vinculado'));assert(e.api.recipientReason(own,[{client_id:own.id,results_released:false}]).includes('não liberado'));assert.equal(e.api.recipientReason({...own,results_released:true},[{client_id:own.id,results_released:false}]),'');
 e.api.reset();e.db.links=e.db.links.filter(x=>x.client_id!=='client-a');e.db.people[0].results_released=true;await e.api.open();assert(el('rw-client').children.find(x=>x.value==='client-a').disabled);assert(el('rw-recipients-note').textContent.includes('não vinculado'));assert(el('rw-prepare').disabled);assert(el('rw-actions').hidden);
 e.api.reset();e.db.people=[];await e.api.open();assert(el('rw-client').children.every(x=>x.disabled));assert(el('rw-recipients-note').textContent.includes('Cadastro não disponível'));assert(el('rw-prepare').disabled);
 assert(e.db.calls.every(x=>x.table||x.storage));assert.equal(e.navigations.length,0);assert.equal(e.shareCalls.length,0);e.api.reset();
 console.log('v180: mensagem imediata; dois clientes autorizados; Prospecto visível e bloqueado; cadastro/links/liberações intactos; sem download antes do preparo ou envio automático.');
})().catch(ex=>{console.error(ex);process.exitCode=1;});
