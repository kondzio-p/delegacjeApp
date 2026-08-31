import { requireUser } from "@/lib/session";

/**
 * Bramka logowania dla całej grupy tras.
 *
 * Args:
 *     children (React.ReactNode): Zawartość chronionej strony.
 *
 * Returns:
 *     ReactNode: Zawartość, gdy sesja jest ważna; inaczej przekierowanie.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
