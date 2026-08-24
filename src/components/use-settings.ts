"use client";

import { useSyncExternalStore } from "react";

import type { Currency } from "@/lib/money";
import {
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  subscribeToSettings,
  updateSettings,
} from "@/lib/settings-store";

/**
 * Waluta wyświetlania — wspólna dla wszystkich ekranów, trzymana poza Reactem
 * (localStorage), więc bez providera. Kursy przychodzą osobno, z NBP.
 */
export function useSettings() {
  const settings = useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );

  return {
    display: settings.display,
    setDisplay: (display: Currency) => updateSettings({ display }),
  };
}
