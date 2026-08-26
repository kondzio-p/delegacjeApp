import { describe, expect, it } from "vitest";

import { formatHours, hoursBetween, toDisplayAmount } from "./money";
import type { CurrentRates } from "./rates";

/** Bieżąca tabela NBP — kursy dobrane tak, żeby wyniki dzieliły się równo. */
const RATES: CurrentRates = {
  effectiveDate: "2026-08-25",
  rates: { EUR: 4.5, USD: 4 },
};

describe("hoursBetween", () => {
  it("liczy zwykłą zmianę", () => {
    expect(hoursBetween("08:00", "16:00")).toBe(8);
  });

  it("liczy zmianę przechodzącą przez północ", () => {
    // To jest powód, dla którego ujemna różnica dostaje +24 h.
    expect(hoursBetween("22:00", "06:00")).toBe(8);
  });

  it("liczy niepełne godziny", () => {
    expect(hoursBetween("08:30", "09:15")).toBe(0.75);
  });

  it("traktuje identyczne godziny jako zero, a nie jako dobę", () => {
    expect(hoursBetween("07:00", "07:00")).toBe(0);
  });

  it("minuta przed północą i minuta po niej to dwie minuty", () => {
    expect(hoursBetween("23:59", "00:01")).toBeCloseTo(2 / 60, 10);
  });
});

describe("toDisplayAmount", () => {
  it("nie rusza kwoty, gdy waluta wpisu jest walutą wyświetlania", () => {
    expect(toDisplayAmount(100, "EUR", 4.3, "EUR", RATES)).toBe(100);
  });

  it("używa kursu zamrożonego przy wpisie, a nie bieżącego", () => {
    // Sedno całej mechaniki: podsumowanie za marzec ma wyglądać tak samo w czerwcu.
    expect(toDisplayAmount(100, "EUR", 4.3, "PLN", RATES)).toBeCloseTo(430, 10);
  });

  it("sięga po kurs bieżący, gdy wpis nie ma zamrożonego", () => {
    expect(toDisplayAmount(100, "EUR", null, "PLN", RATES)).toBeCloseTo(450, 10);
  });

  it("oddaje kwotę bez przeliczenia, gdy nie ma żadnego kursu", () => {
    // Lepsza liczba w oryginalnej walucie niż zero.
    expect(toDisplayAmount(100, "EUR", null, "PLN", null)).toBe(100);
  });

  it("przelicza między dwiema walutami obcymi przez PLN", () => {
    // 100 EUR * 4,30 = 430 PLN; 430 / 4,00 = 107,50 USD.
    expect(toDisplayAmount(100, "EUR", 4.3, "USD", RATES)).toBeCloseTo(107.5, 10);
  });

  it("przelicza z PLN na walutę obcą po kursie bieżącym", () => {
    expect(toDisplayAmount(450, "PLN", 1, "EUR", RATES)).toBeCloseTo(100, 10);
  });

  it("nie przelicza, gdy zamrożony kurs jest zerem", () => {
    // Zero to nie null, więc `??` je przepuszcza — chroni dopiero test `<= 0`.
    expect(toDisplayAmount(100, "EUR", 0, "PLN", RATES)).toBe(100);
  });

  it("nie przelicza, gdy brakuje kursu waluty docelowej", () => {
    const bezUsd = { effectiveDate: "2026-08-25", rates: { EUR: 4.5 } } as CurrentRates;
    expect(toDisplayAmount(100, "EUR", 4.3, "USD", bezUsd)).toBe(100);
  });
});

describe("formatHours", () => {
  it("pokazuje pełne godziny z zerowymi minutami", () => {
    expect(formatHours(8)).toBe("8 h 00 min");
  });

  it("pokazuje połówkę godziny", () => {
    expect(formatHours(7.5)).toBe("7 h 30 min");
  });

  it("zeru i wartościom ujemnym daje krótką postać", () => {
    expect(formatHours(0)).toBe("0 h");
    expect(formatHours(-3)).toBe("0 h");
  });

  it("znosi wartości niebędące liczbą", () => {
    expect(formatHours(Number.NaN)).toBe("0 h");
    expect(formatHours(Number.POSITIVE_INFINITY)).toBe("0 h");
  });

  it("nie pokazuje 60 minut przy błędzie zaokrąglenia sumy", () => {
    // Suma wielu wpisów potrafi wyjść jako 7,999999999999999 zamiast 8.
    expect(formatHours(7.999999999999999)).toBe("8 h 00 min");
  });
});
