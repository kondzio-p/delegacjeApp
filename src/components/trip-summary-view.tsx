"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Clock,
  Coins,
  HeartPulse,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  formatDate,
  formatDateTime,
  formatHours,
  formatMoney,
  hoursBetween,
  type Currency,
} from "@/lib/money";
import type { TripSummary } from "@/lib/trip-summary";

export function StatCard({
  icon,
  label,
  value,
  positive,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-4">
      <div className="flex items-start gap-2">
        <span className="shrink-0">{icon}</span>
        <p className="min-w-0 text-xs leading-tight text-muted-foreground">{label}</p>
      </div>
      <p
        className={`mt-3 break-words text-lg font-bold tabular-nums sm:text-xl ${
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-success"
              : "text-destructive"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Siatka kafelków ze statystykami — identyczna dla właściciela i obserwatora. */
export function TripStatsGrid({ summary, display }: { summary: TripSummary; display: Currency }) {
  return (
    <section className="mt-4 grid grid-cols-2 gap-3">
      <StatCard
        icon={<Clock className="h-5 w-5 text-primary" />}
        label="Przepracowane godziny"
        value={formatHours(summary.workedHours)}
      />
      <StatCard
        icon={<CalendarClock className="h-5 w-5 text-primary" />}
        label="Zarobek wg stawek"
        value={formatMoney(summary.accrued, display)}
      />
      <StatCard
        icon={<ArrowUpCircle className="h-5 w-5 text-success" />}
        label="Suma wypłat"
        value={formatMoney(summary.totalPayouts, display)}
      />
      <StatCard
        icon={<ArrowDownCircle className="h-5 w-5 text-destructive" />}
        label="Suma kosztów"
        value={formatMoney(summary.totalExpenses, display)}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5 text-accent" />}
        label="Czysty zysk"
        value={formatMoney(summary.profit, display)}
        positive={summary.profit >= 0}
      />
      <StatCard
        icon={<Coins className="h-5 w-5 text-accent" />}
        label="Realna stawka za godzinę pracy"
        value={formatMoney(summary.hourlyWork, display)}
      />
      <div className="col-span-2 min-w-0">
        <StatCard
          icon={<HeartPulse className="h-5 w-5 text-accent" />}
          label="Realna stawka za godzinę życia na wyjeździe"
          value={formatMoney(summary.hourlyLife, display)}
        />
      </div>
    </section>
  );
}

export function CategoryBreakdown({
  byCategory,
  display,
}: {
  byCategory: { category: string; total: number }[];
  display: Currency;
}) {
  if (byCategory.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Koszty wg kategorii
      </h2>
      <div className="space-y-2">
        {byCategory.map((row) => (
          <div key={row.category} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{row.category}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
              {formatMoney(row.total, display)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WorkEntriesList({ summary }: { summary: TripSummary }) {
  if (summary.workInTrip.length === 0) return null;
  return (
    <>
      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Godziny pracy w tej podróży
      </h2>
      <div className="space-y-3">
        {summary.workInTrip.map((entry) => {
          const hours = hoursBetween(entry.start_time, entry.end_time);
          return (
            <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-card p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {formatDate(entry.work_date)} · {entry.start_time}–{entry.end_time}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {formatHours(hours)} ·{" "}
                  <span className="text-success">
                    {formatMoney(hours * Number(entry.rate), entry.rate_currency)}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function TransactionsList({ summary }: { summary: TripSummary }) {
  if (summary.transactions.length === 0) return null;
  return (
    <>
      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Transakcje w tej podróży
      </h2>
      <div className="space-y-3">
        {summary.transactions.map((t) => (
          <div key={`${t.kind}-${t.id}`} className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
              {t.kind === "expense" ? (
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-success" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t.subtitleParts.label ? `${t.subtitleParts.label} · ` : ""}
                {formatDateTime(t.subtitleParts.at)}
              </p>
            </div>
            <p
              className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${
                t.kind === "expense" ? "text-destructive" : "text-success"
              }`}
            >
              {t.kind === "expense" ? "-" : "+"}
              {formatMoney(t.amount, t.currency)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
