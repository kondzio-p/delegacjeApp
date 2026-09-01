import type { RootAuditRow } from "@/lib/queries-root";

const ACTION_LABELS: Record<string, string> = {
  company_access_on: "Przywrócono dostęp rozszerzony",
  company_access_off: "Odebrano dostęp rozszerzony",
  user_blocked: "Zablokowano konto",
  user_unblocked: "Odblokowano konto",
  user_signed_out: "Wylogowano ze wszystkich urządzeń",
  user_password_reset: "Nadano hasło jednorazowe",
  company_renamed: "Zmieniono nazwę firmy",
  company_transferred: "Przekazano firmę",
  company_dissolved: "Rozwiązano firmę",
  attempts_cleared: "Wyczyszczono licznik prób",
};

/**
 * Dziennik działań roota.
 *
 * Wpisów nie da się skasować z panelu — po to jest dziennik. Kolejność od
 * najnowszego, bo tak się go czyta: „co się ostatnio wydarzyło".
 *
 * Args:
 *     entries (RootAuditRow[]): Wpisy dziennika.
 *
 * Returns:
 *     ReactNode: Lista zdarzeń.
 */
export function AuditScreen({ entries }: { entries: RootAuditRow[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Dziennik działań
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Każda operacja wykonana z tego panelu. Wpisów nie da się stąd usunąć.
      </p>

      <div className="mt-4 space-y-2">
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Dziennik jest pusty — nic jeszcze nie zrobiono z tego panelu.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {entry.createdAt.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              {entry.targetLabel && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{entry.targetLabel}</p>
              )}
              {entry.detail && <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
