import { describe, expect, it } from "vitest";
import { buildActionPlan } from "./actions";
import type { BreachFinding, Finding } from "./types";

const breach = (categories: BreachFinding["categories"]): Finding => ({
  kind: "breach",
  providerId: "test",
  source: "ExampleShop",
  categories,
  matchedOn: "email",
});

describe("buildActionPlan", () => {
  it("returns no action when nothing is found", () => {
    expect(buildActionPlan([])).toEqual([]);
  });

  it("puts the password action first when a password was exposed", () => {
    const plan = buildActionPlan([breach(["email", "phone"]), breach(["password"])]);
    expect(plan[0]?.id).toBe("change-passwords");
    expect(plan.map((a) => a.id)).toContain("phishing");
  });

  it("does not repeat an action for several findings", () => {
    const plan = buildActionPlan([breach(["password"]), breach(["password"])]);
    expect(plan.filter((a) => a.id === "change-passwords")).toHaveLength(1);
  });

  it("adds the directory and web actions for those findings", () => {
    const plan = buildActionPlan([
      { kind: "directory", providerId: "searchch", source: "search.ch", categories: ["name", "address", "phone"], noPromo: false, matchedOn: "phone" },
      { kind: "web", providerId: "tavily", site: "forum.example", title: "Profil", matchedOn: "email" },
    ]);
    const ids = plan.map((a) => a.id);
    expect(ids).toContain("directory");
    expect(ids).toContain("web-removal");
    expect(ids).toContain("identity");
  });

  it("ignores name-only totals (homonyms)", () => {
    const plan = buildActionPlan([
      { kind: "count", providerId: "searchch", source: "search.ch", count: 12, label: "inscriptions", matchedOn: "name" },
    ]);
    expect(plan).toEqual([]);
  });
});
