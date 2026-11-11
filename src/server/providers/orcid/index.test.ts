import { describe, expect, it } from "vitest";
import { toFindings as wikidataFindings } from "../wikidata/index";
import { toFindings as orcidFindings } from "./index";

// Invented answers (fixtures never contain real data).
const query = { firstName: "Jean", lastName: "Dupont" };

describe("orcid and wikidata", () => {
  it("keeps only researchers with exactly this name, as not verified", () => {
    const findings = orcidFindings(
      {
        "expanded-result": [
          { "orcid-id": "0000-0000-0000-0001", "given-names": "Jean", "family-names": "Dupont", "institution-name": ["École Exemple"] },
          { "orcid-id": "0000-0000-0000-0002", "given-names": "Jean-Baptiste", "family-names": "Dupont", "institution-name": [] },
        ],
      },
      query,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ verified: false, site: "orcid.org", snippet: "École Exemple" });
  });

  it("keeps only Wikidata entries with exactly this name", () => {
    const findings = wikidataFindings(
      { search: [{ id: "Q1", label: "Jean Dupont", description: "cycliste" }, { id: "Q2", label: "Jeanne Dupont" }] },
      query,
    );
    expect(findings.map((f) => f.url)).toEqual(["https://www.wikidata.org/wiki/Q1"]);
  });
});
