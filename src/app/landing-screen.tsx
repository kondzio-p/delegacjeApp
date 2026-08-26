"use client";

// Strona powitalna pod adresem głównym.
//
// Dwie ścieżki narracji przełączane u góry: pracownik na delegacji i właściciel
// firmy. To dwie różne osoby z dwoma różnymi problemami — pracownik chce
// wiedzieć, ile zostaje mu na rękę, właściciel chce wiedzieć, ile przepracowali
// jego ludzie. Wspólny landing bez tego rozdziału mówiłby obu naraz i żadnemu
// do końca.
//
// Animacje: GSAP ze ScrollTriggerem, ale wyłącznie jako podkreślenie treści.
// Przy `prefers-reduced-motion` nie odpalamy ich wcale — strona ma być
// czytelna także wtedy, gdy nic się nie rusza.
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  Clock,
  Coins,
  Download,
  FileDown,
  Globe,
  Link2,
  LogIn,
  Plane,
  Share2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  CompanyScreenMock,
  DashboardScreenMock,
  EmployeesScreenMock,
  FinanceScreenMock,
  HoursScreen,
  Phone,
} from "./landing-phone";

type Role = "pracownik" | "wlasciciel";

/* ------------------------------------------------------------ animacje */

/** Czy użytkownik prosił o ograniczenie ruchu na stronie. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Liczba odliczana od zera, gdy wjedzie w kadr.
 *
 * Format bierzemy z `Intl`, żeby separator tysięcy i przecinek dziesiętny
 * zgadzały się z tym, co pokazuje aplikacja.
 */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const format = (value: number) =>
      new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(Math.round(value));

    if (prefersReducedMotion()) {
      node.textContent = format(to) + suffix;
      return;
    }

    let cancelled = false;
    void (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const counter = { value: 0 };
      gsap.to(counter, {
        value: to,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: node, start: "top 90%", once: true },
        onUpdate: () => {
          node.textContent = format(counter.value) + suffix;
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [to, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      0{suffix}
    </span>
  );
}

/** Wjazd elementów oznaczonych `data-reveal` w obrębie sekcji. */
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

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/logowanie?tryb=rejestracja"
      className={`flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] ${className}`}
    >
      Załóż konto — za darmo <ArrowRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}

function SecondaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/logowanie"
      className={`flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-base font-semibold transition-colors active:bg-secondary ${className}`}
    >
      <LogIn className="h-5 w-5 shrink-0" /> Mam już konto
    </Link>
  );
}

/** Jeden krok narracji: opis z jednej strony, makieta telefonu z drugiej. */
function Step({
  index,
  title,
  lead,
  points,
  phoneTitle,
  children,
  flip,
}: {
  index: number;
  title: string;
  lead: string;
  points: string[];
  phoneTitle: string;
  children: ReactNode;
  flip?: boolean;
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
        <Phone title={phoneTitle}>{children}</Phone>
      </div>
    </div>
  );
}

/** Raport dla księgowej — pokazany jako dokument, bo tak się go używa. */
function ReportCard() {
  const rows = [
    { name: "Tomasz Nowak", hours: "47,50", paid: "2 585,21" },
    { name: "Piotr Wiśniewski", hours: "90,00", paid: "5 601,00" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">Zestawienie wynagrodzeń</p>
        <p className="text-xs text-muted-foreground">Kowalski Logistyka · sierpień 2026</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-medium">Pracownik</th>
              <th className="px-5 py-2 text-right font-medium">Godziny</th>
              <th className="px-5 py-2 text-right font-medium">Wypłacono (PLN)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border/60">
                <td className="px-5 py-2.5">{row.name}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{row.hours}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{row.paid}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="px-5 py-2.5">Razem</td>
              <td className="px-5 py-2.5 text-right tabular-nums">137,50</td>
              <td className="px-5 py-2.5 text-right tabular-nums">8 186,21</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 border-t border-border px-5 py-4">
        <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold">
          <Download className="h-4 w-4" /> CSV
        </span>
        <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          <FileDown className="h-4 w-4" /> PDF
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- strona */

const FEATURES = [
  {
    icon: ArrowRightLeft,
    title: "Kurs NBP z dnia operacji",
    text: "Każdy wpis pamięta kurs ze swojego dnia. Podsumowanie sprzed pół roku wygląda dziś tak samo.",
  },
  {
    icon: Coins,
    title: "Złotówki, euro i dolary",
    text: "Wpisujesz w walucie, w której płacisz. Oglądasz w tej, w której myślisz.",
  },
  {
    icon: Globe,
    title: "Cztery języki",
    text: "Polski, ukraiński, niemiecki i angielski — wybór idzie za kontem, nie za przeglądarką.",
  },
  {
    icon: FileDown,
    title: "Eksport do CSV i PDF",
    text: "Zestawienie dla księgowej albo własne dane do arkusza. Bez przepisywania ręcznie.",
  },
  {
    icon: Link2,
    title: "Podsumowanie linkiem",
    text: "Wyślij rodzinie albo szefowi podsumowanie wyjazdu. Odbiorca nie musi zakładać konta.",
  },
  {
    icon: Smartphone,
    title: "Działa jak aplikacja",
    text: "Dodaj do ekranu głównego telefonu i otwieraj jednym kliknięciem, bez sklepu z aplikacjami.",
  },
];

export function LandingScreen() {
  const [role, setRole] = useState<Role>("pracownik");
  const scope = useRef<HTMLDivElement>(null);
  useReveal(scope);

  return (
    <div ref={scope} className="min-h-screen bg-background text-foreground">
      {/* --------------------------------------------------------- pasek */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
              <Clock className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="truncate text-lg font-bold">Godzio</span>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/logowanie"
              className="flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold hover:bg-secondary sm:px-4"
            >
              Zaloguj się
            </Link>
            <Link
              href="/logowanie?tryb=rejestracja"
              className="flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground sm:px-5"
            >
              Załóż konto
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background"
        />
        <div
          data-reveal-group
          className="relative mx-auto w-full max-w-6xl px-4 py-14 text-center sm:py-20"
        >
          <p
            data-reveal
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Plane className="h-3.5 w-3.5" /> Dla pracujących za granicą i małych firm
          </p>

          <h1
            data-reveal
            className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          >
            Ile naprawdę zostaje Ci z delegacji?
          </h1>

          <p
            data-reveal
            className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Wpisujesz godziny i wydatki. Godzio przelicza je po kursie NBP z dnia operacji
            i pokazuje, ile zostaje na rękę. Twój szef widzi godziny i wypłaty — koszty zostają
            Twoje.
          </p>

          <div
            data-reveal
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <PrimaryCta className="sm:flex-1" />
            <SecondaryCta className="sm:flex-1" />
          </div>

          {/* Liczby z konta demo — nie okrągłe, bo prawdziwe. */}
          <div
            data-reveal
            className="mx-auto mt-12 grid w-full max-w-2xl grid-cols-3 gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-6 sm:p-6"
          >
            {[
              { value: <CountUp to={171} suffix=" h" />, label: "przepracowanych godzin" },
              { value: <CountUp to={14242} suffix=" zł" />, label: "wypłat z wyjazdu" },
              { value: <CountUp to={9916} suffix=" zł" />, label: "zostało na rękę" },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-lg font-bold tabular-nums text-primary sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-1 text-[0.7rem] leading-tight text-muted-foreground sm:text-xs">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <p data-reveal className="mt-3 text-xs text-muted-foreground">
            Prawdziwe liczby z konta pokazowego — jeden wyjazd do Niemiec.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ przełącznik ról */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            {(
              [
                { key: "pracownik", label: "Jestem pracownikiem", icon: Clock },
                { key: "wlasciciel", label: "Prowadzę firmę", icon: Wallet },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRole(option.key)}
                aria-pressed={role === option.key}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  role === option.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <option.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{option.label}</span>
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
              title="Wpisz godziny — 15 sekund dziennie"
              lead="Data, od której do której. Nic więcej. Sumę aplikacja policzy sama, także dla zmiany, która przechodzi przez północ."
              points={[
                "Wpis przypisujesz do wyjazdu albo zostawiasz luzem",
                "Zmiana 22:00–06:00 to osiem godzin, nie minus szesnaście",
                "Poprawisz każdy wpis później, także wstecz",
              ]}
              phoneTitle="Godziny Pracy"
            >
              <HoursScreen />
            </Step>

            <Step
              flip
              index={2}
              title="Zobacz, ile zostaje na rękę"
              lead="Wypłaty minus koszty, przeliczone po kursie NBP z dnia każdej operacji — nie po dzisiejszym. Dlatego podsumowanie sprzed pół roku wygląda dziś tak samo."
              points={[
                "Realna stawka za godzinę pracy — policzona z tego, co wpłynęło",
                "Realna stawka za godzinę życia na wyjeździe, razem z czasem wolnym",
                "Koszty w rozbiciu na paliwo, jedzenie i zakwaterowanie",
              ]}
              phoneTitle="Dashboard"
            >
              <DashboardScreenMock />
            </Step>

            <Step
              index={3}
              title="Twoje koszty zostają Twoje"
              lead="Właściciel firmy widzi Twoje godziny i wypłaty — bo sam je wypłacił. Paliwo, jedzenie i kwatera to Twoja prywatna sprawa i nikt poza Tobą ich nie zobaczy."
              points={[
                "Kurs zamrożony przy wpisie — historia się nie zmienia",
                "Wydatek wpiszesz wieczorem, z datą sprzed tygodnia",
                "Wszystkie swoje dane pobierzesz do CSV albo JSON",
              ]}
              phoneTitle="Finanse"
            >
              <FinanceScreenMock />
            </Step>
          </>
        ) : (
          <>
            <Step
              index={1}
              title="Pracownicy dołączają sami"
              lead="Podajesz im dokładną nazwę firmy, oni wpisują ją u siebie w ustawieniach. Ty dostajesz prośbę i decydujesz jednym kliknięciem."
              points={[
                "Żadnego zakładania kont za kogoś ani rozsyłania haseł",
                "Możesz dopisać współwłaściciela — wspólnika albo księgową",
                "Pracownik, który odchodzi, zabiera konto; jego godziny zostają w rozliczeniu",
              ]}
              phoneTitle="Pracownicy"
            >
              <EmployeesScreenMock />
            </Step>

            <Step
              flip
              index={2}
              title="Widzisz godziny swoich ludzi"
              lead="Kto ile przepracował w wybranym okresie, kto jest teraz na wyjeździe, kiedy zrobił ostatni wpis. Wypłaty przeliczone na złotówki po kursach z dni, w których poszły."
              points={[
                "Dowolny zakres dat, nie tylko pełne miesiące",
                "Podgląd karty pojedynczego pracownika z podziałem na wyjazdy",
                "Zapomniany wpis dopiszesz pracownikowi sam",
              ]}
              phoneTitle="Moja firma"
            >
              <CompanyScreenMock />
            </Step>

            <div data-reveal-group className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16">
              <div>
                <span
                  data-reveal
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                >
                  3
                </span>
                <h3 data-reveal className="mt-4 text-2xl font-bold sm:text-3xl">
                  Raport dla księgowej w dwóch kliknięciach
                </h3>
                <p data-reveal className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Gotowe zestawienie osób, godzin i wypłat za wybrany okres. Liczby możesz
                  poprawić przed wydrukiem — korekta dotyczy tylko tego dokumentu i nie rusza
                  danych w aplikacji.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "CSV otwiera się w polskim Excelu bez kombinowania z kodowaniem",
                    "PDF prosto z okna drukowania — bez dodatkowych programów",
                    "Raport w złotówkach, euro albo dolarach",
                  ].map((point) => (
                    <li key={point} data-reveal className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span className="min-w-0">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div data-reveal>
                <ReportCard />
              </div>
            </div>
          </>
        )}
      </main>

      {/* ------------------------------------------------------- cechy */}
      <section className="border-y border-border bg-secondary/40">
        <div data-reveal-group className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <h2 data-reveal className="text-center text-2xl font-bold sm:text-3xl">
            Reszta, która się przydaje
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
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
      <section data-reveal-group className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:py-20">
        <span
          data-reveal
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"
        >
          <ShieldCheck className="h-6 w-6 text-primary" />
        </span>
        <h2 data-reveal className="mt-5 text-2xl font-bold sm:text-3xl">
          Jasny podział, kto co widzi
        </h2>
        <p data-reveal className="mt-4 text-base leading-relaxed text-muted-foreground">
          Właściciel firmy widzi <strong className="text-foreground">godziny pracy i wypłaty</strong>{" "}
          swoich pracowników — to zapis rozliczenia, które sam prowadzi. Koszty, które pracownik
          ponosi z własnej kieszeni, <strong className="text-foreground">zostają prywatne</strong>{" "}
          i nie widzi ich nikt poza nim.
        </p>
        <div data-reveal className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { icon: UserPlus, text: "Konto zakładasz sam, w minutę, bez karty" },
            { icon: Share2, text: "Podsumowanie wyjazdu udostępniasz tylko, gdy chcesz" },
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
            Wpisz pierwszy dzień jeszcze dziś
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Konto jest darmowe, a pierwszy wpis zajmie Ci mniej czasu niż przeczytanie tego zdania.
          </p>
          <div
            data-reveal
            className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <PrimaryCta className="sm:flex-1" />
            <SecondaryCta className="sm:flex-1" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="font-semibold text-foreground">Godzio</span> — godziny pracy i wypłaty
          </p>
          <p>Kursy walut pochodzą z tabeli A Narodowego Banku Polskiego.</p>
        </div>
      </footer>
    </div>
  );
}
