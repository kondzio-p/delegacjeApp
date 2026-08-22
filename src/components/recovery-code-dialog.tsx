"use client";

import { Copy, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "./ui";

/**
 * Kod odzyskiwania pokazujemy dokładnie raz — w bazie leży tylko jego hash,
 * więc nie ma sposobu, żeby wyświetlić go później.
 */
export function RecoveryCodeDialog({
  code,
  onClose,
  title = "Zapisz kod odzyskiwania",
  confirmLabel = "Zapisałem kod",
}: {
  code: string;
  onClose: () => void;
  title?: string;
  confirmLabel?: string;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kod skopiowany do schowka");
    } catch {
      toast.error("Nie udało się skopiować — przepisz kod ręcznie");
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex items-start gap-3 rounded-xl bg-secondary p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p className="min-w-0 text-sm">
          To jedyny moment, w którym widzisz ten kod. Bez niego nie odzyskasz dostępu do konta po
          zapomnieniu hasła — zapisz go w bezpiecznym miejscu.
        </p>
      </div>

      <div className="rounded-xl bg-secondary p-4 text-center">
        <KeyRound className="mx-auto h-6 w-6 text-primary" />
        <p className="mt-3 break-all font-mono text-2xl font-bold tracking-widest">{code}</p>
      </div>

      <button
        type="button"
        onClick={copy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"
      >
        <Copy className="h-4 w-4 shrink-0" /> Kopiuj kod
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
      >
        {confirmLabel}
      </button>
    </Modal>
  );
}
