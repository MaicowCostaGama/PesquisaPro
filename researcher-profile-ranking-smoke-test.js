const fs=require('fs');
const path=require('path');
const root=__dirname;
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const migrationPath=path.join(root,'deploy','ranking-desempenho-pesquisador.sql');
const migration=fs.existsSync(migrationPath)?fs.readFileSync(migrationPath,'utf8'):'';
const doc=fs.readFileSync(path.join(root,'RANKING-PESQUISADORES-QUALIDADE-20261006.md'),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}

assert(/'researcher-my-ranking':\{[^\n]*label:'Seu Ranking'/.test(app),'o item Seu Ranking não está registrado no menu');
assert(/pesq:\[[^\n]*'researcher-my-ranking'/.test(app),'Seu Ranking não está na navegação do pesquisador');
assert(/PAGES\['researcher-my-ranking'\]=/.test(app),'a página individual do ranking não foi criada');
assert(/loadResearcherMyRankingIfNeeded/.test(app),'a página não carrega a nota individual');
assert(/sb\.rpc\('researcher_my_performance'/.test(app),'a página não chama a função segura do ranking individual');
assert(/researcherMyRankingDecision/.test(app),'a página não exibe a decisão explicativa da nota');
assert(/Notas menores que 80/.test(app),'a regra de menos convites abaixo de 80 não está explicada');
assert(/abaixo de 60/.test(app),'a regra de nota muito baixa não está explicada');
assert(/respostas e coerência <b>30%<\/b>/.test(app),'o peso de respostas não está visível');
assert(/integridade <b>30%<\/b>/.test(app),'o peso de integridade não está visível');
assert(/duração compatível <b>20%<\/b>/.test(app),'o peso de duração não está visível');
assert(/distância entre coletas da mesma pesquisa <b>20%<\/b>/.test(app),'o peso de distância por pesquisa não está visível');
assert(/researcher-own-ranking-page/.test(app),'a página não usa o layout individual');
assert(/20261007185459/.test(html),'o cache do app não está na versão corrente');

if(migration){
  assert(/create or replace function public\.researcher_my_performance\(\s*p_days integer default 90,\s*p_min_interviews integer default 10\s*\)/s.test(migration),'a migration não cria a função individual esperada');
  assert(/security definer/.test(migration),'a função individual precisa ser security definer para ler os dados protegidos');
  assert(/where s\.researcher_id = auth\.uid\(\)/.test(migration),'a função individual não restringe o retorno ao pesquisador autenticado');
  assert(/join public\.profiles p on p\.id = s\.researcher_id and p\.role = 'pesq'/.test(migration),'a função individual não confirma o papel de pesquisador');
  assert(/grant execute on function public\.researcher_my_performance\(integer, integer\) to authenticated/.test(migration),'a função individual não tem grant para usuário autenticado');
  assert(!/public\.is_staff\(\)/.test(migration),'a função individual não deve depender de is_staff');
  assert(!/\b(drop table|delete from|truncate table)\b/i.test(migration),'a migration individual contém operação destrutiva');
}else{
  console.log('migration local ausente: validação SQL ignorada no clone de publicação');
}

assert(/últimos 90 dias|período de 90 dias/i.test(doc),'a documentação não explica a janela de análise');
assert(/menor que 80|menores que 80|abaixo de 80/i.test(doc),'a documentação não explica a redução de convites');
assert(/não prova fraude|não prova automaticamente/i.test(doc),'a documentação não alerta que a nota não prova fraude');
console.log('researcher-profile-ranking-smoke-test: OK');
