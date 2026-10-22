const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/question-options-autocomplete.js','utf8');
const hosts=new Map();
const list={innerHTML:''};
const host={querySelector(selector){return selector==='[data-q-autocomplete-list]'?list:null;}};
const calls=[];
const client={from(table){
  calls.push(['from',table]);
  const query={
    select(fields){calls.push(['select',fields]);return query;},
    eq(field,value){calls.push(['eq',field,value]);return query;},
    order(field,config){calls.push(['order',field,config]);return query;},
    range(from,to){calls.push(['range',from,to]);return Promise.resolve({data:from===2000?[{label:'RAM RAMPAGE',position:2300}]:Array.from({length:1000},(_,index)=>({label:`Item ${from+index}`,position:from+index})),error:null});},
  };
  return query;
}};
const document={querySelector(selector){const match=selector.match(/data-q-autocomplete="([^"]+)"/);return match?hosts.get(match[1])||null:null;}};
const context={console,Map,Set,Array,Object,String,Number,JSON,Promise,document,PP_SUPABASE_CLIENT:client,acollectSetAnswer(){}};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context);
const api=context.PP_QUESTION_OPTIONS_AUTOCOMPLETE;
hosts.set('single:q-vehicle:',host);
api.mount('single','q-vehicle',null,['AGRALE CITY 50'],[]);
api.input('single','q-vehicle',null,'Ram');
(async()=>{
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(list.innerHTML,/RAM RAMPAGE/,'a opção encontrada no banco deve aparecer na lista');
  assert.equal(calls.filter(call=>call[0]==='eq').length,3);
  assert.deepEqual(calls.filter(call=>call[0]==='range'),[['range',0,999],['range',1000,1999],['range',2000,2999]]);
  console.log('question-options-autocomplete-remote-smoke-test: PASS — opção fora do cache local aparece por busca RLS.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
