import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Ver tests/stubs/server-only.ts: a proteção fica no código, e some só aqui.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  // O Next compila JSX com o runtime automático; sem isto o vitest usaria o
  // clássico e exigiria `import React` em arquivos que em produção não
  // precisam dele. Teste que obriga o código a mudar para passar não está
  // testando o código que roda.
  esbuild: { jsx: "automatic" },

  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
  },
});
