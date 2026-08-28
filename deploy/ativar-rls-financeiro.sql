-- ============================================================================
-- Ativa a segurança por linha (RLS) na tabela financeira (payments), que
-- passou a ser acessada direto pelo navegador (chave publicável) agora que
-- as telas "Financeiro" e "Meus ganhos" leem e gravam de verdade no banco.
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run".
-- ============================================================================

alter table public.payments enable row level security;

create policy "staff gerencia pagamentos"
  on public.payments for all
  using (public.is_staff());

create policy "pesquisador vê seus próprios pagamentos"
  on public.payments for select
  using (researcher_id = auth.uid());
