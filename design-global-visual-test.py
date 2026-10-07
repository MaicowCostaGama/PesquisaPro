#!/usr/bin/env python3
"""Smoke test visual offline: layout de navegação compartilhada, sem acesso ao Supabase."""
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8765/app.html'
ROLES = ['admin', 'admpro', 'coord', 'gerente', 'pesq', 'cliente', 'vendedor', 'recrutador', 'indicador']
INIT = '''window.supabase = {createClient: () => ({auth: {
  onAuthStateChange: () => ({data: {subscription: {unsubscribe: () => {}}}}),
  getSession: async () => ({data: {session: null}})
}})};'''
FIXTURE = '''(role) => {
  CURRENT_PROFILE={id:'test-only',role,name:'Perfil de teste'};
  selectedRole=role;
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('show');
  buildSidebar();
  document.getElementById('main').innerHTML=`<div class="page-head"><div><h1>Painel de teste responsivo</h1><p>Conteúdo de demonstração sem dados reais.</p></div><div class="ph-actions"><button class="btn btn-fill">Ação principal</button><button class="btn btn-out">Ação complementar</button></div></div><div class="grid g4"><div class="stat"><div class="s-top"><span class="s-label">Pesquisadores ativos</span><span class="s-ico">◉</span></div><div class="s-val">196</div><div class="s-sub">Acompanhamento de campo</div></div><div class="stat"><div class="s-top"><span class="s-label">Resultados</span><span class="s-ico">▥</span></div><div class="s-val">517</div></div></div><section class="card" style="margin-top:16px"><h2 class="card-t">Equipe vinculada</h2><div class="collection-funnel-person"><div class="collection-funnel-person-main"><strong>Nome fictício longo para aferir quebra de linha</strong></div><div class="collection-funnel-person-actions"><button class="btn btn-ghost">Enviar orientações pelo aplicativo</button><button class="btn btn-ghost">Conversar no WhatsApp</button></div></div></section>`;
  updateCampaignSwitcherButton();
}'''
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width,height in [(375,812),(768,900),(1440,900)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.add_init_script(INIT)
        page.goto(URL,wait_until='domcontentloaded')
        page.wait_for_function('typeof buildSidebar === "function"')
        page.evaluate('document.fonts.ready')
        assert page.evaluate("[...document.fonts].some(f => f.family==='Inter' && f.status==='loaded')"), 'Fonte Inter local não carregou'
        for role in ROLES:
            page.evaluate(FIXTURE,role)
            info=page.evaluate('''() => ({doc:document.documentElement.scrollWidth, viewport:innerWidth,nav:document.querySelectorAll('#sidebar .nav-item').length, main:document.getElementById('main').getBoundingClientRect().width, campaign: getComputedStyle(document.getElementById('sidebarCampaignBtn')||document.body).display})''')
            assert info['doc'] <= info['viewport']+1, (role,width,'largura da página',info)
            assert info['nav'] > 0, (role,width,'navegação vazia')
            assert info['main'] > 200, (role,width,'área útil pequena')
            if width<=860 and role in ('admin','admpro','coord','gerente','pesq'):
                assert info['campaign']!='none', (role,width,'troca de pesquisa escondida')
            if width>860 and role in ('admin','admpro','coord','gerente','pesq'):
                assert info['campaign']=='none', (role,width,'troca de pesquisa duplicada')
            if role=='cliente':
                assert page.locator('#campaignSwitcherBtn').is_hidden(), (role,width,'cliente mantém navegação própria')
            page.locator('#navSectionSearch').fill('nenhum destino parecido')
            assert page.locator('#sidebarSearchEmpty').is_visible(), (role,width,'estado vazio da busca')
            page.locator('#navSectionSearch').fill('')
            assert not page.locator('#sidebarSearchEmpty').is_visible(), (role,width,'limpeza da busca')
            if width<=860:
                page.evaluate('toggleSidebar()')
                assert page.locator('#sidebar').evaluate('(e) => e.classList.contains("open")'),(role,width,'gaveta não abre')
                page.keyboard.press('Escape')
                assert not page.locator('#sidebar').evaluate('(e) => e.classList.contains("open")'),(role,width,'gaveta não fecha')
        if width==375:
            page.evaluate(FIXTURE,'pesq')
            page.screenshot(path='/home/ubuntu/PesquisaPro-design-v130-mobile.png')
        if width==1440:
            page.evaluate(FIXTURE,'admin')
            page.screenshot(path='/home/ubuntu/PesquisaPro-design-v130-desktop.png')
        page.close()
    browser.close()
print('design-global-visual-test: PASS — 9 perfis, 3 larguras, navegação, seletor móvel e ausência de overflow horizontal')
