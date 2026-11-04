# Retirada dos grupos de WhatsApp — 04/11/2026

## Escopo

Retira a opção de entrar em grupos de WhatsApp das pesquisas. A gestão da equipe não oferece mais campo ou botão para salvar links de grupo; o painel do pesquisador e os aceites não apresentam a entrada em grupo, nem instruções de aguardar sua configuração.

Convites por WhatsApp individual, compartilhamento de links individuais, comunicação interna, chat da pesquisa, orientações iniciais e seus contadores permanecem disponíveis. GPS, vídeo obrigatório, confirmação de leitura e gravação final após 21h continuam intactos. Não há alteração de respostas, coletas, pagamentos, desistências ou não resposta explícita.

Modelos e avisos antigos são tratados na apresentação e nos novos envios para retirar links e instruções legadas de grupo. O histórico original e as confirmações de leitura não são apagados ou regravados.

## Instalação

1. Aplicar manualmente no Supabase SQL Editor o arquivo local `deploy/retirar-grupos-whatsapp-20261104.sql`, fornecido separadamente. Ele complementa as migrations de comunicação já instaladas, não exige reaplicar as anteriores e nunca é executado pelo frontend.
2. Após sucesso, publicar seletivamente o frontend e renovar o cache de `app.html`.
3. Recarregar o aplicativo. Conferir **Atribuir equipe**, **Meu painel**, o convite por link e uma orientação inicial enviada pelo sistema.

A migration mantém os campos legados para compatibilidade e auditoria, mas devolve `whatsapp_group_url` nulo nas RPCs de comunicação e ignora novas gravações pela RPC legada. Ela preserva a criação do chat interno no aceite e a idempotência do envio automático.

Se uma migration antiga que redefine essas funções de comunicação for reaplicada posteriormente, aplicar novamente a migration de retirada por último. O aplicativo não controla grupos externos ou textos já enviados fora do sistema.

## Validação

- Smoke test específico de retirada dos grupos, incluindo modelos antigos, convites, orientação inicial e preservação do chat/WhatsApp individual.
- Regressões de treinamento, áudio noturno, carregamento, listas extensas, desistência, não resposta e navegação administrativa.
- Interface local em 390 e 1.365 pixels, sem acesso a dados de produção.
- Parser PostgreSQL para a migration e teste local do tratamento de modelos antigos. A revisão também validou aceite, chat, retornos compatíveis e contadores em PostgreSQL temporário.

SQL e testes PostgreSQL locais não fazem parte da publicação no GitHub/Vercel. Não são implantadas Edge Functions. O arquivo protegido de cadastro e a solução de upload adiada permanecem fora desta alteração.
