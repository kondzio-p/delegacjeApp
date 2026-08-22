"use client";

import { useSyncExternalStore } from "react";

import type { Currency } from "@/lib/money";
import {
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  parseRate,
  subscribeToSettings,
  updateSettings,
} from "@/lib/settings-store";

/**
 * Waluta wyświetlania i kurs EUR/PLN — wspólne dla wszystkich ekranów,
 * trzymane poza Reactem (localStorage), więc bez providera.
 */
export function useSettings() {
  const settings = useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );

  return {
    display: settings.display,
    rateInput: settings.rateInput,
    rate: parseRate(settings.rateInput),
    setDisplay: (display: Currency) => updateSettings({ display }),
    setRateInput: (rateInput: string) => updateSettings({ rateInput }),
  };
}
