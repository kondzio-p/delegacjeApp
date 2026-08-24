// Waluta wyświetlania. To ustawienie urządzenia, nie konta — nie trafia do
// bazy, więc trzymamy je w localStorage.
//
// Kursu nikt już nie wpisuje ręcznie: pochodzi z NBP i jest zamrażany przy
// każdym wpisie, więc tutaj została sama waluta.
//
// Zewnętrzny store zamiast useState + useEffect: serwer renderuje wartości
// domyślne, a po zamontowaniu komponent czyta zapisane ustawienia przez
// useSyncExternalStore. Dzięki temu nie ma kaskadowego renderu ani rozjazdu
// hydracji, a zmiana ustawień w jednej zakładce dociera do pozostałych.
import type { Currency } from "./money";

export type Settings = { display: Currency };

export const DEFAULT_SETTINGS: Settings = { display: "PLN" };

// Nazwa została z czasów, gdy aplikacja nazywała się Delegacje. Zmiana
// tego klucza skasowałaby zapisane ustawienia, więc zostaje jak jest.
const STORAGE_KEY = "delegacje.settings";

let snapshot: Settings = DEFAULT_SETTINGS;
let loaded = false;

const listeners = new Set<() => void>();

function readStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      display: parsed.display === "EUR" || parsed.display === "PLN" ? parsed.display : "PLN",
    };
  } catch {
    // Uszkodzony wpis w localStorage nie może wywalić aplikacji.
    return DEFAULT_SETTINGS;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToSettings(listener: () => void): () => void {
  // Pierwszy subskrybent pojawia się po zamontowaniu, więc dopiero tutaj
  // localStorage jest dostępny. React sam sprawdzi snapshot po subskrypcji.
  if (!loaded) {
    loaded = true;
    snapshot = readStorage();
  }

  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSettingsSnapshot(): Settings {
  return snapshot;
}

/** SSR i pierwszy render na kliencie — zawsze wartości domyślne. */
export function getServerSettingsSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

export function updateSettings(patch: Partial<Settings>): void {
  snapshot = { ...snapshot, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Tryb prywatny bez dostępu do storage — ustawienie zadziała do przeładowania.
  }
  emit();
}

