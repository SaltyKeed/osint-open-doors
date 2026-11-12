import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // The real package throws outside a Next.js server; tests run in plain Node.
      "server-only": fromRoot("./src/tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
