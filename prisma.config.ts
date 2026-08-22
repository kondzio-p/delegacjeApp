import { existsSync } from "node:fs";

import { defineConfig, env } from "prisma/config";

// Prisma CLI (7.x) nie wczytuje .env samo. Node robi to natywnie; na Vercelu
// pliku .env nie ma, bo zmienne przychodzą z ustawień projektu.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
