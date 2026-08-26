// Eksport dokumentów po stronie przeglądarki: druk do PDF i pobieranie plików
// złożonych z tekstu oddanego przez serwer.

/**
 * Eksport do PDF przez okno drukowania przeglądarki. Tytuł dokumentu trafia do
 * domyślnej nazwy pliku, więc na czas druku podmieniamy go i przywracamy potem.
 */
export function printDocument(fileName: string): void {
  if (typeof window === "undefined") return;

  const previousTitle = document.title;
  document.title = fileName;

  const restore = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);

  window.setTimeout(() => {
    window.print();
    // Safari na iOS nie zawsze emituje afterprint.
    window.setTimeout(restore, 1000);
  }, 150);
}

/** YYYY-MM-DD z daty ISO — do nazwy pliku PDF. */
export function isoDay(value: string, fallback = "dokument"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Pobranie pliku zbudowanego w przeglądarce.
 *
 * Serwer oddaje sam tekst, a `Blob` z adresem obiektowym zastępuje endpoint —
 * dzięki temu eksport nie potrzebuje własnej trasy ani nagłówków.
 */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
