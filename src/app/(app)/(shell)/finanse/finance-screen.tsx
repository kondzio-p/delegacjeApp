"use client";

import { ArrowDownCircle, ArrowUpCircle, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { TripSelect } from "@/components/trip-select";
import { useAction } from "@/components/use-action";
import { CurrencyToggle, EmptyState, Field, FormMessage, Modal } from "@/components/ui";
import {
  createExpenseAction,
  createPayoutAction,
  deleteExpenseAction,
  deletePayoutAction,
  updateExpenseAction,
  updatePayoutAction,
} from "@/lib/actions/data";
import { momentToDay, todayLocal } from "@/lib/day";
import { formatDate, formatMoney, type Currency } from "@/lib/money";
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPayout, setEditingPayout] = useState<Payout | null>(null);
  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);

  const transactions = useMemo(() => {
    const list = [
      ...expenses.map((e) => ({
        kind: "expense" as const,
        id: e.id,
        tripId: e.trip_id,
        title: e.name,
        // Sama data, bez godziny: godzina zakupu nie niesie informacji, a przy
        // dacie wstecznej pokazywałaby południe UTC — czyli coś, czego
        // użytkownik nigdy nie wpisał.
        subtitle: `${e.category} · ${formatDate(e.spent_at)}`,
        amount: Number(e.amount),
        currency: e.currency,
        at: e.spent_at,
        expense: e as Expense | undefined,
        payout: undefined as Payout | undefined,
      })),
      ...payouts.map((p) => ({
        kind: "payout" as const,
        id: p.id,
        tripId: p.trip_id,
        title: p.note?.trim() || "Wypłata",
        subtitle: formatDate(p.paid_at),
        amount: Number(p.amount),
        currency: p.currency,
        at: p.paid_at,
        expense: undefined as Expense | undefined,
        payout: p as Payout | undefined,
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
              <button
                type="button"
                aria-label="Edytuj transakcję"
                onClick={() => {
                  if (t.expense) setEditingExpense(t.expense);
                  else if (t.payout) setEditingPayout(t.payout);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-secondary"
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </button>
              <DeleteTransactionButton kind={t.kind} id={t.id} />
            </div>
          );
        })}
      </div>

      {editingExpense && (
        <Modal title="Edytuj koszt" onClose={() => setEditingExpense(null)}>
          <ExpenseForm
            trips={trips}
            categories={categories}
            expense={editingExpense}
            onSaved={() => setEditingExpense(null)}
          />
        </Modal>
      )}

      {editingPayout && (
        <Modal title="Edytuj wypłatę" onClose={() => setEditingPayout(null)}>
          <PayoutForm trips={trips} payout={editingPayout} onSaved={() => setEditingPayout(null)} />
        </Modal>
      )}
    </>
  );
}

/**
 * Jeden formularz w dwóch rolach: bez `expense` dodaje, z nim edytuje.
 * Dzięki temu pola i walidacja nie mogą rozjechać się między dodawaniem
 * a poprawianiem.
 */
function ExpenseForm({
  trips,
  categories,
  expense,
  onSaved,
}: {
  trips: Trip[];
  categories: string[];
  expense?: Expense;
  onSaved?: () => void;
}) {
  const editing = expense !== undefined;
  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState<Currency>(expense?.currency ?? "EUR");
  const [tripId, setTripId] = useState<string | null | undefined>(
    expense ? expense.trip_id : undefined,
  );
  const effectiveTripId = tripId === undefined ? defaultTripId(trips) : tripId;

  const [state, formAction, pending] = useAction(
    editing ? updateExpenseAction : createExpenseAction,
    {
      onSuccess: () => {
        if (editing) {
          onSaved?.();
          return;
        }
        setName("");
        setAmount("");
      },
    },
  );

  return (
    <form
      action={formAction}
      className={editing ? "space-y-4" : "mt-4 space-y-4 rounded-2xl bg-card p-4"}
    >
      {expense && <input type="hidden" name="id" value={expense.id} />}

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

      <Field label="Data wydatku">
        <input
          type="date"
          name="spent_on"
          required
          max={todayLocal()}
          defaultValue={expense ? momentToDay(expense.spent_at) : todayLocal()}
          className="input-field"
        />
      </Field>

      <Field label="Kategoria">
        <select
          name="category"
          defaultValue={expense?.category ?? categories.at(-1) ?? ""}
          className="input-field"
        >
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
        {editing ? (
          "Zapisz koszt"
        ) : (
          <>
            <Plus className="h-5 w-5 shrink-0" /> Dodaj koszt
          </>
        )}
      </button>
    </form>
  );
}

function PayoutForm({
  trips,
  payout,
  onSaved,
}: {
  trips: Trip[];
  payout?: Payout;
  onSaved?: () => void;
}) {
  const editing = payout !== undefined;
  const [amount, setAmount] = useState(payout ? String(payout.amount) : "");
  const [note, setNote] = useState(payout?.note ?? "");
  const [currency, setCurrency] = useState<Currency>(payout?.currency ?? "EUR");
  const [tripId, setTripId] = useState<string | null | undefined>(
    payout ? payout.trip_id : undefined,
  );
  const effectiveTripId = tripId === undefined ? defaultTripId(trips) : tripId;

  const [state, formAction, pending] = useAction(
    editing ? updatePayoutAction : createPayoutAction,
    {
      onSuccess: () => {
        if (editing) {
          onSaved?.();
          return;
        }
        setAmount("");
        setNote("");
      },
    },
  );

  return (
    <form
      action={formAction}
      className={editing ? "space-y-4" : "mt-4 space-y-4 rounded-2xl bg-card p-4"}
    >
      {payout && <input type="hidden" name="id" value={payout.id} />}

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

      <Field label="Data wypłaty">
        <input
          type="date"
          name="paid_on"
          required
          max={todayLocal()}
          defaultValue={payout ? momentToDay(payout.paid_at) : todayLocal()}
          className="input-field"
        />
      </Field>

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
        {editing ? (
          "Zapisz wypłatę"
        ) : (
          <>
            <Plus className="h-5 w-5 shrink-0" /> Dodaj wypłatę
          </>
        )}
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
