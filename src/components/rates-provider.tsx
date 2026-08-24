"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CurrentRates } from "@/lib/rates";

/**
 * Bieżące kursy NBP pobrane raz w layoucie i udostępnione wszystkim ekranom.
 *
 * Kursy służą wyłącznie do przeliczania na walutę wyświetlania. Wartość
 * historyczna wpisu jest zamrożona w jego własnym `nbp_rate` i tych kursów
 * nie dotyczy.
 *
 * `null` oznacza, że NBP nie odpowiedziało — ekrany mają to znieść, a nie
 * pokazać błąd.
 */
const RatesContext = createContext<CurrentRates | null>(null);

export function RatesProvider({
  rates,
  children,
}: {
  rates: CurrentRates | null;
  children: ReactNode;
}) {
  return <RatesContext.Provider value={rates}>{children}</RatesContext.Provider>;
}

export function useRates(): CurrentRates | null {
  return useContext(RatesContext);
}
