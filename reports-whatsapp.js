/* PesquisaPro v180 — entrega assistida do PDF publicado, sem disparo automático.
   Nenhum link de Storage, token de sessão ou resposta individual é incluído na mensagem. */
(function(global){
  'use strict';
  let state=null;
  const MAX_PDF_BYTES=50*1024*1024,READY_MS=60000;
  const $=id=>document.getElementById(id);
  function allowed(){return !!CURRENT_PROFILE?.id&&CURRENT_PROFILE.status==='ativo'&&['admin','admpro','coord','gerente'].includes(CURRENT_PROFILE.role);}
  function busy(){return !!RP_REPORT_EXPORT_BUSY||!!RP_TAB_SOURCE_SELECTING||!!RP_TAB_SOURCE_SAVING||(typeof reportsSimpleBusy==='function'&&reportsSimpleBusy());}
  function context(){return {profile:CURRENT_PROFILE,surveyId:reportsCurrentSurvey()?.id,reportId:RP_REPORT_DOCUMENT_ID,clientId:reportsDocValue('rp-doc-client')};}
  function same(s){const c=context();return state===s&&allowed()&&!busy()&&RP_REPORT_DOCUMENT_STATUS==='published'&&c.profile===s.scope.profile&&c.surveyId===s.scope.surveyId&&c.reportId===s.scope.reportId&&c.clientId===s.scope.clientId&&!!$('rw-dialog');}
  function guard(s){if(!same(s))throw new Error('A sessão ou o relatório mudou. Abra novamente o envio.');}
  async function timed(p){let t;try{return await Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error('A consulta demorou demais. Tente preparar o envio novamente.')),20000);})]);}finally{clearTimeout(t);}}
  async function checked(p,s){const r=await timed(p);guard(s);if(r?.error)throw new Error('Não foi possível conferir o acesso ou o PDF publicado. Atualize o aplicativo e tente novamente.');return r?.data;}
  function phone(value){const raw=String(value||'').trim();if(!raw||/[a-z]/i.test(raw))return '';let d=raw.replace(/\D/g,'');if(raw.startsWith('+')||d.startsWith('00')){if(d.startsWith('00'))d=d.slice(2);}else if(d.length===10||d.length===11)d='55'+d;else if(d.length<12)return '';return /^[1-9]\d{7,14}$/.test(d)?d:'';}
  function filename(title){return (String(title||'Relatorio-final').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,100)||'Relatorio-final')+'.pdf';}
  function message(report,client,survey){return 'Olá, '+(client.name||'cliente')+'!\n\nO relatório final da pesquisa "'+(survey.name||'Pesquisa')+'" está concluído e disponível no PesquisaPro.\n\nNo seu perfil de cliente, você pode:\n- Consultar os resultados e cruzar até 3 variáveis.\n- Baixar as respostas das perguntas em Excel, inclusive as respostas originais.\n- Abrir e baixar o PDF do relatório final.\n\nAcesse com sua conta: https://www.pesquisa-pro.com/app.html\nEm Minhas pesquisas, selecione esta pesquisa. Use "Resultados e relatórios" para resultados, cruzamentos e Excel, e "Relatórios finais (PDF)" para o documento.\n\nRelatório: '+(report.title||'Relatório final')+'\n\nPesquisaPro — Versus Soluções em Gestão';}
  function recipientReason(c,links){if(!c)return 'Cadastro não disponível para consulta';if(c.role!=='cliente')return 'Este cadastro não é de cliente';if(c.status==='prospecto')return 'Cadastro em Prospecto: precisa estar Ativo';if(c.status!=='ativo')return c.status==='inativo'?'Cadastro inativo':c.status==='pendente'?'Cadastro pendente de aprovação':'Cadastro não ativo';const linked=(links||[]).filter(l=>l.client_id===c.id);if(!linked.length)return 'Cliente não vinculado a esta pesquisa';if(c.results_released!==true&&!linked.some(l=>l.results_released===true))return 'Acesso total não liberado nesta pesquisa';return ''; }
  function waUrl(number,text){return number?'https://wa.me/'+number+'?text='+encodeURIComponent(text):'';}
  function feedback(s,text){if(state===s&&$('rw-feedback'))$('rw-feedback').textContent=text;}
  function revoke(s){if(s?.objectUrl){URL.revokeObjectURL(s.objectUrl);s.objectUrl=null;}if(s)s.file=null;}
  function reset(){const s=state;state=null;if(s){revoke(s);$('rw-overlay')?.remove();document.removeEventListener('keydown',s.keydown);document.body.style.overflow=s.oldOverflow;if(s.returnFocus?.isConnected)s.returnFocus.focus();}}
  function refresh(){const b=$('rp-share-whatsapp');if(b)b.disabled=!allowed()||busy()||RP_REPORT_DOCUMENT_STATUS!=='published'||!RP_REPORT_DOCUMENT_ID;if(state&&!same(state))reset();}
  function ready(s){if(!same(s)){reset();return false;}if(!s.file||s.preparing||s.sending||Date.now()-s.readyAt>READY_MS){feedback(s,'Clique em Preparar PDF e mensagem para reconfirmar o destinatário antes de enviar.');return false;}return true;}
  async function load(s){
    const [report,links,survey,staff]=await Promise.all([
      checked(sb.from('report_documents').select('id,survey_id,client_id,title,status,pdf_path,published_at').eq('id',s.scope.reportId).eq('survey_id',s.scope.surveyId).maybeSingle(),s),
      checked(sb.from('survey_clients').select('client_id,results_released').eq('survey_id',s.scope.surveyId),s),
      checked(sb.from('surveys').select('id,name,archived_at').eq('id',s.scope.surveyId).maybeSingle(),s),
      checked(sb.from('profiles').select('id,role,status').eq('id',s.scope.profile.id).maybeSingle(),s)
    ]);
    guard(s);
    if(!staff||staff.status!=='ativo'||!['admin','admpro','coord','gerente'].includes(staff.role))throw new Error('Somente a gestão ativa pode preparar este envio.');
    if(!survey||survey.archived_at||!report||report.status!=='published'||!report.pdf_path||report.id!==s.scope.reportId)throw new Error('Este relatório não está publicado ou a pesquisa foi arquivada.');
    // O próprio SDK faz o download autenticado. Não aceitar paths externos ou travessia.
    if(!/^reports\/[a-zA-Z0-9-]+\/[^/]+\.pdf$/i.test(report.pdf_path)||report.pdf_path.includes('..'))throw new Error('O caminho do PDF publicado não é válido.');
    const ids=[...new Set([...(links||[]).map(x=>x.client_id),report.client_id,s.scope.clientId].filter(Boolean))];
    const people=ids.length?await checked(sb.from('profiles').select('id,name,phone,role,status,results_released').in('id',ids),s):[];
    const peopleById=new Map((people||[]).map(c=>[c.id,c]));
    const recipients=ids.map(id=>{const c=peopleById.get(id);const reason=recipientReason(c,links);return {id,name:c?.name||'Cliente vinculado',client:c||null,reason};}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    const clients=recipients.filter(x=>!x.reason).map(x=>x.client);
    return {report,survey,clients,recipients};
  }
  function preview(s){if(!same(s))return;const id=$('rw-client').value;const client=s.data?.clients.find(c=>c.id===id);s.previewText=client?message(s.data.report,client,s.data.survey):'';$('rw-message').value=s.previewText;const lines=(s.data?.recipients||[]).filter(x=>x.reason).map(x=>x.name+' — '+x.reason);const note=$('rw-recipients-note');if(note){note.textContent=lines.length?'Não disponíveis para envio: '+lines.join('; ')+'. Confira em Concluídas → Clientes e acesso ou Usuários → Clientes. Nenhuma permissão foi alterada.':'Todos os clientes listados têm acesso total. Nenhuma permissão foi alterada.';}}
  function clearReady(s){revoke(s);s.readyAt=0;s.client=null;s.number='';s.text='';$('rw-actions').hidden=true;preview(s);}
  function choose(){const s=state;if(!s||s.preparing||s.sending||!same(s))return;clearReady(s);$('rw-prepare').disabled=!s.data?.clients.some(c=>c.id===$('rw-client').value);feedback(s,s.previewText?'Mensagem modelo disponível. Confira o cliente e prepare o PDF para habilitar o envio.':'Escolha um cliente autorizado. Consulte o motivo dos cadastros bloqueados abaixo.');}
  async function prepare(){
    const s=state;if(!s||!same(s)||s.preparing||s.sending)return;
    const id=$('rw-client').value;s.preparing=true;clearReady(s);$('rw-prepare').disabled=true;$('rw-client').disabled=true;feedback(s,'Conferindo o destinatário e preparando o PDF publicado…');
    try{
      const data=await load(s);guard(s);s.data=data;preview(s);const client=data.clients.find(c=>c.id===id);if(!client)throw new Error('Este cliente não tem mais acesso total à pesquisa.');
      const blob=await checked(sb.storage.from('client-reports').download(data.report.pdf_path),s);
      if(!(blob instanceof Blob)||blob.size===0||blob.size>MAX_PDF_BYTES)throw new Error('Não foi possível preparar o PDF. Arquivos acima de 50 MB devem ser baixados pela área de relatórios.');
      const header=await blob.slice(0,1024).text();guard(s);if(!header.includes('%PDF-'))throw new Error('O arquivo publicado não é um PDF válido.');
      s.file=new File([blob],filename(data.report.title),{type:'application/pdf'});s.data=data;s.client=client;s.number=phone(client.phone);s.text=message(data.report,client,data.survey);s.readyAt=Date.now();
      $('rw-message').value=s.text;$('rw-actions').hidden=false;$('rw-whatsapp').disabled=!s.number;
      let native=false;try{native=typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[s.file]});}catch(_){}
      $('rw-native').hidden=!native;feedback(s,s.number?'PDF e mensagem preparados. Confira o destinatário antes de enviar. O envio só acontece quando você confirma no WhatsApp.':'Cliente sem telefone válido cadastrado. Você pode baixar o PDF e copiar a mensagem para enviar manualmente ao contato correto.');
    }catch(ex){if(same(s)){clearReady(s);feedback(s,ex.message||'Não foi possível preparar o envio.');}}
    finally{if(state===s){s.preparing=false;if($('rw-prepare'))$('rw-prepare').disabled=!s.data?.clients.some(c=>c.id===$('rw-client')?.value);if($('rw-client'))$('rw-client').disabled=false;}}
  }
  async function recheck(s){const data=await load(s);guard(s);const c=data.clients.find(x=>x.id===s.client.id);if(!c||data.report.pdf_path!==s.data.report.pdf_path||data.report.published_at!==s.data.report.published_at)throw new Error('O cliente ou o PDF mudou. Prepare o envio novamente.');s.client=c;s.number=phone(c.phone);s.text=message(data.report,c,data.survey);return c;}
  async function openWhatsApp(){
    const s=state;if(!s||!ready(s))return;
    // Abrir uma janela vazia no clique preserva o gesto do usuário; dados só entram após rechecagem.
    const popup=window.open('about:blank','_blank');if(!popup){feedback(s,'O navegador bloqueou a abertura. Permita pop-ups e tente novamente.');return;}popup.opener=null;s.sending=true;
    try{await recheck(s);if(!s.number)throw new Error('Cliente sem telefone válido cadastrado.');guard(s);popup.location.replace(waUrl(s.number,s.text));feedback(s,'Mensagem aberta no WhatsApp. Para enviar o arquivo, use Baixar PDF para anexar e anexe-o na conversa. Nenhum envio foi confirmado pelo aplicativo.');}
    catch(ex){popup.close();if(state===s)feedback(s,ex.message||'Não foi possível abrir o WhatsApp.');}
    finally{if(state===s)s.sending=false;}
  }
  async function download(){
    const s=state;if(!s||!ready(s))return;s.sending=true;
    try{await recheck(s);guard(s);if(s.objectUrl)URL.revokeObjectURL(s.objectUrl);s.objectUrl=URL.createObjectURL(s.file);const a=document.createElement('a');a.href=s.objectUrl;a.download=s.file.name;document.body.appendChild(a);a.click();a.remove();feedback(s,'Download do PDF iniciado. Anexe este arquivo como documento na conversa do cliente no WhatsApp.');}
    catch(ex){if(state===s)feedback(s,ex.message||'Não foi possível baixar o PDF.');}finally{if(state===s)s.sending=false;}
  }
  async function nativeShare(){
    const s=state;if(!s||!ready(s))return;
    try{
      if(!navigator.canShare?.({files:[s.file]}))throw new Error('Compartilhamento de PDF não disponível. Use o download e anexe no WhatsApp.');
      // Sem await antes de share: gesto explícito preservado. O arquivo foi autorizado no preparo.
      s.sending=true;await navigator.share({files:[s.file],title:s.data.report.title||'Relatório final',text:s.text});
      if(same(s))feedback(s,'Compartilhamento solicitado ao dispositivo. Confira o aplicativo escolhido, o destinatário e a mensagem. Isto não confirma envio ou entrega.');
    }catch(ex){if(state===s)feedback(s,ex.name==='AbortError'?'Compartilhamento cancelado. Nenhum envio foi confirmado.':(ex.message||'Use o download do PDF e a mensagem para enviar manualmente.'));}
    finally{if(state===s)s.sending=false;}
  }
  async function copyMessage(){const s=state;if(!s||!ready(s))return;try{await navigator.clipboard.writeText(s.text);guard(s);feedback(s,'Mensagem copiada. Cole no WhatsApp e confira antes de enviar.');}catch(_){if(state===s){$('rw-message').focus();$('rw-message').select();feedback(s,'Selecione e copie a mensagem exibida para colar no WhatsApp.');}}}
  async function open(){
    refresh();if(!allowed()||busy()||RP_REPORT_DOCUMENT_STATUS!=='published'||!RP_REPORT_DOCUMENT_ID){reportsDocFeedback('Finalize e disponibilize o PDF antes de enviar ao cliente.','warn');return;}
    reset();const s={scope:context(),returnFocus:document.activeElement,oldOverflow:document.body.style.overflow,file:null,readyAt:0,preparing:false,sending:false};state=s;
    const overlay=document.createElement('div');overlay.id='rw-overlay';overlay.className='reports-wa-overlay';
    overlay.innerHTML=`<section id="rw-dialog" class="reports-wa-dialog" role="dialog" aria-modal="true" aria-labelledby="rw-title"><div class="reports-wa-head"><div><div class="reports-eyebrow">ENTREGA DO PDF PUBLICADO</div><h2 id="rw-title">Enviar relatório por WhatsApp</h2></div><button type="button" class="btn btn-out" id="rw-close" aria-label="Fechar envio do relatório">Fechar</button></div><p>Escolha um cliente com acesso total. O PDF é o último arquivo publicado desta estrutura, não uma prévia de alterações ainda não publicadas.</p><label class="lbl" for="rw-client">Cliente destinatário</label><select class="inp" id="rw-client" disabled><option value="">Conferindo clientes autorizados…</option></select><div id="rw-recipients-note" class="reports-wa-help" role="status" aria-live="polite"></div><button class="btn btn-fill" type="button" id="rw-prepare" disabled>Preparar PDF para enviar</button><label class="lbl" for="rw-message">Mensagem modelo</label><textarea class="inp" id="rw-message" rows="12" readonly placeholder="Selecione um cliente autorizado para visualizar a mensagem modelo."></textarea><div id="rw-actions" class="reports-wa-actions" hidden><button type="button" class="btn btn-fill" id="rw-whatsapp">Abrir WhatsApp com mensagem</button><button type="button" class="btn btn-out" id="rw-download">Baixar PDF para anexar</button><button type="button" class="btn btn-out" id="rw-copy">Copiar mensagem</button><button type="button" class="btn btn-out" id="rw-native" hidden>Compartilhar PDF e mensagem</button></div><p class="reports-wa-help">No computador, baixe o PDF e anexe como documento no WhatsApp. Em dispositivos compatíveis, Compartilhar PDF e mensagem abre a seleção de aplicativos: escolha WhatsApp e confira o contato. A mensagem pode precisar ser colada separadamente conforme o dispositivo. O link do perfil exige login; nenhum link público do PDF é criado.</p><div id="rw-feedback" role="status" aria-live="polite">Conferindo o relatório publicado…</div></section>`;
    document.body.appendChild(overlay);document.body.style.overflow='hidden';
    $('rw-close').onclick=reset;$('rw-prepare').onclick=prepare;$('rw-client').onchange=choose;$('rw-whatsapp').onclick=openWhatsApp;$('rw-download').onclick=download;$('rw-copy').onclick=copyMessage;$('rw-native').onclick=nativeShare;
    s.keydown=e=>{if(e.key==='Escape'){e.preventDefault();reset();return;}if(e.key==='Tab'){const a=[...$('rw-dialog').querySelectorAll('button,select,textarea')].filter(x=>!x.disabled&&!x.hidden&&x.getClientRects().length);const first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',s.keydown);$('rw-close').focus();
    try{const data=await load(s);guard(s);s.data=data;const select=$('rw-client');select.replaceChildren();for(const c of data.recipients){const option=document.createElement('option');option.value=c.id;option.textContent=c.name+(c.reason?' — '+c.reason:'');option.disabled=!!c.reason;select.appendChild(option);}if(!data.clients.length){select.value='';preview(s);throw new Error('Nenhum cliente ativo vinculado com acesso total. Confira os motivos informados abaixo do destinatário.');}select.value=data.clients.some(c=>c.id===s.scope.clientId)?s.scope.clientId:data.clients[0].id;select.disabled=false;$('rw-prepare').disabled=false;choose();select.focus();}
    catch(ex){if(state===s)feedback(s,ex.message||'Não foi possível consultar o relatório.');}
  }
  global.PP_REPORT_WHATSAPP={open,reset,refresh,prepare,phone,filename,message,waUrl,recipientReason};
})(window);
