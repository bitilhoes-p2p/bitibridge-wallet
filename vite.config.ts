import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  // O lwk_wasm é publicado no formato de empacotador: o .wasm é importado como
  // módulo, e o plugin abaixo é o que ensina o Vite a lidar com isso.
  plugins: [react(), wasm()],
  build: {
    // WebAssembly e await no topo do módulo exigem alvo moderno.
    target: "esnext",
    sourcemap: false,
  },
  optimizeDeps: {
    // O pré-empacotamento do Vite não lida com o .wasm; deixamos passar direto.
    exclude: ["lwk_wasm"],
  },
});
