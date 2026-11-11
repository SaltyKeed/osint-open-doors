import { describe, expect, it } from "vitest";
import { ownLogins, toFindings, toProfileFinding } from "./mapper";

// Invented search result (fixtures never contain real data).
const search = {
  total_count: 3,
  items: [
    { commit: { author: { email: "Jean.Dupont@example.com" } }, author: { login: "jdupont" }, repository: { full_name: "jdupont/site" } },
    { commit: { author: { email: "jean.dupont@example.com" } }, author: null, repository: { full_name: "school/project" } },
    { commit: { author: { email: "someone@example.com" } }, author: { login: "other" }, repository: { full_name: "other/repo" } },
  ],
};

describe("github mapper", () => {
  it("summarizes the visitor's commits and keeps the login as a pivot", () => {
    const [finding] = toFindings(search, "jean.dupont@example.com");
    expect(finding).toMatchObject({ kind: "account", service: "GitHub", categories: ["email", "name", "username"], handles: ["jdupont"] });
    expect(finding?.summary).toContain("3 commits publics");
    expect(finding?.summary).toContain("au moins 2 dépôts");
    expect(finding?.summary).not.toContain("school/project");
  });

  it("only keeps logins of commits with exactly this email", () => {
    expect(ownLogins(search, "jean.dupont@example.com")).toEqual(["jdupont"]);
  });

  it("ignores technical accounts and bots", () => {
    const technical = {
      total_count: 2,
      items: [
        { commit: { author: { email: "jean.dupont@example.com" } }, author: { login: "invalid-email-address" }, repository: { full_name: "a/b" } },
        { commit: { author: { email: "jean.dupont@example.com" } }, author: { login: "dependabot[bot]" }, repository: { full_name: "a/c" } },
      ],
    };
    expect(ownLogins(technical, "jean.dupont@example.com")).toEqual([]);
  });

  it("returns nothing when no commit has exactly this email", () => {
    expect(toFindings(search, "nobody@example.com")).toEqual([]);
  });

  it("describes the public profile and its pivots", () => {
    const finding = toProfileFinding({
      login: "jdupont",
      name: "Jean Dupont",
      location: "Nulle-Part",
      twitter_username: "jdupont_x",
      public_repos: 4,
      created_at: "2019-05-01T00:00:00Z",
    });
    expect(finding.categories).toEqual(["username", "name", "location"]);
    expect(finding.summary).toContain("ta localité (Nulle-Part)");
    expect(finding.summary).toContain("Compte créé en 2019");
    expect(finding.handles).toEqual(["jdupont", "jdupont_x"]);
  });
});
