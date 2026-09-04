# Orientações para coleta do pesquisador

## Objetivo

Foi criada uma opção **Orientações para coleta** no menu do perfil do pesquisador. A página reúne um vídeo tutorial, um passo a passo operacional, uma lista de conferência e soluções para problemas comuns no celular.

## Conteúdo do guia

O pesquisador é orientado a preparar o celular, ativar o GPS, abrir a pesquisa correta, selecionar a cota, confirmar a localização, aplicar o questionário com neutralidade, tratar a confirmação final gravada quando ela aparecer e aguardar o envio ao servidor.

A orientação também reforça que respostas não devem ser alteradas para atingir metas, que a entrevista deve ser realizada no local indicado e que dúvidas sobre cota ou abordagem devem ser encaminhadas à coordenação.

## Vídeo

O arquivo `assets/pesquisa-pro-orientacoes-coleta.mp4` contém seis telas explicativas com narração em português brasileiro. O pôster `assets/pesquisa-pro-orientacoes-coleta-poster.png` é exibido antes do carregamento do vídeo. A duração aproximada é de 113 segundos.

## Acesso

O item aparece somente para usuários com perfil `pesq`, no grupo **Campo**, junto de **Coletar (app)**. Os botões do guia levam diretamente ao app de coleta e o vídeo funciona com controles nativos, `playsinline` e layout vertical em telas estreitas.

## Arquivos principais

| Arquivo | Função |
|---|---|
| `app.js` | Rota, menu e conteúdo do guia |
| `style.css` | Layout responsivo, vídeo, passos e checklist |
| `app.html` | Cache atualizado dos arquivos do painel |
| `assets/pesquisa-pro-orientacoes-coleta.mp4` | Vídeo tutorial narrado |
| `assets/pesquisa-pro-orientacoes-coleta-poster.png` | Pôster do vídeo |
| `researcher-guide-smoke-test.js` | Valida rota, conteúdo, cache e assets |
