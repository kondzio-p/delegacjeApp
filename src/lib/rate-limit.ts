import "server-only";

import { headers } from "next/headers";

/** Reguła limitu: ile prób i w jakim oknie czasu. */
export type RateLimitRule = { limit: number; windowMs: number };

const MINUTE = 60 * 1000;

export const LOGIN_RULE: RateLimitRule = { limit: 10, windowMs: 15 * MINUTE };
export const RECOVERY_RULE: RateLimitRule = { limit: 5, windowMs: 60 * MINUTE };
export const REGISTER_RULE: RateLimitRule = { limit: 5, windowMs: 60 * MINUTE };
export const PASSWORD_RULE: RateLimitRule = { limit: 10, windowMs: 15 * MINUTE };

/** Ile kluczy trzymamy, zanim zaczniemy wyrzucać najstarsze. */
const MAX_KEYS = 10_000;

// Licznik przeżywa przeładowanie modułów w dev tak samo jak klient Prismy.
const globalForLimiter = globalThis as typeof globalThis & {
  __rateLimiter?: Map<string, number[]>;
};

const attempts: Map<string, number[]> = globalForLimiter.__rateLimiter ?? new Map();
globalForLimiter.__rateLimiter = attempts;

/**
 * Adres IP żądania.
 *
 * Za proxy (Vercel) prawdziwy adres siedzi w `x-forwarded-for`, gdzie pierwszy
 * wpis to klient, a kolejne to warstwy pośrednie. Nagłówek da się podrobić przy
 * bezpośrednim połączeniu z serwerem, dlatego licznik jest utwardzeniem,
 * a nie jedyną barierą.
 *
 * Returns:
 *     Promise<string>: Adres IP albo „nieznany", gdy nagłówków brak.
 */
async function clientIp(): Promise<string> {
  const incoming = await headers();
  const forwarded = incoming.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "nieznany";
  return incoming.get("x-real-ip")?.trim() || "nieznany";
}

/**
 * Klucz licznika dla bieżącego żądania.
 *
 * Args:
 *     scope (string): Nazwa chronionej akcji, np. „login".
 *     subject (string): Dodatkowy człon klucza, zwykle znormalizowany e-mail.
 *
 * Returns:
 *     Promise<string>: Klucz złożony z zakresu, adresu IP i podmiotu.
 */
async function keyFor(scope: string, subject: string): Promise<string> {
  return `${scope}:${await clientIp()}:${subject}`;
}

/**
 * Usuwa próby spoza okna i pilnuje rozmiaru mapy.
 *
 * Args:
 *     key (string): Klucz licznika.
 *     rule (RateLimitRule): Reguła wyznaczająca okno czasu.
 *
 * Returns:
 *     number[]: Znaczniki czasu prób mieszczących się w oknie.
 */
function fresh(key: string, rule: RateLimitRule): number[] {
  const cutoff = Date.now() - rule.windowMs;
  const kept = (attempts.get(key) ?? []).filter((moment) => moment > cutoff);

  if (kept.length === 0) attempts.delete(key);
  else attempts.set(key, kept);

  // Mapa rośnie tylko przy ataku z wielu adresów — wtedy najstarszy klucz
  // i tak jest już bezużyteczny.
  if (attempts.size > MAX_KEYS) {
    const oldest = attempts.keys().next().value;
    if (oldest !== undefined) attempts.delete(oldest);
  }

  return kept;
}

/**
 * Zlicza próbę i mówi, czy mieści się w limicie.
 *
 * Okno jest przesuwne: liczymy próby z ostatnich `windowMs` milisekund, więc
 * napastnik nie odzyskuje pełnej puli równo o pełnej godzinie. Licznik żyje
 * w pamięci procesu, co przy wielu instancjach oznacza limit na instancję —
 * podnosi koszt ataku, ale nie zastępuje licznika w bazie.
 *
 * Args:
 *     scope (string): Nazwa chronionej akcji.
 *     rule (RateLimitRule): Ile prób w jakim oknie.
 *     subject (string): Dodatkowy człon klucza, zwykle e-mail z formularza.
 *
 * Returns:
 *     Promise<boolean>: True, gdy próbę wolno wykonać.
 */
export async function allowAttempt(
  scope: string,
  rule: RateLimitRule,
  subject = "",
): Promise<boolean> {
  const key = await keyFor(scope, subject.toLowerCase());
  const recent = fresh(key, rule);

  if (recent.length >= rule.limit) return false;

  attempts.set(key, [...recent, Date.now()]);
  return true;
}

/**
 * Kasuje licznik po udanej operacji.
 *
 * Args:
 *     scope (string): Nazwa chronionej akcji.
 *     subject (string): Ten sam podmiot, co przy zliczaniu próby.
 *
 * Returns:
 *     Promise<void>: Nic — licznik znika.
 */
export async function forgetAttempts(scope: string, subject = ""): Promise<void> {
  attempts.delete(await keyFor(scope, subject.toLowerCase()));
}
