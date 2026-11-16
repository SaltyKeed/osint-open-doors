import { describe, expect, it } from "vitest";
import { toFindings } from "./mapper";

// Invented answer (fixtures never contain real data).
const victims = [
  {
    victim: "Ecole Exemple",
    domain: "www.ecole-exemple.ch",
    group: "groupe-fictif",
    attackdate: "2025-02-10T10:00:00+00:00",
    description: "Texte de la revendication",
    claim_url: "http://exemple.onion/post",
  },
  { victim: "Autre", domain: "autre-exemple.ch", group: "x", attackdate: "2024-01-01T00:00:00+00:00" },
  { victim: "Sans domaine", domain: "", group: "x", attackdate: "" },
];

describe("ransomware mapper", () => {
  it("keeps only the victims whose website is the email domain", () => {
    const findings = toFindings(victims, "ecole-exemple.ch");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.summary).toContain("groupe-fictif");
    expect(findings[0]?.summary).toContain("02.2025");
  });

  it("never shows the ransom note nor the leak site", () => {
    const text = JSON.stringify(toFindings(victims, "ecole-exemple.ch"));
    expect(text).not.toContain("Texte de la revendication");
    expect(text).not.toContain(".onion");
  });

  it("returns nothing for an error answer", () => {
    expect(toFindings({ error: "No victims found" }, "ecole-exemple.ch")).toEqual([]);
  });
});
