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
 * Adres, względem którego rozwijane są odnośniki w metadanych.
 *
 * Ma znaczenie większe, niż się wydaje. `og:image` i `og:url` muszą być pełnymi
 * adresami — robot Facebooka nie umie rozwinąć względnych. Gdy baza wskazuje na
 * inny adres niż ten, pod którym robot właśnie czyta stronę, idzie za tą bazą
 * jak za adresem kanonicznym. Jeśli tam nic nie ma, kończy z komunikatem, że
 * `og:image` jest „inferred" i że obrazka nie da się pobrać.
 *
 * Kolejność źródeł:
 *  1. `NEXT_PUBLIC_SITE_URL` — kiedy mamy jedną domenę, ona rozstrzyga wszystko.
 *  2. Host bieżącego żądania — pod adresem, którym ktoś się właśnie posłużył,
 *     na pewno odpowiadamy, więc obrazek na pewno da się pobrać. To ratunek na
 *     aliasy: `VERCEL_PROJECT_PRODUCTION_URL` zapieka się w czasie builda, więc
 *     po zmianie nazwy projektu wskazuje martwą domenę sprzed zmiany, a stary
 *     deployment nigdy się o tym nie dowie.
 *  3. Zmienne Vercela — na wypadek renderu bez żądania.
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

// Wymiary i typ podajemy obok adresu, bo Facebook pobiera obrazek asynchronicznie:
// bez nich pierwszy podgląd linku wychodzi bez grafiki, a debugger prosi o
// `og:image:width` i `og:image:height`. Z nimi kartę da się złożyć od razu.
const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Godzio",
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await siteUrl();

  if (!site && process.env.NODE_ENV === "production") {
    // Głośno, bo cicha porażka oznacza podgląd linku bez obrazka i bez sposobu,
    // żeby to zauważyć inaczej niż wysyłając link do siebie.
    console.warn(
      "[metadata] Nie znam adresu strony — podgląd linku w komunikatorach nie będzie " +
        "działał. Ustaw NEXT_PUBLIC_SITE_URL na adres produkcyjny.",
    );
  }

  // Nazwa aplikacji w karcie przeglądarki i w podglądzie linku idzie za
  // językiem konta. Zaszyty polski był ostatnim miejscem, w którym Niemiec
  // albo Ukrainiec widział polski napis mimo przełączonego interfejsu.
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
      // Obrazek deklarujemy wprost, choć konwencja `opengraph-image.png` sama
      // dorzuciłaby znacznik. Facebook potrafi odpowiedzieć, że og:image „powinno
      // być podane jawnie", więc nie zostawiamy tego domyślaniu się.
      images: [OG_IMAGE],
      // `og:url` tylko wtedy, gdy naprawdę znamy adres. Kanoniczny adres
      // wskazujący w próżnię jest gorszy niż jego brak: robot idzie za nim
      // zamiast czytać stronę, którą właśnie dostał.
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
