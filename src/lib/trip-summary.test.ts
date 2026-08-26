import { describe, expect, it } from "vitest";

import type { CurrentRates } from "./rates";
import { hourlyRates, splitDaysHours, summarizeTrip, totalsOf, tripLabel } from "./trip-summary";
import type { Expense, Payout, WorkEntry } from "./types";

const RATES: CurrentRates = { effectiveDate: "2026-08-25", rates: { EUR: 4.5, USD: 4 } };

const TRIP = "trip-1";
const INNA = "trip-2";

function godziny(over: Partial<WorkEntry> = {}): WorkEntry {
  return {
    id: crypto.randomUUID(),
    trip_id: TRIP,
    work_date: "2026-08-10",
    start_time: "08:00",
    end_time: "16:00",
    ...over,
  };
}

function koszt(over: Partial<Expense> = {}): Expense {
  return {
    id: crypto.randomUUID(),
    trip_id: TRIP,
    name: "Tankowanie",
    amount: 100,
    currency: "PLN",
    category: "Paliwo",
    spent_at: "2026-08-10T12:00:00.000Z",
    nbp_rate: 1,
    ...over,
  };
}

function wyplata(over: Partial<Payout> = {}): Payout {
  return {
    id: crypto.randomUUID(),
    trip_id: TRIP,
    amount: 1000,
    currency: "PLN",
    note: null,
    paid_at: "2026-08-12T12:00:00.000Z",
    nbp_rate: 1,
    ...over,
  };
}

/** Wywołanie z domyślnymi ramami podróży: 1–11 sierpnia, dziesięć dób. */
function podsumuj(args: {
  workEntries?: WorkEntry[];
  expenses?: Expense[];
  payouts?: Payout[];
  returnAt?: string | null;
  now?: number;
}) {
  return summarizeTrip({
    tripId: TRIP,
    departureAt: "2026-08-01T00:00:00.000Z",
    returnAt: args.returnAt === undefined ? "2026-08-11T00:00:00.000Z" : args.returnAt,
    workEntries: args.workEntries ?? [],
    expenses: args.expenses ?? [],
    payouts: args.payouts ?? [],
    display: "PLN",
    rates: RATES,
    now: args.now ?? Date.parse("2026-08-20T00:00:00.000Z"),
  });
}

describe("summarizeTrip — przynależność wpisów", () => {
  it("bierze wyłącznie wpisy z tym trip_id", () => {
    const summary = podsumuj({
      workEntries: [godziny(), godziny({ trip_id: INNA }), godziny({ trip_id: null })],
    });
    expect(summary.workInTrip).toHaveLength(1);
    expect(summary.workedHours).toBe(8);
  });

  it("liczy wpis z właściwym trip_id, nawet gdy jego data wypada poza podróżą", () => {
    // Daty służą wyłącznie do długości wyjazdu — o przynależności decyduje kolumna.
    const summary = podsumuj({ workEntries: [godziny({ work_date: "2026-12-24" })] });
    expect(summary.workedHours).toBe(8);
  });

  it("pomija wpis z cudzym trip_id, choć jego data mieści się w podróży", () => {
    const summary = podsumuj({
      workEntries: [godziny({ trip_id: INNA, work_date: "2026-08-05" })],
    });
    expect(summary.workedHours).toBe(0);
    expect(summary.isEmpty).toBe(true);
  });
});

describe("summarizeTrip — kwoty", () => {
  it("liczy zysk jako wypłaty minus koszty", () => {
    const summary = podsumuj({ expenses: [koszt()], payouts: [wyplata()] });
    expect(summary.totalPayouts).toBe(1000);
    expect(summary.totalExpenses).toBe(100);
    expect(summary.profit).toBe(900);
  });

  it("przelicza waluty po kursie zamrożonym przy wpisie", () => {
    const summary = podsumuj({
      payouts: [wyplata({ amount: 100, currency: "EUR", nbp_rate: 4.3 })],
    });
    expect(summary.totalPayouts).toBeCloseTo(430, 10);
  });

  it("sortuje transakcje od najnowszej", () => {
    const summary = podsumuj({
      expenses: [koszt({ spent_at: "2026-08-02T12:00:00.000Z", name: "Starszy" })],
      payouts: [wyplata({ paid_at: "2026-08-09T12:00:00.000Z" })],
    });
    expect(summary.transactions.map((t) => t.kind)).toEqual(["payout", "expense"]);
  });

  it("pomija kategorie o zerowej sumie", () => {
    const summary = podsumuj({
      expenses: [koszt({ category: "Paliwo", amount: 50 }), koszt({ category: "Inne", amount: 0 })],
    });
    expect(summary.byCategory.map((r) => r.category)).toEqual(["Paliwo"]);
  });
});

describe("summarizeTrip — czas trwania", () => {
  it("liczy zamkniętą podróż z dat, nie z zegara", () => {
    const summary = podsumuj({});
    expect(summary.tripDays).toBe(10);
    expect(summary.isOngoing).toBe(false);
  });

  it("podróż w toku mierzy do chwili obecnej", () => {
    const summary = podsumuj({
      returnAt: null,
      now: Date.parse("2026-08-04T00:00:00.000Z"),
    });
    expect(summary.isOngoing).toBe(true);
    expect(summary.tripDays).toBe(3);
  });
});

describe("hourlyRates", () => {
  it("liczy stawkę z tego, co wpłynęło", () => {
    const r = hourlyRates({
      totalPayouts: 1000,
      totalExpenses: 200,
      workedHours: 40,
      tripHours: 240,
    });
    expect(r.profit).toBe(800);
    expect(r.actualHourly).toBe(25);
    expect(r.hourlyLife).toBeCloseTo(800 / 240, 10);
  });

  it("nie dzieli przez zero, gdy nie ma jeszcze godzin", () => {
    const r = hourlyRates({ totalPayouts: 500, totalExpenses: 0, workedHours: 0, tripHours: 0 });
    expect(r.actualHourly).toBe(0);
    expect(r.hourlyLife).toBe(0);
  });
});

describe("drobiazgi", () => {
  it("splitDaysHours rozbija godziny na doby i resztę", () => {
    expect(splitDaysHours(50)).toEqual({ days: 2, hours: 2 });
    expect(splitDaysHours(-5)).toEqual({ days: 0, hours: 0 });
  });

  it("tripLabel oznacza podróż bez powrotu jako trwającą", () => {
    expect(tripLabel({ departure_at: "2026-08-01T00:00:00.000Z", return_at: null })).toContain(
      "w toku",
    );
  });

  it("totalsOf na pustym zestawie daje same zera", () => {
    const t = totalsOf({
      workEntries: [],
      expenses: [],
      payouts: [],
      display: "PLN",
      rates: RATES,
    });
    expect(t).toMatchObject({ workedHours: 0, totalPayouts: 0, totalExpenses: 0, profit: 0 });
    expect(t.byCategory).toEqual([]);
  });
});
