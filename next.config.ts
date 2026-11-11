import { existsSync } from "node:fs";
import type { NextConfig } from "next";

// Local development: Next.js only reads .env and .env.local by itself, so the mode file
// from D10 (.env.surface by default, or the one named by ENV_FILE) is loaded here.
// In Docker, compose passes the variables directly and no file is read.
const envFile = process.env.ENV_FILE ?? ".env.surface";
if (existsSync(envFile)) process.loadEnvFile(envFile);

const nextConfig: NextConfig = {
  // Minimal self-contained server in .next/standalone, used by the Docker image (ARCHITECTURE.md, section 6).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
