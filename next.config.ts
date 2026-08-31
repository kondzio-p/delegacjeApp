import path from "node:path";

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Polityka bezpieczeństwa treści.
 *
 * Wszystko, co strona ładuje — skrypty, style, obrazki, czcionki — pochodzi
 * z tego samego adresu, więc `default-src 'self'` jest realną granicą, a nie
 * formalnością. `frame-ancestors 'none'` zamyka clickjacking na przyciskach
 * „usuń konto" i „udostępnij", a `form-action 'self'` nie pozwala przekierować
 * wysyłki formularza na cudzy serwer.
 *
 * `script-src` zostaje przy `unsafe-inline`, bo Next wstrzykuje własne skrypty
 * inline z ładunkiem RSC. Wariant z nonce wymaga pliku `proxy.ts` i osobnej
 * decyzji. W trybie deweloperskim dochodzi `unsafe-eval` — React używa `eval`
 * do odtwarzania stosów błędów.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Adres udostępnionej podróży niesie token w parametrze, więc nie ma prawa
  // wyjechać w nagłówku Referer na cudzy serwer.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  // Katalog projektu jest jednocześnie repozytorium — bez tego Turbopack szuka
  // package-lock.json wyżej w drzewie katalogów i ostrzega o cudzym lockfile.
  turbopack: { root: path.resolve(".") },

  experimental: {
    // Wszystkie ekrany są dynamiczne, więc bez tego powrót na poprzedni widok
    // znów czeka na bazę; każdy zapis i tak unieważnia cache.
    staleTimes: { dynamic: 30, static: 300 },
  },

  headers() {
    return Promise.resolve([
      { source: "/:path*", headers: securityHeaders },
      {
        // Link do podróży ma trafiać do odbiorcy, a nie do wyszukiwarki.
        source: "/udostepnione",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]);
  },
};

export default nextConfig;
