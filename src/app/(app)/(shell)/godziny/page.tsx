import type { Metadata } from "next";

import { getTrips, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { WorkEntriesScreen } from "./work-entries-screen";

export const metadata: Metadata = {
  title: "Godziny pracy",
  description: "Zapisuj przepracowane godziny — data, od której do której.",
};

export default async function WorkPage() {
  const user = await requireUser();
  const [trips, entries] = await Promise.all([getTrips(user.id), getWorkEntries(user.id)]);

  return (
    <WorkEntriesScreen trips={trips} entries={entries} />
  );
}
