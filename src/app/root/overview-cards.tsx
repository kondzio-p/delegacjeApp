import { Building2, KeyRound, ShieldOff, Users } from "lucide-react";

import type { RootOverview } from "@/lib/queries-root";

/**
 * Kafelek z jedną liczbą i podpisem.
 *
 * Args:
 *     icon (React.ReactNode): Ikona kafelka.
 *     label (string): Podpis nad wartością.
 *     value (number | string): Wartość do pokazania.
 *     hint (string): Doprecyzowanie pod wartością.
 *
 * Returns:
 *     ReactNode: Kafelek przeglądu.
 */
function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="min-w-0 truncate text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Cztery liczby, po których widać stan aplikacji.
 *
 * Args:
 *     overview (RootOverview): Liczniki policzone na serwerze.
 *
 * Returns:
 *     ReactNode: Siatka kafelków.
 */
export function OverviewCards({ overview }: { overview: RootOverview }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        icon={<Users className="h-4 w-4 shrink-0 text-primary" />}
        label="Konta"
        value={overview.users}
        hint={`${overview.deletedUsers} usuniętych · ${overview.blockedUsers} zablokowanych`}
      />
      <Card
        icon={<Building2 className="h-4 w-4 shrink-0 text-primary" />}
        label="Firmy"
        value={overview.companies}
      />
      <Card
        icon={<ShieldOff className="h-4 w-4 shrink-0 text-destructive" />}
        label="Bez dostępu"
        value={overview.withoutCompanyAccess}
        hint="konta bez prawa do firmy"
      />
      <Card
        icon={<KeyRound className="h-4 w-4 shrink-0 text-primary" />}
        label="Aktywne sesje"
        value={overview.activeSessions}
        hint={`${overview.attemptsLastDay} prób logowania z doby`}
      />
    </section>
  );
}
