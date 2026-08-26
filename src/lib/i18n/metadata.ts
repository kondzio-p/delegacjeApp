import "server-only";

import type { Metadata } from "next";

import { translate, type TranslationKey } from "./dictionaries";
import { getLocale } from "./locale.server";

/**
 * Tytuł i opis strony w języku użytkownika.
 *
 * Metadane powstają na serwerze, gdzie `useT()` nie działa — język trzeba
 * odczytać z ciasteczka albo z sesji. Stąd osobny pomocnik zamiast statycznego
 * `export const metadata`: tytuł w karcie przeglądarki ma być w tym samym
 * języku co reszta interfejsu.
 */
export async function pageMetadata(
  titleKey: TranslationKey,
  descriptionKey?: TranslationKey,
): Promise<Metadata> {
  const locale = await getLocale();

  return {
    title: translate(locale, titleKey),
    ...(descriptionKey ? { description: translate(locale, descriptionKey) } : {}),
  };
}
