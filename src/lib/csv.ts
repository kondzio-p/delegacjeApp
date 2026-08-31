// Składanie CSV pod polskiego Excela.

/** Excel w polskiej lokalizacji czyta średnik; przy przecinku wiersz się zlewa. */
const SEPARATOR = ";";
/** Bez BOM-u Excel czyta plik jako Windows-1250 i robi krzaki z ogonków. */
const BOM = "\uFEFF";
/** RFC 4180 mówi o CRLF i tego trzyma się Excel. */
const EOL = "\r\n";

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/** Znaki, od których arkusz czyta pole jako formułę, a nie jako tekst. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Kwota ujemna też zaczyna się od minusa, a ma zostać liczbą do zsumowania. */
const PLAIN_NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Pole gotowe do wklejenia w wiersz CSV.
 *
 * Liczby dostają przecinek dziesiętny, żeby arkusz umiał je zsumować. Tekst
 * zaczynający się od znaku formuły poprzedzamy apostrofem — Excel pokazuje
 * wtedy zwykły napis zamiast go wykonywać. Cudzysłów dokładamy tylko wtedy,
 * gdy zawartość naprawdę tego wymaga.
 *
 * Args:
 *     value (string | number | null | undefined): Zawartość komórki.
 *
 * Returns:
 *     string: Pole w postaci bezpiecznej dla arkusza.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  }

  const risky = FORMULA_START.test(value) && !PLAIN_NUMBER.test(value);
  const text = risky ? `'${value}` : value;
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Składa wiersze w gotowy dokument CSV.
 *
 * Args:
 *     rows (readonly T[]): Dane do wypisania, po jednym wierszu na element.
 *     columns (readonly CsvColumn<T>[]): Nagłówki i sposób odczytu komórek.
 *
 * Returns:
 *     string: Dokument z BOM-em, średnikami i końcami wiersza CRLF.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => escapeField(column.header)).join(SEPARATOR),
    ...rows.map((row) => columns.map((column) => escapeField(column.value(row))).join(SEPARATOR)),
  ];

  return BOM + lines.join(EOL) + EOL;
}

/**
 * Zapisuje kwotę w postaci, którą arkusz zsumuje.
 *
 * Args:
 *     value (number): Kwota do zapisania.
 *
 * Returns:
 *     string: Dwa miejsca po przecinku, bez symbolu waluty.
 */
export function csvAmount(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2).replace(".", ",");
}
