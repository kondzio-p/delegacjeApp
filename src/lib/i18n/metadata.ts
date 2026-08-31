import "server-only";

import type { Metadata } from "next";

import { translate, type TranslationKey } from "./dictionaries";
import { getLocale } from "./locale.server";

/**
 * Składa tytuł i opis strony w języku użytkownika.
 *
 * Metadane powstają na serwerze, gdzie `useT()` nie działa, więc język trzeba
 * odczytać z ciasteczka albo z sesji.
 *
 * Args:
 *     titleKey (TranslationKey): Klucz tytułu strony.
 *     descriptionKey (TranslationKey): Klucz opisu, gdy strona go ma.
 *
 * Returns:
 *     Promise<Metadata>: Metadane gotowe dla Next.
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
