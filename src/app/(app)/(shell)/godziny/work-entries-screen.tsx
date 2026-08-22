"use client";

import { Clock, Plane, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { TripSelect } from "@/components/trip-select";
import { useAction } from "@/components/use-action";
import { CurrencyToggle, EmptyState, Field, FormMessage } from "@/components/ui";
import { createWorkEntryAction, deleteWorkEntryAction } from "@/lib/actions/data";
import { formatDate, formatHours, formatMoney, hoursBetween, type Currency } from "@/lib/money";
import { defaultTripId, tripLabel } from "@/lib/trip-summary";
import type { Trip, WorkEntry } from "@/lib/types";

export function WorkEntriesScreen({ trips, entries }: { trips: Trip[]; entries: WorkEntry[] }) {
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");

  // undefined = użytkownik jeszcze nie wybrał, więc bierzemy domyślną podróż.
  const [tripId, setTripId] = useState<string | null | undefined>(undefined);
  const effectiveTripId = tripId === undefined ? defaultTripId(trips) : tripId;

  // Data, stawka i waluta zostają — kolejny wpis zwykle dotyczy tego samego wyjazdu.
  const [state, formAction, pending] = useAction(createWorkEntryAction, {
    onSuccess: () => {
      setFrom("");
      setTo("");
    },
  });

  const totalHours = entries.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0);
  const tripById = new Map(trips.map((t) => [t.id, t]));

  return (
    <>
      <form action={formAction} className="space-y-4 rounded-2xl bg-card p-4">
        <TripSelect trips={trips} value={effectiveTripId} onChange={setTripId} />

        <Field label="Data">
          <input
            type="date"
            name="work_date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Od">
            <input
              type="time"
              name="start_time"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-field input-field-compact"
            />
          </Field>
          <Field label="Do">
            <input
              type="time"
              name="end_time"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-field input-field-compact"
            />
          </Field>
        </div>

        <Field label="Stawka godzinowa">
          <input
            name="rate"
            inputMode="decimal"
            required
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="15"
            className="input-field"
          />
        </Field>

        <CurrencyToggle name="rate_currency" value={currency} onChange={setCurrency} />

        <FormMessage error={state.error} />

        <button
          type="submit"
          disabled={pending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Plus className="h-5 w-5 shrink-0" /> Dodaj wpis
        </button>
      </form>

      <p className="mt-4 rounded-2xl bg-card p-4 text-sm text-muted-foreground">
        Razem przepracowane:{" "}
        <span className="font-semibold text-foreground">{formatHours(totalHours)}</span>
      </p>

      <div className="mt-4 space-y-3">
        {entries.length === 0 && <EmptyState>Brak wpisów.</EmptyState>}

        {entries.map((entry) => {
          const hours = hoursBetween(entry.start_time, entry.end_time);
          const trip = entry.trip_id ? tripById.get(entry.trip_id) : undefined;
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
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Plane className="h-3 w-3 shrink-0" />
                  {trip ? tripLabel(trip) : "bez przypisania"}
                </p>
              </div>
              <DeleteEntryButton id={entry.id} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function DeleteEntryButton({ id }: { id: string }) {
  const [, formAction, pending] = useAction(deleteWorkEntryAction, { toastError: true });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Usuń wpis"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destructive active:bg-secondary disabled:opacity-50"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </form>
  );
}
