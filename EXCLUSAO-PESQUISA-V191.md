# Exclusão definitiva de pesquisa — v191

A v191 acrescenta duas melhorias na área de pesquisas:

- a lista passa a usar um layout compacto em telas menores, com as ações agrupadas e sem encavalamento;
- administradores `admin` e `admpro` passam a ter a ação **Excluir definitivamente** em pesquisas em desenvolvimento, concluídas e arquivadas.

## Arquivar ou excluir

**Arquivar** continua sendo a opção recomendada quando o histórico deve ser preservado. A pesquisa sai da operação e do financeiro pendente, mas coletas, respostas, pagamentos, comprovantes e relatórios permanecem disponíveis.

**Excluir definitivamente** é uma operação destrutiva. Ela remove a pesquisa e os registros vinculados, incluindo perguntas, respostas, coletas, equipe, financeiro, mensagens, orientações e relatórios. A RPC também tenta remover os arquivos privados conhecidos nos buckets de áudios, relatórios e comprovantes. Depois da confirmação, não existe restauração pelo aplicativo.

A exclusão é validada em duas camadas: o botão só aparece para `admin`/`admpro` e o banco verifica novamente `public.is_admin()` antes de executar.

## Ativação manual no Supabase

1. Publique o frontend v191.
2. Abra o **SQL Editor** do projeto correto no Supabase.
3. Crie uma consulta nova.
4. Cole o conteúdo integral de `deploy/excluir-pesquisa.sql`.
5. Execute uma única vez e confirme **Success**.
6. Atualize o PesquisaPro com `Ctrl + F5`.
7. Acesse **Pesquisas**. O botão **Excluir definitivamente** aparecerá somente para administradores.

Se o SQL ainda não tiver sido executado, o frontend não apaga nada: ele exibirá uma mensagem informando que a migration precisa ser instalada.

## Segurança e cautelas

Antes de confirmar, confira o nome da pesquisa. Para uma pesquisa concluída ou com histórico importante, prefira **Arquivar**. Não execute a RPC diretamente com um identificador sem revisar a intenção, pois a exclusão é permanente.

A migration não deve ser executada no banco de produção sem uma decisão explícita de exclusão. Ela não altera usuários, equipes globais, contratos ou outras pesquisas.
