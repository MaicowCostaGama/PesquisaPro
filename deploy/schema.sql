-- ============================================================================
-- PesquisaPro — schema inicial para Supabase (Postgres)
-- ============================================================================
-- Como usar: no painel do Supabase, vá em "SQL Editor" → "New query", cole
-- este arquivo inteiro e clique em "Run". Ele cria todas as tabelas na ordem
-- certa (dependências primeiro) e já deixa a Row Level Security (RLS) ligada
-- nas tabelas mais sensíveis, com políticas básicas — ainda vamos precisar
-- ampliar essas políticas conforme ligamos cada tela do app a este banco.
--
-- Este schema substitui os arrays em memória do protótipo (USERS, SURVEYS,
-- SIGNUPS, FIN_ROWS etc. em app.js) por tabelas relacionais de verdade, já
-- corrigindo os principais problemas identificados no protótipo:
--   • ligações por nome/índice viraram chaves estrangeiras (uuid) de verdade
--   • quotas e opções de pergunta passam a ter um id estável (não mais índice)
--   • dados de cliente vinculados à pesquisa viram uma tabela de junção única
-- ============================================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1) PERFIS DE USUÁRIO
-- ----------------------------------------------------------------------------
-- Um perfil por pessoa logada no sistema. O id é o mesmo id do usuário no
-- Supabase Auth (auth.users) — ou seja, cada linha aqui "completa" os dados
-- de um login que já existe em Auth (e-mail/senha, criado separadamente).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','coord','gerente','pesq','cliente','admpro','vendedor','indicador')),
  status text not null default 'ativo' check (status in ('ativo','pendente','prospecto','encerrado')),
  name text not null,
  email text,
  phone text,
  cpf text,               -- documento de pessoa física (todos os perfis, exceto cliente PJ)
  cpf_cnpj text,           -- usado só no perfil "cliente" (pode ser CPF ou CNPJ)
  pf_pj text check (pf_pj in ('pf','pj')),  -- só para "cliente"
  birth date,
  cidade text,
  rua text,
  numero text,
  cep text,
  contact_person text,     -- pessoa de contato, só para "cliente" pessoa jurídica
  -- documentos (armazenados no Supabase Storage; aqui fica só a URL do arquivo)
  doc_url text,             -- documento único do staff (admin/coord/gerente)
  doc_foto_url text,        -- documento com foto, só pesquisador
  doc_comprovante_url text, -- comprovante de residência, só pesquisador
  -- dados de pagamento (PIX), só pesquisador
  pix_key text,
  pix_doc text,
  pix_bank text,
  pix_ag text,
  pix_acc text,
  -- só perfil "cliente": liberar acesso a andamento/resultados de suas pesquisas
  results_released boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
comment on table public.profiles is 'Um perfil por usuário logado (todos os 8 perfis do sistema).';

-- Até 5 cidades em que um pesquisador pode atuar
create table public.profile_cidades_atuacao (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cidade text not null,
  primary key (profile_id, cidade)
);

-- ----------------------------------------------------------------------------
-- 2) AUTOCADASTRO DE PESQUISADOR (fila de aprovação)
-- ----------------------------------------------------------------------------
-- Pessoas que se cadastraram sozinhas via link/QR Code e ainda não têm login.
-- Ao serem aprovadas, um novo usuário é criado em auth.users + profiles e a
-- linha aqui pode ser apagada (ou marcada como concluída).
create table public.signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text,
  birth date,
  email text,
  phone text,
  cidade text,
  rua text,
  numero text,
  cep text,
  doc_foto_url text,
  doc_comprovante_url text,
  pix_key text,
  pix_doc text,
  pix_bank text,
  pix_ag text,
  pix_acc text,
  status text not null default 'novo' check (status in ('novo','diligencia')),
  note text,
  sent_at timestamptz not null default now()
);

create table public.signup_cidades_atuacao (
  signup_id uuid not null references public.signups(id) on delete cascade,
  cidade text not null,
  primary key (signup_id, cidade)
);

-- ----------------------------------------------------------------------------
-- 3) PESQUISAS
-- ----------------------------------------------------------------------------
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tipo text,
  data_ini date,
  data_fim date,
  abrangencia text,
  estados text[] default '{}',
  cidades jsonb default '{}'::jsonb,   -- { "MG": ["Belo Horizonte", ...], ... }
  populacao integer,
  margem_erro numeric,
  nivel_confianca numeric,
  proporcao numeric,
  price numeric,             -- valor pago ao pesquisador por formulário válido (padrão)
  price_remote numeric,      -- valor pago em região remota
  client_price numeric,      -- valor cobrado do cliente por formulário
  form_started boolean not null default false,
  collected integer not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','campo','encerrada')),
  coordenador_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perguntas do questionário de cada pesquisa
create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  position integer not null,
  text text not null,
  type text not null check (type in ('single','multi','scale','scale10','nps','open','number','date')),
  is_region boolean not null default false
);

-- Opções de resposta (só para perguntas do tipo single/multi), com cota e
-- flag de "remoto" já ligadas à opção certa por id, não mais por posição
create table public.survey_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  position integer not null,
  label text not null,
  is_remote boolean not null default false,
  quota_pct numeric,
  quota_enabled boolean not null default true
);

-- Clientes vinculados a uma pesquisa (substitui SURVEYS.clientes + USERS.cliente.surveys)
create table public.survey_clients (
  survey_id uuid not null references public.surveys(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  results_released boolean not null default false,
  primary key (survey_id, client_id)
);

-- Equipe de pesquisadores vinculada a uma pesquisa
create table public.survey_team (
  survey_id uuid not null references public.surveys(id) on delete cascade,
  researcher_id uuid not null references public.profiles(id) on delete cascade,
  regional text,
  daily_goal integer,
  primary key (survey_id, researcher_id)
);

-- ----------------------------------------------------------------------------
-- 4) COLETA DE CAMPO (eventos de entrevista/auditoria)
-- ----------------------------------------------------------------------------
create table public.collection_events (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  researcher_id uuid references public.profiles(id) on delete set null,
  quota_label text,
  lat double precision,
  lng double precision,
  accuracy_m numeric,
  occurred_at timestamptz not null default now(),
  synced boolean not null default false,
  flags text[] default '{}',
  status text not null default 'valid' check (status in ('valid','rejected')),
  reject_reason text,
  rejected_at timestamptz,
  is_calibration boolean not null default false
);

-- respostas de verdade de cada entrevista, pergunta a pergunta (o que
-- alimenta Relatórios/Resultados) — uma linha por pergunta respondida; para
-- "múltipla escolha" pode haver mais de uma linha (uma por opção marcada).
-- Guarda o texto da opção/resposta (value_text) em vez de um id de opção de
-- propósito: se o texto da opção for editado depois, respostas já coletadas
-- mantêm a redação de quando foram respondidas, em vez de mudar sozinhas.
create table public.collection_answers (
  id uuid primary key default gen_random_uuid(),
  collection_event_id uuid not null references public.collection_events(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  value_text text,
  value_number numeric,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5) FINANCEIRO (pagamentos por pesquisador/pesquisa)
-- ----------------------------------------------------------------------------
-- Observação: no protótipo, valid/rejected eram contadores mantidos "na mão".
-- Aqui deixamos os contadores editáveis por enquanto (fase de transição), mas
-- o ideal no futuro é gerar uma VIEW que conta a partir de collection_events.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  researcher_id uuid not null references public.profiles(id) on delete cascade,
  valid_count integer not null default 0,
  rejected_count integer not null default 0,
  status text not null default 'pendente' check (status in ('pendente','aprovado','auditoria')),
  updated_at timestamptz not null default now(),
  unique (survey_id, researcher_id)
);

-- ----------------------------------------------------------------------------
-- 6) CONTRATOS
-- ----------------------------------------------------------------------------
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  role text,
  name text not null,
  body_text text not null,
  created_at timestamptz not null default now()
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.contract_templates(id),
  value numeric,
  sent_at timestamptz,
  signed boolean not null default false,
  signed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 7) PERFIS E PERMISSÕES (matriz "Perfis e permissões")
-- ----------------------------------------------------------------------------
create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.role_permissions (
  permission_id uuid not null references public.permissions(id) on delete cascade,
  role text not null check (role in ('admin','coord','gerente','pesq','cliente','admpro','vendedor','indicador')),
  granted boolean not null default false,
  primary key (permission_id, role)
);

-- ----------------------------------------------------------------------------
-- 8) DADOS DA EMPRESA (tela "Dados da empresa" — hoje sem nenhuma tabela)
-- ----------------------------------------------------------------------------
create table public.company_settings (
  id integer primary key default 1,
  razao_social text,
  cnpj text,
  inscricao_estadual text,
  endereco text,
  telefone text,
  email text,
  logo_url text,
  responsavel_tecnico text,
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id = 1)
);
insert into public.company_settings (id) values (1) on conflict do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — ponto de partida
-- ============================================================================
-- Isto liga a segurança por linha e cria as políticas mais essenciais. Cada
-- tela nova que ligarmos ao banco provavelmente vai precisar de uma política
-- adicional — trate isto como a base, não como o conjunto final.

alter table public.profiles enable row level security;
alter table public.signups enable row level security;
alter table public.surveys enable row level security;
alter table public.company_settings enable row level security;

-- qualquer pessoa autenticada pode ver o próprio perfil e editá-lo
create policy "usuário vê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuário edita o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Funções "de confiança" (security definer) para checar o papel do usuário
-- logado sem disparar recursão nas políticas da própria tabela "profiles"
-- (uma política de "profiles" que consulta "profiles" trava o banco numa
-- verificação circular sem fim — por isso o cheque fica isolado aqui).
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

-- administradores (admin / admpro) enxergam e gerenciam todos os perfis
create policy "admin gerencia todos os perfis"
  on public.profiles for all
  using (public.is_admin());

-- qualquer pessoa autenticada pode enviar um autocadastro (o formulário
-- público de autocadastro deve usar uma chave anônima com permissão de
-- INSERT apenas; ajustar policy de INSERT conforme o fluxo real de auth)
create policy "admin gerencia autocadastros"
  on public.signups for all
  using (public.is_admin());

-- pesquisas: staff (admin/coord/gerente/admpro) vê tudo; cliente só vê as suas
create policy "staff gerencia pesquisas"
  on public.surveys for all
  using (public.is_staff());

create policy "cliente vê suas pesquisas"
  on public.surveys for select
  using (
    exists (
      select 1 from public.survey_clients sc
      where sc.survey_id = surveys.id and sc.client_id = auth.uid()
    )
  );

-- dados da empresa: qualquer autenticado pode ler; só admin edita
create policy "qualquer autenticado lê dados da empresa"
  on public.company_settings for select
  using (auth.role() = 'authenticated');

create policy "admin edita dados da empresa"
  on public.company_settings for update
  using (public.is_admin());

-- perguntas, opções e vínculo com clientes de cada pesquisa: já são acessados
-- direto pelo navegador (chave publicável) desde que a tela "Pesquisas" passou
-- a gravar de verdade no banco — por isso ligamos RLS aqui também, com a
-- mesma regra de "só staff gerencia" usada na tabela surveys.
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

-- equipe (pesquisadores) atribuída a cada pesquisa: também passou a ser
-- gravada de verdade pela tela "Atribuir equipe".
alter table public.survey_team enable row level security;

create policy "staff gerencia equipe"
  on public.survey_team for all
  using (public.is_staff());

create policy "pesquisador vê suas próprias atribuições"
  on public.survey_team for select
  using (researcher_id = auth.uid());

-- financeiro (pagamento por pesquisador/pesquisa): a tela "Financeiro" e
-- "Meus ganhos" agora leem e gravam de verdade aqui.
alter table public.payments enable row level security;

create policy "staff gerencia pagamentos"
  on public.payments for all
  using (public.is_staff());

create policy "pesquisador vê seus próprios pagamentos"
  on public.payments for select
  using (researcher_id = auth.uid());

-- coleta de campo (entrevistas registradas pelo pesquisador, com geolocalização
-- obrigatória): a tela "Coletar (app)" do pesquisador e o "Mapa ao vivo" /
-- "Auditoria" do admin/coordenador agora leem e gravam de verdade aqui.
alter table public.collection_events enable row level security;

create policy "staff gerencia coletas"
  on public.collection_events for all
  using (public.is_staff());

create policy "pesquisador vê suas próprias coletas"
  on public.collection_events for select
  using (researcher_id = auth.uid());

create policy "pesquisador registra suas próprias coletas"
  on public.collection_events for insert
  with check (researcher_id = auth.uid());

-- o pesquisador precisa saber quantas entrevistas a EQUIPE inteira já coletou
-- por cota (para não passar do alvo), mas não deve enxergar linha a linha as
-- coletas dos colegas (localização, motivo de reprovação etc. são só entre
-- aquele pesquisador e o staff). Esta função soma só o total por cota, sem
-- expor nada individual, e roda com privilégio elevado (security definer) só
-- para essa soma — a mesma técnica de is_admin()/is_staff() acima.
create or replace function public.survey_quota_counts(p_survey_id uuid)
returns table(quota_label text, valid_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select quota_label, count(*)::bigint
  from public.collection_events
  where survey_id = p_survey_id
    and status = 'valid'
    and quota_label is not null
  group by quota_label;
$$;

grant execute on function public.survey_quota_counts(uuid) to authenticated;

-- pesquisador também precisa enxergar a própria pesquisa (e perguntas/opções,
-- para montar as cotas reais) quando está na equipe dela — antes só staff e
-- cliente tinham policy de leitura em "surveys".
create policy "pesquisador vê pesquisas da sua equipe"
  on public.surveys for select
  using (
    exists (
      select 1 from public.survey_team st
      where st.survey_id = surveys.id and st.researcher_id = auth.uid()
    )
  );

create policy "pesquisador vê perguntas das pesquisas da sua equipe"
  on public.survey_questions for select
  using (
    exists (
      select 1 from public.survey_team st
      where st.survey_id = survey_questions.survey_id and st.researcher_id = auth.uid()
    )
  );

create policy "pesquisador vê opções das pesquisas da sua equipe"
  on public.survey_question_options for select
  using (
    exists (
      select 1 from public.survey_questions q
      join public.survey_team st on st.survey_id = q.survey_id
      where q.id = survey_question_options.question_id and st.researcher_id = auth.uid()
    )
  );

-- cliente também precisa enxergar as perguntas da própria pesquisa (para
-- escolher, na tela "Resultados", qual pergunta ver a distribuição de
-- respostas) — antes só staff e pesquisador tinham policy de leitura em
-- "survey_questions"; sem isso a lista de perguntas chegava vazia para o
-- cliente mesmo já com os resultados liberados.
create policy "cliente vê perguntas das suas pesquisas"
  on public.survey_questions for select
  using (
    exists (
      select 1 from public.survey_clients sc
      where sc.survey_id = survey_questions.survey_id and sc.client_id = auth.uid()
    )
  );

-- Sincronização automática coleta → financeiro: o pesquisador NÃO tem
-- permissão para escrever em "payments" (só staff, ou o próprio via este
-- gatilho) — sempre que uma coleta é inserida (pelo pesquisador, no app) ou
-- atualizada (pelo staff, na auditoria: reprovar/reaprovar), este gatilho
-- recalcula válidos/rejeitados a partir de collection_events e grava em
-- "payments" de verdade, com privilégio elevado (security definer), sem
-- precisar abrir uma policy de escrita para o pesquisador nessa tabela.
-- O campo "status" do pagamento (pendente/aprovado/auditoria) nunca é
-- mexido aqui — continua sendo decisão manual do staff em Financeiro.
create or replace function public.sync_payment_from_collection_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_survey_id uuid;
  v_researcher_id uuid;
  v_valid integer;
  v_rejected integer;
begin
  v_survey_id := coalesce(new.survey_id, old.survey_id);
  v_researcher_id := coalesce(new.researcher_id, old.researcher_id);

  select count(*) filter (where status = 'valid'), count(*) filter (where status = 'rejected')
    into v_valid, v_rejected
    from public.collection_events
    where survey_id = v_survey_id and researcher_id = v_researcher_id;

  insert into public.payments (survey_id, researcher_id, valid_count, rejected_count, status, updated_at)
  values (v_survey_id, v_researcher_id, v_valid, v_rejected, 'pendente', now())
  on conflict (survey_id, researcher_id)
  do update set valid_count = excluded.valid_count,
                rejected_count = excluded.rejected_count,
                updated_at = now();
  return null;
end;
$$;

drop trigger if exists trg_sync_payment_from_collection_events on public.collection_events;
create trigger trg_sync_payment_from_collection_events
after insert or update on public.collection_events
for each row execute function public.sync_payment_from_collection_events();

-- respostas das entrevistas (collection_answers): o pesquisador só registra
-- respostas de coletas que são dele mesmo; ninguém além do staff lê linha a
-- linha (a tabulação para Relatórios/Resultados passa pela função abaixo,
-- que soma sem expor resposta individual de ninguém).
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

-- tabulação real de uma pergunta (Relatórios do staff e Resultados do
-- cliente): conta quantas entrevistas válidas (não reprovadas e fora de
-- calibração — calibração fica fora do cálculo dos resultados, igual já
-- valia para o cruzamento de auditoria) marcaram cada resposta. Só soma,
-- nunca devolve linha de entrevista/pesquisador — por isso pode rodar com
-- privilégio elevado (security definer) mesmo para cliente, que só enxerga
-- pesquisas onde está vinculado (checagem feita dentro da própria função,
-- já que ela roda sem passar pelo RLS de collection_answers/events).
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

-- ============================================================================
-- Contrato-quadro do pesquisador (assinatura eletrônica única, válida para
-- todas as pesquisas): cada linha é UM registro de aceite eletrônico de UMA
-- versão do contrato por UM pesquisador. Nunca é editada/apagada depois de
-- criada (nenhuma policy de update/delete abaixo) — é a trilha de auditoria
-- que comprova a manifestação de vontade nos termos do art. 10, §2º da
-- Medida Provisória 2.200-2/2001 c/c art. 107 do Código Civil. O app só
-- libera a tela "Coletar (app)" para o pesquisador que tiver uma linha aqui
-- com contract_version igual à versão vigente (ver CONTRACT_VERSION no
-- app.js) — se o texto do contrato mudar no futuro, basta subir a versão
-- que todo pesquisador precisa assinar de novo antes de coletar de novo.
create table public.researcher_contracts (
  id uuid primary key default gen_random_uuid(),
  researcher_id uuid not null references public.profiles(id) on delete cascade,
  contract_version text not null,
  full_name text not null,      -- nome exibido no momento da assinatura (auditoria)
  cpf text,                     -- cpf exibido no momento da assinatura (auditoria)
  content_hash text not null,   -- sha-256 do texto exato do contrato apresentado ao assinar
  ip_address text,              -- melhor esforço (serviço externo); pode ficar nulo sem bloquear a assinatura
  user_agent text,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (researcher_id, contract_version)
);

alter table public.researcher_contracts enable row level security;

create policy "pesquisador assina seu próprio contrato"
  on public.researcher_contracts for insert
  with check (researcher_id = auth.uid());

create policy "pesquisador vê seu próprio contrato"
  on public.researcher_contracts for select
  using (researcher_id = auth.uid());

create policy "staff vê todos os contratos assinados"
  on public.researcher_contracts for select
  using (public.is_staff());

-- sem policy de update/delete de propósito: uma assinatura eletrônica não
-- deve poder ser alterada ou apagada por ninguém pela própria aplicação —
-- preserva a força probatória do registro.

-- ============================================================================
-- Assinatura eletrônica da CONTRATANTE (PesquisaPro): o contrato do
-- pesquisador é bilateral, então além da assinatura de cada pesquisador
-- (tabela acima) a própria empresa também assina — uma única vez por
-- versão do contrato (contract_version), não uma vez por pesquisador. Só um
-- administrador pode registrar essa assinatura (policy de insert usa
-- is_admin()), mas qualquer pessoa logada pode ver se/quem assinou, porque
-- a tela "Meu contrato" do pesquisador precisa exibir esse status.
create table public.company_contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null unique,
  signed_by uuid references public.profiles(id),
  signer_name text not null,
  signer_role text not null,    -- cargo/função de quem assina pela empresa (ex.: "Sócio-administrador")
  content_hash text not null,
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.company_contract_signatures enable row level security;

create policy "admin assina pela contratante"
  on public.company_contract_signatures for insert
  with check (public.is_admin());

create policy "qualquer logado vê a assinatura da contratante"
  on public.company_contract_signatures for select
  to authenticated
  using (true);

-- sem update/delete, pelo mesmo motivo de researcher_contracts.

-- ============================================================================
-- Fim do schema inicial. Tabelas ainda sem RLS ligado (contracts,
-- contract_templates, permissions, role_permissions) vão ganhar suas
-- políticas quando ligarmos cada tela correspondente do app — por ora, com
-- RLS desligado nelas, só o back-end (chave service_role) deve acessá-las,
-- nunca o navegador diretamente.
-- ============================================================================
