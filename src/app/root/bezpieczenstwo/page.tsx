import { listRecentAttempts } from "@/lib/queries-root";

import { SecurityScreen } from "./security-screen";

/**
 * Podgląd prób logowania i odblokowanie licznika.
 *
 * Returns:
 *     Promise<ReactNode>: Ekran bezpieczeństwa.
 */
export default async function RootSecurityPage() {
  const attempts = await listRecentAttempts();
  return <SecurityScreen attempts={attempts} />;
}
