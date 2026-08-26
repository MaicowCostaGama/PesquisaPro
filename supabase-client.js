/* ============================================================
   Conexão com o banco de dados (Supabase) do PesquisaPro
   ------------------------------------------------------------
   Só a chave "publicável" (sb_publishable_...) fica neste arquivo.
   Ela é segura para aparecer no navegador — é o equivalente
   moderno da antiga "anon key". A chave secreta (sb_secret_...)
   NUNCA deve ser colocada aqui nem em nenhum arquivo do site.
   ============================================================ */
const SUPABASE_URL = 'https://soejywbqjgqsrluhbyit.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-OZqiZaw-SfAqNY4SppQKw_USrZiOqa';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
