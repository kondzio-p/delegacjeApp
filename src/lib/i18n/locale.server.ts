// Odczyt języka po stronie serwera. Dzięki temu pierwszy render leci już we
// właściwym języku — bez mignięcia polskim tekstem przed hydracją.
import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentUser } from "../session";

import { normalizeLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

/**
 * Zalogowanemu decyduje ustawienie z konta, wylogowanemu — ciasteczko.
 *
 * Kolejność ma znaczenie: ktoś, kto wybrał niemiecki na telefonie, po wejściu
 * z laptopa (gdzie ciasteczka nie ma) dostaje niemiecki, bo język idzie
 * za kontem, a nie za przeglądarką.
 *
 * `cache` — layout i strony pytają w tym samym żądaniu, a `getCurrentUser`
 * jest cache'owany osobno, więc baza odpowiada raz niezależnie od liczby pytań.
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
 * Nie httpOnly, bo to preferencja wyglądu, a nie sekret. Wartość spoza listy
 * jest ignorowana — do ciasteczka trafia wyłącznie znany kod języka.
 */
export async function rememberLocale(value: unknown): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, normalizeLocale(value), {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}
