import type { Metadata } from "next";

import { getCurrentRates } from "@/lib/nbp";
import { getSharedTrip } from "@/lib/queries";

import { SharedTripScreen, Unavailable } from "./shared-trip-screen";

export const metadata: Metadata = {
  title: "Podsumowanie delegacji",
  description: "Udostępnione podsumowanie delegacji zagranicznej.",
  // Udostępniony link nie powinien trafiać do wyszukiwarek.
  robots: { index: false, follow: false },
};

export default async function SharedTripPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token } = await searchParams;

  if (!token) return <Unavailable message="Brak tokenu w adresie linku." />;

  const [payload, rates] = await Promise.all([getSharedTrip(token), getCurrentRates()]);
  if (!payload) {
    return (
      <Unavailable message="Ten link jest nieaktywny. Właściciel wyłączył udostępnianie albo adres jest nieprawidłowy." />
    );
  }

  // Ta strona jest poza powłoką aplikacji, więc kursy podajemy propsem,
  // a nie przez RatesProvider.
  return <SharedTripScreen payload={payload} rates={rates} />;
}
