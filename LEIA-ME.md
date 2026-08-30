# PesquisaPro — Código do Protótipo (separado em arquivos)

Este é o código-fonte do protótipo navegável do **PesquisaPro**, uma plataforma de pesquisa de opinião, coleta de campo e gestão. Aqui ele está organizado em arquivos separados, no formato padrão que um desenvolvedor ou agente de IA espera receber.

## Arquivos

- **index.html** — a **página inicial** (institucional/comercial): apresenta o PesquisaPro, convida para ser pesquisador (ganho de R$ 5 a R$ 30 por entrevista) e para contratar uma pesquisa, com um formulário de contato. É a porta de entrada do site.
- **app.html** — o **sistema em si**: tela de login (demonstração) e todo o painel (coleta, amostra, cotas, relatórios, usuários, financeiro, contratos, clientes). Acessado pelo botão "Entrar" da página inicial.
- **style.css** — todo o visual: cores, fontes, espaçamentos, layout das telas — tanto da página inicial quanto do sistema.
- **app.js** — toda a lógica do sistema (`app.html`): navegação entre telas, login de demonstração, construtor de formulário, cálculo de amostra, cotas, relatórios com gráficos, usuários, financeiro, contratos, clientes, etc. Não é usado pela página inicial (que tem seu próprio script pequeno, embutido no `index.html`, só para o formulário de contato e os menus).
- **br-localidades.js** — base de referência com os **27 estados e os 5.570 municípios do Brasil** (fonte: IBGE), usada na etapa "Pesquisa" do assistente de Nova pesquisa para a escolha de abrangência geográfica (estado/cidade). Precisa estar na mesma pasta e ser carregada **antes** do `app.js` (já vem assim configurado no `app.html`).
- **fonts/** — arquivos da fonte Inter (.woff2), usada em todo o visual. Precisa estar na mesma pasta, junto com o `style.css` (que a referencia por caminho relativo).
- **assets/** — ícone e logo do PesquisaPro (`icon-512.png`, `favicon-32.png`, `favicon-64.png`, `logo-wide.png`), usados no favicon da aba do navegador, na página inicial e no sistema.

O sistema (`app.html`) usa o Supabase por CDN para autenticação e dados. As bibliotecas pesadas de visualização já ficam na pasta `vendor/` e são carregadas somente quando a tela precisa delas:
- **Chart.js** — para os gráficos dos relatórios e cálculos de amostra.
- **qrcode.js** — para o QR Code de autocadastro.
- **Leaflet** — para o mapa ao vivo da tela Coleta e campo → Mapa ao vivo (usa mapa do OpenStreetMap).

A página de login não carrega Chart.js, qrcode.js ou Leaflet. O mapa também injeta o CSS do Leaflet somente quando é aberto. O Supabase continua exigindo internet para login e persistência dos dados.

## Como abrir/testar

Coloque todos os arquivos (`index.html`, `app.html`, `style.css`, `app.js`, `supabase-client.js` e as pastas `fonts/`, `assets/` e `vendor/`) na mesma pasta e abra o `index.html` no navegador — essa é a página inicial. O botão "Entrar" leva ao sistema (`app.html`), e de lá dá para voltar pelo link "← Voltar ao site" (na tela de login) ou clicando na logo (dentro do painel). A página inicial não depende do Supabase. Para login e persistência, o `app.html` precisa de internet; gráficos, QR Code e mapa usam os arquivos locais e são baixados sob demanda.

O formulário de contato da página inicial é só de demonstração: ao enviar, mostra uma mensagem de confirmação na tela, mas não salva nem envia nada de verdade (não há back-end).

### Assistente de "Nova pesquisa" / "Editar pesquisa"

O assistente tem 6 etapas: **Pesquisa, Formulário, Amostra, Cotas, Preço, Revisão**. Dá para clicar em qualquer etapa na barra do topo para pular direto pra ela (não precisa passar uma por uma) — o que já foi preenchido fica salvo mesmo pulando de etapa.

**Nenhuma pergunta é obrigatória.** Ao clicar em "+ Criar formulário" o questionário começa **totalmente vazio** — idade e região não vêm mais fixas nem travadas. Quem clica em "Partir de um exemplo" recebe as perguntas de idade e região só como sugestão de ponto de partida, com o mesmo botão 🗑 de excluir e o mesmo seletor de tipo editável de qualquer outra pergunta: dá para apagar, editar o texto, mudar o tipo ou substituir livremente, sem restrição nenhuma. O botão "Limpar tudo" agora apaga o formulário inteiro (não deixa mais nada fixo para trás).

**Amostra** e **Cotas** são duas etapas separadas: a etapa Amostra só cuida do tamanho da amostra (população, margem de erro, confiança); a etapa Cotas lista, à parte, todas as perguntas de escolha única ou múltipla do formulário que têm opções — qualquer uma delas pode ser escolhida para ter cota (usando a chave "cota ativa/desativada" em cada pergunta) e ter a proporção de cada opção definida em %. O sistema converte automaticamente o % em número de coletas com base na amostra calculada na etapa anterior. Como nenhuma pergunta é obrigatória, também é possível cadastrar uma pesquisa **sem cota nenhuma**: basta não ter nenhuma pergunta de escolha única/múltipla com opções (etapa Cotas fica vazia) ou desativar a cota de todas as perguntas que tiverem — em ambos os casos a pesquisa é criada e salva normalmente, sem nenhum aviso bloqueando.

Para não precisar ir até a etapa Cotas só para ativar/desativar uma pergunta, cada pergunta de escolha única ou múltipla com opções, já na etapa **Formulário**, ganhou um botão **"✓ cota" / "sem cota"** no próprio card, ao lado do "★ região": clicar nele liga ou desliga a cota daquela pergunta na hora (mesmo efeito da chave "cota ativa/desativada" da etapa Cotas — os dois lugares ficam sempre sincronizados). Perguntas de resposta aberta, número, data, escala e NPS não têm esse botão, porque não são elegíveis para cota.

### Etapa "Pesquisa": tipo, período e abrangência geográfica

A primeira etapa do assistente (**Pesquisa**) pede, além do nome: o **tipo** da pesquisa (Eleitoral/intenção de voto, Avaliação de gestão, Opinião/mercado, Satisfação ou Outro), a **data de início** e **data de fim** do período de campo, e a **abrangência**, com cinco níveis: Municipal, Regional estadual, Estadual, Regional nacional ou Nacional.

Escolhida a abrangência, aparece logo abaixo a seleção geográfica, que já vem com a base completa de estados e municípios do Brasil (os 5.570 municípios oficiais do IBGE, nos 26 estados + Distrito Federal — arquivo `br-localidades.js`):
- **Municipal** — escolhe 1 estado (menu) e depois 1 cidade dele (outro menu), a única cidade coberta pela pesquisa.
- **Regional estadual** e **Estadual** — escolhe 1 estado (menu) e depois marca, numa lista com busca, quantas cidades desse estado quiser (com atalhos "selecionar todas"/"limpar").
- **Regional nacional** e **Nacional** — escolhe quantos estados quiser (clicando nos códigos de UF, com atalhos "selecionar todos"/"limpar") e depois marca as cidades desses estados na mesma lista com busca (cada cidade aparece com a sigla do estado ao lado, já que pode haver mais de um estado escolhido).

Trocar de nível de abrangência ajusta a seleção automaticamente (por exemplo, sair de "Nacional" para "Municipal" mantém só o primeiro estado e a primeira cidade que já estavam marcados, descartando o resto). A etapa **Revisão**, no fim do assistente, mostra um resumo da abrangência escolhida (nível, estado(s) e cidade(s)/quantidade de cidades).

**Qual pergunta é "a pergunta de região"** (etapa Formulário → botão "☆ região"/"★ região" em cada pergunta de escolha única com opções): é você quem escolhe, clicando na pergunta desejada — nenhuma pergunta vem travada. Só uma pergunta pode estar marcada por vez: marcar outra desmarca a anterior automaticamente, e clicar de novo na que já está marcada desmarca sem substituir por nenhuma. A pergunta marcada é a que a etapa Preço usa para decidir quais bairros/regiões pagam o valor de "região remota" ao pesquisador — se nenhuma estiver marcada (inclusive se a pergunta de região tiver sido excluída), a etapa Preço mostra um aviso pedindo para marcar uma, mas isso não impede salvar a pesquisa. No exemplo pronto, a pergunta "Qual região onde você mora?" vem marcada por padrão só como ponto de partida — pode ser trocada, desmarcada ou excluída livremente, e a escolha fica salva mesmo navegando entre as etapas.

### Etapa "Cliente": vincular a pesquisa a um ou mais clientes

O assistente ganhou uma 6ª etapa, **Cliente**, logo antes da Revisão (a ordem agora é Pesquisa, Formulário, Amostra, Cotas, Preço, **Cliente**, Revisão). Nela aparece a lista de todos os clientes já cadastrados em `Usuários → Clientes`, cada um com uma caixinha de marcação — dá para vincular a pesquisa a nenhum, um ou vários clientes ao mesmo tempo. Acima da lista tem um campo de busca (por nome, contato ou e-mail) para filtrar rapidamente, pensado para quando a base de clientes crescer — buscar não desmarca nada, só esconde da lista quem não bate com o texto digitado, e o texto buscado permanece mesmo depois de marcar/desmarcar um cliente ou usar o botão de liberar acesso (só é limpo ao sair da etapa e voltar). É esse vínculo que decide quais pesquisas aparecem no perfil de cada cliente (abas **Andamento** e **Resultados**, vistas por quem entra com o perfil demonstração "Cliente"): desmarcar um cliente tira o acesso dele, marcar outro dá acesso a ele, e isso vale tanto para pesquisas novas quanto para edição de pesquisas já existentes (a pesquisa "Pesquisa Eleitoral MG · 2026" do exemplo já vem com a "Prefeitura de Uberlândia" marcada, refletindo o vínculo que já existia nos dados de demonstração). Se nenhum cliente estiver cadastrado ainda, a etapa avisa e sugere cadastrar um em `Usuários → Clientes` primeiro.

Por trás dos panos, o vínculo é guardado nos dois lados de forma sincronizada: tanto na pesquisa (`clientes`, lista de nomes de clientes) quanto em cada cliente (`surveys`, lista de nomes de pesquisas, já usada antes só nos dados de exemplo) — mudar numa tela reflete na outra. Uma limitação herdada do protótipo: a tela do perfil Cliente mostra sempre a **primeira** pesquisa vinculada a ele (`clientSelfSurvey()`), então, se um cliente for vinculado a mais de uma pesquisa, só a primeira da lista aparece nas abas Andamento/Resultados dele — não há hoje um seletor de "qual pesquisa ver" dentro do perfil do cliente.

**Liberar acesso total (andamento em tempo real + resultados).** Cada cliente marcado na etapa Cliente ganha, ao lado do nome, um botão "🔒 liberar acesso" / "✓ acesso liberado". A ideia é você liberar esse acesso só depois de confirmar que o cliente pagou pela pesquisa:
- **Sem liberar** (padrão para cliente novo): no perfil dele, a aba Andamento mostra só o percentual da coleta e o status geral — sem o detalhe de equipe em campo, progresso por cota ou cobertura por região — e a aba Resultados fica bloqueada, exatamente como já acontecia antes.
- **Liberado**: o cliente passa a ver a aba Andamento completa e em tempo real (equipe, margem de erro, progresso por cota, cobertura regional) e a aba Resultados destrava, mostrando o relatório final.

Esse mesmo botão (com o rótulo "Liberar acesso total") também está disponível em `Usuários → aba Clientes → abrir o cliente → Acesso do cliente`, então dá para liberar/bloquear tanto por ali quanto direto na etapa Cliente do assistente — os dois controlam o mesmo campo (`resultsReleased` do cliente) e ficam sempre sincronizados.

### Localização (GPS) na tela "Coletar (app)"

Diferente do resto do protótipo, a tela **Coletar (app)** (menu do perfil Pesquisador → "Coletar (app)") usa a **geolocalização de verdade do navegador**, não é só visual: ao abrir, ela pede permissão de localização e, enquanto não for concedida, o botão "Iniciar coleta" fica bloqueado. Cada coleta iniciada registra as coordenadas reais capturadas. Para isso funcionar num celular de verdade (fora deste protótipo local), o site precisa estar em **HTTPS** — navegadores bloqueiam a geolocalização em páginas abertas por `http://` (exceto `localhost`). Ao publicar o site de verdade (domínio próprio com certificado SSL), isso já funciona sem nenhuma mudança de código.

### Mapa ao vivo, feed e auditoria em "Coleta e campo"

Ao entrar numa pesquisa em `Coleta e campo` (visão do Administrador/Coordenador), há três abas:
- **Equipe** — a tabela de pesquisadores vinculados (como já existia).
- **📍 Mapa ao vivo** — mapa (Leaflet + OpenStreetMap) com **um ponto para cada coleta registrada** (não só a mais recente de cada pesquisador — o histórico de georreferenciamento fica visível), colorido por pesquisador; o ponto da coleta mais recente de cada um aparece maior e mais nítido, os anteriores ficam menores e um pouco apagados. Um ponto com contorno vermelho é uma coleta reprovada, contorno azul é uma coleta em calibração. Clique em qualquer ponto para ver quem coletou, quando, a cota e o status — e o botão **"🔎 Ver na auditoria"** no balão leva direto para a linha correspondente na aba Auditoria (já com a tela rolada até ela e destacada por alguns segundos), pronta para reprovar ou marcar como calibração se for o caso. Por desempenho, o mapa mostra as até 120 coletas mais recentes da pesquisa; uma nota abaixo do mapa avisa quando há mais coletas do que as exibidas. Abaixo do mapa, uma lista das últimas coletas também é atualizada automaticamente a cada poucos segundos.
- **🔎 Auditoria** — tabela com o histórico completo de coletas da pesquisa: pesquisador, cota, data/hora, **intervalo desde a entrevista anterior do mesmo pesquisador**, coordenadas (com a **distância até a coleta anterior do mesmo pesquisador**), precisão do GPS, status de sincronização e alertas de qualidade (fora da área designada, tempo de aplicação muito curto, possível duplicidade, intervalo muito curto entre entrevistas, georreferenciamento muito próximo da coleta anterior). O intervalo de tempo fica destacado em vermelho quando menor que 3 minutos e em âmbar quando menor que 8; a distância entre coletas fica vermelha quando menor que 30 metros (praticamente o mesmo ponto) e âmbar quando menor que 100 — ambos ajudam a flagrar possível fraude (respostas "coletadas" rápido demais, ou sem o pesquisador se deslocar entre uma entrevista e outra).

  Cada linha tem duas ações, na coluna **Ações**:
  - **✕ Reprovar** — pede o motivo e marca a coleta como reprovada (linha fica destacada em vermelho). Uma coleta reprovada **não entra no pagamento** do pesquisador (o valor a pagar em Financeiro é recalculado na hora) e passa a aparecer para o próprio pesquisador em **Meus ganhos → Coletas reprovadas**, com o motivo. O botão vira "↺ Reaprovar" para desfazer.
  - **◎ Calibração** — marca a coleta como usada só para calibrar a amostragem: fica fora do cálculo dos resultados da pesquisa, mas **continua contando para o pagamento** do pesquisador (ele fez a entrevista de verdade). O botão vira "↺ Nos resultados" para desfazer. Como o protótipo não tem back-end, esse sinalizador fica marcado visualmente na auditoria; numa versão real, a consulta que gera os relatórios/resultados passaria a excluir as coletas marcadas como calibração.

  Sempre que houver ao menos uma coleta reprovada ou em calibração nesta pesquisa, aparece um painel **"Reprovações e calibrações desta pesquisa"** no topo da aba Auditoria, com um botão de desfazer para cada uma — não precisa procurar a linha na tabela grande. O painel some sozinho quando não sobra nenhuma reprovação/calibração ativa.

  Como as coletas de "Coleta e campo" são simuladas (ver nota abaixo), essas ações mexem nos dados de exemplo em memória — o efeito no Financeiro e em "Meus ganhos" é real dentro da navegação, mas some ao recarregar a página.

### Duplicar pesquisa

Em `Minhas pesquisas` e em `Concluídas`, cada linha ganhou um botão **Duplicar**, ao lado de Editar/Concluir/Excluir. Ele cria uma cópia completa da pesquisa (formulário com todas as perguntas, amostra, cotas, preço e abrangência geográfica) como um **novo rascunho**, já pronta para editar e ajustar o que for diferente, em vez de montar tudo de novo do zero. Ficam de fora da cópia, de propósito: o total já coletado (a cópia começa com 0 coletas e status "rascunho"), a equipe atribuída (é preciso atribuir de novo em "Equipe", como em qualquer pesquisa nova) e o vínculo com clientes — inclusive o acesso liberado — já que isso é uma decisão específica de cada pesquisa, não algo que faz sentido herdar automaticamente. O nome da cópia recebe o sufixo " (cópia)" para não confundir com a original.

### Financeiro separado por pesquisa

A aba **Financeiro** agora funciona em duas telas, como as demais listas do sistema:
- **Lista de pesquisas** — cada pesquisa aparece com o total de entrevistas válidas coletadas nela, quantos pesquisadores participaram e o valor total a pagar (entrevistas válidas × valor do formulário daquela pesquisa).
- **Detalhe da pesquisa** (ao clicar em "Abrir →") — mostra, só daquela pesquisa, o valor a pagar por pesquisador que coletou entrevistas válidas nela (com rejeitadas descontadas), a chave PIX de cada um, o status do pagamento (aprovado / dados bancários pendentes / em auditoria) e a tabela de valores específica da pesquisa (formulário padrão, região remota, bônus). O botão "← Financeiro" volta para a lista.

Como o protótipo não tem back-end, as coletas por pesquisador em cada pesquisa (`FIN_ROWS`, dentro de `app.js`) são dados fictícios fixos — numa versão real, viriam do banco de dados, contando as entrevistas válidas de fato coletadas por cada pesquisador naquela pesquisa.

### Perfil do Cliente

Há um 5º perfil de demonstração na tela de login: **Cliente** (entra como "Prefeitura de Uberlândia", o primeiro cliente cadastrado em `Usuários → aba Clientes`). Esse perfil só enxerga duas telas:
- **Andamento** — progresso da coleta da pesquisa dele em tempo real (coletado/meta, progresso por cota, cobertura por região), sem acesso às respostas em si.
- **Resultados** — fica **bloqueada** ("🔒 Resultados ainda não liberados") até o Administrador liberar. A liberação é feita em `Usuários → aba Clientes → abrir o cliente → "Liberar acesso total"`. Uma vez liberado, a tela de Resultados do cliente mostra o relatório final (gráfico e tabela) — e pode ser bloqueada de novo a qualquer momento pelo mesmo botão.

Como o protótipo não tem back-end, isso é feito com uma variável em memória (o campo `resultsReleased` do cadastro do cliente, dentro de `USERS`) — funciona durante a navegação, mas volta ao estado inicial (bloqueado) se a página for recarregada.

Como o protótipo não tem back-end, as coletas que aparecem no mapa, no feed e na auditoria são **simuladas** (geradas no navegador, em torno da regional de cada pesquisador) — é o comportamento que o sistema real teria ao receber coletas de verdade dos pesquisadores em campo. Numa versão com banco de dados, essas três abas passam a consumir as coletas reais conforme chegam.

### Painel geral com números reais

Os 8 cartões do topo do `Painel geral` (visão Administrador/Coordenador/Gerente) deixaram de ser valores fixos e passaram a ser **calculados na hora**, a partir dos dados que já existem no protótipo:
- **Pesquisas em campo / em edição / finalizadas** — contam as pesquisas de `Minhas pesquisas`/`Concluídas` pelo status de cada uma (`campo`, `rascunho`, `encerrada`).
- **Pesquisadores ativos** — conta, em `Usuários`, quantos cadastros têm perfil Pesquisador e status Ativo (não conta os pendentes de aprovação).
- **Entrevistas realizadas** — soma o total já coletado (`coletado`) de todas as pesquisas, ativas ou encerradas.
- **Clientes atendidos** — conta, em `Usuários → aba Clientes`, quantos estão com status Ativo (mesmo critério do cartão "Ativos" daquela aba).
- **Cadastros a aprovar** — conta os autocadastros de pesquisador ainda pendentes em `Usuários → Cadastros pendentes` (recém-chegados ou em diligência).
- **Contratos pendentes** — conta, em `Contratos`, quantos ainda não foram assinados eletronicamente.

Como qualquer número deste protótipo, eles mudam ao vivo conforme você navega: mudar o status de uma pesquisa, aprovar/reprovar um cadastro ou assinar um contrato já reflete no Painel geral na próxima vez que ele for aberto. Também foi criada, nos bastidores, uma lista `CONTRATOS` (em `app.js`) com um contrato por pesquisador — antes a tela de Contratos só mostrava uma linha de exemplo e números fixos; agora a tabela e os cartões "Contratos ativos"/"Aguardando assinatura" daquela tela também são calculados a partir dessa mesma lista, então os números batem em toda parte do sistema.

Abaixo desses cartões, foram removidos os dois blocos que eram só ilustrativos e não tinham relação com dados reais: o card "Progresso de coleta por cota" e a tabela "Regionais com coleta abaixo da meta". Sobrou só o gráfico "Coletas por dia", agora ocupando a largura toda.

### Remoção do menu "Metas e cotas"

O item **Metas e cotas** foi retirado do menu lateral (Admin, Coordenador e Gerente). A tela em si (`PAGES.quotas`) continua existindo no código, só não tem mais como chegar nela pelo menu. O aviso na tela **Cálculo de amostra** que indicava "distribua a amostra entre as cotas em Metas e cotas" também foi ajustado, tirando a referência ao menu que não existe mais.

### Usuários — agora com 6 perfis, cada um com seu próprio cadastro

A tela **Usuários** passou de uma lista única para um gerenciador com **abas por perfil**, para dar conta de uma base grande e variada de cadastros: **Pesquisadores**, **Clientes**, **ADM PesquisaPro**, **Vendedores**, **Indicadores de Clientes** e **Administração** (que agrupa os perfis internos que já existiam — Administrador, Coordenador e Gerente — sem nenhuma mudança nos acessos deles). Cada aba tem sua própria tabela, seus próprios cartões de estatística e seu próprio formulário de cadastro, já que os dados pedidos em cada perfil são bem diferentes.

A tela **Clientes**, que antes vivia sozinha no menu, foi **removida do menu lateral** — o cadastro de clientes (antes uma lista separada) foi unificado dentro de Usuários, na aba **Clientes**, com exatamente as mesmas funções de antes (vincular pesquisas, liberar acesso total, enviar formulário/relatório por WhatsApp ou e-mail) mais os campos novos abaixo. Em todo o resto do sistema — a etapa Cliente do assistente de pesquisa, o Painel geral, o perfil de demonstração "Cliente" no login — nada mudou no comportamento, só a base de dados dos clientes passou a viver dentro de `USERS` em vez de uma lista `CLIENTS` separada.

**Cadastro de Pesquisador**, agora bem mais completo: nome completo, CPF, data de nascimento, e-mail, celular, cidade, rua, número e CEP (endereço próprio, separado em campos), chave PIX completa (já existia), e duas novidades — **até 5 cidades em que pode atuar como pesquisador** (busca por nome em todos os 5.570 municípios do Brasil, com as escolhidas aparecendo como etiquetas removíveis) e **2 documentos obrigatórios em vez de 1**: um documento com foto (RG, CPF ou CNH) e um comprovante de residência, cada um com seu próprio anexo. Os dois entram na validação: não dá para cadastrar ou salvar um pesquisador sem os dois documentos. O autocadastro por link/QR Code (fila de "Cadastros aguardando análise") passou a pedir e mostrar os mesmos campos, incluindo os 2 documentos — aprovar um cadastro sem os dois documentos anexados continua bloqueado, como já acontecia antes com 1 documento.

**Cadastro de Cliente**: um seletor de "Pessoa física" ou "Pessoa jurídica" no topo do formulário decide se o campo "Data de nascimento" aparece (só para pessoa física). Os demais campos — nome completo/razão social, CPF ou CNPJ, celular, e-mail, cidade, rua, número, CEP e pessoa de contato (opcional, pensado para pessoa jurídica) — são os mesmos para os dois casos. Cliente é um perfil só de cadastro manual: não existe autocadastro para ele.

**ADM PesquisaPro, Vendedores e Indicadores de Clientes** são perfis novos, com um cadastro mais enxuto (nome completo, CPF, celular, e-mail e cidade) — pensado para um volume grande de pessoas sem a complexidade de pesquisador ou cliente. Os três só podem ser incluídos manualmente pelo Administrador master ou por um ADM PesquisaPro autorizado, sem nenhum tipo de autocadastro — a própria tela avisa isso no formulário. Por enquanto esses três perfis existem só como cadastro (nome, contato, status); telas de trabalho específicas para cada um — comissão de vendedor, indicações de cliente, etc. — podem ser construídas depois, quando o uso de cada perfil ficar mais claro.

### Perfis e permissões — colunas para os 4 novos perfis

A matriz de `Perfis e permissões` ganhou uma coluna para cada um dos perfis novos criados em Usuários: **Cliente**, **ADM PesquisaPro**, **Vendedor** e **Indicador de Clientes**, ao lado das 4 colunas que já existiam (Administrador, Coordenador, Gerente, Pesquisador). Como agora são 8 colunas, a tabela ganhou rolagem horizontal para não espremer em telas menores. Os valores iniciais seguem a lógica de cada perfil: **ADM PesquisaPro** começa com os mesmos acessos do Administrador (é um perfil interno com acesso total, conforme definido); **Cliente** começa sem nenhuma permissão marcada, já que ele só acessa o próprio perfil (abas Andamento/Resultados), fora da área administrativa; **Vendedor** e **Indicador de Clientes** começam só com "Gerenciar clientes" marcado, por ser a permissão mais relacionada à função dos dois — todas as células continuam clicáveis para ajustar exatamente o que cada perfil pode fazer. Uma nova permissão criada pelo botão "+ Nova permissão" já nasce com todas as 8 colunas.

### Remoção do campo "Registro da pesquisa (TSE)"

O campo **Registro da pesquisa (TSE)** foi retirado da tela `Dados da empresa` (card "Marca e responsável técnico"). Os demais campos fixos dessa tela (razão social, inscrição estadual, logotipo, responsável técnico) continuam como estavam.

### Botão "Aprovar" e documentos visíveis na ficha do pesquisador

Na tela de detalhe de um pesquisador (Usuários → aba Pesquisadores → abrir um cadastro), quando o status dele é **Pendente**, aparece um botão **Aprovar** ao lado de WhatsApp e Editar. Clicar nele muda o pesquisador para **Ativo**, liberado para ser vinculado a pesquisas — a mesma checagem de documentos que já existia na fila de "Cadastros aguardando análise" se aplica aqui: sem os 2 documentos obrigatórios anexados (documento com foto e comprovante de residência), a aprovação é bloqueada com um aviso. Uma vez ativo, o botão some da tela, já que não há mais nada a aprovar.

A tabela da aba Pesquisadores (Usuários → Pesquisadores) também ganhou os dois ajustes direto na listagem, sem precisar abrir cada cadastro: a coluna **Documentos** agora mostra o nome de cada arquivo anexado, com um link "abrir" (protótipo) para cada um, além do selo de quantos estão anexados; e a coluna de ações ganhou o botão **Aprovar** para quem está com status Pendente, aprovando o pesquisador sem sair da lista.

### Reorganização da aba Pesquisadores

A aba Usuários → Pesquisadores estava com os dados de cadastro espalhados: a tabela principal em cima, e a fila de "Cadastros aguardando análise" (autocadastros) bem mais embaixo, com o bloco de link/QR Code de autocadastro no meio ocupando bastante espaço. Isso foi reorganizado: agora a tabela principal e os "Novos cadastros aguardando aprovação" ficam um logo abaixo do outro, formando uma lista única e contínua de tudo que precisa de atenção. O bloco de **Autocadastro — link e QR Code** virou uma seção recolhível no final da página — aparece fechado, ocupando só uma linha ("🔗 Autocadastro — link e QR Code · Mostrar"), e expande com um clique quando for realmente preciso gerar ou enviar o link.

### Remoção do texto "Pesquisa Eleitoral MG · 2026" do topo

A etiqueta com o nome da pesquisa (ao lado do logotipo PesquisaPro, no topo de todas as telas) foi retirada. O botão **Trocar pesquisa ▾**, ao lado, continua no lugar.

### Remoção do número "3" no menu "Coleta e campo"

O selo numérico fixo que aparecia ao lado de "Coleta e campo" no menu lateral (um "3" sem significado no protótipo) foi removido.

### Otimizações aplicadas

A versão otimizada reduz o carregamento inicial com bibliotecas sob demanda, usa consultas com colunas explícitas e filtra o polling de coleta pela pesquisa aberta. Também valida cálculos amostrais, destrói instâncias antigas de gráficos, melhora o suporte a teclado e celular e escapa dados dinâmicos antes de inseri-los no HTML. Para o banco, execute `deploy/otimizacao-performance-seguranca.sql` depois do `schema.sql` e dos scripts de RLS.

## IMPORTANTE: o que este código é e o que não é

Este pacote é o **frontend completo do sistema** e já possui integração com Supabase para autenticação e persistência de perfis, pesquisas, equipe, coletas, respostas, pagamentos, contratos e convites, desde que o `schema.sql`, os scripts de RLS e a migração de otimização tenham sido executados no projeto Supabase configurado. Algumas áreas ainda são demonstrativas e continuam usando dados estáticos ou ações simuladas, conforme indicado nas respectivas telas.

Para uma versão de produção, ainda é necessário revisar e completar:
- políticas de **RLS** e permissões por tela, com testes de cada perfil;
- armazenamento privado para documentos, com URLs temporárias e regras de retenção;
- integrações de **PIX**, notificações e assinatura eletrônica com provedores reais;
- requisitos de **LGPD**, incluindo minimização, auditoria, consentimento e exclusão de dados;
- sincronização offline com fila local, retry e resolução de conflitos para uso em campo sem internet.

## Para quem for dar continuidade (Manus, programador, etc.)

Use este código como a **referência visual e funcional definitiva** — o design e os fluxos já estão decididos aqui, não precisam ser reinventados. O próximo trabalho deve priorizar o endurecimento das políticas de acesso, a conclusão das integrações externas e a sincronização offline de campo descritas acima.

Sugestão de ordem de construção:
1. Coleta funcionando (formulário que salva resposta no banco + lista das respostas).
2. Login e perfis de acesso; cadastro de usuários.
3. Criação de pesquisas, cálculo de amostra, cotas e relatórios.
4. Financeiro/PIX, contratos e clientes.
5. Segurança e LGPD.

(Há um guia de arquitetura e modelagem de dados mais detalhado em documento separado: "PesquisaPro_Guia_Construcao_NoCode".)

## Módulo Comercial

A aba **Comercial** centraliza oportunidades de venda de pesquisas em um funil com os estágios **Novo lead, Qualificação, Briefing, Proposta enviada, Negociação, Fechada ganha** e **Fechada perdida**. Administradores, ADM PesquisaPro, coordenadores e gerentes podem acompanhar o funil; vendedores visualizam e administram apenas as oportunidades atribuídas ao próprio perfil.

O cadastro de vendedor usa o perfil `vendedor` que já existe na estrutura de usuários. Administradores podem criar vendedores em **Usuários → Vendedores**, informando nome, CPF, e-mail, telefone, cidade e senha. O vendedor entra depois com suas credenciais e acessa diretamente a aba Comercial.

Cada oportunidade guarda empresa, contato, canais, cidade/região, origem, tipo de pesquisa, amostra estimada, valor estimado, briefing, notas e próxima ação. No detalhe da oportunidade é possível criar uma proposta com itens no formato `Descrição | quantidade | valor unitário`, escopo, validade e condições de pagamento. O sistema calcula os totais, salva a proposta e permite abrir um envio pré-preenchido por **WhatsApp** ou **e-mail**; após abrir o canal, a proposta passa ao status `Enviada` e a oportunidade avança para `Proposta enviada` quando ainda estava em `Novo lead`.

Para ativar a persistência do módulo, execute `deploy/comercial.sql` no SQL Editor do projeto Supabase. A migration cria `commercial_opportunities`, `commercial_proposals` e `commercial_proposal_items`, seus índices e as políticas RLS. Ela não envia e-mails por servidor nem gera PDF nesta primeira versão: o envio abre o WhatsApp ou o cliente de e-mail com o texto pronto. Um próximo incremento pode adicionar link público versionado, PDF com identidade visual e envio transacional.
