import { describe, expect, it } from "vitest";
import { toFindings } from "./mapper";

// Invented answer (fixtures never contain real data).
const answer = {
  total: 2,
  content: [
    {
      meta: {
        id: "00000000-0000-0000-0000-000000000001",
        rubric: "HR",
        publicationDate: "2023-04-05T00:00:00.000Z",
        cantons: ["NE"],
        title: { de: "Neueintragung Exemple Sàrl", fr: "Nouvelles entrées Exemple Sàrl, Neuchâtel" },
      },
    },
    {
      meta: {
        id: "00000000-0000-0000-0000-000000000002",
        rubric: "KK",
        publicationDate: "2024-01-01T00:00:00.000Z",
        cantons: ["NE"],
        title: { fr: "Faillite" },
      },
    },
  ],
};

describe("shab mapper", () => {
  it("lists commercial register publications as unverified pages (name only)", () => {
    expect(toFindings(answer)).toEqual([
      {
        kind: "web",
        providerId: "shab",
        verified: false,
        probable: false,
        site: "Feuille officielle suisse du commerce",
        url: "https://www.shab.ch/#!/search/publications/detail/00000000-0000-0000-0000-000000000001",
        title: "Nouvelles entrées Exemple Sàrl, Neuchâtel",
        snippet: "Registre du commerce, publication du 05.04.2023, canton NE",
        matchedOn: "name",
      },
    ]);
  });

  it("never keeps another rubric (bankruptcy, debt collection, civil status)", () => {
    expect(toFindings(answer).some((f) => f.title === "Faillite")).toBe(false);
  });

  it("returns nothing for an unexpected answer", () => {
    expect(toFindings({ error: "x" })).toEqual([]);
  });
});
