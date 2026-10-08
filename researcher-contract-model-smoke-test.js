const assert=require('assert');
const fs=require('fs');
const root=__dirname;
const app=fs.readFileSync(root+'/app.js','utf8');
const html=fs.readFileSync(root+'/app.html','utf8');
const migration=fs.readFileSync(root+'/deploy/contrato-pesquisador-valor-aceite.sql','utf8');
function ok(condition,message){assert(condition,message);}

ok(app.includes("razao:'Versus Soluções em Gestão'"),'razão social da contratante ausente');
ok(app.includes("programa:'PesquisaPro'"),'programa PesquisaPro ausente');
ok(app.includes("cnpj:'26.643.308/0001-49'"),'CNPJ informado pelo usuário ausente');
ok(app.includes("Avenida Trinta e um de Março, nº 861, Loja 07, São João del Rei/MG"),'endereço da contratante ausente');
ok(app.includes('CONTRATO-QUADRO'),'contrato-quadro não está explícito');
ok(app.includes('valor da remuneração é definido pela CONTRATANTE para cada pesquisa'),'remuneração variável por pesquisa ausente');
ok(app.includes('aceite do convite registrará'),'concordância com o valor no aceite ausente');
ok(app.includes('menos de 15 (quinze) metros'),'trava de 15 metros ausente');
ok(app.includes('coletas de pesquisas diferentes podem ocorrer no mesmo local'),'escopo da distância por pesquisa ausente');
ok(app.includes('Tempo de coleta não corresponde ao tempo mínimo necessário a uma coleta real'),'mensagem de tempo mínimo ausente');
ok(app.includes('após as 21h00'),'regra de gravação noturna ausente');
ok(app.includes('Aceitar e concordar com o valor'),'botão de aceite do valor ausente');
ok(app.includes('Valor por formulário válido'),'valor não aparece no convite do pesquisador');
ok(app.includes('acceptResearcherLinkInvite'),'fluxo de aceite por link geral ausente');
ok(app.includes("context.price_remote"),'valor remoto não aparece no convite por link');
ok(app.includes("'{aceite_pesquisa}'"),'campo de aceite específico ausente no editor');

ok(migration.includes('add column if not exists accepted_price'),'coluna accepted_price não é aditiva');
ok(migration.includes('add column if not exists accepted_price_remote'),'valor remoto aceito não é registrado');
ok(migration.includes('add column if not exists accepted_value_at'),'momento do aceite não é registrado');
ok(migration.includes('create or replace function public.respond_survey_invite_details'),'RPC detalhada não é atualizada');
ok(migration.includes('v_survey.price'),'RPC não captura o valor vigente da pesquisa');
ok(migration.includes('accepted_price=v_accepted_price'),'RPC não persiste o valor aceito');
ok(migration.includes('create or replace function public.get_survey_researcher_link_context'),'contexto do link não mostra o valor');
ok(migration.includes('create or replace function public.accept_survey_researcher_link'),'aceite por link não registra o valor');
ok(migration.includes("'accepted_price',v_survey.price"),'retorno do aceite não informa o valor aceito');
ok(!/\b(drop table|drop column|delete from|truncate)\b/i.test(migration),'migration contém operação destrutiva');
ok(html.includes('app.js?v=20261008144000'),'cache atual antes da publicação não foi localizado');
console.log('researcher-contract-model-smoke-test: PASS');
