-- ============================================================================
-- Ativa os resultados de verdade: nova tabela de respostas por entrevista
-- (collection_answers), sua segurança por linha (RLS), a função que soma as
-- respostas de uma pergunta sem expor entrevista/pesquisador individual (usada
-- tanto pelo "Relatórios" do staff quanto pelo "Resultados" do cliente), e uma
-- policy que faltava para o cliente conseguir ver as perguntas da própria
-- pesquisa (sem ela, a lista de perguntas em "Resultados" chegava vazia).
--
-- Pré-requisito: a tabela collection_answers precisa existir. Se você ainda
-- não rodou o schema.sql atualizado (que já a inclui), rode primeiro o bloco
-- "create table public.collection_answers (...)" de schema.sql, ou o
-- schema.sql inteiro de novo — ele só cria o que ainda não existe.
--
-- Como rodar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run".
-- ============================================================================

create table if not exists public.collection_answers (
  id uuid primary key default gen_random_uuid(),
  collection_event_id uuid not null references public.collection_events(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  value_text text,
  value_number numeric,
  created_at timestamptz not null default now()
);

alter table public.collection_answers enable row level security;

create policy "staff gerencia respostas"
  on public.collection_answers for all
  using (public.is_staff());

create policy "pesquisador registra respostas das próprias coletas"
  on public.collection_answers for insert
  with check (
    exists (
      select 1 from public.collection_events ce
      where ce.id = collection_answers.collection_event_id and ce.researcher_id = auth.uid()
    )
  );

create or replace function public.survey_answer_distribution(p_survey_id uuid, p_question_id uuid)
returns table(value_label text, cnt bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
    public.is_staff()
    or exists (select 1 from public.survey_clients sc where sc.survey_id = p_survey_id and sc.client_id = auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select coalesce(a.value_text, a.value_number::text) as value_label, count(*)::bigint as cnt
    from public.collection_answers a
    join public.collection_events ce on ce.id = a.collection_event_id
    where ce.survey_id = p_survey_id
      and a.question_id = p_question_id
      and ce.status = 'valid'
      and ce.is_calibration = false
    group by coalesce(a.value_text, a.value_number::text)
    order by cnt desc;
end;
$$;

grant execute on function public.survey_answer_distribution(uuid, uuid) to authenticated;

-- cliente também precisa enxergar as perguntas da própria pesquisa (para
-- escolher, na tela "Resultados", qual pergunta ver a distribuição de
-- respostas) — sem isso a lista de perguntas chegava vazia para o cliente
-- mesmo já com os resultados liberados. Cria só se ainda não existir, para
-- este arquivo poder ser rodado de novo sem erro.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'survey_questions'
      and policyname = 'cliente vê perguntas das suas pesquisas'
  ) then
    create policy "cliente vê perguntas das suas pesquisas"
      on public.survey_questions for select
      using (
        exists (
          select 1 from public.survey_clients sc
          where sc.survey_id = survey_questions.survey_id and sc.client_id = auth.uid()
        )
      );
  end if;
end;
$$;
