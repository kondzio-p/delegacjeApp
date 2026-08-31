import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";

import { LocaleProvider } from "@/components/locale-provider";
import { translate } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale.server";

import "./globals.css";

const inter = Inter({
  // Cyrylica dochodzi dla ukraińskiej wersji interfejsu.
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Ustala adres, względem którego rozwijane są odnośniki w metadanych.
 *
 * `og:image` i `og:url` muszą być pełnymi adresami, bo robot Facebooka nie umie
 * rozwinąć względnych i idzie za bazą jak za adresem kanonicznym. Pierwszeństwo
 * ma własna domena z konfiguracji, potem host bieżącego żądania — pod nim na
 * pewno odpowiadamy — a na końcu zmienne Vercela.
 *
 * Returns:
 *     Promise<URL | null>: Adres bazowy albo null, gdy nie da się go ustalić.
 */
async function siteUrl(): Promise<URL | null> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  // `x-forwarded-*` dokłada proxy Vercela; lokalnie zostaje samo `host`.
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  if (host) return new URL(`${incoming.get("x-forwarded-proto") ?? "http"}://${host}`);

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return new URL(`https://${production}`);

  const deployment = process.env.VERCEL_URL;
  if (deployment) return new URL(`https://${deployment}`);

  return null;
}

// Wymiary i typ obok adresu — bez nich pierwszy podgląd linku wychodzi
// bez grafiki, bo Facebook pobiera obrazek asynchronicznie.
const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Godzio",
};

/**
 * Składa metadane warstwy głównej w języku użytkownika.
 *
 * Nazwa aplikacji w karcie przeglądarki i w podglądzie linku idzie za językiem
 * konta — zaszyty polski był ostatnim miejscem, w którym Niemiec widział polski
 * napis mimo przełączonego interfejsu.
 *
 * Returns:
 *     Promise<Metadata>: Tytuł, opis i komplet znaczników Open Graph.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await siteUrl();

  if (!site && process.env.NODE_ENV === "production") {
    // Głośno, bo cicha porażka to podgląd linku bez obrazka i bez sposobu,
    // żeby to zauważyć inaczej niż wysyłając link do siebie.
    console.warn(
      "[metadata] Nie znam adresu strony — podgląd linku w komunikatorach nie będzie " +
        "działał. Ustaw NEXT_PUBLIC_SITE_URL na adres produkcyjny.",
    );
  }

  const locale = await getLocale();
  const title = translate(locale, "meta.appTitle");
  const description = translate(locale, "meta.appDescription");

  return {
    ...(site ? { metadataBase: site } : {}),
    // Podstrony podają samą nazwę ekranu — resztę dokleja szablon.
    title: { default: title, template: "%s — Godzio" },
    description,
    applicationName: "Godzio",
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      siteName: "Godzio",
      locale: "pl_PL",
      title,
      description,
      // Obrazek deklarujemy wprost, bo Facebook potrafi poprosić o jawny wpis.
      images: [OG_IMAGE],
      // Adres kanoniczny tylko wtedy, gdy naprawdę go znamy — wskazujący
      // w próżnię jest gorszy niż jego brak.
      ...(site ? { url: "/" } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/**
 * Warstwa główna aplikacji.
 *
 * Args:
 *     children (React.ReactNode): Zawartość bieżącej strony.
 *
 * Returns:
 *     ReactNode: Dokument z ustawionym językiem i providerem tłumaczeń.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
