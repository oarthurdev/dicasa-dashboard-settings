import { createClient } from '@supabase/supabase-js';

// Vamos usar as variáveis de ambiente sem o prefixo VITE_, pois elas serão
// substituídas durante o build pelo Vite através do servidor
const supabaseUrl = 'https://vzxaizngurzcwuoxjwvn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eGFpem5ndXJ6Y3d1b3hqd3ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkwNzQyMzYsImV4cCI6MjAzNDY1MDIzNn0.4tn9IUq4GD_vxjfXHIZn8aFsf0GQ-qnOxQrk4v9vG7k';

// Inicializa o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);