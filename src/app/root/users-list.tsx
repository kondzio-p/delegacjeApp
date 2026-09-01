import { listRootUsers, type UserFilter } from "@/lib/queries-root";

import { UserCard } from "./user-card";

/**
 * Lista kont pasujących do wyszukiwania i filtru.
 *
 * Args:
 *     search (string): Fraza z wyszukiwarki.
 *     filter (UserFilter): Aktywny filtr listy.
 *
 * Returns:
 *     Promise<ReactNode>: Karty kont albo informacja o pustym wyniku.
 */
export async function UsersList({
  search,
  filter,
}: {
  search: string;
  filter: UserFilter;
}) {
  const users = await listRootUsers(search, filter);

  if (users.length === 0) {
    return (
      <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
        Żadne konto nie pasuje do tego wyszukiwania.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
