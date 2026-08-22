"use client";

import { EyeOff, FileDown, Plane } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CategoryBreakdown,
  TransactionsList,
  TripStatsGrid,
  WorkEntriesList,
} from "@/components/trip-summary-view";
import { formatDateTime, type Currency } from "@/lib/money";
import { isoDay, printDocument } from "@/lib/print";
import { summarizeTrip } from "@/lib/trip-summary";
import type { SharedTripPayload } from "@/lib/queries";

export function SharedTripScreen({ payload }: { payload: SharedTripPayload }) {
  const [display, setDisplay] = useState<Currency>("PLN");
  const [rateInput, setRateInput] = useState("4.35");
  const [now] = useState(() => Date.now());

  const rate = useMemo(() => {
    const parsed = Number.parseFloat(rateInput.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 4.35;
  }, [rateInput]);

  const summary = useMemo(
    () =>
      summarizeTrip({
        tripId: payload.trip.id,
        departureAt: payload.trip.departure_at,
        returnAt: payload.trip.return_at,
        workEntries: payload.work_entries,
        expenses: payload.expenses,
        payouts: payload.payouts,
        display,
        rate,
        now,
      }),
    [payload, display, rate, now],
  );

  return (
    <Layout>
      <section className="no-print rounded-2xl bg-card p-4">
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
        <label
          className="mt-4 block text-sm font-medium text-muted-foreground"
          htmlFor="shared-rate"
        >
          Kurs EUR (ile PLN za 1 EUR)
        </label>
        <input
          id="shared-rate"
          inputMode="decimal"
          value={rateInput}
          onChange={(e) => setRateInput(e.target.value)}
          className="input-field mt-2 text-lg font-semibold"
          placeholder="4.35"
        />
      </section>

      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">Podsumowanie delegacji</h1>
        <p className="text-sm">
          {formatDateTime(payload.trip.departure_at)} —{" "}
          {payload.trip.return_at ? formatDateTime(payload.trip.return_at) : "podróż w toku"}
        </p>
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {formatDateTime(payload.trip.departure_at)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {payload.trip.return_at ? (
                formatDateTime(payload.trip.return_at)
              ) : (
                <span className="font-medium text-success">w toku</span>
              )}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">
          Czas trwania:{" "}
          <span className="font-semibold tabular-nums">
            {summary.tripDays} dni {summary.tripRest} h
          </span>
          {summary.isOngoing && <span className="text-muted-foreground"> (liczone do teraz)</span>}
        </p>
      </section>

      {summary.isEmpty ? (
        <p className="mt-4 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          Brak wpisów przypisanych do tej podróży.
        </p>
      ) : (
        <>
          <TripStatsGrid summary={summary} display={display} />
          <CategoryBreakdown byCategory={summary.byCategory} display={display} />
          <WorkEntriesList summary={summary} />
          <TransactionsList summary={summary} />
        </>
      )}

      <button
        type="button"
        onClick={() => printDocument(`Delegacja_${isoDay(payload.trip.departure_at, "podroz")}`)}
        className="no-print mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-card text-base font-semibold active:bg-secondary"
      >
        <FileDown className="h-5 w-5 shrink-0" /> Zapisz jako PDF
      </button>
    </Layout>
  );
}

export function Unavailable({ message }: { message: string }) {
  return (
    <Layout>
      <div className="rounded-2xl bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
          <EyeOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">Podsumowanie delegacji</p>
            <p className="truncate text-xs text-muted-foreground">Widok tylko do odczytu</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
