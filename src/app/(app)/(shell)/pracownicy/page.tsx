import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { monthLabel } from "@/lib/day";
import type { Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/locale.server";
import { getCompanyEmployees, getJoinRequests, monthKeyOf } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

import { EmployeesScreen } from "./employees-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.employees", "meta.employees");
}

/**
 * Składa listę ostatnich miesięcy do wyboru na ekranie zespołu.
 *
 * Nazwy powstają na serwerze, więc język trzeba podać wprost — `useT()` tu
 * nie sięga.
 *
 * Args:
 *     locale (Locale): Język nazw miesięcy.
 *     count (number): Ile miesięcy wstecz pokazać.
 *
 * Returns:
 *     { key: string; label: string }[]: Klucze „YYYY-MM" i nazwy do pokazania.
 */
function recentMonths(locale: Locale, count = 12): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyOf(date);
    return { key, label: monthLabel(key, locale) };
  });
}

/**
 * Ekran zespołu z wyborem miesiąca.
 *
 * Args:
 *     searchParams (Promise<{ miesiac?: string }>): Wybrany miesiąc z adresu.
 *
 * Returns:
 *     Promise<ReactNode>: Ekran zespołu.
 */
export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ miesiac?: string }>;
}) {
  const { miesiac } = await searchParams;
  const { company } = await requireOwner();

  // Nieznana albo podrobiona wartość cofa się do bieżącego miesiąca.
  const months = recentMonths(await getLocale());
  const month = months.some((m) => m.key === miesiac) ? miesiac! : monthKeyOf();

  const [employees, requests] = await Promise.all([
    getCompanyEmployees(company.id, month),
    getJoinRequests(company.id),
  ]);

  return (
    <EmployeesScreen
      companyName={company.name}
      employees={employees}
      requests={requests}
      month={month}
      months={months}
    />
  );
}
