import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { intlLocale } from "./money";

// Zamiana między dniem z formularza a momentem w kolumnie `timestamptz`.

/**
 * Zamienia dzień z formularza na moment do zapisu.
 *
 * Południe UTC, a nie północ: w każdej europejskiej strefie wypada wtedy ten
 * sam dzień kalendarzowy, więc wpis nie przeskakuje o dobę przy odczycie.
 *
 * Args:
 *     day (string): Dzień w formacie „YYYY-MM-DD".
 *
 * Returns:
 *     Date: Południe tego dnia w UTC.
 */
export function dayToMoment(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

/**
 * Odczytuje dzień z zapisanego momentu.
 *
 * Liczymy w UTC, bo tak samo zapisujemy — inaczej wpis powstały późnym
 * wieczorem pokazywałby dzień następny.
 *
 * Args:
 *     moment (Date | string): Moment z bazy albo jego zapis ISO.
 *
 * Returns:
 *     string: Dzień „YYYY-MM-DD" albo pusty tekst przy niepoprawnej dacie.
 */
export function momentToDay(moment: Date | string): string {
  const date = moment instanceof Date ? moment : new Date(moment);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/**
 * Podaje dzisiejszy dzień w czasie lokalnym.
 *
 * Args:
 *     now (Date): Chwila odniesienia, domyślnie teraz.
 *
 * Returns:
 *     string: Dzień „YYYY-MM-DD" do wstawienia w formularz.
 */
export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Zamienia klucz miesiąca na nazwę do wyświetlenia.
 *
 * Args:
 *     monthKey (string): Miesiąc w postaci „YYYY-MM".
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: Nazwa w rodzaju „sierpień 2026".
 */
export function monthLabel(monthKey: string, locale: Locale = DEFAULT_LOCALE): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, 1).toLocaleDateString(intlLocale(locale), {
    month: "long",
    year: "numeric",
  });
}

/**
 * Czy tekst jest istniejącym dniem w formacie „YYYY-MM-DD".
 *
 * Sam kształt nie wystarcza: „2020-99-99" przechodzi przez wyrażenie regularne,
 * a potem daje `Invalid Date` i wywraca zapytanie do bazy. Składamy datę
 * z części i sprawdzamy, czy nie przesunęła się na inny dzień — tak wypadają
 * i miesiąc trzynasty, i 30 lutego.
 *
 * Args:
 *     value (string): Dzień do sprawdzenia.
 *
 * Returns:
 *     boolean: True, gdy taki dzień naprawdę istnieje w kalendarzu.
 */
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
