import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { notFound } from "next/navigation";

import { getExpenses, getPayouts, getTrip, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { TripDetailScreen } from "./trip-detail-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("title.tripDetail", "meta.tripDetail");
}

/**
 * Ekran szczegółów jednej podróży.
 *
 * Args:
 *     params (Promise<{ id: string }>): Identyfikator podróży ze ścieżki.
 *
 * Returns:
 *     Promise<ReactNode>: Ekran podróży; cudza albo nieistniejąca daje 404.
 */
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
    <TripDetailScreen
      trip={trip}
      workEntries={workEntries}
      expenses={expenses}
      payouts={payouts}
    />
  );
}
