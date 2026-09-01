"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { UserFilter } from "@/lib/queries-root";

const FILTER_LABELS: Record<UserFilter, string> = {
  all: "Wszystkie",
  owners: "Właściciele",
  employees: "Pracownicy",
  noCompany: "Bez firmy",
  blocked: "Zablokowane",
  deleted: "Usunięte",
};

/**
 * Składa adres listy z filtru i frazy.
 *
 * Args:
 *     filter (UserFilter): Wybrany filtr.
 *     search (string): Fraza z wyszukiwarki.
 *
 * Returns:
 *     string: Ścieżka z parametrami gotowa dla routera.
 */
function listHref(filter: UserFilter, search: string): string {
  const query = new URLSearchParams({ filtr: filter, ...(search ? { q: search } : {}) });
  return `/root?${query.toString()}`;
}

/**
 * Wyszukiwarka i filtry listy kont.
 *
 * Przełączanie idzie przez `router.push` w transakcji, a nie przez zwykły
 * odnośnik ani wysyłkę formularza GET: strona nie przeładowuje się od zera,
 * a `isPending` pozwala od razu podświetlić klikniętą pozycję, zanim nowa lista
 * zdąży zejść z serwera. Sam adres zostaje w URL-u, więc widok da się zapisać
 * w zakładkach i wrócić do niego po odświeżeniu.
 *
 * Args:
 *     search (string): Fraza wpisana w wyszukiwarkę.
 *     filter (UserFilter): Aktywny filtr listy.
 *
 * Returns:
 *     ReactNode: Nagłówek sekcji z wyszukiwarką i filtrami.
 */
export function UsersControls({ search, filter }: { search: string; filter: UserFilter }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(search);
  const [target, setTarget] = useState<UserFilter>(filter);

  const go = (nextFilter: UserFilter, nextSearch: string) => {
    setTarget(nextFilter);
    startTransition(() => router.push(listHref(nextFilter, nextSearch)));
  };

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Konta
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          go(filter, term.trim());
        }}
        className="mt-3 flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            maxLength={120}
            placeholder="Szukaj po adresie e-mail albo imieniu"
            className="input-field pl-9"
          />
        </div>
        <button
          type="submit"
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Szukaj
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as UserFilter[]).map((key) => {
          const active = key === filter;
          // Kliknięta pozycja podświetla się natychmiast, jeszcze zanim serwer
          // odpowie — inaczej panel sprawia wrażenie, jakby zignorował klik.
          const highlighted = active || (pending && key === target);

          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => go(key, term.trim())}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                highlighted ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {FILTER_LABELS[key]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
