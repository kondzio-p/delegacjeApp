"use client";

import { useT } from "@/components/locale-provider";
import { useFormat } from "@/components/use-format";
import type { Trip } from "@/lib/types";

/**
 * Wybór podróży, do której należy wpis.
 *
 * „Bez przypisania" jest legalną opcją — taki wpis liczy się tylko w globalnym
 * podsumowaniu na pulpicie.
 *
 * Args:
 *     trips (Trip[]): Podróże do wyboru.
 *     value (string | null): Zaznaczona podróż albo brak przypisania.
 *     onChange ((value: string | null) => void): Wywołanie po zmianie wyboru.
 *
 * Returns:
 *     ReactNode: Pole wyboru podróży.
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
