import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { getExpenses, getPayouts, getTrips, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { DashboardScreen } from "./dashboard-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.dashboard", "meta.dashboard");
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [trips, workEntries, expenses, payouts] = await Promise.all([
    getTrips(user.id),
    getWorkEntries(user.id),
    getExpenses(user.id),
    getPayouts(user.id),
  ]);

  return (
    <DashboardScreen
      trips={trips}
      workEntries={workEntries}
      expenses={expenses}
      payouts={payouts}
    />
  );
}
