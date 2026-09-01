import { Suspense } from "react";

import type { UserFilter } from "@/lib/queries-root";

import { OverviewSection } from "./overview-section";
import { ListSkeleton, OverviewSkeleton } from "./skeletons";
import { UsersControls } from "./users-controls";
import { UsersList } from "./users-list";

const FILTERS: UserFilter[] = ["all", "owners", "employees", "noCompany", "blocked", "deleted"];

/**
 * Przegląd aplikacji i zarządzanie kontami.
 *
 * Wyszukiwanie i filtr jadą w adresie, a nie w stanie klienta — konkretny widok
 * da się wtedy zapisać w zakładkach. Obie sekcje siedzą we własnych granicach
 * `Suspense`, więc zmiana filtru wymienia samą listę, a nagłówek, kafelki
 * i pasek filtrów zostają na ekranie.
 *
 * Args:
 *     searchParams (Promise<{ q?: string; filtr?: string }>): Fraza i filtr listy.
 *
 * Returns:
 *     Promise<ReactNode>: Kafelki przeglądu i lista kont.
 */
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtr?: string }>;
}) {
  const { q, filtr } = await searchParams;
  const filter = FILTERS.includes(filtr as UserFilter) ? (filtr as UserFilter) : "all";
  const search = (q ?? "").slice(0, 120);

  return (
    <>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewSection />
      </Suspense>

      <UsersControls search={search} filter={filter} />

      <Suspense key={`${filter}|${search}`} fallback={<ListSkeleton />}>
        <UsersList search={search} filter={filter} />
      </Suspense>
    </>
  );
}
