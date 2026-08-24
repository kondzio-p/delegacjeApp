"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Coins,
  HeartPulse,
  Plane,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useT } from "@/components/locale-provider";
import { useRates } from "@/components/rates-provider";
import { useSettings } from "@/components/use-settings";
import { CategoryBreakdown, StatCard } from "@/components/trip-summary-view";
import { CURRENCIES, formatDateTime, formatDuration, formatHours, formatMoney } from "@/lib/money";
import { hourlyRates, splitDaysHours, totalsOf, tripLabel } from "@/lib/trip-summary";
import type { Expense, Payout, Trip, WorkEntry } from "@/lib/types";

/** "all" = wszystko razem, bez podziału na podróże. */
type Scope = "all" | string;

export function DashboardScreen({
  trips,
  workEntries,
  expenses,
  payouts,
}: {
  trips: Trip[];
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
}) {
  const { display, setDisplay } = useSettings();
  const nbpRates = useRates();
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const [scope, setScope] = useState<Scope>("all");

  const selectedTrip = scope === "all" ? undefined : trips.find((tr) => tr.id === scope);

  // Podróż w toku: dla widoku ogólnego dowolna, dla wybranej — tylko ona sama.
  const ongoing = useMemo(() => {
    if (scope === "all") return trips.find((tr) => !tr.return_at);
    return selectedTrip && !selectedTrip.return_at ? selectedTrip : undefined;
  }, [scope, trips, selectedTrip]);

  useEffect(() => {
    if (!ongoing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ongoing]);

  const live = ongoing ? formatDuration(now - new Date(ongoing.departure_at).getTime()) : null;

  /* --------------------------------------------------- dane w wybranym zakresie */

  const scoped = useMemo(() => {
    if (!selectedTrip) return { workEntries, expenses, payouts };
    return {
      workEntries: workEntries.filter((e) => e.trip_id === selectedTrip.id),
      expenses: expenses.filter((e) => e.trip_id === selectedTrip.id),
      payouts: payouts.filter((p) => p.trip_id === selectedTrip.id),
    };
  }, [selectedTrip, workEntries, expenses, payouts]);

  const totals = useMemo(
    () => totalsOf({ ...scoped, display, rates: nbpRates }),
    [scoped, display, nbpRates],
  );

  /** Czas na wyjeździe: jedna podróż albo suma wszystkich. */
  const tripHours = useMemo(() => {
    const list = selectedTrip ? [selectedTrip] : trips;
    return list.reduce((sum, trip) => {
      const end = trip.return_at ? new Date(trip.return_at).getTime() : now;
      return sum + Math.max(0, end - new Date(trip.departure_at).getTime()) / 3_600_000;
    }, 0);
  }, [selectedTrip, trips, now]);

  const { days: tripDays, hours: tripRest } = splitDaysHours(tripHours);

  const hourly = useMemo(
    () =>
      hourlyRates({
        totalPayouts: totals.totalPayouts,
        totalExpenses: totals.totalExpenses,
        workedHours: totals.workedHours,
        tripHours,
      }),
    [totals, tripHours],
  );

  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="scope">
          {t("dash.scopeLabel")}
        </label>
        <select
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="input-field mt-2"
        >
          <option value="all">{t("dash.scopeAll")}</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {tripLabel(trip)}
              {trip.return_at ? "" : ` · ${t("dash.ongoing")}`}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">{t("dash.displayIn")}</p>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary p-1">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDisplay(c)}
              className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
                display === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {nbpRates && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("dash.rateFromNbp", {
              rate: nbpRates.rates.EUR.toFixed(4),
              date: nbpRates.effectiveDate,
            })}
          </p>
        )}
      </section>

      {live && (
        <section className="mt-4 rounded-2xl border border-accent/40 bg-card p-4">
          <div className="flex items-center gap-2 text-accent">
            <Timer className="h-5 w-5 shrink-0" />
            <span className="min-w-0 text-sm font-semibold uppercase tracking-wide">
              {t("dash.tripOngoing")}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { v: live.days, l: t("dash.unitDays") },
              { v: live.hours, l: t("dash.unitHours") },
              { v: live.minutes, l: t("dash.unitMinutes") },
              { v: live.seconds, l: t("dash.unitSeconds") },
            ].map((cell) => (
              <div key={cell.l} className="min-w-0 rounded-xl bg-secondary py-3">
                <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
                  {String(cell.v).padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground">{cell.l}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTrip && (
        <section className="mt-4 rounded-2xl bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {formatDateTime(selectedTrip.departure_at)}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {selectedTrip.return_at ? (
                  formatDateTime(selectedTrip.return_at)
                ) : (
                  <span className="font-medium text-success">{t("dash.ongoing")}</span>
                )}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">
            {t("dash.duration")}:{" "}
            <span className="font-semibold tabular-nums">
              {tripDays} {t("dash.unitDays")} {tripRest} h
            </span>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- 1. Czas */}

      <SectionHeader
        icon={<Clock className="h-5 w-5 text-primary" />}
        title={t("dash.timeTitle")}
        subtitle={t("dash.timeSubtitle")}
      />
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Clock className="h-5 w-5 text-primary" />}
          label={t("dash.workedHours")}
          value={formatHours(totals.workedHours)}
        />
        <StatCard
          icon={<Plane className="h-5 w-5 text-primary" />}
          label={t("dash.timeAway")}
          value={`${tripDays} ${t("dash.unitDays")} ${tripRest} h`}
        />
      </section>

      {/* --------------------------------------------------- 2. Pieniądze */}

      <SectionHeader
        icon={<Wallet className="h-5 w-5 text-success" />}
        title={t("dash.moneyTitle")}
        subtitle={t("dash.moneySubtitle")}
      />
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<ArrowUpCircle className="h-5 w-5 text-success" />}
          label={t("dash.totalPayouts")}
          value={formatMoney(totals.totalPayouts, display)}
        />
        <StatCard
          icon={<ArrowDownCircle className="h-5 w-5 text-destructive" />}
          label={t("dash.totalExpenses")}
          value={formatMoney(totals.totalExpenses, display)}
        />
        <div className="col-span-2 min-w-0">
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-accent" />}
            label={t("dash.netProfit")}
            value={formatMoney(totals.profit, display)}
            positive={totals.profit >= 0}
          />
        </div>
      </section>

      {/* ----------------------------------------------- 3. Realne stawki */}

      <SectionHeader
        icon={<Coins className="h-5 w-5 text-accent" />}
        title={t("dash.ratesTitle")}
        subtitle={t("dash.ratesSubtitle")}
      />
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Coins className="h-5 w-5 text-accent" />}
          label={t("dash.realHourlyWork")}
          value={formatMoney(hourly.actualHourly, display)}
        />
        <StatCard
          icon={<HeartPulse className="h-5 w-5 text-accent" />}
          label={t("dash.realHourlyLife")}
          value={formatMoney(hourly.hourlyLife, display)}
        />
      </section>

      <CategoryBreakdown byCategory={totals.byCategory} display={display} />

      {!selectedTrip && (
        <p className="mt-4 rounded-2xl bg-card p-4 text-xs text-muted-foreground">
          {t("dash.allScopeNote")}
        </p>
      )}
    </>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mt-6 mb-3 flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
