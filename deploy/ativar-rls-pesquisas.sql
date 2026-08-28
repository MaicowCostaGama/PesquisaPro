-- ============================================================================
-- Ativa a segurança por linha (RLS) nas tabelas de pesquisas que passaram a
-- ser acessadas direto pelo navegador (chave publicável) agora que a tela
-- "Pesquisas" grava de verdade no banco: perguntas, opções de resposta e o
-- vínculo entre pesquisa e cliente. Sem isso, essas 3 tabelas ficam abertas
-- para qualquer pessoa que tiver a chave publicável (que é pública por
-- natureza, já que fica no código do site).
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run".
-- ============================================================================

alter table public.survey_questions enable row level security;
alter table public.survey_question_options enable row level security;
alter table public.survey_clients enable row level security;

create policy "staff gerencia perguntas"
  on public.survey_questions for all
  using (public.is_staff());

create policy "staff gerencia opções de pergunta"
  on public.survey_question_options for all
  using (public.is_staff());

create policy "staff gerencia vínculos com clientes"
  on public.survey_clients for all
  using (public.is_staff());

create policy "cliente vê seus próprios vínculos"
  on public.survey_clients for select
  using (client_id = auth.uid());
