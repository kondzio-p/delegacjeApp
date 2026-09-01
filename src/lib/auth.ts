// Uwierzytelnianie na własnej bazie: adres e-mail, hasło i kod odzyskiwania.
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
const SESSION_COOKIE = "godzio_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Bez 0/O/1/I/L — kod przepisuje się z kartki, więc mylące znaki odpadają. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const RECOVERY_CODE_LENGTH = 12;
const RESET_PASSWORD_LENGTH = 7;

export const SESSION_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  is_owner: true,
  company_id: true,
  must_change_password: true,
  expense_categories: true,
  display_currency: true,
  locale: true,
  is_deleted: true,
  is_root: true,
  can_own_company: true,
  is_blocked: true,
} as const;

/* --------------------------------------------------------------- hasła */

/**
 * Hashuje hasło albo kod odzyskiwania.
 *
 * Każdy sekret dostaje własną 16-bajtową sól, więc dwa takie same hasła mają
 * w bazie różne hashe. Sól jedzie w wyniku, bo bez niej nie da się później
 * powtórzyć obliczenia.
 *
 * Args:
 *     secret (string): Hasło albo kod w postaci jawnej.
 *
 * Returns:
 *     Promise<string>: Zapis `scrypt:sól:hash` gotowy do wstawienia do bazy.
 */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(secret, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Sprawdza sekret względem zapisu z bazy.
 *
 * Porównanie idzie przez `timingSafeEqual`, żeby czas odpowiedzi nie zdradzał,
 * ile początkowych bajtów się zgadza. Zapis w nieznanym formacie albo o złej
 * długości odrzucamy, zamiast próbować go ratować.
 *
 * Args:
 *     secret (string): Sekret podany przez użytkownika.
 *     stored (string): Zapis `scrypt:sól:hash` z bazy.
 *
 * Returns:
 *     Promise<boolean>: True, gdy sekret pasuje do zapisu.
 */
export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scryptAsync(secret, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/** Hash-atrapa o poprawnej długości — nikt się nim nie zaloguje. */
const DECOY_HASH = `scrypt:${"00".repeat(16)}:${"00".repeat(KEY_LENGTH)}`;

/**
 * Zużywa tyle czasu, co sprawdzenie prawdziwego hasła.
 *
 * Bez tego logowanie na nieznany adres wraca natychmiast, a na znany dopiero
 * po scrypcie. Różnica jest mierzalna zdalnie i zdradza, które konta istnieją,
 * mimo że komunikat błędu jest ten sam.
 *
 * Args:
 *     secret (string): Sekret z formularza, żeby praca była realna.
 *
 * Returns:
 *     Promise<void>: Nic — liczy się wyłącznie czas.
 */
export async function burnVerification(secret: string): Promise<void> {
  await verifySecret(secret, DECOY_HASH);
}

/**
 * Losuje kod odzyskiwania w formacie XXXX-XXXX-XXXX.
 *
 * Returns:
 *     string: Dwanaście znaków z alfabetu bez mylących liter, w trzech grupach.
 */
export function generateRecoveryCode(): string {
  const chars = Array.from(
    { length: RECOVERY_CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/**
 * Losuje hasło startowe nadawane pracownikowi przez właściciela.
 *
 * Same małe litery, bo hasło jest dyktowane na głos albo przepisywane z ekranu.
 *
 * Returns:
 *     string: Siedem losowych liter.
 */
export function generateResetPassword(): string {
  const letters = "abcdefghijkmnopqrstuvwxyz";
  return Array.from(
    { length: RESET_PASSWORD_LENGTH },
    () => letters[randomInt(letters.length)],
  ).join("");
}

/**
 * Sprowadza kod odzyskiwania do postaci porównywalnej.
 *
 * Args:
 *     code (string): Kod przepisany przez użytkownika.
 *
 * Returns:
 *     string: Kod bez myślników i spacji, wielkimi literami.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Sprowadza adres e-mail do postaci porównywalnej.
 *
 * Args:
 *     email (string): Adres wpisany w formularzu.
 *
 * Returns:
 *     string: Adres małymi literami, bez otaczających spacji.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* -------------------------------------------------------------- sesje */

/**
 * Skrót tokenu sesji przechowywany w bazie.
 *
 * Args:
 *     token (string): Token z ciasteczka.
 *
 * Returns:
 *     string: SHA-256 w zapisie szesnastkowym.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Zakłada sesję i wystawia ciasteczko.
 *
 * Do przeglądarki idzie losowy token, a do bazy wyłącznie jego skrót — podgląd
 * tabeli `sessions` nie pozwala więc przejąć konta.
 *
 * Args:
 *     userId (string): Identyfikator zalogowanego użytkownika.
 *
 * Returns:
 *     Promise<void>: Nic — efektem jest wpis w bazie i ciasteczko.
 */
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

/**
 * Kończy bieżącą sesję i kasuje ciasteczko.
 *
 * Returns:
 *     Promise<void>: Nic — brak rekordu w bazie nie jest błędem.
 */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!token) return;
  await prisma.session.deleteMany({ where: { token_hash: hashToken(token) } });
}

/**
 * Kończy wszystkie sesje użytkownika — po zmianie albo resecie hasła.
 *
 * Args:
 *     userId (string): Właściciel sesji do skasowania.
 *
 * Returns:
 *     Promise<void>: Nic — po tym wywołaniu żadne stare ciasteczko nie działa.
 */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { user_id: userId } });
}

/**
 * Mówi, czy żądanie w ogóle niesie ciasteczko sesji.
 *
 * Nie potwierdza, że sesja jest ważna — służy tam, gdzie wystarczy domysł,
 * a runda do bazy byłaby marnotrawstwem, jak przy wyborze celu z ekranu 404.
 *
 * Returns:
 *     Promise<boolean>: True, gdy ciasteczko sesji jest obecne.
 */
export async function hasSessionCookie(): Promise<boolean> {
  const jar = await cookies();
  return Boolean(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Zwraca zalogowanego użytkownika na podstawie ciasteczka.
 *
 * Wygasłą sesję od razu sprząta z bazy, a konto zanonimizowane traktuje jak
 * nieistniejące — żywe ciasteczko nie może go wskrzesić.
 *
 * Returns:
 *     Promise<SessionUser | null>: Dane konta albo null, gdy sesji brak.
 */
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

  // Konto zanonimizowane albo zablokowane — żywa sesja nie może go wskrzesić.
  if (session.user.is_deleted || session.user.is_blocked) {
    await prisma.session.deleteMany({ where: { user_id: session.user.id } });
    return null;
  }

  return session.user;
}
