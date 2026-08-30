# Conversa contextual — atualização 2026-08-30

O PesquisaPro passou a oferecer um botão **Conversar** sempre que um perfil ou contato possui telefone cadastrado. O botão usa o ícone vetorial do sistema e abre uma conversa no WhatsApp com mensagem contextual, sem expor o telefone na URL da interface e sem alterar os dados do cadastro.

## Pontos cobertos

O contato está disponível nas tabelas de Usuários, nos detalhes de usuário, na fila de cadastros pendentes, na atribuição de equipe e no resumo de convites. Também aparece no feed de coletas, no popup do mapa, nas ações da Auditoria e no painel de oportunidades do Comercial.

As mensagens variam conforme o contexto: cadastro e próximas coletas para pesquisadores, pesquisa para clientes, atividades do PesquisaPro para vendedores/indicadores, convite da pesquisa para equipe, coleta específica para mapa/auditoria e proposta de pesquisa para oportunidades comerciais.

O botão é omitido quando não existe telefone. Os cliques impedem a propagação para não abrir o perfil ou mudar o estágio da oportunidade por engano. Os números são normalizados para o formato brasileiro quando possuem DDD local.

## Compatibilidade

A funcionalidade não cria nova tabela nem exige migration no Supabase. Ela utiliza o telefone já presente nos perfis, oportunidades e cadastro de pesquisadores. O envio abre o WhatsApp Web ou o aplicativo instalado no dispositivo do usuário.
