'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const SOURCE=fs.readFileSync(path.join(__dirname,'route-modules.js'),'utf8');
const FILES=[
  'reports-treatment.js',
  'reports-simple-tabulation.js',
  'reports-client.js',
  'reports-client-original-excel.js',
  'reports-tabulation.js',
  'reports-whatsapp.js'
];

class FakeScript{
  constructor(){
    this.dataset={};
    this.parentNode=null;
    this.onload=null;
    this.onerror=null;
    this.src='';
    this.async=true;
    this.defer=true;
  }
  setAttribute(name,value){
    if(name==='data-pp-route-module')this.dataset.ppRouteModule=value;
    this[name]=value;
  }
}

class FakeHead{
  constructor(env){this.env=env;this.children=[];}
  appendChild(node){
    node.parentNode=this;
    this.children.push(node);
    this.env.created.push(node);
    return node;
  }
  removeChild(node){
    const index=this.children.indexOf(node);
    if(index>=0)this.children.splice(index,1);
    node.parentNode=null;
    this.env.removed.push(node);
    return node;
  }
}

function makeEnvironment(profile={id:'profile-a'}){
  const env={created:[],removed:[],timers:[],goCalls:[],sidebarClosed:0};
  const head=new FakeHead(env);
  const main={id:'main',innerHTML:''};
  const meta={content:'build-test-42',getAttribute(name){return name==='content'?this.content:null;}};
  const document={
    head,
    querySelector(selector){
      return selector==='meta[name="pesquisapro-app-version"]'?meta:null;
    },
    getElementById(id){return id==='main'?main:null;},
    createElement(name){
      assert.equal(name,'script');
      return new FakeScript();
    }
  };
  const window={
    document,
    closeSidebar(){env.sidebarClosed+=1;},
    go(key){env.goCalls.push(key);}
  };
  const sandbox={
    window,
    globalThis:window,
    document,
    CURRENT_PROFILE:profile,
    setTimeout(callback,ms){
      const timer={callback,ms,active:true};
      env.timers.push(timer);
      return timer;
    },
    clearTimeout(timer){if(timer)timer.active=false;},
    console,
    Promise,
    Error,
    encodeURIComponent,
    String,
    Object,
    Number,
    Array
  };
  env.window=window;
  env.sandbox=sandbox;
  env.main=main;
  env.profile=profile;
  env.load=()=>{
    vm.runInNewContext(SOURCE,sandbox,{filename:'route-modules.js'});
    return window.PP_ROUTE_MODULES;
  };
  env.flush=async()=>{
    for(let index=0;index<8;index++)await Promise.resolve();
  };
  env.setProfile=(next)=>{
    sandbox.CURRENT_PROFILE=next;
    window.CURRENT_PROFILE=next;
  };
  env.resolveNext=async()=>{
    const script=env.created[env.nextToResolve||0];
    assert.ok(script,'Esperava um script pendente.');
    env.nextToResolve=(env.nextToResolve||0)+1;
    assert.match(script.src,/\?v=build-test-42$/);
    assert.equal(typeof script.onload,'function');
    script.onload();
    await env.flush();
  };
  env.loadAll=async()=>{
    for(let index=0;index<FILES.length;index++)await env.resolveNext();
  };
  return env;
}

async function testExcludedRoutes(){
  const env=makeEnvironment();
  const modules=env.load();
  for(const key of ['dashboard-pesq','app-collect','users']){
    assert.equal(modules.prepare(key,'dashboard'),true,`rota ${key} não deve carregar relatórios`);
  }
  assert.equal(env.created.length,0);
  assert.equal(env.goCalls.length,0);
}

async function testOrderAndOneExecution(){
  const env=makeEnvironment();
  const modules=env.load();
  assert.equal(modules.prepare('reports','dashboard'),false);
  assert.equal(env.created.length,1);
  assert.equal(env.created[0].src,'reports-treatment.js?v=build-test-42');
  assert.equal(env.sidebarClosed,1);

  /* Uma segunda intenção no mesmo grupo reutiliza a promessa e não cria
     outro elemento. Só a última rota deve ser retomada ao final. */
  assert.equal(modules.prepare('client-progress','reports'),false);
  assert.equal(env.created.length,1);
  await env.loadAll();

  assert.deepEqual(env.created.map(script=>script.src),FILES.map(file=>file+'?v=build-test-42'));
  assert.deepEqual(env.goCalls,['client-progress']);
  assert.equal(env.created.length,FILES.length);

  assert.equal(modules.prepare('client-results','client-progress'),true);
  assert.equal(modules.prepare('reports','client-results'),true);
  assert.equal(env.created.length,FILES.length,'módulos já carregados não podem ser reinjetados');
  assert.deepEqual(env.goCalls,['client-progress']);
}

async function testOnErrorRetry(){
  const env=makeEnvironment();
  const modules=env.load();
  assert.equal(modules.prepare('reports','dashboard'),false);
  const first=env.created[0];
  assert.equal(typeof first.onerror,'function');
  first.onerror(new Error('falha simulada'));
  await env.flush();
  assert.equal(env.removed.length,1,'onerror deve remover o elemento antes de permitir retry');
  assert.match(env.main.innerHTML,/Tentar novamente/);
  assert.match(env.main.innerHTML,/Não foi possível carregar esta área/);

  assert.equal(modules.retry(),false);
  assert.equal(env.created.length,2);
  assert.equal(env.created[1].src,first.src);
  assert.equal(env.created[0].parentNode,null);
  env.nextToResolve=1;
  await env.loadAll();
  assert.equal(env.created.length,FILES.length+1);
  assert.equal(env.created.filter(script=>script.src===first.src).length,2);
  assert.deepEqual(env.goCalls,['reports']);
}

async function testTimeoutIsUncertain(){
  const env=makeEnvironment();
  const modules=env.load();
  assert.equal(modules.prepare('reports','dashboard'),false);
  const timer=env.timers.find(item=>item.active&&item.ms===15000);
  assert.ok(timer,'o primeiro script deve ter timeout de 15 segundos');
  timer.callback();
  await env.flush();
  assert.equal(env.created.length,1);
  assert.equal(env.removed.length,0,'timeout não pode remover o script de resultado incerto');
  assert.match(env.main.innerHTML,/recarregue o aplicativo/);
  assert.equal(modules.retry(),false);
  assert.equal(env.created.length,1,'timeout não pode reinjetar o script');
}

async function testStaleRouteAndSession(){
  const routeEnv=makeEnvironment({id:'profile-a'});
  const routeModules=routeEnv.load();
  assert.equal(routeModules.prepare('reports','dashboard'),false);
  assert.equal(routeModules.prepare('dashboard-pesq','reports'),true);
  await routeEnv.loadAll();
  assert.deepEqual(routeEnv.goCalls,[],'navegação antiga não pode retomar a rota após troca');

  const sessionEnv=makeEnvironment({id:'profile-a'});
  const sessionModules=sessionEnv.load();
  assert.equal(sessionModules.prepare('reports','dashboard'),false);
  sessionEnv.setProfile({id:'profile-b'});
  await sessionEnv.loadAll();
  assert.deepEqual(sessionEnv.goCalls,[],'sessão antiga não pode retomar a rota após troca de perfil');
}

(async()=>{
  await testExcludedRoutes();
  await testOrderAndOneExecution();
  await testOnErrorRetry();
  await testTimeoutIsUncertain();
  await testStaleRouteAndSession();
  console.log('route-modules smoke test: ok');
})().catch(error=>{
  console.error(error&&error.stack||error);
  process.exitCode=1;
});
