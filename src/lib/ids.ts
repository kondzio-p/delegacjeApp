// Sprawdzanie kształtu identyfikatorów, zanim trafią do zapytania.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Czy wartość wygląda jak UUID.
 *
 * Klucze główne są kolumnami `uuid`, więc tekst o innym kształcie kończy się
 * po stronie Postgresa błędem składni i odpowiedzią 500 zamiast 404. Adresy
 * i parametry przychodzą z zewnątrz, więc sprawdzamy je przed zapytaniem.
 *
 * Args:
 *     value (unknown): Wartość z adresu, parametru albo formularza.
 *
 * Returns:
 *     boolean: True, gdy wartość jest tekstem w formacie UUID.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
