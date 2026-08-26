import { RATE_CODES, type CurrentRates, type RateCode } from "./rates";

/**
 * Waluta kwoty — zapisu w bazie i wyświetlania.
 *
 * To ten sam zestaw co waluty przeliczarki. Wcześniej były to dwa osobne typy:
 * kwoty dało się zapisać tylko w EUR i PLN, a dolar istniał wyłącznie
 * w przeliczarce i w raporcie. Rodziło to niespójność — można było oglądać
 * raport w dolarach, ale nie dało się wpisać wypłaty w dolarach.
 */
export type Currency = RateCode;

/** Waluty, w których da się zapisać kwotę i wybrać wyświetlanie. */
export const CURRENCIES = RATE_CODES;

/** Strażnik dla wartości z formularza albo z bazy — obie bywają tekstem. */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (RATE_CODES as readonly string[]).includes(value);
}

/**
 * Kwota w walucie wyświetlania.
 *
 * Kurs zamrożony przy wpisie (`nbpRate`) mówi, ile złotówek ta kwota była warta
 * w dniu operacji — dzięki temu suma za marzec wygląda tak samo w czerwcu.
 * Przeliczamy zawsze przez PLN, bo tabela NBP podaje kursy właśnie do złotówki.
 *
 * Gdy zamrożonego kursu brak (wpis sprzed zmiany albo NBP nie odpowiedziało
 * przy zapisie), sięgamy po kurs bieżący. Gdy i tego nie ma — oddajemy kwotę
 * bez przeliczenia, bo lepsza liczba w oryginalnej walucie niż zero.
 */
export function toDisplayAmount(
  amount: number,
  currency: Currency,
  nbpRate: number | null,
  display: Currency,
  current: CurrentRates | null,
): number {
  if (currency === display) return amount;

  const fromRate = currency === "PLN" ? 1 : (nbpRate ?? current?.rates[currency] ?? null);
  if (fromRate === null || fromRate <= 0) return amount;

  const inPln = amount * fromRate;
  if (display === "PLN") return inPln;

  const toRate = current?.rates[display] ?? null;
  if (toRate === null || toRate <= 0) return amount;
  return inPln / toRate;
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 h";

  // Najpierw zaokrąglamy do pełnych minut, dopiero potem dzielimy na godziny.
  // Odwrotna kolejność dawała „7 h 60 min", bo suma wielu wpisów potrafi wyjść
  // jako 7,999999999999999 — wtedy część całkowita to 7, a reszta zaokrągla się
  // do pełnych sześćdziesięciu minut.
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`;
}

export function formatDuration(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Godziny pomiędzy dwiema godzinami HH:MM (obsługuje zmianę doby). */
export function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
