"use client";

import { ArrowLeft, Copy, Eye, EyeOff, FileDown, Link2, Plane, Share2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useT } from "@/components/locale-provider";
import { useRates } from "@/components/rates-provider";
import { useSettings } from "@/components/use-settings";
import {
  CategoryBreakdown,
  TransactionsList,
  TripStatsGrid,
  WorkEntriesList,
} from "@/components/trip-summary-view";
import { useAction } from "@/components/use-action";
import { useFormat } from "@/components/use-format";
import { EmptyState, Modal } from "@/components/ui";
import { setTripShareAction } from "@/lib/actions/data";
import { isoDay, printDocument } from "@/lib/print";
import { summarizeTrip } from "@/lib/trip-summary";
import type { Expense, Payout, Trip, WorkEntry } from "@/lib/types";

/**
 * Szczegóły jednej podróży razem z jej podsumowaniem.
 *
 * Args:
 *     trip (Trip): Oglądana podróż.
 *     workEntries (WorkEntry[]): Wpisy godzin konta.
 *     expenses (Expense[]): Koszty konta.
 *     payouts (Payout[]): Wypłaty konta.
 *
 * Returns:
 *     ReactNode: Ekran szczegółów podróży.
 */
export function TripDetailScreen({
  trip,
  workEntries,
  expenses,
  payouts,
}: {
  trip: Trip;
  workEntries: WorkEntry[];
  expenses: Expense[];
  payouts: Payout[];
}) {
  const t = useT();
  const fmt = useFormat();
  const { display } = useSettings();
  const rates = useRates();
  const [now] = useState(() => Date.now());
  const [shareOpen, setShareOpen] = useState(false);

  const summary = useMemo(
    () =>
      summarizeTrip({
        tripId: trip.id,
        departureAt: trip.departure_at,
        returnAt: trip.return_at,
        workEntries,
        expenses,
        payouts,
        display,
        rates,
        now,
        locale: fmt.locale,
      }),
    [trip, workEntries, expenses, payouts, display, rates, now, fmt.locale],
  );

  return (
    <>
      <div className="no-print flex gap-2">
        <Link
          href="/podroze"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" /> {t("tripDetail.back")}
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label={t("tripDetail.shareTitle")}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <Share2 className="h-5 w-5 shrink-0" /> {t("tripDetail.share")}
        </button>
      </div>

      {trip.share_enabled && (
        <p className="no-print mt-3 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm">
          <Eye className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0">{t("trips.shareActive")}</span>
        </p>
      )}

      {/* Nagłówek widoczny wyłącznie w PDF/na wydruku. */}
      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">{t("tripDetail.printTitle")}</h1>
        <p className="text-sm">
          {fmt.dateTime(trip.departure_at)} —{" "}
          {trip.return_at ? fmt.dateTime(trip.return_at) : t("tripDetail.ongoingLong")}
        </p>
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fmt.dateTime(trip.departure_at)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {trip.return_at ? (
                fmt.dateTime(trip.return_at)
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
        <div className="mt-4">
          <EmptyState>{t("tripDetail.empty")}</EmptyState>
        </div>
      ) : (
        <>
          <TripStatsGrid summary={summary} display={display} />
          <CategoryBreakdown byCategory={summary.byCategory} display={display} />
          <WorkEntriesList summary={summary} />
          <TransactionsList summary={summary} />
        </>
      )}

      {shareOpen && <ShareDialog trip={trip} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ShareDialog({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const t = useT();
  const fmt = useFormat();
  const [, formAction, pending] = useAction(setTripShareAction, { toastError: true });

  function shareUrl(): string {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/udostepnione?t=${trip.share_token}`;
  }

  async function copyLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("tripDetail.copied"));
    } catch {
      toast.error(t("tripDetail.copyFailed"));
    }
  }

  async function sendLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        const title = t("tripDetail.shareSubject", { date: fmt.date(trip.departure_at) });
        await navigator.share({ title, url });
        return;
      }
      await copyLink();
    } catch (error) {
      // Zamknięcie systemowego arkusza udostępniania to nie jest błąd.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    <Modal title={t("tripDetail.shareTitle")} onClose={onClose}>
      <div className="rounded-xl bg-secondary p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card">
            {trip.share_enabled ? (
              <Eye className="h-5 w-5 text-accent" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("tripDetail.watchLink")}</p>
            <p className="text-xs text-muted-foreground">
              {trip.share_enabled ? t("tripDetail.watchOn") : t("tripDetail.watchOff")}
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-3">
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="enabled" value={String(!trip.share_enabled)} />
          <button
            type="submit"
            role="switch"
            aria-checked={trip.share_enabled}
            disabled={pending}
            className={`flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${
              trip.share_enabled ? "bg-success text-success-foreground" : "bg-card text-foreground"
            }`}
          >
            <span className="min-w-0 truncate">
              {trip.share_enabled ? t("tripDetail.sharingOn") : t("tripDetail.sharingOff")}
            </span>
            <span
              aria-hidden
              className={`ml-3 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
                trip.share_enabled ? "bg-success-foreground/30" : "bg-secondary"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-foreground transition-transform ${
                  trip.share_enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </form>

        {trip.share_enabled && (
          <>
            <p className="mt-3 break-all rounded-lg bg-card p-3 text-xs text-muted-foreground">
              {shareUrl()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendLink}
                className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
              >
                <Link2 className="h-4 w-4 shrink-0" /> {t("tripDetail.sendLink")}
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card text-sm font-semibold"
              >
                <Copy className="h-4 w-4 shrink-0" /> {t("tripDetail.copy")}
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          onClose();
          printDocument(`Wyjazd_${isoDay(trip.departure_at, "podroz")}`);
        }}
        className="flex w-full items-center gap-3 rounded-xl bg-secondary p-4 text-left active:opacity-80"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card">
          <FileDown className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("tripDetail.exportPdf")}</p>
          <p className="text-xs text-muted-foreground">{t("tripDetail.exportPdfHint")}</p>
        </div>
      </button>
    </Modal>
  );
}
