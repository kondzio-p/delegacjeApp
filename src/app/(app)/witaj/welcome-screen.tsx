"use client";

import { Plane } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Pojawienie się, chwila pauzy i zniknięcie — razem tyle, ile trwa animacja. */
const WELCOME_MS = 2000;

export function WelcomeScreen({ name }: { name: string }) {
  const router = useRouter();

  useEffect(() => {
    // Dashboard ładuje się w tle, więc po animacji przejście jest natychmiastowe.
    router.prefetch("/");
    const timer = setTimeout(() => router.replace("/"), WELCOME_MS);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <button
      type="button"
      // Nikt nie musi czekać na animację — kliknięcie w ekran przechodzi dalej.
      onClick={() => router.replace("/")}
      aria-label="Przejdź do aplikacji"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-background px-6"
    >
      <div className="animate-welcome flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Plane className="h-8 w-8 text-primary-foreground" />
        </div>
        <p className="text-3xl font-bold text-foreground sm:text-4xl">
          Witaj, <span className="text-primary">{name}</span>
        </p>
      </div>
    </button>
  );
}
