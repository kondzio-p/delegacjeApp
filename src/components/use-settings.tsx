"use client";

// Waluta wyświetlania — preferencja konta, nie urządzenia.
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";

import { setDisplayCurrencyAction } from "@/lib/actions/preferences";
import { isCurrency, type Currency } from "@/lib/money";

type SettingsContextValue = {
  display: Currency;
  setDisplay: (currency: Currency) => void;
  saving: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Trzyma walutę wyświetlania i pozwala ją przełączyć.
 *
 * Wartość początkowa przychodzi z sesji, a zmiana idzie przez akcję serwerową.
 * Interfejs nie czeka na odpowiedź: przełącznik przestawia się od razu,
 * a `useTransition` trzyma render w tle.
 *
 * Args:
 *     initialDisplay (string): Waluta odczytana z konta.
 *     children (ReactNode): Poddrzewo korzystające z ustawienia.
 *
 * Returns:
 *     ReactNode: Provider kontekstu ustawień.
 */
export function SettingsProvider({
  initialDisplay,
  children,
}: {
  initialDisplay: string;
  children: ReactNode;
}) {
  // Kolumna w bazie jest tekstem, więc wartość spoza zestawu wraca do złotówki.
  const [display, setDisplayState] = useState<Currency>(
    isCurrency(initialDisplay) ? initialDisplay : "PLN",
  );
  const [saving, startSaving] = useTransition();

  const setDisplay = useCallback((currency: Currency) => {
    setDisplayState(currency);
    startSaving(async () => {
      await setDisplayCurrencyAction(currency);
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ display, setDisplay, saving }),
    [display, setDisplay, saving],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/**
 * Daje dostęp do waluty wyświetlania.
 *
 * Poza providerem — na przykład w publicznym podglądzie podróży — zwraca
 * złotówki, bo brak kontekstu nie może wywalić ekranu.
 *
 * Returns:
 *     SettingsContextValue: Waluta, przełącznik i znacznik zapisu.
 */
export function useSettings(): SettingsContextValue {
  return (
    useContext(SettingsContext) ?? { display: "PLN", setDisplay: () => {}, saving: false }
  );
}
