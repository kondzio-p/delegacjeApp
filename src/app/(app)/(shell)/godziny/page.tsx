import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { getTrips, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { WorkEntriesScreen } from "./work-entries-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.hours", "meta.hours");
}

export default async function WorkPage() {
  const user = await requireUser();
  const [trips, entries] = await Promise.all([getTrips(user.id), getWorkEntries(user.id)]);

  return (
    <WorkEntriesScreen trips={trips} entries={entries} />
  );
}
