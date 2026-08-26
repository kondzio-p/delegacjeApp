"use client";

// Makiety ekranów aplikacji na stronę powitalną.
//
// To odwzorowanie, nie zrzuty ekranu: te same tokeny kolorów, te same ikony
// i ten sam układ kart co w prawdziwych komponentach, ale bez sesji i bez bazy.
// Zrzut byłby martwy — nie przeskaluje się, nie przetłumaczy i rozjedzie się
// z aplikacją przy najbliższej zmianie stylów.
//
// Etykiety biorą się ze słownika, w większości z tych samych kluczy, których
// używają prawdziwe ekrany. Dzięki temu Ukrainiec oglądający stronę widzi
// aplikację po ukraińsku, a nie polskie zrzuty z ukraińskim opisem obok.
//
// Liczby NIE są wymyślone: pochodzą z konta pokazowego `pracownik1@godzio-demo.pl`
// i zgadzają się ze sobą tak, jak policzyłaby je aplikacja
// (zysk = wypłaty − koszty, stawka = wypłaty ÷ godziny).
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Clock,
  Coins,
  Download,
  FileDown,
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

import { useT } from "@/components/locale-provider";
import { useFormat } from "@/components/use-format";
import { formatHours, intlLocale } from "@/lib/money";

/** Dni, z których pochodzą dane pokazowe — formatowane wg języka odwiedzającego. */
const DAY = {
  entry: "2026-08-25T12:00:00.000Z",
  entryBefore: "2026-08-24T12:00:00.000Z",
  departure: "2026-08-20T04:30:00.000Z",
  rate: "2026-08-21T12:00:00.000Z",
  advance: "2026-08-22T12:00:00.000Z",
  lodging: "2026-07-08T12:00:00.000Z",
  fuel: "2026-07-06T12:00:00.000Z",
};
const MONTH = "2026-08";
const COMPANY = "Kowalski Logistyka";

/* ---------------------------------------------------------------- ramka */

/** Obudowa telefonu — sam chrom, zawartość wstawia wywołujący. */
export function Phone({ title, children }: { title: string; children: ReactNode }) {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-[19rem] rounded-[2.25rem] border-[6px] border-foreground/85 bg-background shadow-2xl shadow-primary/20">
      <div className="overflow-hidden rounded-[1.75rem]">
        {/* Pasek aplikacji: hamburger, powitanie z tytułem, wybór języka. */}
        <div className="grid h-14 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center border-b border-border bg-card px-2">
          <Menu className="h-5 w-5 text-foreground" />
          <div className="min-w-0 text-center">
            <p className="truncate text-[0.6rem] leading-tight text-muted-foreground">
              {t("shell.greeting", { name: "Tomasz" })}
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------- ekrany */

/** Ekran „Godziny Pracy" — formularz i lista wpisów. */
export function HoursScreen() {
  const t = useT();
  const fmt = useFormat();

  const entries = [DAY.entry, DAY.entryBefore];

  return (
    <>
      <div className="space-y-2 rounded-2xl bg-card p-3">
        <Field
          label={t("common.trip")}
          value={fmt.trip({ departure_at: DAY.departure, return_at: null })}
        />
        <Field label={t("common.date")} value={fmt.date(DAY.entry)} />
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("common.from")} value="06:30" />
          <Field label={t("common.to")} value="16:00" />
        </div>
        <div className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[0.75rem] font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> {t("hours.add")}
        </div>
      </div>

      <p className="rounded-2xl bg-card px-3 py-2 text-[0.65rem] text-muted-foreground">
        {t("hours.totalWorked")}{" "}
        <span className="font-semibold text-foreground">{formatHours(171)}</span>
      </p>

      {entries.map((day) => (
        <div key={day} className="flex items-center gap-2 rounded-2xl bg-card p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.7rem] font-semibold">{fmt.date(day)} · 06:30–16:00</p>
            <p className="truncate text-[0.65rem] text-muted-foreground">{formatHours(9.5)}</p>
          </div>
        </div>
      ))}
    </>
  );
}

/** Ekran pulpitu pracownika — trzy sekcje kafelków, jak w aplikacji. */
export function DashboardScreenMock() {
  const t = useT();
  const fmt = useFormat();

  return (
    <>
      <SectionLabel>{t("dash.timeTitle")}</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Clock className="h-4 w-4 text-primary" />}
          label={t("dash.workedHours")}
          value={formatHours(171)}
        />
        <Stat
          icon={<Plane className="h-4 w-4 text-primary" />}
          label={t("dash.timeAway")}
          value={t("tripDetail.durationValue", { days: 25, hours: 13 })}
        />
      </div>

      <SectionLabel>{t("dash.moneyTitle")}</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<ArrowUpCircle className="h-4 w-4 text-success" />}
          label={t("dash.totalPayouts")}
          value={fmt.money(14242.37, "PLN")}
        />
        <Stat
          icon={<ArrowDownCircle className="h-4 w-4 text-destructive" />}
          label={t("dash.totalExpenses")}
          value={fmt.money(4326.75, "PLN")}
        />
        <Stat
          wide
          tone="success"
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          label={t("dash.netProfit")}
          value={fmt.money(9915.62, "PLN")}
        />
      </div>

      <SectionLabel>{t("dash.ratesTitle")}</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Coins className="h-4 w-4 text-accent" />}
          label={t("dash.realHourlyWork")}
          value={fmt.money(83.29, "PLN")}
        />
        <Stat
          icon={<Coins className="h-4 w-4 text-accent" />}
          label={t("dash.realHourlyLife")}
          value={fmt.money(16.19, "PLN")}
        />
      </div>
    </>
  );
}

/** Ekran finansów — kurs zamrożony na dzień operacji i historia transakcji. */
export function FinanceScreenMock() {
  const t = useT();
  const fmt = useFormat();

  const rows = [
    {
      title: t("finance.notePlaceholder"),
      subtitle: fmt.date(DAY.advance),
      amount: 1200,
      positive: true,
    },
    {
      title: t("landing.mockLodging"),
      subtitle: `${t("landing.catLodging")} · ${fmt.date(DAY.lodging)}`,
      amount: 540,
      positive: false,
    },
    {
      title: t("landing.mockFuel"),
      subtitle: `${t("landing.catFuel")} · ${fmt.date(DAY.fuel)}`,
      amount: 84.5,
      positive: false,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <div className="rounded-lg bg-destructive py-2 text-center text-[0.75rem] font-semibold text-destructive-foreground">
          {t("finance.expense")}
        </div>
        <div className="py-2 text-center text-[0.75rem] font-semibold text-muted-foreground">
          {t("finance.payout")}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-3">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
          <Coins className="h-4 w-4 shrink-0 text-accent" />
          <p className="min-w-0 text-[0.62rem] leading-tight text-muted-foreground">
            {t("landing.mockRateNote", { rate: "4,3122", date: fmt.date(DAY.rate) })}
          </p>
        </div>
      </div>

      <SectionLabel>{t("finance.history")}</SectionLabel>
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
            {row.positive ? "+" : "-"}
            {fmt.money(row.amount, "EUR")}
          </p>
        </div>
      ))}
    </>
  );
}

/** Ekran „Pracownicy" widziany przez właściciela. */
export function EmployeesScreenMock() {
  const t = useT();
  const fmt = useFormat();

  const team = [
    { name: "Tomasz Nowak", hours: 47.5, away: true },
    { name: "Piotr Wiśniewski", hours: 90, away: false },
  ];

  return (
    <>
      <div className="rounded-2xl bg-card p-3">
        <p className="text-[0.6rem] text-muted-foreground">{t("employees.company")}</p>
        <p className="mt-0.5 text-[0.85rem] font-semibold">{COMPANY}</p>
      </div>

      <p className="flex items-center gap-1 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
        <UserPlus className="h-3 w-3" /> {t("employees.requests", { count: 1 })}
      </p>
      <div className="rounded-2xl bg-card p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.7rem] font-semibold">Andrij Melnyk</p>
            <p className="truncate text-[0.6rem] text-muted-foreground">
              andrij@godzio-demo.pl
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex h-8 items-center justify-center gap-1 rounded-xl bg-success text-[0.68rem] font-semibold text-success-foreground">
            <Check className="h-3.5 w-3.5" /> {t("employees.accept")}
          </div>
          <div className="flex h-8 items-center justify-center gap-1 rounded-xl bg-secondary text-[0.68rem] font-semibold text-destructive">
            <X className="h-3.5 w-3.5" /> {t("employees.reject")}
          </div>
        </div>
      </div>

      <SectionLabel>{t("employees.team", { count: 2 })}</SectionLabel>
      {team.map((person) => (
        <div key={person.name} className="flex items-center gap-2 rounded-2xl bg-card p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <UserRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-[0.7rem] font-semibold">{person.name}</p>
              {person.away ? (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-px text-[0.55rem] font-medium text-success">
                  <Plane className="h-2.5 w-2.5" /> {t("employees.onTrip")}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-secondary px-1.5 py-px text-[0.55rem] text-muted-foreground">
                  {t("employees.atHome")}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.62rem] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground">{formatHours(person.hours)}</span>
              <span className="truncate">· {fmt.month(MONTH)}</span>
            </p>
          </div>
        </div>
      ))}
    </>
  );
}

/** Ekran „Moja firma" — podsumowanie okresu i wejście do raportu. */
export function CompanyScreenMock() {
  const t = useT();
  const fmt = useFormat();

  return (
    <>
      <div className="rounded-2xl bg-card p-3">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-[0.85rem] font-semibold">{COMPANY}</p>
        </div>
        <p className="mt-0.5 text-[0.6rem] text-muted-foreground">{t("company.founder")}</p>
      </div>

      <Stat
        wide
        icon={<Wallet className="h-4 w-4 text-success" />}
        label={t("company.payoutsInPeriod", { period: fmt.month(MONTH) })}
        value={fmt.money(8186.21, "PLN")}
      />
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Clock className="h-4 w-4 text-primary" />}
          label={t("company.teamHours")}
          value={formatHours(128)}
        />
        <Stat
          icon={<Plane className="h-4 w-4 text-accent" />}
          label={t("company.onTrip")}
          value="1"
        />
        <Stat
          wide
          icon={<Coins className="h-4 w-4 text-accent" />}
          label={t("company.avgHourly")}
          value={fmt.money(63.95, "PLN")}
        />
      </div>

      <div className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[0.75rem] font-semibold text-primary-foreground">
        {t("company.report")}
      </div>
    </>
  );
}

/** Raport dla księgowej — pokazany jako dokument, bo tak się go używa. */
export function ReportCard() {
  const t = useT();
  const fmt = useFormat();

  const rows = [
    { name: "Tomasz Nowak", hours: 47.5, paid: 2585.21 },
    { name: "Piotr Wiśniewski", hours: 90, paid: 5601.0 },
  ];

  // Same liczby, bez symbolu waluty — walutę niesie nagłówek kolumny,
  // dokładnie tak jak w prawdziwym raporcie.
  const number = (value: number) =>
    new Intl.NumberFormat(intlLocale(fmt.locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">{t("company.printTitle")}</p>
        <p className="text-xs text-muted-foreground">
          {COMPANY} · {fmt.month(MONTH)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-5 py-2 font-medium">{t("company.colEmployee")}</th>
              <th className="px-5 py-2 text-right font-medium">{t("company.hours")}</th>
              <th className="px-5 py-2 text-right font-medium">
                {t("company.paidOutIn", { currency: "PLN" })}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border/60">
                <td className="px-5 py-2.5">{row.name}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{number(row.hours)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">{number(row.paid)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="px-5 py-2.5">{t("company.total")}</td>
              <td className="px-5 py-2.5 text-right tabular-nums">{number(137.5)}</td>
              <td className="px-5 py-2.5 text-right tabular-nums">{number(8186.21)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 border-t border-border px-5 py-4">
        <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold">
          <Download className="h-4 w-4" /> CSV
        </span>
        <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          <FileDown className="h-4 w-4" /> {t("company.generatePdf")}
        </span>
      </div>
    </div>
  );
}
