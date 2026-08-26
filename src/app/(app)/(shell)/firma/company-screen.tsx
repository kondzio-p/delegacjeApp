"use client";

import {
  Building2,
  Clock,
  Download,
  FileDown,
  Plane,
  RotateCcw,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { StatCard } from "@/components/trip-summary-view";
import { Field, Modal } from "@/components/ui";
import { csvAmount, toCsv } from "@/lib/csv";
import { formatHours } from "@/lib/money";
import { lastMonth, periodLabel, thisMonth, type Period } from "@/lib/period";
import { downloadFile, isoDay, printDocument } from "@/lib/print";
import type { PayrollRow } from "@/lib/queries";
import { RATE_CODES, rateToPln, type CurrentRates, type RateCode } from "@/lib/rates";
import type { CompanyRole } from "@/lib/session";

/** Wiersz raportu po ewentualnej ręcznej korekcie w podglądzie. */
type EditedRow = { hours: string; paid: string };

function money(value: number, code: RateCode): string {
  return `${value.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${code}`;
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
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  const totals = useMemo(
    () => ({
      hours: rows.reduce((s, r) => s + r.hours, 0),
      paid: rows.reduce((s, r) => s + r.paidPln, 0),
    }),
    [rows],
  );

  const setPeriod = (next: Period) =>
    router.push(`/firma?od=${next.from}&do=${next.to}`);

  return (
    <>
      <section className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="min-w-0 truncate text-lg font-semibold">{companyName}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {role === "founder" ? "Jesteś założycielem" : "Jesteś współwłaścicielem"}
        </p>
      </section>

      <PeriodPicker period={period} onChange={setPeriod} />

      <section className="mt-4 grid grid-cols-1 gap-3">
        <StatCard
          icon={<Wallet className="h-5 w-5 text-success" />}
          label={`Wypłaty w okresie · ${periodLabel(period)}`}
          value={money(totals.paid, "PLN")}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-primary" />}
          label="Łączne godziny zespołu"
          value={formatHours(totals.hours)}
        />
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Pracownicy"
          value={String(rows.length)}
        />
        <StatCard
          icon={<Plane className="h-5 w-5 text-accent" />}
          label="Na wyjeździe"
          value={String(onTripCount)}
        />
        <div className="col-span-2 min-w-0">
          <StatCard
            icon={<Wallet className="h-5 w-5 text-accent" />}
            label="Średnio za godzinę pracy zespołu"
            value={money(totals.hours > 0 ? totals.paid / totals.hours : 0, "PLN")}
          />
        </div>
      </section>

      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground"
      >
        <FileDown className="h-5 w-5 shrink-0" /> Raport dla księgowej
      </button>

      {reportOpen && (
        <ReportDialog
          companyName={companyName}
          period={period}
          rows={rows}
          rates={rates}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

function PeriodPicker({
  period,
  onChange,
}: {
  period: Period;
  onChange: (period: Period) => void;
}) {
  const presets = [
    { label: "Ten miesiąc", value: thisMonth() },
    { label: "Poprzedni miesiąc", value: lastMonth() },
  ];

  // `to` jest otwarte, a pole daty pokazuje ostatni dzień włącznie.
  const lastDayValue = (() => {
    const d = new Date(`${period.to}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return isoDay(d.toISOString());
  })();

  return (
    <section className="mt-4 rounded-2xl bg-card p-4">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Okres</p>
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
        <Field label="Od">
          <input
            type="date"
            value={period.from}
            onChange={(e) =>
              e.target.value && onChange({ from: e.target.value, to: period.to })
            }
            className="input-field input-field-compact"
          />
        </Field>
        <Field label="Do (włącznie)">
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
 * Podgląd przed wygenerowaniem PDF-a.
 *
 * Godziny i kwoty są edytowalne, ale **wyłącznie na potrzeby tego dokumentu** —
 * wartości siedzą w stanie Reacta, nie ma tu żadnej akcji serwerowej, więc
 * fizycznie nie mają jak trafić do bazy. Zamknięcie okna kasuje korekty.
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

  /**
   * CSV odwzorowuje to, co właściciel ma przed oczami: z ręcznymi korektami
   * i w wybranej walucie raportu. Arkusz rozjeżdżający się z wydrukiem tego
   * samego okresu byłby gorszy niż jego brak.
   */
  const pobierzCsv = () => {
    const csv = toCsv(view, [
      { header: "Pracownik", value: (row) => row.name },
      { header: "Godziny", value: (row) => csvAmount(row.hours) },
      { header: `Wypłacono (${currency})`, value: (row) => csvAmount(row.amount) },
      { header: "Skorygowano ręcznie", value: (row) => (row.touched ? "tak" : "") },
      { header: "Konto usunięte", value: (row) => (row.isDeleted ? "tak" : "") },
    ]);

    downloadFile(`Raport_${companyName}_${period.from}.csv`, csv, "text/csv;charset=utf-8");
  };

  const edit = (row: (typeof view)[number], patch: Partial<EditedRow>) =>
    setEdits((prev) => ({
      ...prev,
      [row.id]: {
        hours: patch.hours ?? prev[row.id]?.hours ?? row.hours.toFixed(2),
        paid: patch.paid ?? prev[row.id]?.paid ?? row.amount.toFixed(2),
      },
    }));

  return (
    <Modal title="Raport dla księgowej" onClose={onClose}>
      <div className="no-print space-y-4">
        <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
          Sprawdź liczby przed wygenerowaniem. Możesz je poprawić — <strong>zmiany dotyczą
          tylko tego dokumentu</strong> i nie zapisują się w aplikacji.
        </p>

        <Field label="Waluta raportu">
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
              Brak pracowników w firmie.
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
                    (konto usunięte)
                  </span>
                )}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="min-w-0 text-xs text-muted-foreground">
                  Godziny
                  <input
                    inputMode="decimal"
                    value={edits[row.id]?.hours ?? row.hours.toFixed(2)}
                    onChange={(e) => edit(row, { hours: e.target.value })}
                    className="input-field input-field-compact mt-1"
                  />
                </label>
                <label className="min-w-0 text-xs text-muted-foreground">
                  Wypłacono ({currency})
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
          <span className="font-semibold">Razem</span>
          <span className="text-right tabular-nums">
            {totalHours.toFixed(2)} h
            <span className="block text-xs text-muted-foreground">
              {money(totalAmount, currency)}
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
            <RotateCcw className="h-4 w-4 shrink-0" /> Przywróć
          </button>
          <button
            type="button"
            onClick={pobierzCsv}
            className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold"
          >
            <Download className="h-4 w-4 shrink-0" /> CSV
          </button>
          <button
            type="button"
            onClick={() => printDocument(`Raport_${companyName}_${period.from}`)}
            className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <FileDown className="h-4 w-4 shrink-0" /> Generuj PDF
          </button>
        </div>
      </div>

      {/* Dokument do druku — bez znaczników korekty, ma być czysty. */}
      <div className="print-only">
        <h1 className="text-xl font-bold">Zestawienie wynagrodzeń</h1>
        <p className="mt-1 text-sm">{companyName}</p>
        <p className="text-sm">Okres: {periodLabel(period)}</p>
        <p className="text-sm">Wygenerowano: {new Date().toLocaleDateString("pl-PL")}</p>
        <p className="text-sm">
          Waluta: {currency}
          {currency !== "PLN" && rates
            ? ` · kurs NBP ${targetRate.toFixed(4)} z dnia ${rates.effectiveDate}`
            : ""}
        </p>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">Pracownik</th>
              <th className="py-1 text-right">Godziny</th>
              <th className="py-1 text-right">Wypłacono</th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr key={row.id} className="border-b border-neutral-300">
                <td className="py-1">{row.name}</td>
                <td className="py-1 text-right tabular-nums">{row.hours.toFixed(2)}</td>
                <td className="py-1 text-right tabular-nums">{money(row.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="py-2">Razem</td>
              <td className="py-2 text-right tabular-nums">{totalHours.toFixed(2)}</td>
              <td className="py-2 text-right tabular-nums">{money(totalAmount, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}
