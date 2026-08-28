-- ============================================================================
-- Ativa a segurança por linha (RLS) na tabela de equipe de pesquisas
-- (survey_team), que passou a ser acessada direto pelo navegador (chave
-- publicável) agora que a tela "Atribuir equipe" grava de verdade no banco.
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run".
-- ============================================================================

alter table public.survey_team enable row level security;

create policy "staff gerencia equipe"
  on public.survey_team for all
  using (public.is_staff());

create policy "pesquisador vê suas próprias atribuições"
  on public.survey_team for select
  using (researcher_id = auth.uid());
