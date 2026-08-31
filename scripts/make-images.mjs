// Generator ikon i obrazka Open Graph z jednego pliku źródłowego.
//
// PNG dekodujemy samym zlib-em zamiast dokładać zależność: pliki są 8-bitowe
// i bez przeplotu, a `next/og` i tak nie przyjmie logo przez limit pakietu.
//
// Uruchamianie: node scripts/make-images.mjs
import { deflateSync, inflateSync } from "node:zlib";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SVG_SOURCE = "assets/logo.svg";
const PNG_SOURCE = "assets/logo-source.png";
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ------------------------------------------------------------- dekodowanie */

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIG)) throw new Error("to nie jest PNG");

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const depth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];
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

/**
 * SVG, w którym siedzi raster.
 *
 * Eksporty z narzędzi graficznych bywają nie wektorem, tylko PNG-iem opakowanym
 * w SVG: jeden obrazek niesie kolory, drugi — w skali szarości — służy za maskę
 * przezroczystości (`feColorMatrix` liczy z niego luminancję). Składamy oba
 * z powrotem w jeden obrazek z kanałem alfa.
 *
 * Prawdziwego wektora tu nie narysujemy — brak rasteryzatora. Dlatego przy
 * SVG bez osadzonych rastrów mówimy wprost, co zrobić.
 */
function decodeSvgWrapper(text) {
  const embedded = [...text.matchAll(/<image[^>]*?xlink:href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)]
    .map((match) => decodePng(Buffer.from(match[1], "base64")));

  if (embedded.length === 0) {
    throw new Error(
      `${SVG_SOURCE} to prawdziwy wektor, którego nie potrafimy zrasteryzować. ` +
      `Wyeksportuj logo do PNG z przezroczystością i zapisz jako ${PNG_SOURCE}.`,
    );
  }
  if (embedded.length === 1) return embedded[0];

  // Kolejność w pliku: najpierw maska (wewnątrz <mask>), potem warstwa kolorów.
  const [mask, color] = embedded;
  if (mask.width !== color.width || mask.height !== color.height) {
    throw new Error("maska i warstwa kolorów mają różne wymiary");
  }

  const data = Buffer.alloc(color.data.length);
  color.data.copy(data);
  for (let i = 0; i < color.width * color.height; i++) {
    const m = i * 4;
    // Luminancja maski. Dla obrazka w skali szarości to po prostu jego jasność,
    // ale liczymy pełnym wzorem, żeby zadziałało też dla maski kolorowej.
    const luma = 0.2126 * mask.data[m] + 0.7152 * mask.data[m + 1] + 0.0722 * mask.data[m + 2];
    data[m + 3] = Math.round((luma * mask.data[m + 3]) / 255);
  }

  return { width: color.width, height: color.height, data };
}

/**
 * PNG ma pierwszeństwo przed SVG.
 *
 * Nie dlatego, że raster bije wektor — tutaj żaden z plików nie jest wektorem.
 * PNG niesie kanał alfa wprost, a w SVG trzeba go odtwarzać z maski luminancji,
 * czyli z zaokrągleń. Skoro oba pochodzą z tego samego rysunku, bierzemy ten,
 * który mówi o przezroczystości wprost.
 */
function loadSource() {
  if (existsSync(PNG_SOURCE)) {
    console.log(`źródło: ${PNG_SOURCE}`);
    return decodePng(readFileSync(PNG_SOURCE));
  }
  if (existsSync(SVG_SOURCE)) {
    console.log(`źródło: ${SVG_SOURCE} (alfa odtwarzana z maski)`);
    return decodeSvgWrapper(readFileSync(SVG_SOURCE, "utf8"));
  }
  throw new Error(`brak źródła logo — oczekiwano ${PNG_SOURCE} albo ${SVG_SOURCE}`);
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

/** Czy obrazek w ogóle korzysta z przezroczystości. */
function hasAlpha({ width, height, data }) {
  for (let i = 0; i < width * height; i++) if (data[i * 4 + 3] !== 255) return true;
  return false;
}

/**
 * Zapis PNG-a. RGBA tylko wtedy, gdy obrazek naprawdę ma przezroczystość —
 * na nieprzezroczystym czwarty kanał byłby czystym marnotrawstwem miejsca.
 */
function encodePng(image, forceAlpha = false) {
  const { width, height, data } = image;
  const withAlpha = forceAlpha || hasAlpha(image);
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
  ihdr[8] = 8;
  ihdr[9] = withAlpha ? 6 : 2;
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
 * przeglądarka — dzięki temu nie trzeba kodować mapy bitowej DIB. Next wymaga
 * przy tym, żeby osadzony PNG był RGBA, stąd wymuszony kanał alfa.
 */
function encodeIco(image, size) {
  const png = encodePng(image, true);

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

const WHITE = 246;      // dawne logo miało tło lekko odbiegające od czystej bieli
const VISIBLE = 8;      // niżej piksel jest praktycznie niewidoczny

/**
 * Czy piksel należy do treści.
 *
 * Przy źródle z przezroczystością decyduje kanał alfa; przy nieprzezroczystym
 * (starszy plik PNG) — odróżnienie od białego tła.
 */
function inkTest(image) {
  const przezroczyste = hasAlpha(image);
  return przezroczyste
    ? (data, i) => data[i + 3] > VISIBLE
    : (data, i) => data[i] < WHITE || data[i + 1] < WHITE || data[i + 2] < WHITE;
}

/** Prostokąt zajęty przez treść, z pominięciem tła. */
function contentBox(img, isInk, top = 0, bottom = img.height) {
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
function bands(img, isInk, minGap = 20) {
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

/**
 * Zmniejszanie uśrednianiem obszaru — bez tego drobne linie zegara znikają.
 *
 * Kolor uśredniamy z wagą kanału alfa, inaczej piksele w pełni przezroczyste
 * (często białe albo czarne) rozjaśniałyby lub brudziły krawędzie znaku.
 */
function resample(img, box, w, h) {
  const out = Buffer.alloc(w * h * 4);
  const sx = box.w / w, sy = box.h / h;

  for (let y = 0; y < h; y++) {
    const fy0 = box.y + y * sy;
    const y0 = Math.floor(fy0), y1 = Math.min(img.height, Math.ceil(fy0 + sy));
    for (let x = 0; x < w; x++) {
      const fx0 = box.x + x * sx;
      const x0 = Math.floor(fx0), x1 = Math.min(img.width, Math.ceil(fx0 + sx));

      let r = 0, g = 0, b = 0, alpha = 0, waga = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          const a = img.data[i + 3];
          r += img.data[i] * a;
          g += img.data[i + 1] * a;
          b += img.data[i + 2] * a;
          waga += a;
          alpha += a;
          n++;
        }
      }

      const d = (y * w + x) * 4;
      if (waga === 0) {
        out[d] = out[d + 1] = out[d + 2] = 255;
        out[d + 3] = 0;
      } else {
        out[d] = Math.round(r / waga);
        out[d + 1] = Math.round(g / waga);
        out[d + 2] = Math.round(b / waga);
        out[d + 3] = Math.round(alpha / n);
      }
    }
  }
  return { width: w, height: h, data: out };
}

/**
 * Wkleja obrazek na płótno, wyśrodkowany.
 *
 * `background` null zostawia przezroczystość; kolor podkłada tło i spłaszcza
 * do niego kanał alfa — tego wymagają miejsca, które przezroczystości nie
 * obsługują sensownie (iOS podkłada czerń, karty w komunikatorach też).
 */
function onCanvas(src, width, height, background) {
  const data = Buffer.alloc(width * height * 4);
  if (background) {
    for (let i = 0; i < width * height; i++) {
      const d = i * 4;
      data[d] = background[0]; data[d + 1] = background[1]; data[d + 2] = background[2];
      data[d + 3] = 255;
    }
  }

  const ox = Math.round((width - src.width) / 2);
  const oy = Math.round((height - src.height) / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + x) * 4;
      const d = ((y + oy) * width + (x + ox)) * 4;
      const a = src.data[s + 3] / 255;
      if (!background) {
        src.data.copy(data, d, s, s + 4);
        continue;
      }
      for (let k = 0; k < 3; k++) {
        data[d + k] = Math.round(src.data[s + k] * a + data[d + k] * (1 - a));
      }
      data[d + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Dopasowuje treść do ramki, zostawiając margines w procentach krótszego boku. */
function fit(img, box, width, height, marginPct, background = null) {
  const m = Math.round(Math.min(width, height) * marginPct);
  const scale = Math.min((width - 2 * m) / box.w, (height - 2 * m) / box.h);
  const w = Math.max(1, Math.round(box.w * scale));
  const h = Math.max(1, Math.round(box.h * scale));
  return onCanvas(resample(img, box, w, h), width, height, background);
}

/* ------------------------------------------------------------------ wyjście */

const BIEL = [255, 255, 255];

const logo = loadSource();
const isInk = inkTest(logo);
const full = contentBox(logo, isInk);
const [markBand] = bands(logo, isInk);
const mark = contentBox(logo, isInk, markBand.top, markBand.bottom);

console.log(`  ${logo.width}x${logo.height}, przezroczystość: ${hasAlpha(logo) ? "tak" : "nie"}`);
console.log(`  całe logo: ${full.w}x${full.h} @ ${full.x},${full.y}`);
console.log(`  sam znak:  ${mark.w}x${mark.h} @ ${mark.x},${mark.y}`);

// Przezroczystość zostaje tylko tam, gdzie znak leży na jasnym tle aplikacji;
// wszędzie indziej podkładamy biel, bo na ciemnym tle tarcza byłaby dziurą.
const targets = [
  ["src/app/opengraph-image.png", () => fit(logo, full, 1200, 630, 0.1, BIEL)],
  ["src/app/twitter-image.png", () => fit(logo, full, 1200, 630, 0.1, BIEL)],
  ["src/app/icon.png", () => fit(logo, mark, 96, 96, 0.06, BIEL)],
  ["src/app/apple-icon.png", () => fit(logo, mark, 180, 180, 0.12, BIEL)],
  ["public/icon-512.png", () => fit(logo, mark, 512, 512, 0.12, BIEL)],
  ["public/icon-192.png", () => fit(logo, mark, 192, 192, 0.12, BIEL)],
  ["public/logo-mark.png", () => fit(logo, mark, 256, 256, 0.02)],
];

for (const [path, build] of targets) {
  const png = encodePng(build());
  writeFileSync(path, png);
  console.log(`  ${path.padEnd(32)} ${(png.length / 1024).toFixed(1)} KB`);
}

// favicon.ico ma pierwszeństwo przed icon.png w karcie przeglądarki,
// więc musi nieść ten sam znak — inaczej zostaje po starym logo.
const ico = encodeIco(fit(logo, mark, 64, 64, 0.06, BIEL), 64);
writeFileSync("src/app/favicon.ico", ico);
console.log(`  ${"src/app/favicon.ico".padEnd(32)} ${(ico.length / 1024).toFixed(1)} KB`);
