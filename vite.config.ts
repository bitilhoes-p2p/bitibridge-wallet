import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Hash no nome dos arquivos: cada versão publicada tem impressão digital
    // própria, o que é o que permite conferir o que o servidor entregou.
    sourcemap: false,
  },
});
