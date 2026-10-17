import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_BACKEND_TARGET || "http://127.0.0.1:3001";

  return {
    plugins: [react()],
    worker: { format: "es" },
    server: {
      headers: {
        // Cross-origin isolation, matching the production server, so the speech model can use threads.
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
      },
      proxy: {
        "^/auth/(status|register|login|forgot-password|reset-password|logout)$": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "^/auth/profile$": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
