import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { LocaleProvider } from "@/components/locale-provider";
import { getLocale } from "@/lib/i18n/locale.server";

import "./globals.css";

const inter = Inter({
  // Cyrylica dochodzi dla ukraińskiej wersji interfejsu.
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Adres, względem którego rozwijane są odnośniki w metadanych.
 *
 * Ma znaczenie większe, niż się wydaje. `og:image` i `og:url` muszą być pełnymi
 * adresami — robot Facebooka nie umie rozwinąć względnych. Gdy baza jest zła,
 * `og:url` wskazuje na localhost, robot idzie za tym kanonicznym adresem
 * zamiast czytać stronę i kończy z komunikatem, że og:image w ogóle nie ma.
 *
 * Kolejność źródeł: własna domena, potem stała domena produkcyjna Vercela
 * (nie zmienia się po deployu), a na końcu adres pojedynczego wdrożenia —
 * gorszy, bo zmienny, ale wciąż działający i lepszy niż localhost.
 */
function siteUrl(): URL | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return new URL(`https://${production}`);

  const deployment = process.env.VERCEL_URL;
  if (deployment) return new URL(`https://${deployment}`);

  return null;
}

const SITE_URL = siteUrl();

if (!SITE_URL && process.env.NODE_ENV === "production") {
  // Głośno, bo cicha porażka oznacza podgląd linku bez obrazka i bez sposobu,
  // żeby to zauważyć inaczej niż wysyłając link do siebie.
  console.warn(
    "[metadata] Nie znam adresu strony — podgląd linku w komunikatorach nie będzie " +
      "działał. Ustaw NEXT_PUBLIC_SITE_URL na adres produkcyjny.",
  );
}
const TITLE = "Godzio — godziny pracy i wypłaty";
const DESCRIPTION =
  "Zapisuj godziny pracy i wypłaty, śledź koszty i realny zarobek. Prosta aplikacja dla pracujących za granicą.";

const OG_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Godzio" };

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: SITE_URL } : {}),
  // Podstrony podają samą nazwę ekranu — resztę dokleja szablon.
  title: { default: TITLE, template: "%s — Godzio" },
  description: DESCRIPTION,
  applicationName: "Godzio",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Godzio",
    locale: "pl_PL",
    title: TITLE,
    description: DESCRIPTION,
    // Obrazek deklarujemy wprost, choć konwencja `opengraph-image.png` sama
    // dorzuciłaby znacznik. Facebook potrafi odpowiedzieć, że og:image „powinno
    // być podane jawnie", więc nie zostawiamy tego domyślaniu się.
    images: [OG_IMAGE],
    // `og:url` tylko wtedy, gdy naprawdę znamy adres. Kanoniczny adres
    // wskazujący w próżnię jest gorszy niż jego brak: robot idzie za nim
    // zamiast czytać stronę, którą właśnie dostał.
    ...(SITE_URL ? { url: "/" } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

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
