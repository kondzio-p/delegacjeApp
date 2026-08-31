import { AppShell } from "@/components/app-shell";
import { RatesProvider } from "@/components/rates-provider";
import { SettingsProvider } from "@/components/use-settings";
import { getCurrentRates } from "@/lib/nbp";
import { requireUser } from "@/lib/session";

/**
 * Powłoka aplikacji: nagłówek, menu i wybór języka.
 *
 * Siedzi w layoucie, a nie w każdej stronie z osobna — przy zmianie widoku Next
 * podmienia sam segment strony, więc powłoka zostaje klikalna w trakcie
 * ładowania. Kursy NBP pobieramy tu raz dla wszystkich ekranów.
 *
 * Args:
 *     children (React.ReactNode): Zawartość bieżącego ekranu.
 *
 * Returns:
 *     ReactNode: Powłoka z providerami kursów i ustawień.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [user, rates] = await Promise.all([requireUser(), getCurrentRates()]);

  return (
    <RatesProvider rates={rates}>
      <SettingsProvider initialDisplay={user.display_currency}>
        <AppShell user={user}>{children}</AppShell>
      </SettingsProvider>
    </RatesProvider>
  );
}
