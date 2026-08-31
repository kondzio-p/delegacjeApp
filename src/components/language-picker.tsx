"use client";

import { Check, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

/**
 * Przełącznik języka interfejsu.
 *
 * `className` służy do marginesów i wyrównania, nie do pozycjonowania: korzeń
 * ma `relative` pod rozwijaną listę, a w CSS Tailwinda `.relative` wygrywa
 * z `.absolute`. Komponent, który ma gdzieś wisieć, trzeba opakować.
 *
 * Args:
 *     className (string): Klasy marginesów i wyrównania.
 *
 * Returns:
 *     ReactNode: Przycisk z aktualnym językiem i lista do rozwinięcia.
 */
export function LanguagePicker({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`no-print relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("shell.language")}
        title={t("shell.language")}
        className="flex h-11 w-11 items-center justify-center gap-1 rounded-xl text-foreground active:bg-secondary"
      >
        <Globe className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-[10px] font-semibold leading-none">{LOCALE_META[locale].short}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("shell.language")}
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(code)}
                  className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm ${
                    active ? "font-semibold text-primary" : "text-foreground active:bg-secondary"
                  }`}
                >
                  <span aria-hidden className="shrink-0 text-base leading-none">
                    {LOCALE_META[code].flag}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{LOCALE_META[code].native}</span>
                  {active && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
