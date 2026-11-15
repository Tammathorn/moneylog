/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The browser sees one origin; /api goes to the Express server.
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], include: ["tests/**/*.test.tsx"] },
});
