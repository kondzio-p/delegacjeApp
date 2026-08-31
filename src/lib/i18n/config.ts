// Wybór języka interfejsu. Źródłem prawdy jest kolumna `users.locale`,
// a ciasteczko niesie wybór na ekrany bez sesji.

export const LOCALES = ["pl", "de", "uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pl";

export const LOCALE_COOKIE = "godzio_locale";

/** Rok — język wybiera się raz i ma zostać. */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Nazwa własna języka plus krótki kod na przycisk w nagłówku. */
export const LOCALE_META: Record<Locale, { native: string; short: string; flag: string }> = {
  pl: { native: "Polski", short: "PL", flag: "🇵🇱" },
  de: { native: "Deutsch", short: "DE", flag: "🇩🇪" },
  uk: { native: "Українська", short: "UA", flag: "🇺🇦" },
  en: { native: "English", short: "EN", flag: "🇬🇧" },
};

/**
 * Sprawdza, czy wartość jest obsługiwanym kodem języka.
 *
 * Args:
 *     value (unknown): Wartość z ciasteczka, formularza albo bazy.
 *
 * Returns:
 *     boolean: True dla języka, który aplikacja zna.
 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Sprowadza wartość do znanego kodu języka.
 *
 * Args:
 *     value (unknown): Wartość z ciasteczka, formularza albo bazy.
 *
 * Returns:
 *     Locale: Podany język albo polski, gdy wartość jest nieznana.
 */
export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
