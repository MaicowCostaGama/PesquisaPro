/* PesquisaPro — módulos de rota carregados sob demanda.
   Este arquivo é deliberadamente independente do app.js: a integração chama
   window.PP_ROUTE_MODULES.prepare(key, previousKey) antes de renderizar. */
(function(root){
  'use strict';

  var REPORT_ROUTES={reports:true,'client-progress':true,'client-results':true};
  var REPORT_FILES=[
    'reports-treatment.js',
    'reports-simple-tabulation.js',
    'reports-client.js',
    'reports-client-original-excel.js',
    'reports-tabulation.js',
    'reports-whatsapp.js'
  ];
  var SCRIPT_TIMEOUT_MS=15000;
  var intentSerial=0;
  var currentIntent=null;
  var lastRequest=null;
  var records=Object.create(null);
  var group={state:'idle',promise:null,error:null};

  function currentProfile(){
    /* CURRENT_PROFILE é um let lexical do app.js e, por isso, pode não ser
       uma propriedade de window. typeof mantém este arquivo seguro quando ele
       é avaliado antes do código principal. */
    try{
      if(typeof CURRENT_PROFILE!=='undefined')return CURRENT_PROFILE;
    }catch(_){/* binding ainda não disponível */}
    return root.CURRENT_PROFILE||null;
  }

  function appDocument(){return root.document||(typeof document!=='undefined'?document:null);}

  function appVersion(){
    var doc=appDocument(),meta=null;
    try{meta=doc&&doc.querySelector&&doc.querySelector('meta[name="pesquisapro-app-version"]');}catch(_){meta=null;}
    return String(meta&&(
      meta.content||
      (meta.getAttribute&&meta.getAttribute('content'))||
      ''
    )||'').trim();
  }

  function scriptUrl(file){
    var version=appVersion();
    return version?file+'?v='+encodeURIComponent(version):file;
  }

  function mainElement(){
    var doc=appDocument();
    return doc&&doc.getElementById?doc.getElementById('main'):null;
  }

  function closeAvailableSidebar(){
    try{
      if(typeof root.closeSidebar==='function'){root.closeSidebar();return;}
    }catch(_){/* fechamento é apenas um auxílio visual */}
    try{
      if(typeof closeSidebar==='function')closeSidebar();
    }catch(_){/* app.js ainda pode não ter sido avaliado */}
  }

  function setMain(html){
    var main=mainElement();
    if(main)main.innerHTML=html;
  }

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function showLoading(request){
    setMain('<div class="empty route-modules-loading" role="status" aria-live="polite">Carregando esta área…</div>');
    closeAvailableSidebar();
  }

  function errorMessage(error){
    if(error&&error.uncertain){
      return 'O carregamento de um módulo demorou mais de 15 segundos. Para evitar executar o mesmo script duas vezes, ele não será reinjetado automaticamente; recarregue o aplicativo e tente abrir esta área novamente.';
    }
    var detail=error&&error.message?String(error.message):'Não foi possível carregar os módulos desta área.';
    return 'Não foi possível carregar esta área. '+detail;
  }

  function showError(request,error){
    if(!isCurrent(request))return;
    setMain('<div class="card route-modules-error" role="alert"><strong>Relatórios indisponíveis no momento</strong><p>'+escapeHtml(errorMessage(error))+'</p><button type="button" class="btn btn-out" onclick="window.PP_ROUTE_MODULES.retry()">Tentar novamente</button></div>');
    closeAvailableSidebar();
  }

  function isCurrent(request){
    return !!request&&currentIntent===request&&currentProfile()===request.profile;
  }

  function scriptElementId(file){
    return 'pp-route-module-'+file.replace(/[^a-zA-Z0-9_-]/g,'-');
  }

  function markScriptElement(script,file){
    script.id=scriptElementId(file);
    if(script.dataset)script.dataset.ppRouteModule=file;
    else if(script.setAttribute)script.setAttribute('data-pp-route-module',file);
  }

  function appendTarget(doc){
    return doc&&(
      doc.head||
      doc.body||
      doc.documentElement
    );
  }

  function loadScript(file){
    var existing=records[file];
    if(existing){
      if(existing.state==='loaded')return Promise.resolve();
      if(existing.state==='loading')return existing.promise;
      if(existing.state==='uncertain')return Promise.reject(existing.error);
      /* onerror deixa o registro recuperável; retry removeu o elemento. */
    }

    var doc=appDocument();
    if(!doc||typeof doc.createElement!=='function'){
      return Promise.reject(new Error('O documento não permite carregar módulos de rota.'));
    }

    var record=existing||{file:file,state:'new',element:null,promise:null,error:null};
    var script;
    try{script=doc.createElement('script');}
    catch(error){
      return Promise.reject(error instanceof Error?error:new Error(String(error)));
    }
    var settled=false;
    var timer=null;
    record.state='loading';
    record.element=script;
    record.error=null;
    markScriptElement(script,file);
    script.src=scriptUrl(file);
    script.async=false;
    script.defer=false;

    record.promise=new Promise(function(resolve,reject){
      function finish(callback,value){
        if(settled)return;
        settled=true;
        if(timer!==null)clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        callback(value);
      }
      script.onload=function(){
        finish(function(){record.state='loaded';resolve();});
      };
      script.onerror=function(){
        finish(function(){
          record.state='error';
          record.error=new Error('Não foi possível carregar '+file+'.');
          if(script.parentNode&&script.parentNode.removeChild)script.parentNode.removeChild(script);
          record.element=null;
          reject(record.error);
        });
      };
      timer=setTimeout(function(){
        if(settled)return;
        settled=true;
        timer=null;
        script.onload=null;
        script.onerror=null;
        record.state='uncertain';
        record.error=new Error('Tempo esgotado ao carregar '+file+'.');
        record.error.uncertain=true;
        /* Não remover nem reinjetar: o script pode ainda executar depois do
           timeout, e uma segunda execução pode redeclarar globals lexicais. */
        reject(record.error);
      },SCRIPT_TIMEOUT_MS);
      try{
        var target=appendTarget(doc);
        if(!target||typeof target.appendChild!=='function')throw new Error('O documento não tem um destino para scripts.');
        target.appendChild(script);
      }catch(error){
        finish(function(){
          record.state='error';
          record.error=error instanceof Error?error:new Error(String(error));
          if(script.parentNode&&script.parentNode.removeChild)script.parentNode.removeChild(script);
          record.element=null;
          reject(record.error);
        });
      }
    });
    records[file]=record;
    return record.promise;
  }

  function loadReportGroup(){
    if(group.promise)return group.promise;
    group.state='loading';
    group.error=null;
    /* Começar o primeiro elemento antes de devolver de prepare() torna o
       início observável e mantém os demais estritamente em sequência. */
    var chain;
    try{chain=loadScript(REPORT_FILES[0]);}
    catch(error){chain=Promise.reject(error);}
    for(var index=1;index<REPORT_FILES.length;index++){
      (function(file){
        chain=chain.then(function(){return loadScript(file);});
      })(REPORT_FILES[index]);
    }
    group.promise=chain.then(function(){
      group.state='loaded';
      group.error=null;
      return true;
    }).catch(function(error){
      group.error=error;
      group.state=error&&error.uncertain?'blocked':'error';
      throw error;
    });
    return group.promise;
  }

  function rerenderIfCurrent(request){
    if(!isCurrent(request))return;
    var goFunction=root.go;
    if(typeof goFunction==='function')goFunction(request.key);
    else{
      try{
        if(typeof go==='function')go(request.key);
      }catch(_){/* app.js ainda não expôs o navegador */}
    }
  }

  function watchGroup(request,promise){
    promise.then(function(){
      if(isCurrent(request))rerenderIfCurrent(request);
    },function(error){
      if(isCurrent(request))showError(request,error);
    });
  }

  function prepare(key,previousKey){
    var route=String(key||'');
    var request={
      key:route,
      previousKey:previousKey==null?'':String(previousKey),
      profile:currentProfile(),
      token:++intentSerial
    };
    currentIntent=request;
    lastRequest=request;

    if(!REPORT_ROUTES[route])return true;
    if(group.state==='loaded')return true;
    if(group.state==='blocked'||group.state==='error'){
      if(group.error)showError(request,group.error);
      return false;
    }

    showLoading(request);
    var promise=loadReportGroup();
    watchGroup(request,promise);
    return false;
  }

  function retry(){
    var request=lastRequest;
    if(!request||!REPORT_ROUTES[request.key]||!isCurrent(request))return false;
    if(group.state==='loaded')return true;
    if(group.state==='blocked'){
      showError(request,group.error||new Error('O carregamento excedeu o tempo limite.'));
      return false;
    }
    if(group.state!=='error'){
      if(group.state==='loading')showLoading(request);
      return false;
    }
    group.promise=null;
    group.state='idle';
    group.error=null;
    showLoading(request);
    var promise=loadReportGroup();
    watchGroup(request,promise);
    return false;
  }

  root.PP_ROUTE_MODULES={
    prepare:prepare,
    retry:retry,
    /* Metadados somente para diagnóstico; a API de integração é prepare/retry. */
    reportRoutes:Object.keys(REPORT_ROUTES),
    reportFiles:REPORT_FILES.slice()
  };
})(typeof window!=='undefined'?window:globalThis);
