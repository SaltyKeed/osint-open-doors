import { describe, expect, it } from "vitest";
import { type CommuneData, findCommune, normalizePlace } from "./commune";

// Invented localities and communes (fixtures never contain real data).
const data: CommuneData = {
  localities: [
    ["9999", "Nulle-Part", 1, 100],
    ["9998", "Vallée Inventée", 2, 70],
    ["9998", "Autre-Lieu", 3, 30],
    ["9997", "Ville 25", 4, 100],
  ],
  communes: {
    "1": { name: "Nulle-Part", canton: "NE", lat: 47, lng: 7, rings: [[[7, 47], [7.1, 47], [7, 47.1], [7, 47]]] },
    "2": { name: "Vallée", canton: "VD", lat: 46.5, lng: 6.5, rings: [] },
    "3": { name: "Autre", canton: "VD", lat: 46.6, lng: 6.6, rings: [] },
    "4": { name: "Ville", canton: "GE", lat: 46.2, lng: 6.1, rings: [] },
  },
};

describe("normalizePlace", () => {
  it("ignores case, accents, punctuation, the canton and a post office number", () => {
    expect(normalizePlace("Vallée-Inventée NE")).toBe("vallee inventee");
    expect(normalizePlace("Ville 25")).toBe("ville");
    expect(normalizePlace("  NULLE   part ")).toBe("nulle part");
  });
});

describe("findCommune", () => {
  it("finds the commune from the zip code and the locality", () => {
    expect(findCommune(data, "9999", "Nulle-Part")).toMatchObject({ name: "Nulle-Part", canton: "NE" });
  });

  it("uses the locality when one zip code covers several communes", () => {
    expect(findCommune(data, "9998", "Autre-Lieu")?.name).toBe("Autre");
  });

  it("falls back on the commune with most addresses when the locality is unknown", () => {
    expect(findCommune(data, "9998", "Inconnue")?.name).toBe("Vallée");
    expect(findCommune(data, "9998", undefined)?.name).toBe("Vallée");
  });

  it("matches a locality written with its post office number", () => {
    expect(findCommune(data, "9997", "Ville")?.name).toBe("Ville");
  });

  it("returns undefined for an unknown or missing zip code", () => {
    expect(findCommune(data, "1234", "Nulle-Part")).toBeUndefined();
    expect(findCommune(data, undefined, "Nulle-Part")).toBeUndefined();
  });

  it("returns undefined when the commune has no outline data", () => {
    expect(findCommune({ ...data, communes: {} }, "9999", "Nulle-Part")).toBeUndefined();
  });
});
