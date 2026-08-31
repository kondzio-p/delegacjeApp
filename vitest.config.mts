// Testy jednostkowe czystej logiki liczbowej — bez bazy i bez sieci, więc
// środowisko Node wystarczy.
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Rozwiązuje `@/lib/...` wprost z tsconfig.json — Vite umie to sam,
    // bez wtyczki vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
