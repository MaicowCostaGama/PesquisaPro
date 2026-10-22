const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function assertIncludes(text,message){assert(app.includes(text),message);}
assertIncludes('function normalizeGeoStates(value)','normalização de estados ausente');
assertIncludes('function normalizeGeoCities(value)','normalização de cidades ausente');
assertIncludes('function normalizeSurveyGeo(data)','normalização geográfica da pesquisa ausente');
assertIncludes('const abrangenciaEl=document.getElementById(\'w-abrangencia\')','wizSave não recaptura a abrangência selecionada');
assertIncludes('wizNormalizeGeoForScope();','wizSave não normaliza a abrangência antes de salvar');
assertIncludes('const geo=normalizeSurveyGeo(s);','edição não normaliza a abrangência ao abrir a pesquisa');
assertIncludes('function wizNormalizeGeoForScope()','regras de abrangência não estão centralizadas');

const start=app.indexOf('function normalizeGeoStates(value)');
const end=app.indexOf('\nfunction blankSurveyData',start);
assert(start>=0&&end>start,'bloco de normalização geográfica não encontrado');
const ctx={BR_ESTADOS:[{sigla:'MG'},{sigla:'SP'},{sigla:'RJ'}],ABRANGENCIA_CFG:{municipal:{multiState:false,multiCity:false},estadual:{multiState:false,multiCity:true},nacional:{multiState:true,multiCity:true}}};
vm.createContext(ctx);
vm.runInContext(app.slice(start,end),ctx);
assert.deepEqual([...ctx.normalizeGeoStates('["mg","SP","mg"]')],['MG','SP']);
assert.equal(JSON.stringify(ctx.normalizeGeoCities('{"mg":["Belo Horizonte","Belo Horizonte"],"SP":"São Paulo"}')),JSON.stringify({MG:['Belo Horizonte'],SP:['São Paulo']}));
assert.equal(JSON.stringify(ctx.normalizeSurveyGeo({estados:['MG'],cidades:{SP:['São Paulo']}})),JSON.stringify({estados:['MG','SP'],cidades:{SP:['São Paulo']}}));

const scopeStart=app.indexOf('function wizNormalizeGeoForScope()');
const scopeEnd=app.indexOf('\nfunction wizToggleEstado',scopeStart);
const scopeCtx={...ctx,WIZ:{data:{abrangencia:'municipal',estados:['MG','SP'],cidades:{MG:['Belo Horizonte'],SP:['São Paulo']}}}};
vm.createContext(scopeCtx);
vm.runInContext(app.slice(start,end)+'\n'+app.slice(scopeStart,scopeEnd),scopeCtx);
scopeCtx.wizNormalizeGeoForScope();
assert.equal(JSON.stringify([...scopeCtx.WIZ.data.estados]),JSON.stringify(['MG']));
assert.equal(JSON.stringify(scopeCtx.WIZ.data.cidades),JSON.stringify({MG:['Belo Horizonte']}));
console.log('survey-scope-edit-smoke-test: PASS');
