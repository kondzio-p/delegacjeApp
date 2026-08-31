"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/locale-provider";
import { monthLabel } from "@/lib/day";
import { formatDate, formatDateTime, formatMoney, type Currency } from "@/lib/money";
import { periodLabel, type Period } from "@/lib/period";
import { tripLabel } from "@/lib/trip-summary";
import type { Trip } from "@/lib/types";

/**
 * Zbiera formattery związane z bieżącym językiem.
 *
 * Bez tego każde wywołanie musiałoby przewlekać język przez kolejne argumenty —
 * kilkadziesiąt miejsc, w których łatwo o ekran mieszający dwa formaty.
 *
 * Returns:
 *     object: Formattery kwot, dat, okresów, miesięcy i etykiet podróży.
 */
export function useFormat() {
  const { locale, t } = useLocale();

  return useMemo(
    () => ({
      locale,
      money: (amount: number, currency: Currency) => formatMoney(amount, currency, locale),
      date: (value: string) => formatDate(value, locale),
      dateTime: (value: string) => formatDateTime(value, locale),
      period: (period: Period) => periodLabel(period, locale),
      month: (monthKey: string) => monthLabel(monthKey, locale),
      trip: (trip: Pick<Trip, "departure_at" | "return_at">) =>
        tripLabel(trip, { locale, ongoing: t("common.ongoing") }),
    }),
    [locale, t],
  );
}
