import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { notFound } from "next/navigation";

import { getEmployeePayouts, getTrips, getWorkEntries } from "@/lib/queries";
import { findMyEmployee, requireOwner } from "@/lib/session";

import { EmployeeDetailScreen } from "./employee-detail-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("title.employee", "meta.employee");
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await requireOwner();

  const employee = await findMyEmployee(id);
  if (!employee) notFound();

  // Te same zapytania co dla własnych danych — różni się tylko user_id.
  const [entries, trips, payouts] = await Promise.all([
    getWorkEntries(employee.id),
    getTrips(employee.id),
    // Wypłaty widzi właściciel, bo sam je wydał. Kosztów pracownika nie widzi.
    getEmployeePayouts(company.id, employee.id),
  ]);

  return (
    <EmployeeDetailScreen
      employee={employee}
      entries={entries}
      trips={trips}
      payouts={payouts}
    />
  );
}
