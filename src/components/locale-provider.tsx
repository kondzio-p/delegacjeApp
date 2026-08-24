"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";

import { setLocaleAction } from "@/lib/actions/preferences";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { translate, type TranslationKey } from "@/lib/i18n/dictionaries";

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Język żyje w trzech miejscach naraz i każde ma inne zadanie: stan Reacta daje
 * natychmiastowe przełączenie (cały tłumaczony interfejs to komponenty klienckie),
 * kolumna w bazie przenosi wybór na inne urządzenie, a ciasteczko pozwala
 * serwerowi wyrenderować właściwy język zanim pozna sesję.
 *
 * Zapis idzie przez akcję serwerową, ale interfejs na nią nie czeka.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [, startSaving] = useTransition();

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    startSaving(async () => {
      await setLocaleAction(next);
    });
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
