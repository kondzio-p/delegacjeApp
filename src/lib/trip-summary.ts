import { convert, formatDate, hoursBetween, type Currency } from "./money";
import type { Expense, Payout, Trip, WorkEntry } from "./types";

export const EXPENSE_CATEGORIES = ["Paliwo", "Jedzenie", "Zakwaterowanie", "Inne"] as const;

/** Etykieta podróży używana w selectach i na listach. */
export function tripLabel(trip: Pick<Trip, "departure_at" | "return_at">): string {
  const from = formatDate(trip.departure_at);
  const to = trip.return_at ? formatDate(trip.return_at) : "w toku";
  return `${from} – ${to}`;
}

/** Domyślny wybór w formularzach: podróż w toku, a jak nie ma — najnowsza. */
export function defaultTripId(trips: Trip[]): string | null {
  const ongoing = trips.find((t) => !t.return_at);
  if (ongoing) return ongoing.id;
  return trips[0]?.id ?? null;
}

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
 * Sumy z gotowego zestawu wpisów, w walucie wyświetlania.
 *
 * `accrued` to zarobek naliczony z godzin i stawek („przewidywania"),
 * `totalPayouts` to pieniądze, które faktycznie wpłynęły.
 */
export function totalsOf({
  workEntries,
  expenses,
  payouts,
  display,
  rate,
}: {
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
  display: Currency;
  rate: number;
}) {
  const toDisplay = (amount: number, currency: Currency) => convert(amount, currency, display, rate);

  const workedHours = workEntries.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0);
  const accrued = workEntries.reduce(
    (s, e) => s + toDisplay(hoursBetween(e.start_time, e.end_time) * Number(e.rate), e.rate_currency),
    0,
  );
  const totalPayouts = payouts.reduce((s, p) => s + toDisplay(Number(p.amount), p.currency), 0);
  const totalExpenses = expenses.reduce((s, e) => s + toDisplay(Number(e.amount), e.currency), 0);

  const byCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: expenses
      .filter((e) => e.category === category)
      .reduce((s, e) => s + toDisplay(Number(e.amount), e.currency), 0),
  })).filter((row) => row.total > 0);

  return {
    workedHours,
    accrued,
    totalPayouts,
    totalExpenses,
    profit: totalPayouts - totalExpenses,
    byCategory,
  };
}

/**
 * Liczy podsumowanie jednej podróży.
 *
 * Przynależność wpisu do podróży wynika WYŁĄCZNIE z kolumny trip_id — daty
 * służą już tylko do policzenia długości wyjazdu. Dzięki temu nakładające się
 * podróże i różnice stref czasowych nie mają wpływu na wynik.
 */
export function summarizeTrip({
  tripId,
  departureAt,
  returnAt,
  workEntries,
  expenses,
  payouts,
  display,
  rate,
  now,
}: {
  tripId: string;
  departureAt: string;
  returnAt: string | null;
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
  display: Currency;
  rate: number;
  now: number;
}) {
  const start = new Date(departureAt).getTime();
  const end = returnAt ? new Date(returnAt).getTime() : now;

  const workInTrip = workEntries.filter((e) => e.trip_id === tripId);
  const expensesInTrip = expenses.filter((e) => e.trip_id === tripId);
  const payoutsInTrip = payouts.filter((p) => p.trip_id === tripId);

  const { workedHours, accrued, totalPayouts, totalExpenses, profit, byCategory } = totalsOf({
    workEntries: workInTrip,
    expenses: expensesInTrip,
    payouts: payoutsInTrip,
    display,
    rate,
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
    accrued,
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
 * Rozliczenie „przewidywania kontra rzeczywistość" — trzy sekcje dashboardu.
 * `accrued` to zarobek policzony z godzin i stawek, `totalPayouts` to pieniądze,
 * które faktycznie wpłynęły.
 */
export function compareEarnings({
  accrued,
  totalPayouts,
  totalExpenses,
  workedHours,
  tripHours,
}: {
  accrued: number;
  totalPayouts: number;
  totalExpenses: number;
  workedHours: number;
  tripHours: number;
}) {
  const difference = accrued - totalPayouts;
  const profit = totalPayouts - totalExpenses;

  return {
    difference,
    /** Ile procent naliczonego zarobku zostało już wypłacone (0–100+). */
    coverage: accrued > 0 ? (totalPayouts / accrued) * 100 : 0,
    profit,
    expectedHourly: workedHours > 0 ? accrued / workedHours : 0,
    actualHourly: workedHours > 0 ? totalPayouts / workedHours : 0,
    hourlyLife: tripHours > 0 ? profit / tripHours : 0,
  };
}
