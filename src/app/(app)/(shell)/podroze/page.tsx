import type { Metadata } from "next";

import { getTrips } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { TripsScreen } from "./trips-screen";

export const metadata: Metadata = {
  title: "Podróże — Delegacje",
  description: "Rejestruj wyjazdy i powroty z delegacji zagranicznych.",
};

export default async function TripsPage() {
  const user = await requireUser();
  const trips = await getTrips(user.id);

  return (
    <TripsScreen trips={trips} />
  );
}
