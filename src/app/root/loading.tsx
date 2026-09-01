import { ListSkeleton, OverviewSkeleton } from "./skeletons";

/**
 * Granica ładowania całego panelu.
 *
 * Poza natychmiastową odpowiedzią na kliknięcie pozwala Next prefetchować trasy
 * panelu — bez `loading` trasy dynamiczne nie są prefetchowane w ogóle i każde
 * przejście czeka na pełną rundę do bazy.
 *
 * Returns:
 *     ReactNode: Szkielet ekranu na czas ładowania.
 */
export default function RootLoading() {
  return (
    <div className="space-y-6">
      <OverviewSkeleton />
      <ListSkeleton />
    </div>
  );
}
