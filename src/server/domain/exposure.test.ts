import { describe, expect, it } from "vitest";
import { categoriesFromLabels } from "./categories";
import { groupByCategory } from "./exposure";
import type { Finding } from "./types";

// Invented results (fixtures never contain real data).
const findings: Finding[] = [
  { kind: "breach", providerId: "xposedornot", source: "ExempleShop", year: "2019", categories: ["email", "password"], matchedOn: "email" },
  { kind: "breach", providerId: "leakcheck", source: "AutreSite", year: "2023", categories: ["phone", "address"], matchedOn: "phone" },
  { kind: "directory", providerId: "searchch", source: "search.ch", categories: ["phone", "address"], noPromo: false, matchedOn: "phone" },
  { kind: "account", providerId: "gravatar", service: "Gravatar", summary: "s", categories: ["photo"], matchedOn: "email" },
  { kind: "count", providerId: "searchch", source: "search.ch", count: 4, label: "x", matchedOn: "name" },
  {
    kind: "profile", providerId: "whatsmyname", site: "Exemple", category: "social", url: "https://exemple.org/u/x",
    username: "x", origin: "pseudo", matchedOn: "username",
  },
];

describe("groupByCategory", () => {
  it("lists for each data type where it was exposed, most dangerous first", () => {
    const groups = groupByCategory(findings);
    expect(groups.map((g) => g.category)).toEqual(["password", "address", "phone", "photo", "email"]);
    expect(groups[1]?.sources.map((s) => s.label)).toEqual(["AutreSite", "search.ch"]);
  });

  it("gives the latest year in which a data type leaked", () => {
    const phone = groupByCategory(findings).find((g) => g.category === "phone");
    expect(phone?.latestYear).toBe("2023");
    expect(phone?.sources[0]).toMatchObject({ kind: "breach", matchedOn: "phone" });
  });

  it("leaves out leads found by name or username", () => {
    const labels = groupByCategory(findings).flatMap((g) => g.sources.map((s) => s.providerId));
    expect(labels).not.toContain("whatsmyname");
    expect(groupByCategory(findings).flatMap((g) => g.sources)).toHaveLength(7);
  });
});

describe("categoriesFromLabels", () => {
  it("sorts the breach vocabulary into fine categories", () => {
    expect(
      categoriesFromLabels(["Private messages", "Employers", "Personal health data", "Genders", "Device information", "Holograms"]),
    ).toEqual(["messages", "work", "health", "privateLife", "device", "other"]);
  });
});
