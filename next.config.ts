import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Katalog projektu jest jednocześnie repozytorium — bez tego Turbopack szuka
  // package-lock.json wyżej w drzewie katalogów i ostrzega o cudzym lockfile.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
