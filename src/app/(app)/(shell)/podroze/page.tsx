import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { getTrips } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { TripsScreen } from "./trips-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.trips", "meta.trips");
}

/**
 * Lista podróży.
 *
 * Returns:
 *     Promise<ReactNode>: Zawartość ekranu.
 */
export default async function TripsPage() {
  const user = await requireUser();
  const trips = await getTrips(user.id);

  return (
    <TripsScreen trips={trips} />
  );
}
