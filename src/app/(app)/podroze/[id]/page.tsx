import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getExpenses, getPayouts, getTrip, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { TripDetailScreen } from "./trip-detail-screen";

export const metadata: Metadata = {
  title: "Podsumowanie podróży — Delegacje",
  description: "Godziny, koszty, wypłaty i realny zysk z jednej delegacji.",
};

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const trip = await getTrip(user.id, id);
  if (!trip) notFound();

  const [workEntries, expenses, payouts] = await Promise.all([
    getWorkEntries(user.id),
    getExpenses(user.id),
    getPayouts(user.id),
  ]);

  return (
    <AppShell title="Podsumowanie podróży" isOwner={user.is_owner}>
      <TripDetailScreen
        trip={trip}
        workEntries={workEntries}
        expenses={expenses}
        payouts={payouts}
      />
    </AppShell>
  );
}
