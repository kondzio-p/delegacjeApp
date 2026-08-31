/**
 * Granica ładowania dla wszystkich ekranów w powłoce.
 *
 * Poza natychmiastową odpowiedzią na kliknięcie pozwala Next prefetchować te
 * trasy — bez `loading` trasy dynamiczne nie są prefetchowane w ogóle.
 *
 * Returns:
 *     ReactNode: Szkielet ekranu na czas ładowania.
 */
export default function ShellLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-24 rounded-2xl bg-card" />
      <div className="h-40 rounded-2xl bg-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-2xl bg-card" />
        <div className="h-24 rounded-2xl bg-card" />
        <div className="h-24 rounded-2xl bg-card" />
        <div className="h-24 rounded-2xl bg-card" />
      </div>
      <div className="h-32 rounded-2xl bg-card" />
    </div>
  );
}
