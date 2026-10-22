#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const autocomplete=fs.readFileSync(path.join(root,'question-currency-autocomplete.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const migrationPath=path.join(root,'deploy','pergunta-valor-moeda-v205.sql');
const migration=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
function assert(condition,message){if(!condition)throw new Error(message);}
assert(app.includes("currency_single")&&app.includes("currency_multi"),'Os dois tipos monetários não estão no construtor.');
assert(app.includes("currency_mode='BRL'")&&app.includes('logicJson.currency=currency'),'A configuração monetária não é persistida no logic_jsonb.');
assert(app.includes('currencyMode=logic?.currency_mode===\'BRL\''),'O carregamento da moeda não lê o logic_jsonb.');
assert(app.includes('acollectCurrencyBody')&&app.includes('PP_QUESTION_CURRENCY_AUTOCOMPLETE'),'A coleta não monta o autocomplete monetário.');
assert(app.includes('value_number:numeric')&&app.includes('value_text:formatCurrencyBRL(numeric)'),'A resposta monetária não é armazenada como número e rótulo formatado.');
assert(app.includes('logic?.currency_mode===\'BRL\'')&&app.includes('approval-form-currency'),'O preview de aprovação não identifica a faixa monetária.');
assert(autocomplete.includes('MAX_SUGGESTIONS=12')&&autocomplete.includes('valuesFor')&&autocomplete.includes('Digite o valor'),'O autocomplete monetário não limita sugestões ou não aceita digitação.');
assert(html.includes('question-currency-autocomplete.js?v=20261022130000'),'O componente monetário não foi incluído no app.html com cache atualizado.');
assert(css.includes('.q-currency-config')&&css.includes('.q-currency-autocomplete'),'Os estilos monetários não foram anexados.');
if(migration){
  assert(migration.includes('create or replace function public.request_survey_form_approval')&&migration.includes("'logic_jsonb'"),'A migration de aprovação não inclui a configuração monetária.');
  assert(migration.includes('begin;')&&migration.includes('commit;'),'A migration monetária não está protegida por transação.');
}else console.warn('currency-question-smoke-test: migration SQL não está no clone público; validação local ignorada.');
console.log('currency-question-smoke-test: PASS');
