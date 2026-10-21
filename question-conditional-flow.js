/* PesquisaPro v189 — caminhos condicionais do questionário.
   Regras são orientadas para frente: uma resposta pode seguir a próxima pergunta,
   saltar para uma pergunta posterior ou encerrar a entrevista. */
(function(root){
  'use strict';

  const DEFAULT='';
  const END='__end__';

  function clean(value){return String(value??'').trim();}
  function questionOptions(question){return (question?.opts||[]).map(value=>clean(value));}
  function answerValues(answer){
    const value=answer?.value;
    if(Array.isArray(value))return value.map(clean).filter(Boolean);
    const single=clean(value);
    return single?[single]:[];
  }
  function answerPresent(answer){return answerValues(answer).length>0;}
  function directTargetFor(question){
    const route=clean(question?.directTarget);
    if(route===END)return END;
    return route||null;
  }
  function routeTargetFor(question,answer){
    if(!question||!answerPresent(answer))return null;
    if(question.type==='single'){
      const values=answerValues(answer),options=questionOptions(question);
      const index=options.findIndex(option=>option===values[0]);
      if(index>=0){
        const route=Array.isArray(question.routeTargets)?clean(question.routeTargets[index]):DEFAULT;
        if(route===END)return END;
        if(route)return route;
      }
    }
    return directTargetFor(question);
  }
  function questionIndexById(questions,id){
    const target=clean(id);
    return (questions||[]).findIndex(question=>String(question.id||question.dbId)===target||String(question.dbId||'')===target);
  }
  function visibleQuestions(questions,answers){
    const list=(questions||[]).filter(question=>question&&question.dbId);
    const visible=[],seen=new Set();
    let index=0;
    while(index>=0&&index<list.length){
      if(seen.has(index))break;
      seen.add(index);
      const question=list[index];
      visible.push(question);
      const answer=answers?.[question.dbId];
      /* Antes de uma resposta existir, mantém a sequência visível para o
         entrevistador. O salto só passa a valer quando a escolha foi feita. */
      if(!answerPresent(answer)){index+=1;continue;}
      const target=routeTargetFor(question,answer);
      if(target===END)break;
      if(target){
        const targetIndex=questionIndexById(list,target);
        if(targetIndex<0)break;
        index=targetIndex;
      }else index+=1;
    }
    return visible;
  }
  function visibleQuestionIds(questions,answers){return visibleQuestions(questions,answers).map(question=>question.dbId);}
  function hiddenAnsweredQuestionIds(questions,answers){
    const visible=new Set(visibleQuestionIds(questions,answers));
    return Object.keys(answers||{}).filter(id=>!visible.has(id));
  }
  function normalizeRouteTargets(question){
    const options=questionOptions(question),routes=Array.isArray(question?.routeTargets)?question.routeTargets:[];
    return options.map((option,index)=>{
      if(!option)return DEFAULT;
      const route=clean(routes[index]);
      return route===END?END:route||DEFAULT;
    });
  }
  function validateQuestions(questions){
    const list=(questions||[]).filter(Boolean),errors=[];
    const indexById=new Map(list.map((question,index)=>[String(question.id),index]));
    for(let index=0;index<list.length;index++){
      const question=list[index];
      const routes=normalizeRouteTargets(question);
      const rawRoutes=Array.isArray(question.routeTargets)?question.routeTargets.map(clean):[];
      const direct=clean(question.directTarget);
      if((routes.some(Boolean)||rawRoutes.some(Boolean))&&question.type!=='single'){
        errors.push(`A pergunta ${index+1} só pode ter caminho por resposta em escolha única.`);
      }
      if(direct&&direct!==END){
        const targetIndex=indexById.get(String(direct));
        if(targetIndex==null)errors.push(`A pergunta ${index+1}, conexão direta, aponta para uma pergunta inexistente.`);
        else if(targetIndex<=index)errors.push(`A pergunta ${index+1}, conexão direta, deve apontar somente para uma pergunta posterior.`);
      }
      routes.forEach((route,optionIndex)=>{
        if(!route||route===END)return;
        const targetIndex=indexById.get(String(route));
        if(targetIndex==null)errors.push(`A pergunta ${index+1}, opção ${optionIndex+1}, aponta para uma pergunta inexistente.`);
        else if(targetIndex<=index)errors.push(`A pergunta ${index+1}, opção ${optionIndex+1}, deve apontar somente para uma pergunta posterior.`);
      });
      routes.forEach((route,optionIndex)=>{
        if(route&&route!==END&&question.endsInterview?.[optionIndex]===true){
          errors.push(`A pergunta ${index+1}, opção ${optionIndex+1}, possui encerramento e salto configurados ao mesmo tempo.`);
        }
      });
    }
    return errors;
  }
  function dbTargetsFromLocal(question,localToDb){
    return normalizeRouteTargets(question).map(route=>{
      if(route===END)return END;
      if(!route)return null;
      return localToDb.get(String(route))||null;
    });
  }
  function dbDirectTargetFromLocal(question,localToDb){
    const route=clean(question?.directTarget);
    if(route===END)return END;
    if(!route)return null;
    return localToDb.get(String(route))||null;
  }

  root.PP_CONDITIONAL_FLOW={
    DEFAULT,END,clean,answerValues,answerPresent,directTargetFor,routeTargetFor,visibleQuestions,
    visibleQuestionIds,hiddenAnsweredQuestionIds,normalizeRouteTargets,validateQuestions,dbTargetsFromLocal,dbDirectTargetFromLocal
  };
})(typeof window!=='undefined'?window:globalThis);
