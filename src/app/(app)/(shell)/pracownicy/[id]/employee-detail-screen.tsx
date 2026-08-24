"use client";

import {
  ArrowLeft,
  Clock,
  FileDown,
  KeyRound,
  Pencil,
  Plane,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { toast } from "sonner";

import { useRates } from "@/components/rates-provider";
import { StatCard } from "@/components/trip-summary-view";
import { useAction } from "@/components/use-action";
import { EmptyState, Field, FormMessage, Modal } from "@/components/ui";
import { resetEmployeePasswordAction, type ResetPasswordState } from "@/lib/actions/company";
import {
  createWorkEntryAction,
  deleteWorkEntryAction,
  updateWorkEntryAction,
} from "@/lib/actions/data";
import { formatDate, formatDateTime, formatHours, formatMoney, hoursBetween, toDisplayAmount } from "@/lib/money";
import { printDocument } from "@/lib/print";
import { tripLabel } from "@/lib/trip-summary";
import type { Payout, Trip, WorkEntry } from "@/lib/types";

const ALL_MONTHS = "all";

type Employee = { id: string; email: string; name: string };

function monthKeyOfEntry(entry: WorkEntry): string {
  return entry.work_date.slice(0, 7);
}

function monthName(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
}

export function EmployeeDetailScreen({
  employee,
  entries,
  trips,
  payouts,
}: {
  employee: Employee;
  entries: WorkEntry[];
  trips: Trip[];
  payouts: Payout[];
}) {
  const [month, setMonth] = useState<string>(ALL_MONTHS);
  const [editing, setEditing] = useState<WorkEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const months = useMemo(() => {
    const keys = new Set(entries.map(monthKeyOfEntry));
    return [...keys].sort().reverse();
  }, [entries]);

  const visible = useMemo(
    () => (month === ALL_MONTHS ? entries : entries.filter((e) => monthKeyOfEntry(e) === month)),
    [entries, month],
  );

  const totalHours = useMemo(
    () => visible.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0),
    [visible],
  );

  // Grupowanie po wyjazdach; wpisy bez przypisania lądują na końcu.
  const groups = useMemo(() => {
    const byTrip = new Map<string, WorkEntry[]>();
    const unassigned: WorkEntry[] = [];

    for (const entry of visible) {
      if (!entry.trip_id) {
        unassigned.push(entry);
        continue;
      }
      const list = byTrip.get(entry.trip_id);
      if (list) list.push(entry);
      else byTrip.set(entry.trip_id, [entry]);
    }

    const tripGroups = trips
      .filter((trip) => byTrip.has(trip.id))
      .map((trip) => ({ trip, entries: byTrip.get(trip.id) ?? [] }));

    return { tripGroups, unassigned };
  }, [visible, trips]);

  return (
    <>
      <div className="no-print flex gap-2">
        <Link
          href="/pracownicy"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" /> Wróć do zespołu
        </Link>
        <button
          type="button"
          onClick={() => printDocument(`Godziny_${employee.name}`)}
          aria-label="Eksportuj do PDF"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold active:bg-secondary"
        >
          <FileDown className="h-5 w-5 shrink-0" /> PDF
        </button>
      </div>

      {/* Nagłówek widoczny wyłącznie w PDF/na wydruku. */}
      <div className="print-only mb-4">
        <h1 className="text-xl font-bold">Godziny pracy — {employee.name}</h1>
        <p className="text-sm">
          {month === ALL_MONTHS ? "Wszystkie wpisy" : monthName(month)} · razem{" "}
          {formatHours(totalHours)}
        </p>
      </div>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <p className="break-words text-lg font-semibold">{employee.name}</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{employee.email}</p>
      </section>

      <section className="no-print mt-4 rounded-2xl bg-card p-4">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="month">
          Miesiąc
        </label>
        <select
          id="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input-field mt-2"
        >
          <option value={ALL_MONTHS}>Wszystkie miesiące</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {monthName(key)}
            </option>
          ))}
        </select>
      </section>

      <section className="mt-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-primary" />}
          label={month === ALL_MONTHS ? "Godziny łącznie" : `Godziny — ${monthName(month)}`}
          value={formatHours(totalHours)}
        />
      </section>

      <PayoutsSection payouts={payouts} month={month} />

      <div className="no-print mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4 shrink-0" /> Dodaj wpis
        </button>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"
        >
          <KeyRound className="h-4 w-4 shrink-0" /> Reset hasła
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState>
            {entries.length === 0
              ? "Ten pracownik nie zapisał jeszcze żadnych godzin."
              : "Brak wpisów w wybranym miesiącu."}
          </EmptyState>
        </div>
      ) : (
        <>
          {groups.tripGroups.map(({ trip, entries: tripEntries }) => (
            <EntryGroup
              key={trip.id}
              title={tripLabel(trip)}
              subtitle="wyjazd"
              entries={tripEntries}
              employeeId={employee.id}
              onEdit={setEditing}
            />
          ))}

          {groups.unassigned.length > 0 && (
            <EntryGroup
              title="Bez przypisania do wyjazdu"
              entries={groups.unassigned}
              employeeId={employee.id}
              onEdit={setEditing}
            />
          )}
        </>
      )}

      {adding && (
        <EntryFormModal
          title="Dodaj wpis godzin"
          employeeId={employee.id}
          trips={trips}
          onClose={() => setAdding(false)}
        />
      )}

      {editing && (
        <EntryFormModal
          title="Edytuj wpis godzin"
          employeeId={employee.id}
          trips={trips}
          entry={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {resetOpen && (
        <ResetPasswordModal employee={employee} onClose={() => setResetOpen(false)} />
      )}
    </>
  );
}

/**
 * Wypłaty pracownika. Właściciel je widzi, bo sam je wydał — inaczej niż koszty,
 * które pracownik ponosi z własnej kieszeni i które zostają prywatne.
 */
function PayoutsSection({ payouts, month }: { payouts: Payout[]; month: string }) {
  const rates = useRates();

  const visible = useMemo(
    () => (month === ALL_MONTHS ? payouts : payouts.filter((p) => p.paid_at.startsWith(month))),
    [payouts, month],
  );

  const totalPln = useMemo(
    () =>
      visible.reduce(
        (sum, p) => sum + toDisplayAmount(p.amount, p.currency, p.nbp_rate, "PLN", rates),
        0,
      ),
    [visible, rates],
  );

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 shrink-0 text-success" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Wypłaty {month === ALL_MONTHS ? "łącznie" : `— ${monthName(month)}`}
        </h2>
      </div>

      <p className="mt-3 break-words text-lg font-bold tabular-nums text-success">
        {formatMoney(totalPln, "PLN")}
      </p>

      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Brak wypłat w tym okresie.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((payout) => (
            <li
              key={payout.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {payout.note?.trim() || "Wypłata"}
                <span className="block text-xs text-muted-foreground">
                  {formatDateTime(payout.paid_at)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-success">
                {formatMoney(payout.amount, payout.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryGroup({
  title,
  subtitle,
  entries,
  employeeId,
  onEdit,
}: {
  title: string;
  subtitle?: string;
  entries: WorkEntry[];
  employeeId: string;
  onEdit: (entry: WorkEntry) => void;
}) {
  const hours = entries.reduce((s, e) => s + hoursBetween(e.start_time, e.end_time), 0);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {subtitle && (
            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              <Plane className="h-3 w-3 shrink-0" /> {subtitle}
            </p>
          )}
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
          {formatHours(hours)}
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const entryHours = hoursBetween(entry.start_time, entry.end_time);
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
                  {formatHours(entryHours)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(entry)}
                aria-label="Edytuj wpis"
                className="no-print flex h-11 w-11 shrink-0 items-center justify-center rounded-xl active:bg-secondary"
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </button>
              <DeleteEntryButton id={entry.id} employeeId={employeeId} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeleteEntryButton({ id, employeeId }: { id: string; employeeId: string }) {
  const [, formAction, pending] = useAction(deleteWorkEntryAction, { toastError: true });

  return (
    <form action={formAction} className="no-print">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="employee_id" value={employeeId} />
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

function EntryFormModal({
  title,
  employeeId,
  trips,
  entry,
  onClose,
}: {
  title: string;
  employeeId: string;
  trips: Trip[];
  entry?: WorkEntry;
  onClose: () => void;
}) {
  const action = entry ? updateWorkEntryAction : createWorkEntryAction;
  const [state, formAction, pending] = useAction(action, { onSuccess: onClose });

  return (
    <Modal title={title} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="employee_id" value={employeeId} />
        {entry && <input type="hidden" name="id" value={entry.id} />}

        <Field label="Wyjazd">
          <select
            name="trip_id"
            defaultValue={entry?.trip_id ?? ""}
            className="input-field"
          >
            <option value="">Bez przypisania</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {tripLabel(trip)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data">
          <input
            type="date"
            name="work_date"
            required
            defaultValue={entry?.work_date ?? ""}
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Od">
            <input
              type="time"
              name="start_time"
              required
              defaultValue={entry?.start_time ?? ""}
              className="input-field input-field-compact"
            />
          </Field>
          <Field label="Do">
            <input
              type="time"
              name="end_time"
              required
              defaultValue={entry?.end_time ?? ""}
              className="input-field input-field-compact"
            />
          </Field>
        </div>

        <FormMessage error={state.error} />

        <button
          type="submit"
          disabled={pending}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          {entry ? "Zapisz wpis" : "Dodaj wpis"}
        </button>
      </form>
    </Modal>
  );
}

const EMPTY_RESET: ResetPasswordState = {};

function ResetPasswordModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(resetEmployeePasswordAction, EMPTY_RESET);

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Hasło skopiowane do schowka");
    } catch {
      toast.error("Nie udało się skopiować — przepisz hasło ręcznie");
    }
  }

  return (
    <Modal title="Reset hasła pracownika" onClose={onClose}>
      {state.password ? (
        <>
          <p className="text-sm text-muted-foreground">
            Nowe hasło dla <span className="font-semibold text-foreground">{employee.name}</span> (
            {employee.email}). Przekaż je pracownikowi — po zalogowaniu powinien ustawić własne w Ustawieniach.
          </p>
          <p className="rounded-xl bg-secondary p-4 text-center font-mono text-2xl font-bold tracking-widest">
            {state.password}
          </p>
          <button
            type="button"
            onClick={() => copy(state.password as string)}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-secondary text-sm font-semibold"
          >
            Kopiuj hasło
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
          >
            Gotowe
          </button>
        </>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="user_id" value={employee.id} />
          <p className="text-sm text-muted-foreground">
            Wygenerujemy losowe 7-literowe hasło i pokażemy je tylko raz. Dotychczasowe hasło
            pracownika przestanie działać, a jego sesje zostaną zamknięte.
          </p>
          <FormMessage error={state.error} />
          <button
            type="submit"
            disabled={pending}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-destructive text-base font-semibold text-destructive-foreground disabled:opacity-60"
          >
            Zresetuj hasło
          </button>
        </form>
      )}
    </Modal>
  );
}
