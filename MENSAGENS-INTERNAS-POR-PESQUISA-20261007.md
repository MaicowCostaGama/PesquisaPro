# Mensagens internas por pesquisa — PesquisaPro

## O que foi implementado

Na aba **Coleta**, ao abrir uma pesquisa, a gestão passa a ter dois fluxos:

- **Enviar para toda a equipe**: cria uma cópia privada da mensagem para cada pesquisador vinculado à pesquisa.
- **Mensagem pelo aplicativo**: aparece na linha e no cartão de cada pesquisador já vinculado, enviando somente para aquela pessoa.

A mensagem não é publicada em um chat de grupo e os pesquisadores não conseguem responder ou enxergar mensagens de outros pesquisadores. Isso preserva a separação entre equipes e mantém o chat de atendimento para dúvidas e suporte.

## Onde o pesquisador vê

Depois do envio, o pesquisador encontra os avisos no cartão **Avisos das pesquisas**, no **Meu painel**. Cada aviso mostra:

- nome da pesquisa;
- data e hora;
- remetente;
- conteúdo completo;
- status não lido/lido.

O botão **Marcar como lido** registra a leitura apenas para o próprio destinatário.

## Migration manual obrigatória

A migration é aditiva e não destrutiva. Ela cria:

- `survey_researcher_messages`: conteúdo e remetente;
- `survey_researcher_message_recipients`: cópia de cada destinatário e leitura;
- `send_survey_researcher_message(...)`: RPC restrita à gestão;
- `mark_survey_researcher_message_read(...)`: RPC restrita ao próprio destinatário.

Execute manualmente no **Supabase → SQL Editor**:

```text
deploy/mensagens-pesquisa-pesquisadores.sql
```

O arquivo não deve ser executado pelo app e não foi aplicado automaticamente nesta entrega.

## Regras de segurança

- O envio só é aceito para perfis de gestão (`admin`, `coord`, `gerente` ou `admpro`).
- O envio geral usa somente pesquisadores presentes em `survey_team` e com perfil `pesq`.
- O envio individual valida novamente a associação do pesquisador à pesquisa no banco.
- RLS permite ao pesquisador consultar apenas as mensagens em que ele é destinatário.
- A gestão pode consultar as mensagens para auditoria operacional.
- O limite do corpo é de 4.000 caracteres.
- Pesquisas encerradas não aceitam novas mensagens.
- Não há remoção, truncamento ou alteração de dados existentes.

## Como testar após executar a migration

1. Entre como gestão.
2. Abra **Coleta → uma pesquisa → Equipe**.
3. Clique em **Enviar para toda a equipe (N)**, escreva a mensagem e confirme.
4. Entre com um pesquisador vinculado e abra **Meu painel**.
5. Confirme que o cartão **Avisos das pesquisas** mostra a mensagem e a pesquisa correta.
6. Marque-a como lida.
7. Volte à gestão e use **Mensagem pelo aplicativo** em um único pesquisador.
8. Confirme que apenas o destinatário individual recebeu esse segundo aviso.

Se a migration ainda não tiver sido executada, o app não simula o envio: ele informa que o recurso precisa ser ativado no Supabase.
