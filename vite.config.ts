/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3100, // portal 3080, allocator-admin 3090
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Refine's packages would otherwise load react-router's CommonJS build while the app loads
    // its ES-module build: two copies, and Refine's hooks can't see the app's router.
    server: { deps: { inline: [/@refinedev\//] } },
    env: {
      VITE_API_URL: "http://localhost:3999",
    },
  },
});
