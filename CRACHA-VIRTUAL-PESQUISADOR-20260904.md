# Crachá virtual do pesquisador

O perfil `pesq` passa a ter a opção **Crachá virtual** no menu. O pesquisador pode carregar uma foto frontal em JPG, PNG ou WebP, com limite de 5 MB, e gerar um QR Code pessoal.

Quando a pessoa entrevistada lê o QR Code, o endereço `cracha.html?codigo=...` chama a RPC pública `verify_researcher_badge`. A página mostra somente o nome, a foto do crachá, o status ativo/inativo e a data da verificação. CPF, e-mail, telefone, endereço, documentos, PIX e demais dados do perfil não são retornados.

A migration `deploy/cracha-pesquisador.sql` cria o token público não previsível, o campo do caminho da foto, o bucket `researcher-badge-photos` e as políticas de upload do próprio pesquisador. A foto do crachá é pública por necessidade de verificação via QR Code; o caminho usa o UUID do perfil e um identificador aleatório. Documentos oficiais permanecem no bucket privado de documentos e não são reutilizados no crachá.

Antes de publicar, execute a migration no SQL Editor do Supabase e confirme **“Success. No rows returned”**. Depois, o pesquisador deve entrar no painel, abrir **Crachá virtual**, enviar a foto, conferir a prévia e testar o QR Code com outro celular ou em uma janela anônima.
