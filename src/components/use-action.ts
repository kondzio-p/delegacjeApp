"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/types";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type Options = {
  /** Wywoływane po udanej akcji — czyszczenie pól, zamknięcie modala itp. */
  onSuccess?: () => void;
  /** Dla przycisków bez miejsca na komunikat w formularzu (np. ikona kosza). */
  toastError?: boolean;
};

/**
 * Spina akcję serwerową z potwierdzeniem w toaście.
 *
 * Efekty uboczne odpalają się wewnątrz akcji, a nie w `useEffect` — dzięki temu
 * nie ma kaskadowych renderów ani ryzyka, że ten sam wynik zadziała dwa razy.
 *
 * Args:
 *     action (Action): Akcja serwerowa przyjmująca dane formularza.
 *     options (Options): Wywołanie po sukcesie i tryb błędu w toaście.
 *
 * Returns:
 *     [ActionState, (formData: FormData) => void, boolean]: Stan, funkcja
 *     wysyłki i znacznik trwającego żądania.
 */
export function useAction(action: Action, options: Options = {}) {
  return useActionState<ActionState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);

    if (result.success) {
      toast.success(result.success);
      options.onSuccess?.();
    } else if (result.error && options.toastError) {
      toast.error(result.error);
    }

    return result;
  }, {});
}
