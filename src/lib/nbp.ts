// Pobieranie kursów z NBP: tabela A, publikowana w dni robocze koło południa.
import "server-only";

import {
  FOREIGN_CODES,
  PLN_RATE,
  isForeignCode,
  isoDate,
  type CurrentRates,
  type DayRate,
  type RateCode,
} from "./rates";

const API = "https://api.nbp.pl/api/exchangerates";

/**
 * Przesuwa dzień o zadaną liczbę dób.
 *
 * Args:
 *     day (string): Dzień wyjściowy „YYYY-MM-DD".
 *     delta (number): Liczba dni do dodania; ujemna cofa.
 *
 * Returns:
 *     string: Przesunięty dzień w tym samym formacie.
 */
function shiftDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return isoDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta));
}

/**
 * Pobiera bieżącą tabelę kursów.
 *
 * Cache na godzinę, bo NBP publikuje raz dziennie. Niepełna tabela jest
 * odrzucana w całości — lepiej nic niż połowa kursów.
 *
 * Returns:
 *     Promise<CurrentRates | null>: Kursy albo null, gdy NBP nie odpowiedziało;
 *     wywołujący ma to znieść, a nie wywalić strony.
 */
export async function getCurrentRates(): Promise<CurrentRates | null> {
  try {
    const response = await fetch(`${API}/tables/A?format=json`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const [table] = (await response.json()) as {
      effectiveDate: string;
      rates: { code: string; mid: number }[];
    }[];
    if (!table) return null;

    const rates = {} as Record<(typeof FOREIGN_CODES)[number], number>;
    for (const row of table.rates) {
      if (isForeignCode(row.code)) rates[row.code] = row.mid;
    }
    if (FOREIGN_CODES.some((code) => typeof rates[code] !== "number")) return null;

    return { effectiveDate: table.effectiveDate, rates };
  } catch {
    return null;
  }
}

/**
 * Pobiera kurs waluty na wskazany dzień.
 *
 * NBP zwraca 404 dla dni bez publikacji, więc zamiast cofać się dzień po dniu
 * pytamy o dziesięciodniowy przedział i bierzemy ostatni wpis — weekend
 * i święto załatwiają się same.
 *
 * Args:
 *     code (RateCode): Waluta, o którą pytamy.
 *     day (string): Dzień operacji „YYYY-MM-DD".
 *
 * Returns:
 *     Promise<DayRate | null>: Kurs z datą tabeli albo null przy braku danych.
 */
export async function getRateForDate(code: RateCode, day: string): Promise<DayRate | null> {
  if (code === "PLN") return { mid: PLN_RATE, effectiveDate: day };

  // NBP nie zna przyszłości — data z przodu kończy się błędem 400.
  const today = isoDate(new Date());
  const target = day > today ? today : day;
  const from = shiftDays(target, -10);

  try {
    const response = await fetch(`${API}/rates/a/${code}/${from}/${target}/?format=json`, {
      // Kurs historyczny już się nie zmieni, więc cache bez wygasania. Dla dziś
      // tabela może się jeszcze pojawić, stąd krótsze okno.
      next: { revalidate: target === today ? 3600 : false },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      rates: { effectiveDate: string; mid: number }[];
    };
    const last = payload.rates.at(-1);
    if (!last) return null;

    return { mid: last.mid, effectiveDate: last.effectiveDate };
  } catch {
    return null;
  }
}
