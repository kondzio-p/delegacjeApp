import { describe, expect, it } from "vitest";

import { csvAmount, toCsv } from "./csv";

type Wiersz = { imie: string; godziny: number; kwota: number | null };

const KOLUMNY = [
  { header: "Imię", value: (r: Wiersz) => r.imie },
  { header: "Godziny", value: (r: Wiersz) => r.godziny },
  { header: "Kwota", value: (r: Wiersz) => r.kwota },
];

/** Bez BOM-u i bez końcowego przełamania — wygodniej porównywać wiersze. */
function wiersze(csv: string): string[] {
  return csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
}

describe("toCsv", () => {
  it("zaczyna plik BOM-em, żeby Excel nie zjadł ogonków", () => {
    expect(toCsv([], KOLUMNY).startsWith("\uFEFF")).toBe(true);
  });

  it("rozdziela pola średnikiem, nie przecinkiem", () => {
    const csv = toCsv([{ imie: "Jan", godziny: 8, kwota: 100 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe("Jan;8;100");
  });

  it("kończy wiersze CRLF-em", () => {
    expect(toCsv([{ imie: "Jan", godziny: 8, kwota: 1 }], KOLUMNY)).toContain("\r\n");
  });

  it("pisze sam nagłówek, gdy nie ma wierszy", () => {
    expect(wiersze(toCsv([], KOLUMNY))).toEqual(["Imię;Godziny;Kwota"]);
  });

  it("zapisuje liczby z przecinkiem dziesiętnym", () => {
    const csv = toCsv([{ imie: "Jan", godziny: 7.5, kwota: 12.25 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe("Jan;7,5;12,25");
  });

  it("puste pole zamiast null i undefined", () => {
    const csv = toCsv([{ imie: "Jan", godziny: 0, kwota: null }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe("Jan;0;");
  });

  it("cudzysłowi pole ze średnikiem", () => {
    const csv = toCsv([{ imie: "Kowalski; Jan", godziny: 1, kwota: 1 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe('"Kowalski; Jan";1;1');
  });

  it("podwaja cudzysłowy w środku pola", () => {
    const csv = toCsv([{ imie: 'Jan "Szef"', godziny: 1, kwota: 1 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe('"Jan ""Szef""";1;1');
  });

  it("cudzysłowi pole z przełamaniem wiersza", () => {
    const csv = toCsv([{ imie: "Jan\nKowalski", godziny: 1, kwota: 1 }], KOLUMNY);
    // Przełamanie zostaje w środku pola — dlatego pole musi być w cudzysłowie.
    expect(csv).toContain('"Jan\nKowalski"');
  });

  it("nie cudzysłowi pola, które tego nie wymaga", () => {
    const csv = toCsv([{ imie: "Jan Kowalski", godziny: 1, kwota: 1 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe("Jan Kowalski;1;1");
  });

  it("znosi liczby, które liczbami nie są", () => {
    const csv = toCsv([{ imie: "Jan", godziny: Number.NaN, kwota: 1 }], KOLUMNY);
    expect(wiersze(csv)[1]).toBe("Jan;;1");
  });
});

describe("csvAmount", () => {
  it("daje dwa miejsca po przecinku", () => {
    expect(csvAmount(1234.5)).toBe("1234,50");
    expect(csvAmount(0)).toBe("0,00");
  });

  it("zamiast śmieci daje zero", () => {
    expect(csvAmount(Number.NaN)).toBe("0,00");
  });
});
