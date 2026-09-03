-- PesquisaPro — permitir excluir pesquisador com histórico de coleta
-- Mantém os eventos e respostas para auditoria, removendo apenas a identidade
-- do perfil excluído (collection_events.researcher_id passa a NULL).

begin;

alter table public.collection_events
  drop constraint if exists collection_events_researcher_id_fkey;

alter table public.collection_events
  add constraint collection_events_researcher_id_fkey
  foreign key (researcher_id)
  references public.profiles(id)
  on delete set null;

commit;
