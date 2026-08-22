// Uwierzytelnianie na własnej bazie: nazwa użytkownika + hasło, bez e-maili.
//
// Hasło:  scrypt z losową solą (node:crypto, zero zależności natywnych).
// Sesja:  losowy token w ciasteczku httpOnly; w bazie leży wyłącznie jego
//         SHA-256, więc podgląd tabeli `sessions` nie pozwala przejąć konta.
// Kod odzyskiwania: jedyna droga do zresetowania zapomnianego hasła bez
//         właściciela firmy — też trzymany wyłącznie jako hash.
import "server-only";

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { cookies } from "next/headers";

import { prisma } from "./db";
import type { SessionUser } from "./types";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SESSION_COOKIE = "delegacje_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Bez 0/O/1/I/L — kod przepisuje się z kartki, więc mylące znaki odpadają. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const RECOVERY_CODE_LENGTH = 12;
const RESET_PASSWORD_LENGTH = 7;

export const SESSION_USER_SELECT = {
  id: true,
  username: true,
  first_name: true,
  last_name: true,
  is_owner: true,
  company_id: true,
  must_change_password: true,
} as const;

/* --------------------------------------------------------------- hasła */

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(secret, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scryptAsync(secret, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/** Kod odzyskiwania w formacie XXXX-XXXX-XXXX. */
export function generateRecoveryCode(): string {
  const chars = Array.from(
    { length: RECOVERY_CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Hasło startowe nadawane przez właściciela: 7 losowych małych liter. */
export function generateResetPassword(): string {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  return Array.from(
    { length: RESET_PASSWORD_LENGTH },
    () => letters[randomInt(letters.length)],
  ).join("");
}

/** Porównanie kodu ignoruje myślniki, spacje i wielkość liter. */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/* -------------------------------------------------------------- sesje */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: { token_hash: hashToken(token), user_id: userId, expires_at: expiresAt },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!token) return;
  // deleteMany zamiast delete — brak rekordu (np. sesja już wygasła) to nie błąd.
  await prisma.session.deleteMany({ where: { token_hash: hashToken(token) } });
}

/** Kończy wszystkie sesje użytkownika — po zmianie lub resecie hasła. */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { user_id: userId } });
}

/** Zalogowany użytkownik albo null. Wygasłą sesję od razu sprząta z bazy. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { token_hash: tokenHash },
    select: { expires_at: true, user: { select: SESSION_USER_SELECT } },
  });

  if (!session) return null;

  if (session.expires_at.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { token_hash: tokenHash } });
    return null;
  }

  return session.user;
}
