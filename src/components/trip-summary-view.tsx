"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Coins,
  HeartPulse,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "@/components/locale-provider";
import { useFormat } from "@/components/use-format";
import { formatHours, hoursBetween, type Currency } from "@/lib/money";
import type { TripSummary } from "@/lib/trip-summary";

/**
 * Kafelek z jedną liczbą i podpisem.
 *
 * Args:
 *     icon (ReactNode): Ikona kafelka.
 *     label (string): Podpis nad wartością.
 *     value (string): Wartość do pokazania.
 *     tone ("default" | "success" | "destructive"): Kolor wartości.
 *
 * Returns:
 *     ReactNode: Kafelek statystyki.
 */
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

/**
 * Siatka kafelków ze statystykami — ta sama dla właściciela i obserwatora.
 *
 * Args:
 *     summary (TripSummary): Policzone podsumowanie podróży.
 *     display (Currency): Waluta wyświetlania.
 *
 * Returns:
 *     ReactNode: Siatka kafelków.
 */
export function TripStatsGrid({ summary, display }: { summary: TripSummary; display: Currency }) {
  const t = useT();
  const fmt = useFormat();

  return (
    <section className="mt-4 grid grid-cols-2 gap-3">
      <StatCard
        icon={<Clock className="h-5 w-5 text-primary" />}
        label={t("dash.workedHours")}
        value={formatHours(summary.workedHours)}
      />
      <StatCard
        icon={<ArrowUpCircle className="h-5 w-5 text-success" />}
        label={t("dash.totalPayouts")}
        value={fmt.money(summary.totalPayouts, display)}
      />
      <StatCard
        icon={<ArrowDownCircle className="h-5 w-5 text-destructive" />}
        label={t("dash.totalExpenses")}
        value={fmt.money(summary.totalExpenses, display)}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5 text-accent" />}
        label={t("summary.netProfit")}
        value={fmt.money(summary.profit, display)}
        positive={summary.profit >= 0}
      />
      <StatCard
        icon={<Coins className="h-5 w-5 text-accent" />}
        label={t("dash.realHourlyWork")}
        value={fmt.money(summary.hourlyWork, display)}
      />
      <div className="col-span-2 min-w-0">
        <StatCard
          icon={<HeartPulse className="h-5 w-5 text-accent" />}
          label={t("dash.realHourlyLife")}
          value={fmt.money(summary.hourlyLife, display)}
        />
      </div>
    </section>
  );
}

/**
 * Rozbicie kosztów na kategorie.
 *
 * Args:
 *     summary (TripSummary): Policzone podsumowanie podróży.
 *     display (Currency): Waluta wyświetlania.
 *
 * Returns:
 *     ReactNode: Lista kategorii z kwotami.
 */
export function CategoryBreakdown({
  byCategory,
  display,
}: {
  byCategory: { category: string; total: number }[];
  display: Currency;
}) {
  const t = useT();
  const fmt = useFormat();
  if (byCategory.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("summary.byCategory")}
      </h2>
      <div className="space-y-2">
        {byCategory.map((row) => (
          <div key={row.category} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{row.category}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
              {fmt.money(row.total, display)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Lista wpisów godzin należących do podróży.
 *
 * Args:
 *     summary (TripSummary): Policzone podsumowanie podróży.
 *
 * Returns:
 *     ReactNode: Lista wpisów albo zastępnik przy pustce.
 */
export function WorkEntriesList({ summary }: { summary: TripSummary }) {
  const t = useT();
  const fmt = useFormat();
  if (summary.workInTrip.length === 0) return null;
  return (
    <>
      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("summary.workEntries")}
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
                  {fmt.date(entry.work_date)} · {entry.start_time}–{entry.end_time}
                </p>
                <p className="truncate text-sm text-muted-foreground">{formatHours(hours)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Lista kosztów i wypłat należących do podróży.
 *
 * Args:
 *     summary (TripSummary): Policzone podsumowanie podróży.
 *
 * Returns:
 *     ReactNode: Lista transakcji albo zastępnik przy pustce.
 */
export function TransactionsList({ summary }: { summary: TripSummary }) {
  const t = useT();
  const fmt = useFormat();
  if (summary.transactions.length === 0) return null;
  return (
    <>
      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("summary.transactions")}
      </h2>
      <div className="space-y-3">
        {summary.transactions.map((row) => (
          <div key={`${row.kind}-${row.id}`} className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
              {row.kind === "expense" ? (
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-success" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{row.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.subtitleParts.label ? `${row.subtitleParts.label} · ` : ""}
                {fmt.dateTime(row.subtitleParts.at)}
              </p>
            </div>
            <p
              className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${
                row.kind === "expense" ? "text-destructive" : "text-success"
              }`}
            >
              {row.kind === "expense" ? "-" : "+"}
              {fmt.money(row.amount, row.currency)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
