# PesquisaPro — correção visual do funil da equipe (v131)

A captura enviada mostrou o nome de cada pesquisador comprimido em uma faixa estreita, com letras descendo uma abaixo da outra, porque o cartão posicionava identificação e até três botões na **mesma linha flexível**. A regra transversal da v130 permitia quebra de texto, mas não reservava espaço para a identidade; por isso o defeito permaneceu.

Na v131, cada cartão do funil em **Coleta e campo → Equipe** usa duas faixas: identificação, nome, status e área na primeira; botões de convite, orientação ou conversa na segunda. Ações quebram linha quando necessário; no celular estreito passam a ocupar a largura do cartão. Os nomes longos não são cortados e a foto/ícone não encolhe. Não houve mudança nas funções dos botões nem em permissões, dados ou SQL.

**Validação:** o teste `collection-funnel-visual-test.py` usa a própria função `collectionFunnelCard()` com quatro estados de exemplo e seis larguras, de 320 a 1917 px. Antes da correção, o teste falhou por nome estreito; depois passou sem colisão de botões nem excesso horizontal. Os 87 smoke tests existentes e o teste global de nove perfis também passaram. As prévias usam apenas dados simulados; não foi feita uma edição de registros reais.

**Implantação:** esta versão permanece local até autorização para GitHub/Vercel. Não há migration a executar no Supabase. O ZIP v131 inclui o teste visual e os arquivos estáticos do aplicativo.
