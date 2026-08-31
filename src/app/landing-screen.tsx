"use client";

// Strona powitalna: dwie ścieżki narracji — pracownik i właściciel firmy.
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  Clock,
  Coins,
  FileDown,
  Globe,
  Link2,
  LogIn,
  Share2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useT, type Translate } from "@/components/locale-provider";
import { useFormat } from "@/components/use-format";
import { formatHours } from "@/lib/money";

import {
  CompanyScreenMock,
  DashboardScreenMock,
  EmployeesScreenMock,
  FinanceScreenMock,
  HoursScreen,
  Phone,
  ReportCard,
} from "./landing-phone";

type Role = "pracownik" | "wlasciciel";

/* ------------------------------------------------------------ animacje */

/**
 * Sprawdza, czy użytkownik prosił o ograniczenie ruchu.
 *
 * Returns:
 *     boolean: True, gdy animacje mają się nie odpalać.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Liczba odliczana od zera, gdy wjedzie w kadr.
 *
 * Wartość końcowa jest w markupie od razu, a animacja tylko chwilowo ją
 * podmienia — przy odwrotnej kolejności strona bez skryptów chwaliłaby się
 * zerem, czyli kłamała w miejscu, które ma budować zaufanie.
 *
 * Args:
 *     to (number): Wartość docelowa licznika.
 *     text (string): Gotowy napis z serwera, pokazywany po animacji.
 *
 * Returns:
 *     ReactNode: Element z animowaną liczbą.
 */
function CountUp({ to, text }: { to: number; text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      // W trakcie animacji liczy się rytm, nie precyzja — pełny napis wraca
      // na końcu.
      const counter = { value: 0 };
      const tween = gsap.to(counter, {
        value: to,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: node, start: "top 90%", once: true },
        onUpdate: () => {
          node.textContent = String(Math.round(counter.value));
        },
        onComplete: () => {
          node.textContent = text;
        },
      });

      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        node.textContent = text;
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [to, text]);

  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  );
}

/**
 * Animuje wjazd elementów oznaczonych `data-reveal`.
 *
 * Args:
 *     scope (React.RefObject<HTMLElement | null>): Sekcja, w której szukamy
 *         elementów do animowania.
 *
 * Returns:
 *     void: Nic — efekt sprząta po sobie przy odmontowaniu.
 */
function useReveal(scope: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root || prefersReducedMotion()) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        for (const group of gsap.utils.toArray<HTMLElement>("[data-reveal-group]")) {
          gsap.from(group.querySelectorAll("[data-reveal]"), {
            opacity: 0,
            y: 28,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: { trigger: group, start: "top 80%", once: true },
          });
        }
      }, root);

      cleanup = () => context.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [scope]);
}

/* -------------------------------------------------------------- klocki */

function PrimaryCta({ t, className = "" }: { t: Translate; className?: string }) {
  return (
    <Link
      href="/logowanie?tryb=rejestracja"
      className={`flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] ${className}`}
    >
      {t("landing.ctaPrimary")} <ArrowRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}

function SecondaryCta({ t, className = "" }: { t: Translate; className?: string }) {
  return (
    <Link
      href="/logowanie"
      className={`flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-base font-semibold transition-colors active:bg-secondary ${className}`}
    >
      <LogIn className="h-5 w-5 shrink-0" /> {t("landing.ctaSecondary")}
    </Link>
  );
}

/**
 * Jeden krok narracji: opis z jednej strony, makieta z drugiej.
 *
 * Args:
 *     index (number): Numer kroku pokazywany obok tytułu.
 *     title (string): Nagłówek kroku.
 *     lead (string): Zdanie wprowadzające.
 *     points (string[]): Wypunktowane szczegóły.
 *     flip (boolean): Odwraca kolejność opisu i makiety.
 *     children (ReactNode): Makieta telefonu.
 *
 * Returns:
 *     ReactNode: Sekcja jednego kroku.
 */
function Step({
  index,
  title,
  lead,
  points,
  flip,
  children,
}: {
  index: number;
  title: string;
  lead: string;
  points: string[];
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-reveal-group
      className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16"
    >
      <div className={flip ? "lg:order-2" : ""}>
        <span
          data-reveal
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          {index}
        </span>
        <h3 data-reveal className="mt-4 text-2xl font-bold sm:text-3xl">
          {title}
        </h3>
        <p data-reveal className="mt-3 text-base leading-relaxed text-muted-foreground">
          {lead}
        </p>
        <ul className="mt-5 space-y-2.5">
          {points.map((point) => (
            <li key={point} data-reveal className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span className="min-w-0">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-reveal className={flip ? "lg:order-1" : ""}>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- strona */

export function LandingScreen() {
  const t = useT();
  const fmt = useFormat();
  const [role, setRole] = useState<Role>("pracownik");
  const scope = useRef<HTMLDivElement>(null);
  useReveal(scope);

  const features = [
    { icon: ArrowRightLeft, title: t("landing.f1Title"), text: t("landing.f1Text") },
    { icon: Coins, title: t("landing.f2Title"), text: t("landing.f2Text") },
    { icon: Globe, title: t("landing.f3Title"), text: t("landing.f3Text") },
    { icon: FileDown, title: t("landing.f4Title"), text: t("landing.f4Text") },
    { icon: Link2, title: t("landing.f5Title"), text: t("landing.f5Text") },
    { icon: Smartphone, title: t("landing.f6Title"), text: t("landing.f6Text") },
  ];

  // Liczby z konta pokazowego, sformatowane w języku odwiedzającego.
  const stats = [
    { to: 171, text: formatHours(171), label: t("landing.statHours") },
    { to: 14242, text: fmt.money(14242, "PLN"), label: t("landing.statPayouts") },
    { to: 9916, text: fmt.money(9916, "PLN"), label: t("landing.statNet") },
  ];

  return (
    <div ref={scope} className="min-h-screen bg-background text-foreground">
      {/* --------------------------------------------------------- pasek */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo-mark.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 shrink-0 rounded-xl"
            />
            <span className="truncate text-lg font-bold">Godzio</span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/logowanie"
              className="flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold hover:bg-secondary sm:px-4"
            >
              {t("auth.submitLogin")}
            </Link>
            <Link
              href="/logowanie?tryb=rejestracja"
              className="flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground sm:px-5"
            >
              {t("auth.submitRegister")}
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/10 via-background to-background"
        />
        <div
          data-reveal-group
          className="relative mx-auto w-full max-w-6xl px-4 py-14 text-center sm:py-20"
        >
          <p
            data-reveal
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Clock className="h-3.5 w-3.5" /> {t("landing.eyebrow")}
          </p>

          <h1
            data-reveal
            className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          >
            {t("landing.headline")}
          </h1>

          <p
            data-reveal
            className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t("landing.lead")}
          </p>

          <div
            data-reveal
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <PrimaryCta t={t} className="sm:flex-1" />
            <SecondaryCta t={t} className="sm:flex-1" />
          </div>

          {/* Liczby z konta pokazowego — nie okrągłe, bo prawdziwe. */}
          <div
            data-reveal
            className="mx-auto mt-12 grid w-full max-w-2xl grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-6 sm:p-6"
          >
            {stats.map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-base font-bold tabular-nums text-primary sm:text-2xl">
                  <CountUp to={item.to} text={item.text} />
                </p>
                <p className="mt-1 text-[0.7rem] leading-tight text-muted-foreground sm:text-xs">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <p data-reveal className="mt-3 text-xs text-muted-foreground">
            {t("landing.statsNote")}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ przełącznik ról */}
      {/* Przełącznik decyduje o całej treści poniżej, więc ma wyglądać
          na klikalny, a długie etykiety ról zawijają się zamiast być ucinane. */}
      <div className="sticky top-16 z-30 border-b border-border bg-secondary/70 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-xl px-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("landing.roleSwitchTitle")}
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
            {(
              [
                { key: "pracownik", label: t("landing.roleWorker"), icon: Clock },
                { key: "wlasciciel", label: t("landing.roleOwner"), icon: Wallet },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRole(option.key)}
                aria-pressed={role === option.key}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-[0.8125rem] font-semibold leading-tight transition-colors sm:px-4 sm:text-sm ${
                  role === option.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <option.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 text-balance">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- narracja */}
      <main className="mx-auto w-full max-w-6xl px-4">
        {role === "pracownik" ? (
          <>
            <Step
              index={1}
              title={t("landing.w1Title")}
              lead={t("landing.w1Lead")}
              points={[t("landing.w1a"), t("landing.w1b"), t("landing.w1c")]}
            >
              <Phone title={t("nav.hours")}>
                <HoursScreen />
              </Phone>
            </Step>

            <Step
              flip
              index={2}
              title={t("landing.w2Title")}
              lead={t("landing.w2Lead")}
              points={[t("landing.w2a"), t("landing.w2b"), t("landing.w2c")]}
            >
              <Phone title={t("nav.dashboard")}>
                <DashboardScreenMock />
              </Phone>
            </Step>

            <Step
              index={3}
              title={t("landing.w3Title")}
              lead={t("landing.w3Lead")}
              points={[t("landing.w3a"), t("landing.w3b"), t("landing.w3c")]}
            >
              <Phone title={t("nav.finance")}>
                <FinanceScreenMock />
              </Phone>
            </Step>
          </>
        ) : (
          <>
            <Step
              index={1}
              title={t("landing.o1Title")}
              lead={t("landing.o1Lead")}
              points={[t("landing.o1a"), t("landing.o1b"), t("landing.o1c")]}
            >
              <Phone title={t("nav.employees")}>
                <EmployeesScreenMock />
              </Phone>
            </Step>

            <Step
              flip
              index={2}
              title={t("landing.o2Title")}
              lead={t("landing.o2Lead")}
              points={[t("landing.o2a"), t("landing.o2b"), t("landing.o2c")]}
            >
              <Phone title={t("nav.company")}>
                <CompanyScreenMock />
              </Phone>
            </Step>

            <Step
              index={3}
              title={t("landing.o3Title")}
              lead={t("landing.o3Lead")}
              points={[t("landing.o3a"), t("landing.o3b"), t("landing.o3c")]}
            >
              <ReportCard />
            </Step>
          </>
        )}
      </main>

      {/* ------------------------------------------------------- cechy */}
      <section className="border-y border-border bg-secondary/40">
        <div data-reveal-group className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <h2 data-reveal className="text-center text-2xl font-bold sm:text-3xl">
            {t("landing.featuresTitle")}
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                data-reveal
                className="min-w-0 rounded-2xl border border-border bg-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <feature.icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- prywatność */}
      <section
        data-reveal-group
        className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:py-20"
      >
        <span
          data-reveal
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"
        >
          <ShieldCheck className="h-6 w-6 text-primary" />
        </span>
        <h2 data-reveal className="mt-5 text-2xl font-bold sm:text-3xl">
          {t("landing.privacyTitle")}
        </h2>
        <p data-reveal className="mt-4 text-base leading-relaxed text-muted-foreground">
          {t("landing.privacyBody1")}
        </p>
        <p data-reveal className="mt-3 text-base font-medium leading-relaxed text-foreground">
          {t("landing.privacyBody2")}
        </p>
        <div data-reveal className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { icon: UserPlus, text: t("landing.privacyA") },
            { icon: Share2, text: t("landing.privacyB") },
          ].map((item) => (
            <p
              key={item.text}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm"
            >
              <item.icon className="h-5 w-5 shrink-0 text-accent" />
              <span className="min-w-0">{item.text}</span>
            </p>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- zamknięcie */}
      <section className="border-t border-border bg-primary/5">
        <div data-reveal-group className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:py-20">
          <h2 data-reveal className="text-3xl font-bold sm:text-4xl">
            {t("landing.finalTitle")}
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            {t("landing.finalLead")}
          </p>
          <div
            data-reveal
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <PrimaryCta t={t} className="sm:flex-1" />
            <SecondaryCta t={t} className="sm:flex-1" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <Image
                src="/logo-mark.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-lg"
              />
              <span className="font-semibold text-foreground">Godzio</span> —{" "}
              {t("landing.footerTagline")}
            </p>
            <p>{t("landing.footerNote")}</p>
          </div>

          {/* Grafika jest czarna na przezroczystym tle, więc w ciemnym
              motywie ratuje ją `dark:invert`. */}
          <div className="mt-6 flex justify-center border-t border-border pt-6 sm:justify-end">
            <Image
              src="/konradzkimedia.png"
              alt="Konradzki Media"
              width={582}
              height={171}
              className="h-6 w-auto opacity-70 dark:invert"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
