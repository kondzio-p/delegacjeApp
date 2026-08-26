import { describe, expect, it } from "vitest";

import { dayToMoment, momentToDay, todayLocal } from "./day";

describe("dayToMoment", () => {
  it("umieszcza dzień w południe UTC", () => {
    expect(dayToMoment("2026-08-10").toISOString()).toBe("2026-08-10T12:00:00.000Z");
  });

  it("trzyma się tego samego dnia w polskiej strefie, także latem", () => {
    // Latem Polska ma UTC+2, więc południe UTC to 14:00 — wciąż ten sam dzień.
    const moment = dayToMoment("2026-08-10");
    expect(moment.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })).toBe("10.08.2026");
  });

  it("trzyma się tego samego dnia zimą", () => {
    const moment = dayToMoment("2026-01-15");
    expect(moment.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })).toBe("15.01.2026");
  });
});

describe("momentToDay", () => {
  it("jest odwrotnością dayToMoment", () => {
    for (const day of ["2026-01-01", "2026-08-10", "2026-12-31"]) {
      expect(momentToDay(dayToMoment(day))).toBe(day);
    }
  });

  it("przyjmuje też tekst ISO prosto z serwera", () => {
    expect(momentToDay("2026-08-10T12:00:00.000Z")).toBe("2026-08-10");
  });

  it("czyta dzień ze starego wpisu zrobionego późnym wieczorem", () => {
    // Wpisy sprzed tej zmiany mają dowolną godzinę z now().
    expect(momentToDay("2026-08-10T22:30:00.000Z")).toBe("2026-08-10");
  });

  it("na śmieciach oddaje pusty tekst, a nie wyjątek", () => {
    expect(momentToDay("nie data")).toBe("");
  });
});

describe("todayLocal", () => {
  it("formatuje datę lokalną z wiodącymi zerami", () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
