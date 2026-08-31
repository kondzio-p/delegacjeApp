// Odczyt języka na serwerze — pierwszy render leci od razu we właściwym języku.
import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentUser } from "../session";

import { normalizeLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

/**
 * Podaje język bieżącego żądania.
 *
 * Zalogowanemu decyduje ustawienie z konta, wylogowanemu ciasteczko: ktoś, kto
 * wybrał niemiecki na telefonie, dostaje niemiecki także na laptopie.
 *
 * Returns:
 *     Promise<Locale>: Język do pierwszego renderu.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser();
  if (user) return normalizeLocale(user.locale);

  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
});

/**
 * Zapisuje język w ciasteczku.
 *
 * Nie httpOnly, bo to preferencja wyglądu, a nie sekret. Do ciasteczka trafia
 * wyłącznie znany kod języka.
 *
 * Args:
 *     value (unknown): Wybrany język.
 *
 * Returns:
 *     Promise<void>: Nic — efektem jest ciasteczko w odpowiedzi.
 */
export async function rememberLocale(value: unknown): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, normalizeLocale(value), {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
