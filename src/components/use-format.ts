"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/locale-provider";
import { formatDate, formatDateTime, formatMoney, type Currency } from "@/lib/money";
import { periodLabel, type Period } from "@/lib/period";
import { tripLabel } from "@/lib/trip-summary";
import type { Trip } from "@/lib/types";

/**
 * Formattery związane z bieżącym językiem.
 *
 * Bez tego każde wywołanie musiałoby przewlekać `locale` z kontekstu przez
 * kolejne argumenty — kilkadziesiąt miejsc, w których łatwo o pominięcie
 * i o ekran mieszający formaty dwóch języków.
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
      trip: (trip: Pick<Trip, "departure_at" | "return_at">) =>
        tripLabel(trip, { locale, ongoing: t("common.ongoing") }),
    }),
    [locale, t],
  );
}
