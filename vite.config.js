import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createApi } from "./server/api.mjs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "object-map-repository",
      configureServer(server) {
        server.middlewares.use(createApi());
      },
    },
  ],
  server: { host: "127.0.0.1" },
});
