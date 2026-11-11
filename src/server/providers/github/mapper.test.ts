import { describe, expect, it } from "vitest";
import { toFindings } from "./mapper";

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
  it("summarizes the visitor's commits without logins or repository names", () => {
    const [finding] = toFindings(search, "jean.dupont@example.com");
    expect(finding).toMatchObject({ kind: "account", service: "GitHub", categories: ["email", "name", "username"] });
    expect(finding?.summary).toContain("3 commits publics");
    expect(finding?.summary).toContain("au moins 2 dépôts");
    expect(finding?.summary).not.toContain("jdupont");
  });

  it("returns nothing when no commit has exactly this email", () => {
    expect(toFindings(search, "nobody@example.com")).toEqual([]);
  });
});
