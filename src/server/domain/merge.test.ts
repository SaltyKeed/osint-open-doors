import { describe, expect, it } from "vitest";
import { breachKey, mergeDuplicates } from "./merge";
import type { BreachFinding, Finding, ProfileFinding } from "./types";

const breach = (providerId: string, source: string, extra: Partial<BreachFinding> = {}): BreachFinding => ({
  kind: "breach",
  providerId,
  source,
  categories: ["email"],
  matchedOn: "email",
  ...extra,
});

const profile = (url: string, extra: Partial<ProfileFinding> = {}): ProfileFinding => ({
  kind: "profile",
  providerId: "whatsmyname",
  site: "Site",
  category: "gaming",
  url,
  username: "jdupont",
  origin: "pseudo",
  matchedOn: "username",
  ...extra,
});

describe("breachKey", () => {
  it("ignores case, domain suffix and punctuation", () => {
    expect(breachKey("Zomato.com")).toBe("zomato");
    expect(breachKey("zomato")).toBe("zomato");
    expect(breachKey("Forums.xkcd.com")).toBe("forumsxkcd");
    expect(breachKey("8Tracks")).toBe("8tracks");
  });
});

describe("mergeDuplicates", () => {
  it("keeps one breach when two providers report the same one, the first listed", () => {
    const merged = mergeDuplicates([
      breach("xposedornot", "Zomato", { categories: ["email", "password"], year: "2017" }),
      breach("leakcheck", "Zomato.com", { year: "2017" }),
      breach("leakcheck", "StockX.com"),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ providerId: "xposedornot", categories: ["email", "password"] });
    expect(merged[1]).toMatchObject({ source: "StockX.com" });
  });

  it("keeps breaches found with different data apart", () => {
    const merged = mergeDuplicates([breach("a", "Zomato"), breach("b", "Zomato", { matchedOn: "username" })]);
    expect(merged).toHaveLength(2);
  });

  it("keeps the profile with details when two sources found the same account", () => {
    const merged = mergeDuplicates([
      profile("https://www.chess.com/member/jdupont"),
      profile("https://chess.com/member/JDupont", { providerId: "profiles", details: ["Compte créé en 2019"] }),
    ]);
    expect(merged).toEqual([expect.objectContaining({ details: ["Compte créé en 2019"] })]);
  });

  it("does not touch the other findings", () => {
    const other: Finding = { kind: "count", providerId: "x", source: "s", count: 2, label: "l", matchedOn: "name" };
    expect(mergeDuplicates([other, other])).toEqual([other, other]);
  });
});
