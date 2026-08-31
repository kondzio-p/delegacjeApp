"use client";

import { Compass } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LanguagePicker } from "@/components/language-picker";
import { useT } from "@/components/locale-provider";
import { DASHBOARD_PATH } from "@/lib/routes";

/** Tyle samo trwa animacja paska w `globals.css`. */
const REDIRECT_MS = 3000;

/**
 * Ekran pokazywany pod nieznanym adresem.
 *
 * Pasek odlicza trzy sekundy i przenosi dalej: zalogowanego do aplikacji,
 * resztę na stronę główną. Cel jest też zwykłym odnośnikiem, więc kto nie chce
 * czekać, klika od razu, a kto ma wyłączone skrypty, i tak wyjdzie stąd o własnych siłach.
 *
 * Args:
 *     target (string): Ścieżka, na którą przenosimy po odliczeniu.
 *
 * Returns:
 *     ReactNode: Pełnoekranowy komunikat 404 z paskiem postępu.
 */
export function NotFoundScreen({ target }: { target: string }) {
  const t = useT();
  const router = useRouter();
  const toApp = target === DASHBOARD_PATH;

  useEffect(() => {
    // Cel ładuje się w tle, więc po odliczeniu przejście jest natychmiastowe.
    router.prefetch(target);
    const timer = setTimeout(() => router.replace(target), REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [router, target]);

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <header className="flex justify-end">
        <LanguagePicker />
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Image
              src="/logo-mark.png"
              alt=""
              width={56}
              height={56}
              priority
              className="h-14 w-14"
            />
            <h1 className="text-2xl font-bold text-foreground">Godzio</h1>
          </div>

          <div className="rounded-2xl bg-card p-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <Compass className="h-7 w-7 text-primary" />
            </div>

            <p
              aria-hidden
              className="mt-4 text-5xl font-bold tabular-nums tracking-tight text-muted-foreground/40"
            >
              404
            </p>

            <h2 className="mt-2 text-lg font-semibold text-foreground">{t("notFound.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("notFound.lead")}</p>

            <div className="mt-6 space-y-2" aria-live="polite">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="animate-progress h-full w-full rounded-full bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                {toApp ? t("notFound.redirectApp") : t("notFound.redirectHome")}
              </p>
            </div>

            <Link
              href={target}
              replace
              className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              {toApp ? t("notFound.goApp") : t("notFound.goHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
