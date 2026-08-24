// Bramki dostępu używane przez strony i akcje serwerowe.
import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionUser } from "./auth";
import { prisma } from "./db";
import type { SessionUser } from "./types";

/**
 * Sesję czyta i layout, i strona w tym samym żądaniu — `cache` sprawia, że
 * zapytanie do bazy leci raz.
 */
export const getCurrentUser = cache(getSessionUser);

/** Wymusza zalogowanie — przekierowuje na logowanie. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie");
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
 * `role` decyduje o rzeczach nieodwracalnych — skasowanie firmy i zarządzanie
 * współwłaścicielami zostaje przy założycielu. Reszta (pracownicy, raporty)
 * jest wspólna.
 */
export const requireOwner = cache(async (): Promise<OwnerContext> => {
  const user = await requireUser();
  if (!user.is_owner) redirect("/");

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

  // Tryb właściciela bez firmy — dokończ w ustawieniach.
  redirect("/ustawienia");
});

/** Nieodwracalne operacje na firmie zostają przy założycielu. */
export const requireFounder = cache(async (): Promise<OwnerContext> => {
  const context = await requireOwner();
  if (context.role !== "founder") redirect("/firma");
  return context;
});

/**
 * Pracownik należący do firmy zalogowanego właściciela.
 * Null oznacza „nie ma takiego pracownika ALBO nie jest twój" — celowo nie
 * rozróżniamy tych przypadków, żeby nie potwierdzać istnienia cudzych kont.
 */
export async function findMyEmployee(employeeId: string) {
  const { company } = await requireOwner();
  return prisma.user.findFirst({
    where: { id: employeeId, company_id: company.id },
    select: { id: true, email: true, name: true },
  });
}
