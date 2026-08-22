import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getCompanyStatus } from "@/lib/queries";
import { requireUser } from "@/lib/session";

import { SettingsScreen } from "./settings-screen";

export const metadata: Metadata = {
  title: "Ustawienia — Delegacje",
  description: "Konto, hasło, firma oraz kurs waluty.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const status = await getCompanyStatus(user);

  return (
    <AppShell title="Ustawienia" user={user}>
      <SettingsScreen user={user} status={status} />
    </AppShell>
  );
}
