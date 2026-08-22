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

export type OwnerContext = {
  user: SessionUser;
  company: { id: string; name: string };
};

/** Wymusza rolę właściciela firmy z zapisaną firmą. */
export const requireOwner = cache(async (): Promise<OwnerContext> => {
  const user = await requireUser();
  if (!user.is_owner) redirect("/");

  const company = await prisma.company.findUnique({
    where: { owner_id: user.id },
    select: { id: true, name: true },
  });
  // Tryb właściciela bez zapisanej nazwy firmy — dokończ w ustawieniach.
  if (!company) redirect("/ustawienia");

  return { user, company };
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
    select: { id: true, username: true, first_name: true, last_name: true },
  });
}
