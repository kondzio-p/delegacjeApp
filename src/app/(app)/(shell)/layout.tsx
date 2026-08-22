import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

/**
 * Powłoka (nagłówek, menu, wybór języka) siedzi w layoucie, a nie w każdej
 * stronie z osobna. Przy zmianie widoku Next podmienia wyłącznie segment strony,
 * więc powłoka zostaje zamontowana i pozostaje klikalna w trakcie ładowania.
 *
 * Ekran powitalny `/witaj` celowo jest poza tą grupą — leci na pełnym ekranie.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
