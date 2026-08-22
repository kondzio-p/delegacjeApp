"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Clock,
  Coins,
  HeartPulse,
  Plane,
  Scale,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useSettings } from "@/components/use-settings";
import { CategoryBreakdown, StatCard } from "@/components/trip-summary-view";
import { formatDateTime, formatDuration, formatHours, formatMoney } from "@/lib/money";
import { compareEarnings, splitDaysHours, totalsOf, tripLabel } from "@/lib/trip-summary";
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
  const { display, setDisplay, rateInput, setRateInput, rate } = useSettings();
  const [now, setNow] = useState(() => Date.now());
  const [scope, setScope] = useState<Scope>("all");

  const selectedTrip = scope === "all" ? undefined : trips.find((t) => t.id === scope);

  // Podróż w toku: dla widoku ogólnego dowolna, dla wybranej — tylko ona sama.
  const ongoing = useMemo(() => {
    if (scope === "all") return trips.find((t) => !t.return_at);
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
    () => totalsOf({ ...scoped, display, rate }),
    [scoped, display, rate],
  );

  /** Czas w delegacji: jedna podróż albo suma wszystkich. */
  const tripHours = useMemo(() => {
    const list = selectedTrip ? [selectedTrip] : trips;
    return list.reduce((sum, t) => {
      const end = t.return_at ? new Date(t.return_at).getTime() : now;
      return sum + Math.max(0, end - new Date(t.departure_at).getTime()) / 3_600_000;
    }, 0);
  }, [selectedTrip, trips, now]);

  const { days: tripDays, hours: tripRest } = splitDaysHours(tripHours);

  const comparison = useMemo(
    () =>
      compareEarnings({
        accrued: totals.accrued,
        totalPayouts: totals.totalPayouts,
        totalExpenses: totals.totalExpenses,
        workedHours: totals.workedHours,
        tripHours,
      }),
    [totals, tripHours],
  );

  const settled = Math.abs(comparison.difference) < 0.005;
  const underpaid = comparison.difference > 0;

  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="scope">
          Zakres podsumowania
        </label>
        <select
          id="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="input-field mt-2"
        >
          <option value="all">Wszystko razem (bez podziału)</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {tripLabel(trip)}
              {trip.return_at ? "" : " · w toku"}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Wyświetl w</p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
          {(["EUR", "PLN"] as const).map((c) => (
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
        <label className="mt-4 block text-sm font-medium text-muted-foreground" htmlFor="rate">
          Kurs EUR (ile PLN za 1 EUR)
        </label>
        <input
          id="rate"
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="input-field mt-2 text-lg font-semibold"
          placeholder="4.35"
        />
      </section>

      {live && (
        <section className="mt-4 rounded-2xl border border-accent/40 bg-card p-4">
          <div className="flex items-center gap-2 text-accent">
            <Timer className="h-5 w-5 shrink-0" />
            <span className="min-w-0 text-sm font-semibold uppercase tracking-wide">
              Podróż w toku
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { v: live.days, l: "dni" },
              { v: live.hours, l: "godz" },
              { v: live.minutes, l: "min" },
              { v: live.seconds, l: "sek" },
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
                  <span className="font-medium text-success">w toku</span>
                )}
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">
            Czas trwania:{" "}
            <span className="font-semibold tabular-nums">
              {tripDays} dni {tripRest} h
            </span>
          </p>
        </section>
      )}

      {/* ------------------------------------------------- 1. Przewidywania */}

      <SectionHeader
        icon={<CalendarClock className="h-5 w-5 text-primary" />}
        title="Przewidywania"
        subtitle="Ile powinno wyjść z zapisanych godzin i stawek"
      />
      <section className="grid grid-cols-2 gap-3">
        <div className="col-span-2 min-w-0">
          <StatCard
            icon={<Coins className="h-5 w-5 text-primary" />}
            label="Zarobek wg stawek (godziny × stawka)"
            value={formatMoney(totals.accrued, display)}
          />
        </div>
        <StatCard
          icon={<Clock className="h-5 w-5 text-primary" />}
          label="Przepracowane godziny"
          value={formatHours(totals.workedHours)}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5 text-primary" />}
          label="Średnia stawka godzinowa"
          value={formatMoney(comparison.expectedHourly, display)}
        />
      </section>

      {/* -------------------------------------------- 2. Właściwe zarobki */}

      <SectionHeader
        icon={<Wallet className="h-5 w-5 text-success" />}
        title="Właściwe zarobki"
        subtitle="Pieniądze, które faktycznie wpłynęły, minus koszty"
      />
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<ArrowUpCircle className="h-5 w-5 text-success" />}
          label="Suma wypłat"
          value={formatMoney(totals.totalPayouts, display)}
        />
        <StatCard
          icon={<ArrowDownCircle className="h-5 w-5 text-destructive" />}
          label="Suma kosztów"
          value={formatMoney(totals.totalExpenses, display)}
        />
        <div className="col-span-2 min-w-0">
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-accent" />}
            label="Czysty zysk (wypłaty − koszty)"
            value={formatMoney(totals.profit, display)}
            positive={totals.profit >= 0}
          />
        </div>
      </section>

      {/* ------------------------------------------------- 3. Porównanie */}

      <SectionHeader
        icon={<Scale className="h-5 w-5 text-accent" />}
        title="Porównanie"
        subtitle="Przewidywania kontra rzeczywistość"
      />
      <section className="rounded-2xl bg-card p-4">
        <p className="text-xs text-muted-foreground">
          {settled
            ? "Wypłaty pokrywają naliczony zarobek"
            : underpaid
              ? "Zostało do wypłaty"
              : "Wypłacono ponad naliczony zarobek"}
        </p>
        <p
          className={`mt-2 break-words text-2xl font-bold tabular-nums ${
            settled ? "text-foreground" : underpaid ? "text-destructive" : "text-success"
          }`}
        >
          {formatMoney(Math.abs(comparison.difference), display)}
        </p>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full ${comparison.coverage >= 100 ? "bg-success" : "bg-primary"}`}
            style={{ width: `${Math.min(100, Math.max(0, comparison.coverage))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Wypłacono{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {totals.accrued > 0 ? `${Math.round(comparison.coverage)}%` : "—"}
          </span>{" "}
          naliczonego zarobku ({formatMoney(totals.totalPayouts, display)} z{" "}
          {formatMoney(totals.accrued, display)})
        </p>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Coins className="h-5 w-5 text-primary" />}
          label="Stawka wg wpisów"
          value={formatMoney(comparison.expectedHourly, display)}
        />
        <StatCard
          icon={<Coins className="h-5 w-5 text-accent" />}
          label="Realna stawka za godzinę pracy"
          value={formatMoney(comparison.actualHourly, display)}
        />
        <div className="col-span-2 min-w-0">
          <StatCard
            icon={<HeartPulse className="h-5 w-5 text-accent" />}
            label="Realna stawka za godzinę życia na wyjeździe"
            value={formatMoney(comparison.hourlyLife, display)}
          />
        </div>
      </section>

      <CategoryBreakdown byCategory={totals.byCategory} display={display} />

      {!selectedTrip && (
        <p className="mt-4 rounded-2xl bg-card p-4 text-xs text-muted-foreground">
          Widok ogólny liczy wszystkie wpisy, także te bez przypisania do podróży.
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
