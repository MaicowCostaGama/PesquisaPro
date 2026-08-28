-- Corrige o erro "infinite recursion detected in policy for relation profiles"
-- (erro 500 ao buscar o próprio perfil depois do login).
--
-- Causa: a política "admin gerencia todos os perfis" checava se o usuário é
-- admin consultando a própria tabela "profiles" — isso trava o banco numa
-- verificação circular sem fim. A correção usa uma função "de confiança"
-- (security definer) que faz essa mesma checagem sem disparar a política de
-- novo. Testado localmente antes de te enviar — resolve o problema sem abrir
-- brecha de segurança nenhuma (cada perfil continua só vendo o que devia).

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','admpro')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','coord','gerente','admpro')
  );
$$;

drop policy "admin gerencia todos os perfis" on public.profiles;
create policy "admin gerencia todos os perfis"
  on public.profiles for all
  using (public.is_admin());

drop policy "admin gerencia autocadastros" on public.signups;
create policy "admin gerencia autocadastros"
  on public.signups for all
  using (public.is_admin());

drop policy "staff gerencia pesquisas" on public.surveys;
create policy "staff gerencia pesquisas"
  on public.surveys for all
  using (public.is_staff());

drop policy "admin edita dados da empresa" on public.company_settings;
create policy "admin edita dados da empresa"
  on public.company_settings for update
  using (public.is_admin());
