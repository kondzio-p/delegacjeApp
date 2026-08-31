// Odczyty z bazy dla server components — każdy zawężony do właściciela danych.
import "server-only";

import { prisma } from "./db";
import { isUuid } from "./ids";
import { hoursBetween, type Currency } from "./money";
import type { CurrentRates } from "./rates";
import type { Expense, Payout, Trip, WorkEntry } from "./types";

/**
 * Zamienia Decimal z Prismy na zwykłą liczbę.
 *
 * Args:
 *     value ({ toString: () => string }): Wartość NUMERIC z bazy.
 *
 * Returns:
 *     number: Ta sama kwota jako liczba JavaScriptu.
 */
function toNumber(value: { toString: () => string }): number {
  return Number(value.toString());
}

const tripSelect = {
  id: true,
  departure_at: true,
  return_at: true,
  note: true,
  share_token: true,
  share_enabled: true,
} as const;

const workEntrySelect = {
  id: true,
  trip_id: true,
  work_date: true,
  start_time: true,
  end_time: true,
} as const;

const expenseSelect = {
  id: true,
  trip_id: true,
  name: true,
  amount: true,
  currency: true,
  category: true,
  spent_at: true,
  nbp_rate: true,
} as const;

const payoutSelect = {
  id: true,
  trip_id: true,
  amount: true,
  currency: true,
  note: true,
  paid_at: true,
  nbp_rate: true,
} as const;

type TripRow = {
  id: string;
  departure_at: Date;
  return_at: Date | null;
  note: string | null;
  share_token: string;
  share_enabled: boolean;
};

type WorkEntryRow = {
  id: string;
  trip_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
};

type ExpenseRow = {
  id: string;
  trip_id: string | null;
  name: string;
  amount: { toString: () => string };
  currency: string;
  category: string;
  spent_at: Date;
  nbp_rate: { toString: () => string } | null;
};

type PayoutRow = {
  id: string;
  trip_id: string | null;
  amount: { toString: () => string };
  currency: string;
  note: string | null;
  paid_at: Date;
  nbp_rate: { toString: () => string } | null;
};

function mapTrip(row: TripRow): Trip {
  return {
    ...row,
    departure_at: row.departure_at.toISOString(),
    return_at: row.return_at?.toISOString() ?? null,
  };
}

/** Wiersz godzin nie ma nic do przemapowania — same stringi. */
function mapWorkEntry(row: WorkEntryRow): WorkEntry {
  return { ...row };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    ...row,
    amount: toNumber(row.amount),
    currency: row.currency as Expense["currency"],
    spent_at: row.spent_at.toISOString(),
    nbp_rate: row.nbp_rate === null ? null : toNumber(row.nbp_rate),
  };
}

function mapPayout(row: PayoutRow): Payout {
  return {
    ...row,
    amount: toNumber(row.amount),
    currency: row.currency as Payout["currency"],
    paid_at: row.paid_at.toISOString(),
    nbp_rate: row.nbp_rate === null ? null : toNumber(row.nbp_rate),
  };
}

/* ----------------------------------------------------------- dane konta */

/**
 * Zwraca podróże konta, od najnowszej.
 *
 * Args:
 *     userId (string): Właściciel danych.
 *
 * Returns:
 *     Promise<Trip[]>: Podróże posortowane malejąco po dacie wyjazdu.
 */
export async function getTrips(userId: string): Promise<Trip[]> {
  const rows = await prisma.trip.findMany({
    where: { user_id: userId },
    orderBy: { departure_at: "desc" },
    select: tripSelect,
  });
  return rows.map(mapTrip);
}

/**
 * Zwraca wpisy godzin konta, od najnowszego.
 *
 * Args:
 *     userId (string): Właściciel danych.
 *
 * Returns:
 *     Promise<WorkEntry[]>: Wpisy posortowane malejąco po dniu i godzinie.
 */
export async function getWorkEntries(userId: string): Promise<WorkEntry[]> {
  const rows = await prisma.workEntry.findMany({
    where: { user_id: userId },
    orderBy: [{ work_date: "desc" }, { start_time: "desc" }],
    select: workEntrySelect,
  });
  return rows.map(mapWorkEntry);
}

/**
 * Zwraca koszty konta, od najnowszego.
 *
 * Args:
 *     userId (string): Właściciel danych.
 *
 * Returns:
 *     Promise<Expense[]>: Koszty posortowane malejąco po dniu wydatku.
 */
export async function getExpenses(userId: string): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: { user_id: userId },
    orderBy: { spent_at: "desc" },
    select: expenseSelect,
  });
  return rows.map(mapExpense);
}

/**
 * Zwraca wypłaty konta, od najnowszej.
 *
 * Args:
 *     userId (string): Właściciel danych.
 *
 * Returns:
 *     Promise<Payout[]>: Wypłaty posortowane malejąco po dniu wypłaty.
 */
export async function getPayouts(userId: string): Promise<Payout[]> {
  const rows = await prisma.payout.findMany({
    where: { user_id: userId },
    orderBy: { paid_at: "desc" },
    select: payoutSelect,
  });
  return rows.map(mapPayout);
}

/**
 * Zwraca jedną podróż konta.
 *
 * Args:
 *     userId (string): Właściciel danych.
 *     tripId (string): Identyfikator podróży ze ścieżki adresu.
 *
 * Returns:
 *     Promise<Trip | null>: Podróż albo null, gdy nie istnieje lub jest cudza.
 */
export async function getTrip(userId: string, tripId: string): Promise<Trip | null> {
  // Identyfikator przychodzi ze ścieżki; kolumna jest typu uuid, więc tekst
  // o innym kształcie kończyłby się błędem bazy zamiast zwykłym 404.
  if (!isUuid(tripId)) return null;

  const row = await prisma.trip.findFirst({
    where: { id: tripId, user_id: userId },
    select: tripSelect,
  });
  return row ? mapTrip(row) : null;
}

/* -------------------------------------------------------- link publiczny */

export type SharedTripPayload = {
  trip: { id: string; departure_at: string; return_at: string | null };
  work_entries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
};

/**
 * Odczytuje udostępnioną podróż bez logowania.
 *
 * Warunek `user_id` przy wpisach zostaje jako druga bariera: nawet gdyby wpis
 * miał podstawione cudze `trip_id`, nie pojawi się w cudzym podsumowaniu.
 *
 * Args:
 *     token (string): Token udostępnienia z adresu.
 *
 * Returns:
 *     Promise<SharedTripPayload | null>: Dane podróży albo null przy nieznanym
 *     tokenie i wyłączonym udostępnianiu.
 */
export async function getSharedTrip(token: string): Promise<SharedTripPayload | null> {
  if (!isUuid(token)) return null;

  const trip = await prisma.trip.findFirst({
    where: { share_token: token, share_enabled: true },
    select: { id: true, user_id: true, departure_at: true, return_at: true },
  });
  if (!trip) return null;

  const scope = { user_id: trip.user_id, trip_id: trip.id };

  const [workEntries, expenses, payouts] = await Promise.all([
    prisma.workEntry.findMany({
      where: scope,
      orderBy: [{ work_date: "asc" }, { start_time: "asc" }],
      select: workEntrySelect,
    }),
    prisma.expense.findMany({ where: scope, orderBy: { spent_at: "desc" }, select: expenseSelect }),
    prisma.payout.findMany({ where: scope, orderBy: { paid_at: "desc" }, select: payoutSelect }),
  ]);

  return {
    trip: {
      id: trip.id,
      departure_at: trip.departure_at.toISOString(),
      return_at: trip.return_at?.toISOString() ?? null,
    },
    work_entries: workEntries.map(mapWorkEntry),
    expenses: expenses.map(mapExpense),
    payouts: payouts.map(mapPayout),
  };
}

/* -------------------------------------------------------------- miesiące */

/**
 * Klucz miesiąca porównywalny wprost z tekstowym `work_date`.
 *
 * Args:
 *     date (Date): Dzień, z którego bierzemy miesiąc.
 *
 * Returns:
 *     string: Miesiąc w postaci „YYYY-MM".
 */
export function monthKeyOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Granice miesiąca jako teksty „YYYY-MM-DD".
 *
 * `work_date` jest kolumną tekstową w tym samym formacie, więc porównanie
 * leksykograficzne działa jak datowe i filtr wykonuje się w bazie.
 *
 * Args:
 *     monthKey (string): Miesiąc w postaci „YYYY-MM".
 *
 * Returns:
 *     { from: string; to: string }: Początek miesiąca i początek następnego.
 */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const y = year ?? 1970;
  const m = month ?? 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return { from: `${y}-${pad(m)}-01`, to: `${nextY}-${pad(nextM)}-01` };
}


/* ------------------------------------------------------ raport dla firmy */

export type PayrollRow = {
  id: string;
  name: string;
  /** Przepracowane godziny w zakresie. */
  hours: number;
  /** Wypłacono w zakresie, przeliczone na PLN po kursach z dni wypłat. */
  paidPln: number;
  isDeleted: boolean;
};

/**
 * Składa zestawienie firmy: ile kto przepracował i ile dostał.
 *
 * Kwoty idą w PLN po kursach zamrożonych przy wypłatach, więc raport za marzec
 * wygląda tak samo niezależnie od tego, kiedy się go wygeneruje. Zakres dat
 * jest domknięty od lewej i otwarty od prawej.
 *
 * Args:
 *     companyId (string): Firma, której dotyczy raport.
 *     from (string): Pierwszy dzień zakresu.
 *     to (string): Dzień kończący zakres, już do niego nienależący.
 *     fallback (CurrentRates | null): Bieżąca tabela NBP dla wypłat bez
 *         własnego kursu.
 *
 * Returns:
 *     Promise<PayrollRow[]>: Wiersz na pracownika, posortowany po imieniu.
 */
export async function getCompanyPayrollReport(
  companyId: string,
  from: string,
  to: string,
  fallback: CurrentRates | null,
): Promise<PayrollRow[]> {
  const employees = await prisma.user.findMany({
    where: { company_id: companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, is_deleted: true },
  });
  if (employees.length === 0) return [];

  const ids = employees.map((e) => e.id);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  const [entries, payouts] = await Promise.all([
    prisma.workEntry.findMany({
      where: { user_id: { in: ids }, work_date: { gte: from, lt: to } },
      select: { user_id: true, start_time: true, end_time: true },
    }),
    prisma.payout.findMany({
      where: {
        user_id: { in: ids },
        paid_at: { gte: new Date(`${from}T00:00:00.000Z`), lt: toDate },
      },
      select: { user_id: true, amount: true, currency: true, nbp_rate: true },
    }),
  ]);

  const hoursBy = new Map<string, number>();
  for (const entry of entries) {
    hoursBy.set(
      entry.user_id,
      (hoursBy.get(entry.user_id) ?? 0) + hoursBetween(entry.start_time, entry.end_time),
    );
  }

  const paidBy = new Map<string, number>();
  for (const payout of payouts) {
    const currency = payout.currency as Currency;
    const amount = toNumber(payout.amount);
    const rate =
      currency === "PLN"
        ? 1
        : (payout.nbp_rate === null ? null : toNumber(payout.nbp_rate)) ??
          fallback?.rates[currency] ??
          null;
    // Bez żadnego kursu nie zgadujemy — kwota nie wchodzi do sumy w PLN.
    if (rate === null) continue;
    paidBy.set(payout.user_id, (paidBy.get(payout.user_id) ?? 0) + amount * rate);
  }

  return employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    hours: hoursBy.get(employee.id) ?? 0,
    paidPln: paidBy.get(employee.id) ?? 0,
    isDeleted: employee.is_deleted,
  }));
}

/**
 * Zwraca wypłaty pracownika widoczne dla właściciela.
 *
 * Właściciel widzi wypłaty, bo sam je wydał. Kosztów pracownika nie widzi —
 * to jego prywatne wydatki i nie ma dla nich odpowiednika tej funkcji.
 *
 * Args:
 *     companyId (string): Firma pytającego właściciela.
 *     employeeId (string): Pracownik, o którego chodzi.
 *
 * Returns:
 *     Promise<Payout[]>: Wypłaty od najnowszej; pusta lista, gdy to nie jest
 *     pracownik tej firmy.
 */
export async function getEmployeePayouts(
  companyId: string,
  employeeId: string,
): Promise<Payout[]> {
  if (!isUuid(employeeId)) return [];

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, company_id: companyId },
    select: { id: true },
  });
  if (!employee) return [];

  const rows = await prisma.payout.findMany({
    where: { user_id: employee.id },
    orderBy: { paid_at: "desc" },
    select: payoutSelect,
  });
  return rows.map(mapPayout);
}

/* ------------------------------------------------------------ pracownicy */

export type EmployeeCard = {
  id: string;
  email: string;
  name: string;
  monthHours: number;
  onTrip: boolean;
  lastEntry: { work_date: string; start_time: string; end_time: string } | null;
};

export type JoinRequestRow = {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
};

/**
 * Zwraca karty pracowników z godzinami za wskazany miesiąc.
 *
 * Godziny filtrujemy w zapytaniu, a nie po pobraniu wszystkiego — pracownik
 * z rocznym stażem ma setki wpisów, a na tym ekranie liczy się jeden miesiąc.
 * Ostatni wpis dociągamy osobno, bo jedna relacja nie może być w jednym
 * `select` użyta dwa razy z różnymi filtrami.
 *
 * Args:
 *     companyId (string): Firma, której pracowników pokazujemy.
 *     monthKey (string): Miesiąc „YYYY-MM" liczony do sumy godzin.
 *
 * Returns:
 *     Promise<EmployeeCard[]>: Karty posortowane po imieniu.
 */
export async function getCompanyEmployees(
  companyId: string,
  monthKey: string = monthKeyOf(),
): Promise<EmployeeCard[]> {
  const { from, to } = monthRange(monthKey);

  const employees = await prisma.user.findMany({
    where: { company_id: companyId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      work_entries: {
        where: { work_date: { gte: from, lt: to } },
        select: { start_time: true, end_time: true },
      },
      trips: { where: { return_at: null }, select: { id: true }, take: 1 },
    },
  });

  if (employees.length === 0) return [];

  // DISTINCT ON user_id przy sortowaniu malejąco = najnowszy wpis każdej osoby.
  const latest = await prisma.workEntry.findMany({
    where: { user_id: { in: employees.map((e) => e.id) } },
    orderBy: [{ work_date: "desc" }, { start_time: "desc" }],
    distinct: ["user_id"],
    select: { user_id: true, work_date: true, start_time: true, end_time: true },
  });
  const lastByUser = new Map(
    latest.map(({ user_id, ...entry }) => [user_id, entry] as const),
  );

  return employees.map((employee) => ({
    id: employee.id,
    email: employee.email,
    name: employee.name,
    monthHours: employee.work_entries.reduce(
      (sum, entry) => sum + hoursBetween(entry.start_time, entry.end_time),
      0,
    ),
    onTrip: employee.trips.length > 0,
    lastEntry: lastByUser.get(employee.id) ?? null,
  }));
}

/**
 * Zwraca prośby o dołączenie czekające na decyzję właściciela.
 *
 * Args:
 *     companyId (string): Firma, do której złożono prośby.
 *
 * Returns:
 *     Promise<JoinRequestRow[]>: Prośby od najstarszej.
 */
export async function getJoinRequests(companyId: string): Promise<JoinRequestRow[]> {
  const rows = await prisma.joinRequest.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: "asc" },
    select: {
      created_at: true,
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return rows.map((row) => ({
    user_id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    created_at: row.created_at.toISOString(),
  }));
}

/**
 * Zbiera stan przynależności konta do firm.
 *
 * Ekran ustawień pokazuje w jednym miejscu firmę własną, firmę pracodawcy,
 * wysłaną prośbę o dołączenie, współwłasność i czekające zaproszenie.
 *
 * Args:
 *     user ({ id: string; company_id: string | null; is_owner: boolean }):
 *         Zalogowane konto.
 *
 * Returns:
 *     Promise<object>: Nazwy firm i lista współwłaścicieli do wyświetlenia.
 */
export async function getCompanyStatus(user: {
  id: string;
  company_id: string | null;
  is_owner: boolean;
}) {
  const [employer, ownCompany, request] = await Promise.all([
    user.company_id
      ? prisma.company.findUnique({ where: { id: user.company_id }, select: { name: true } })
      : null,
    user.is_owner
      ? prisma.company.findUnique({ where: { owner_id: user.id }, select: { name: true } })
      : null,
    prisma.joinRequest.findUnique({
      where: { user_id: user.id },
      select: { company: { select: { name: true } } },
    }),
  ]);

  const [coOwners, invite, myCoOwnership] = await Promise.all([
    ownCompany
      ? prisma.companyCoOwner.findMany({
          where: { company: { owner_id: user.id } },
          orderBy: { created_at: "asc" },
          select: { user: { select: { id: true, name: true, email: true } } },
        })
      : [],
    prisma.coOwnerInvite.findFirst({
      where: { user_id: user.id },
      select: { company: { select: { name: true } } },
    }),
    prisma.companyCoOwner.findFirst({
      where: { user_id: user.id },
      select: { company: { select: { name: true } } },
    }),
  ]);

  return {
    employerName: employer?.name ?? null,
    ownCompanyName: ownCompany?.name ?? null,
    pendingCompanyName: request?.company.name ?? null,
    coOwners: coOwners.map((row) => row.user),
    inviteCompanyName: invite?.company.name ?? null,
    coOwnedCompanyName: myCoOwnership?.company.name ?? null,
  };
}
