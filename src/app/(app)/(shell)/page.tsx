import type { Metadata } from "next";

import { getExpenses, getPayouts, getTrips, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { DashboardScreen } from "./dashboard-screen";

export const metadata: Metadata = {
  title: "Dashboard — Delegacje",
  description: "Przewidywany zarobek, faktyczne wypłaty i porównanie jednego z drugim.",
};

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
