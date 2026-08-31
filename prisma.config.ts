import { existsSync } from "node:fs";

import { defineConfig, env } from "prisma/config";

// Prisma CLI nie wczytuje .env samo; na Vercelu zmienne idą z ustawień projektu.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
