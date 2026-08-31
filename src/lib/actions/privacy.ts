"use server";

// Prawa użytkownika do własnych danych: eksport i usunięcie konta.
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endAllSessions, endSession, hashSecret } from "@/lib/auth";
import { csvAmount, toCsv } from "@/lib/csv";
import { momentToDay } from "@/lib/day";
import { prisma } from "@/lib/db";
import { hoursBetween } from "@/lib/money";
import { tripLabel } from "@/lib/trip-summary";
import { DELETE_CONFIRMATION } from "@/lib/privacy";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export type ExportState = ActionState & { json?: string };
export type CsvExportState = ActionState & { hours?: string; transactions?: string };

/**
 * Składa komplet danych użytkownika w jeden plik.
 *
 * JSON, bo RODO (art. 20) mówi o formacie ustrukturyzowanym i nadającym się
 * do odczytu maszynowego. Zwracamy sam tekst, a plik składa już przeglądarka.
 *
 * Returns:
 *     Promise<ExportState>: Zawartość pliku JSON albo komunikat błędu.
 */
export async function exportMyDataAction(): Promise<ExportState> {
  const user = await requireUser();

  const [account, trips, workEntries, expenses, payouts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        is_owner: true,
        expense_categories: true,
        display_currency: true,
        locale: true,
        created_at: true,
        company: { select: { name: true } },
      },
    }),
    prisma.trip.findMany({
      where: { user_id: user.id },
      orderBy: { departure_at: "asc" },
      select: { departure_at: true, return_at: true, note: true },
    }),
    prisma.workEntry.findMany({
      where: { user_id: user.id },
      orderBy: [{ work_date: "asc" }, { start_time: "asc" }],
      select: { work_date: true, start_time: true, end_time: true },
    }),
    prisma.expense.findMany({
      where: { user_id: user.id },
      orderBy: { spent_at: "asc" },
      select: { name: true, amount: true, currency: true, category: true, spent_at: true },
    }),
    prisma.payout.findMany({
      where: { user_id: user.id },
      orderBy: { paid_at: "asc" },
      select: { amount: true, currency: true, note: true, paid_at: true },
    }),
  ]);

  const json = JSON.stringify(
    {
      wyeksportowano: new Date().toISOString(),
      konto: {
        email: account.email,
        imie: account.name,
        wlasciciel_firmy: account.is_owner,
        firma: account.company?.name ?? null,
        kategorie_kosztow: account.expense_categories,
        waluta_wyswietlania: account.display_currency,
        jezyk: account.locale,
        zalozone: account.created_at,
      },
      podroze: trips,
      godziny_pracy: workEntries,
      koszty: expenses.map((e) => ({ ...e, amount: e.amount.toString() })),
      wyplaty: payouts.map((p) => ({ ...p, amount: p.amount.toString() })),
    },
    null,
    2,
  );

  return { json };
}

/**
 * Składa te same dane w postaci do otwarcia w arkuszu.
 *
 * Dwa osobne pliki zamiast jednego: godziny i pieniądze mają inne kolumny,
 * a sklejone w jeden arkusz nie nadają się do sumowania.
 *
 * Returns:
 *     Promise<CsvExportState>: Dwa arkusze CSV albo komunikat błędu.
 */
export async function exportMyDataCsvAction(): Promise<CsvExportState> {
  const user = await requireUser();

  const [trips, workEntries, expenses, payouts] = await Promise.all([
    prisma.trip.findMany({
      where: { user_id: user.id },
      select: { id: true, departure_at: true, return_at: true },
    }),
    prisma.workEntry.findMany({
      where: { user_id: user.id },
      orderBy: [{ work_date: "asc" }, { start_time: "asc" }],
      select: { work_date: true, start_time: true, end_time: true, trip_id: true },
    }),
    prisma.expense.findMany({
      where: { user_id: user.id },
      orderBy: { spent_at: "asc" },
      select: {
        name: true,
        amount: true,
        currency: true,
        category: true,
        spent_at: true,
        nbp_rate: true,
        nbp_rate_date: true,
        trip_id: true,
      },
    }),
    prisma.payout.findMany({
      where: { user_id: user.id },
      orderBy: { paid_at: "asc" },
      select: {
        amount: true,
        currency: true,
        note: true,
        paid_at: true,
        nbp_rate: true,
        nbp_rate_date: true,
        trip_id: true,
      },
    }),
  ]);

  const tripNames = new Map(
    trips.map((trip) => [
      trip.id,
      tripLabel({
        departure_at: trip.departure_at.toISOString(),
        return_at: trip.return_at?.toISOString() ?? null,
      }),
    ]),
  );
  const tripName = (id: string | null) => (id ? (tripNames.get(id) ?? "") : "");

  const hours = toCsv(workEntries, [
    { header: "Data", value: (row) => row.work_date },
    { header: "Od", value: (row) => row.start_time },
    { header: "Do", value: (row) => row.end_time },
    {
      header: "Godziny",
      value: (row) => csvAmount(hoursBetween(row.start_time, row.end_time)),
    },
    { header: "Wyjazd", value: (row) => tripName(row.trip_id) },
  ]);

  // Koszty i wypłaty w jednym arkuszu — znak przy kwocie mówi, w którą stronę
  // poszły pieniądze.
  type Transakcja = {
    typ: string;
    dzien: string;
    nazwa: string;
    kategoria: string;
    kwota: number;
    waluta: string;
    kurs: string;
    kursData: string;
    trip: string | null;
  };

  const transakcje: Transakcja[] = [
    ...expenses.map((row) => ({
      typ: "Koszt",
      dzien: momentToDay(row.spent_at),
      nazwa: row.name,
      kategoria: row.category,
      kwota: -Number(row.amount),
      waluta: row.currency,
      kurs: row.nbp_rate === null ? "" : csvAmount(Number(row.nbp_rate)),
      kursData: row.nbp_rate_date ?? "",
      trip: row.trip_id,
    })),
    ...payouts.map((row) => ({
      typ: "Wypłata",
      dzien: momentToDay(row.paid_at),
      nazwa: row.note?.trim() || "Wypłata",
      kategoria: "",
      kwota: Number(row.amount),
      waluta: row.currency,
      kurs: row.nbp_rate === null ? "" : csvAmount(Number(row.nbp_rate)),
      kursData: row.nbp_rate_date ?? "",
      trip: row.trip_id,
    })),
  ].sort((a, b) => a.dzien.localeCompare(b.dzien));

  const transactions = toCsv(transakcje, [
    { header: "Typ", value: (row) => row.typ },
    { header: "Data", value: (row) => row.dzien },
    { header: "Nazwa", value: (row) => row.nazwa },
    { header: "Kategoria", value: (row) => row.kategoria },
    { header: "Kwota", value: (row) => csvAmount(row.kwota) },
    { header: "Waluta", value: (row) => row.waluta },
    { header: "Kurs NBP", value: (row) => row.kurs },
    { header: "Data kursu", value: (row) => row.kursData },
    { header: "Wyjazd", value: (row) => tripName(row.trip) },
  ]);

  return { hours, transactions };
}

/**
 * Usuwa konto przez anonimizację.
 *
 * Dane osobowe znikają, ale godziny i wypłaty zostają — to zapis rozliczenia
 * z firmą, dzięki czemu raport za miniony okres zgadza się po odejściu
 * pracownika. Koszty kasujemy, bo są prywatne. Firmę założyciela przejmuje
 * najstarszy współwłaściciel, a gdy takiego nie ma — firma znika.
 *
 * Args:
 *     _prev (ActionState): Poprzedni stan formularza, nieużywany.
 *     formData (FormData): Pole „confirm" z przepisanym słowem potwierdzenia.
 *
 * Returns:
 *     Promise<ActionState>: Komunikat błędu; usunięcie kończy się
 *     przekierowaniem na ekran logowania.
 */
export async function deleteMyAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return { error: `Przepisz słowo ${DELETE_CONFIRMATION}, żeby potwierdzić` };
  }

  const ownCompany = await prisma.company.findUnique({
    where: { owner_id: user.id },
    select: { id: true },
  });

  if (ownCompany) {
    const successor = await prisma.companyCoOwner.findFirst({
      where: { company_id: ownCompany.id },
      orderBy: { created_at: "asc" },
      select: { user_id: true },
    });

    if (successor) {
      await prisma.$transaction([
        prisma.company.update({
          where: { id: ownCompany.id },
          data: { owner_id: successor.user_id },
        }),
        prisma.companyCoOwner.deleteMany({
          where: { company_id: ownCompany.id, user_id: successor.user_id },
        }),
      ]);
    } else {
      await prisma.company.delete({ where: { id: ownCompany.id } });
    }
  }

  const anonymousEmail = `usuniete-${randomUUID()}@usuniete.local`;
  // Hasło i kod zastępujemy losowymi śmieciami; wejście blokuje i tak is_deleted.
  const [passwordHash, recoveryHash] = await Promise.all([
    hashSecret(randomUUID()),
    hashSecret(randomUUID()),
  ]);

  await prisma.$transaction([
    prisma.expense.deleteMany({ where: { user_id: user.id } }),
    prisma.joinRequest.deleteMany({ where: { user_id: user.id } }),
    prisma.coOwnerInvite.deleteMany({ where: { user_id: user.id } }),
    prisma.companyCoOwner.deleteMany({ where: { user_id: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        email: anonymousEmail,
        name: "Usunięty pracownik",
        password_hash: passwordHash,
        recovery_code_hash: recoveryHash,
        is_owner: false,
        is_deleted: true,
        must_change_password: false,
      },
    }),
  ]);

  await endAllSessions(user.id);
  await endSession();

  revalidatePath("/", "layout");
  redirect("/logowanie");
}
