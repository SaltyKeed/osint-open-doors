import { describe, expect, it } from "vitest";
import { toProfileFinding } from "./mapper";

// Invented profile (fixtures never contain real data).
describe("gravatar mapper", () => {
  it("describes the public profile and keeps declared accounts as pivots", () => {
    const finding = toProfileFinding({
      display_name: "Jean D.",
      location: "Nulle-Part",
      verified_accounts: [
        { service_label: "GitHub", url: "https://github.com/jdupont", is_hidden: false },
        { service_label: "Instagram", url: "https://instagram.com/jdupont_42", is_hidden: false },
        { service_label: "Hidden", url: "https://x.com/secret", is_hidden: true },
      ],
    });
    expect(finding.categories).toEqual(["photo", "name", "location"]);
    expect(finding.summary).toContain("Comptes déclarés : GitHub, Instagram.");
    expect(finding.handles).toEqual(["jdupont", "jdupont_42"]);
  });
});
