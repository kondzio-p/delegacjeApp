import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { getCompanyStatus } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { SettingsScreen } from "./settings-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.settings", "meta.settings");
}

/**
 * Ustawienia konta.
 *
 * Returns:
 *     Promise<ReactNode>: Zawartość ekranu.
 */
export default async function SettingsPage() {
  const user = await requireUser();
  const status = await getCompanyStatus(user);

  return <SettingsScreen user={user} status={status} />;
}
