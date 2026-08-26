"use client";

import { Plane } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useT } from "@/components/locale-provider";
import { DASHBOARD_PATH } from "@/lib/routes";

/** Pojawienie się, chwila pauzy i zniknięcie — razem tyle, ile trwa animacja. */
const WELCOME_MS = 2000;

export function WelcomeScreen({ name }: { name: string }) {
  const t = useT();
  const router = useRouter();

  useEffect(() => {
    // Dashboard ładuje się w tle, więc po animacji przejście jest natychmiastowe.
    router.prefetch(DASHBOARD_PATH);
    const timer = setTimeout(() => router.replace(DASHBOARD_PATH), WELCOME_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <button
      type="button"
      // Nikt nie musi czekać na animację — kliknięcie w ekran przechodzi dalej.
      onClick={() => router.replace(DASHBOARD_PATH)}
      aria-label={t("welcome.enter")}
      className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-6"
    >
      <div className="animate-welcome flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Plane className="h-8 w-8 text-primary-foreground" />
        </div>
        <p className="text-3xl font-bold text-foreground sm:text-4xl">
          <span className="text-primary">{t("shell.greeting", { name })}</span>
        </p>
      </div>
    </button>
  );
}
