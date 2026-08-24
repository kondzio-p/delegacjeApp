import type { Metadata } from "next";

import { getCurrentRates } from "@/lib/nbp";
import { periodFromParams } from "@/lib/period";
import { getCompanyEmployees, getCompanyPayrollReport } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

import { CompanyScreen } from "./company-screen";

export const metadata: Metadata = {
  title: "Moja firma — Delegacje",
  description: "Wypłaty i godziny zespołu w wybranym okresie oraz raport dla księgowej.",
};

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string; do?: string }>;
}) {
  const { od, do: to } = await searchParams;
  const { company, role } = await requireOwner();
  const period = periodFromParams(od, to);

  // Kursy najpierw: raport używa ich jako awaryjnych dla wypłat bez własnego
  // kursu, więc musi je dostać od razu.
  const rates = await getCurrentRates();
  const [rows, employees] = await Promise.all([
    getCompanyPayrollReport(company.id, period.from, period.to, rates),
    getCompanyEmployees(company.id),
  ]);

  return (
    <CompanyScreen
      companyName={company.name}
      role={role}
      period={period}
      rows={rows}
      rates={rates}
      onTripCount={employees.filter((e) => e.onTrip).length}
    />
  );
}
