"use client";

import { ArrowDownCircle, ArrowUpCircle, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useT } from "@/components/locale-provider";
import { TripSelect } from "@/components/trip-select";
import { useAction } from "@/components/use-action";
import { useFormat } from "@/components/use-format";
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
import { type Currency } from "@/lib/money";
import { defaultTripId } from "@/lib/trip-summary";
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
  const t = useT();
  const fmt = useFormat();
  const [tab, setTab] = useState<"expense" | "payout">("expense");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPayout, setEditingPayout] = useState<Payout | null>(null);
  const tripById = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);

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
        subtitle: `${e.category} · ${fmt.date(e.spent_at)}`,
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
        title: p.note?.trim() || t("finance.payout"),
        subtitle: fmt.date(p.paid_at),
        amount: Number(p.amount),
        currency: p.currency,
        at: p.paid_at,
        expense: undefined as Expense | undefined,
        payout: p as Payout | undefined,
      })),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [expenses, payouts, fmt, t]);

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
          {t("finance.expense")}
        </button>
        <button
          type="button"
          onClick={() => setTab("payout")}
          className={`min-w-0 rounded-lg py-3 text-base font-semibold ${
            tab === "payout" ? "bg-success text-success-foreground" : "text-muted-foreground"
          }`}
        >
          {t("finance.payout")}
        </button>
      </div>

      {tab === "expense" ? (
        <ExpenseForm trips={trips} categories={categories} />
      ) : (
        <PayoutForm trips={trips} />
      )}

      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("finance.history")}
      </h2>
      <div className="space-y-3">
        {transactions.length === 0 && <EmptyState>{t("finance.empty")}</EmptyState>}

        {transactions.map((row) => {
          const trip = row.tripId ? tripById.get(row.tripId) : undefined;
          return (
            <div
              key={`${row.kind}-${row.id}`}
              className="flex items-center gap-3 rounded-2xl bg-card p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {row.kind === "expense" ? (
                  <ArrowDownCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <ArrowUpCircle className="h-5 w-5 text-success" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Plane className="h-3 w-3 shrink-0" />
                  {trip ? fmt.trip(trip) : t("common.unassigned")}
                </p>
                <p
                  className={`mt-1 text-sm font-bold tabular-nums ${
                    row.kind === "expense" ? "text-destructive" : "text-success"
                  }`}
                >
                  {row.kind === "expense" ? "-" : "+"}
                  {fmt.money(row.amount, row.currency)}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("finance.editTransaction")}
                onClick={() => {
                  if (row.expense) setEditingExpense(row.expense);
                  else if (row.payout) setEditingPayout(row.payout);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-secondary"
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </button>
              <DeleteTransactionButton kind={row.kind} id={row.id} />
            </div>
          );
        })}
      </div>

      {editingExpense && (
        <Modal title={t("finance.editExpense")} onClose={() => setEditingExpense(null)}>
          <ExpenseForm
            trips={trips}
            categories={categories}
            expense={editingExpense}
            onSaved={() => setEditingExpense(null)}
          />
        </Modal>
      )}

      {editingPayout && (
        <Modal title={t("finance.editPayout")} onClose={() => setEditingPayout(null)}>
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
  const t = useT();
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

      <Field label={t("common.name")}>
        <input
          name="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("finance.namePlaceholder")}
          className="input-field"
        />
      </Field>

      <Field label={t("common.amount")}>
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

      <Field label={t("finance.spentOn")}>
        <input
          type="date"
          name="spent_on"
          required
          max={todayLocal()}
          defaultValue={expense ? momentToDay(expense.spent_at) : todayLocal()}
          className="input-field"
        />
      </Field>

      <Field label={t("finance.category")}>
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
          t("finance.saveExpense")
        ) : (
          <>
            <Plus className="h-5 w-5 shrink-0" /> {t("finance.addExpense")}
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
  const t = useT();
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

      <Field label={t("common.amount")}>
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

      <Field label={t("finance.paidOn")}>
        <input
          type="date"
          name="paid_on"
          required
          max={todayLocal()}
          defaultValue={payout ? momentToDay(payout.paid_at) : todayLocal()}
          className="input-field"
        />
      </Field>

      <Field label={t("finance.note")}>
        <input
          name="note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("finance.notePlaceholder")}
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
          t("finance.savePayout")
        ) : (
          <>
            <Plus className="h-5 w-5 shrink-0" /> {t("finance.addPayout")}
          </>
        )}
      </button>
    </form>
  );
}

function DeleteTransactionButton({ kind, id }: { kind: "expense" | "payout"; id: string }) {
  const t = useT();
  const action = kind === "expense" ? deleteExpenseAction : deletePayoutAction;
  const [, formAction, pending] = useAction(action, { toastError: true });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("finance.deleteTransaction")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destructive active:bg-secondary disabled:opacity-50"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </form>
  );
}
