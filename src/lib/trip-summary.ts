import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { formatDate, hoursBetween, toDisplayAmount, type Currency } from "./money";
import type { CurrentRates } from "./rates";
import type { Expense, Payout, Trip, WorkEntry } from "./types";

/** Punkt startowy nowego konta; dalej lista żyje w `users.expense_categories`. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Paliwo",
  "Jedzenie",
  "Zakwaterowanie",
  "Inne",
] as const;

/**
 * Składa etykietę podróży do selectów i list.
 *
 * Napis „w toku" przychodzi z zewnątrz, a nie ze słownika: ten moduł liczy
 * i formatuje, a tłumaczeniem zajmuje się warstwa znająca kontekst Reacta.
 *
 * Args:
 *     trip (Pick<Trip, "departure_at" | "return_at">): Daty wyjazdu i powrotu.
 *     options ({ locale?: Locale; ongoing?: string }): Język i napis dla
 *         podróży bez powrotu.
 *
 * Returns:
 *     string: Zakres dat w rodzaju „01.08.2026 – 15.08.2026".
 */
export function tripLabel(
  trip: Pick<Trip, "departure_at" | "return_at">,
  options: { locale?: Locale; ongoing?: string } = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const from = formatDate(trip.departure_at, locale);
  const to = trip.return_at ? formatDate(trip.return_at, locale) : (options.ongoing ?? "w toku");
  return `${from} – ${to}`;
}

/**
 * Wybiera podróż podpowiadaną w formularzach.
 *
 * Args:
 *     trips (Trip[]): Podróże konta, od najnowszej.
 *
 * Returns:
 *     string | null: Podróż w toku, a jak takiej nie ma — najnowsza.
 */
export function defaultTripId(trips: Trip[]): string | null {
  const ongoing = trips.find((t) => !t.return_at);
  if (ongoing) return ongoing.id;
  return trips[0]?.id ?? null;
}

/**
 * Rozbija godziny na pełne doby i resztę.
 *
 * Args:
 *     hours (number): Liczba godzin, także ułamkowa.
 *
 * Returns:
 *     { days: number; hours: number }: Doby i zaokrąglone godziny reszty.
 */
export function splitDaysHours(hours: number) {
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 0;
  return { days: Math.floor(safe / 24), hours: Math.round(safe % 24) };
}

export type TransactionRow = {
  kind: "expense" | "payout";
  id: string;
  title: string;
  subtitleParts: { label: string | null; at: string };
  amount: number;
  currency: Currency;
  at: string;
};

export type TripSummary = ReturnType<typeof summarizeTrip>;

/**
 * Liczy sumy z gotowego zestawu wpisów, w walucie wyświetlania.
 *
 * Wyłącznie fakty: przepracowany czas, pieniądze, które wpłynęły, i te, które
 * wyszły. Kategorie bierzemy z samych kosztów, a nie ze stałej listy, więc
 * wpisy z kategorii już nieużywanej nie znikają z podsumowania.
 *
 * Args:
 *     workEntries (WorkEntry[]): Wpisy godzin wchodzące do sumy.
 *     expenses (Expense[]): Koszty wchodzące do sumy.
 *     payouts (Payout[]): Wypłaty wchodzące do sumy.
 *     display (Currency): Waluta wyświetlania.
 *     rates (CurrentRates | null): Bieżąca tabela NBP dla wpisów bez kursu.
 *     locale (Locale): Język decydujący o kolejności kategorii.
 *
 * Returns:
 *     object: Godziny, sumy wypłat i kosztów, zysk oraz koszty po kategoriach.
 */
export function totalsOf({
  workEntries,
  expenses,
  payouts,
  display,
  rates,
  locale,
}: {
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
  display: Currency;
  /** Bieżąca tabela NBP — używana tylko tam, gdzie wpis nie ma własnego kursu. */
  rates: CurrentRates | null;
  /** Wpływa wyłącznie na kolejność kategorii — nazwy nadaje użytkownik. */
  locale?: Locale;
}) {
  const toDisplay = (row: { amount: number; currency: Currency; nbp_rate: number | null }) =>
    toDisplayAmount(Number(row.amount), row.currency, row.nbp_rate, display, rates);

  const workedHours = workEntries.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0);
  const totalPayouts = payouts.reduce((s, p) => s + toDisplay(p), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toDisplay(e), 0);

  const categories = [...new Set(expenses.map((e) => e.category))].sort((a, b) =>
    a.localeCompare(b, locale ?? DEFAULT_LOCALE),
  );
  const byCategory = categories
    .map((category) => ({
      category,
      total: expenses.filter((e) => e.category === category).reduce((s, e) => s + toDisplay(e), 0),
    }))
    .filter((row) => row.total > 0);

  return {
    workedHours,
    totalPayouts,
    totalExpenses,
    profit: totalPayouts - totalExpenses,
    byCategory,
  };
}

/**
 * Liczy podsumowanie jednej podróży.
 *
 * Przynależność wpisu do podróży wynika wyłącznie z kolumny `trip_id` — daty
 * służą tylko do policzenia długości wyjazdu, więc nakładające się podróże
 * i różnice stref czasowych nie mają wpływu na wynik.
 *
 * Args:
 *     tripId (string): Podróż, o którą chodzi.
 *     departureAt (string): Moment wyjazdu w zapisie ISO.
 *     returnAt (string | null): Moment powrotu albo null przy podróży w toku.
 *     workEntries (WorkEntry[]): Wszystkie wpisy godzin konta.
 *     expenses (Expense[]): Wszystkie koszty konta.
 *     payouts (Payout[]): Wszystkie wypłaty konta.
 *     display (Currency): Waluta wyświetlania.
 *     rates (CurrentRates | null): Bieżąca tabela NBP.
 *     now (number): Chwila odniesienia dla podróży w toku.
 *     locale (Locale): Język interfejsu.
 *
 * Returns:
 *     object: Sumy, długość wyjazdu, stawki godzinowe i lista transakcji.
 */
export function summarizeTrip({
  tripId,
  departureAt,
  returnAt,
  workEntries,
  expenses,
  payouts,
  display,
  rates,
  now,
  locale,
}: {
  tripId: string;
  departureAt: string;
  returnAt: string | null;
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
  display: Currency;
  rates: CurrentRates | null;
  now: number;
  locale?: Locale;
}) {
  const start = new Date(departureAt).getTime();
  const end = returnAt ? new Date(returnAt).getTime() : now;

  const workInTrip = workEntries.filter((e) => e.trip_id === tripId);
  const expensesInTrip = expenses.filter((e) => e.trip_id === tripId);
  const payoutsInTrip = payouts.filter((p) => p.trip_id === tripId);

  const { workedHours, totalPayouts, totalExpenses, profit, byCategory } = totalsOf({
    workEntries: workInTrip,
    expenses: expensesInTrip,
    payouts: payoutsInTrip,
    display,
    rates,
    locale,
  });

  const tripHours = Math.max(0, end - start) / 3_600_000;
  const { days: tripDays, hours: tripRest } = splitDaysHours(tripHours);

  const transactions: TransactionRow[] = [
    ...expensesInTrip.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      title: e.name,
      subtitleParts: { label: e.category, at: e.spent_at },
      amount: Number(e.amount),
      currency: e.currency,
      at: e.spent_at,
    })),
    ...payoutsInTrip.map((p) => ({
      kind: "payout" as const,
      id: p.id,
      title: p.note?.trim() || "Wypłata",
      subtitleParts: { label: null, at: p.paid_at },
      amount: Number(p.amount),
      currency: p.currency,
      at: p.paid_at,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    isOngoing: !returnAt,
    workInTrip,
    expensesInTrip,
    payoutsInTrip,
    workedHours,
    totalPayouts,
    totalExpenses,
    profit,
    tripHours,
    tripDays,
    tripRest,
    hourlyWork: workedHours > 0 ? totalPayouts / workedHours : 0,
    hourlyLife: tripHours > 0 ? profit / tripHours : 0,
    byCategory,
    transactions,
    isEmpty: workInTrip.length === 0 && expensesInTrip.length === 0 && payoutsInTrip.length === 0,
  };
}

/**
 * Liczy realne stawki godzinowe z tego, co faktycznie wpłynęło.
 *
 * `actualHourly` odpowiada na „ile wyszło za godzinę przy pracy", `hourlyLife`
 * na „ile wyszło za godzinę spędzoną na wyjeździe" — ta druga liczy cały czas
 * poza domem, także wolny, i odejmuje poniesione koszty.
 *
 * Args:
 *     totalPayouts (number): Suma wypłat w walucie wyświetlania.
 *     totalExpenses (number): Suma kosztów w walucie wyświetlania.
 *     workedHours (number): Przepracowane godziny.
 *     tripHours (number): Godziny trwania wyjazdu.
 *
 * Returns:
 *     { profit: number; actualHourly: number; hourlyLife: number }: Zysk
 *     i obie stawki; zero tam, gdzie nie ma czym dzielić.
 */
export function hourlyRates({
  totalPayouts,
  totalExpenses,
  workedHours,
  tripHours,
}: {
  totalPayouts: number;
  totalExpenses: number;
  workedHours: number;
  tripHours: number;
}) {
  const profit = totalPayouts - totalExpenses;

  return {
    profit,
    actualHourly: workedHours > 0 ? totalPayouts / workedHours : 0,
    hourlyLife: tripHours > 0 ? profit / tripHours : 0,
  };
}
