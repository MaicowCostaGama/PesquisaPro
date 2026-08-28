-- ============================================================================
-- Ativa a assinatura eletrônica do lado da CONTRATANTE (PesquisaPro) no
-- contrato do pesquisador. Até agora só o pesquisador assinava — este
-- arquivo cria a tabela company_contract_signatures, onde um administrador
-- registra, uma única vez por versão do contrato (não uma vez por
-- pesquisador), a assinatura da empresa. A partir de agora, tanto a tela
-- "Meu contrato" (pesquisador) quanto "Contratos" (admin) mostram os dois
-- lados assinados.
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run". Pode rodar de novo sem erro.
-- ============================================================================

create table if not exists public.company_contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null unique,
  signed_by uuid references public.profiles(id),
  signer_name text not null,
  signer_role text not null,
  content_hash text not null,
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.company_contract_signatures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'company_contract_signatures'
      and policyname = 'admin assina pela contratante'
  ) then
    create policy "admin assina pela contratante"
      on public.company_contract_signatures for insert
      with check (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'company_contract_signatures'
      and policyname = 'qualquer logado vê a assinatura da contratante'
  ) then
    create policy "qualquer logado vê a assinatura da contratante"
      on public.company_contract_signatures for select
      to authenticated
      using (true);
  end if;
end;
$$;

-- sem update/delete de propósito: preserva a força probatória do registro.
