// Wybór języka interfejsu. To ustawienie urządzenia, nie konta — trzyma się
// w ciasteczku (nie httpOnly), żeby serwer wyrenderował od razu właściwy język
// i nie było mignięcia polskim tekstem przed hydracją.

export const LOCALES = ["pl", "de", "uk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pl";

export const LOCALE_COOKIE = "delegacje_locale";

/** Rok — język wybiera się raz i ma zostać. */
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Nazwa własna języka plus krótki kod na przycisk w nagłówku. */
export const LOCALE_META: Record<Locale, { native: string; short: string; flag: string }> = {
  pl: { native: "Polski", short: "PL", flag: "🇵🇱" },
  de: { native: "Deutsch", short: "DE", flag: "🇩🇪" },
  uk: { native: "Українська", short: "UA", flag: "🇺🇦" },
  en: { native: "English", short: "EN", flag: "🇬🇧" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Nieznana albo brakująca wartość zawsze wraca do polskiego. */
export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
