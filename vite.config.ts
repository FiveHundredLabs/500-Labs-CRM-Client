import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [react(), tailwindcss()],
  };

  if (command !== "serve") {
    return config;
  }

  const env = loadEnv(mode, process.cwd(), "");
  const devApiTarget = env.DEV_API_TARGET?.trim();

  if (!devApiTarget) {
    throw new Error("Missing required Vite dev server config: DEV_API_TARGET");
  }

  return {
    ...config,
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
