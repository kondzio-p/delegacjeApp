import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { getExpenses, getPayouts, getTrips } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { FinanceScreen } from "./finance-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.finance", "meta.finance");
}

/**
 * Ekran finansów: koszty i wypłaty.
 *
 * Returns:
 *     Promise<ReactNode>: Zawartość ekranu.
 */
export default async function FinancePage() {
  const user = await requireUser();
  const [trips, expenses, payouts] = await Promise.all([
    getTrips(user.id),
    getExpenses(user.id),
    getPayouts(user.id),
  ]);

  return (
    <FinanceScreen
      trips={trips}
      expenses={expenses}
      payouts={payouts}
      categories={user.expense_categories}
    />
  );
}
