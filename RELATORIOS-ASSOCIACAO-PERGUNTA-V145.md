# Correção final da associação das respostas no Relatório — v145

## Evidência no banco

O diagnóstico no Supabase confirmou para as perguntas 13–22:

- `OK: UUID coincide`;
- respostas RPC presentes;
- base válida consistente;
- perguntas ativas.

Portanto, não há nova migration nem correção de dados necessária.

## Proteções adicionais no frontend

Além do UUID, posição e texto normalizado já usados na v144, a v145 acrescenta:

- normalização Unicode NFD para remover diferenças de acentuação;
- remoção de pontuação e espaços extras;
- fallback ordinal somente quando a RPC retorna exatamente um grupo por pergunta do formulário.

O fallback ordinal é condicionado à mesma quantidade de grupos e não pode misturar pesquisas ou deslocar dados em formulários incompletos.

## Teste

Após a publicação, atualizar com `Ctrl + Shift + R`, abrir **Relatórios** e conferir as perguntas 13 em diante.

A migration v143 continua suficiente; a v145 não exige SQL adicional.
