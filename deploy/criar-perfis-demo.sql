-- Rode este script no SQL Editor do Supabase DEPOIS de criar os usuários
-- em Authentication -> Users -> Add user (com os mesmos e-mails abaixo).
-- Ele cria/atualiza o "perfil" de cada um na tabela profiles, achando o
-- usuário certo pelo e-mail (você não precisa copiar nenhum ID manualmente).
--
-- Só inclui aqui os e-mails que você realmente criou no passo anterior --
-- se criou só o admin por enquanto, pode rodar só o primeiro bloco.

insert into public.profiles (id, role, name, email, status)
select id, 'admin', 'Admin Master', email, 'ativo'
from auth.users where email = 'admin@pesquisapro.com.br'
on conflict (id) do update set role=excluded.role, name=excluded.name, status=excluded.status;

insert into public.profiles (id, role, name, email, status)
select id, 'coord', 'Carla Menezes', email, 'ativo'
from auth.users where email = 'carla@pesquisapro.com.br'
on conflict (id) do update set role=excluded.role, name=excluded.name, status=excluded.status;

insert into public.profiles (id, role, name, email, status)
select id, 'gerente', 'Rafael Dias', email, 'ativo'
from auth.users where email = 'rafael@pesquisapro.com.br'
on conflict (id) do update set role=excluded.role, name=excluded.name, status=excluded.status;

insert into public.profiles (id, role, name, email, status)
select id, 'pesq', 'João Pereira', email, 'ativo'
from auth.users where email = 'joao@email.com'
on conflict (id) do update set role=excluded.role, name=excluded.name, status=excluded.status;

insert into public.profiles (id, role, name, email, status)
select id, 'cliente', 'Prefeitura de Uberlândia', email, 'ativo'
from auth.users where email = 'comunica@uberlandia.mg.gov.br'
on conflict (id) do update set role=excluded.role, name=excluded.name, status=excluded.status;
