"use client";

import { useT } from "@/components/locale-provider";
import { useFormat } from "@/components/use-format";
import type { Trip } from "@/lib/types";

/**
 * Wybór podróży, do której należy wpis. "Bez przypisania" (puste) jest legalną
 * opcją — wpis liczy się wtedy tylko w globalnym podsumowaniu na dashboardzie.
 */
export function TripSelect({
  trips,
  value,
  onChange,
  label,
  name = "trip_id",
}: {
  trips: Trip[];
  value: string | null;
  onChange: (tripId: string | null) => void;
  label?: string;
  name?: string;
}) {
  const t = useT();
  const fmt = useFormat();

  return (
    <div className="min-w-0 space-y-2">
      <span className="text-sm text-muted-foreground">{label ?? t("common.trip")}</span>
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-field"
      >
        <option value="">{t("common.noTrip")}</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {fmt.trip(trip)}
          </option>
        ))}
      </select>
      {trips.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("common.addTripFirst")}</p>
      )}
    </div>
  );
}
