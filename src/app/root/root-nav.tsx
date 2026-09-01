"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/root", label: "Przegląd i konta" },
  { href: "/root/firmy", label: "Firmy" },
  { href: "/root/bezpieczenstwo", label: "Bezpieczeństwo" },
  { href: "/root/dziennik", label: "Dziennik" },
];

/**
 * Kropka pulsująca w klikniętej pozycji, dopóki trwa przejście.
 *
 * `useLinkStatus` działa wyłącznie wewnątrz `<Link>`, stąd osobny komponent.
 *
 * Returns:
 *     ReactNode: Kropka albo nic, gdy nic się nie ładuje.
 */
function Pending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current" />;
}

/**
 * Pasek nawigacji panelu.
 *
 * Zwykłe `<Link>` zamiast `<a>`, więc przejście wymienia sam segment strony
 * zamiast przeładowywać dokument. Dzięki granicy `loading.tsx` Next zdąży
 * pobrać trasę zawczasu, a `useLinkStatus` pokazuje, że klik został przyjęty,
 * gdyby baza akurat odpowiadała wolniej.
 *
 * Returns:
 *     ReactNode: Pozycje nawigacji z zaznaczoną bieżącą.
 */
export function RootNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {item.label}
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}
