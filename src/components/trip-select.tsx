"use client";

import { tripLabel } from "@/lib/trip-summary";
import type { Trip } from "@/lib/types";

/**
 * Wybór podróży, do której należy wpis. "Bez przypisania" (puste) jest legalną
 * opcją — wpis liczy się wtedy tylko w globalnym podsumowaniu na dashboardzie.
 */
export function TripSelect({
  trips,
  value,
  onChange,
  label = "Podróż",
  name = "trip_id",
}: {
  trips: Trip[];
  value: string | null;
  onChange: (tripId: string | null) => void;
  label?: string;
  name?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-field"
      >
        <option value="">Bez przypisania</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {tripLabel(trip)}
          </option>
        ))}
      </select>
      {trips.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Najpierw dodaj podróż w zakładce Podróże, żeby przypisywać do niej wpisy.
        </p>
      )}
    </div>
  );
}
