const assert=require('assert');
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const sql=fs.readFileSync('deploy/progresso-clientes-real.sql','utf8');
const html=fs.readFileSync('app.html','utf8');
const start=app.indexOf('let CLIENT_PROGRESS_CACHE=');
const end=app.indexOf('const STATUS_LABEL',start);
const clientBlock=app.slice(start,end);
const checks=[
  ['RPC de resumo real',app.includes("sb.rpc('client_collection_progress'")&&sql.includes('client_collection_progress')],
  ['RPC de cotas reais',app.includes("sb.rpc('client_collection_quota_progress'")&&sql.includes('client_collection_quota_progress')],
  ['cliente condicionado à liberação',app.includes('clientResultsReleasedForSurvey(c,s)')&&sql.includes("raise exception 'results not released'")],
  ['contagem válida real',clientBlock.includes('Entrevistas válidas')&&clientBlock.includes('valid_count')],
  ['pesquisadores por eventos reais',clientBlock.includes('Pesquisadores com coleta')&&sql.includes('count(distinct ce.researcher_id)')],
  ['metas calculadas da configuração real',sql.includes('quota_pct')&&sql.includes('adjusted_sample')],
  ['linhas de cota sem demonstração',clientBlock.includes('clientProgressQuotaRows')&&clientBlock.includes('clientProgressCoverageRows')],
  ['atualização automática',app.includes('clientProgressStartLive')&&app.includes('CLIENT_PROGRESS_TIMER')],
  ['estados de erro e vazio',clientBlock.includes('Não foi possível carregar o andamento real')&&clientBlock.includes('A pesquisa não possui cotas configuradas')],
  ['sem cotas fictícias no bloco cliente',!clientBlock.includes('Homens 16–24')&&!clientBlock.includes('Vale do Mucuri')&&!clientBlock.includes('Jequitinhonha')],
  ['cache atualizado',html.includes('20260908250000')]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} — ${label}`);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('client-progress-real-smoke-test: PASS');
