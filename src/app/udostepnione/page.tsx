import type { Metadata } from "next";

import { getCurrentRates } from "@/lib/nbp";
import { getSharedTrip } from "@/lib/queries";

import { SharedTripScreen, Unavailable } from "./shared-trip-screen";

const SHARED_TITLE = "Podsumowanie wyjazdu";
const SHARED_DESCRIPTION = "Przepracowane godziny i podsumowanie wyjazdu, udostępnione linkiem.";

export const metadata: Metadata = {
  title: SHARED_TITLE,
  description: SHARED_DESCRIPTION,
  // Udostępniony link nie powinien trafiać do wyszukiwarek, ale komunikatory
  // i tak pokazują podgląd — dlatego własny opis zamiast ogólnego z warstwy głównej.
  robots: { index: false, follow: false },
  // Własny blok openGraph zastępuje ten z warstwy głównej w całości, więc obrazek
  // trzeba wskazać ponownie — bez tego podgląd linku zostaje bez grafiki.
  openGraph: {
    title: SHARED_TITLE,
    description: SHARED_DESCRIPTION,
    type: "article",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARED_TITLE,
    description: SHARED_DESCRIPTION,
    images: ["/twitter-image.png"],
  },
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
