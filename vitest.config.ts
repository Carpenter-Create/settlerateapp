import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/__tests__/**/*.test.ts",
      "packages/core/src/**/*.test.ts",
      "scripts/schema/__tests__/**/*.test.mjs",
      "scripts/deploy/__tests__/**/*.test.mjs",
    ],
    globals: false,
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
