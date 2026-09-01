"use client";

import { ShieldAlert } from "lucide-react";

import { FormMessage } from "@/components/ui";
import { useAction } from "@/components/use-action";
import { clearAttemptsAction } from "@/lib/actions/root";
import type { RootAttemptRow } from "@/lib/queries-root";

const SCOPE_LABELS: Record<string, string> = {
  login: "logowanie",
  recover: "odzyskiwanie hasła",
  register: "rejestracja",
  password: "zmiana hasła",
};

/** Limity z `rate-limit.ts` — powyżej tylu prób w oknie konto dostaje odmowę. */
const LIMITS: Record<string, number> = { login: 10, recover: 5, register: 5, password: 10 };

/**
 * Rozbija klucz licznika na adres IP i konto.
 *
 * Args:
 *     subject (string): Klucz w postaci „ip|e-mail".
 *
 * Returns:
 *     { ip: string; email: string }: Człony klucza gotowe do pokazania.
 */
function splitSubject(subject: string): { ip: string; email: string } {
  const [ip = "", email = ""] = subject.split("|");
  return { ip, email };
}

/**
 * Podgląd prób logowania i ratunek dla zablokowanego konta.
 *
 * Args:
 *     attempts (RootAttemptRow[]): Klucze licznika z ostatniej doby.
 *
 * Returns:
 *     ReactNode: Ekran bezpieczeństwa.
 */
export function SecurityScreen({ attempts }: { attempts: RootAttemptRow[] }) {
  const [clearState, clearAction, clearPending] = useAction(clearAttemptsAction);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Bezpieczeństwo
      </h2>

      <div className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0 text-primary" />
          <h3 className="text-sm font-semibold">Odblokuj konto po nieudanych próbach</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Licznik prób odcina po kilkunastu pomyłkach. Wyczyszczenie go pozwala od razu spróbować
          ponownie — przydaje się, gdy ktoś zablokował się własną literówką.
        </p>
        <form action={clearAction} className="mt-3 flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="adres e-mail konta"
            className="input-field min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={clearPending}
            className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Wyczyść licznik
          </button>
        </form>
        <FormMessage error={clearState.error} success={clearState.success} />
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Próby z ostatniej doby
      </h3>

      <div className="mt-3 space-y-2">
        {attempts.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
            Nikt nie odbił się od limitu w ostatniej dobie.
          </p>
        ) : (
          attempts.map((row) => {
            const { ip, email } = splitSubject(row.subject);
            const overLimit = row.attempts >= (LIMITS[row.scope] ?? Number.POSITIVE_INFINITY);

            return (
              <div
                key={`${row.scope}:${row.subject}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{email || "(bez adresu)"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SCOPE_LABELS[row.scope] ?? row.scope} · IP {ip} · ostatnia{" "}
                    {row.last.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-semibold tabular-nums ${
                    overLimit ? "bg-destructive/15 text-destructive" : "bg-secondary"
                  }`}
                >
                  {row.attempts} prób
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
