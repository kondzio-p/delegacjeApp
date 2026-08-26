"use client";

import { ChevronRight, Eye, Flag, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useT } from "@/components/locale-provider";
import { useAction } from "@/components/use-action";
import { useFormat } from "@/components/use-format";
import { EmptyState, Field, FormMessage, Modal } from "@/components/ui";
import { createTripAction, deleteTripAction, updateTripAction } from "@/lib/actions/data";
import type { Trip } from "@/lib/types";

/** ISO -> wartość dla <input type="datetime-local"> w czasie lokalnym. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function nowLocalInput(): string {
  return toLocalInput(new Date().toISOString());
}

export function TripsScreen({ trips }: { trips: Trip[] }) {
  const t = useT();
  const fmt = useFormat();
  const [editing, setEditing] = useState<Trip | null>(null);
  const [prefillNow, setPrefillNow] = useState(false);

  return (
    <>
      <NewTripForm />

      <div className="mt-5 space-y-3">
        {trips.length === 0 && <EmptyState>{t("trips.empty")}</EmptyState>}

        {trips.map((trip) => {
          const isOngoing = !trip.return_at;
          return (
            <div key={trip.id} className="overflow-hidden rounded-2xl bg-card p-4">
              <Link href={`/podroze/${trip.id}`} className="flex w-full items-center gap-3 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {fmt.dateTime(trip.departure_at)}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {trip.return_at ? (
                      fmt.dateTime(trip.return_at)
                    ) : (
                      <span className="font-medium text-success">{t("common.ongoing")}</span>
                    )}
                  </p>
                </div>
                {trip.share_enabled && (
                  <span
                    title={t("trips.shareActive")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary"
                  >
                    <Eye className="h-4 w-4 text-accent" />
                  </span>
                )}
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>

              <div className="mt-3 flex flex-wrap gap-2">
                {isOngoing && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrefillNow(true);
                      setEditing(trip);
                    }}
                    className="flex h-12 min-w-0 flex-1 basis-full items-center justify-center gap-2 rounded-xl bg-success text-sm font-semibold text-success-foreground"
                  >
                    <Flag className="h-4 w-4 shrink-0" /> {t("trips.finish")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPrefillNow(false);
                    setEditing(trip);
                  }}
                  className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"
                >
                  <Pencil className="h-4 w-4 shrink-0" /> {t("trips.edit")}
                </button>
                <DeleteTripButton id={trip.id} />
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditTripModal
          trip={editing}
          prefillReturnWithNow={prefillNow}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function NewTripForm() {
  const t = useT();
  const [departure, setDeparture] = useState("");
  const [ret, setRet] = useState("");
  const [ongoing, setOngoing] = useState(false);

  const [state, formAction, pending] = useAction(createTripAction, {
    onSuccess: () => {
      setDeparture("");
      setRet("");
      setOngoing(false);
    },
  });

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-card p-4">
      <Field label={t("trips.departure")}>
        <input
          type="datetime-local"
          name="departure_at"
          required
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
          className="input-field"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-4">
        <input
          type="checkbox"
          name="ongoing"
          checked={ongoing}
          onChange={(e) => setOngoing(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-[oklch(0.585_0.233_277.117)]"
        />
        <span className="min-w-0 text-base font-medium">{t("trips.ongoing")}</span>
      </label>

      {!ongoing && (
        <Field label={t("trips.return")}>
          <input
            type="datetime-local"
            name="return_at"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
            className="input-field"
          />
        </Field>
      )}

      <FormMessage error={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        <Plus className="h-5 w-5 shrink-0" /> {t("trips.add")}
      </button>
    </form>
  );
}

function EditTripModal({
  trip,
  prefillReturnWithNow,
  onClose,
}: {
  trip: Trip;
  prefillReturnWithNow: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [state, formAction, pending] = useAction(updateTripAction, { onSuccess: onClose });
  const [departure, setDeparture] = useState(() => toLocalInput(trip.departure_at));
  const [ret, setRet] = useState(() =>
    trip.return_at ? toLocalInput(trip.return_at) : prefillReturnWithNow ? nowLocalInput() : "",
  );

  return (
    <Modal title={t("trips.editTitle")} onClose={onClose}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={trip.id} />

        <Field label={t("trips.departure")}>
          <input
            type="datetime-local"
            name="departure_at"
            required
            value={departure}
            onChange={(e) => setDeparture(e.target.value)}
            className="input-field"
          />
        </Field>

        <Field label={t("trips.returnOrOngoing")}>
          <input
            type="datetime-local"
            name="return_at"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
            className="input-field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRet(nowLocalInput())}
            className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"
          >
            <Flag className="h-4 w-4 shrink-0" /> {t("trips.now")}
          </button>
          <button
            type="button"
            onClick={() => setRet("")}
            className="flex h-12 min-w-0 items-center justify-center rounded-xl bg-secondary text-sm font-semibold"
          >
            {t("trips.stillOngoing")}
          </button>
        </div>

        <FormMessage error={state.error} />

        <button
          type="submit"
          disabled={pending}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          {t("trips.save")}
        </button>
      </form>
    </Modal>
  );
}

function DeleteTripButton({ id }: { id: string }) {
  const t = useT();
  const [, formAction, pending] = useAction(deleteTripAction, { toastError: true });

  return (
    <form action={formAction} className="min-w-0 flex-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-destructive disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4 shrink-0" /> {t("trips.delete")}
      </button>
    </form>
  );
}
