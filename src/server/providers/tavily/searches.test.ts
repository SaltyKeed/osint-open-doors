import { describe, expect, it } from "vitest";
import { plannedSearches } from "./searches";

describe("plannedSearches", () => {
  it("searches the email and the phone as a whole", () => {
    const searches = plannedSearches({ email: "jean.dupont@example.com", phone: "+41791234567" });
    expect(searches.map((s) => [s.searchedOn, s.text])).toEqual([
      ["email", '"jean.dupont@example.com"'],
      ["phone", '"+41 79 123 45 67" OR "079 123 45 67" OR "0791234567" OR "+41791234567"'],
      ["phone", '"+41 79 123 45 67" OR "079 123 45 67" OR "0791234567" OR "+41791234567"'],
    ]);
    expect(searches[2]?.options.includeDomains).toContain("tellows.ch");
  });

  it("always searches first and last name together, on several themes", () => {
    const searches = plannedSearches({ firstName: "Jean", lastName: "Dupont" }).filter((s) => s.searchedOn === "name");
    expect(searches).toHaveLength(6);
    expect(searches.filter((s) => s.text.startsWith('"Jean Dupont"'))).toHaveLength(5);
    expect(searches[5]?.text).toBe('"J. Dupont" OR "Dupont J."');
    expect(searches.filter((s) => s.options.includeDomains)).toHaveLength(3);
  });

  it("adds a search with the city when it is given", () => {
    const searches = plannedSearches({ firstName: "Jean", lastName: "Dupont", city: "Nulle-Part" }).filter(
      (s) => s.searchedOn === "name",
    );
    expect(searches.at(-1)?.text).toBe('"Jean Dupont" "Nulle-Part"');
  });

  it("searches each guessed username alone on social networks, as many as asked (D28)", () => {
    const visitor = { firstName: "Léo", lastName: "Rochat", birthDate: "2006-03-14" };
    const guesses = (n: number) => plannedSearches(visitor, n).filter((s) => s.searchedOn === "username");
    expect(guesses(10)).toHaveLength(10);
    expect(guesses(10).map((s) => s.text).slice(0, 2)).toEqual(["leorochat", "leo.rochat"]);
    expect(guesses(60).map((s) => s.text)).toContain("leo.rct14");
    expect(guesses(0)).toEqual([]);
    expect(guesses(10).every((s) => s.options.includeDomains?.includes("instagram.com"))).toBe(true);
  });

  it("does not search a name without both parts", () => {
    expect(plannedSearches({ firstName: "Jean" })).toEqual([]);
  });
});
