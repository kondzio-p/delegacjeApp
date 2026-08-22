import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTrips, getWorkEntries } from "@/lib/queries";
import { findMyEmployee, requireOwner } from "@/lib/session";

import { EmployeeDetailScreen } from "./employee-detail-screen";

export const metadata: Metadata = {
  title: "Pracownik — Delegacje",
  description: "Godziny pracy pracownika w podziale na miesiące i delegacje.",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();

  const employee = await findMyEmployee(id);
  if (!employee) notFound();

  // Te same zapytania co dla własnych danych — różni się tylko user_id.
  const [entries, trips] = await Promise.all([getWorkEntries(employee.id), getTrips(employee.id)]);

  return <EmployeeDetailScreen employee={employee} entries={entries} trips={trips} />;
}
