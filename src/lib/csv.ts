// Składanie CSV pod polskiego Excela.
//
// Dwie decyzje, bez których plik otwiera się źle i nikt nie wie dlaczego:
//
//  - separator średnik, nie przecinek. Excel w polskiej lokalizacji czyta pole
//    "separator listy" z ustawień systemu, a tam siedzi średnik. Przy przecinku
//    cały wiersz ląduje w jednej kolumnie.
//  - BOM na początku pliku. Bez niego Excel czyta bajty jako Windows-1250
//    i ogonki zamieniają się w krzaki.
//
// Liczby zapisujemy z przecinkiem dziesiętnym — inaczej Excel potraktuje je
// jak tekst i nie da ich zsumować.

const SEPARATOR = ";";
const BOM = "\uFEFF";
/** RFC 4180 mówi o CRLF i tego trzyma się Excel. */
const EOL = "\r\n";

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/** Pole w cudzysłowie tylko wtedy, gdy naprawdę tego wymaga. */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const text =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value).replace(".", ",")
        : ""
      : value;

  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => escapeField(column.header)).join(SEPARATOR),
    ...rows.map((row) => columns.map((column) => escapeField(column.value(row))).join(SEPARATOR)),
  ];

  return BOM + lines.join(EOL) + EOL;
}

/** Kwota do arkusza: dwa miejsca po przecinku, bez symbolu waluty. */
export function csvAmount(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2).replace(".", ",");
}
