// Stosuje oczekujące migracje przez klienta `pg`, gdy silnik migracji Prismy
// kończy się błędem P1001 na endpointcie pooled.
//
// Sumę kontrolną sprawdzamy na już zastosowanych migracjach, zastosowaną
// migrację pomijamy, a SQL i wpis do historii lecą w jednej transakcji.
//
// Uruchomienie: node --env-file=.env ./apply-migration-pg.mjs
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import pg from "pg";

const MIGRATIONS_DIR = "prisma/migrations";
const ATTEMPTS = 60;
const PER_ATTEMPT_MS = 30_000;

async function connectWithRetry() {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: PER_ATTEMPT_MS,
    });
    try {
      await client.connect();
      await client.query("select 1");
      console.log(`[db] polaczono (proba ${attempt})`);
      return client;
    } catch (error) {
      console.log(`[db] proba ${attempt}/${ATTEMPTS}: ${error.message}`);
      try {
        await client.end();
      } catch {
        // Nieudane połączenie nie ma czego zamykać.
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error("baza nie odpowiedziala");
}

function checksumOf(name) {
  const file = path.join(MIGRATIONS_DIR, name, "migration.sql");
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

const client = await connectWithRetry();

// --- 1. Czy nasz sposob liczenia sumy zgadza sie z tym, co zapisala Prisma? --
const { rows: applied } = await client.query(
  "select migration_name, checksum from _prisma_migrations where finished_at is not null",
);
if (applied.length === 0) throw new Error("brak zastosowanych migracji do porownania");

for (const row of applied) {
  const mine = checksumOf(row.migration_name);
  if (mine !== row.checksum) {
    console.log(`[stop] suma kontrolna sie nie zgadza dla ${row.migration_name}`);
    console.log("[stop] przerywam, zeby nie rozjechac historii migracji");
    process.exit(1);
  }
}
console.log(`[ok] algorytm sumy kontrolnej potwierdzony na ${applied.length} migracjach`);

// --- 2. Ktore migracje czekaja? ---------------------------------------------
const appliedNames = new Set(applied.map((r) => r.migration_name));
const pending = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .filter((name) => !appliedNames.has(name));

if (pending.length === 0) {
  console.log("[ok] brak oczekujacych migracji");
  process.exit(0);
}
console.log(`[plan] do zastosowania: ${pending.join(", ")}`);

// --- 3. SQL + wpis do historii, kazda migracja w jednej transakcji ----------
for (const name of pending) {
  const sql = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
  console.log(`[apply] ${name}`);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query(
      `insert into _prisma_migrations
         (id, checksum, finished_at, migration_name, logs, rolled_back_at,
          started_at, applied_steps_count)
       values ($1, $2, now(), $3, null, null, now(), 1)`,
      [randomUUID(), checksumOf(name), name],
    );
    await client.query("commit");
    console.log(`[apply] ${name} OK`);
  } catch (error) {
    await client.query("rollback");
    console.log(`[apply] ${name} BLAD: ${error.message}`);
    process.exit(1);
  }
}

console.log("[gotowe] wszystkie migracje zastosowane");
process.exit(0);
