import "server-only";

import { headers } from "next/headers";

import { prisma } from "./db";

/** Reguła limitu: ile prób i w jakim oknie czasu. */
export type RateLimitRule = { limit: number; windowMs: number };

const MINUTE = 60 * 1000;

export const LOGIN_RULE: RateLimitRule = { limit: 10, windowMs: 15 * MINUTE };
export const RECOVERY_RULE: RateLimitRule = { limit: 5, windowMs: 60 * MINUTE };
export const REGISTER_RULE: RateLimitRule = { limit: 5, windowMs: 60 * MINUTE };
export const PASSWORD_RULE: RateLimitRule = { limit: 10, windowMs: 15 * MINUTE };

/** Po tylu godzinach żaden wiersz nie mieści się już w oknie żadnej reguły. */
const KEEP_HOURS = 2;

/** Co która próba sprząta stare wiersze — rzadko, bo to zapytanie na boku. */
const SWEEP_EVERY = 20;

let sinceSweep = 0;

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
 * Podmiot licznika dla bieżącego żądania.
 *
 * Adres IP plus e-mail: samo IP karałoby wszystkich za jednym łączem, a sam
 * e-mail pozwalałby zablokować cudze konto z dowolnego miejsca.
 *
 * Args:
 *     subject (string): Drugi człon klucza, zwykle znormalizowany e-mail.
 *
 * Returns:
 *     Promise<string>: Klucz przycięty do długości kolumny w bazie.
 */
async function subjectFor(subject: string): Promise<string> {
  return `${await clientIp()}|${subject.toLowerCase()}`.slice(0, 200);
}

/**
 * Kasuje wiersze starsze niż najdłuższe okno.
 *
 * Zaglądamy tu raz na kilkanaście prób, bo tabela rośnie wolno, a sprzątanie
 * przy każdym logowaniu byłoby zapytaniem w zamian za nic.
 *
 * Returns:
 *     Promise<void>: Nic — błąd sprzątania nie ma prawa wywrócić logowania.
 */
async function sweep(): Promise<void> {
  if (++sinceSweep < SWEEP_EVERY) return;
  sinceSweep = 0;

  try {
    await prisma.authAttempt.deleteMany({
      where: { created_at: { lt: new Date(Date.now() - KEEP_HOURS * 60 * MINUTE) } },
    });
  } catch {
    // Trudno — spróbujemy przy następnej okazji.
  }
}

/* ------------------------------------------------- licznik awaryjny */

// Gdy baza nie odpowiada, logowanie ma dalej działać, ale nie może zostać bez
// żadnej ochrony. Ten licznik żyje w pamięci instancji i wystarcza na czas awarii.
const globalForFallback = globalThis as typeof globalThis & {
  __rateLimiter?: Map<string, number[]>;
};

const memory: Map<string, number[]> = globalForFallback.__rateLimiter ?? new Map();
globalForFallback.__rateLimiter = memory;

/** Więcej kluczy w pamięci niż tyle oznacza atak, a nie ruch użytkowników. */
const MAX_KEYS = 10_000;

/**
 * Zlicza próbę w pamięci procesu.
 *
 * Args:
 *     key (string): Pełny klucz licznika.
 *     rule (RateLimitRule): Ile prób w jakim oknie.
 *
 * Returns:
 *     boolean: True, gdy próba mieści się w limicie.
 */
function allowInMemory(key: string, rule: RateLimitRule): boolean {
  const cutoff = Date.now() - rule.windowMs;
  const recent = (memory.get(key) ?? []).filter((moment) => moment > cutoff);

  if (memory.size > MAX_KEYS) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }

  if (recent.length >= rule.limit) {
    memory.set(key, recent);
    return false;
  }

  memory.set(key, [...recent, Date.now()]);
  return true;
}

/* ----------------------------------------------------------- licznik */

/**
 * Zlicza próbę i mówi, czy mieści się w limicie.
 *
 * Okno jest przesuwne: liczymy wiersze z ostatnich `windowMs` milisekund, więc
 * napastnik nie odzyskuje pełnej puli równo o pełnej godzinie. Licznik siedzi
 * w bazie, bo w pamięci procesu działałby osobno na każdej instancji i limit
 * dałoby się obejść samym ponawianiem żądań.
 *
 * Args:
 *     scope (string): Nazwa chronionej akcji, np. „login".
 *     rule (RateLimitRule): Ile prób w jakim oknie.
 *     subject (string): Drugi człon klucza, zwykle e-mail z formularza.
 *
 * Returns:
 *     Promise<boolean>: True, gdy próbę wolno wykonać.
 */
export async function allowAttempt(
  scope: string,
  rule: RateLimitRule,
  subject = "",
): Promise<boolean> {
  const key = await subjectFor(subject);
  const since = new Date(Date.now() - rule.windowMs);

  try {
    const recent = await prisma.authAttempt.count({
      where: { scope, subject: key, created_at: { gt: since } },
    });
    if (recent >= rule.limit) return false;

    await prisma.authAttempt.create({ data: { scope, subject: key } });
    await sweep();
    return true;
  } catch {
    // Baza milczy — zostaje licznik w pamięci instancji. Gorszy, ale to wciąż
    // więcej niż przepuszczenie każdej próby.
    return allowInMemory(`${scope}:${key}`, rule);
  }
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
  const key = await subjectFor(subject);
  memory.delete(`${scope}:${key}`);

  try {
    await prisma.authAttempt.deleteMany({ where: { scope, subject: key } });
  } catch {
    // Wiersze i tak wypadną z okna, a potem sprzątnie je `sweep`.
  }
}
