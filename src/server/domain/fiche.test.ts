import { describe, expect, it } from "vitest";
import type { Confidence } from "./confidence";
import { addSighting, fillRate, type Fiche, type Sighting } from "./fiche";
import { normalizeIdentifier } from "./identifier";
import { extendPath, startPath } from "./path";

const email = normalizeIdentifier("EMAIL", "lea@example.ch")!;
const root = startPath(email);

const sighting = (confidence: Confidence, origin: string, sourceId = "src"): Sighting => ({
  sourceId,
  origin,
  evidence: null,
  confidence,
  path: root,
});

describe("path", () => {
  it("starts with the input and grows without changing the previous path", () => {
    const pseudo = normalizeIdentifier("PSEUDO", "lmartin06")!;
    const next = extendPath(root, "github", pseudo);
    expect(root).toEqual([{ identifier: email, sourceId: "saisie" }]);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ identifier: pseudo, sourceId: "github" });
  });
});

describe("addSighting", () => {
  it("merges the same value into one finding with its sources", () => {
    const fiche: Fiche = new Map();
    addSighting(fiche, { field: "B1", value: "Lea@Example.ch" }, sighting("confirme", "gravatar", "gravatar"));
    const finding = addSighting(fiche, { field: "B1", value: "lea@example.ch" }, sighting("confirme", "github", "github"));
    expect(fiche.size).toBe(1);
    expect(finding.sightings.map((s) => s.sourceId)).toEqual(["gravatar", "github"]);
  });

  it("merges phones written in different formats", () => {
    const fiche: Fiche = new Map();
    addSighting(fiche, { field: "B2", value: "079 123 45 67" }, sighting("possible", "a"));
    addSighting(fiche, { field: "B2", value: "+41791234567" }, sighting("possible", "b"));
    expect(fiche.size).toBe(1);
    expect([...fiche.values()][0]?.confidence).toBe("probable");
  });

  it("keeps different values of the same field", () => {
    const fiche: Fiche = new Map();
    addSighting(fiche, { field: "C1", value: "Neuchâtel" }, sighting("confirme", "a"));
    addSighting(fiche, { field: "C1", value: "Bern" }, sighting("confirme", "a"));
    expect(fiche.size).toBe(2);
  });

  it("merges attributes by label without duplicates", () => {
    const fiche: Fiche = new Map();
    addSighting(fiche, { field: "H1", value: "Pandabuy", attributes: [{ label: "Année", value: "2024", known: true }] }, sighting("confirme", "Pandabuy"));
    const finding = addSighting(
      fiche,
      {
        field: "H1",
        value: "pandabuy",
        attributes: [
          { label: "Année", value: "2024", known: true },
          { label: "Données", value: "email, mot de passe", known: true },
        ],
      },
      sighting("confirme", "Pandabuy"),
    );
    expect(finding.attributes.map((a) => a.label)).toEqual(["Année", "Données"]);
  });
});

describe("fillRate", () => {
  it("counts a field as filled when it has a confirmed or probable finding", () => {
    const fiche: Fiche = new Map();
    addSighting(fiche, { field: "A1", value: "Léa Martin" }, sighting("confirme", "a"));
    addSighting(fiche, { field: "B1", value: "lea@example.ch" }, sighting("probable", "a"));
    addSighting(fiche, { field: "C1", value: "Bern" }, sighting("possible", "a"));
    const rate = fillRate(fiche);
    expect(rate.find((r) => r.category === "A")).toEqual({ category: "A", filled: 1, total: 5 });
    expect(rate.find((r) => r.category === "B")).toEqual({ category: "B", filled: 1, total: 3 });
    expect(rate.find((r) => r.category === "C")).toEqual({ category: "C", filled: 0, total: 3 });
  });
});
