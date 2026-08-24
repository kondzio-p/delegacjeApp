// Stałe i typy kursów walut — współdzielone przez serwer i komponenty klienckie.
// Samo pobieranie z NBP siedzi w `nbp.ts`, który jest `server-only`.
//
// Tabela A NBP podaje kursy średnie jako ZŁOTÓWKI ZA JEDNĄ JEDNOSTKĘ waluty.
// Samego PLN w tabeli nie ma, bo jest walutą bazową — stąd `PLN_RATE = 1`.

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

export function isForeignCode(value: string): value is ForeignCode {
  return (FOREIGN_CODES as readonly string[]).includes(value);
}

/** `YYYY-MM-DD` z obiektu Date, w czasie lokalnym. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Kurs waluty do PLN z bieżącej tabeli. Null = nieznany. */
export function rateToPln(code: RateCode, rates: Record<ForeignCode, number> | undefined) {
  if (code === "PLN") return PLN_RATE;
  return rates?.[code] ?? null;
}

/**
 * Przelicza kwotę między walutami przez PLN jako walutę pośrednią.
 * Oba kursy to złotówki za jednostkę waluty.
 */
export function convertVia(amount: number, fromRate: number, toRate: number): number {
  if (!Number.isFinite(amount) || toRate <= 0) return 0;
  return (amount * fromRate) / toRate;
}
