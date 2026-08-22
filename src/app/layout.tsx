import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
