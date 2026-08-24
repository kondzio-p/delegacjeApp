"use client";

import { ArrowDownCircle, ArrowUpCircle, Plane, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { TripSelect } from "@/components/trip-select";
import { useAction } from "@/components/use-action";
import { CurrencyToggle, EmptyState, Field, FormMessage } from "@/components/ui";
import {
  createExpenseAction,
  createPayoutAction,
  deleteExpenseAction,
  deletePayoutAction,
} from "@/lib/actions/data";
import { formatDateTime, formatMoney, type Currency } from "@/lib/money";
import { defaultTripId, tripLabel } from "@/lib/trip-summary";
import type { Expense, Payout, Trip } from "@/lib/types";

export function FinanceScreen({
  trips,
  expenses,
  payouts,
  categories,
}: {
  trips: Trip[];
  categories: string[];
  expenses: Expense[];
  payouts: Payout[];
}) {
  const [tab, setTab] = useState<"expense" | "payout">("expense");
  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

  const transactions = useMemo(() => {
    const list = [
      ...expenses.map((e) => ({
        kind: "expense" as const,
        id: e.id,
        tripId: e.trip_id,
        title: e.name,
        subtitle: `${e.category} · ${formatDateTime(e.spent_at)}`,
        amount: Number(e.amount),
        currency: e.currency,
        at: e.spent_at,
      })),
      ...payouts.map((p) => ({
        kind: "payout" as const,
        id: p.id,
        tripId: p.trip_id,
        title: p.note?.trim() || "Wypłata",
        subtitle: formatDateTime(p.paid_at),
        amount: Number(p.amount),
        currency: p.currency,
        at: p.paid_at,
      })),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [expenses, payouts]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <button
          type="button"
          onClick={() => setTab("expense")}
          className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
            tab === "expense"
              ? "bg-destructive text-destructive-foreground"
              : "text-muted-foreground"
          }`}
        >
          Koszt
        </button>
        <button
          type="button"
          onClick={() => setTab("payout")}
          className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
            tab === "payout" ? "bg-success text-success-foreground" : "text-muted-foreground"
          }`}
        >
          Wypłata
        </button>
      </div>

      {tab === "expense" ? (
        <ExpenseForm trips={trips} categories={categories} />
      ) : (
        <PayoutForm trips={trips} />
      )}

      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Historia transakcji
      </h2>
      <div className="space-y-3">
        {transactions.length === 0 && <EmptyState>Brak transakcji.</EmptyState>}

        {transactions.map((t) => {
          const trip = t.tripId ? tripById.get(t.tripId) : undefined;
          return (
            <div
              key={`${t.kind}-${t.id}`}
              className="flex items-center gap-3 rounded-2xl bg-card p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {t.kind === "expense" ? (
                  <ArrowDownCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 text-success" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.subtitle}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Plane className="h-3 w-3 shrink-0" />
                  {trip ? tripLabel(trip) : "bez przypisania"}
                </p>
                <p
                  className={`mt-1 text-sm font-bold tabular-nums ${
                    t.kind === "expense" ? "text-destructive" : "text-success"
                  }`}
                >
                  {t.kind === "expense" ? "-" : "+"}
                  {formatMoney(t.amount, t.currency)}
                </p>
              </div>
              <DeleteTransactionButton kind={t.kind} id={t.id} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExpenseForm({ trips, categories }: { trips: Trip[]; categories: string[] }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [tripId, setTripId] = useState<string | null | undefined>(undefined);
  const effectiveTripId = tripId === undefined ? defaultTripId(trips) : tripId;

  const [state, formAction, pending] = useAction(createExpenseAction, {
    onSuccess: () => {
      setName("");
      setAmount("");
    },
  });

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl bg-card p-4">
      <TripSelect trips={trips} value={effectiveTripId} onChange={setTripId} />

      <Field label="Nazwa">
        <input
          name="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tankowanie"
          className="input-field"
        />
      </Field>

      <Field label="Kwota">
        <input
          name="amount"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="120"
          className="input-field"
        />
      </Field>

      <CurrencyToggle name="currency" value={currency} onChange={setCurrency} />

      <Field label="Kategoria">
        <select name="category" defaultValue={categories.at(-1) ?? ""} className="input-field">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <FormMessage error={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-base font-semibold text-destructive-foreground disabled:opacity-60"
      >
        <Plus className="h-5 w-5 shrink-0" /> Dodaj koszt
      </button>
    </form>
  );
}

function PayoutForm({ trips }: { trips: Trip[] }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [tripId, setTripId] = useState<string | null | undefined>(undefined);
  const effectiveTripId = tripId === undefined ? defaultTripId(trips) : tripId;

  const [state, formAction, pending] = useAction(createPayoutAction, {
    onSuccess: () => {
      setAmount("");
      setNote("");
    },
  });

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl bg-card p-4">
      <TripSelect trips={trips} value={effectiveTripId} onChange={setTripId} />

      <Field label="Kwota">
        <input
          name="amount"
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500"
          className="input-field"
        />
      </Field>

      <CurrencyToggle name="currency" value={currency} onChange={setCurrency} />

      <Field label="Notatka (opcjonalnie)">
        <input
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Zaliczka od szefa"
          className="input-field"
        />
      </Field>

      <FormMessage error={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-success text-base font-semibold text-success-foreground disabled:opacity-60"
      >
        <Plus className="h-5 w-5 shrink-0" /> Dodaj wypłatę
      </button>
    </form>
  );
}

function DeleteTransactionButton({ kind, id }: { kind: "expense" | "payout"; id: string }) {
  const action = kind === "expense" ? deleteExpenseAction : deletePayoutAction;
  const [, formAction, pending] = useAction(action, { toastError: true });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Usuń transakcję"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destructive active:bg-secondary disabled:opacity-50"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </form>
  );
}
