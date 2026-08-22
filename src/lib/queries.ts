// Odczyty z bazy używane przez server components.
//
// To, co w Supabase robiło RLS, robi tutaj filtr `user_id` — każde zapytanie
// jest zawężone do właściciela danych. Wyniki wychodzą już zserializowane:
// daty jako ISO, kwoty Decimal jako number.
import "server-only";

import { prisma } from "./db";
import { hoursBetween } from "./money";
import type { Expense, Payout, Trip, WorkEntry } from "./types";

/** Prisma zwraca NUMERIC jako Decimal; aplikacja liczy na zwykłych number. */
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
  rate: true,
  rate_currency: true,
} as const;

const expenseSelect = {
  id: true,
  trip_id: true,
  name: true,
  amount: true,
  currency: true,
  category: true,
  spent_at: true,
} as const;

const payoutSelect = {
  id: true,
  trip_id: true,
  amount: true,
  currency: true,
  note: true,
  paid_at: true,
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
  rate: { toString: () => string };
  rate_currency: string;
};

type ExpenseRow = {
  id: string;
  trip_id: string | null;
  name: string;
  amount: { toString: () => string };
  currency: string;
  category: string;
  spent_at: Date;
};

type PayoutRow = {
  id: string;
  trip_id: string | null;
  amount: { toString: () => string };
  currency: string;
  note: string | null;
  paid_at: Date;
};

function mapTrip(row: TripRow): Trip {
  return {
    ...row,
    departure_at: row.departure_at.toISOString(),
    return_at: row.return_at?.toISOString() ?? null,
  };
}

function mapWorkEntry(row: WorkEntryRow): WorkEntry {
  return {
    ...row,
    rate: toNumber(row.rate),
    rate_currency: row.rate_currency as WorkEntry["rate_currency"],
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    ...row,
    amount: toNumber(row.amount),
    currency: row.currency as Expense["currency"],
    spent_at: row.spent_at.toISOString(),
  };
}

function mapPayout(row: PayoutRow): Payout {
  return {
    ...row,
    amount: toNumber(row.amount),
    currency: row.currency as Payout["currency"],
    paid_at: row.paid_at.toISOString(),
  };
}

/* ----------------------------------------------------------- dane konta */

export async function getTrips(userId: string): Promise<Trip[]> {
  const rows = await prisma.trip.findMany({
    where: { user_id: userId },
    orderBy: { departure_at: "desc" },
    select: tripSelect,
  });
  return rows.map(mapTrip);
}

export async function getWorkEntries(userId: string): Promise<WorkEntry[]> {
  const rows = await prisma.workEntry.findMany({
    where: { user_id: userId },
    orderBy: [{ work_date: "desc" }, { start_time: "desc" }],
    select: workEntrySelect,
  });
  return rows.map(mapWorkEntry);
}

export async function getExpenses(userId: string): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: { user_id: userId },
    orderBy: { spent_at: "desc" },
    select: expenseSelect,
  });
  return rows.map(mapExpense);
}

export async function getPayouts(userId: string): Promise<Payout[]> {
  const rows = await prisma.payout.findMany({
    where: { user_id: userId },
    orderBy: { paid_at: "desc" },
    select: payoutSelect,
  });
  return rows.map(mapPayout);
}

export async function getTrip(userId: string, tripId: string): Promise<Trip | null> {
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
 * Publiczny odczyt udostępnionej podróży — bez logowania.
 * Null oznacza nieznany token albo wyłączone udostępnianie.
 */
export async function getSharedTrip(token: string): Promise<SharedTripPayload | null> {
  const trip = await prisma.trip.findFirst({
    where: { share_token: token, share_enabled: true },
    select: { id: true, user_id: true, departure_at: true, return_at: true },
  });
  if (!trip) return null;

  // Warunek user_id zostaje jako druga bariera: nawet gdyby wpis miał podstawione
  // cudze trip_id, nie pojawi się w cudzym podsumowaniu.
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

/** Klucz `YYYY-MM` — porównywalny wprost z tekstowym work_date. */
export function monthKeyOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------ pracownicy */

export type EmployeeCard = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  monthHours: number;
  onTrip: boolean;
  lastEntry: { work_date: string; start_time: string; end_time: string } | null;
};

export type JoinRequestRow = {
  user_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

export async function getCompanyEmployees(companyId: string): Promise<EmployeeCard[]> {
  const employees = await prisma.user.findMany({
    where: { company_id: companyId },
    orderBy: [{ first_name: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      first_name: true,
      last_name: true,
      work_entries: {
        orderBy: [{ work_date: "desc" }, { start_time: "desc" }],
        select: { work_date: true, start_time: true, end_time: true },
      },
      trips: { where: { return_at: null }, select: { id: true }, take: 1 },
    },
  });

  const month = monthKeyOf();

  return employees.map((employee) => ({
    id: employee.id,
    username: employee.username,
    first_name: employee.first_name,
    last_name: employee.last_name,
    monthHours: employee.work_entries
      .filter((entry) => entry.work_date.startsWith(month))
      .reduce((sum, entry) => sum + hoursBetween(entry.start_time, entry.end_time), 0),
    onTrip: employee.trips.length > 0,
    lastEntry: employee.work_entries[0] ?? null,
  }));
}

export async function getJoinRequests(companyId: string): Promise<JoinRequestRow[]> {
  const rows = await prisma.joinRequest.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: "asc" },
    select: {
      created_at: true,
      user: { select: { id: true, username: true, first_name: true, last_name: true } },
    },
  });

  return rows.map((row) => ({
    user_id: row.user.id,
    username: row.user.username,
    first_name: row.user.first_name,
    last_name: row.user.last_name,
    created_at: row.created_at.toISOString(),
  }));
}

/** Nazwy firm potrzebne w ustawieniach: własna, pracodawcy i tej z prośby. */
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

  return {
    employerName: employer?.name ?? null,
    ownCompanyName: ownCompany?.name ?? null,
    pendingCompanyName: request?.company.name ?? null,
  };
}
