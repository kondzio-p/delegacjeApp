import type { Metadata } from "next";

import { getCompanyEmployees, getJoinRequests, monthKeyOf, monthLabel } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

import { EmployeesScreen } from "./employees-screen";

export const metadata: Metadata = {
  title: "Pracownicy",
  description: "Godziny pracy zespołu i prośby o dołączenie do firmy.",
};

/** Ostatnie 12 miesięcy wstecz — tyle wystarczy do przejrzenia zespołu. */
function recentMonths(count = 12): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKeyOf(date);
    return { key, label: monthLabel(key) };
  });
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ miesiac?: string }>;
}) {
  const { miesiac } = await searchParams;
  const { company } = await requireOwner();

  // Nieznana albo podrobiona wartość cofa się do bieżącego miesiąca.
  const months = recentMonths();
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
