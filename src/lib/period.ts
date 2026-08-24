// Zakresy dat dla ekranu firmy i raportu — wspólne, żeby oba liczyły to samo.
//
// Zakres jest zawsze domknięty od lewej i otwarty od prawej: [from, to).
// Dzięki temu ostatni dzień miesiąca wchodzi w całości i nie trzeba się
// zastanawiać nad godzinami.
import { isoDate } from "./rates";

export type Period = { from: string; to: string };
export type PeriodPreset = "thisMonth" | "lastMonth" | "custom";

function monthStart(date: Date): string {
  return isoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** Bieżący miesiąc: od pierwszego do pierwszego następnego. */
export function thisMonth(now = new Date()): Period {
  return {
    from: monthStart(now),
    to: monthStart(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

export function lastMonth(now = new Date()): Period {
  return {
    from: monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: monthStart(now),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Zakres z parametrów adresu. Cokolwiek podejrzanego cofa się do bieżącego
 * miesiąca — parametry są w URL-u, więc nie można im ufać.
 */
export function periodFromParams(from?: string, to?: string, now = new Date()): Period {
  if (!from || !to || !DAY.test(from) || !DAY.test(to) || from >= to) return thisMonth(now);
  return { from, to };
}

/** Etykieta zakresu: „sierpień 2026" dla pełnego miesiąca, inaczej od–do. */
export function periodLabel(period: Period): string {
  const month = thisMonth(new Date(`${period.from}T12:00:00`));
  if (month.from === period.from && month.to === period.to) {
    return new Date(`${period.from}T12:00:00`).toLocaleDateString("pl-PL", {
      month: "long",
      year: "numeric",
    });
  }
  // `to` jest otwarte, więc pokazujemy dzień wcześniej — tak czyta to człowiek.
  const lastDay = new Date(`${period.to}T12:00:00`);
  lastDay.setDate(lastDay.getDate() - 1);
  const fmt = (d: Date) => d.toLocaleDateString("pl-PL");
  return `${fmt(new Date(`${period.from}T12:00:00`))} – ${fmt(lastDay)}`;
}
