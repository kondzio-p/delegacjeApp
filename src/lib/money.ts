import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { RATE_CODES, type CurrentRates, type RateCode } from "./rates";

/** Sam kod języka nie wystarczy: „de" formatuje daty inaczej niż „de-DE". */
const INTL_LOCALE: Record<Locale, string> = {
  pl: "pl-PL",
  de: "de-DE",
  uk: "uk-UA",
  en: "en-GB",
};

/**
 * Zamienia język interfejsu na znacznik BCP 47 dla `Intl`.
 *
 * Args:
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: Znacznik w rodzaju „pl-PL"; nieznany język wraca do domyślnego.
 */
export function intlLocale(locale: Locale = DEFAULT_LOCALE): string {
  return INTL_LOCALE[locale] ?? INTL_LOCALE[DEFAULT_LOCALE];
}

/** Waluta kwoty — ten sam zestaw dla zapisu w bazie i dla przeliczarki. */
export type Currency = RateCode;

/** Waluty, w których da się zapisać kwotę i wybrać wyświetlanie. */
export const CURRENCIES = RATE_CODES;

/**
 * Sprawdza, czy wartość jest obsługiwaną walutą.
 *
 * Args:
 *     value (unknown): Tekst z formularza albo z bazy.
 *
 * Returns:
 *     boolean: True dla waluty, którą aplikacja zna.
 */
export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (RATE_CODES as readonly string[]).includes(value);
}

/**
 * Przelicza kwotę na walutę wyświetlania.
 *
 * Kurs zamrożony przy wpisie mówi, ile złotówek kwota była warta w dniu
 * operacji, więc suma za marzec wygląda tak samo w czerwcu. Bez zamrożonego
 * kursu sięgamy po bieżący, a gdy i tego brak — oddajemy kwotę bez
 * przeliczenia, bo lepsza liczba w oryginalnej walucie niż zero.
 *
 * Args:
 *     amount (number): Kwota w walucie wpisu.
 *     currency (Currency): Waluta wpisu.
 *     nbpRate (number | null): Kurs zamrożony przy zapisie.
 *     display (Currency): Waluta, w której chcemy zobaczyć kwotę.
 *     current (CurrentRates | null): Bieżąca tabela NBP.
 *
 * Returns:
 *     number: Kwota w walucie wyświetlania.
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

/**
 * Formatuje kwotę razem z symbolem waluty.
 *
 * Args:
 *     amount (number): Kwota do pokazania.
 *     currency (Currency): Waluta kwoty.
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: Kwota w zapisie właściwym dla języka.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Formatuje czas pracy jako „7 h 30 min".
 *
 * Najpierw zaokrąglamy do pełnych minut, dopiero potem dzielimy na godziny —
 * odwrotna kolejność dawała „7 h 60 min" dla sumy w rodzaju 7,999999.
 *
 * Args:
 *     hours (number): Liczba godzin, także ułamkowa.
 *
 * Returns:
 *     string: Zapis z godzinami i minutami; zero dla wartości bez sensu.
 */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 h";

  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")} min`;
}

/**
 * Rozbija czas trwania na dni, godziny, minuty i sekundy.
 *
 * Args:
 *     ms (number): Czas trwania w milisekundach.
 *
 * Returns:
 *     { days: number; hours: number; minutes: number; seconds: number }:
 *     Rozbicie gotowe do wyświetlenia w liczniku.
 */
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

/**
 * Liczy godziny między dwiema godzinami zegarowymi.
 *
 * Koniec wcześniejszy niż początek oznacza pracę przez północ, więc doba jest
 * dodawana zamiast dawać wynik ujemny.
 *
 * Args:
 *     start (string): Godzina rozpoczęcia „HH:MM".
 *     end (string): Godzina zakończenia „HH:MM".
 *
 * Returns:
 *     number: Liczba godzin, także ułamkowa.
 */
export function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

/**
 * Formatuje datę razem z godziną.
 *
 * Args:
 *     value (string): Moment w zapisie ISO.
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: Data i godzina w zapisie właściwym dla języka.
 */
export function formatDateTime(value: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Date(value).toLocaleString(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatuje samą datę.
 *
 * Args:
 *     value (string): Moment w zapisie ISO.
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: Data w zapisie właściwym dla języka.
 */
export function formatDate(value: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Date(value).toLocaleDateString(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
