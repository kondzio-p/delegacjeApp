// Generator ikon i obrazka Open Graph z jednego pliku źródłowego.
//
// Po co własny kod zamiast biblioteki: `next/og` ma limit 500 KB na pakiet,
// a źródłowe logo waży więcej, więc nie da się go wstrzyknąć do ImageResponse.
// Zamiast dokładać zależność do obróbki obrazów, dekodujemy PNG samym zlib-em —
// plik jest 8-bitowym RGB bez przeplotu, czyli najprostszym wariantem formatu.
//
// Uruchamianie: node scripts/make-images.mjs
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "assets/logo-source.png";
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ------------------------------------------------------------- dekodowanie */

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIG)) throw new Error("to nie jest PNG");

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const [depth, colorType, , , interlace] = [buffer[24], buffer[25], buffer[26], buffer[27], buffer[28]];
  if (depth !== 8) throw new Error(`obsługujemy tylko 8 bitów na kanał, jest ${depth}`);
  if (interlace !== 0) throw new Error("przeplot (Adam7) nieobsługiwany");
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`typ koloru ${colorType} nieobsługiwany`);

  const parts = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    if (type === "IDAT") parts.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  // Odwracanie filtrów PNG — każdy wiersz niesie w pierwszym bajcie swój typ.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value & 0xff;
    }
  }

  // Wszystko dalej pracuje na RGBA, żeby nie mnożyć przypadków.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, d = i * 4;
    if (channels === 1) { rgba[d] = rgba[d + 1] = rgba[d + 2] = pixels[s]; rgba[d + 3] = 255; }
    else if (channels === 2) { rgba[d] = rgba[d + 1] = rgba[d + 2] = pixels[s]; rgba[d + 3] = pixels[s + 1]; }
    else if (channels === 3) { rgba[d] = pixels[s]; rgba[d + 1] = pixels[s + 1]; rgba[d + 2] = pixels[s + 2]; rgba[d + 3] = 255; }
    else { pixels.copy(rgba, d, s, s + 4); }
  }

  return { width, height, data: rgba };
}

/* --------------------------------------------------------------- kodowanie */

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/**
 * Zapis PNG-a. Domyślnie 8-bitowe RGB — tło jest zawsze wypełnione, więc kanał
 * alfa byłby czystym marnotrawstwem. `withAlpha` włącza RGBA, bo tego formatu
 * wymaga dekoder ikon w Next przy PNG-u osadzonym w kontenerze ICO.
 */
function encodePng({ width, height, data }, withAlpha = false) {
  const channels = withAlpha ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtr „none": obrazek jest gładki, kompresuje się dobrze
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4, d = y * (stride + 1) + 1 + x * channels;
      raw[d] = data[s]; raw[d + 1] = data[s + 1]; raw[d + 2] = data[s + 2];
      if (withAlpha) raw[d + 3] = data[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = withAlpha ? 6 : 2;
  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Kontener ICO z osadzonym PNG-iem.
 *
 * Format dopuszcza PNG w środku od czasów Visty i tak robi dziś każda
 * przeglądarka — dzięki temu nie trzeba kodować mapy bitowej DIB.
 */
function encodeIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // zarezerwowane
  header.writeUInt16LE(1, 2);   // typ: ikona
  header.writeUInt16LE(1, 4);   // liczba obrazków

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;   // 0 oznacza 256
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0;                        // paleta
  entry[3] = 0;                        // zarezerwowane
  entry.writeUInt16LE(1, 4);           // płaszczyzny
  entry.writeUInt16LE(32, 6);          // bity na piksel
  entry.writeUInt32LE(png.length, 8);  // rozmiar danych
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

/* ------------------------------------------------ przycinanie i skalowanie */

const WHITE = 246; // logo ma tło lekko odbiegające od czystej bieli

function isInk(data, i) {
  return data[i] < WHITE || data[i + 1] < WHITE || data[i + 2] < WHITE;
}

/** Prostokąt zajęty przez treść, z pominięciem tła. */
function contentBox(img, top = 0, bottom = img.height) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!isInk(img.data, (y * img.width + x) * 4)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error("nie znaleziono treści — czy plik nie jest pusty?");
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Poziome pasy treści rozdzielone pustymi wierszami. Logo składa się ze znaku
 * i napisu pod nim, więc pierwszy pas to sam znak — a tego chcemy na ikonę.
 */
function bands(img, minGap = 20) {
  const filled = [];
  for (let y = 0; y < img.height; y++) {
    let any = false;
    for (let x = 0; x < img.width && !any; x++) any = isInk(img.data, (y * img.width + x) * 4);
    filled.push(any);
  }
  const out = [];
  let start = -1, gap = 0;
  for (let y = 0; y <= img.height; y++) {
    if (y < img.height && filled[y]) {
      if (start < 0) start = y;
      gap = 0;
    } else if (start >= 0 && ++gap >= minGap) {
      out.push({ top: start, bottom: y - gap + 1 });
      start = -1;
    }
  }
  if (start >= 0) out.push({ top: start, bottom: img.height });
  return out;
}

/** Zmniejszanie uśrednianiem obszaru — bez tego drobne linie zegara znikają. */
function resample(img, box, w, h) {
  const out = Buffer.alloc(w * h * 4, 255);
  const sx = box.w / w, sy = box.h / h;
  for (let y = 0; y < h; y++) {
    const fy0 = box.y + y * sy, fy1 = fy0 + sy;
    const y0 = Math.floor(fy0), y1 = Math.min(img.height, Math.ceil(fy1));
    for (let x = 0; x < w; x++) {
      const fx0 = box.x + x * sx, fx1 = fx0 + sx;
      const x0 = Math.floor(fx0), x1 = Math.min(img.width, Math.ceil(fx1));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          const a = img.data[i + 3] / 255;
          // Kanał alfa składamy na biel, bo taki jest docelowy podkład.
          r += img.data[i] * a + 255 * (1 - a);
          g += img.data[i + 1] * a + 255 * (1 - a);
          b += img.data[i + 2] * a + 255 * (1 - a);
          n++;
        }
      }
      const d = (y * w + x) * 4;
      out[d] = Math.round(r / n); out[d + 1] = Math.round(g / n); out[d + 2] = Math.round(b / n); out[d + 3] = 255;
    }
  }
  return { width: w, height: h, data: out };
}

/** Wkleja obrazek na biały prostokąt o zadanych wymiarach, wyśrodkowany. */
function onCanvas(src, width, height) {
  const data = Buffer.alloc(width * height * 4, 255);
  const ox = Math.round((width - src.width) / 2);
  const oy = Math.round((height - src.height) / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + x) * 4;
      const d = ((y + oy) * width + (x + ox)) * 4;
      src.data.copy(data, d, s, s + 4);
    }
  }
  return { width, height, data };
}

/** Dopasowuje treść do ramki, zostawiając margines w procentach krótszego boku. */
function fit(img, box, width, height, marginPct) {
  const m = Math.round(Math.min(width, height) * marginPct);
  const maxW = width - 2 * m, maxH = height - 2 * m;
  const scale = Math.min(maxW / box.w, maxH / box.h);
  const w = Math.max(1, Math.round(box.w * scale));
  const h = Math.max(1, Math.round(box.h * scale));
  return onCanvas(resample(img, box, w, h), width, height);
}

/* ------------------------------------------------------------------ wyjście */

const logo = decodePng(readFileSync(SOURCE));
const full = contentBox(logo);
const [markBand] = bands(logo);
const mark = contentBox(logo, markBand.top, markBand.bottom);

console.log(`źródło ${logo.width}x${logo.height}`);
console.log(`  całe logo: ${full.w}x${full.h} @ ${full.x},${full.y}`);
console.log(`  sam znak:  ${mark.w}x${mark.h} @ ${mark.x},${mark.y}`);

const targets = [
  // Karta Open Graph: 1200x630 to proporcja, ktorej oczekuja Messenger i Facebook.
  ["src/app/opengraph-image.png", () => fit(logo, full, 1200, 630, 0.1)],
  ["src/app/twitter-image.png", () => fit(logo, full, 1200, 630, 0.1)],
  // Favicon i ikona Apple ida przez konwencje katalogu app/ — Next sam wstawia znaczniki.
  // Favicon celowo maly: laduje sie przy kazdym wejsciu na strone.
  ["src/app/icon.png", () => fit(logo, mark, 96, 96, 0.04)],
  ["src/app/apple-icon.png", () => fit(logo, mark, 180, 180, 0.08)],
  // Ikony do manifestu potrzebuja stalych adresow, wiec zostaja w public/.
  ["public/icon-512.png", () => fit(logo, mark, 512, 512, 0.08)],
  ["public/icon-192.png", () => fit(logo, mark, 192, 192, 0.08)],
  // Znak do interfejsu (ekran logowania).
  ["public/logo-mark.png", () => fit(logo, mark, 256, 256, 0.02)],
];

for (const [path, build] of targets) {
  const png = encodePng(build());
  writeFileSync(path, png);
  console.log(`  ${path.padEnd(32)} ${(png.length / 1024).toFixed(1)} KB`);
}

// favicon.ico ma pierwszeństwo przed icon.png w karcie przeglądarki,
// więc musi nieść ten sam znak — inaczej zostaje po starym logo.
const icoPng = encodePng(fit(logo, mark, 64, 64, 0.04), true);
const ico = encodeIco(icoPng, 64);
writeFileSync("src/app/favicon.ico", ico);
console.log(`  ${"src/app/favicon.ico".padEnd(32)} ${(ico.length / 1024).toFixed(1)} KB`);
