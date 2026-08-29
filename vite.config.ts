import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devApiTarget = env.DEV_API_TARGET?.trim();

  if (!devApiTarget) {
    throw new Error("Missing required Vite dev server config: DEV_API_TARGET");
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
