"use client";

import { Check, ChevronRight, Clock, Plane, UserPlus, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useAction } from "@/components/use-action";
import { EmptyState } from "@/components/ui";
import { acceptJoinRequestAction, rejectJoinRequestAction } from "@/lib/actions/company";
import { formatDate, formatHours } from "@/lib/money";
import type { EmployeeCard, JoinRequestRow } from "@/lib/queries";
import type { ActionState } from "@/lib/types";

export function EmployeesScreen({
  companyName,
  employees,
  requests,
  monthName,
}: {
  companyName: string;
  employees: EmployeeCard[];
  requests: JoinRequestRow[];
  monthName: string;
}) {
  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <p className="text-sm text-muted-foreground">Firma</p>
        <p className="mt-1 break-words text-lg font-semibold">{companyName}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Pracownik dołącza, wpisując tę nazwę w swoich ustawieniach. Widzisz wyłącznie jego godziny
          pracy — koszty i wypłaty zostają prywatne.
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

      <div className="space-y-3">
        {employees.length === 0 && (
          <EmptyState>
            Nikt jeszcze nie dołączył. Podaj pracownikom dokładną nazwę firmy — wpisują ją w swoich
            ustawieniach.
          </EmptyState>
        )}

        {employees.map((employee) => (
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
                    <Plane className="h-3 w-3" /> w delegacji
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
