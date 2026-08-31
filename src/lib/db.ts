// Klient Prisma. Wyłącznie kod serwerowy — nigdy w komponencie z "use client".
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Tworzy klienta Prismy na połączeniu z bazy z `DATABASE_URL`.
 *
 * Returns:
 *     PrismaClient: Klient gotowy do zapytań; brak zmiennej środowiskowej
 *     kończy się wyjątkiem, bo bez bazy aplikacja nie ma czego serwować.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Brak zmiennej środowiskowej DATABASE_URL. Ustaw connection string z console.prisma.io.",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// W dev Next przeładowuje moduły przy każdej zmianie — bez cache na globalThis
// każde przeładowanie otwierałoby nową pulę połączeń.
const globalForPrisma = globalThis as typeof globalThis & { __prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
