import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_"],
  build: { target: "es2022" },
});
