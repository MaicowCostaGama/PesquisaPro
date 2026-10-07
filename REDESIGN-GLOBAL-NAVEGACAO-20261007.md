# PesquisaPro — refinamento transversal de interface (v130)

## O que mudou

- **Menu para todos os perfis:** campo “Buscar no menu” com filtro sem distinção de acentos, aviso quando não encontra uma página, rótulos que quebram linha e atalho `/` fora de formulários.
- **Celular:** o seletor “Trocar pesquisa”, antes oculto no topo, fica acessível na gaveta dos perfis que já o possuíam. O cliente continua usando a própria lista “Minhas pesquisas”, sem alteração de permissões. `Esc` fecha a gaveta; o estado aberto/fechado é anunciado por `aria-expanded`.
- **Troca de tela:** ao navegar para uma seção diferente, o conteúdo recomeça no topo e recebe foco de teclado. Atualizações da mesma página preservam a posição de rolagem.
- **Legibilidade:** grids passam a permitir encolhimento seguro, valores e títulos longos quebram linha, ações da Coleta se distribuem melhor e o crachá suporta nomes extensos.
- **Imagens e mídia:** o vídeo de orientação agora é mostrado inteiro, sem cortar texto ou bordas. Imagens documentais são limitadas ao espaço disponível sem interferir no recorte de avatares.
- **Tipografia:** o clone local não continha os cinco arquivos Inter WOFF2 referenciados pelo CSS; a produção já tinha versões compactas. O pacote v130 inclui as fontes oficiais completas para pesos 400–800, obtidas do [repositório Inter](https://github.com/rsms/inter), com licença SIL OFL 1.1 em `fonts/OFL-Inter.txt`.
- **Telas sobrepostas:** diálogo de mensagens, extrato, seleção de pesquisa e aviso obrigatório de atualização respeitam a altura útil e permitem rolagem interna quando necessário.
- **Preservação:** CSS anterior foi mantido; as novas regras são uma camada aditiva. Nenhuma rotina de coleta, pagamento, contrato, dados pessoais ou autorização no Supabase foi alterada.

## Verificações locais

- `node --check` em todos os **98 arquivos JavaScript**.
- **87 smoke tests**, sem falhas.
- Teste visual headless com **nove perfis e três larguras** (375, 768 e 1440 px), usando conteúdo fictício e cliente Supabase simulado: menu, busca, seletor móvel e ausência de overflow horizontal do shell.
- Parser CSS: sem erros; `style.css` preserva `.finance-table-scroll` e demais seletores críticos.
- Uma inspeção visual do painel administrativo publicado motivou os ajustes. **Não** houve inspeção autenticada de cada tela real em todos os nove perfis; o teste automatizado cobre o shell compartilhado e componentes representativos, não todos os formulários, tabelas ou estados de dados reais. Ajustes adicionais podem ser necessários em telas específicas após uso.

## Publicação

Esta entrega está **somente local** até autorização explícita para publicar o código. **Não há migration SQL** a executar no Supabase para esta versão; não cole testes `.js` no SQL Editor. A alteração preexistente `deploy/cadastro-pesquisador-senha.sql` no clone de publicação deve continuar intocada. O ZIP v130 contém o aplicativo e testes/documentação deste refinamento, sem dados privados.
