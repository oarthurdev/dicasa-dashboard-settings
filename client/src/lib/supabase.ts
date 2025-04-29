import { createClient } from "@supabase/supabase-js";

// Vamos usar as variáveis de ambiente sem o prefixo VITE_, pois elas serão
// substituídas durante o build pelo Vite através do servidor
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "";

// Inicializa o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
