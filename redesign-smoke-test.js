const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'commercial.js'), 'utf8');
const context = {
  window: {}, PAGES: {},
  selectedRole: 'admin', CURRENT_PROFILE: {id: 'admin-1', name: 'Admin Master'},
  USERS: [{id:'seller-1',name:'Bruno Vendedor',role:'vendedor',status:'ativo'}],
  USERS_LOADED: true,
  sb: {},
  document: {querySelector: () => null},
  head: () => '',
  stat: (label, value) => `<stat>${label}:${value}</stat>`,
  brl: value => `R$ ${Number(value).toFixed(2)}`,
  esc: value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
};
vm.createContext(context);
vm.runInContext(`${source}\nCOMM_OPPORTUNITIES=[{id:'opp-1',company:'Instituto Horizonte',client_name:'Ana Souza',email:'ana@example.com',stage:'novo',source:'Indicação',seller_id:'seller-1',expected_value:10000}];\nCOMM_PROPOSALS=[];\nthis.__board=commercialBoard();`, context);
const board = context.__board;
for (const label of ['Novo lead','Qualificação','Briefing','Proposta enviada','Negociação','Fechada ganha','Fechada perdida']) assert(board.includes(label), `estágio ausente: ${label}`);
assert(board.includes('Instituto Horizonte'));
assert(board.includes('Nova oportunidade'));
assert(board.includes('Bruno Vendedor'));
assert(board.includes('aria-label="Funil de oportunidades comerciais"'));
console.log('Redesign smoke test OK: board comercial renderizado com todos os estágios e ações.');
