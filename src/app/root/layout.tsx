import type { Metadata } from "next";
import { LogOut, ShieldCheck } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { requireRoot } from "@/lib/session";

import { RootNav } from "./root-nav";

// Panel jest po polsku i nie przechodzi przez słowniki: ogląda go jeden
// człowiek — właściciel aplikacji. Cztery tłumaczenia napisów administracyjnych
// byłyby kosztem bez odbiorcy. Komunikaty widoczne dla użytkowników aplikacji
// (np. o dostępie rozszerzonym) są tłumaczone tak jak reszta interfejsu.
export const metadata: Metadata = {
  title: "Panel administracyjny",
  robots: { index: false, follow: false },
};


/**
 * Powłoka panelu administracyjnego.
 *
 * Bramka stoi tutaj, więc żaden ekran pod `/root` nie może o niej zapomnieć.
 * Panel celowo nie dzieli powłoki z aplikacją: root nie ma pulpitu, godzin ani
 * finansów, a wspólne menu tylko podsuwałoby mu ekrany, na których nic nie ma.
 *
 * Args:
 *     children (React.ReactNode): Zawartość bieżącego ekranu panelu.
 *
 * Returns:
 *     Promise<ReactNode>: Panel z nagłówkiem i nawigacją.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const root = await requireRoot();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Panel administracyjny</p>
            <p className="truncate text-xs text-muted-foreground">{root.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4 shrink-0" /> Wyloguj
            </button>
          </form>
        </div>

        <RootNav />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
