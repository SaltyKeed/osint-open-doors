import { describe, expect, it } from "vitest";
import { addSighting, type Fiche } from "@/server/domain/fiche";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { startPath } from "@/server/domain/path";
import { enrichBreaches, findBreach, type CatalogueBreach } from "./breaches";

// All values below are invented test data.
const catalogue: CatalogueBreach[] = [
  {
    Name: "Duolingo",
    Title: "Duolingo",
    Domain: "duolingo.com",
    BreachDate: "2023-01-24",
    PwnCount: 2676696,
    DataClasses: ["Email addresses", "Names", "Spoken languages", "Some new class"],
    Description: 'In 2023, <a href="https://example.test">2.6M records</a> were scraped &quot;publicly&quot;.',
  },
  { Name: "Ab", Title: "Ab", Domain: "", BreachDate: "2020-01-01", PwnCount: 10, DataClasses: [], Description: "" },
];

describe("findBreach", () => {
  it("matches by name, title or domain, with or without the extension", () => {
    for (const name of ["Duolingo", "duolingo.com", "Duolingo.com", "DUOLINGO"]) {
      expect(findBreach(name, catalogue)?.Name).toBe("Duolingo");
    }
  });

  it("does not match unknown or too short names", () => {
    expect(findBreach("pandabuy.com", catalogue)).toBeNull();
    expect(findBreach("ab", catalogue)).toBeNull();
  });
});

describe("enrichBreaches", () => {
  const email = normalizeIdentifier("EMAIL", "lea@example.ch")!;
  const sighting = (sourceId: string, origin: string) => ({
    sourceId,
    origin,
    evidence: null,
    confidence: "confirme" as const,
    path: startPath(email),
  });

  function fiche(): Fiche {
    const f: Fiche = new Map();
    addSighting(
      f,
      { field: "H1", value: "Duolingo", attributes: [{ label: "Année", value: "2023", known: true }] },
      sighting("xposedornot", "Duolingo"),
    );
    addSighting(f, { field: "H1", value: "duolingo.com" }, sighting("leakcheck-public", "duolingo.com"));
    addSighting(f, { field: "H1", value: "pandabuy.com" }, sighting("leak-lookup", "pandabuy.com"));
    addSighting(f, { field: "B1", value: "lea@example.ch" }, sighting("saisie", "saisie"));
    return f;
  }

  it("merges the names of the same breach found by several sources", () => {
    const breaches = [...enrichBreaches(fiche(), catalogue).values()].filter((f) => f.field === "H1");
    expect(breaches.map((b) => b.value)).toEqual(["Duolingo", "pandabuy.com"]);
    expect(breaches[0]?.sightings.map((s) => s.sourceId)).toEqual(["xposedornot", "leakcheck-public"]);
  });

  it("replaces the details of the sources by those of the catalogue", () => {
    const duolingo = [...enrichBreaches(fiche(), catalogue).values()].find((f) => f.value === "Duolingo");
    expect(duolingo?.attributes).toEqual([
      { label: "Date de la fuite", value: "24.01.2023", known: true },
      { label: "Comptes touchés", value: "2 676 696", known: true },
      { label: "Données exposées", value: "adresses email, noms, langues, Some new class", known: true },
      { label: "Description (anglais)", value: 'In 2023, 2.6M records were scraped "publicly".', known: true },
    ]);
  });

  it("the same breach seen by two sources under two names is one proof, not two", () => {
    const f: Fiche = new Map();
    const possible = (sourceId: string, origin: string) => ({ ...sighting(sourceId, origin), confidence: "possible" as const });
    addSighting(f, { field: "H1", value: "Duolingo" }, possible("xposedornot", "Duolingo"));
    addSighting(f, { field: "H1", value: "duolingo.com" }, possible("leakcheck-public", "duolingo.com"));
    addSighting(f, { field: "H1", value: "pandabuy.com" }, possible("leak-lookup", "pandabuy.com"));
    addSighting(f, { field: "H1", value: "Pandabuy" }, possible("leakcheck-public", "Pandabuy"));
    const enriched = [...enrichBreaches(f, catalogue).values()];
    expect(enriched.map((b) => [b.value, b.confidence])).toEqual([
      ["Duolingo", "possible"],
      ["pandabuy.com", "possible"],
    ]);
  });

  it("leaves the other findings unchanged", () => {
    const enriched = enrichBreaches(fiche(), catalogue);
    expect([...enriched.values()].find((f) => f.field === "B1")?.value).toBe("lea@example.ch");
    expect([...enriched.values()].find((f) => f.value === "pandabuy.com")?.attributes).toEqual([]);
  });
});
