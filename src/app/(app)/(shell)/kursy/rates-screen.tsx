"use client";

import { ArrowRightLeft, RefreshCw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { useT } from "@/components/locale-provider";
import { useRates } from "@/components/rates-provider";
import { Field } from "@/components/ui";
import { RATE_CODES, rateToPln, type RateCode } from "@/lib/rates";

export function RatesScreen() {
  const t = useT();
  const current = useRates();

  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<RateCode>("EUR");
  const [to, setTo] = useState<RateCode>("PLN");

  const parsedAmount = useMemo(() => {
    const n = Number.parseFloat(amount.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const result = useMemo(() => {
    const fromRate = rateToPln(from, current?.rates);
    const toRate = rateToPln(to, current?.rates);
    if (fromRate === null || toRate === null || toRate <= 0) return null;
    // PLN jest walutą pośrednią: kwota -> złotówki -> waluta docelowa.
    return (parsedAmount * fromRate) / toRate;
  }, [parsedAmount, from, to, current]);

  if (!current) {
    return (
      <section className="rounded-2xl bg-card p-6 text-center">
        <RefreshCw className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-semibold">{t("rates.unavailable")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("rates.unavailableHint")}</p>
      </section>
    );
  }

  const { EUR, USD } = current.rates;
  const tiles = [
    { label: "EUR / PLN", value: EUR, unit: "PLN" },
    { label: "USD / PLN", value: USD, unit: "PLN" },
    { label: "EUR / USD", value: EUR / USD, unit: "USD" },
  ];

  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-primary">
          <TrendingUp className="h-5 w-5 shrink-0" />
          <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide">
            {t("rates.title")}
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("rates.tableDate", { date: current.effectiveDate })}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="min-w-0 rounded-xl bg-secondary p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
              <p className="mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl">
                {tile.value.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground">{tile.unit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2 text-accent">
          <ArrowRightLeft className="h-5 w-5 shrink-0" />
          <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide">
            {t("rates.converter")}
          </h2>
        </div>

        <div className="mt-4 space-y-4">
          <Field label={t("rates.amount")}>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field text-lg font-semibold"
              placeholder="100"
            />
          </Field>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Field label={t("rates.from")}>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value as RateCode)}
                className="input-field input-field-compact"
              >
                {RATE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>

            <button
              type="button"
              aria-label={t("rates.swap")}
              title={t("rates.swap")}
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary active:bg-primary/20"
            >
              <ArrowRightLeft className="h-5 w-5" />
            </button>

            <Field label={t("rates.to")}>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value as RateCode)}
                className="input-field input-field-compact"
              >
                {RATE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-xs text-muted-foreground">
              {parsedAmount.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} {from}
            </p>
            <p className="mt-1 break-words text-2xl font-bold tabular-nums text-primary sm:text-3xl">
              {result === null
                ? "—"
                : `${result.toLocaleString("pl-PL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ${to}`}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{t("rates.note")}</p>
      </section>
    </>
  );
}
