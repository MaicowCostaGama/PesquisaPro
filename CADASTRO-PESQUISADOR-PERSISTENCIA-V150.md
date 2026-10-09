# PesquisaPro v150 — correção do salvamento cadastral

## Situação

**Implementada e testada localmente. Ainda não publicada no GitHub/Vercel.**

Esta versão corrige o formulário de **Meus dados**, reforça o salvamento de PIX em **Meus ganhos** e atualiza os dados cadastrais utilizados pela gestão. Não cria migration nova e não executa SQL no Supabase.

## Causa comprovada no código e em teste DOM

Na versão anterior, o botão **Salvar meus dados**:

1. Capturava os campos pessoais e de endereço.
2. Redesenhava a página para mostrar o estado de salvamento.
3. Somente depois desse redesenho lia PIX, titular, banco, agência e conta dos controles.

O redesenho recriava os controles com os valores antigos de `CURRENT_PROFILE`. Assim, a chave recém-digitada era descartada antes de montar o pedido ao banco. Se o cadastro ainda não tinha PIX, a operação podia enviar `null`, mesmo depois de o pesquisador digitar uma chave e receber uma mensagem de sucesso.

**Reprodução com DOM real e banco simulado:** o mesmo valor digitado foi perdido pelo handler v149 e preservado pelo handler v150. Nenhum cadastro de produção foi alterado durante os testes.

### Outros problemas encontrados

- **Agência / conta em um único campo:** a montagem removia valores vazios. Quando existia apenas conta, ela podia ser apresentada e enviada como agência. Agora os campos são separados.
- **Sucesso sem conferência completa:** o frontend considerava suficiente a RPC não retornar erro. Agora relê o perfil da própria sessão e compara os campos enviados antes de anunciar sucesso.
- **Dados antigos na gestão:** a lista de usuários permanecia em cache e pagamentos carregados guardavam cópias de nome, telefone e PIX. Isso podia esconder uma alteração já persistida.
- **Perda do que foi digitado em erros/redesenhos:** agora há rascunho temporário de sessão; uma falha não apaga o formulário.

## O que mudou

### Pesquisador — Meus dados

- Captura integral de todos os campos editáveis **antes de qualquer operação assíncrona**.
- PIX e dados bancários continuam opcionais.
- Agência e conta são campos independentes.
- Campos ficam bloqueados durante o envio e a conferência para evitar gravações simultâneas ou alterações intermediárias.
- Só exibe **“Seus dados foram salvos e conferidos no banco”** depois da releitura autorizada do próprio perfil e das cidades.
- Se o envio ou a conferência falhar, mantém o que foi digitado para tentativa posterior.
- CPF, e-mail, status, aprovação e documentos oficiais permanecem fora do payload de edição própria.

### Pesquisador — Meus ganhos

- Mesma proteção de envio e conferência para chave PIX e banco.
- Não amplia a edição para outros campos.
- Não depende de carregar a relação de cidades para confirmar a chave.

### Gestão — Usuários e Financeiro

- Ao entrar nessas telas, invalida o cache de perfis para consultar os cadastros atuais.
- Botão **Atualizar cadastros / PIX** permite atualizar os dados sem sair da tela.
- O financeiro utiliza nome, telefone e PIX do perfil carregado mais recentemente, preservando a referência original dos pagamentos e os seus valores/status.
- A exportação de saldos busca os perfis novamente antes de gerar o Excel. Se essa consulta falhar, interrompe a exportação em vez de utilizar silenciosamente chaves antigas.
- A edição administrativa do pesquisador exige uma linha efetivamente retornada pelo banco e confere os campos enviados.

### Sessões

Rascunhos e estado de gravação são limpos no login/logout. Retornos de operações de uma sessão anterior não atualizam o perfil da nova conta.

## Banco de dados

**Não há novo SQL a executar para a v150.** Ela utiliza as funções já existentes:

- `update_my_researcher_profile` — edição do próprio cadastro.
- `update_my_researcher_payment_data` — edição de PIX/banco em Meus ganhos.

Se alguma dessas funções ainda não estiver instalada no ambiente, o aplicativo informa a dependência histórica correspondente. Isso não foi verificado em produção nesta investigação; não é necessário reaplicar migrations já instaladas apenas por causa da v150.

Não foram alteradas permissões, senhas, pesquisas, entrevistas, aprovações, valores financeiros, pagamentos, contratos, recibos ou comprovantes. O CSS existente foi preservado integralmente.

## Validação

- Reprodução do defeito anterior em DOM real, com dados sintéticos.
- Testes funcionais: chave antes vazia, alteração de chave, PIX opcional vazio, conta sem agência, todos os campos do payload, sucesso confirmado, erro da RPC, divergência na releitura, falha de conexão, rascunho preservado, bloqueio de envio duplo e isolamento de sessão.
- Conferência de cache cadastral e preservação dos valores/referências de pagamentos.
- Sintaxe de todos os arquivos JavaScript: aprovada.
- **103 smoke tests aprovados, sem falhas**, incluindo o teste funcional novo.
- Validação em DOM real: aprovada. CSS: idêntico ao da versão publicada.
- Cache do aplicativo e testes: `20261009095920`.

**Limite:** a persistência em uma conta real de pesquisador deverá ser validada após a publicação. Os testes não substituem essa verificação e não recuperam valores que o frontend antigo nunca enviou.

## Após publicar

1. Abrir a versão atualizada do app.
2. Um pesquisador afetado deve informar novamente os dados que não ficaram gravados e clicar em **Salvar meus dados** ou **Salvar dados** em Meus ganhos.
3. Confirmar a mensagem de gravação conferida.
4. Sair da tela e voltar para conferir o valor persistido.
5. Na gestão, abrir Usuários/Financeiro ou usar **Atualizar cadastros / PIX**.
6. Conferir o cadastro e, quando aplicável, a chave da exportação financeira.

Não há recuperação automática de chaves ou outros valores descartados antes do envio ao banco.
