# PesquisaPro v171 — Base de tabulação isolada

A v171 acrescenta um laboratório dentro da aba **Relatórios** para criar e consultar uma cópia congelada dos dados de uma pesquisa. A cópia é independente da coleta operacional e não é inserida como entrevista nova.

## O que está disponível

- Criar uma base com nome próprio para a pesquisa selecionada.
- Preservar perguntas, opções, subcampos e respostas das entrevistas válidas e fora de calibração.
- Consultar a distribuição original por pergunta.
- Consultar os textos e valores originais, com paginação de 100 registros.
- Testar cruzamentos com uma a seis variáveis da própria cópia. Ranking e perguntas compostas “Duas respostas” são exibidos no resultado geral, mas não escolhidos como uma única variável de cruzamento.
- Verificar se a origem mudou desde a criação, incluindo conteúdos das respostas e questionário, não apenas quantidades.
- Criar versões de trabalho com nome e notas de planejamento.
- Salvar nome e notas com controle de revisão concorrente, sem sobrescrever silenciosamente o trabalho de outro gestor.
- Arquivar uma versão de trabalho sem apagar a cópia original.
- Voltar aos resultados atuais da pesquisa, sem restauração de banco.

## Limite deliberado desta primeira etapa

**A v171 implementa a infraestrutura de cópias isoladas. Não reativa o agrupamento antigo e não instala IA.** Nesta versão, as versões de trabalho armazenam somente nome e notas; ainda não há edição ou substituição de respostas, codificação ou categorias.

O laboratório **não substitui a fonte do relatório oficial**. Os resultados atuais, os resultados disponibilizados aos clientes e as exportações oficiais Excel/PDF continuam com o comportamento original da v170. O cruzamento experimental da cópia não é incluído automaticamente no PDF. Vincular uma versão da base ao relatório final é uma etapa futura, que deve ser implementada e validada explicitamente antes de qualquer mudança na divulgação.

## Como usar após a ativação

1. Entre com um perfil de gestão autorizado e abra **Relatórios**.
2. Escolha a pesquisa correta, conferindo a data e o ID quando houver nomes repetidos.
3. Clique em **Abrir bases de tabulação**.
4. Informe um nome, como “Tabulação inicial”, e clique em **Criar base de tabulação**.
5. Confira a pesquisa na confirmação. A criação usa os dados válidos disponíveis naquele momento.
6. Consulte **Distribuição original**, **Textos originais** ou **Cruzamento experimental**.
7. Use **Verificar alterações na coleta** para comparar a cópia com a origem atual.
8. Se desejar planejar formas de tabulação, informe o nome de uma versão e clique em **Criar versão**. Registre suas notas e use **Salvar nome e notas**.
9. Use **Ver original congelado** para consultar a distribuição da mesma cópia ou **Voltar aos resultados atuais** para sair do laboratório.

## O original de uma cópia não é necessariamente a origem atual

Cada base é um retrato identificado pela data de criação. Novas entrevistas e alterações posteriores na origem não são incorporadas silenciosamente à cópia.

Se a coleta ou o questionário mudou, o laboratório exibe um aviso. Para analisar os dados atuais, crie outra base com novo nome. As cópias anteriores permanecem preservadas. Uma quantidade igual de entrevistas não prova que o conteúdo das respostas ou a elegibilidade permaneceu igual.

A comparação é uma conferência solicitada pelo gestor; não é um monitor contínuo. Como o laboratório não alimenta a publicação oficial nesta versão, ele não muda nem congela a fonte dos resultados oficiais existentes.

## Preservação e segurança

As novas tabelas ficam separadas das tabelas operacionais. Os comandos da v171 não escrevem em coletas, respostas originais, perguntas da origem, usuários, equipes, pagamentos ou contratos. Não copiam áudio, GPS nem dados de remuneração.

As respostas podem conter dados pessoais escritos pelo entrevistado ou pesquisador. A cópia não equivale a anonimização. Seu acesso permanece restrito à gestão autorizada e ativa; clientes, pesquisadores e usuários anônimos não têm acesso às bases experimentais.

A consulta mantém o relacionamento de cada resposta com sua entrevista e pergunta para evitar que o cruzamento seja reconstruído apenas a partir de totais agregados. As frequências são calculadas pelo banco, não por IA. Nos cruzamentos, cada entrevista ocupa uma combinação, evitando multiplicação por respostas múltiplas.

A cópia original é protegida contra alterações diretas pela aplicação. As versões de trabalho guardam metadados separados. A criação usa um identificador de requisição para evitar duplicação em retentativas da mesma operação. Há proteção contra resultados tardios de outra sessão ou pesquisa e contra conteúdos de texto que tentem injetar HTML na interface.

**Uma cópia no mesmo banco não substitui um backup independente.**

## Ativação manual no Supabase

Esta versão requer o novo arquivo:

`deploy/base-tabulacao-isolada-v171.sql`

O usuário deve executar **esse arquivo novo inteiro** no SQL Editor do projeto Supabase correto. Ele é uma migration aditiva da v171; não é o SQL `clientes-acesso-pesquisas-concluidas-v168.sql` que estava aberto anteriormente.

Não é necessária uma nova Edge Function ou chave de API para a v171. Nenhum segredo deve ser enviado por mensagem. Se a migration não estiver ativa, o laboratório mostra uma orientação de ativação e mantém o fluxo atual dos relatórios.

Procedimento de liberação:

1. Revisar o pacote e o novo SQL fornecidos.
2. Executar manualmente o SQL da v171 no Supabase.
3. Informar o sucesso e autorizar a publicação específica da v171 no GitHub/Vercel.
4. Após a implantação confirmada, recarregar o aplicativo e testar a criação da base pelo painel.

O desenvolvimento e os testes desta entrega são locais. Nenhum SQL remoto foi executado, nenhuma pesquisa real foi clonada e nenhuma publicação da v171 foi feita durante a implementação.

## Validações realizadas

- 114 smoke tests do aplicativo, sem falhas.
- 55 cenários executados em PostgreSQL local, sem falhas: retentativa simultânea, isolamento por pesquisa, bloqueios de cliente/pesquisador/anon/inativo, imutabilidade, conflitos de revisão, rollback, congelamento após exclusões/edições na origem, espaços preservados no texto bruto e paginação de 1.252 respostas.
- Chromium em desktop, tablet, celular, paisagem e janela reduzida, sem overflow horizontal ou requisições externas.
- Consulta de textos protegida contra injeção de HTML; notas preservadas durante conferências da origem e quando o banco rejeita uma revisão antiga.
- Todos os SQLs e Edge Functions anteriores foram preservados. O CSS foi somente acrescentado e o clone de publicação permaneceu intacto.

Os testes usam exclusivamente dados fictícios. A pasta `validacao-v171` do ZIP contém evidências e fixtures locais; **não execute as fixtures no Supabase de produção**. Para ativar a funcionalidade, execute apenas o novo `deploy/base-tabulacao-isolada-v171.sql`, conforme a seção de ativação.
