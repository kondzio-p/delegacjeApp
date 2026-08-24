"use client";

// Waluta wyświetlania. Preferencja konta, nie urządzenia — leży w bazie,
// więc przeżywa wyczyszczenie przeglądarki i wchodzi z użytkownikiem
// na każdy jego telefon.
//
// Wartość początkowa przychodzi z serwera (z sesji), a zmiana idzie przez
// akcję serwerową. Interfejs nie czeka na odpowiedź: przełącznik przestawia
// się od razu, a `useTransition` trzyma render w tle, więc zmiana waluty jest
// natychmiastowa mimo rundy do bazy.
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";

import { setDisplayCurrencyAction } from "@/lib/actions/preferences";
import { isCurrency, type Currency } from "@/lib/money";

type SettingsContextValue = {
  display: Currency;
  setDisplay: (currency: Currency) => void;
  saving: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

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
 * Poza providerem (np. publiczny podgląd podróży, gdzie nie ma zalogowanego
 * użytkownika) zwracamy złotówki — brak kontekstu nie może wywalić ekranu.
 */
export function useSettings(): SettingsContextValue {
  return (
    useContext(SettingsContext) ?? { display: "PLN", setDisplay: () => {}, saving: false }
  );
}
