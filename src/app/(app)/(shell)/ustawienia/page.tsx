import type { Metadata } from "next";

import { getCompanyStatus } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { SettingsScreen } from "./settings-screen";

export const metadata: Metadata = {
  title: "Ustawienia",
  description: "Konto, hasło, firma, kategorie kosztów i prywatność.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const status = await getCompanyStatus(user);

  return <SettingsScreen user={user} status={status} />;
}
