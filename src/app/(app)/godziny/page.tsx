import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getTrips, getWorkEntries } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { WorkEntriesScreen } from "./work-entries-screen";

export const metadata: Metadata = {
  title: "Godziny Pracy — Delegacje",
  description: "Zapisuj godziny pracy i stawki podczas delegacji.",
};

export default async function WorkPage() {
  const user = await requireUser();
  const [trips, entries] = await Promise.all([getTrips(user.id), getWorkEntries(user.id)]);

  return (
    <AppShell title="Godziny Pracy" isOwner={user.is_owner}>
      <WorkEntriesScreen trips={trips} entries={entries} />
    </AppShell>
  );
}
