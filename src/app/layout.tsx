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

export const metadata: Metadata = {
  title: "Delegacje — rozliczenie czasu pracy i zysków",
  description:
    "Licz godziny pracy, koszty i realny zysk z delegacji zagranicznych na telefonie.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/app-icon-512.png",
  },
  openGraph: {
    title: "Delegacje — rozliczenie czasu pracy i zysków",
    description:
      "Licz godziny pracy, koszty i realny zysk z delegacji zagranicznych na telefonie.",
    type: "website",
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
