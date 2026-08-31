"use client";

import { EyeOff, FileDown, Plane } from "lucide-react";
import { useMemo, useState } from "react";

import { useT } from "@/components/locale-provider";
import {
  CategoryBreakdown,
  TransactionsList,
  TripStatsGrid,
  WorkEntriesList,
} from "@/components/trip-summary-view";
import { useFormat } from "@/components/use-format";
import { CURRENCIES, type Currency } from "@/lib/money";
import { isoDay, printDocument } from "@/lib/print";
import { summarizeTrip } from "@/lib/trip-summary";
import type { SharedTripPayload } from "@/lib/queries";
import type { CurrentRates } from "@/lib/rates";

/**
 * Publiczny podgląd udostępnionej podróży.
 *
 * Ekran stoi poza powłoką aplikacji, więc walutę wyświetlania trzyma we
 * własnym stanie, a kursy dostaje propsem.
 *
 * Args:
 *     payload (SharedTripPayload): Dane udostępnionej podróży.
 *     rates (CurrentRates | null): Bieżąca tabela NBP.
 *
 * Returns:
 *     ReactNode: Ekran podglądu, gotowy także do druku.
 */
export function SharedTripScreen({
  payload,
  rates,
}: {
  payload: SharedTripPayload;
  rates: CurrentRates | null;
}) {
  const t = useT();
  const fmt = useFormat();
  const [display, setDisplay] = useState<Currency>("PLN");
  const [now] = useState(() => Date.now());

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
        rates,
        now,
        locale: fmt.locale,
      }),
    [payload, display, rates, now, fmt.locale],
  );

  return (
    <Layout>
      <section className="no-print rounded-2xl bg-card p-4">
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
        {rates && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("dash.rateFromNbp", {
              rate: rates.rates.EUR.toFixed(4),
              date: rates.effectiveDate,
            })}
          </p>
        )}
      </section>

      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">{t("shared.title")}</h1>
        <p className="text-sm">
          {fmt.dateTime(payload.trip.departure_at)} —{" "}
          {payload.trip.return_at
            ? fmt.dateTime(payload.trip.return_at)
            : t("tripDetail.ongoingLong")}
        </p>
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {fmt.dateTime(payload.trip.departure_at)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {payload.trip.return_at ? (
                fmt.dateTime(payload.trip.return_at)
              ) : (
                <span className="font-medium text-success">{t("common.ongoing")}</span>
              )}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-secondary px-4 py-3 text-sm">
          {t("tripDetail.duration")}{" "}
          <span className="font-semibold tabular-nums">
            {t("tripDetail.durationValue", { days: summary.tripDays, hours: summary.tripRest })}
          </span>
          {summary.isOngoing && (
            <span className="text-muted-foreground"> {t("tripDetail.untilNow")}</span>
          )}
        </p>
      </section>

      {summary.isEmpty ? (
        <p className="mt-4 rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          {t("shared.empty")}
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
        onClick={() => printDocument(`Wyjazd_${isoDay(payload.trip.departure_at, "podroz")}`)}
        className="no-print mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-card text-base font-semibold active:bg-secondary"
      >
        <FileDown className="h-5 w-5 shrink-0" /> {t("shared.savePdf")}
      </button>
    </Layout>
  );
}

/**
 * Komunikat o niedostępnym linku.
 *
 * Args:
 *     message (string): Wyjaśnienie, dlaczego nie ma czego pokazać.
 *
 * Returns:
 *     ReactNode: Ekran z komunikatem.
 */
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
  const t = useT();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="no-print border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{t("shared.title")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t("shared.readOnly")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
