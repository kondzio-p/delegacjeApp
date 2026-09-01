import { listAuditLog } from "@/lib/queries-root";

import { AuditScreen } from "./audit-screen";

/**
 * Dziennik działań roota.
 *
 * Returns:
 *     Promise<ReactNode>: Ekran dziennika.
 */
export default async function RootAuditPage() {
  const entries = await listAuditLog();
  return <AuditScreen entries={entries} />;
}
