"use client";

import { ArrowLeft, Copy, Eye, EyeOff, FileDown, Link2, Plane, Share2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useRates } from "@/components/rates-provider";
import { useSettings } from "@/components/use-settings";
import {
  CategoryBreakdown,
  TransactionsList,
  TripStatsGrid,
  WorkEntriesList,
} from "@/components/trip-summary-view";
import { useAction } from "@/components/use-action";
import { EmptyState, Modal } from "@/components/ui";
import { setTripShareAction } from "@/lib/actions/data";
import { formatDate, formatDateTime } from "@/lib/money";
import { isoDay, printDocument } from "@/lib/print";
import { summarizeTrip } from "@/lib/trip-summary";
import type { Expense, Payout, Trip, WorkEntry } from "@/lib/types";

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
      }),
    [trip, workEntries, expenses, payouts, display, rates, now],
  );

  return (
    <>
      <div className="no-print flex gap-2">
        <Link
          href="/podroze"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" /> Wróć do listy
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Udostępnij podsumowanie"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <Share2 className="h-5 w-5 shrink-0" /> Udostępnij
        </button>
      </div>

      {trip.share_enabled && (
        <p className="no-print mt-3 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm">
          <Eye className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0">Link do obserwacji jest aktywny</span>
        </p>
      )}

      {/* Nagłówek widoczny wyłącznie w PDF/na wydruku. */}
      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">Podsumowanie podróży</h1>
        <p className="text-sm">
          {formatDateTime(trip.departure_at)} —{" "}
          {trip.return_at ? formatDateTime(trip.return_at) : "podróż w toku"}
        </p>
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{formatDateTime(trip.departure_at)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {trip.return_at ? (
                formatDateTime(trip.return_at)
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
        <div className="mt-4">
          <EmptyState>
            Brak wpisów przypisanych do tej podróży. Dodając godziny pracy, koszty lub wypłaty,
            wybierz tę podróż w polu „Podróż”.
          </EmptyState>
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
      toast.success("Link skopiowany do schowka");
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  }

  async function sendLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `Wyjazd ${formatDate(trip.departure_at)}`, url });
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
    <Modal title="Udostępnij podsumowanie" onClose={onClose}>
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
            <p className="text-sm font-semibold">Link do obserwacji</p>
            <p className="text-xs text-muted-foreground">
              {trip.share_enabled
                ? "Każdy z linkiem widzi to podsumowanie bez logowania"
                : "Wyłączony — link nikomu nic nie pokaże"}
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
              {trip.share_enabled ? "Udostępnianie włączone" : "Udostępnianie wyłączone"}
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
                <Link2 className="h-4 w-4 shrink-0" /> Wyślij link
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card text-sm font-semibold"
              >
                <Copy className="h-4 w-4 shrink-0" /> Kopiuj
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
          <p className="text-sm font-semibold">Eksportuj do PDF</p>
          <p className="text-xs text-muted-foreground">
            W oknie drukowania wybierz „Zapisz jako PDF”
          </p>
        </div>
      </button>
    </Modal>
  );
}
