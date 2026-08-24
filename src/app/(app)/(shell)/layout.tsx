import { AppShell } from "@/components/app-shell";
import { RatesProvider } from "@/components/rates-provider";
import { SettingsProvider } from "@/components/use-settings";
import { getCurrentRates } from "@/lib/nbp";
import { requireUser } from "@/lib/session";

/**
 * Powłoka (nagłówek, menu, wybór języka) siedzi w layoucie, a nie w każdej
 * stronie z osobna. Przy zmianie widoku Next podmienia wyłącznie segment strony,
 * więc powłoka zostaje zamontowana i pozostaje klikalna w trakcie ładowania.
 *
 * Kursy NBP pobieramy tutaj raz dla wszystkich ekranów — odpowiedź jest
 * cache'owana na godzinę, więc nawigacja ich nie odpytuje ponownie.
 *
 * Ekran powitalny `/witaj` celowo jest poza tą grupą — leci na pełnym ekranie.
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
