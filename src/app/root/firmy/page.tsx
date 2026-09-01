import { listRootCompanies } from "@/lib/queries-root";

import { CompaniesScreen } from "./companies-screen";

/**
 * Lista firm w aplikacji.
 *
 * Returns:
 *     Promise<ReactNode>: Ekran firm z akcjami roota.
 */
export default async function RootCompaniesPage() {
  const companies = await listRootCompanies();
  return <CompaniesScreen companies={companies} />;
}
