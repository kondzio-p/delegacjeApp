// Stałe i typy kursów walut — współdzielone przez serwer i komponenty klienckie.
// Tabela A NBP podaje złotówki za jedną jednostkę waluty, stąd `PLN_RATE = 1`.

/** Waluty obce, które obsługujemy. PLN jest bazą i nie ma własnego kursu. */
export const FOREIGN_CODES = ["EUR", "USD"] as const;
export type ForeignCode = (typeof FOREIGN_CODES)[number];

/** Waluty przeliczarki: baza plus obce. */
export const RATE_CODES = ["PLN", ...FOREIGN_CODES] as const;
export type RateCode = (typeof RATE_CODES)[number];

/** Złotówka do złotówki — przelicznik neutralny. */
export const PLN_RATE = 1;

export type DayRate = {
  /** Ile PLN za jedną jednostkę waluty. */
  mid: number;
  /** Data publikacji tabeli — bywa wcześniejsza niż pytana (weekend, święto). */
  effectiveDate: string;
};

export type CurrentRates = {
  effectiveDate: string;
  rates: Record<ForeignCode, number>;
};

/**
 * Sprawdza, czy kod należy do obsługiwanych walut obcych.
 *
 * Args:
 *     value (string): Kod waluty z tabeli NBP albo z formularza.
 *
 * Returns:
 *     boolean: True dla waluty, którą aplikacja zna.
 */
export function isForeignCode(value: string): value is ForeignCode {
  return (FOREIGN_CODES as readonly string[]).includes(value);
}

/**
 * Zapisuje datę jako „YYYY-MM-DD" w czasie lokalnym.
 *
 * Args:
 *     date (Date): Data do zapisania.
 *
 * Returns:
 *     string: Dzień w formacie ISO, bez części czasowej.
 */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Podaje kurs waluty do złotówki z bieżącej tabeli.
 *
 * Args:
 *     code (RateCode): Waluta, o którą pytamy.
 *     rates (Record<ForeignCode, number> | undefined): Kursy z tabeli NBP.
 *
 * Returns:
 *     number | null: Złotówki za jednostkę albo null, gdy kursu brak.
 */
export function rateToPln(code: RateCode, rates: Record<ForeignCode, number> | undefined) {
  if (code === "PLN") return PLN_RATE;
  return rates?.[code] ?? null;
}

/**
 * Przelicza kwotę między walutami przez złotówkę.
 *
 * Args:
 *     amount (number): Kwota w walucie źródłowej.
 *     fromRate (number): Złotówki za jednostkę waluty źródłowej.
 *     toRate (number): Złotówki za jednostkę waluty docelowej.
 *
 * Returns:
 *     number: Kwota w walucie docelowej; zero przy danych bez sensu.
 */
export function convertVia(amount: number, fromRate: number, toRate: number): number {
  if (!Number.isFinite(amount) || toRate <= 0) return 0;
  return (amount * fromRate) / toRate;
}
