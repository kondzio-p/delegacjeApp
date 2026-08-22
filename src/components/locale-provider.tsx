"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/config";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Język trzymamy w stanie Reacta i w ciasteczku. Stan sprawia, że przełączenie
 * jest natychmiastowe (cały tłumaczony UI to komponenty klienckie), ciasteczko —
 * że serwer przy następnym wejściu wyrenderuje od razu właściwy język.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    // Bez httpOnly — to preferencja wyglądu, nie sekret, a zapis z klienta
    // oszczędza rundę do serwera przy każdej zmianie języka.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Poza providerem (np. w testach albo w komponencie renderowanym samodzielnie)
 * zwraca polski — brak kontekstu nie może wywalić ekranu.
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (context) return context;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
  };
}

/** Skrót na samą funkcję tłumaczącą — najczęstszy przypadek użycia. */
export function useT(): Translate {
  return useLocale().t;
}
