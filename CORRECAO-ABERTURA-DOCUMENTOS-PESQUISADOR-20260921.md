# Correção da abertura de documentos do pesquisador — 21/09/2026

Os botões **abrir** do documento com foto e do comprovante de residência, disponíveis no perfil administrativo do pesquisador e na tabela de usuários, deixaram de exibir o alerta de recurso não configurado.

Agora, quando o arquivo está armazenado como caminho privado no bucket `researcher-documents`, o aplicativo solicita ao Supabase Storage uma URL assinada temporária com validade de dez minutos e abre o documento em uma nova aba. URLs HTTPS já existentes continuam sendo abertas diretamente. O caminho interno do storage não é exposto como link público permanente.

A alteração não muda documentos, perfis ou políticas de acesso e não exige migration SQL. Caso um arquivo não exista ou o bucket não esteja disponível, o sistema informa o problema sem expor o documento.
