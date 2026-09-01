import { getRootOverview } from "@/lib/queries-root";

import { OverviewCards } from "./overview-cards";

/**
 * Kafelki przeglądu pobierane niezależnie od listy kont.
 *
 * Osobny komponent, bo osobna granica `Suspense`: liczniki i lista schodzą
 * z serwera równolegle, więc żadne z nich nie czeka na drugie.
 *
 * Returns:
 *     Promise<ReactNode>: Siatka kafelków z bieżącymi liczbami.
 */
export async function OverviewSection() {
  const overview = await getRootOverview();
  return <OverviewCards overview={overview} />;
}
