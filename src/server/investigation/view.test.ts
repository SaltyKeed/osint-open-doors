import { describe, expect, it } from "vitest";
import type { Confidence } from "@/server/domain/confidence";
import { addSighting, type Fiche } from "@/server/domain/fiche";
import { normalizeIdentifier } from "@/server/domain/identifier";
import { extendPath, startPath } from "@/server/domain/path";
import { toView } from "./view";

// All values below are invented test data.
const email = normalizeIdentifier("EMAIL", "lea@example.ch")!;
const pseudo = normalizeIdentifier("PSEUDO", "lmartin06")!;
const path = extendPath(startPath(email), "github", pseudo);
const sighting = (confidence: Confidence) => ({ sourceId: "github", origin: "GitHub", evidence: null, confidence, path });

function fiche(): Fiche {
  const f: Fiche = new Map();
  addSighting(f, { field: "B1", value: "lea@example.ch" }, sighting("confirme"));
  addSighting(f, { field: "C1", value: "Neuchâtel" }, sighting("probable"));
  addSighting(f, { field: "C1", value: "Bern" }, sighting("possible"));
  addSighting(f, { field: "A1", value: "Paul Martin" }, sighting("homonyme"));
  return f;
}

describe("toView", () => {
  const view = toView({ fiche: fiche(), runs: [{ sourceId: "github", identifierType: "EMAIL", status: "found", records: 1 }] }, [
    { id: "github", label: "GitHub" },
    { id: "gravatar", label: "Gravatar" },
  ]);

  it("lists all categories in order with their fill rate", () => {
    expect(view.categories.map((c) => c.code)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
    expect(view.categories.find((c) => c.code === "C")).toMatchObject({ label: "Lieux", filled: 1, total: 3 });
  });

  it("sends confirmed and probable values, masked and in clear, with source and path", () => {
    const city = view.categories.find((c) => c.code === "C")?.fields[0];
    expect(city?.values).toEqual([
      {
        value: "Neuchâtel",
        masked: "N•••",
        confidence: "probable",
        sources: ["GitHub"],
        path: ["saisie (email)", "GitHub (pseudo)"],
        attributes: [],
        thirdParty: false,
      },
    ]);
  });

  it("never sends possible values or namesakes, only their number", () => {
    const text = JSON.stringify(view);
    expect(text).not.toContain("Bern");
    expect(text).not.toContain("Paul Martin");
    expect(view.categories.find((c) => c.code === "C")?.fields[0]?.hiddenCount).toBe(1);
    expect(view.categories.find((c) => c.code === "A")?.fields[0]).toMatchObject({ code: "A1", values: [], hiddenCount: 1 });
  });

  it("lists the services that received the visitor's data", () => {
    expect(view.services).toEqual(["GitHub"]);
  });

  it("tells what each source answered, so that nothing found is not mistaken for a failure", () => {
    const report = toView(
      {
        fiche: fiche(),
        runs: [
          { sourceId: "github", identifierType: "EMAIL", status: "found", records: 2 },
          { sourceId: "github", identifierType: "PSEUDO", status: "error", records: 0 },
          { sourceId: "gravatar", identifierType: "EMAIL", status: "not_found", records: 0 },
          { sourceId: "hudsonrock", identifierType: "EMAIL", status: "quota", records: 0 },
        ],
      },
      [
        { id: "github", label: "GitHub" },
        { id: "gravatar", label: "Gravatar" },
        { id: "hudsonrock", label: "Hudson Rock" },
        { id: "steam", label: "Steam" },
      ],
    ).sourceReport;
    expect(report).toEqual([
      { label: "GitHub", status: "found", records: 2, problems: 1 },
      { label: "Gravatar", status: "not_found", records: 0, problems: 0 },
      { label: "Hudson Rock", status: "quota", records: 0, problems: 1 },
      { label: "Steam", status: "not_asked", records: 0, problems: 0 },
    ]);
  });
});
