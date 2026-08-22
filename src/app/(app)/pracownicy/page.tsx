import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getCompanyEmployees, getJoinRequests, monthKeyOf, monthLabel } from "@/lib/queries";
import { requireOwner } from "@/lib/session";

import { EmployeesScreen } from "./employees-screen";

export const metadata: Metadata = {
  title: "Pracownicy — Delegacje",
  description: "Godziny pracy zespołu i prośby o dołączenie do firmy.",
};

export default async function EmployeesPage() {
  const { user, company } = await requireOwner();
  const [employees, requests] = await Promise.all([
    getCompanyEmployees(company.id),
    getJoinRequests(company.id),
  ]);

  return (
    <AppShell title="Pracownicy" isOwner={user.is_owner}>
      <EmployeesScreen
        companyName={company.name}
        employees={employees}
        requests={requests}
        monthName={monthLabel(monthKeyOf())}
      />
    </AppShell>
  );
}
