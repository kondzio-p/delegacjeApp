// Zakłada albo aktualizuje konto administracyjne aplikacji.
//
// Dlaczego skrypt, a nie wpis w migracji: hasło musi przejść przez scrypt
// z losową solą, a hash policzony raz i wklejony do pliku migracji zostałby
// w repozytorium na zawsze. Tutaj hasło przychodzi ze środowiska i nigdzie
// się nie zapisuje.
//
// Uruchomienie: npm run root:create
//   ROOT_EMAIL     domyślnie root@gmail.com
//   ROOT_PASSWORD  domyślnie R00ter123!
import { randomBytes, randomInt, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import pg from "pg";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

const EMAIL = (process.env.ROOT_EMAIL ?? "root@gmail.com").trim().toLowerCase();
const PASSWORD = process.env.ROOT_PASSWORD ?? "R00ter123!";

/** Ten sam alfabet, co w aplikacji — bez znaków mylących się na kartce. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Hashuje sekret w formacie, który rozumie `verifySecret` z aplikacji.
 *
 * @param {string} secret Hasło albo kod odzyskiwania.
 * @returns {Promise<string>} Zapis `scrypt:sól:hash`.
 */
async function hashSecret(secret) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(secret, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Losuje kod odzyskiwania w formacie XXXX-XXXX-XXXX.
 *
 * @returns {string} Kod do zapisania w bezpiecznym miejscu.
 */
function recoveryCode() {
  const chars = Array.from(
    { length: 12 },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const code = recoveryCode();
  const [passwordHash, recoveryHash] = await Promise.all([
    hashSecret(PASSWORD),
    hashSecret(code.replace(/-/g, "")),
  ]);

  const existing = await client.query(`select id, is_root from users where email = $1`, [EMAIL]);

  if (existing.rowCount > 0) {
    await client.query(
      `update users
          set password_hash = $2,
              recovery_code_hash = $3,
              is_root = true,
              must_change_password = true,
              is_blocked = false,
              is_deleted = false,
              is_owner = false,
              company_id = null
        where email = $1`,
      [EMAIL, passwordHash, recoveryHash],
    );
    console.log(`[root] zaktualizowano konto ${EMAIL}`);
  } else {
    await client.query(
      `insert into users
         (id, email, name, password_hash, recovery_code_hash, is_root, must_change_password)
       values ($1, $2, $3, $4, $5, true, true)`,
      [randomUUID(), EMAIL, "Root", passwordHash, recoveryHash],
    );
    console.log(`[root] założono konto ${EMAIL}`);
  }

  console.log(`[root] kod odzyskiwania: ${code}`);
  console.log("[root] zapisz kod teraz — w bazie leży wyłącznie jego hash.");
  console.log("[root] przy pierwszym logowaniu aplikacja poprosi o własne hasło.");
} finally {
  await client.end();
}
