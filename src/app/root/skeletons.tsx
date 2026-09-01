/**
 * Szkielet kafelków przeglądu.
 *
 * Returns:
 *     ReactNode: Cztery prostokąty w miejscu liczb.
 */
export function OverviewSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-24 rounded-2xl bg-card" />
    </div>
  );
}

/**
 * Szkielet listy kont.
 *
 * Args:
 *     rows (number): Ile kart udawać.
 *
 * Returns:
 *     ReactNode: Prostokąty wielkości kart kont.
 */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-44 rounded-2xl bg-card" />
      ))}
    </div>
  );
}
