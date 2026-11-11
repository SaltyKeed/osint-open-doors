import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/..." imports declared in tsconfig.json.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" throws when imported outside a Next.js server build.
      // Tests run in plain Node, so it is replaced by an empty module.
      "server-only": fileURLToPath(
        new URL("./src/tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    // The domain and the mappers are plain TypeScript: no browser needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
