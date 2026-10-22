# Usuário de teste de coleta — v211

Esta versão cria um modo controlado para o perfil **Adm Pesquisador PesquisaPro** validar pesquisas antes de liberá-las para a equipe.

## O que o modo de teste faz

- Permite ao perfil autorizado abrir pesquisas não arquivadas com formulário iniciado, nos status `rascunho` ou `campo`, mesmo sem estar atribuído à equipe.
- Mantém login, status ativo, GPS, confirmação dos avisos, leitura obrigatória do treinamento em vídeo, gravação quando exigida e envio normal da entrevista.
- Marca a entrevista no servidor como `is_calibration = true`. O navegador não consegue retirar essa marcação.
- Não considera a calibração em cotas, pagamentos, rankings, bases válidas de relatórios ou cruzamentos que usam as RPCs corrigidas de resultados.
- Não dá ao testador acesso à lista de usuários, documentos, pagamentos, respostas ou coletas de outras pessoas.
- Não libera pesquisas arquivadas, não permite editar pesquisas e não cria vínculo de equipe.

## Aplicação manual no Supabase

1. Entre no Supabase do projeto **APPesquisa** e abra **SQL Editor**.
2. Crie uma nova consulta e cole o conteúdo de `deploy/usuario-teste-coleta-v211.sql`.
3. Execute uma única vez e confirme a mensagem de sucesso.
4. Faça logout e login novamente com **Adm Pesquisador PesquisaPro** para recarregar o perfil e as políticas.
5. Abra **Coleta e campo**. Deve aparecer o aviso azul **Modo de teste autorizado**.
6. Escolha uma pesquisa cujo formulário já tenha sido iniciado. Pesquisas em elaboração sem formulário iniciado não aparecem até que o formulário seja salvo/iniciado.
7. Faça uma entrevista curta de teste. Antes de confirmar o aviso, o sistema continuará exigindo leitura e conclusão do vídeo. Ao enviar, confira com a gestão em Auditoria que a coleta está identificada como calibração.

A migration liga a flag pelo nome exato do perfil, mas a autorização posterior depende somente de `profiles.is_collection_test_user = true`, do papel `pesq` e do status `ativo`. Se o usuário ainda não existir no momento da execução, a migration não cria uma conta e não libera ninguém automaticamente.

## Conferências opcionais

No SQL Editor, com a sessão administrativa, é possível conferir:

```sql
select id, name, role, status, is_collection_test_user
  from public.profiles
 where lower(trim(name)) = lower('Adm Pesquisador PesquisaPro');
```

O resultado esperado é uma linha com `role = 'pesq'`, `status = 'ativo'` e `is_collection_test_user = true`.

Não execute `select public.is_collection_test_user()` esperando `true` na sessão do administrador: essa função responde sobre o usuário atualmente autenticado. O teste deve ser feito entrando na conta do pesquisador de teste.

## Importante

- Não é necessário executar nenhuma migration para cada pesquisa. A v211 é uma autorização permanente até que um administrador desmarque a flag.
- Para suspender o modo de teste sem apagar histórico:

```sql
update public.profiles
   set is_collection_test_user = false
 where id = '<UUID_DO_ADM_PESQUISADOR_PESQUISAPRO>';
```

- As entrevistas de teste e suas respostas são preservadas para auditoria técnica, mas não devem ser usadas como entrevistas válidas do cliente.
- O arquivo SQL é manual e não foi executado nem publicado automaticamente por esta implementação.
