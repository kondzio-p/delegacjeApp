// Zamiana między dniem z formularza ("YYYY-MM-DD") a momentem w kolumnie
// `timestamptz`. Osobny moduł, bo korzystają z tego i akcje serwerowe, i ekran
// finansów — a z pliku "use server" nie da się wyeksportować zwykłej funkcji.

/**
 * Dzień z formularza jako moment do zapisu.
 *
 * Południe UTC, a nie północ: w każdej europejskiej strefie wypada wtedy ten
 * sam dzień kalendarzowy, więc wpis nie przeskakuje o dobę przy odczycie.
 * Granice zakresów w raportach są liczone w UTC, więc wpis trafia też do
 * właściwego miesiąca.
 */
export function dayToMoment(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

/**
 * Odwrotność `dayToMoment` — dzień zapisanego momentu, liczony w UTC.
 *
 * UTC, a nie czas lokalny, bo tak samo zapisujemy: inaczej wpisy sprzed tej
 * zmiany, powstałe późnym wieczorem, pokazywałyby dzień następny.
 */
export function momentToDay(moment: Date | string): string {
  const date = moment instanceof Date ? moment : new Date(moment);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Dzisiaj w czasie lokalnym — domyślna data nowego wpisu w formularzu. */
export function todayLocal(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
