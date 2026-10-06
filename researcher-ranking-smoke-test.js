const fs = require('fs');
const path = require('path');
const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const migrationPath = path.join(root, 'deploy', 'ranking-desempenho-pesquisadores.sql');
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : null;
const doc = fs.readFileSync(path.join(root, 'RANKING-PESQUISADORES-QUALIDADE-20261006.md'), 'utf8');
function must(text, pattern, label) {
  if (!pattern.test(text)) throw new Error('Ausente: ' + label);
}
function mustNot(text, pattern, label) {
  if (pattern.test(text)) throw new Error('Não deveria existir: ' + label);
}
must(app, /'researcher-ranking':\{ico:/, 'item de navegação do ranking');
must(app, /researcher-ranking/, 'rota researcher-ranking');
must(app, /researcher_performance_ranking/, 'chamada da função de ranking');
must(app, /responseQualityScore|response_quality_score/, 'métrica de qualidade das respostas');
must(app, /overallScore|overall_score/, 'nota final do ranking');
must(app, /30%|0\.30/, 'peso de 30%');
must(app, /20%|0\.20/, 'peso de 20%');
must(app, /Amostra insuficiente/, 'proteção para amostra insuficiente');
must(app, /researcherRankingOpenAudit/, 'atalho para auditoria');
must(app, /conversationButton\(/, 'atalho de WhatsApp');
must(app, /sample_eligible/, 'indicador de amostra elegível');
mustNot(app, /delete\s+from\s+public\.collection_events/i, 'exclusão de coletas no frontend');
must(doc, /Qualidade e coerência das respostas \| \*\*30%\*\*/, 'documentação do peso de respostas');
must(doc, /não é uma prova automática de fraude/i, 'limitação da nota');
must(doc, /após as 21:00/i, 'regra de gravação noturna');

if (migration) {
  must(migration, /create or replace function public\.researcher_performance_ranking\(/, 'função SQL');
  must(migration, /collection_answers/, 'análise agregada de respostas');
  must(migration, /same_fingerprint_count/, 'detecção de repetição de respostas');
  must(migration, /recording_required/, 'sinal de gravação obrigatória');
  must(migration, /partition by ce\.researcher_id, ce\.survey_id/, 'distância dentro da mesma pesquisa');
  must(migration, /0\.30/, 'peso SQL das respostas');
  must(migration, /0\.20/, 'peso SQL de duração/distância');
  must(migration, /grant execute on function public\.researcher_performance_ranking/, 'grant autenticado');
  mustNot(migration, /drop\s+(table|column|policy)|delete\s+from|truncate\s+/i, 'SQL destrutivo');
  console.log('ranking migration checks: OK');
} else {
  console.log('ranking migration checks: SKIPPED (migration manual não está no clone publicado)');
}
console.log('researcher-ranking-smoke-test: OK');
