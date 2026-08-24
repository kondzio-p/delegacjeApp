"use server";

// Prawa użytkownika do własnych danych: eksport i usunięcie konta.
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endAllSessions, endSession, hashSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DELETE_CONFIRMATION } from "@/lib/privacy";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/lib/types";

export type ExportState = ActionState & { json?: string };

/**
 * Komplet danych użytkownika w jednym pliku.
 *
 * JSON, bo RODO (art. 20) mówi o formacie ustrukturyzowanym i nadającym się
 * do odczytu maszynowego. Zwracamy tekst, a plik składa już przeglądarka.
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
 * Usunięcie konta przez anonimizację.
 *
 * Dane osobowe znikają, ale **godziny i wypłaty zostają** — to zapis rozliczenia
 * z firmą, dzięki czemu raport za miniony okres dalej się zgadza po odejściu
 * pracownika. Koszty kasujemy, bo są prywatne i nikomu poza właścicielem konta
 * niepotrzebne.
 */
export async function deleteMyAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== DELETE_CONFIRMATION) {
    return { error: `Przepisz słowo ${DELETE_CONFIRMATION}, żeby potwierdzić` };
  }

  // Założyciel firmy: przekazujemy ją najstarszemu współwłaścicielowi,
  // a gdy takiego nie ma — firma znika, a pracownicy tracą tylko powiązanie.
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
  // Hasło i kod zastępujemy losowymi śmieciami — nikt się nimi nie zaloguje,
  // a flaga is_deleted i tak blokuje wejście.
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
