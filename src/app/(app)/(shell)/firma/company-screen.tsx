"use client";

import {
  Building2,
  ChevronRight,
  Clock,
  FileDown,
  FileText,
  Plane,
  RotateCcw,
  Table2,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useT, type Translate } from "@/components/locale-provider";
import { StatCard } from "@/components/trip-summary-view";
import { useFormat } from "@/components/use-format";
import { Field, Modal } from "@/components/ui";
import { csvAmount, toCsv } from "@/lib/csv";
import { formatHours } from "@/lib/money";
import { lastMonth, thisMonth, type Period } from "@/lib/period";
import { downloadFile, isoDay, printDocument } from "@/lib/print";
import type { PayrollRow } from "@/lib/queries";
import { RATE_CODES, rateToPln, type CurrentRates, type RateCode } from "@/lib/rates";
import type { CompanyRole } from "@/lib/session";

/** Wiersz raportu po ewentualnej ręcznej korekcie w podglądzie. */
type EditedRow = { hours: string; paid: string };

/** Ile kart pracowników mieści się na jednej stronie A4. */
const CARDS_PER_PAGE = 3;

/**
 * Formatuje kwotę z kodem waluty na końcu.
 *
 * Args:
 *     value (number): Kwota do pokazania.
 *     code (RateCode): Kod waluty raportu.
 *     locale (string): Znacznik języka dla `Intl`.
 *
 * Returns:
 *     string: Kwota w rodzaju „1 234,00 PLN".
 */
function money(value: number, code: RateCode, locale: string): string {
  return `${value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${code}`;
}

/**
 * Dzieli listę na grupy o zadanym rozmiarze.
 *
 * Args:
 *     items (readonly T[]): Elementy do podziału.
 *     size (number): Ile elementów wchodzi na jedną stronę wydruku.
 *
 * Returns:
 *     T[][]: Grupy w kolejności wejściowej.
 */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

export function CompanyScreen({
  companyName,
  role,
  period,
  rows,
  rates,
  onTripCount,
}: {
  companyName: string;
  role: CompanyRole;
  period: Period;
  rows: PayrollRow[];
  rates: CurrentRates | null;
  onTripCount: number;
}) {
  const t = useT();
  const fmt = useFormat();
  const router = useRouter();
  const [formatOpen, setFormatOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const totals = useMemo(
    () => ({
      hours: rows.reduce((s, r) => s + r.hours, 0),
      paid: rows.reduce((s, r) => s + r.paidPln, 0),
    }),
    [rows],
  );

  const setPeriod = (next: Period) =>
    router.push(`/firma?od=${next.from}&do=${next.to}`);

  /**
   * Pobiera zestawienie jako arkusz CSV.
   *
   * Trzy kolumny wprost z ekranu i kwoty w złotówkach — arkusz z innymi
   * liczbami niż widok, z którego wyszedł, mylił bardziej, niż pomagał.
   *
   * Returns:
   *     void: Nic — plik ląduje w pobranych.
   */
  const pobierzCsv = () => {
    const csv = toCsv(rows, [
      { header: t("company.csvName"), value: (row) => row.name },
      { header: t("company.csvHours"), value: (row) => csvAmount(row.hours) },
      {
        header: t("company.csvPaid", { currency: "PLN" }),
        value: (row) => csvAmount(row.paidPln),
      },
    ]);

    downloadFile(`Raport_${companyName}_${period.from}.csv`, csv, "text/csv;charset=utf-8");
    setFormatOpen(false);
  };

  return (
    <>
      {/* Cała zawartość ekranu jest `no-print` — wydruk pokazuje dokument
          z podglądu, a nie przyciski, które go wywołały. */}
      <div className="no-print">
        <section className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="min-w-0 truncate text-lg font-semibold">{companyName}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "founder" ? t("company.founder") : t("company.coOwner")}
          </p>
        </section>

        <PeriodPicker period={period} onChange={setPeriod} />

        <section className="mt-4 grid grid-cols-1 gap-3">
          <StatCard
            icon={<Wallet className="h-5 w-5 text-success" />}
            label={t("company.payoutsInPeriod", { period: fmt.period(period) })}
            value={money(totals.paid, "PLN", fmt.locale)}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-primary" />}
            label={t("company.teamHours")}
            value={formatHours(totals.hours)}
          />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label={t("company.employees")}
            value={String(rows.length)}
          />
          <StatCard
            icon={<Plane className="h-5 w-5 text-accent" />}
            label={t("company.onTrip")}
            value={String(onTripCount)}
          />
          <div className="col-span-2 min-w-0">
            <StatCard
              icon={<Wallet className="h-5 w-5 text-accent" />}
              label={t("company.avgHourly")}
              value={money(totals.hours > 0 ? totals.paid / totals.hours : 0, "PLN", fmt.locale)}
            />
          </div>
        </section>

        <button
          type="button"
          onClick={() => setFormatOpen(true)}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          <FileDown className="h-5 w-5 shrink-0" /> {t("company.report")}
        </button>
      </div>

      {formatOpen && (
        <FormatDialog
          t={t}
          onClose={() => setFormatOpen(false)}
          onPdf={() => {
            setFormatOpen(false);
            setPdfOpen(true);
          }}
          onCsv={pobierzCsv}
        />
      )}

      {pdfOpen && (
        <ReportDialog
          companyName={companyName}
          period={period}
          rows={rows}
          rates={rates}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Pyta o format przed wygenerowaniem raportu.
 *
 * PDF i CSV to dwa różne dokumenty do dwóch różnych zastosowań, więc pytanie
 * pada, zanim cokolwiek się wygeneruje.
 *
 * Args:
 *     t (Translate): Funkcja tłumacząca.
 *     onClose (() => void): Zamknięcie okna bez wyboru.
 *     onPdf (() => void): Wybór wydruku do PDF.
 *     onCsv (() => void): Wybór pobrania arkusza.
 *
 * Returns:
 *     ReactNode: Okno modalne z dwoma formatami.
 */
function FormatDialog({
  t,
  onClose,
  onPdf,
  onCsv,
}: {
  t: Translate;
  onClose: () => void;
  onPdf: () => void;
  onCsv: () => void;
}) {
  // Nazwy formatów zostają po angielsku — tak samo nazywa je każdy system.
  const options = [
    { icon: FileText, onClick: onPdf, title: "PDF", hint: t("company.formatPdfHint") },
    { icon: Table2, onClick: onCsv, title: "CSV", hint: t("company.formatCsvHint") },
  ];

  return (
    <Modal title={t("company.report")} onClose={onClose}>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.title}
            type="button"
            onClick={option.onClick}
            className="flex w-full items-center gap-3 rounded-xl bg-secondary p-4 text-left active:bg-border"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card">
              <option.icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Modal>
  );
}

function PeriodPicker({
  period,
  onChange,
}: {
  period: Period;
  onChange: (period: Period) => void;
}) {
  const t = useT();
  const presets = [
    { label: t("company.thisMonth"), value: thisMonth() },
    { label: t("company.lastMonth"), value: lastMonth() },
  ];

  // `to` jest otwarte, a pole daty pokazuje ostatni dzień włącznie.
  const lastDayValue = (() => {
    const d = new Date(`${period.to}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return isoDay(d.toISOString());
  })();

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <p className="mb-2 text-sm font-medium text-muted-foreground">{t("company.period")}</p>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {presets.map((preset) => {
          const active =
            preset.value.from === period.from && preset.value.to === period.to;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`min-w-0 rounded-lg py-3 text-sm font-semibold ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={t("common.from")}>
          <input
            type="date"
            value={period.from}
            onChange={(e) =>
              e.target.value && onChange({ from: e.target.value, to: period.to })
            }
            className="input-field input-field-compact"
          />
        </Field>
        <Field label={t("company.toInclusive")}>
          <input
            type="date"
            value={lastDayValue}
            onChange={(e) => {
              if (!e.target.value) return;
              const next = new Date(`${e.target.value}T12:00:00`);
              next.setDate(next.getDate() + 1);
              onChange({ from: period.from, to: isoDay(next.toISOString()) });
            }}
            className="input-field input-field-compact"
          />
        </Field>
      </div>
    </section>
  );
}

/**
 * Podgląd raportu przed wygenerowaniem PDF-a.
 *
 * Godziny i kwoty są edytowalne wyłącznie na potrzeby tego dokumentu: wartości
 * siedzą w stanie Reacta i nie mają jak trafić do bazy, a zamknięcie okna
 * kasuje korekty. Dokument do druku stoi obok okna, bo `Modal` ma klasę
 * `no-print`.
 *
 * Args:
 *     companyName (string): Nazwa firmy w nagłówku dokumentu.
 *     period (Period): Zakres, za który liczony jest raport.
 *     rows (PayrollRow[]): Wiersze zestawienia.
 *     rates (CurrentRates | null): Kursy do przeliczenia kwot.
 *     onClose (() => void): Zamknięcie podglądu.
 *
 * Returns:
 *     ReactNode: Okno podglądu razem z dokumentem do druku.
 */
function ReportDialog({
  companyName,
  period,
  rows,
  rates,
  onClose,
}: {
  companyName: string;
  period: Period;
  rows: PayrollRow[];
  rates: CurrentRates | null;
  onClose: () => void;
}) {
  const t = useT();
  const fmt = useFormat();
  const [currency, setCurrency] = useState<RateCode>("PLN");
  const [edits, setEdits] = useState<Record<string, EditedRow>>({});

  const targetRate = rateToPln(currency, rates?.rates) ?? 1;

  const view = rows.map((row) => {
    const edited = edits[row.id];
    const hours = edited ? Number.parseFloat(edited.hours.replace(",", ".")) : row.hours;
    const paidPln = edited ? Number.parseFloat(edited.paid.replace(",", ".")) : row.paidPln;
    return {
      ...row,
      hours: Number.isFinite(hours) ? hours : 0,
      // Edytowana kwota jest podana już w walucie raportu, oryginalna w PLN.
      amount: edited
        ? Number.isFinite(paidPln)
          ? paidPln
          : 0
        : row.paidPln / targetRate,
      touched: Boolean(edited),
    };
  });

  const totalHours = view.reduce((s, r) => s + r.hours, 0);
  const totalAmount = view.reduce((s, r) => s + r.amount, 0);

  const edit = (row: (typeof view)[number], patch: Partial<EditedRow>) =>
    setEdits((prev) => ({
      ...prev,
      [row.id]: {
        hours: patch.hours ?? prev[row.id]?.hours ?? row.hours.toFixed(2),
        paid: patch.paid ?? prev[row.id]?.paid ?? row.amount.toFixed(2),
      },
    }));

  return (
    <>
      <Modal title={t("company.reportPdf")} onClose={onClose}>
        <div className="space-y-4">
          <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
            {t("company.reportHint")} <strong>{t("company.reportHintStrong")}</strong>
          </p>

          <Field label={t("company.reportCurrency")}>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as RateCode);
                // Korekty były w poprzedniej walucie — po zmianie tracą sens.
                setEdits({});
              }}
              className="input-field input-field-compact"
            >
              {RATE_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            {view.length === 0 && (
              <p className="rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                {t("company.noEmployees")}
              </p>
            )}
            {view.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl bg-secondary p-3 ${
                  row.touched ? "ring-1 ring-accent" : ""
                }`}
              >
                <p className="truncate text-sm font-semibold">
                  {row.name}
                  {row.isDeleted && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {t("company.deletedAccount")}
                    </span>
                  )}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="min-w-0 text-xs text-muted-foreground">
                    {t("company.hours")}
                    <input
                      inputMode="decimal"
                      value={edits[row.id]?.hours ?? row.hours.toFixed(2)}
                      onChange={(e) => edit(row, { hours: e.target.value })}
                      className="input-field input-field-compact mt-1"
                    />
                  </label>
                  <label className="min-w-0 text-xs text-muted-foreground">
                    {t("company.paidOutIn", { currency })}
                    <input
                      inputMode="decimal"
                      value={edits[row.id]?.paid ?? row.amount.toFixed(2)}
                      onChange={(e) => edit(row, { paid: e.target.value })}
                      className="input-field input-field-compact mt-1"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-sm">
            <span className="font-semibold">{t("company.total")}</span>
            <span className="text-right tabular-nums">
              {totalHours.toFixed(2)} h
              <span className="block text-xs text-muted-foreground">
                {money(totalAmount, currency, fmt.locale)}
              </span>
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEdits({})}
              disabled={Object.keys(edits).length === 0}
              className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 shrink-0" /> {t("company.restore")}
            </button>
            <button
              type="button"
              onClick={() => printDocument(`Raport_${companyName}_${period.from}`)}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              <FileDown className="h-4 w-4 shrink-0" /> {t("company.generatePdf")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dokument do druku — bez znaczników korekty, ma być czysty. */}
      <div className="print-only">
        <h1 className="text-xl font-bold">{t("company.printTitle")}</h1>
        <p className="mt-1 text-sm">{companyName}</p>
        <p className="text-sm">{t("company.printPeriod", { period: fmt.period(period) })}</p>
        <p className="text-sm">
          {t("company.printGenerated", { date: fmt.date(new Date().toISOString()) })}
        </p>
        <p className="text-sm">
          {t("company.printCurrency", { currency })}
          {currency !== "PLN" && rates
            ? t("company.printRate", {
                rate: targetRate.toFixed(4),
                date: rates.effectiveDate,
              })
            : ""}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">{t("company.colEmployee")}</th>
              <th className="py-1 text-right">{t("company.hours")}</th>
              <th className="py-1 text-right">{t("company.colPaidOut")}</th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr key={row.id} className="border-b border-neutral-300">
                <td className="py-1">{row.name}</td>
                <td className="py-1 text-right tabular-nums">{row.hours.toFixed(2)}</td>
                <td className="py-1 text-right tabular-nums">
                  {money(row.amount, currency, fmt.locale)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="py-2">{t("company.total")}</td>
              <td className="py-2 text-right tabular-nums">{totalHours.toFixed(2)}</td>
              <td className="py-2 text-right tabular-nums">
                {money(totalAmount, currency, fmt.locale)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/*
          Dalej karty pojedynczych osób, po trzy na stronę. Zbiorcza tabela
          odpowiada na pytanie „ile razem", karta na „co podpisuje ta jedna
          osoba" — dlatego każda dostaje własne miejsce, a nie kolejny wiersz.
        */}
        {chunk(view, CARDS_PER_PAGE).map((page) => (
          <section key={page[0].id} className="print-page-break">
            <h2 className="text-base font-bold">{t("company.cardsTitle")}</h2>
            <p className="text-xs">
              {companyName} · {t("company.printPeriod", { period: fmt.period(period) })}
            </p>

            <div className="mt-3 space-y-3">
              {page.map((row) => (
                <article
                  key={row.id}
                  className="min-h-[62mm] rounded-lg border border-neutral-400 p-4"
                >
                  <p className="text-lg font-bold">{row.name}</p>
                  {row.isDeleted && (
                    <p className="text-xs">{t("company.deletedAccount")}</p>
                  )}

                  <dl className="mt-3 text-sm">
                    <div className="flex justify-between border-b border-neutral-300 py-1.5">
                      <dt>{t("company.hours")}</dt>
                      <dd className="font-semibold tabular-nums">{row.hours.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between border-b border-neutral-300 py-1.5">
                      <dt>{t("company.colPaidOut")}</dt>
                      <dd className="font-semibold tabular-nums">
                        {money(row.amount, currency, fmt.locale)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <dt>{t("company.cardAvgHourly")}</dt>
                      <dd className="font-semibold tabular-nums">
                        {money(
                          row.hours > 0 ? row.amount / row.hours : 0,
                          currency,
                          fmt.locale,
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
