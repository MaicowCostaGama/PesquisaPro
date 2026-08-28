# Roteiro — do protótipo ao app publicado

Este documento é o mapa de tudo que falta para o PesquisaPro sair do protótipo (que roda só no navegador, sem salvar nada) e virar um site de verdade com banco de dados, além de chegar às lojas Google Play e Apple App Store. Ele existe para deixar claro o que já está pronto, o que farei a seguir, e o que só você consegue fazer (contas, pagamentos, verificação de identidade).

Com base no que você escolheu: banco de dados e hospedagem no **Supabase + Vercel**, apps para **Android e iOS**, sem conta de desenvolvedor ainda em nenhuma das duas lojas, build de iOS pela nuvem (sem Mac), e você mesmo cria as contas e me passa as chaves.

## Status atual

- [x] Domínio registrado: **pesquisa-pro.com** (GoDaddy)
- [x] Conta Supabase criada (URL + chave publicável recebidas — projeto `APPesquisa`)
- [x] Banco de dados criado (schema.sql rodado com sucesso — todas as tabelas no ar)
- [x] Código enviado ao GitHub (repositório `MaicowCostaGama/PesquisaPro`)
- [x] Site publicado no Vercel: **https://pesquisa-pro.vercel.app** (versão de teste, ainda sem conexão com o banco)
- [x] Domínio pesquisa-pro.com apontado para o Vercel — **site no ar em https://pesquisa-pro.com**
- [x] Login de verdade funcionando em produção (Supabase Auth) — testado e confirmado com a conta admin
- [x] Tela de Usuários conectada ao banco de dados (listar, cadastrar com login real, editar e excluir) — confirmado em produção
- [x] Tela de Pesquisas conectada ao banco de dados (criar, editar, duplicar, concluir, reabrir e excluir pesquisas de verdade, com formulário/perguntas/cotas e vínculo com clientes) — confirmado em produção
- [x] Atribuição de equipe ("Atribuir equipe" em Minhas pesquisas) agora usa os pesquisadores reais cadastrados em Usuários e grava no banco — confirmado em produção
- [x] Financeiro (tela "Financeiro" do admin/gerente e "Meus ganhos" do pesquisador) agora lê e grava de verdade no banco — confirmado em produção. O pesquisador pode editar sua própria chave PIX e banco em "Meus ganhos", e isso grava direto no cadastro dele. Válidos/rejeitados agora vêm de verdade da Coleta de campo (item abaixo) — não são mais lançados à mão; o staff só decide o status do pagamento (pendente/aprovado/em auditoria) em "Definir status".
- [x] Coleta de campo conectada de verdade: o pesquisador escolhe, em "Coletar (app)", uma cota real da pesquisa (calculada a partir das perguntas/opções cadastradas), o navegador pede a localização do aparelho de verdade, e ao enviar a entrevista fica gravada no banco (pesquisa, pesquisador, cota, coordenadas, horário). O mapa ao vivo e a auditoria (reprovar/reaprovar, marcar calibração) do admin/coordenador agora mostram essas coletas reais — reprovar/reaprovar recalcula automaticamente o Financeiro daquele pesquisador (por um gatilho no próprio banco). **Limitações conhecidas, para uma próxima etapa:** ainda não funciona 100% offline com fila de sincronização (é preciso ter internet no momento de enviar cada coleta — o GPS em si funciona sem internet); não há upload de fotos; não há checagem de "fora da área designada" nem de duplicidade de aparelho.
- [x] Respostas reais de cada entrevista + Relatórios/Resultados de verdade: antes, a Coleta de campo só gravava *qual cota* cada entrevista cumpriu (para pagamento/auditoria) — as respostas em si (ex.: "em quem vai votar") não eram salvas em lugar nenhum, então "Relatórios" (staff) e "Resultados" (cliente) continuavam 100% fictícios mesmo depois da Coleta de campo funcionar de verdade. Agora, ao aplicar uma entrevista em "Coletar (app)", o pesquisador responde de verdade cada pergunta da pesquisa (a pergunta correspondente à cota escolhida já vem pré-preenchida e travada, para não haver contradição) — funciona para todos os tipos de pergunta (escolha única, múltipla escolha, escala 1–5, escala 1–10, NPS, número, data e resposta aberta), e o envio só é liberado depois de todas as perguntas obrigatórias (todas, exceto resposta aberta) estarem respondidas. Essas respostas ficam gravadas numa nova tabela (`collection_answers`), e tanto "Relatórios" (staff) quanto "Resultados" (cliente, depois de liberado) agora mostram a distribuição real de respostas — gráfico e tabela com quantidade e % — pergunta por pergunta, sempre excluindo coletas reprovadas e de calibração. De quebra, corrigi uma falha que a tela "Resultados" do cliente tinha desde antes desta etapa: ela nunca havia sido ligada ao login real do cliente (sempre mostrava um cliente de demonstração fixo, não importa quem estivesse logado) — agora usa o cliente e a pesquisa de verdade da conta logada. **Limitações conhecidas, para uma próxima etapa:** cada pergunta é mostrada separadamente — cruzamento entre duas ou mais perguntas ao mesmo tempo (ex.: "voto × idade × sexo") ainda não existe; perguntas de resposta aberta (texto livre) não entram nos gráficos/tabelas (só ficam salvas); não há exportação em PDF/Excel dos resultados.
- [x] Contrato-quadro do pesquisador com assinatura eletrônica dos dois lados: antes, "Meu contrato" era uma tela fictícia (nome fixo, já "assinado" com data inventada). Agora existe um contrato de verdade, único e bem elaborado (13 cláusulas), que deixa claro que não há vínculo empregatício, como funciona o pagamento (por formulário aprovado, só depois de encerrada a coleta) e reconhece a validade da assinatura eletrônica com base na lei brasileira (MP 2.200-2/2001 e Código Civil). O pesquisador assina uma única vez em "Meu contrato" (nome e CPF puxados do cadastro real) e isso passa a valer para todas as pesquisas futuras; enquanto não assinar, a tela "Coletar (app)" fica bloqueada. Do lado do PesquisaPro, um administrador assina eletronicamente pela CONTRATANTE em "Contratos" (uma única vez por versão do contrato, não uma vez por pesquisador) — a partir daí os dois lados aparecem assinados tanto para o admin quanto para cada pesquisador. Cada assinatura grava nome, CPF/cargo, data/hora, IP (quando disponível) e um hash do texto exato assinado, numa tabela que ninguém pode editar ou apagar depois (preserva a prova). **Pendências:** os dados da CONTRATANTE (razão social, CNPJ, endereço, responsável legal) ainda estão com valores de exemplo em `EMPRESA_CONTRATO` no `app.js` — falta você me passar os dados reais da empresa para eu preencher; também vale revisar o texto com um advogado antes de valer pra todo mundo.
- [ ] Conta Google Play Console
- [ ] Conta Apple Developer

## Visão geral das etapas

1. **Contas e infraestrutura** — você cria as contas (Supabase, Vercel, Google Play, Apple Developer) e me passa as chaves de acesso. *(próximo passo, depende de você)*
2. **Banco de dados** — já preparei o schema completo (`schema.sql`, nesta mesma pasta). Assim que sua conta Supabase existir, eu rodo esse schema nela.
3. **Login de verdade** — hoje o "login" é só um botão de escolher o perfil, sem senha nenhuma. Vou trocar isso pelo sistema de autenticação do Supabase (e-mail/senha de verdade, por perfil).
4. **Reescrever o app para usar o banco de dados** — a parte mais trabalhosa. Hoje toda tela do protótipo lê e escreve em listas soltas na memória do navegador (por isso os dados somem ao recarregar). Vou trocar, tela por tela, essas listas por chamadas reais ao Supabase — usuários, pesquisas, coleta de campo, financeiro e contratos, nessa ordem.
5. **Publicar o site** — subir a versão conectada ao banco no Vercel, primeiro num endereço de teste (algo como `pesquisapro.vercel.app`) e depois apontando o domínio que você já comprou, **pesquisa-pro.com** (GoDaddy), para lá.
6. **Empacotar como aplicativo** — usando uma ferramenta chamada Capacitor, o mesmo site vira um aplicativo instalável no Android e no iOS.
7. **Gerar os builds** — Android é gerado direto; iOS precisa de um serviço de build na nuvem (ex.: Codemagic), já que não temos um Mac disponível.
8. **Enviar para as lojas** — preencher a ficha de cada loja (nome, descrição, ícone, capturas de tela, política de privacidade, classificação etária) e enviar para revisão. A aprovação é feita pela Google/Apple, não por mim nem por você — costuma levar de algumas horas a poucos dias.

As etapas 2 a 5 fazem sentido acontecer antes de 6 a 8: não vale a pena publicar nas lojas um app que ainda mostra dados fictícios que somem ao fechar.

## O que fazer agora: criar as contas

### 1. Supabase (banco de dados)

1. Acesse **https://supabase.com** e clique em "Start your project" — pode entrar com sua conta do GitHub ou Google, ou criar uma com e-mail e senha.
2. Crie um novo projeto (New Project). Dê um nome (sugestão: `pesquisapro`) e escolha uma senha forte para o banco — **guarde essa senha em um lugar seguro**, ela não aparece de novo depois.
3. Escolha a região mais próxima do Brasil disponível (geralmente "South America (São Paulo)").
4. Espere o projeto terminar de ser criado (1-2 minutos).
5. No menu lateral, vá em **Project Settings → API**. Você vai ver três informações — me envie estas duas:
   - **Project URL** (algo como `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public key** (uma chave longa)
   - **NÃO me envie a "service_role" key por enquanto** — essa é mais poderosa e vamos tratar ela com mais cuidado quando for a hora de usar (nunca deve aparecer no código do site, só no servidor).

### 2. Vercel (hospedagem do site)

1. Acesse **https://vercel.com** e crie uma conta (o mais simples é entrar com a mesma conta do GitHub, se você tiver uma — se não tiver, dá para criar com e-mail).
2. Não precisa criar nenhum projeto ainda dentro do Vercel — eu crio o projeto quando fizer o primeiro envio do site.
3. Vá em **Account Settings → Tokens**, crie um token novo (Create Token), dê um nome como "pesquisapro-deploy" e **me envie esse token**. Ele funciona como uma senha só para publicar o site — trate como algo sigiloso.

### 2.1 Domínio (pesquisa-pro.com, já comprado no GoDaddy)

Nada a fazer com ele agora — só guarde o acesso à sua conta GoDaddy à mão. Na etapa 5, depois que o site já estiver no ar em `algumacoisa.vercel.app`, eu te passo exatamente quais registros DNS criar lá no painel do GoDaddy (geralmente um registro do tipo "A" e outro "CNAME") para que `pesquisa-pro.com` passe a abrir o site direto, sem precisar mexer em mais nada além disso.

### 3. Google Play Console (loja Android)

1. Acesse **https://play.google.com/console/signup**.
2. Taxa única de **US$ 25** (aproximadamente R$ 140, dependendo do câmbio), paga uma vez, sem mensalidade.
3. Você vai precisar de uma Conta Google (crie uma específica para o PesquisaPro, se preferir separar do seu e-mail pessoal) e de um cartão para pagar a taxa.
4. Se for cadastrar como empresa (recomendado se o PesquisaPro for uma empresa formal), vão pedir CNPJ e alguns dados de verificação — pode levar de 1 a 2 dias para aprovar a conta.
5. Depois de criada, não precisa fazer mais nada aqui por enquanto — o app só será enviado quando estiver pronto (etapa 8).

### 4. Apple Developer (loja iOS)

1. Acesse **https://developer.apple.com/programs/enroll/**.
2. Taxa de **US$ 99 por ano** (renovação anual obrigatória para manter o app na loja).
3. Precisa de um Apple ID (crie um específico para isso, se preferir).
4. Se for cadastrar como empresa, a Apple pede um número D-U-N-S (um identificador internacional de empresas, gratuito, mas pode levar alguns dias para ser emitido se sua empresa ainda não tiver um — consulte em https://www.dnb.com/duns-number.html). Se for cadastrar como pessoa física, é mais rápido, mas o app aparece na loja no seu nome pessoal em vez do nome da empresa.
5. A aprovação da conta pode levar de 1 a 2 dias úteis.

### 5. Codemagic (build de iOS na nuvem, sem precisar de Mac)

Isso só será necessário mais para frente (etapa 7), mas fica registrado aqui: quando chegarmos lá, criamos uma conta gratuita em **https://codemagic.io** (dá para entrar com GitHub) — o plano gratuito inclui alguns minutos de build por mês, suficiente para gerar as primeiras versões de teste.

## O que já está pronto

- **`schema.sql`** (nesta pasta): o desenho completo do banco de dados — todas as tabelas (usuários, pesquisas, perguntas e opções, coleta de campo, financeiro, contratos, permissões, dados da empresa), já corrigindo os principais problemas do protótipo (hoje muita coisa é ligada por nome de pessoa em vez de um identificador único — troquei tudo isso por relações de verdade). Assim que a conta Supabase existir, eu colo esse arquivo no "SQL Editor" do painel deles e as tabelas são criadas automaticamente.

## O que farei a seguir (depois que as contas existirem)

Assim que você me enviar a URL e a chave "anon" do Supabase e o token do Vercel, eu:
1. Crio as tabelas no Supabase a partir do `schema.sql`.
2. Troco o login fake por um login de verdade (e-mail/senha) usando o sistema de autenticação do Supabase.
3. Começo a reescrever o app.js módulo por módulo (usuários primeiro, depois pesquisas, depois coleta e financeiro) para ler e gravar direto no banco.
4. Publico a primeira versão de teste no Vercel, com um link que você pode abrir de qualquer computador ou celular.

Vou te avisar em cada etapa terminada, do mesmo jeito que fiz até agora com cada ajuste de tela — só que agora cada entrega vai ser um pedaço maior do sistema (por exemplo, "usuários agora salvam de verdade no banco"), não mais um ajuste visual pontual.

## Um aviso importante sobre prazo

Os ajustes que fizemos até aqui (remover um campo, mudar um texto, reorganizar uma tela) levam minutos porque são mudanças pontuais na aparência. Ligar o sistema inteiro a um banco de dados de verdade — com login real, permissões reais, upload de documentos de verdade, e todas as telas conversando com o banco em vez de listas soltas — é um projeto bem maior, do tamanho de um sistema de produção real. Vou avançar em etapas e te mostrar o progresso a cada uma, mas não é algo que sai pronto em uma única resposta.
