// Bramki dostępu używane przez strony i akcje serwerowe.
import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionUser } from "./auth";
import { prisma } from "./db";
import { isUuid } from "./ids";
import { DASHBOARD_PATH, ROOT_PATH } from "./routes";
import type { SessionUser } from "./types";

/** Sesję czyta layout i strona w tym samym żądaniu — `cache` pyta bazę raz. */
export const getCurrentUser = cache(getSessionUser);

/**
 * Wymusza zalogowanie.
 *
 * Returns:
 *     Promise<SessionUser>: Zalogowane konto; brak sesji kończy się
 *     przekierowaniem na logowanie.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");
  return user;
}

/**
 * Wymusza konto administracyjne aplikacji.
 *
 * Zwykłe konto odsyłamy na jego własny pulpit zamiast pokazywać błąd — panel
 * roota nie ma prawa nawet potwierdzić, że istnieje.
 *
 * Returns:
 *     Promise<SessionUser>: Konto root; każde inne kończy przekierowaniem.
 */
export const requireRoot = cache(async (): Promise<SessionUser> => {
  const user = await requireUser();
  if (!user.is_root) redirect(DASHBOARD_PATH);
  return user;
});

/**
 * Wymusza zwykłe konto użytkownika aplikacji.
 *
 * Root nie ma godzin, kosztów ani firmy, więc ekrany aplikacji pokazałyby mu
 * same zera — jego miejscem jest panel administracyjny.
 *
 * Returns:
 *     Promise<SessionUser>: Zalogowane konto niebędące rootem.
 */
export async function requireAppUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.is_root) redirect(ROOT_PATH);
  return user;
}

/** Założyciel firmy albo dopisany współwłaściciel. */
export type CompanyRole = "founder" | "coowner";

export type OwnerContext = {
  user: SessionUser;
  company: { id: string; name: string };
  role: CompanyRole;
};

/**
 * Wymusza dostęp do firmy: jako założyciel albo jako współwłaściciel.
 *
 * Rola rozstrzyga o rzeczach nieodwracalnych — skasowanie firmy i zarządzanie
 * współwłaścicielami zostaje przy założycielu, reszta jest wspólna. Właściciel
 * bez firmy trafia do ustawień, żeby ją dokończyć.
 *
 * Returns:
 *     Promise<OwnerContext>: Konto, firma i rola w niej.
 */
export const requireOwner = cache(async (): Promise<OwnerContext> => {
  const user = await requireUser();
  if (!user.is_owner) redirect(DASHBOARD_PATH);

  const founded = await prisma.company.findUnique({
    where: { owner_id: user.id },
    select: { id: true, name: true },
  });
  if (founded) return { user, company: founded, role: "founder" };

  const coOwned = await prisma.companyCoOwner.findFirst({
    where: { user_id: user.id },
    select: { company: { select: { id: true, name: true } } },
  });
  if (coOwned) return { user, company: coOwned.company, role: "coowner" };

  redirect("/ustawienia");
});

/**
 * Wymusza rolę założyciela — operacje nieodwracalne zostają przy nim.
 *
 * Returns:
 *     Promise<OwnerContext>: Kontekst firmy; współwłaściciel jest odsyłany
 *     na ekran firmy.
 */
export const requireFounder = cache(async (): Promise<OwnerContext> => {
  const context = await requireOwner();
  if (context.role !== "founder") redirect("/firma");
  return context;
});

/**
 * Szuka pracownika należącego do firmy zalogowanego właściciela.
 *
 * Null oznacza „nie ma takiego pracownika ALBO nie jest twój" — celowo nie
 * rozróżniamy tych przypadków, żeby nie potwierdzać istnienia cudzych kont.
 *
 * Args:
 *     employeeId (string): Identyfikator pracownika z adresu albo formularza.
 *
 * Returns:
 *     Promise<{ id: string; email: string; name: string } | null>: Dane
 *     pracownika albo null.
 */
export async function findMyEmployee(employeeId: string) {
  const { company } = await requireOwner();
  if (!isUuid(employeeId)) return null;

  return prisma.user.findFirst({
    where: { id: employeeId, company_id: company.id },
    select: { id: true, email: true, name: true },
  });
}
