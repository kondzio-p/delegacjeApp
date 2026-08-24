// Pobieranie kursów z Narodowego Banku Polskiego — publiczne API, bez klucza
// i bez limitów. Wyłącznie kod serwerowy; stałe i typy współdzielone z klientem
// siedzą w `rates.ts`.
//
// Tabela A to kursy średnie, publikowane w dni robocze między 11:45 a 12:15.
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

function shiftDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return isoDate(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta));
}

/**
 * Bieżąca tabela A.
 *
 * Cache na godzinę: NBP publikuje raz dziennie, więc częstsze pytanie nic nie
 * wnosi, a ekran kursów i tak odświeży się w rozsądnym czasie po publikacji.
 *
 * `null` oznacza, że NBP nie odpowiedziało — wywołujący ma to znieść, a nie
 * wywalić stronę.
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
    // Brak którejkolwiek z naszych walut to niepełna tabela — lepiej nic niż połowa.
    if (FOREIGN_CODES.some((code) => typeof rates[code] !== "number")) return null;

    return { effectiveDate: table.effectiveDate, rates };
  } catch {
    return null;
  }
}

/**
 * Kurs waluty na wskazany dzień albo — gdy tego dnia nie było publikacji
 * (weekend, święto) — z ostatniego dnia roboczego przed nim.
 *
 * NBP zwraca 404 dla dni bez publikacji, więc zamiast cofać się dzień po dniu
 * pytamy o dziesięciodniowy przedział i bierzemy ostatni wpis: jedno żądanie
 * zamiast siedmiu.
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
