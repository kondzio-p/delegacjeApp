import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Katalog projektu jest jednocześnie repozytorium — bez tego Turbopack szuka
  // package-lock.json wyżej w drzewie katalogów i ostrzega o cudzym lockfile.
  turbopack: { root: path.resolve(".") },

  experimental: {
    // Wszystkie ekrany są dynamiczne (czytają ciasteczko sesji), więc domyślnie
    // klient nie cache'uje ich wcale i powrót na poprzedni widok znów czeka na
    // bazę. 30 s wystarczy na przeklikanie się tam i z powrotem, a każdy zapis
    // i tak woła revalidatePath("/", "layout"), więc świeże dane nie uciekają.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
