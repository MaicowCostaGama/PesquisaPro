const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
const profileBlock=app.slice(app.indexOf('const RESEARCHER_EDITABLE_INPUTS='),app.indexOf('\nfunction researcherBadgePublicUrl()'));
const pixBlock=app.slice(app.indexOf('async function saveMyPixData(){'),app.indexOf('\nfunction renderMyRejected()'));
function extract(start,end){return app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));}
const usersBlock=extract('function loadUsersIfNeeded(options={}){','\nasync function syncPesqCidades');
const fixtures={name:'Pesquisador Teste',birth:'1992-03-15',phone:'(31) 90000-0000',cidade:'Cidade/MG',rua:'Rua teste',numero:'20',cep:'00000-000',pix_key:'pix-teste-novo',pix_bank:'Banco teste',pix_doc:'titular-teste',pix_ag:'0123',pix_acc:'456789-0'};
const suffixes={name:'name',birth:'birth',phone:'phone',cidade:'cidade',rua:'rua',numero:'numero',cep:'cep',pix_key:'pix-key',pix_bank:'pix-bank',pix_doc:'pix-doc',pix_ag:'pix-ag',pix_acc:'pix-acc'};
function env(options={}){
  const original={id:'pesq-teste',role:'pesq',...fixtures,pix_key:'antigo',pix_ag:'',pix_acc:''};
  const nodes={};for(const [field,suffix] of Object.entries(suffixes))nodes['researcher-profile-'+suffix]={value:fixtures[field],dataset:{},disabled:false};
  nodes['me-pix-key']={value:fixtures.pix_key,dataset:{},disabled:false};nodes['me-pix-bank']={value:fixtures.pix_bank,dataset:{},disabled:false};
  for(const id of ['researcher-profile-save','me-pix-save','tbName','tbAvatar'])nodes[id]={dataset:{},disabled:false,textContent:''};
  const listeners={},alerts=[],calls=[],order=[];let saved={...original},page='researcher-profile';
  const c={console,Set,Map,JSON,Promise,CURRENT_PROFILE:original,RESEARCHER_PROFILE_SAVING:false,RESEARCHER_PROFILE_SAVE_OPERATION:null,RESEARCHER_PROFILE_FORM_DRAFT:null,RESEARCHER_PIX_FORM_DRAFT:null,RESEARCHER_PROFILE_CITIES:[],RESEARCHER_PROFILE_CITIES_DRAFT:['Cidade/MG'],RESEARCHER_PROFILE_CITIES_LOADED:true,
    USERS:[{id:original.id,name:'Antigo',pixKey:'antigo'}],USERS_LOADED:true,USERS_LOADING:false,_usersLoadPromise:null,
    PAYMENTS:[{researcherId:original.id,pixKey:'antigo',valid:7,approvedValidCount:6,status:'aprovado'}],FIN_IDX:0,FIN_ARMED:false,
    profileRowToUser:row=>({id:row.id,name:row.name,phone:row.phone,pixKey:row.pix_key}),initialsOf:()=> 'PT',refreshClientSurveyLinks(){},teamFilterRows(){},setTimeout,
    alert:message=>alerts.push(message),document:{getElementById:id=>nodes[id]||null,querySelector:()=>({dataset:{key:page}}),querySelectorAll:()=>Object.values(nodes),addEventListener:(key,callback)=>listeners[key]=callback},
    go(key){order.push('render');page=key;for(const [field,suffix] of Object.entries(suffixes))nodes['researcher-profile-'+suffix].value=c.RESEARCHER_PROFILE_FORM_DRAFT?.[field]??c.CURRENT_PROFILE?.[field]??'';},
    sb:{async rpc(name,payload){order.push('rpc');calls.push({name,payload});if(options.wait)await options.wait;
      if(options.rpcError)return {error:{message:options.rpcError,code:'PGRST202'}};
      if(!options.noWrite){for(const [key,value] of Object.entries(payload))if(key!=='p_cidades')saved[key.slice(2)]=value;saved.profile_cidades_atuacao=(payload.p_cidades||['Cidade/MG']).map(cidade=>({cidade}));}
      return {error:null};},from(table){assert.equal(table,'profiles');return {select(){return this;},eq(key,id){assert.equal(key,'id');assert.equal(id,original.id);return this;},async single(){order.push('read');return options.readError?{error:{message:'rede'}}:{data:{...saved},error:null};}}}
    }
  };
  vm.createContext(c);vm.runInContext(profileBlock+'\n'+pixBlock,c);
  return {c,nodes,alerts,calls,order,listeners,setPage:key=>page=key,run:expression=>vm.runInContext(expression,c)};
}
async function run(){
  const full=env();await full.run('saveResearcherOwnProfile()');
  assert.equal(full.calls.length,1);
  for(const [field,value] of Object.entries(fixtures))assert.equal(full.calls[0].payload['p_'+field],value,'snapshot perdeu '+field);
  assert.deepEqual(full.order.slice(0,2),['rpc','read']);
  assert.equal(full.c.CURRENT_PROFILE.pix_key,fixtures.pix_key);
  assert.equal(full.c.USERS[0].pixKey,fixtures.pix_key);
  assert.equal(full.c.PAYMENTS[0].pixKey,fixtures.pix_key);
  assert.equal(full.c.PAYMENTS[0].valid,7);assert.equal(full.c.PAYMENTS[0].approvedValidCount,6);assert.equal(full.c.PAYMENTS[0].status,'aprovado');
  assert.equal(full.alerts.length,1);assert.match(full.alerts[0],/salvos e conferidos/);
  assert.equal(full.c.RESEARCHER_PROFILE_SAVING,false);assert.equal(full.nodes['researcher-profile-pix-key'].disabled,false);
  assert.ok(!('p_cpf' in full.calls[0].payload));assert.ok(!('p_role' in full.calls[0].payload));assert.ok(!('p_email' in full.calls[0].payload));
  const optional=env();optional.nodes['researcher-profile-pix-key'].value='';optional.nodes['researcher-profile-pix-ag'].value='';await optional.run('saveResearcherOwnProfile()');
  assert.equal(optional.calls[0].payload.p_pix_key,null);assert.equal(optional.calls[0].payload.p_pix_ag,null);assert.equal(optional.calls[0].payload.p_pix_acc,'456789-0','conta sem agência deve permanecer conta');
  const failed=env({rpcError:'função ausente'});await failed.run('saveResearcherOwnProfile()');
  assert.equal(failed.nodes['researcher-profile-pix-key'].value,fixtures.pix_key);assert.equal(failed.c.CURRENT_PROFILE.pix_key,'antigo');assert.equal(failed.order.includes('render'),false);assert.match(failed.alerts[0],/perfil-pesquisador-edicao.sql/);
  const mismatch=env({noWrite:true});await mismatch.run('saveResearcherOwnProfile()');
  assert.match(mismatch.alerts[0],/não confirmou/);assert.equal(mismatch.c.CURRENT_PROFILE.pix_key,'antigo');assert.equal(mismatch.c.RESEARCHER_PROFILE_FORM_DRAFT.pix_key,fixtures.pix_key);
  const disconnected=env({readError:true});await disconnected.run('saveResearcherOwnProfile()');assert.match(disconnected.alerts[0],/conferir a gravação/);assert.equal(disconnected.c.CURRENT_PROFILE.pix_key,'antigo');
  const invalid=env();invalid.c.RESEARCHER_PROFILE_CITIES_DRAFT=[];await invalid.run('saveResearcherOwnProfile()');assert.equal(invalid.calls.length,0);
  let release;const wait=new Promise(resolve=>release=resolve);const duplicate=env({wait});const request=duplicate.run('saveResearcherOwnProfile()');
  await duplicate.run('saveMyPixData()');assert.equal(duplicate.calls.length,1,'duplo salvamento deve ser bloqueado');release();await request;
  let releaseSession;const stale=env({wait:new Promise(resolve=>releaseSession=resolve)});const staleRequest=stale.run('saveResearcherOwnProfile()');
  stale.c.CURRENT_PROFILE={id:'outra-conta',role:'pesq',pix_key:'outra-chave'};stale.c.RESEARCHER_PROFILE_SAVE_OPERATION=null;stale.c.RESEARCHER_PROFILE_SAVING=false;releaseSession();await staleRequest;
  assert.equal(stale.c.CURRENT_PROFILE.pix_key,'outra-chave');assert.equal(stale.alerts.length,0);assert.equal(stale.order.includes('read'),false);
  const earnings=env();earnings.setPage('my-earnings');earnings.c.RESEARCHER_PROFILE_FORM_DRAFT={rua:'Rascunho preservado'};await earnings.run('saveMyPixData()');
  assert.equal(earnings.calls[0].name,'update_my_researcher_payment_data');assert.equal(Object.keys(earnings.calls[0].payload).length,2);assert.equal(earnings.c.CURRENT_PROFILE.pix_key,fixtures.pix_key);assert.equal(earnings.c.RESEARCHER_PROFILE_FORM_DRAFT.rua,'Rascunho preservado');assert.match(earnings.alerts[0],/conferidos/);
  const earningsFail=env({noWrite:true});await earningsFail.run('saveMyPixData()');assert.equal(earningsFail.c.CURRENT_PROFILE.pix_key,'antigo');assert.match(earningsFail.alerts[0],/não confirmou/);
  const draft=env();draft.listeners.input({target:{id:'researcher-profile-pix-key',value:'rascunho'}});draft.c.go('researcher-profile');assert.equal(draft.nodes['researcher-profile-pix-key'].value,'rascunho');
  // Fresh profile data, rather than values copied into payments, drive finance display.
  const f={SURVEYS:[{id:'survey',team:[]}],PAYMENTS:[{surveyId:'survey',researcherId:'id',pixKey:'antigo',valid:10}],USERS:[{id:'id',name:'Atualizado',phone:'novo',pixKey:'novo'}],pesqUsers:()=>[]};vm.createContext(f);
  vm.runInContext(extract('function finRows(idx){','\nfunction finTotals'),f);const rows=vm.runInContext('finRows(0)',f);assert.equal(rows[0].pixKey,'novo');assert.equal(rows[0].valid,10);assert.equal(f.PAYMENTS[0].pixKey,'novo');assert.equal(rows[0],f.PAYMENTS[0],'aprovações precisam preservar a referência original');
  const loader=env();loader.c.sb.from=()=>({select(){return this;},async order(){return {data:[{id:'pesq-teste',name:'Atualizado',pix_key:'novo'}],error:null};}});
  vm.runInContext(usersBlock,loader.c);await loader.run('loadUsersIfNeeded({force:true,render:false})');assert.equal(loader.c.USERS[0].pixKey,'novo');assert.equal(loader.c.USERS_LOADING,false);assert.equal(loader.c._usersLoadPromise,null);
  const loaderFail=env();loaderFail.c.console={error(){}};loaderFail.c.sb.from=()=>({select(){return this;},async order(){return {error:{message:'rede'}};}});vm.runInContext(usersBlock,loaderFail.c);assert.equal(await loaderFail.run('loadUsersIfNeeded({force:true,render:false})'),false);assert.equal(loaderFail.c._usersLoadPromise,null);
  assert(app.includes("if(previousKey!==key&&['users','finance'].includes(key)"),'gestão deve invalidar cache ao entrar');
  assert(app.includes('await loadUsersIfNeeded({force:true,render:false})'),'exportação deve conferir cadastro atualizado');
  assert(app.includes('updateProfileSafeSelect(USERS[USER_EDIT].id'),'edição administrativa deve confirmar uma linha gravada');
  console.log('researcher-profile-save-integrity-smoke-test: PASS — snapshot, PIX novo/vazio, conta sem agência, releitura, erro, cache e isolamento de sessão.');
}
run().catch(error=>{console.error(error);process.exit(1);});
