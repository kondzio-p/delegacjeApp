"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import type { Currency } from "@/lib/money";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function CurrencyToggle({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: Currency;
  onChange: (c: Currency) => void;
}) {
  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(["EUR", "PLN"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
              value === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </>
  );
}

/** Wysuwane okno modalne — na telefonie od dołu, na desktopie na środku. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-card p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Zamknij"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="text-sm font-medium text-destructive">{error}</p>;
  if (success) return <p className="text-sm font-medium text-success">{success}</p>;
  return null;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">{children}</p>
  );
}
