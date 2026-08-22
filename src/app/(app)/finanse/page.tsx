import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getExpenses, getPayouts, getTrips } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { FinanceScreen } from "./finance-screen";

export const metadata: Metadata = {
  title: "Finanse — Delegacje",
  description: "Dodawaj koszty i wypłaty oraz śledź historię transakcji.",
};

export default async function FinancePage() {
  const user = await requireUser();
  const [trips, expenses, payouts] = await Promise.all([
    getTrips(user.id),
    getExpenses(user.id),
    getPayouts(user.id),
  ]);

  return (
    <AppShell title="Finanse" user={user}>
      <FinanceScreen trips={trips} expenses={expenses} payouts={payouts} />
    </AppShell>
  );
}
