import type { NextConfig } from "next";

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
