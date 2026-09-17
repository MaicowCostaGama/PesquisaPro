-- Condicionante opcional de encerramento da entrevista.
-- Migration aditiva e segura: todas as opções existentes permanecem com false.
begin;

alter table public.survey_question_options
  add column if not exists ends_interview boolean not null default false;

comment on column public.survey_question_options.ends_interview is
  'Quando true, a seleção desta opção encerra a entrevista sem enviá-la como coleta válida.';

commit;
