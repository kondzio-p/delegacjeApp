// Zakresy dat dla ekranu firmy i raportu. Zawsze domknięte od lewej, otwarte
// od prawej — ostatni dzień miesiąca wchodzi w całości.
import { isCalendarDay } from "./day";
import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { intlLocale } from "./money";
import { isoDate } from "./rates";

export type Period = { from: string; to: string };
export type PeriodPreset = "thisMonth" | "lastMonth" | "custom";

/**
 * Podaje pierwszy dzień miesiąca, w którym leży data.
 *
 * Args:
 *     date (Date): Dowolny dzień miesiąca.
 *
 * Returns:
 *     string: Pierwszy dzień tego miesiąca w formacie „YYYY-MM-DD".
 */
function monthStart(date: Date): string {
  return isoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Zwraca zakres bieżącego miesiąca.
 *
 * Args:
 *     now (Date): Chwila odniesienia, domyślnie teraz.
 *
 * Returns:
 *     Period: Od pierwszego dnia miesiąca do pierwszego dnia następnego.
 */
export function thisMonth(now = new Date()): Period {
  return {
    from: monthStart(now),
    to: monthStart(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

/**
 * Zwraca zakres poprzedniego miesiąca.
 *
 * Args:
 *     now (Date): Chwila odniesienia, domyślnie teraz.
 *
 * Returns:
 *     Period: Od pierwszego dnia poprzedniego miesiąca do pierwszego bieżącego.
 */
export function lastMonth(now = new Date()): Period {
  return {
    from: monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: monthStart(now),
  };
}

/**
 * Zakres z parametrów adresu.
 *
 * Parametry są w URL-u, więc nie można im ufać: cokolwiek podejrzanego cofa się
 * do bieżącego miesiąca. Dni sprawdzamy kalendarzowo, a nie samym kształtem —
 * „2020-99-99" ma poprawny wygląd, ale jako `Invalid Date` wywracało zapytanie.
 *
 * Args:
 *     from (string): Początek zakresu z parametru „od".
 *     to (string): Koniec zakresu z parametru „do", wyłączny.
 *     now (Date): Chwila odniesienia dla zakresu zastępczego.
 *
 * Returns:
 *     Period: Zakres z parametrów albo bieżący miesiąc.
 */
export function periodFromParams(from?: string, to?: string, now = new Date()): Period {
  if (!from || !to || !isCalendarDay(from) || !isCalendarDay(to) || from >= to) {
    return thisMonth(now);
  }
  return { from, to };
}

/**
 * Opisuje zakres tekstem do pokazania na ekranie.
 *
 * Pełny miesiąc dostaje własną nazwę, każdy inny zakres — parę dat. Prawa
 * granica jest otwarta, więc pokazujemy dzień wcześniej, bo tak czyta to człowiek.
 *
 * Args:
 *     period (Period): Zakres do opisania.
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     string: „sierpień 2026" albo „01.08.2026 – 15.08.2026".
 */
export function periodLabel(period: Period, locale: Locale = DEFAULT_LOCALE): string {
  const intl = intlLocale(locale);
  const month = thisMonth(new Date(`${period.from}T12:00:00`));
  if (month.from === period.from && month.to === period.to) {
    return new Date(`${period.from}T12:00:00`).toLocaleDateString(intl, {
      month: "long",
      year: "numeric",
    });
  }
  const lastDay = new Date(`${period.to}T12:00:00`);
  lastDay.setDate(lastDay.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString(intl);
  return `${fmt(new Date(`${period.from}T12:00:00`))} – ${fmt(lastDay)}`;
}
