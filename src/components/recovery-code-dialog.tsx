"use client";

import { Copy, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/locale-provider";

import { Modal } from "./ui";

/**
 * Pokazuje kod odzyskiwania dokładnie raz.
 *
 * W bazie leży wyłącznie hash kodu, więc nie ma sposobu, żeby wyświetlić go
 * później — stąd ostrzeżenie i przycisk kopiowania.
 *
 * Args:
 *     code (string): Kod do przepisania przez użytkownika.
 *     onClose (() => void): Wywołanie po potwierdzeniu.
 *     title (string): Nagłówek okna, gdy domyślny nie pasuje.
 *     confirmLabel (string): Napis na przycisku potwierdzenia.
 *
 * Returns:
 *     ReactNode: Okno modalne z kodem.
 */
export function RecoveryCodeDialog({
  code,
  onClose,
  title,
  confirmLabel,
}: {
  code: string;
  onClose: () => void;
  title?: string;
  confirmLabel?: string;
}) {
  const t = useT();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("recovery.copied"));
    } catch {
      toast.error(t("recovery.copyFailed"));
    }
  }

  return (
    <Modal title={title ?? t("recovery.title")} onClose={onClose}>
      <div className="flex items-start gap-3 rounded-xl bg-secondary p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <p className="min-w-0 text-sm">{t("recovery.warning")}</p>
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
        <Copy className="h-4 w-4 shrink-0" /> {t("recovery.copy")}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
      >
        {confirmLabel ?? t("recovery.confirm")}
      </button>
    </Modal>
  );
}
