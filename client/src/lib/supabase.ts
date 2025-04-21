import { createClient } from "@supabase/supabase-js";

// Vamos usar as variáveis de ambiente sem o prefixo VITE_, pois elas serão
// substituídas durante o build pelo Vite através do servidor
const supabaseUrl = "https://atlimsuwbzvdrgjwbjyt.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGltc3V3Ynp2ZHJnandianl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNzI4NjcsImV4cCI6MjA1OTk0ODg2N30.hge_T5enmzSfTtnK4wc5QSLKWkl-StzzjudnKfYf5C8";

// Inicializa o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
