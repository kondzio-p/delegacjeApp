/**
 * Granica ładowania dla wszystkich ekranów w powłoce.
 *
 * Robi dwie rzeczy naraz: daje natychmiastową odpowiedź na kliknięcie oraz
 * — co ważniejsze — pozwala Next.js prefetchować te trasy. Bez `loading` trasy
 * dynamiczne (a wszystkie tutaj czytają ciasteczko sesji) nie są prefetchowane
 * w ogóle, więc każde przejście czekało na pełną rundę do bazy.
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
