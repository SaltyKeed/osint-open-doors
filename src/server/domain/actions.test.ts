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

const PREVENTION = ["unique-passwords", "enable-2fa", "search-yourself"];

describe("buildActionPlan", () => {
  it("gives prevention actions when nothing is linked to the visitor", () => {
    expect(buildActionPlan([]).map((a) => a.id)).toEqual(PREVENTION);
  });

  it("gives prevention actions when only name-only totals were found (homonyms)", () => {
    const plan = buildActionPlan([
      { kind: "count", providerId: "searchch", source: "search.ch", count: 12, label: "inscriptions", matchedOn: "name" },
    ]);
    expect(plan.map((a) => a.id)).toEqual(PREVENTION);
  });

  it("puts the password action first and says how many breaches contain it", () => {
    const plan = buildActionPlan([breach(["email", "phone"]), breach(["password"]), breach(["password", "name"])]);
    expect(plan[0]).toMatchObject({ id: "change-passwords", title: "Changer les mots de passe concernés (2 fuites)" });
    expect(plan.map((a) => a.id)).toContain("phishing");
    expect(plan.map((a) => a.id)).not.toContain("unique-passwords");
  });

  it("does not repeat an action for several findings", () => {
    const plan = buildActionPlan([breach(["password"]), breach(["password"])]);
    expect(plan.filter((a) => a.id === "change-passwords")).toHaveLength(1);
  });

  it("adds the directory and web actions with their counts", () => {
    const plan = buildActionPlan([
      { kind: "directory", providerId: "searchch", source: "search.ch", categories: ["name", "address", "phone"], noPromo: false, matchedOn: "phone" },
      { kind: "web", providerId: "tavily", verified: true, site: "forum.example", url: "https://forum.example", title: "Profil", snippet: "", matchedOn: "email" },
      { kind: "web", providerId: "tavily", verified: true, site: "club.example", url: "https://club.example", title: "Club", snippet: "", matchedOn: "phone" },
    ]);
    const ids = plan.map((a) => a.id);
    expect(ids).toContain("directory");
    expect(ids).toContain("identity");
    expect(plan.find((a) => a.id === "web-removal")?.title).toBe("Faire retirer les pages qui te concernent (2 pages)");
  });

  it("ignores unverified pages for the removal action", () => {
    const plan = buildActionPlan([
      { kind: "web", providerId: "tavily", verified: false, site: "news.example", url: "https://news.example", title: "", snippet: "", matchedOn: "name" },
    ]);
    expect(plan.map((a) => a.id)).toEqual(PREVENTION);
  });
});
