// Eksport dokumentów po stronie przeglądarki: druk do PDF i pobieranie plików.

/** Znaki, których nie przyjmie system plików ani nagłówek pobierania. */
const FORBIDDEN = new Set(["\\", "/", ":", "*", "?", '"', "<", ">", "|"]);

/**
 * Nazwa pliku sprowadzona do znaków bezpiecznych.
 *
 * Do nazwy wchodzą teksty od użytkownika — nazwa firmy, imię pracownika —
 * a te potrafią zawierać ukośniki, cudzysłowy i przełamania wiersza. Wycinamy
 * wszystko, czego system plików nie przyjmuje, i przycinamy długość.
 *
 * Args:
 *     name (string): Proponowana nazwa pliku bez rozszerzenia.
 *     fallback (string): Nazwa zastępcza, gdy nie zostanie ani jeden znak.
 *
 * Returns:
 *     string: Nazwa złożona wyłącznie ze znaków bezpiecznych.
 */
export function safeFileName(name: string, fallback = "plik"): string {
  const cleaned = Array.from(name)
    .map((char) => (char < " " || char === "\u007f" || FORBIDDEN.has(char) ? " " : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  return cleaned || fallback;
}

/**
 * Otwiera okno drukowania z podmienioną nazwą dokumentu.
 *
 * Tytuł strony trafia do domyślnej nazwy pliku PDF, więc na czas druku
 * podmieniamy go i przywracamy zaraz potem.
 *
 * Args:
 *     fileName (string): Nazwa proponowana w oknie zapisu.
 *
 * Returns:
 *     void: Nic — resztą zajmuje się przeglądarka.
 */
export function printDocument(fileName: string): void {
  if (typeof window === "undefined") return;

  const previousTitle = document.title;
  document.title = safeFileName(fileName, "dokument");

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

/**
 * Wyciąga dzień z daty ISO na potrzeby nazwy pliku.
 *
 * Args:
 *     value (string): Data w zapisie ISO.
 *     fallback (string): Wartość zwracana, gdy daty nie da się odczytać.
 *
 * Returns:
 *     string: Dzień „YYYY-MM-DD" albo wartość zastępcza.
 */
export function isoDay(value: string, fallback = "dokument"): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Pobiera plik zbudowany w przeglądarce.
 *
 * Serwer oddaje sam tekst, a `Blob` z adresem obiektowym zastępuje endpoint —
 * dzięki temu eksport nie potrzebuje własnej trasy ani nagłówków.
 *
 * Args:
 *     fileName (string): Nazwa proponowana w oknie zapisu.
 *     content (string): Zawartość pliku.
 *     mimeType (string): Typ treści, np. „text/csv;charset=utf-8".
 *
 * Returns:
 *     void: Nic — plik ląduje w pobranych.
 */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName(fileName);
  link.click();
  URL.revokeObjectURL(url);
}
