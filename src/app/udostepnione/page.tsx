import type { Metadata } from "next";

import { translate } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale.server";
import { getCurrentRates } from "@/lib/nbp";
import { getSharedTrip } from "@/lib/queries";

import { SharedTripScreen, Unavailable } from "./shared-trip-screen";

export async function generateMetadata(): Promise<Metadata> {
  // Podgląd linku ogląda ktoś z zewnątrz, ale język bierzemy z ciasteczka
  // udostępniającego — to on wysyła link i to on widzi, co się w nim pokaże.
  const locale = await getLocale();
  const title = translate(locale, "shared.title");
  const description = translate(locale, "meta.shared");

  return {
    title,
    description,
    // Udostępniony link nie powinien trafiać do wyszukiwarek, ale komunikatory
    // i tak pokazują podgląd — dlatego własny opis zamiast ogólnego z warstwy głównej.
    robots: { index: false, follow: false },
    // Własny blok openGraph zastępuje ten z warstwy głównej w całości, więc obrazek
    // trzeba wskazać ponownie — bez tego podgląd linku zostaje bez grafiki.
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image.png"],
    },
  };
}

/**
 * Publiczna strona udostępnionej podróży.
 *
 * Args:
 *     searchParams (Promise<{ t?: string }>): Token udostępnienia z adresu.
 *
 * Returns:
 *     Promise<ReactNode>: Podgląd podróży albo komunikat o nieaktywnym linku.
 */
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
