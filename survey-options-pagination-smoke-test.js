const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const app=fs.readFileSync(__dirname+'/app.js','utf8');
const start=app.indexOf('async function loadSurveyQuestionOptions(');
const end=app.indexOf('\nfunction attachSurveyQuestionOptions',start);
const writeStart=app.indexOf('async function insertSurveyQuestionOptionsInBatches(');
if(start<0||end<0||writeStart<0||writeStart>start)throw new Error('Funções de paginação não encontradas no app.js');
const constantsStart=app.lastIndexOf('const SURVEY_OPTIONS_PAGE_SIZE=',writeStart);
const constants=app.slice(constantsStart,writeStart);
const functionSource='let SURVEY_END_CONDITION_SCHEMA_MISSING=false;'+constants+app.slice(writeStart,start)+app.slice(start,end)+'\nglobalThis.__insertSurveyQuestionOptionsInBatches=insertSurveyQuestionOptionsInBatches;\nglobalThis.__loadSurveyQuestionOptions=loadSurveyQuestionOptions;';

const options=Array.from({length:2505},(_,index)=>({
  id:`option-${index+1}`,
  question_id:'question-vehicle',
  position:index,
  label:index===2300?'RAM RAMPAGE':'Veículo '+String(index+1).padStart(4,'0'),
}));
let calls=0;
const writes=[];
const sb={
  from(table){
    assert.equal(table,'survey_question_options');
    const query={
      select(){return query;},
      in(column,ids){assert.equal(column,'question_id');assert.deepEqual(Array.from(ids),['question-vehicle']);return query;},
      order(){return query;},
      insert(rows){writes.push(Array.from(rows));return Promise.resolve({error:null});},
      range(from,to){
        calls++;
        return Promise.resolve({data:options.slice(from,to+1),error:null});
      },
    };
    return query;
  },
};
const context={assert,sb,Map,Set,Array,String,Number,Promise,globalThis:{}};
vm.createContext(context);
vm.runInContext(functionSource,context);

(async()=>{
  await context.globalThis.__insertSurveyQuestionOptionsInBatches(options);
  assert.equal(writes.length,6,'2.505 opções exigem seis lotes de gravação de 500');
  assert.deepEqual(writes.map(batch=>batch.length),[500,500,500,500,500,5],'os lotes de gravação preservam todas as opções');
  const map=await context.globalThis.__loadSurveyQuestionOptions([{id:'question-vehicle'}]);
  const loaded=map.get('question-vehicle');
  assert.equal(calls,3,'2.505 opções exigem três páginas de 1.000');
  assert.equal(loaded.length,2505,'todas as opções foram carregadas');
  assert.equal(loaded.find(row=>row.label==='RAM RAMPAGE')?.position,2300,'RAMPAGE chegou após o primeiro lote');
  console.log('survey-options-pagination-smoke-test: PASS — leitura e gravação em lotes preservam opções além do primeiro lote.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
