const fs=require('fs');
const path=require('path');

const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const policy=read('politica-privacidade.html');
const index=read('index.html');
const signup=read('cadastro.html');
const app=read('app.html');

const checks=[
  [fs.existsSync(path.join(root,'politica-privacidade.html')),'a página pública de política existe'],
  [policy.includes('Política de Privacidade e Guarda de Dados'),'a página declara o título da política'],
  [policy.includes('Versus Soluções em Gestão'),'a política identifica a controladora'],
  [policy.includes('26.643.308/0001-49'),'o CNPJ informado está publicado'],
  [policy.includes('Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG'),'o endereço informado está publicado'],
  [policy.includes('contato@pesquisapro.com.br'),'há canal de privacidade por e-mail'],
  [policy.includes('Documento oficial com foto')&&policy.includes('Comprovante de endereço'),'documentos do cadastro estão descritos'],
  [policy.includes('Chave PIX')&&policy.includes('comprovantes'),'dados financeiros e comprovantes estão descritos'],
  [policy.includes('respostas')&&policy.includes('auditoria'),'dados de pesquisa e auditoria estão descritos'],
  [policy.includes('Gravação não é automática em todas as pesquisas'),'a regra de gravação condicionada à configuração e autorização está explícita'],
  [policy.includes('localização')&&policy.includes('GPS'),'o uso operacional de localização está descrito'],
  [policy.includes('7. Como protegemos e guardamos os dados'),'há seção de segurança e guarda'],
  [policy.includes('8. Por quanto tempo guardamos'),'há seção de retenção'],
  [policy.includes('9. Direitos do titular'),'os direitos LGPD estão descritos'],
  [policy.includes('LGPD')&&policy.includes('Lei nº 13.709/2018'),'a política referencia a LGPD'],
  [policy.includes('https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm'),'há referência oficial ao texto da LGPD'],
  [index.includes('href="politica-privacidade.html"'),'a landing page oferece o link de privacidade'],
  [signup.includes('href="politica-privacidade.html"')&&signup.includes('privacy-ack'),'o cadastro oferece link e confirmação de leitura'],
  [signup.includes("if(!$('privacy-ack').checked)"),'o cadastro bloqueia envio sem a confirmação de leitura'],
  [app.includes('href="politica-privacidade.html"'),'o login oferece o link de privacidade'],
  [!/SUPABASE_SERVICE_ROLE_KEY|VAPID_PRIVATE_KEY|OPENAI_API_KEY/.test(policy+index+signup+app),'nenhum nome de segredo é exposto nos arquivos publicados'],
];

const failures=checks.filter(([,ok])=>!ok);
if(failures.length){
  console.error('FALHAS:');
  failures.forEach(([,label])=>console.error(' - '+label));
  process.exit(1);
}
console.log(`privacy-policy-smoke-test: ${checks.length} verificações aprovadas`);
