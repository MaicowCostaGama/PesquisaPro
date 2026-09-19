-- PesquisaPro — escolaridade e filtros de disponibilidade de pesquisadores
-- Migration aditiva: não remove perfis, cidades, convites ou pesquisas.
begin;

alter table public.profiles
  add column if not exists escolaridade text;

alter table public.signups
  add column if not exists escolaridade text;

create index if not exists profiles_pesq_filters_idx
  on public.profiles(role, status, escolaridade, cidade);

create index if not exists profile_cidades_atuacao_cidade_idx
  on public.profile_cidades_atuacao(cidade);

comment on column public.profiles.escolaridade is
  'Escolaridade declarada pelo pesquisador; usada para busca e seleção de equipe.';
comment on column public.signups.escolaridade is
  'Escolaridade informada no autocadastro; copiada para o perfil quando aprovado.';

commit;
