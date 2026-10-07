#!/usr/bin/env python3
"""Reproduz o funil de Coleta com a função real, sem autenticação nem dados pessoais."""
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8765/app.html'
INIT = '''window.supabase={createClient:()=>({auth:{
    onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),
    getSession:async()=>({data:{session:null}})
}})};'''
RENDER = '''() => {
  CURRENT_PROFILE={id:'test-only',name:'Administrador de teste',role:'admin'};
  selectedRole='admin';document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('show');buildSidebar();
  const survey={name:'Pesquisa de teste'};
  const samples=[
    ['Pesquisadora Exemplo da Silva','available'],
    ['Nome de Teste Lima Almeida','available'],
    ['Profissional com Nome Composto Muito Extenso para Teste','accepted'],
    ['Pesquisador de Demonstração com Sobrenome Muito Comprido','team']
  ];
  const cards=samples.map(([name,stage],i)=>collectionFunnelCard({user:{id:'test-'+i,name,phone:'11000000000',escolaridade:'medio'},invite:null,area:{label:'São Paulo/SP'},orientationCount:0},survey,stage)).join('');
  document.getElementById('main').innerHTML=`<div class="page-head"><div><h1>Coleta e campo — pesquisa de teste</h1><p>Dados fictícios para teste visual.</p></div></div><div class="card collection-funnel-card"><div class="collection-funnel-heading"><h2>Funil de recrutamento e ativação</h2></div><div class="collection-funnel-list">${cards}</div></div>`;
}'''
METRICS = '''() => [...document.querySelectorAll('.collection-funnel-person')].map(card=>{
  const name=card.querySelector('.collection-funnel-person-title strong');
  const main=card.querySelector('.collection-funnel-person-main');
  const actions=card.querySelector('.collection-funnel-person-actions');
  const r=el=>el.getBoundingClientRect();
  const buttons=[...actions.querySelectorAll('button')];
  const intersects=(a,b)=>r(a).left<r(b).right-1&&r(a).right>r(b).left+1&&r(a).top<r(b).bottom-1&&r(a).bottom>r(b).top+1;
  return {cardWidth:Math.round(r(card).width),nameWidth:Math.round(r(name).width),nameHeight:Math.round(r(name).height),name:name.textContent,
    mainBottom:Math.round(r(main).bottom),actionsTop:Math.round(r(actions).top),
    overlap:buttons.some((button,i)=>buttons.slice(i+1).some(other=>intersects(button,other))),
    cardOverflow:card.scrollWidth>card.clientWidth+1};
})'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width,height in ((320,720),(390,812),(768,900),(1024,900),(1440,900),(1917,900)):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.add_init_script(INIT)
        page.goto(URL,wait_until='domcontentloaded')
        page.wait_for_function('typeof collectionFunnelCard === "function"')
        page.evaluate(RENDER)
        page.evaluate('document.fonts.ready')
        metrics=page.evaluate(METRICS)
        assert len(metrics)==4,metrics
        for metric in metrics:
            assert metric['nameWidth']>=150,(width,metric)
            assert metric['actionsTop']>=metric['mainBottom']+4,(width,metric)
            assert not metric['overlap'] and not metric['cardOverflow'],(width,metric)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
        if width==1917:page.screenshot(path='/home/ubuntu/PesquisaPro-funil-v131-desktop.png')
        if width==390:page.screenshot(path='/home/ubuntu/PesquisaPro-funil-v131-mobile.png')
        page.close()
    browser.close()
print('collection-funnel-visual-test: PASS — nomes legíveis, ações sem colisão, 6 larguras e 4 estados fictícios')
