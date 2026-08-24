import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { RatesScreen } from "./rates-screen";

export const metadata: Metadata = {
  title: "Kursy i przeliczarka — Delegacje",
  description: "Aktualne kursy NBP dla euro i dolara oraz przeliczarka walut.",
};

export default async function RatesPage() {
  // Kursy przychodzą z layoutu przez RatesProvider — tutaj wystarczy bramka.
  await requireUser();
  return <RatesScreen />;
}
