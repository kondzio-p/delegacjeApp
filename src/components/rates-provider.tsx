"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CurrentRates } from "@/lib/rates";

// Kursy służą wyłącznie do przeliczania na walutę wyświetlania; wartość
// historyczna wpisu jest zamrożona w jego własnym `nbp_rate`.
const RatesContext = createContext<CurrentRates | null>(null);

/**
 * Udostępnia ekranom kursy pobrane raz w layoucie.
 *
 * Args:
 *     rates (CurrentRates | null): Tabela NBP albo null, gdy nie odpowiedziało.
 *     children (ReactNode): Poddrzewo korzystające z kursów.
 *
 * Returns:
 *     ReactNode: Provider kontekstu kursów.
 */
export function RatesProvider({
  rates,
  children,
}: {
  rates: CurrentRates | null;
  children: ReactNode;
}) {
  return <RatesContext.Provider value={rates}>{children}</RatesContext.Provider>;
}

/**
 * Daje dostęp do bieżącej tabeli kursów.
 *
 * Returns:
 *     CurrentRates | null: Kursy albo null — ekran ma to znieść, a nie pokazać
 *     błąd.
 */
export function useRates(): CurrentRates | null {
  return useContext(RatesContext);
}
