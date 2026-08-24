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
 * Bez tego `og:image` zostaje adresem względnym, którego roboty Facebooka
 * i Messengera nie potrafią pobrać — i podstawiają cokolwiek znajdą same.
 * Na Vercelu `VERCEL_PROJECT_PRODUCTION_URL` wskazuje stałą domenę produkcyjną
 * (nie adres pojedynczego wdrożenia), więc podgląd nie psuje się po każdym
 * deployu. Własną domenę wpisuje się w NEXT_PUBLIC_SITE_URL.
 */
function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

const TITLE = "Godzio — godziny pracy i wypłaty";
const DESCRIPTION =
  "Zapisuj godziny pracy i wypłaty, śledź koszty i realny zarobek. Prosta aplikacja dla pracujących za granicą.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
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
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
