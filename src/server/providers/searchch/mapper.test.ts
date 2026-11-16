import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toDirectoryFindings, toNameCount } from "./mapper";
import { parseFeed } from "./schema";

// Invented listing (fixtures never contain real data).
const xml = readFileSync(new URL("../../../tests/fixtures/searchch/reverse-lookup.xml", import.meta.url), "utf-8");

describe("search.ch", () => {
  const feed = parseFeed(xml);

  it("parses the Atom feed", () => {
    expect(feed?.totalResults).toBe(2);
    expect(feed?.entry).toHaveLength(2);
  });

  it("keeps only the listing carrying the visitor's number, as categories", () => {
    expect(toDirectoryFindings(feed!, { phone: "+41791234567" })).toEqual([
      {
        kind: "directory",
        providerId: "searchch",
        source: "search.ch (annuaire)",
        categories: ["phone", "name", "address", "location"],
        noPromo: true,
        matchedOn: "phone",
      },
    ]);
  });

  it("adds the commune, found from the zip code and the locality only (D27)", () => {
    const commune = { name: "Nulle-Part", canton: "NE", lat: 47, lng: 7, rings: [] };
    const calls: unknown[][] = [];
    const resolve = (...args: [string | undefined, string | undefined]) => {
      calls.push(args);
      return commune;
    };
    const [finding] = toDirectoryFindings(feed!, { phone: "+41791234567" }, resolve);
    expect(finding).toMatchObject({ kind: "directory", commune });
    // The street and the number never reach the resolver nor the finding.
    expect(calls).toEqual([["9999", "Nulle-Part"]]);
    expect(JSON.stringify(finding)).not.toContain("Inventée");
  });

  it("has no commune when it cannot be found", () => {
    const [finding] = toDirectoryFindings(feed!, { phone: "+41791234567" }, () => undefined);
    expect(finding).not.toHaveProperty("commune");
  });

  it("turns a name search into a total only", () => {
    expect(toNameCount(feed!)).toMatchObject({ kind: "count", count: 2, matchedOn: "name" });
    expect(toNameCount({ totalResults: 0 })).toBeNull();
  });

  it("returns null for an invalid document", () => {
    expect(parseFeed("<html>error</html>")).toBeNull();
  });
});
