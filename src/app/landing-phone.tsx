"use client";

// Makiety ekranów aplikacji na stronę powitalną.
//
// To odwzorowanie, nie zrzuty ekranu: te same tokeny kolorów, te same ikony
// i ten sam układ kart co w prawdziwych komponentach, ale bez sesji i bez bazy.
// Dzięki temu makieta skaluje się jak reszta strony, działa w obu motywach
// i da się ją animować — czego statyczny PNG nie potrafi.
//
// Liczby NIE są wymyślone: pochodzą z konta demo `pracownik1@godzio-demo.pl`
// i zgadzają się ze sobą tak, jak policzyłaby je aplikacja
// (zysk = wypłaty − koszty, stawka = wypłaty ÷ godziny).
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Clock,
  Coins,
  HeartPulse,
  Menu,
  Plane,
  Plus,
  TrendingUp,
  UserPlus,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

/* ---------------------------------------------------------------- ramka */

/** Obudowa telefonu — sam chrom, zawartość wstawia wywołujący. */
export function Phone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[19rem] rounded-[2.25rem] border-[6px] border-foreground/85 bg-background shadow-2xl shadow-primary/20">
      <div className="overflow-hidden rounded-[1.75rem]">
        {/* Pasek aplikacji: hamburger, powitanie z tytułem, wybór języka. */}
        <div className="grid h-14 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center border-b border-border bg-card px-2">
          <Menu className="h-5 w-5 text-foreground" />
          <div className="min-w-0 text-center">
            <p className="truncate text-[0.6rem] leading-tight text-muted-foreground">
              Witaj, Tomasz
            </p>
            <p className="truncate text-[0.8rem] font-semibold leading-tight">{title}</p>
          </div>
          <span className="justify-self-end text-sm">🇵🇱</span>
        </div>

        <div className="h-[26rem] space-y-2 overflow-hidden bg-background p-3">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- elementy */

/** Kafelek statystyki — odpowiednik `StatCard` z aplikacji. */
function Stat({
  icon,
  label,
  value,
  tone,
  wide,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "success" | "destructive";
  wide?: boolean;
}) {
  const color =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";

  return (
    <div className={`min-w-0 rounded-2xl bg-card p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-start gap-1.5">
        <span className="shrink-0">{icon}</span>
        <p className="min-w-0 text-[0.6rem] leading-tight text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-1.5 text-[0.95rem] font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <span className="text-[0.6rem] text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center rounded-xl border border-border bg-card px-3 text-[0.75rem] font-medium">
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- ekrany */

/** Ekran „Godziny Pracy" — formularz i lista wpisów. */
export function HoursScreen() {
  return (
    <>
      <div className="space-y-2 rounded-2xl bg-card p-3">
        <Field label="Podróż" value="20.08.2026 – w toku" />
        <Field label="Data" value="25.08.2026" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Od" value="06:30" />
          <Field label="Do" value="16:00" />
        </div>
        <div
          data-landing="hours-button"
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[0.75rem] font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Dodaj wpis
        </div>
      </div>

      <p className="rounded-2xl bg-card px-3 py-2 text-[0.65rem] text-muted-foreground">
        Razem przepracowane:{" "}
        <span className="font-semibold text-foreground">171 h 00 min</span>
      </p>

      {[
        { date: "25.08.2026", hours: "9 h 30 min" },
        { date: "24.08.2026", hours: "9 h 30 min" },
      ].map((entry) => (
        <div key={entry.date} className="flex items-center gap-2 rounded-2xl bg-card p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.7rem] font-semibold">{entry.date} · 06:30–16:00</p>
            <p className="truncate text-[0.65rem] text-muted-foreground">{entry.hours}</p>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Ekran pulpitu pracownika. Wartości liczbowe dostają `data-count`, żeby
 * strona mogła je odliczyć od zera przy przewinięciu.
 */
export function DashboardScreenMock() {
  return (
    <>
      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Czas
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Clock className="h-4 w-4 text-primary" />}
          label="Przepracowane godziny"
          value="171 h 00 min"
        />
        <Stat
          icon={<Plane className="h-4 w-4 text-primary" />}
          label="Czas na wyjeździe"
          value="25 dni 13 h"
        />
      </div>

      <p className="pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Pieniądze
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<ArrowUpCircle className="h-4 w-4 text-success" />}
          label="Suma wypłat"
          value="14 242,37 zł"
        />
        <Stat
          icon={<ArrowDownCircle className="h-4 w-4 text-destructive" />}
          label="Suma kosztów"
          value="4 326,75 zł"
        />
        <Stat
          wide
          tone="success"
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          label="Czysty zysk (wypłaty − koszty)"
          value="9 915,62 zł"
        />
      </div>

      <p className="pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Realne stawki
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Coins className="h-4 w-4 text-accent" />}
          label="Realna stawka za godzinę pracy"
          value="83,29 zł"
        />
        <Stat
          icon={<HeartPulse className="h-4 w-4 text-accent" />}
          label="Za godzinę życia na wyjeździe"
          value="16,19 zł"
        />
      </div>
    </>
  );
}

/** Ekran finansów — koszt z kursem zamrożonym na dzień operacji. */
export function FinanceScreenMock() {
  const rows = [
    {
      title: "Zaliczka od szefa",
      subtitle: "22.08.2026",
      amount: "+1 200,00 €",
      positive: true,
    },
    {
      title: "Kwatera pracownicza",
      subtitle: "Zakwaterowanie · 08.07.2026",
      amount: "-540,00 €",
      positive: false,
    },
    {
      title: "Tankowanie w drodze",
      subtitle: "Paliwo · 06.07.2026",
      amount: "-84,50 €",
      positive: false,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <div className="rounded-lg bg-destructive py-2 text-center text-[0.75rem] font-semibold text-destructive-foreground">
          Koszt
        </div>
        <div className="py-2 text-center text-[0.75rem] font-semibold text-muted-foreground">
          Wypłata
        </div>
      </div>

      <div className="rounded-2xl bg-card p-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Coins className="h-4 w-4 shrink-0 text-accent" />
          <p className="min-w-0 text-[0.62rem] leading-tight text-muted-foreground">
            Kurs NBP <span className="font-semibold text-foreground">4,3122</span> z dnia
            21.08.2026 — zamrożony przy wpisie
          </p>
        </div>
      </div>

      <p className="pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Historia transakcji
      </p>
      {rows.map((row) => (
        <div key={row.title} className="flex items-center gap-2 rounded-2xl bg-card p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            {row.positive ? (
              <ArrowUpCircle className="h-4 w-4 text-success" />
            ) : (
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.7rem] font-semibold">{row.title}</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">{row.subtitle}</p>
          </div>
          <p
            className={`shrink-0 text-[0.7rem] font-bold tabular-nums ${
              row.positive ? "text-success" : "text-destructive"
            }`}
          >
            {row.amount}
          </p>
        </div>
      ))}
    </>
  );
}

/** Ekran „Pracownicy" widziany przez właściciela. */
export function EmployeesScreenMock() {
  return (
    <>
      <div className="rounded-2xl bg-card p-3">
        <p className="text-[0.6rem] text-muted-foreground">Firma</p>
        <p className="mt-0.5 text-[0.85rem] font-semibold">Kowalski Logistyka</p>
      </div>

      <p className="flex items-center gap-1 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        <UserPlus className="h-3 w-3" /> Prośby o dołączenie (1)
      </p>
      <div className="rounded-2xl bg-card p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.7rem] font-semibold">Andrij Melnyk</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">
              oczekujacy@godzio-demo.pl
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex h-8 items-center justify-center gap-1 rounded-xl bg-success text-[0.68rem] font-semibold text-success-foreground">
            <Check className="h-3.5 w-3.5" /> Akceptuj
          </div>
          <div className="flex h-8 items-center justify-center gap-1 rounded-xl bg-secondary text-[0.68rem] font-semibold text-destructive">
            <X className="h-3.5 w-3.5" /> Odrzuć
          </div>
        </div>
      </div>

      <p className="pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Zespół (2)
      </p>
      {[
        { name: "Tomasz Nowak", hours: "47 h 30 min", away: true },
        { name: "Piotr Wiśniewski", hours: "90 h 00 min", away: false },
      ].map((person) => (
        <div key={person.name} className="flex items-center gap-2 rounded-2xl bg-card p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-[0.7rem] font-semibold">{person.name}</p>
              {person.away ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-px text-[0.55rem] font-medium text-success">
                  <Plane className="h-2.5 w-2.5" /> na wyjeździe
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-secondary px-1.5 py-px text-[0.55rem] text-muted-foreground">
                  w kraju
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.62rem] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground">{person.hours}</span>
              <span className="truncate">· sierpień 2026</span>
            </p>
          </div>
        </div>
      ))}
    </>
  );
}

/** Ekran „Moja firma" — podsumowanie okresu i raport dla księgowej. */
export function CompanyScreenMock() {
  return (
    <>
      <div className="rounded-2xl bg-card p-3">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-[0.85rem] font-semibold">Kowalski Logistyka</p>
        </div>
        <p className="mt-0.5 text-[0.6rem] text-muted-foreground">Jesteś założycielem</p>
      </div>

      <Stat
        wide
        icon={<Wallet className="h-4 w-4 text-success" />}
        label="Wypłaty w okresie · sierpień 2026"
        value="8 186,21 zł"
      />
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Clock className="h-4 w-4 text-primary" />}
          label="Łączne godziny zespołu"
          value="128 h 00 min"
        />
        <Stat
          icon={<Plane className="h-4 w-4 text-accent" />}
          label="Na wyjeździe"
          value="1"
        />
        <Stat
          wide
          icon={<Coins className="h-4 w-4 text-accent" />}
          label="Średnio za godzinę pracy zespołu"
          value="63,95 zł"
        />
      </div>

      <div className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[0.75rem] font-semibold text-primary-foreground">
        Raport dla księgowej
      </div>
    </>
  );
}
