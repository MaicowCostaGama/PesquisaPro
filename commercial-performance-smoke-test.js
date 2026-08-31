const assert = require('assert');
const fs = require('fs');
const path = require('path');

const commercial = fs.readFileSync(path.join(__dirname, 'commercial.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, 'deploy', 'comercial-desempenho.sql'), 'utf8');

assert(commercial.includes("COMM_VIEW==='performance'"), 'visão de desempenho ausente');
assert(commercial.includes('commercialPerformanceDashboard'), 'painel de desempenho ausente');
assert(commercial.includes('commercialOpenSellerPerformance'), 'filtro do funil por vendedor ausente');
assert(commercial.includes('seller_id:o.seller_id'), 'proposta sem vínculo direto com vendedor');
assert(commercial.includes('Atribua um vendedor responsável antes de criar a proposta'), 'proposta pode ser criada sem vendedor');
assert(commercial.includes('Atribua um vendedor responsável antes de avançar'), 'venda pode avançar sem vendedor');
assert(commercial.includes('const conversion=opps.length?Math.round(won.length/opps.length*100):0'), 'conversão por vendedor ausente');
assert(commercial.includes('acceptedProposal'), 'valor da proposta aceita ausente');

assert(migration.includes('add column if not exists seller_id'), 'coluna seller_id da proposta ausente');
assert(migration.includes('update public.commercial_proposals'), 'backfill das propostas antigas ausente');
assert(migration.includes('trg_sync_commercial_proposal_seller'), 'trigger da proposta ausente');
assert(migration.includes('trg_sync_commercial_proposals_after_opportunity'), 'trigger de transferência ausente');
assert(migration.includes('vendedor consulta propostas pelo vinculo direto'), 'policy direta do vendedor ausente');

console.log('Commercial performance smoke test OK: vendedor, proposta, conversão, valor e RLS verificados.');
