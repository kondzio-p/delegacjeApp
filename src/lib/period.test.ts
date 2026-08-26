import { describe, expect, it } from "vitest";

import { lastMonth, periodFromParams, periodLabel, thisMonth } from "./period";

/** Punkt odniesienia w środku miesiąca — żeby nie ocierać się o granice. */
const NOW = new Date(2026, 7, 15, 12, 0, 0); // 15 sierpnia 2026

describe("thisMonth / lastMonth", () => {
  it("obejmuje cały miesiąc, prawą granicą sięgając następnego", () => {
    // Zakres domknięty od lewej, otwarty od prawej — ostatni dzień wchodzi w całości.
    expect(thisMonth(NOW)).toEqual({ from: "2026-08-01", to: "2026-09-01" });
  });

  it("cofa się o miesiąc", () => {
    expect(lastMonth(NOW)).toEqual({ from: "2026-07-01", to: "2026-08-01" });
  });

  it("przechodzi przez granicę roku", () => {
    expect(lastMonth(new Date(2026, 0, 10))).toEqual({ from: "2025-12-01", to: "2026-01-01" });
  });
});

describe("periodFromParams", () => {
  it("przyjmuje poprawny zakres z adresu", () => {
    expect(periodFromParams("2026-03-01", "2026-04-01", NOW)).toEqual({
      from: "2026-03-01",
      to: "2026-04-01",
    });
  });

  const smieci: [string, string | undefined, string | undefined][] = [
    ["brak obu parametrów", undefined, undefined],
    ["brak jednego", "2026-03-01", undefined],
    ["zły format", "01.03.2026", "2026-04-01"],
    ["tekst zamiast daty", "wczoraj", "dzisiaj"],
    ["zakres odwrócony", "2026-04-01", "2026-03-01"],
    ["zakres pusty", "2026-03-01", "2026-03-01"],
  ];

  // Parametry przychodzą z URL-a, więc nie można im ufać — każde odchylenie
  // ma wrócić do bieżącego miesiąca, a nie wysypać ekranu.
  it.each(smieci)("cofa się do bieżącego miesiąca: %s", (_nazwa, from, to) => {
    expect(periodFromParams(from, to, NOW)).toEqual(thisMonth(NOW));
  });
});

describe("periodLabel", () => {
  it("pełny miesiąc podpisuje nazwą miesiąca", () => {
    expect(periodLabel({ from: "2026-08-01", to: "2026-09-01" })).toBe("sierpień 2026");
  });

  it("zakres własny podpisuje datami, z prawą granicą cofniętą o dzień", () => {
    // `to` jest otwarte, więc człowiek ma zobaczyć 14, nie 15.
    expect(periodLabel({ from: "2026-08-10", to: "2026-08-15" })).toBe("10.08.2026 – 14.08.2026");
  });

  it("nie myli pełnego miesiąca z zakresem o dzień krótszym", () => {
    expect(periodLabel({ from: "2026-08-01", to: "2026-08-31" })).not.toBe("sierpień 2026");
  });
});
