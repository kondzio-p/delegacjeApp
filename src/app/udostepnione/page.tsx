import type { Metadata } from "next";

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

  const payload = await getSharedTrip(token);
  if (!payload) {
    return (
      <Unavailable message="Ten link jest nieaktywny. Właściciel wyłączył udostępnianie albo adres jest nieprawidłowy." />
    );
  }

  return <SharedTripScreen payload={payload} />;
}
