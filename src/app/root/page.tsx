import { getRootOverview, listRootUsers, type UserFilter } from "@/lib/queries-root";

import { OverviewCards } from "./overview-cards";
import { UsersScreen } from "./users-screen";

const FILTERS: UserFilter[] = ["all", "owners", "employees", "noCompany", "blocked", "deleted"];

/**
 * Przegląd aplikacji i zarządzanie kontami.
 *
 * Wyszukiwanie i filtr jadą w adresie, a nie w stanie klienta — dzięki temu
 * konkretny widok („wszyscy zablokowani") da się zapisać w zakładkach i wrócić
 * do niego po odświeżeniu.
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

  const [overview, users] = await Promise.all([
    getRootOverview(),
    listRootUsers(search, filter),
  ]);

  return (
    <>
      <OverviewCards overview={overview} />
      <UsersScreen users={users} search={search} filter={filter} />
    </>
  );
}
