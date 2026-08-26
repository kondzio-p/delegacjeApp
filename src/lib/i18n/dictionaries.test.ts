import { describe, expect, it } from "vitest";

import { LOCALES } from "./config";
import { DICTIONARIES, translate } from "./dictionaries";

const KEYS = Object.keys(DICTIONARIES.pl) as (keyof typeof DICTIONARIES.pl)[];

describe("słowniki", () => {
  // Kompletność kluczy pilnuje typ `Dict`, więc test sprawdza to, czego typ nie
  // widzi: że wartość nie jest pusta i że ktoś nie zostawił polskiego oryginału.
  it.each(LOCALES)("%s ma wypełnione wszystkie klucze", (locale) => {
    const puste = KEYS.filter((key) => DICTIONARIES[locale][key].trim() === "");
    expect(puste).toEqual([]);
  });

  it("każdy język tłumaczy przynajmniej większość kluczy inaczej niż polski", () => {
    // Część wartości słusznie się powtarza (nazwy własne, „E-mail", skróty walut),
    // więc próg jest luźny — chodzi o wyłapanie języka wklejonego hurtem z polskiego.
    for (const locale of LOCALES.filter((l) => l !== "pl")) {
      const inne = KEYS.filter((key) => DICTIONARIES[locale][key] !== DICTIONARIES.pl[key]);
      expect(inne.length / KEYS.length).toBeGreaterThan(0.8);
    }
  });

  it("wszystkie języki używają tych samych zmiennych w danym kluczu", () => {
    // Rozjazd tutaj oznacza napis z nieodmienionym {name} na ekranie.
    const zmienne = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

    for (const key of KEYS) {
      const wzorzec = zmienne(DICTIONARIES.pl[key]);
      for (const locale of LOCALES) {
        expect({ key, locale, vars: zmienne(DICTIONARIES[locale][key]) }).toEqual({
          key,
          locale,
          vars: wzorzec,
        });
      }
    }
  });
});

describe("translate", () => {
  it("podstawia zmienne", () => {
    expect(translate("pl", "shell.greeting", { name: "Jan" })).toBe("Witaj, Jan");
    expect(translate("en", "shell.greeting", { name: "Jan" })).toBe("Welcome, Jan");
  });

  it("nieznany język cofa się do polskiego", () => {
    // @ts-expect-error — celowo podajemy wartość spoza typu, tak jak zrobiłaby to baza.
    expect(translate("fr", "nav.trips")).toBe(DICTIONARIES.pl["nav.trips"]);
  });
});
