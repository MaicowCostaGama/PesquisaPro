# PesquisaPro — histórico de pesquisas concluídas para clientes (v164)

**Estado:** preparado e validado localmente; ainda não publicado no GitHub/Vercel. Nenhuma alteração remota ou nova liberação de cliente foi realizada nesta etapa.

Versão de cache: `20261014182200`.

## Regra

**Concluir a pesquisa encerra a coleta, não a consulta dos resultados.** Clientes vinculados continuam consultando os resultados e relatórios que já foram liberados/publicados. O cliente não precisa reabrir a pesquisa nem receber um novo convite.

A inspeção confirmou que a conclusão atualiza somente o status da pesquisa no banco para `encerrada`. Não altera vínculos, a liberação dos resultados, agrupamentos nem PDFs publicados. As consultas oficiais existentes também não exigem que a pesquisa esteja em campo.

Esta versão torna esse histórico explícito e fácil de acessar, sem trocar as regras de autorização.

## Melhorias de navegação

Em **Minhas pesquisas**, no perfil do cliente:

- **Todas:** lista as pesquisas disponíveis para a conta.
- **Em acompanhamento:** lista as ainda não concluídas.
- **Concluídas:** lista o histórico encerrado.

Cada aba mostra seu contador. Trocar a aba filtra a lista sem alterar silenciosamente a pesquisa selecionada.

Ao abrir uma pesquisa concluída e já liberada, aparecem:

1. **Consultar coleta concluída** — abre os indicadores e o histórico da coleta.
2. **Resultados e relatórios** — abre resultados por pergunta, cruzamentos, mapas e relatórios disponíveis.
3. **Relatórios finais (PDF)** — leva à seção dos PDFs publicados.

As páginas de resultados e andamento mostram um aviso de que a pesquisa foi concluída, mas o histórico permanece disponível. O botão **Minhas pesquisas** permite voltar e escolher outra pesquisa.

O carregamento dos PDFs verifica se a pesquisa e a sessão ainda são as mesmas antes de atualizar a tela. Isso evita que uma resposta antiga apareça depois de trocar de pesquisa ou de usuário.

## O que permanece protegido

- Clientes só visualizam pesquisas vinculadas à própria conta.
- Concluir não libera pesquisas ainda em revisão nem publica rascunhos automaticamente.
- Resultados continuam sujeitos à liberação existente da gestão.
- PDFs continuam sujeitos à publicação e à autorização da conta; links são temporários, não públicos permanentes.
- A conclusão não reabre a coleta, não permite novas entrevistas nem muda contagens e percentuais.
- **Arquivar é uma ação diferente de concluir.** A regra anterior de retirar pesquisas arquivadas da lista operacional do cliente foi mantida; esta atualização trata de pesquisas concluídas, não altera a política de arquivamento.
- As respostas originais, pagamentos, contratos, senhas, perfis e arquivos anteriores foram preservados.

## Regra mista da v163 incluída

O pacote v164 é cumulativo e contém também a correção ainda pendente de publicação da v163:

| Tratamento | Exibição no relatório e cruzamentos |
| --- | --- |
| Sem categorização | Respostas originais separadas, com quantidade e percentual. |
| Categorização parcial | Categorias revisadas mais os textos ainda não agrupados. |
| Categorização completa | Categorias revisadas, sem repetir seus membros como resultados adicionais. |

Textos livres ainda não agrupados podem conter dados pessoais. Revise-os antes da divulgação. Contagem agregada não é anonimização.

## Ativação

O usuário mostrou sucesso na execução de `deploy/relatorios-categorias-e-respostas-v163.sql`. **Não precisa executá-lo novamente.**

**Para o histórico v164 não há novo SQL, Edge Function ou Secret.** Falta somente publicar o código v164 no GitHub/Vercel, após autorização, e atualizar a página do aplicativo.

Para testar após a publicação:

1. Entre como um cliente vinculado a uma pesquisa concluída e já liberada.
2. Abra **Minhas pesquisas → Concluídas**.
3. Selecione a pesquisa e clique em **Resultados e relatórios**.
4. Confira as perguntas, os cruzamentos e os mapas disponíveis.
5. Abra **Relatórios finais (PDF)** e confira o arquivo publicado.
6. Troque para outra pesquisa e confirme que os resultados correspondem à seleção.

PDFs antigos continuam disponíveis, mas não são reescritos automaticamente. Para incorporar a regra mista v163 a um arquivo antigo, a gestão precisa gerar, revisar e publicar novamente esse PDF.

## Validação

- **120 testes do aplicativo passaram**, incluindo 20 novas verificações de histórico, vínculo, liberação e isolamento de consultas.
- Sintaxe dos arquivos JavaScript verificada.
- **25 verificações PostgreSQL locais passaram**, comparando perguntas, cruzamentos de seis variáveis, bases e lista de PDFs antes e depois de mudar a pesquisa para concluída. Também verificam rascunhos, outros clientes e pesquisas não liberadas.
- Navegação testada no Chromium em desktop, tablet, celular, tela de 320 px e paisagem, com dados fictícios. Abas, teclado, acesso aos resultados mistos e PDF temporário foram verificados, sem overflow horizontal.
- CSS anterior preservado por append; SQLs e funções preservados byte a byte.
- Clone de publicação permanece no commit v161, com a alteração preexistente protegida em `deploy/cadastro-pesquisador-senha.sql` intocada.

Os testes de banco usam PGlite/PostgreSQL em memória com mocks mínimos de autenticação. Não representam uma verificação das políticas reais ou da disponibilidade no Supabase remoto. Na prévia de navegador, mapas e acesso ao PDF usam simulações, não serviços remotos ou dados reais.

## Entrega

O ZIP é um backup completo cumulativo do aplicativo. Os SQLs históricos presentes no pacote são preservados para referência, não devem ser executados em lote. Esta versão não exige nova migration.
