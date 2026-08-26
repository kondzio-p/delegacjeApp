// Testy jednostkowe logiki liczbowej: godziny, przeliczanie walut, zakresy dat,
// podsumowania podróży, CSV. Wszystko to funkcje czyste, bez bazy i bez sieci,
// więc środowisko Node wystarczy — jsdom byłby tu tylko kosztem startu.
//
// Rozszerzenie `.mts`, bo plik jest modułem ESM, a `package.json` nie deklaruje
// `"type": "module"` — bez tego Vite ostrzega przy każdym uruchomieniu.
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
