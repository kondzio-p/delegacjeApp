import type { Metadata } from "next";

import { pageMetadata } from "@/lib/i18n/metadata";
import { requireUser } from "@/lib/session";

import { RatesScreen } from "./rates-screen";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("nav.rates", "meta.rates");
}

export default async function RatesPage() {
  // Kursy przychodzą z layoutu przez RatesProvider — tutaj wystarczy bramka.
  await requireUser();
  return <RatesScreen />;
}
