import type { Metadata } from "next";

import { getCompanyEmployees, getJoinRequests, monthKeyOf, monthLabel } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

import { EmployeesScreen } from "./employees-screen";

export const metadata: Metadata = {
  title: "Pracownicy — Delegacje",
  description: "Godziny pracy zespołu i prośby o dołączenie do firmy.",
};

export default async function EmployeesPage() {
  const { company } = await requireOwner();
  const [employees, requests] = await Promise.all([
    getCompanyEmployees(company.id),
    getJoinRequests(company.id),
  ]);

  return (
    <EmployeesScreen
      companyName={company.name}
      employees={employees}
      requests={requests}
      monthName={monthLabel(monthKeyOf())}
    />
  );
}
