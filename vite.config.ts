import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

// Resolve __dirname e __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis de ambiente antes de exportar a config
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    root: path.resolve(__dirname, "client"),
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
    },
    base: "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": pathsupabaseUrl.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL,
      ),
      "import.meta.env.VITE_SUPABASE_KEY": JSON.stringify(
        env.VITE_SUPABASE_KEY,
      ),
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL),
    },
  };
});
