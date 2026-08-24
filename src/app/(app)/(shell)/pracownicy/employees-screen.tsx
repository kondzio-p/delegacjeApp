"use client";

import { ArrowDownWideNarrow, ArrowDownAZ, Check, ChevronRight, Clock, Plane, UserPlus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAction } from "@/components/use-action";
import { EmptyState } from "@/components/ui";
import { acceptJoinRequestAction, rejectJoinRequestAction } from "@/lib/actions/company";
import { formatDate, formatHours } from "@/lib/money";
import type { EmployeeCard, JoinRequestRow } from "@/lib/queries";
import type { ActionState } from "@/lib/types";

type SortMode = "name" | "hours";

export function EmployeesScreen({
  companyName,
  employees,
  requests,
  month,
  months,
}: {
  companyName: string;
  employees: EmployeeCard[];
  requests: JoinRequestRow[];
  month: string;
  months: { key: string; label: string }[];
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>("name");

  const monthName = months.find((m) => m.key === month)?.label ?? month;

  // Lista jest w całości w pamięci, więc sortowanie nie wymaga rundy do serwera.
  const sorted = useMemo(() => {
    const list = [...employees];
    if (sort === "hours") {
      // Przy równych godzinach zostaje kolejność alfabetyczna — stabilny wynik.
      return list.sort(
        (a, b) => b.monthHours - a.monthHours || a.name.localeCompare(b.name, "pl"),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [employees, sort]);

  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <p className="text-sm text-muted-foreground">Firma</p>
        <p className="mt-1 break-words text-lg font-semibold">{companyName}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Pracownik dołącza, wpisując tę nazwę w swoich ustawieniach. Widzisz jego godziny pracy
          i wypłaty — koszty, które ponosi sam, zostają prywatne.
        </p>
      </section>

      {requests.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <UserPlus className="h-4 w-4 shrink-0" />
            Prośby o dołączenie ({requests.length})
          </h2>
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.user_id} className="rounded-2xl bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{request.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{request.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <RequestButton
                    action={acceptJoinRequestAction}
                    userId={request.user_id}
                    label="Akceptuj"
                    icon={<Check className="h-4 w-4 shrink-0" />}
                    className="bg-success text-success-foreground"
                  />
                  <RequestButton
                    action={rejectJoinRequestAction}
                    userId={request.user_id}
                    label="Odrzuć"
                    icon={<X className="h-4 w-4 shrink-0" />}
                    className="bg-secondary text-destructive"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Zespół ({employees.length})
      </h2>

      <section className="mb-3 rounded-2xl bg-card p-4">
        <label className="block text-sm font-medium text-muted-foreground" htmlFor="month">
          Miesiąc
        </label>
        <select
          id="month"
          value={month}
          onChange={(e) => router.push(`/pracownicy?miesiac=${e.target.value}`)}
          className="input-field mt-2"
        >
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <p className="mt-4 mb-2 text-sm font-medium text-muted-foreground">Sortuj</p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
          {(
            [
              { mode: "name", label: "Alfabetycznie", icon: ArrowDownAZ },
              { mode: "hours", label: "Wg godzin", icon: ArrowDownWideNarrow },
            ] as const
          ).map((option) => (
            <button
              key={option.mode}
              type="button"
              onClick={() => setSort(option.mode)}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold ${
                sort === option.mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <option.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {employees.length === 0 && (
          <EmptyState>
            Nikt jeszcze nie dołączył. Podaj pracownikom dokładną nazwę firmy — wpisują ją w swoich
            ustawieniach.
          </EmptyState>
        )}

        {sorted.map((employee) => (
          <Link
            key={employee.id}
            href={`/pracownicy/${employee.id}`}
            className="flex items-center gap-3 rounded-2xl bg-card p-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <UserRound className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{employee.name}</p>
                {employee.onTrip ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    <Plane className="h-3 w-3" /> na wyjeździe
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    w kraju
                  </span>
                )}
              </div>

              <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground">
                  {formatHours(employee.monthHours)}
                </span>
                <span className="truncate">· {monthName}</span>
              </p>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {employee.lastEntry
                  ? `Ostatni wpis: ${formatDate(employee.lastEntry.work_date)} · ${
                      employee.lastEntry.start_time
                    }–${employee.lastEntry.end_time}`
                  : "Brak wpisów godzin"}
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </>
  );
}

function RequestButton({
  action,
  userId,
  label,
  icon,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  userId: string;
  label: string;
  icon: React.ReactNode;
  className: string;
}) {
  const [, formAction, pending] = useAction(action, { toastError: true });

  return (
    <form action={formAction} className="min-w-0 flex-1">
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className={`flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${className}`}
      >
        {icon} {label}
      </button>
    </form>
  );
}
