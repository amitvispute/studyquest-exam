import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Public Supabase values — safe to ship in the browser bundle.
// Used as fallbacks when .env is not present at build time (e.g. GitHub-sourced publish builds).
const PUBLIC_SUPABASE_URL = "https://gztffbygqnxhgaxhvlrk.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6dGZmYnlncW54aGdheGh2bHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjAzNzAsImV4cCI6MjA5MDc5NjM3MH0.4eWlDZbMU5eB_laU-exr8-gwXQoK3HaGIlpZDwDDfiU";
const PUBLIC_SUPABASE_PROJECT_ID = "gztffbygqnxhgaxhvlrk";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || PUBLIC_SUPABASE_PROJECT_ID),
    },
  };
});
