// Odczyt języka po stronie serwera. Dzięki temu pierwszy render leci już we
// właściwym języku — bez mignięcia polskim tekstem przed hydracją.
import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";

/** `cache` — layout i strony pytają w tym samym żądaniu, ciasteczko czytamy raz. */
export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
});
